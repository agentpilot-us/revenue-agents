import { prisma } from '@/lib/db';

type GoogleAccountRow = {
  id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
};

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;

function hasRequiredGoogleWorkspaceScopes(scope: string | null | undefined): boolean {
  if (!scope) return false;
  const grantedScopes = new Set(scope.split(/\s+/).filter(Boolean));
  return GOOGLE_WORKSPACE_SCOPES.every((requiredScope) => grantedScopes.has(requiredScope));
}

async function getWorkspaceCandidateAccounts(
  userId: string,
): Promise<GoogleAccountRow[]> {
  return prisma.account.findMany({
    where: {
      userId,
      provider: { in: ['google-workspace', 'google'] },
    },
    select: {
      id: true,
      provider: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
    orderBy: { provider: 'asc' },
  });
}

async function getGoogleAccount(userId: string): Promise<GoogleAccountRow | null> {
  const accounts = await getWorkspaceCandidateAccounts(userId);
  return (
    accounts.find(
      (account) =>
        account.provider === 'google-workspace' &&
        hasRequiredGoogleWorkspaceScopes(account.scope),
    ) ??
    accounts.find(
      (account) =>
        account.provider === 'google' &&
        hasRequiredGoogleWorkspaceScopes(account.scope),
    ) ??
    accounts.find((account) => account.provider === 'google-workspace') ??
    null
  );
}

async function refreshGoogleAccessToken(account: GoogleAccountRow) {
  if (!account.refresh_token) {
    throw new Error('Google account is missing a refresh token. Reconnect Google with offline access.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Google token: ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    refresh_token?: string;
  };

  const expiresAt = Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: json.access_token,
      expires_at: expiresAt,
      scope: json.scope ?? account.scope,
      refresh_token: json.refresh_token ?? account.refresh_token,
    },
  });

  return {
    accessToken: json.access_token,
    expiresAt,
  };
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await getGoogleAccount(userId);
  if (!account) {
    throw new Error(
      'Google Workspace is not connected. Connect Docs, Slides, Drive, and Gmail from Settings to use workspace handoff.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at > now + 60) {
    return account.access_token;
  }

  if (account.refresh_token) {
    const refreshed = await refreshGoogleAccessToken(account);
    return refreshed.accessToken;
  }

  if (account.access_token) {
    return account.access_token;
  }

  throw new Error('Google Workspace is connected but no usable access token is available.');
}

export async function getGoogleWorkspaceConnectionStatus(userId: string): Promise<{
  connected: boolean;
  provider: 'google-workspace' | 'google' | null;
  isLegacyPrimaryGoogle: boolean;
  grantedScopes: string[];
}> {
  const account = await getGoogleAccount(userId);
  if (!account) {
    return {
      connected: false,
      provider: null,
      isLegacyPrimaryGoogle: false,
      grantedScopes: [],
    };
  }

  return {
    connected: hasRequiredGoogleWorkspaceScopes(account.scope),
    provider:
      account.provider === 'google-workspace' || account.provider === 'google'
        ? account.provider
        : null,
    isLegacyPrimaryGoogle: account.provider === 'google',
    grantedScopes: account.scope?.split(/\s+/).filter(Boolean) ?? [],
  };
}

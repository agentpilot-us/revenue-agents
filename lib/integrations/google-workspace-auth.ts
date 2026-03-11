import { prisma } from '@/lib/db';

type GoogleAccountRow = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
};

async function getGoogleAccount(userId: string): Promise<GoogleAccountRow | null> {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
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
    throw new Error('Google account not connected. Sign in with Google to use Docs, Slides, Drive, and Gmail handoff.');
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

  throw new Error('Google account is connected but no access token is available.');
}

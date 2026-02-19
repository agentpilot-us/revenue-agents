import { prisma } from '@/lib/db';

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const SALESFORCE_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || 
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/salesforce/callback`;

export function getSalesforceAuthUrl(state: string): string {
  if (!SALESFORCE_CLIENT_ID) {
    throw new Error('SALESFORCE_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SALESFORCE_CLIENT_ID,
    redirect_uri: SALESFORCE_REDIRECT_URI,
    scope: 'api refresh_token',
    state,
  });

  // Use login.salesforce.com for production, test.salesforce.com for sandbox
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
  return `${loginUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{
  access_token: string;
  refresh_token: string;
  instance_url: string;
  expires_in: number;
}> {
  if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
    throw new Error('Salesforce OAuth is not configured');
  }

  const tokenUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
  const response = await fetch(`${tokenUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      redirect_uri: SALESFORCE_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
}

export async function refreshSalesforceToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      salesforceRefreshToken: true,
      salesforceInstanceUrl: true,
    },
  });

  if (!user?.salesforceRefreshToken) {
    throw new Error('No Salesforce refresh token found');
  }

  if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
    throw new Error('Salesforce OAuth is not configured');
  }

  const tokenUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
  const response = await fetch(`${tokenUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      refresh_token: user.salesforceRefreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token refresh failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

  await prisma.user.update({
    where: { id: userId },
    data: {
      salesforceAccessToken: data.access_token,
      salesforceTokenExpiresAt: expiresAt,
    },
  });

  return data.access_token;
}

export async function getSalesforceAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      salesforceAccessToken: true,
      salesforceTokenExpiresAt: true,
      salesforceRefreshToken: true,
    },
  });

  if (!user?.salesforceAccessToken) {
    throw new Error('Salesforce not connected');
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = user.salesforceTokenExpiresAt;
  if (expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    // Token expired or expiring soon, refresh it
    return refreshSalesforceToken(userId);
  }

  return user.salesforceAccessToken;
}

export async function getSalesforceInstanceUrl(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { salesforceInstanceUrl: true },
  });

  if (!user?.salesforceInstanceUrl) {
    throw new Error('Salesforce instance URL not found');
  }

  return user.salesforceInstanceUrl;
}

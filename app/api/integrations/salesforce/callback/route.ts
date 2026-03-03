import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeCodeForTokens } from '@/lib/integrations/salesforce-oauth';
import { prisma } from '@/lib/db';

function settingsRedirect(req: NextRequest, path: string): NextResponse {
  const url = new URL(path, req.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete('sfOauthState');
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    const storedState = req.cookies.get('sfOauthState')?.value;
    if (!state || state !== storedState) {
      return settingsRedirect(req, '/dashboard/settings?error=invalid_state');
    }

    if (error) {
      return settingsRedirect(req, `/dashboard/settings?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return settingsRedirect(req, '/dashboard/settings?error=missing_code');
    }

    const tokens = await exchangeCodeForTokens(code);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        salesforceAccessToken: tokens.access_token,
        salesforceRefreshToken: tokens.refresh_token,
        salesforceInstanceUrl: tokens.instance_url,
        salesforceTokenExpiresAt: expiresAt,
      },
    });

    return settingsRedirect(req, '/dashboard/settings?salesforce_connected=true');
  } catch (error) {
    console.error('Salesforce callback error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to connect Salesforce';
    return settingsRedirect(req, `/dashboard/settings?error=${encodeURIComponent(msg)}`);
  }
}

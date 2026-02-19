import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeCodeForTokens } from '@/lib/integrations/salesforce-oauth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

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

    if (error) {
      return redirect(`/dashboard/settings?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return redirect('/dashboard/settings?error=missing_code');
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Store tokens in user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        salesforceAccessToken: tokens.access_token,
        salesforceRefreshToken: tokens.refresh_token,
        salesforceInstanceUrl: tokens.instance_url,
        salesforceTokenExpiresAt: expiresAt,
      },
    });

    return redirect('/dashboard/settings?salesforce_connected=true');
  } catch (error) {
    console.error('Salesforce callback error:', error);
    return redirect(
      `/dashboard/settings?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Failed to connect Salesforce'
      )}`
    );
  }
}

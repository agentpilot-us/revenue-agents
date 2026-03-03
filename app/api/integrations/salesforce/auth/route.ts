import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSalesforceAuthUrl } from '@/lib/integrations/salesforce-oauth';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const state = randomBytes(32).toString('hex');
    const authUrl = getSalesforceAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('sfOauthState', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Salesforce auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Salesforce OAuth' },
      { status: 500 }
    );
  }
}

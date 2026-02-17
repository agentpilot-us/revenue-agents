import { NextRequest, NextResponse } from 'next/server';
import { validateLandingPageSession, invalidateSession } from '@/lib/auth/landing-page-auth';
import { getSessionTokenFromCookies, clearSessionCookie } from '@/lib/auth/landing-page-middleware';

export const maxDuration = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const sessionToken = await getSessionTokenFromCookies();

    if (!sessionToken) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    const validation = await validateLandingPageSession(sessionToken, campaignId);

    if (!validation.valid) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      email: validation.email,
      visitorId: validation.visitorId,
    });
  } catch (error) {
    console.error('Check session error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = getSessionTokenFromCookies();

    if (sessionToken) {
      await invalidateSession(sessionToken);
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

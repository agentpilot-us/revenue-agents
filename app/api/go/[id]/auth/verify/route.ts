import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, createLandingPageSession } from '@/lib/auth/landing-page-auth';
import { setSessionCookie } from '@/lib/auth/landing-page-middleware';
import { headers } from 'next/headers';

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL(`/go/${campaignId}/auth?error=invalid_token`, req.url)
      );
    }

    // Verify magic link
    const verification = await verifyMagicLink(token);

    if (!verification) {
      return NextResponse.redirect(
        new URL(`/go/${campaignId}/auth?error=invalid_or_expired`, req.url)
      );
    }

    // Verify campaign matches
    if (verification.campaignId !== campaignId) {
      return NextResponse.redirect(
        new URL(`/go/${campaignId}/auth?error=invalid_campaign`, req.url)
      );
    }

    // Get IP and user agent
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    // Create session
    const sessionExpiryHours = parseInt(
      process.env.LANDING_PAGE_SESSION_EXPIRY_HOURS || '24',
      10
    );
    const { sessionToken, expiresAt } = await createLandingPageSession(
      verification.email,
      campaignId,
      ipAddress,
      userAgent,
      sessionExpiryHours
    );

    // Set session cookie
    await setSessionCookie(sessionToken, expiresAt);

    // Redirect to landing page
    return NextResponse.redirect(new URL(`/go/${campaignId}`, req.url));
  } catch (error) {
    console.error('Verify magic link error:', error);
    const { id: campaignId } = await params;
    return NextResponse.redirect(
      new URL(`/go/${campaignId}/auth?error=verification_failed`, req.url)
    );
  }
}

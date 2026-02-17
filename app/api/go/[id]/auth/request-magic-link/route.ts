import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createMagicLink, validateDomainMatch } from '@/lib/auth/landing-page-auth';
import { sendMagicLinkEmail } from '@/lib/auth/send-magic-link';
import { headers } from 'next/headers';
import { isValidEmail } from '@/lib/auth/domain-matcher';

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await req.json();
    const email = body.email as string | undefined;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Get campaign and company info
    const campaign = await prisma.segmentCampaign.findUnique({
      where: { id: campaignId },
      include: {
        company: {
          select: {
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate domain match
    const domainValidation = await validateDomainMatch(email, campaignId);

    if (!domainValidation.valid) {
      // Don't expose whether email exists or domain mismatch (security)
      // Return success message to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If the email matches our records, you will receive a verification link.',
      });
    }

    // Get IP address for rate limiting (future use)
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      'unknown';

    // Create magic link
    const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES || '15', 10);
    const { token, expiresAt } = await createMagicLink(email, campaignId, expiryMinutes);

    // Send magic link email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const emailSent = await sendMagicLinkEmail(
      email,
      campaignId,
      token,
      campaign.company.name,
      baseUrl
    );

    if (!emailSent) {
      // Log error but don't expose to user
      console.error('Failed to send magic link email', { email, campaignId });
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification link sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Request magic link error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

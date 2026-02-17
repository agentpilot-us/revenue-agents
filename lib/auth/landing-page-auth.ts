/**
 * Landing page authentication utilities
 * Handles magic link creation, verification, and session management
 */

import { prisma } from '@/lib/db';
import { extractEmailDomain, matchDomains, isValidEmail } from './domain-matcher';
import { randomBytes } from 'crypto';

/**
 * Generate cryptographically secure random token for magic link
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create magic link token for email verification
 */
export async function createMagicLink(
  email: string,
  campaignId: string,
  expiryMinutes: number = 15
): Promise<{ token: string; expiresAt: Date }> {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  const token = generateMagicLinkToken();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await prisma.landingPageMagicLink.create({
    data: {
      email: email.toLowerCase().trim(),
      campaignId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(
  token: string
): Promise<{ email: string; campaignId: string } | null> {
  const magicLink = await prisma.landingPageMagicLink.findUnique({
    where: { token },
  });

  if (!magicLink) {
    return null;
  }

  // Check if expired
  if (magicLink.expiresAt < new Date()) {
    return null;
  }

  // Check if already used
  if (magicLink.used) {
    return null;
  }

  // Mark as used
  await prisma.landingPageMagicLink.update({
    where: { id: magicLink.id },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });

  return {
    email: magicLink.email,
    campaignId: magicLink.campaignId,
  };
}

/**
 * Create or update landing page visitor and create session
 */
export async function createLandingPageSession(
  email: string,
  campaignId: string,
  ipAddress?: string,
  userAgent?: string,
  sessionExpiryHours: number = 24
): Promise<{ sessionToken: string; expiresAt: Date; visitorId: string }> {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailDomain = extractEmailDomain(normalizedEmail);

  // Create or update visitor
  const visitor = await prisma.landingPageVisitor.upsert({
    where: {
      email_campaignId: {
        email: normalizedEmail,
        campaignId,
      },
    },
    create: {
      email: normalizedEmail,
      emailDomain,
      campaignId,
      verified: true,
      verifiedAt: new Date(),
    },
    update: {
      verified: true,
      verifiedAt: new Date(),
    },
  });

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + sessionExpiryHours * 60 * 60 * 1000);

  await prisma.landingPageSession.create({
    data: {
      visitorId: visitor.id,
      sessionToken,
      campaignId,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt, visitorId: visitor.id };
}

/**
 * Validate landing page session
 */
export async function validateLandingPageSession(
  sessionToken: string,
  campaignId: string
): Promise<{ valid: boolean; visitorId?: string; email?: string }> {
  const session = await prisma.landingPageSession.findUnique({
    where: { sessionToken },
    include: {
      visitor: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return { valid: false };
  }

  // Check if session matches campaign
  if (session.campaignId !== campaignId) {
    return { valid: false };
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    return { valid: false };
  }

  // Update last activity
  await prisma.landingPageSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: new Date(),
    },
  });

  return {
    valid: true,
    visitorId: session.visitor.id,
    email: session.visitor.email,
  };
}

/**
 * Validate email domain matches company domain
 */
export async function validateDomainMatch(
  email: string,
  campaignId: string
): Promise<{ valid: boolean; companyDomain: string | null }> {
  // Get campaign and company
  const campaign = await prisma.segmentCampaign.findUnique({
    where: { id: campaignId },
    include: {
      company: {
        select: {
          domain: true,
        },
      },
    },
  });

  if (!campaign) {
    return { valid: false, companyDomain: null };
  }

  const companyDomain = campaign.company.domain;

  // If company has no domain, allow access (optional auth)
  if (!companyDomain) {
    return { valid: true, companyDomain: null };
  }

  // Extract and match domains
  const emailDomain = extractEmailDomain(email);
  const matches = matchDomains(emailDomain, companyDomain);

  return { valid: matches, companyDomain };
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
  await prisma.landingPageSession.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Landing page authentication middleware
 * Checks for valid session and returns authentication status
 */

import { cookies } from 'next/headers';
import { validateLandingPageSession } from './landing-page-auth';

const SESSION_COOKIE_NAME = 'landing_page_session';

/**
 * Get session token from cookies
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Require landing page authentication
 * Returns authentication status and redirect URL if not authenticated
 */
export async function requireLandingPageAuth(
  campaignId: string
): Promise<{ authenticated: boolean; visitorId?: string; email?: string; redirect?: string }> {
  const sessionToken = await getSessionTokenFromCookies();

  if (!sessionToken) {
    return {
      authenticated: false,
      redirect: `/go/${campaignId}/auth`,
    };
  }

  const validation = await validateLandingPageSession(sessionToken, campaignId);

  if (!validation.valid) {
    return {
      authenticated: false,
      redirect: `/go/${campaignId}/auth`,
    };
  }

  return {
    authenticated: true,
    visitorId: validation.visitorId,
    email: validation.email,
  };
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionToken: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest) => {
  const isAuthenticated = !!req.auth;
  const isPortalRoute = req.nextUrl.pathname.startsWith('/portal');

  if (!isAuthenticated && isPortalRoute) {
    const signInUrl = new URL('/api/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/portal/:path*'],
};

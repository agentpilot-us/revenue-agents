import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

// Only initialize auth if credentials are available
// This prevents the app from crashing if env vars are missing
const hasAuthConfig = 
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET);

let adapter;
if (hasAuthConfig) {
  try {
    adapter = PrismaAdapter(prisma);
  } catch (error: any) {
    console.error('Failed to create PrismaAdapter:', error);
    // Don't throw - allow app to run without auth
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: adapter || undefined,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-for-dev',
  // trustHost allows NextAuth to work with Vercel's preview URLs
  // It trusts the x-forwarded-host header from Vercel
  trustHost: true,
  providers: hasAuthConfig ? [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ] : [],
  callbacks: {
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

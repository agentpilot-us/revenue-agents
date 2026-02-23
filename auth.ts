import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secret?.length) {
  throw new Error(
    'AUTH_SECRET (or NEXTAUTH_SECRET) is required for NextAuth. Add it to .env.local and restart the dev server.'
  );
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM ?? 'login@agentpilot.us';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret,
  pages: {
    error: '/login',
    signIn: '/login',
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(resendApiKey
      ? [
          Resend({
            apiKey: resendApiKey,
            from: resendFrom,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'database',
  },
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
        const u = user as { accountStatus?: string };
        session.user.accountStatus = u.accountStatus ?? 'waitlist';
      }
      return session;
    },
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      accountStatus?: string;
      [key: string]: unknown;
    };
  }
}

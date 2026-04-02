import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

function parseAutoActivateSignInEmails(): Set<string> {
  const raw = process.env.AUTO_ACTIVATE_SIGN_IN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Set accountStatus=active for allowlisted emails (skip waitlist). Runs on create + each sign-in. */
async function maybeAutoActivateUserByEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;
  const allowed = parseAutoActivateSignInEmails();
  if (!allowed.has(normalized)) return;
  try {
    await prisma.user.updateMany({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      data: { accountStatus: 'active', activatedAt: new Date() },
    });
  } catch (e) {
    console.error('[auth] AUTO_ACTIVATE_SIGN_IN_EMAILS update failed:', e);
  }
}

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
    Google({
      id: 'google-workspace',
      name: 'Google Workspace',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/presentations',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/gmail.compose',
          ].join(' '),
        },
      },
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
  events: {
    async createUser({ user }) {
      await maybeAutoActivateUserByEmail(user.email);
    },
    async signIn({ user }) {
      await maybeAutoActivateUserByEmail(user.email);
    },
  },
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

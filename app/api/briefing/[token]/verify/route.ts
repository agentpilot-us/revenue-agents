import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { createHash } from 'crypto';
import { createHmac } from 'crypto';

const COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour
const HMAC_SECRET = process.env.NEXTAUTH_SECRET ?? 'briefing-verify-fallback';

function hashCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase()).digest('hex');
}

function signCookie(token: string): string {
  return createHmac('sha256', HMAC_SECRET).update(token).digest('hex');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.code || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  const briefing = await prisma.sharedBriefing.findUnique({ where: { token } });
  if (!briefing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (briefing.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This briefing link has expired' }, { status: 410 });
  }

  const submittedHash = hashCode(body.code);
  if (submittedHash !== briefing.codeHash) {
    return NextResponse.json({ error: 'Incorrect code' }, { status: 403 });
  }

  const signature = signCookie(token);
  const cookieStore = await cookies();
  cookieStore.set(`briefing_${token}`, signature, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: `/go/briefing/${token}`,
  });

  if (!briefing.viewedAt) {
    await prisma.sharedBriefing.update({
      where: { token },
      data: { viewedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

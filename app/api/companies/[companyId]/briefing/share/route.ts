import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

const EXPIRY_HOURS = parseInt(process.env.BRIEFING_LINK_EXPIRY_HOURS ?? '48', 10);
const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

function hashCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase()).digest('hex');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: { briefingPayload?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.briefingPayload || typeof body.briefingPayload !== 'object') {
    return NextResponse.json({ error: 'briefingPayload is required' }, { status: 400 });
  }

  const token = nanoid(24);
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

  const briefing = await prisma.sharedBriefing.create({
    data: {
      userId: session.user.id,
      companyId,
      token,
      codeHash,
      expiresAt,
      briefingPayload: body.briefingPayload as object,
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return NextResponse.json({
    id: briefing.id,
    url: `${baseUrl}/go/briefing/${token}`,
    code,
    expiresAt: expiresAt.toISOString(),
  });
}

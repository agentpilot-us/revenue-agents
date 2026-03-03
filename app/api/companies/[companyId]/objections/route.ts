import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export type ActiveObjection = {
  id: string;
  objection: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'addressed' | 'resolved';
  response: string | null;
  divisionId: string | null;
  lastRaisedDate: string;
  source: 'ae_manual' | 'chat_agent' | 'signal';
};

const postSchema = z.object({
  objection: z.string().min(1),
  severity: z.enum(['high', 'medium', 'low']).default('medium'),
  divisionId: z.string().optional().nullable(),
  response: z.string().optional().nullable(),
  source: z.enum(['ae_manual', 'chat_agent', 'signal']).default('ae_manual'),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['active', 'addressed', 'resolved']).optional(),
  response: z.string().optional().nullable(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  lastRaisedDate: z.string().datetime().optional(),
});

function parseObjections(raw: unknown): ActiveObjection[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ActiveObjection =>
      item != null &&
      typeof item === 'object' &&
      typeof (item as ActiveObjection).id === 'string' &&
      typeof (item as ActiveObjection).objection === 'string' &&
      ['high', 'medium', 'low'].includes((item as ActiveObjection).severity) &&
      ['active', 'addressed', 'resolved'].includes((item as ActiveObjection).status)
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { activeObjections: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let objections = parseObjections(company.activeObjections);
  const statusFilter = req.nextUrl.searchParams.get('status');
  if (statusFilter === 'active' || statusFilter === 'addressed' || statusFilter === 'resolved') {
    objections = objections.filter((o) => o.status === statusFilter);
  }

  return NextResponse.json({ objections });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, activeObjections: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const existing = parseObjections(company.activeObjections);
  const entry: ActiveObjection = {
    id: randomUUID(),
    objection: parsed.data.objection,
    severity: parsed.data.severity,
    status: 'active',
    response: parsed.data.response ?? null,
    divisionId: parsed.data.divisionId ?? null,
    lastRaisedDate: new Date().toISOString(),
    source: parsed.data.source,
  };
  const next = [...existing, entry];

  await prisma.company.update({
    where: { id: companyId },
    data: { activeObjections: next as unknown as object, updatedAt: new Date() },
  });

  return NextResponse.json({ objection: entry });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, activeObjections: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const existing = parseObjections(company.activeObjections);
  const idx = existing.findIndex((o) => o.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Objection not found' }, { status: 404 });
  }

  const current = existing[idx];
  const updated: ActiveObjection = {
    ...current,
    ...(parsed.data.status != null && { status: parsed.data.status }),
    ...(parsed.data.response !== undefined && { response: parsed.data.response }),
    ...(parsed.data.severity != null && { severity: parsed.data.severity }),
    ...(parsed.data.lastRaisedDate != null && { lastRaisedDate: parsed.data.lastRaisedDate }),
  };
  existing[idx] = updated;

  await prisma.company.update({
    where: { id: companyId },
    data: { activeObjections: existing as unknown as object, updatedAt: new Date() },
  });

  return NextResponse.json({ objection: updated });
}

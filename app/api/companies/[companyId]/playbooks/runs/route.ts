/**
 * Legacy path name — backed by PlayRun / PlayTemplate.
 * GET: active play runs for company. POST: create run from PlayTemplate (playTemplateId).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const runs = await prisma.playRun.findMany({
    where: { companyId, userId: session.user.id, status: { in: ['ACTIVE', 'PAUSED', 'PROPOSED'] } },
    include: {
      playTemplate: { select: { id: true, name: true, slug: true } },
      phaseRuns: { select: { id: true, status: true } },
    },
    orderBy: { activatedAt: 'desc' },
  });

  return NextResponse.json({ runs });
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
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: {
    templateId?: string;
    playTemplateId?: string;
    triggerDate?: string;
    triggerLabel?: string;
    triggerContext?: { triggerDate?: string; triggerLabel?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const playTemplateId = body.playTemplateId ?? body.templateId;
  const triggerDateRaw = body.triggerDate ?? body.triggerContext?.triggerDate;
  const triggerLabel = body.triggerLabel ?? body.triggerContext?.triggerLabel;

  if (!playTemplateId) {
    return NextResponse.json({ error: 'playTemplateId (or templateId) is required' }, { status: 400 });
  }

  const anchorDate = triggerDateRaw ? new Date(triggerDateRaw) : undefined;
  if (anchorDate && Number.isNaN(anchorDate.getTime())) {
    return NextResponse.json({ error: 'Invalid triggerDate' }, { status: 400 });
  }

  try {
    const playRun = await createPlayRunFromTemplate({
      userId: session.user.id,
      companyId,
      playTemplateId,
      anchorDate: anchorDate ?? null,
      triggerType: 'MANUAL',
      triggerContext: triggerLabel ? { triggerLabel } : undefined,
    });

    return NextResponse.json({ run: playRun, runId: playRun.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create run';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getNeedsAttentionContacts } from '@/lib/contacts/contact-pulse';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  const [contacts, overduePhases, atRiskPlays] = await Promise.all([
    getNeedsAttentionContacts(userId, 15),

    // PlayPhaseRun where status = ACTIVE and targetDate < now
    prisma.playPhaseRun.findMany({
      where: {
        status: 'ACTIVE',
        targetDate: { lt: now },
        playRun: { userId, status: 'ACTIVE' },
      },
      select: {
        id: true,
        playRunId: true,
        targetDate: true,
        phaseTemplate: { select: { name: true } },
        playRun: {
          select: {
            companyId: true,
            company: { select: { name: true } },
            playTemplate: { select: { name: true } },
          },
        },
      },
      orderBy: { targetDate: 'asc' },
      take: 20,
    }),

    // PlayRun where status = AT_RISK
    prisma.playRun.findMany({
      where: { userId, status: 'AT_RISK' },
      select: {
        id: true,
        companyId: true,
        company: { select: { name: true } },
        playTemplate: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    contacts,
    overduePhases: overduePhases.map((p) => ({
      phaseRunId: p.id,
      playRunId: p.playRunId,
      companyId: p.playRun.companyId,
      companyName: p.playRun.company.name,
      phaseName: p.phaseTemplate.name,
      playName: p.playRun.playTemplate.name,
      targetDate: p.targetDate,
    })),
    atRiskPlays: atRiskPlays.map((r) => ({
      playRunId: r.id,
      companyId: r.companyId,
      companyName: r.company.name,
      playName: r.playTemplate.name,
    })),
  });
}

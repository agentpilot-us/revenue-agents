import { prisma } from '@/lib/db';

/** When a run was flagged stale, clear AT_RISK after meaningful progress (execute, generate, or PATCH to ACTIVE). */
export async function clearPlayRunAtRiskOnProgress(playRunId: string): Promise<void> {
  const run = await prisma.playRun.findUnique({
    where: { id: playRunId },
    select: { status: true, triggerContext: true },
  });
  if (!run || run.status !== 'AT_RISK') return;

  const prev =
    run.triggerContext != null && typeof run.triggerContext === 'object' && !Array.isArray(run.triggerContext)
      ? { ...(run.triggerContext as Record<string, unknown>) }
      : {};
  delete prev.staleSince;
  prev.staleClearedAt = new Date().toISOString();

  await prisma.playRun.update({
    where: { id: playRunId },
    data: {
      status: 'ACTIVE',
      triggerContext: prev as import('@prisma/client').Prisma.InputJsonValue,
    },
  });
}

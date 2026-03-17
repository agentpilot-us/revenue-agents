import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * POST /api/action-workflows/from-play
 * @deprecated ActionWorkflows are deprecated. Use POST /api/play-runs with playTemplateId (and companyId, optional accountSignalId, targetContactId) instead.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(
    {
      error:
        'ActionWorkflow creation is deprecated. Use POST /api/play-runs with body { companyId, playTemplateId, accountSignalId?, targetContactId? } and open the returned run at /dashboard/companies/[companyId]/plays/run/[runId].',
    },
    { status: 410 },
  );
}

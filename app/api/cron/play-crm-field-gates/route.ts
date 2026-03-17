/**
 * Cron: CRM_FIELD phase gate evaluation.
 * Runs daily (e.g. alongside play-timeline-triggers). Finds PlayPhaseRuns where
 * gateType = CRM_FIELD and status = ACTIVE, reads gateConfig (e.g. { field: "stage", value: "Closed Won" }),
 * checks Company.salesforceOpportunityData (or CompanyProduct) for a match, and advances the phase when met.
 *
 * Secure with CRON_SECRET (Bearer token in Authorization header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JSON_NOT_NULL } from '@/lib/prisma-json';
import { completePhaseAndAdvance } from '@/lib/plays/execute-action';

function getNested(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const phaseRuns = await prisma.playPhaseRun.findMany({
      where: {
        status: 'ACTIVE',
        phaseTemplate: { gateType: 'CRM_FIELD', gateConfig: JSON_NOT_NULL },
        playRun: { status: 'ACTIVE' },
      },
      include: {
        phaseTemplate: { select: { gateConfig: true } },
        playRun: { select: { id: true, userId: true, companyId: true } },
      },
    });

    let advanced = 0;
    const errors: string[] = [];

    for (const pr of phaseRuns) {
      const config = pr.phaseTemplate.gateConfig as { field?: string; value?: string } | null;
      if (!config?.field || config.value === undefined) continue;

      const company = await prisma.company.findUnique({
        where: { id: pr.playRun.companyId },
        select: { salesforceOpportunityData: true },
      });

      const data = company?.salesforceOpportunityData as Record<string, unknown> | null | undefined;
      const actual = getNested(data ?? {}, config.field);
      const match =
        String(actual).toLowerCase().trim() === String(config.value).toLowerCase().trim();

      if (!match) continue;

      try {
        await completePhaseAndAdvance(pr.id, pr.playRun.id, pr.playRun.userId);
        advanced++;
      } catch (err) {
        errors.push(`${pr.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: phaseRuns.length,
      advanced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('GET /api/cron/play-crm-field-gates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 },
    );
  }
}

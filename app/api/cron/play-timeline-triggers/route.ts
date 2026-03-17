/**
 * Cron: TIMELINE play auto-activation.
 * Runs daily (or on schedule). Finds PlayTemplates with triggerType TIMELINE,
 * resolves anchorField to CompanyProduct contract dates (contractRenewalDate,
 * contractEnd, contractStart), and creates PlayRuns when the offset threshold
 * is crossed (e.g. T-90 renewal = contractRenewalDate in ~90 days from today).
 *
 * Secure with CRON_SECRET (Bearer token in Authorization header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

/** Anchor field name → CompanyProduct date field. */
const ANCHOR_FIELD_TO_SOURCE: Record<string, 'contractRenewalDate' | 'contractEnd' | 'contractStart'> = {
  contractEndDate: 'contractRenewalDate',
  contractRenewalDate: 'contractRenewalDate',
  contractEnd: 'contractEnd',
  contractStartDate: 'contractStart',
  contractStart: 'contractStart',
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const timelineTemplates = await prisma.playTemplate.findMany({
      where: { triggerType: 'TIMELINE', status: 'ACTIVE', anchorField: { not: null } },
      select: {
        id: true,
        userId: true,
        name: true,
        anchorField: true,
        anchorOffsetDays: true,
      },
    });

    let totalCreated = 0;
    const errors: string[] = [];

    for (const template of timelineTemplates) {
      const anchorField = template.anchorField!.trim();
      const dateField = ANCHOR_FIELD_TO_SOURCE[anchorField] ?? 'contractRenewalDate';
      const offsetDays = template.anchorOffsetDays ?? 0;

      // We want: anchorDate + offsetDays ≈ today => anchorDate = today - offsetDays
      const targetAnchorStart = new Date(dayStart);
      targetAnchorStart.setDate(targetAnchorStart.getDate() - offsetDays);
      const targetAnchorEnd = new Date(targetAnchorStart);
      targetAnchorEnd.setDate(targetAnchorEnd.getDate() + 1);

      const whereDate =
        dateField === 'contractStart'
          ? { contractStart: { gte: targetAnchorStart, lt: targetAnchorEnd } }
          : dateField === 'contractEnd'
            ? { contractEnd: { gte: targetAnchorStart, lt: targetAnchorEnd } }
            : { contractRenewalDate: { gte: targetAnchorStart, lt: targetAnchorEnd } };

      const companyProducts = await prisma.companyProduct.findMany({
        where: {
          ...whereDate,
          company: { userId: template.userId },
        },
        select: {
          id: true,
          companyId: true,
          contractRenewalDate: true,
          contractEnd: true,
          contractStart: true,
        },
      });

      for (const cp of companyProducts) {
        const anchorDate =
          dateField === 'contractStart'
            ? cp.contractStart!
            : dateField === 'contractEnd'
              ? cp.contractEnd!
              : cp.contractRenewalDate!;

        const existing = await prisma.playRun.findFirst({
          where: {
            companyId: cp.companyId,
            playTemplateId: template.id,
            status: 'ACTIVE',
            anchorDate: {
              gte: new Date(anchorDate.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(anchorDate.getTime() + 12 * 60 * 60 * 1000),
            },
          },
        });
        if (existing) continue;

        try {
          await createPlayRunFromTemplate({
            userId: template.userId,
            companyId: cp.companyId,
            playTemplateId: template.id,
            anchorDate,
          });
          totalCreated++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${template.name} @ company ${cp.companyId}: ${msg}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      runsCreated: totalCreated,
      templatesChecked: timelineTemplates.length,
      ...(errors.length > 0 && { errors: errors.slice(0, 20) }),
    });
  } catch (error) {
    console.error('[cron/play-timeline-triggers]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/play-runs/suggest-from-objective
 * Match objective text to a PlayTemplate; return proposed plan for review.
 * Used by Custom Play "Suggest a Plan with AI" → create PlayRun with triggerType=OBJECTIVE on confirm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const maxDuration = 30;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function scoreMatch(objectiveTokens: string[], template: { name: string; description: string | null; signalTypes: string[]; category: string }): number {
  const nameTokens = tokenize(template.name);
  const descTokens = tokenize(template.description ?? '');
  const signalTokens = template.signalTypes.flatMap((t) => tokenize(t));
  const categoryTokens = tokenize(template.category);
  const allTemplate = new Set([...nameTokens, ...descTokens, ...signalTokens, ...categoryTokens]);
  let hits = 0;
  for (const t of objectiveTokens) {
    if (allTemplate.has(t)) hits++;
    else if ([...allTemplate].some((x) => x.includes(t) || t.includes(x))) hits += 0.5;
  }
  return objectiveTokens.length > 0 ? hits / objectiveTokens.length : 0;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const objectiveText = typeof body.objectiveText === 'string' ? body.objectiveText.trim() : '';
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    const roadmapTargetId = typeof body.roadmapTargetId === 'string' ? body.roadmapTargetId : null;
    const productId = typeof body.productId === 'string' ? body.productId : null;
    const roadmapId = typeof body.roadmapId === 'string' ? body.roadmapId : null;

    if (!objectiveText || !companyId) {
      return NextResponse.json({ error: 'objectiveText and companyId are required' }, { status: 400 });
    }

    const templates = await prisma.playTemplate.findMany({
      where: { userId: session.user.id, status: 'ACTIVE' },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          include: {
            contentTemplates: {
              select: { id: true, name: true, contentGenerationType: true },
            },
          },
        },
      },
    });

    const objectiveTokens = tokenize(objectiveText);
    const scored = templates.map((t) => ({
      template: t,
      score: scoreMatch(objectiveTokens, {
        name: t.name,
        description: t.description,
        signalTypes: t.signalTypes,
        category: t.category,
      }),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const playTemplate = best && best.score >= 0.15 ? best.template : scored.find((s) => s.template.slug === 'expansion-cross-sell')?.template ?? scored[0]?.template;

    if (!playTemplate) {
      return NextResponse.json({
        playTemplateId: null,
        playTemplateName: 'Custom objective',
        phases: [{ name: 'Outreach', steps: [{ name: objectiveText.slice(0, 80) + (objectiveText.length > 80 ? '…' : ''), contentGenerationType: 'custom_content' }] }],
        roadmapTargetId,
        productId,
        objectiveText,
        matched: false,
      });
    }

    const phases = playTemplate.phases.map((ph) => ({
      id: ph.id,
      name: ph.name,
      steps: ph.contentTemplates.map((ct) => ({
        id: ct.id,
        name: ct.name,
        contentGenerationType: (ct as { contentGenerationType?: string }).contentGenerationType ?? 'custom_content',
      })),
    }));

    return NextResponse.json({
      playTemplateId: playTemplate.id,
      playTemplateName: playTemplate.name,
      phases,
      roadmapTargetId,
      productId,
      objectiveText,
      matched: true,
    });
  } catch (error) {
    console.error('POST /api/play-runs/suggest-from-objective error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest plan' },
      { status: 500 },
    );
  }
}

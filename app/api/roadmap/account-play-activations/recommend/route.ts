import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type ScoredTemplate = {
  playTemplateId: string;
  name: string;
  description: string | null;
  triggerType: string;
  category: string | null;
  score: number;
  reasons: string[];
  alreadyActivated: boolean;
};

/**
 * GET /api/roadmap/account-play-activations/recommend?roadmapId=...
 * Returns suggested PlayTemplates for the roadmap (scored by account signals and context).
 * UI activates via POST /api/roadmap/account-play-activations with playTemplateId.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roadmapId = req.nextUrl.searchParams.get('roadmapId');
    if (!roadmapId) {
      return NextResponse.json({ error: 'roadmapId is required' }, { status: 400 });
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      select: { id: true, companyId: true },
    });

    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }
    if (!roadmap.companyId) {
      return NextResponse.json({ error: 'No company linked to roadmap' }, { status: 400 });
    }

    const [company, signals, activations, templates] = await Promise.all([
      prisma.company.findFirst({
        where: { id: roadmap.companyId },
        select: { id: true, industry: true },
      }),
      prisma.accountSignal.findMany({
        where: { companyId: roadmap.companyId, status: { not: 'acted' } },
        select: { type: true },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
      prisma.accountPlayActivation.findMany({
        where: { roadmapId, isActive: true },
        select: { playTemplateId: true },
      }),
      prisma.playTemplate.findMany({
        where: { userId: session.user.id, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          description: true,
          triggerType: true,
          category: true,
        },
      }),
    ]);

    const activatedSet = new Set(activations.map((a) => a.playTemplateId));
    const signalTypes = new Set(signals.map((s) => s.type));
    const accountIndustry = (company?.industry ?? '').toLowerCase();

    const scored: ScoredTemplate[] = templates.map((t) => {
      let score = 0;
      const reasons: string[] = [];

      // Signal type match
      const triggerStr = String(t.triggerType);
      if (signalTypes.size > 0) {
        const match = [...signalTypes].some(
          (s) =>
            s.toLowerCase().includes(triggerStr.toLowerCase()) ||
            triggerStr.toLowerCase().includes(s.toLowerCase())
        );
        if (match) {
          score += 30;
          reasons.push(`Matches active signal: ${triggerStr.replace(/_/g, ' ')}`);
        }
      }

      // Category / relevance
      if (t.category) {
        score += 10;
        reasons.push(`Category: ${t.category.replace(/_/g, ' ')}`);
      }

      // Industry hint (if we had it on PlayTemplate we could match; for now generic boost)
      if (accountIndustry) {
        score += 5;
      }

      const alreadyActivated = activatedSet.has(t.id);
      if (alreadyActivated) {
        score -= 50;
      }

      return {
        playTemplateId: t.id,
        name: t.name,
        description: t.description,
        triggerType: t.triggerType,
        category: t.category,
        score: Math.max(0, score),
        reasons,
        alreadyActivated,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      recommendations: scored.slice(0, 10),
    });
  } catch (error) {
    console.error('GET /api/roadmap/account-play-activations/recommend error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

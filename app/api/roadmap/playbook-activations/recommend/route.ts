import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type ScoredTemplate = {
  templateId: string;
  name: string;
  description: string | null;
  triggerType: string | null;
  priority: number;
  score: number;
  reasons: string[];
  alreadyActivated: boolean;
};

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

    const [company, departments, signals, activations] = await Promise.all([
      prisma.company.findFirst({
        where: { id: roadmap.companyId },
        select: { id: true, industry: true, primaryMotion: true },
      }),
      prisma.companyDepartment.findMany({
        where: { companyId: roadmap.companyId },
        select: { type: true },
      }),
      prisma.accountSignal.findMany({
        where: { companyId: roadmap.companyId, status: { not: 'acted' } },
        select: { type: true },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
      prisma.playbookActivation.findMany({
        where: { roadmapId, isActive: true },
        select: { templateId: true },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const templates = await prisma.playbookTemplate.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        description: true,
        triggerType: true,
        targetDepartmentTypes: true,
        targetIndustries: true,
        targetPersonas: true,
        priority: true,
      },
    });

    const activatedSet = new Set(activations.map((a) => a.templateId));

    const accountIndustry = company.industry?.toLowerCase() ?? '';
    const accountDeptTypes = new Set(departments.map((d) => d.type));
    const signalTypes = new Set(signals.map((s) => s.type));

    const scored: ScoredTemplate[] = templates.map((t) => {
      let score = 0;
      const reasons: string[] = [];

      // Industry match
      const targetIndustries = (t.targetIndustries as string[] | null) ?? [];
      if (targetIndustries.length > 0 && accountIndustry) {
        const match = targetIndustries.some(
          (ind) => accountIndustry.includes(ind.toLowerCase()) || ind.toLowerCase().includes(accountIndustry)
        );
        if (match) {
          score += 25;
          reasons.push(`Industry match: ${company.industry}`);
        }
      }

      // Department type match
      const targetDepts = (t.targetDepartmentTypes as string[] | null) ?? [];
      if (targetDepts.length > 0 && accountDeptTypes.size > 0) {
        const matchingDepts = targetDepts.filter((d) => accountDeptTypes.has(d as never));
        if (matchingDepts.length > 0) {
          score += 20 + Math.min(matchingDepts.length * 5, 15);
          reasons.push(`Department match: ${matchingDepts.join(', ')}`);
        }
      }

      // Signal type relevance
      if (t.triggerType && signalTypes.size > 0) {
        const triggerLower = t.triggerType.toLowerCase();
        const signalMatch = [...signalTypes].some(
          (s) => s.toLowerCase().includes(triggerLower) || triggerLower.includes(s.toLowerCase())
        );
        if (signalMatch) {
          score += 20;
          reasons.push(`Matches active signal: ${t.triggerType}`);
        }
      }

      // Priority boost
      if (t.priority > 0) {
        score += Math.min(t.priority * 2, 10);
        if (t.priority >= 3) reasons.push('High priority template');
      }

      // Penalty for already activated
      const alreadyActivated = activatedSet.has(t.id);
      if (alreadyActivated) {
        score -= 50;
      }

      return {
        templateId: t.id,
        name: t.name,
        description: t.description,
        triggerType: t.triggerType,
        priority: t.priority,
        score,
        reasons,
        alreadyActivated,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      recommendations: scored.slice(0, 10),
    });
  } catch (error) {
    console.error('GET /api/roadmap/playbook-activations/recommend error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

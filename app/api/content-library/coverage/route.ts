import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { libraryTypesForGenerationType } from '@/lib/my-company/content-generation-to-library-types';

export type CoverageGap = {
  contentGenerationType: string;
  stepName: string;
  libraryTypes: string[];
  count: number;
};

export type TemplateCoverage = {
  templateId: string;
  templateName: string;
  gaps: CoverageGap[];
};

/**
 * GET /api/content-library/coverage
 * Per ACTIVE template: library types implied by contentGenerationType vs counts in Content Library.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const templates = await prisma.playTemplate.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        phases: {
          orderBy: { orderIndex: 'asc' },
          select: {
            contentTemplates: {
              orderBy: { orderIndex: 'asc' },
              select: { name: true, contentGenerationType: true },
            },
          },
        },
      },
    });

    const typeCounts = await prisma.contentLibrary.groupBy({
      by: ['type'],
      where: { userId, isActive: true, archivedAt: null },
      _count: { id: true },
    });
    const countByType = new Map(typeCounts.map((r) => [r.type, r._count.id]));

    const result: TemplateCoverage[] = [];

    for (const t of templates) {
      const gaps: CoverageGap[] = [];
      for (const phase of t.phases) {
        for (const ct of phase.contentTemplates) {
          const libTypes = libraryTypesForGenerationType(ct.contentGenerationType);
          if (libTypes.length === 0) continue;
          let minCount = Infinity;
          for (const lt of libTypes) {
            const c = countByType.get(lt) ?? 0;
            minCount = Math.min(minCount, c);
          }
          if (minCount === 0) {
            gaps.push({
              contentGenerationType: ct.contentGenerationType,
              stepName: ct.name,
              libraryTypes: [...libTypes],
              count: 0,
            });
          }
        }
      }
      if (gaps.length > 0) {
        result.push({ templateId: t.id, templateName: t.name, gaps });
      }
    }

    return NextResponse.json({ templates: result });
  } catch (e) {
    console.error('GET /api/content-library/coverage:', e);
    return NextResponse.json({ error: 'Failed to compute coverage' }, { status: 500 });
  }
}

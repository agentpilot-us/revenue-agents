import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/roadmap/preview-signal?roadmapId=...&signalCategory=...
 * Resolves PlayTemplate via SignalPlayMapping for the signal category.
 * Returns template and phases; would create PlayRun.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roadmapId = req.nextUrl.searchParams.get('roadmapId');
    const signalCategory = req.nextUrl.searchParams.get('signalCategory');

    if (!roadmapId || !signalCategory) {
      return NextResponse.json(
        { error: 'roadmapId and signalCategory are required' },
        { status: 400 }
      );
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        targets: {
          take: 1,
          select: {
            id: true,
            name: true,
            companyDepartmentId: true,
            contacts: {
              take: 3,
              include: {
                contact: { select: { id: true, firstName: true, lastName: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!roadmap || !roadmap.company) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const signalTypeNorm = signalCategory.trim().toLowerCase();
    const mappings = await prisma.signalPlayMapping.findMany({
      where: {
        userId: session.user.id,
        playTemplate: { status: 'ACTIVE' },
      },
      include: {
        playTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
            triggerType: true,
            phases: {
              orderBy: { orderIndex: 'asc' },
              select: { name: true, orderIndex: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const mapping = mappings.find((m) => {
      const t = m.signalType.trim().toLowerCase();
      return t === signalTypeNorm || signalTypeNorm.includes(t) || t.includes(signalTypeNorm);
    }) ?? null;

    const targetDiv = roadmap.targets[0];
    const targetContacts = (targetDiv?.contacts ?? [])
      .filter((tc) => tc.contact != null)
      .map((tc) => ({
        id: tc.contact!.id,
        name: `${tc.contact!.firstName} ${tc.contact!.lastName}`,
        title: tc.contact!.title,
      }));

    if (!mapping) {
      return NextResponse.json({
        preview: {
          signalCategory,
          signalDescription: `[Preview] ${signalCategory.replace(/_/g, ' ')}`,
          resolvedTemplate: null,
          resolvedTemplateName: null,
          targetDivision: targetDiv ? { id: targetDiv.id, name: targetDiv.name } : null,
          targetContacts,
          wouldCreate: null,
          message: 'No PlayTemplate mapped for this signal category. Add a Signal Play Mapping in SAP.',
        },
      });
    }

    const template = mapping.playTemplate;
    const phases = template.phases.map((p) => ({
      order: p.orderIndex,
      name: p.name,
    }));

    return NextResponse.json({
      preview: {
        signalCategory,
        signalDescription: `[Preview] ${signalCategory.replace(/_/g, ' ')}`,
        resolvedTemplate: {
          id: template.id,
          name: template.name,
          description: template.description,
          triggerType: template.triggerType,
          phases,
        },
        resolvedTemplateName: template.name,
        targetDivision: targetDiv ? { id: targetDiv.id, name: targetDiv.name } : null,
        targetContacts,
        wouldCreate: 'PlayRun',
      },
    });
  } catch (error) {
    console.error('GET /api/roadmap/preview-signal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview signal' },
      { status: 500 }
    );
  }
}

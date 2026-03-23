import { NextRequest, NextResponse } from 'next/server';
import { PlayTemplateStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  createPlayTemplateFromBody,
  maybeActivatePlayTemplateForCompany,
  playTemplateCreateBodySchema,
} from '@/lib/plays/play-template-api';

/**
 * GET /api/play-templates
 * List PlayTemplates (new schema) for the current user. Returns ACTIVE templates
 * with phase count for the Play catalog.
 * Optional ?companyId=xxx: when provided, only templates activated for that company's
 * roadmap (AccountPlayActivation) are returned, so "Start from Catalog" shows account-scoped plays.
 *
 * ?scope=governance — DRAFT, ACTIVE, ARCHIVED for My Company Playbooks (no company activation filter).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const scope = searchParams.get('scope');

    const governance = scope === 'governance';

    let playTemplateIds: string[] | null = null;
    if (companyId && !governance) {
      const roadmap = await prisma.adaptiveRoadmap.findFirst({
        where: { userId: session.user.id, companyId },
        select: { id: true },
      });
      if (roadmap) {
        const activations = await prisma.accountPlayActivation.findMany({
          where: { roadmapId: roadmap.id, isActive: true },
          select: { playTemplateId: true },
        });
        playTemplateIds = activations.map((a) => a.playTemplateId);
      }
    }

    const templates = await prisma.playTemplate.findMany({
      where: {
        userId: session.user.id,
        ...(governance ?
          { status: { in: ['DRAFT', 'ACTIVE', 'ARCHIVED'] } }
        : {
            status: 'ACTIVE',
            ...(playTemplateIds !== null ? { id: { in: playTemplateIds } } : {}),
          }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        category: true,
        triggerType: true,
        scope: true,
        status: true,
        defaultAutonomyLevel: true,
        updatedAt: true,
        _count: { select: { phases: true } },
      },
      orderBy: governance ? { updatedAt: 'desc' } : { name: 'asc' },
    });

    const list = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      slug: t.slug,
      category: t.category,
      triggerType: t.triggerType,
      scope: t.scope,
      status: t.status,
      defaultAutonomyLevel: t.defaultAutonomyLevel ?? null,
      phaseCount: t._count.phases,
      ...(governance ? { updatedAt: t.updatedAt.toISOString() } : {}),
    }));

    return NextResponse.json({ templates: list });
  } catch (error) {
    console.error('GET /api/play-templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play templates' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/play-templates
 * Create a PlayTemplate with phases and one ContentTemplate per phase (builder v1).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = playTemplateCreateBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const userId = session.user.id;

    const wantsActivation =
      body.status === PlayTemplateStatus.ACTIVE &&
      body.companyId?.trim() &&
      (body.activateForCompany !== false);

    if (wantsActivation) {
      const roadmap = await prisma.adaptiveRoadmap.findFirst({
        where: { userId, companyId: body.companyId!.trim() },
        select: { id: true },
      });
      if (!roadmap) {
        return NextResponse.json(
          {
            error:
              'No Strategic Account Plan exists for this company. Create a plan from the roadmap first, or disable “Activate for this account”.',
          },
          { status: 400 },
        );
      }
    }

    const { templateId, slug } = await createPlayTemplateFromBody(prisma, userId, body);

    if (wantsActivation) {
      const act = await maybeActivatePlayTemplateForCompany(
        prisma,
        userId,
        templateId,
        body.companyId!.trim(),
      );
      if (!act.ok) {
        return NextResponse.json({ error: act.error }, { status: 400 });
      }
    }

    const template = await prisma.playTemplate.findFirst({
      where: { id: templateId, userId },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          include: {
            contentTemplates: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    return NextResponse.json({
      template: template
        ? {
            id: template.id,
            name: template.name,
            description: template.description,
            slug: template.slug,
            category: template.category,
            triggerType: template.triggerType,
            scope: template.scope,
            status: template.status,
            phaseCount: template.phases.length,
          }
        : { id: templateId, slug },
      slug,
    });
  } catch (error) {
    console.error('POST /api/play-templates error:', error);
    return NextResponse.json(
      { error: 'Failed to create play template' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { parseAutonomyLevel } from '@/lib/plays/autonomy';
import {
  playTemplateCreateBodySchema,
  replacePlayTemplateFromBody,
  splitPromptForEditor,
} from '@/lib/plays/play-template-api';

const ACTIVE_RUN_STATUSES = ['ACTIVE', 'PROPOSED', 'PAUSED'] as const;

/**
 * GET /api/play-templates/[id]
 * Catalog drawer (summary) + full editor payload (phases, prompts, gateConfig).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const template = await prisma.playTemplate.findFirst({
      where: { id, userId: session.user.id },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          include: {
            contentTemplates: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
    }

    const editorPhases = template.phases.map((p) => {
      const rawGate = p.gateConfig as Record<string, unknown> | null;
      const uiPhaseKind =
        rawGate && typeof rawGate.uiPhaseKind === 'string' ? rawGate.uiPhaseKind : null;
      const gateConfigClean =
        rawGate ?
          Object.fromEntries(
            Object.entries(rawGate).filter(([k]) => k !== 'uiPhaseKind'),
          )
        : {};

      return {
        id: p.id,
        name: p.name,
        orderIndex: p.orderIndex,
        offsetDays: p.offsetDays,
        description: p.description,
        gateType: p.gateType,
        gateConfig: Object.keys(gateConfigClean).length ? gateConfigClean : null,
        uiPhaseKind,
        // PlayDetailDrawer and catalog expect `contentTemplates`; builder uses extended fields.
        contentTemplates: p.contentTemplates.map((c) => {
          const { promptMode, promptHint, rawPromptTemplate } = splitPromptForEditor(c.promptTemplate);
          return {
            id: c.id,
            name: c.name,
            orderIndex: c.orderIndex,
            contentType: c.contentType,
            channel: c.channel,
            contentGenerationType: c.contentGenerationType,
            requiresContact: c.requiresContact,
            isAutomatable: c.isAutomatable,
            promptMode,
            promptHint,
            rawPromptTemplate,
            systemInstructions: c.systemInstructions,
            governanceRules: c.governanceRules,
          };
        }),
      };
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        slug: template.slug,
        category: template.category,
        triggerType: template.triggerType,
        scope: template.scope,
        status: template.status,
        signalTypes: template.signalTypes,
        anchorField: template.anchorField,
        anchorOffsetDays: template.anchorOffsetDays,
        defaultAutonomyLevel: template.defaultAutonomyLevel ?? null,
        phaseCount: template.phases.length,
      },
      phases: editorPhases,
    });
  } catch (error) {
    console.error('GET /api/play-templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch play template' }, { status: 500 });
  }
}

/**
 * PATCH /api/play-templates/[id]
 * Update governance fields: defaultAutonomyLevel (org-wide default for this template).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: { defaultAutonomyLevel?: import('@prisma/client').AutonomyLevel } = {};
    if (body.defaultAutonomyLevel !== undefined) {
      const parsed = parseAutonomyLevel(body.defaultAutonomyLevel);
      if (parsed != null) {
        updates.defaultAutonomyLevel = parsed;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const template = await prisma.playTemplate.updateMany({
      where: { id, userId: session.user.id },
      data: updates,
    });

    if (template.count === 0) {
      return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/play-templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update play template' }, { status: 500 });
  }
}

/**
 * PUT /api/play-templates/[id]
 * Full replace when no active runs; header-only when runs exist.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const raw = await req.json().catch(() => null);
    const userId = session.user.id;

    const runCount = await prisma.playRun.count({
      where: {
        playTemplateId: id,
        userId,
        status: { in: [...ACTIVE_RUN_STATUSES] },
      },
    });

    if (runCount > 0) {
      const allowedKeys = new Set(['name', 'description', 'defaultAutonomyLevel', 'status']);
      const keys = raw && typeof raw === 'object' ? Object.keys(raw as object) : [];
      if (keys.some((k) => !allowedKeys.has(k))) {
        return NextResponse.json(
          {
            error:
              'This template has active play runs. Only name, description, default autonomy, and status can be changed. Clone the template to edit phases and steps.',
            code: 'STRUCTURAL_EDIT_BLOCKED',
            suggestion: 'clone',
          },
          { status: 409 },
        );
      }

      const autonomy =
        (raw as { defaultAutonomyLevel?: string }).defaultAutonomyLevel !== undefined ?
          parseAutonomyLevel((raw as { defaultAutonomyLevel?: string }).defaultAutonomyLevel)
        : undefined;

      const data: {
        name?: string;
        description?: string | null;
        defaultAutonomyLevel?: import('@prisma/client').AutonomyLevel;
        status?: import('@prisma/client').PlayTemplateStatus;
      } = {};

      if (typeof (raw as { name?: string }).name === 'string') {
        data.name = (raw as { name: string }).name.trim();
      }
      if ('description' in (raw as object)) {
        data.description =
          (raw as { description?: string | null }).description?.trim() || null;
      }
      if (autonomy !== undefined && autonomy !== null) {
        data.defaultAutonomyLevel = autonomy;
      }
      if ((raw as { status?: string }).status) {
        data.status = (raw as { status: import('@prisma/client').PlayTemplateStatus }).status;
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
      }

      const updated = await prisma.playTemplate.updateMany({
        where: { id, userId },
        data,
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    const parsed = playTemplateCreateBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const { slug } = await replacePlayTemplateFromBody(prisma, userId, id, parsed.data);
      return NextResponse.json({ ok: true, slug });
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
      }
      throw e;
    }
  } catch (error) {
    console.error('PUT /api/play-templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update play template' }, { status: 500 });
  }
}

/**
 * DELETE /api/play-templates/[id]
 * Soft-archive (ARCHIVED). Optional ?force=1 when active runs exist.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const userId = session.user.id;
    const force = req.nextUrl.searchParams.get('force') === '1';

    const runCount = await prisma.playRun.count({
      where: {
        playTemplateId: id,
        userId,
        status: { in: [...ACTIVE_RUN_STATUSES] },
      },
    });

    if (runCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `This template has ${runCount} active play run(s). Archive anyway?`,
          code: 'HAS_ACTIVE_RUNS',
        },
        { status: 409 },
      );
    }

    const updated = await prisma.playTemplate.updateMany({
      where: { id, userId },
      data: { status: 'ARCHIVED' },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/play-templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to archive play template' }, { status: 500 });
  }
}

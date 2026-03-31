import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { CONTENT_GENERATION_TYPE_KEYS } from '@/lib/plays/content-generation-types';

/**
 * PATCH /api/content-templates/[id]
 * Update ContentTemplate fields: contentGenerationType, requiresContact, isAutomatable.
 * Used by PlayTemplate editor (My Company → Playbooks).
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
      return NextResponse.json({ error: 'Content template ID required' }, { status: 400 });
    }

    const existing = await prisma.contentTemplate.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        phaseTemplate: { select: { playTemplateId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Content template not found' }, { status: 404 });
    }

    const body = await req.json();
    const contentGenerationType =
      typeof body.contentGenerationType === 'string'
        ? (CONTENT_GENERATION_TYPE_KEYS.includes(body.contentGenerationType)
            ? body.contentGenerationType
            : 'custom_content')
        : undefined;
    const requiresContact =
      typeof body.requiresContact === 'boolean' ? body.requiresContact : undefined;
    const isAutomatable =
      typeof body.isAutomatable === 'boolean' ? body.isAutomatable : undefined;

    const data: {
      contentGenerationType?: string;
      requiresContact?: boolean;
      isAutomatable?: boolean;
      playTemplateRoleId?: string | null;
    } = {};
    if (contentGenerationType !== undefined) data.contentGenerationType = contentGenerationType;
    if (requiresContact !== undefined) data.requiresContact = requiresContact;
    if (isAutomatable !== undefined) data.isAutomatable = isAutomatable;

    if (body.playTemplateRoleId !== undefined) {
      const raw = body.playTemplateRoleId;
      if (raw === null || raw === '') {
        data.playTemplateRoleId = null;
      } else if (typeof raw === 'string') {
        const playTemplateId = existing.phaseTemplate?.playTemplateId;
        if (!playTemplateId) {
          return NextResponse.json(
            { error: 'Content template has no phase; cannot set role' },
            { status: 400 },
          );
        }
        const role = await prisma.playTemplateRole.findFirst({
          where: { id: raw, playTemplateId },
          select: { id: true },
        });
        if (!role) {
          return NextResponse.json(
            { error: 'playTemplateRoleId must belong to this play template' },
            { status: 400 },
          );
        }
        data.playTemplateRoleId = raw;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true });
    }

    await prisma.contentTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/content-templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update content template' },
      { status: 500 },
    );
  }
}

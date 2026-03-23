import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { clonePlayTemplate } from '@/lib/plays/play-template-api';

/**
 * POST /api/play-templates/[id]/clone
 * Duplicate template as DRAFT with new slug (for 409 structural-edit flow).
 */
export async function POST(
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

    try {
      const { templateId, slug } = await clonePlayTemplate(prisma, session.user.id, id);
      return NextResponse.json({ templateId, slug, ok: true });
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
      }
      throw e;
    }
  } catch (error) {
    console.error('POST /api/play-templates/[id]/clone error:', error);
    return NextResponse.json({ error: 'Failed to clone play template' }, { status: 500 });
  }
}

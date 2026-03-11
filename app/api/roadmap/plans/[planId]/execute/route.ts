import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateOneContent } from '@/lib/plays/generate-content';
import { generateSalesPageSections } from '@/lib/campaigns/generate-sales-page';
import type { PageType } from '@/lib/campaigns/build-sales-page-prompt';
import {
  playContentTypeToChannel,
  type ChannelId,
} from '@/lib/content/channel-config';

type PreviewPayload = {
  title?: string;
  description?: string;
  contentType?: string;
  weekRange?: string;
  targetDivisionName?: string;
  targetContactRole?: string;
  productFraming?: string;
  existingProductReference?: string;
};

const GENERATE_ONE_CHANNELS: Record<string, ChannelId> = {
  email: 'email',
  event_invite: 'email',
  presentation: 'presentation',
  roi_deck: 'presentation',
  talking_points: 'talk_track',
};

const SALES_PAGE_TYPES: Record<string, PageType> = {
  one_pager: 'account_intro',
  case_study: 'case_study',
};

/**
 * POST /api/roadmap/plans/[planId]/execute
 * Execute a roadmap plan by generating its content.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { planId } = await params;

  const plan = await prisma.roadmapPlan.findFirst({
    where: { id: planId },
    include: {
      roadmap: { select: { userId: true } },
      target: {
        select: {
          id: true,
          name: true,
          companyId: true,
          companyDepartmentId: true,
        },
      },
    },
  });

  if (!plan || plan.roadmap.userId !== userId) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (plan.status === 'executed') {
    return NextResponse.json({ error: 'Plan already executed' }, { status: 400 });
  }

  if (plan.status === 'dismissed') {
    return NextResponse.json({ error: 'Cannot execute a dismissed plan' }, { status: 400 });
  }

  const pp = (plan.previewPayload ?? {}) as PreviewPayload;
  const contentType = pp.contentType ?? 'email';
  const prompt = pp.description || pp.title || 'Generate content for this account';
  const companyId = plan.target?.companyId;
  const divisionId = plan.target?.companyDepartmentId ?? undefined;

  if (!companyId) {
    return NextResponse.json({ error: 'Plan has no linked company' }, { status: 400 });
  }

  try {
    let generatedContent: unknown;

    if (SALES_PAGE_TYPES[contentType]) {
      const result = await generateSalesPageSections({
        companyId,
        userId,
        pageType: SALES_PAGE_TYPES[contentType],
        departmentId: divisionId ?? null,
        userGoal: prompt,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      generatedContent = result.data;
    } else {
      const mappedChannel = GENERATE_ONE_CHANNELS[contentType] ?? playContentTypeToChannel(contentType);
      const result = await generateOneContent({
        companyId,
        userId,
        channel: mappedChannel,
        prompt,
        divisionId,
      });
      generatedContent = result.raw;
    }

    await prisma.roadmapPlan.update({
      where: { id: planId },
      data: { status: 'executed' },
    });

    return NextResponse.json({
      ok: true,
      content: generatedContent,
      status: 'executed',
    });
  } catch (err) {
    console.error('Plan execution error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 }
    );
  }
}

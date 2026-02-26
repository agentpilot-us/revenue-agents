import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateOneContent } from '@/lib/plays/generate-content';
import { buildPlayPromptFromSignal } from '@/lib/plays/play-prompt-from-signal';

export const maxDuration = 60;

type RunParams = {
  playId: string;
  signalTitle: string;
  signalSummary?: string | null;
  segmentId?: string | null;
  segmentName?: string | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let body: { signalId?: string; playId?: string; signalTitle?: string; signalSummary?: string; segmentId?: string; segmentName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    let runParams: RunParams;

    if (body.signalId) {
      const signal = await prisma.accountSignal.findFirst({
        where: { id: body.signalId, userId: session.user.id },
        include: {
          company: {
            include: {
              departments: {
                orderBy: { createdAt: 'asc' },
                take: 5,
                select: { id: true, customName: true, type: true },
              },
            },
          },
          companyDepartment: {
            select: { id: true, customName: true, type: true },
          },
        },
      });
      if (!signal) {
        return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
      }
      if (signal.companyId !== companyId) {
        return NextResponse.json({ error: 'Company mismatch' }, { status: 400 });
      }
      const playId = (signal.suggestedPlay ?? 're_engagement') as string;
      const segmentId =
        body.segmentId ??
        signal.companyDepartmentId ??
        signal.company.departments[0]?.id ??
        null;
      const segment =
        segmentId &&
        (signal.companyDepartment?.id === segmentId
          ? signal.companyDepartment
          : signal.company.departments.find((d) => d.id === segmentId));
      const segmentName =
        segment != null
          ? (segment.customName ?? segment.type.replace(/_/g, ' '))
          : null;

      runParams = {
        playId,
        signalTitle: signal.title,
        signalSummary: signal.summary,
        segmentId,
        segmentName,
      };
    } else {
      const playId = typeof body.playId === 'string' ? body.playId.trim() : '';
      const signalTitle = typeof body.signalTitle === 'string' ? body.signalTitle.trim() : '';
      if (!playId || !signalTitle) {
        return NextResponse.json(
          { error: 'playId and signalTitle are required when not using signalId' },
          { status: 400 }
        );
      }
      runParams = {
        playId,
        signalTitle,
        signalSummary: typeof body.signalSummary === 'string' ? body.signalSummary.trim() || undefined : undefined,
        segmentId: typeof body.segmentId === 'string' ? body.segmentId : undefined,
        segmentName: typeof body.segmentName === 'string' ? body.segmentName : undefined,
      };
    }

    const prompt = buildPlayPromptFromSignal({
      playId: runParams.playId,
      signalTitle: runParams.signalTitle,
      signalSummary: runParams.signalSummary ?? null,
      segmentName: runParams.segmentName ?? null,
    });

    const [emailResult, linkedinResult, talkingPointsResult] = await Promise.allSettled([
      generateOneContent({
        companyId,
        userId: session.user.id,
        contentType: 'email',
        prompt,
      }),
      generateOneContent({
        companyId,
        userId: session.user.id,
        contentType: 'linkedin',
        prompt,
      }),
      generateOneContent({
        companyId,
        userId: session.user.id,
        contentType: 'talking_points',
        prompt,
      }),
    ]);

    const email = emailResult.status === 'fulfilled' ? emailResult.value.content : null;
    const linkedin = linkedinResult.status === 'fulfilled' ? linkedinResult.value.content : null;
    const talking_points = talkingPointsResult.status === 'fulfilled' ? talkingPointsResult.value.content : null;

    const errors: { email?: string; linkedin?: string; talking_points?: string } = {};
    if (emailResult.status === 'rejected') errors.email = emailResult.reason?.message ?? 'Generation failed';
    if (linkedinResult.status === 'rejected') errors.linkedin = linkedinResult.reason?.message ?? 'Generation failed';
    if (talkingPointsResult.status === 'rejected') errors.talking_points = talkingPointsResult.reason?.message ?? 'Generation failed';

    return NextResponse.json({
      email: email ?? '',
      linkedin: linkedin ?? '',
      talking_points: talking_points ?? '',
      segmentId: runParams.segmentId ?? undefined,
      segmentName: runParams.segmentName ?? undefined,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    });
  } catch (error: unknown) {
    console.error('Run content API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

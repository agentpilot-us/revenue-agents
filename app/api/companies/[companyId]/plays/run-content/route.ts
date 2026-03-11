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
        body.segmentId ?? signal.company.departments[0]?.id ?? null;
      const segment =
        segmentId
          ? signal.company.departments.find((d) => d.id === segmentId)
          : null;
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
      let segmentId: string | null = typeof body.segmentId === 'string' ? body.segmentId : null;
      let segmentName: string | null = typeof body.segmentName === 'string' ? body.segmentName : null;
      // When no segment passed (e.g. Feature Release from dashboard), default to company's first department so contacts load
      if (!segmentId) {
        const firstDept = await prisma.companyDepartment.findFirst({
          where: { companyId },
          select: { id: true, customName: true, type: true },
          orderBy: { createdAt: 'asc' },
        });
        if (firstDept) {
          segmentId = firstDept.id;
          segmentName = firstDept.customName ?? firstDept.type.replace(/_/g, ' ');
        }
      }
      runParams = {
        playId,
        signalTitle,
        signalSummary: typeof body.signalSummary === 'string' ? body.signalSummary.trim() || undefined : undefined,
        segmentId: segmentId ?? undefined,
        segmentName: segmentName ?? undefined,
      };
    }

    let prompt = buildPlayPromptFromSignal({
      playId: runParams.playId,
      signalTitle: runParams.signalTitle,
      signalSummary: runParams.signalSummary ?? null,
      segmentName: runParams.segmentName ?? null,
    });

    // Event invite: inject event landing page URL so email and LinkedIn include the link (same as feature release workflow)
    if (runParams.playId === 'event_invite') {
      const eventCampaign = await prisma.segmentCampaign.findFirst({
        where: { companyId, userId: session.user.id, slug: 'celigo-connect-2026' },
        select: { url: true },
      });
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const eventUrl = eventCampaign?.url ?? `${baseUrl}/go/celigo-connect-2026`;
      prompt = `${prompt}\n\nInclude this event landing page link in the email and LinkedIn message as the primary CTA: ${eventUrl}. Use it as the main call-to-action (e.g. "Register here" or "Get your spot").`;
    }

    const sharedInput = {
      companyId,
      userId: session.user.id,
      divisionId: runParams.segmentId ?? undefined,
      prompt,
    };

    const [email, linkedin, talkingPoints] = await Promise.all([
      generateOneContent({
        ...sharedInput,
        channel: 'email',
      }),
      generateOneContent({
        ...sharedInput,
        channel: 'linkedin_inmail',
      }),
      generateOneContent({
        ...sharedInput,
        channel: 'talk_track',
      }),
    ]);

    return NextResponse.json({
      email: email.raw,
      linkedin: linkedin.raw,
      talking_points: talkingPoints.raw,
      segmentId: runParams.segmentId ?? undefined,
      segmentName: runParams.segmentName ?? undefined,
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

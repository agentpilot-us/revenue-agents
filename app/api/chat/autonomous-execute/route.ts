import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generatePlayActionContent } from '@/lib/plays/generate-action-content';
import type { StepEvent, StepResult } from './types';

export const maxDuration = 120;

/** Map action + generated content to stream result shape for the client. */
function actionToStepResult(
  action: {
    title: string;
    actionType: string;
    generatedContent: string | null;
    generatedSubject: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactTitle: string | null;
    suggestedDate: Date | null;
  },
  contentType: string,
  contentGenerationType: string | null,
  companyName: string | null,
): StepResult {
  const body = action.generatedContent ?? '';
  const subject = action.generatedSubject ?? '';
  const to = action.contactEmail ?? '';
  const name = action.contactName ?? 'Contact';
  const title = action.contactTitle ?? '';

  if (action.actionType === 'SEND_EMAIL' || contentType === 'EMAIL') {
    return {
      type: 'email',
      data: { to, subject, body },
    };
  }

  if (
    action.actionType === 'SEND_LINKEDIN' ||
    contentType === 'LINKEDIN_MSG' ||
    contentGenerationType?.startsWith('linkedin_')
  ) {
    return {
      type: 'linkedin',
      data: { note: body.slice(0, 300) },
    };
  }

  if (
    contentGenerationType === 'meeting_agenda' ||
    contentGenerationType === 'calendar_invite' ||
    contentType === 'MEETING'
  ) {
    return {
      type: 'meeting',
      data: {
        title: action.title,
        duration: '—',
        suggestedDate: action.suggestedDate
          ? action.suggestedDate.toLocaleDateString()
          : '—',
        agenda: body,
        attendees: [name, title, companyName].filter(Boolean).join(', '),
      },
    };
  }

  if (contentGenerationType === 'contact_research') {
    return {
      type: 'contact_card',
      data: {
        name,
        title,
        company: companyName ?? '',
        email: to,
        background: body.slice(0, 500),
      },
    };
  }

  if (
    contentGenerationType === 'executive_briefing' ||
    contentGenerationType === 'account_research_brief' ||
    contentType === 'BRIEF' ||
    contentType === 'INTERNAL_NOTE'
  ) {
    return {
      type: 'briefing',
      data: {
        title: action.title,
        sections: [{ heading: 'Summary', content: body }],
      },
    };
  }

  // Default: treat as briefing (single section)
  return {
    type: 'briefing',
    data: {
      title: action.title,
      sections: [{ heading: 'Content', content: body }],
    },
  };
}

/** Emit one or two thinking messages per action type for UX. */
function getThinkingMessages(
  contentType: string,
  contentGenerationType: string | null,
): string[] {
  if (contentGenerationType === 'contact_research')
    return [
      'Searching LinkedIn and account data for contact...',
      'Building contact profile...',
    ];
  if (
    contentGenerationType === 'congratulations_email' ||
    contentGenerationType === 'executive_intro_email'
  )
    return [
      'Analyzing contact background for personalization...',
      'Crafting email with strategic positioning...',
    ];
  if (
    contentGenerationType === 'executive_briefing' ||
    contentGenerationType === 'account_research_brief'
  )
    return [
      'Compiling account and division context...',
      'Generating executive briefing...',
    ];
  if (contentGenerationType?.startsWith('linkedin_'))
    return ['Crafting connection note...'];
  if (
    contentGenerationType === 'meeting_agenda' ||
    contentGenerationType === 'calendar_invite'
  )
    return ['Generating meeting agenda...'];
  if (contentType === 'EMAIL' || contentType === 'LINKEDIN_MSG')
    return ['Generating content...'];
  return ['Generating content...'];
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const body = await req.json().catch(() => ({}));
    const playRunId = body.playRunId as string | undefined;
    if (!playRunId) {
      return new Response(
        JSON.stringify({ error: 'playRunId is required' }),
        { status: 400 },
      );
    }

    const run = await prisma.playRun.findFirst({
      where: { id: playRunId, userId: session.user.id },
      include: {
        company: { select: { id: true, name: true } },
        playTemplate: { select: { id: true, name: true } },
        roadmapTarget: { select: { id: true, name: true } },
        phaseRuns: {
          include: {
            phaseTemplate: {
              select: { id: true, name: true, orderIndex: true },
            },
            actions: {
              include: {
                contentTemplate: {
                  select: {
                    id: true,
                    name: true,
                    contentType: true,
                    channel: true,
                    contentGenerationType: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!run) {
      return new Response(
        JSON.stringify({ error: 'Play run not found' }),
        { status: 404 },
      );
    }

    const phaseRuns = run.phaseRuns.sort(
      (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex,
    );
    const allActions: Array<{
      actionId: string;
      phaseRun: (typeof phaseRuns)[0];
      action: (typeof phaseRuns)[0]['actions'][0];
    }> = [];
    for (const pr of phaseRuns) {
      for (const a of pr.actions) {
        allActions.push({ actionId: a.id, phaseRun: pr, action: a });
      }
    }

    const firstContact = allActions.find(
      (x) => x.action.contactName || x.action.contactEmail,
    );
    const contactName =
      firstContact?.action.contactName ?? firstContact?.action.contactEmail ?? '—';
    const divisionName = run.roadmapTarget?.name ?? '—';
    let productName: string | undefined;
    if (run.productId) {
      const product = await prisma.product.findUnique({
        where: { id: run.productId },
        select: { name: true },
      });
      productName = product?.name;
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        function emit(event: StepEvent) {
          controller.enqueue(
            enc.encode(JSON.stringify(event) + '\n'),
          );
        }

        emit({
          type: 'start',
          playName: run.playTemplate.name,
          contactName,
          accountName: run.company.name ?? '—',
          divisionName,
          productName,
          stepCount: allActions.length,
        });

        let emailsGenerated = 0;

        for (let stepIndex = 0; stepIndex < allActions.length; stepIndex++) {
          const { actionId, action, phaseRun } = allActions[stepIndex];
          const ct = action.contentTemplate;
          const contentType = ct?.contentType ?? 'BRIEF';
          const channel = (ct?.channel ?? 'internal').toLowerCase();
          const contentGenType = ct?.contentGenerationType ?? null;

          emit({
            type: 'step_start',
            stepIndex,
            stepName: action.title,
            channel,
            actionId,
          });

          const thinkingMessages = getThinkingMessages(
            contentType,
            contentGenType,
          );
          for (const msg of thinkingMessages) {
            emit({ type: 'step_thinking', stepIndex, message: msg });
          }

          try {
            const updated = await generatePlayActionContent({
              actionId,
              userId: session.user.id,
            });
            if (!updated) continue;

            const result = actionToStepResult(
              {
                title: updated.title,
                actionType: updated.actionType,
                generatedContent: updated.generatedContent,
                generatedSubject: updated.generatedSubject,
                contactName: updated.contactName,
                contactEmail: updated.contactEmail,
                contactTitle: updated.contactTitle,
                suggestedDate: updated.suggestedDate,
              },
              ct?.contentType ?? 'BRIEF',
              ct?.contentGenerationType ?? null,
              run.company.name,
            );
            if (result.type === 'email') emailsGenerated++;

            emit({ type: 'step_result', stepIndex, result });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Generation failed';
            emit({
              type: 'step_result',
              stepIndex,
              result: {
                type: 'briefing',
                data: {
                  title: action.title,
                  sections: [
                    { heading: 'Error', content: message },
                  ],
                },
              },
            });
          }

          emit({
            type: 'step_complete',
            stepIndex,
            completionMessage: `${action.title} completed`,
          });
        }

        emit({
          type: 'done',
          summary: {
            stepsCompleted: allActions.length,
            emailsGenerated,
            engagementArcDays: 14,
          },
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('autonomous-execute error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Autonomous execute failed',
      }),
      { status: 500 },
    );
  }
}

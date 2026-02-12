import { streamText, tool, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { runId } = await params;
    const play = await prisma.stakeholderEngagementPlay.findFirst({
      where: { id: runId },
      include: {
        company: { select: { id: true, name: true, userId: true } },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            linkedinUrl: true,
          },
        },
      },
    });
    if (!play || play.company.userId !== session.user.id) {
      return new Response('Play not found', { status: 404 });
    }

    let body: { messages?: unknown[] };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const contactName = [play.contact.firstName, play.contact.lastName].filter(Boolean).join(' ') || 'Unknown';
    const researchData = (play.researchData as Record<string, unknown>) ?? {};
    const draftEmail = (play.draftEmail as { subject?: string; body?: string } | null) ?? {};
    const stepState = (play.stepState as Record<string, string>) ?? {};

    const stepNames: Record<string, string> = {
      '1': 'Research',
      '2': 'Draft Email',
      '3': 'LinkedIn Connection',
      '4': 'Warm Intro Request',
      '5': 'Follow-up if no response',
    };

    const playContext = `
PLAY CONTEXT (New Stakeholder Engagement):
- Account: ${play.company.name}
- Contact: ${contactName}${play.contact.title ? ` (${play.contact.title})` : ''}
- Current step: ${play.currentStep} of 5 — ${stepNames[String(play.currentStep)] ?? 'Unknown'}
- Step states: ${JSON.stringify(stepState)}
- Research summary: ${typeof researchData.summary === 'string' ? researchData.summary : 'Not yet run'}
- Draft email (if any): Subject: ${draftEmail.subject ?? '—'}; Body: ${draftEmail.body ? draftEmail.body.slice(0, 300) + '...' : '—'}
`;

    const systemPrompt = `You are the "Agent Pilot" for this New Stakeholder Engagement play. The user is executing a play to engage a new executive (${contactName}) at ${play.company.name}.

${playContext}

CAPABILITIES:
- Edit the draft email when the user asks (e.g. "Make it shorter", "Don't mention Tesla", "More casual"). Respond with the revised draft inline and suggest they click "Use this version" to save it.
- Add context the user provides (e.g. "He also spoke at CES") into the draft and return the updated draft.
- Answer strategic questions (e.g. "Should I ask Sarah for the intro first?").
- When the user asks to skip a step or modify the play (e.g. "Skip LinkedIn"), confirm and tell them the step will be marked skipped; they can use the UI to skip.
- Explain your reasoning when asked ("Why did you include the case study?").

BOUNDARIES (refuse politely):
- Never send email without explicit user approval. If they ask to send without approval, say you always show drafts first and ask them to approve in the UI.
- Do not email everyone at the company or bulk actions; this play is 1:1.
- Do not speculate on salary or personal data you don't have.
- Do not write misleading or false content.

When you return a revised draft, format it clearly (e.g. "Subject: ..." and the body) so the user can apply it. Keep responses concise.`;

    const playTools = {
      update_draft: tool({
        description: 'Save a revised email draft (subject and body) to the play after the user approved it.',
        inputSchema: z.object({
          subject: z.string(),
          body: z.string(),
        }),
        execute: async ({
          subject,
          body,
        }: {
          subject: string;
          body: string;
        }) => {
          await prisma.stakeholderEngagementPlay.update({
            where: { id: runId },
            data: { draftEmail: { subject, body } as object },
          });
          return { ok: true };
        },
      }),
      skip_step: tool({
        description: 'Mark a step as skipped and advance. Call when user confirms they want to skip (e.g. step 3 LinkedIn).',
        inputSchema: z.object({ stepIndex: z.number().min(1).max(5) }),
        execute: async ({ stepIndex }: { stepIndex: number }) => {
          const play = await prisma.stakeholderEngagementPlay.findFirst({
            where: { id: runId },
            select: { stepCompletedAt: true, stepState: true, currentStep: true },
          });
          if (!play) return { error: 'Play not found' };
          const stepCompletedAt = { ...((play.stepCompletedAt as Record<string, string>) ?? {}) };
          stepCompletedAt[String(stepIndex)] = new Date().toISOString();
          const stepState = { ...((play.stepState as Record<string, string>) ?? {}) };
          stepState[String(stepIndex)] = 'skipped';
          const newCurrent = stepIndex === play.currentStep ? Math.min(5, play.currentStep + 1) : play.currentStep;
          await prisma.stakeholderEngagementPlay.update({
            where: { id: runId },
            data: {
              stepCompletedAt: stepCompletedAt as object,
              stepState: stepState as object,
              currentStep: newCurrent,
            },
          });
          return { ok: true, newStep: newCurrent };
        },
      }),
      mark_step_complete: tool({
        description: 'Mark the current step as complete and advance to the next.',
        inputSchema: z.object({ stepIndex: z.number().min(1).max(5) }),
        execute: async ({ stepIndex }: { stepIndex: number }) => {
          const play = await prisma.stakeholderEngagementPlay.findFirst({
            where: { id: runId },
            select: { stepCompletedAt: true, stepState: true, currentStep: true },
          });
          if (!play) return { error: 'Play not found' };
          const stepCompletedAt = { ...((play.stepCompletedAt as Record<string, string>) ?? {}) };
          stepCompletedAt[String(stepIndex)] = new Date().toISOString();
          const stepState = { ...((play.stepState as Record<string, string>) ?? {}) };
          stepState[String(stepIndex)] = 'completed';
          const newCurrent = stepIndex === play.currentStep ? Math.min(5, play.currentStep + 1) : play.currentStep;
          await prisma.stakeholderEngagementPlay.update({
            where: { id: runId },
            data: {
              stepCompletedAt: stepCompletedAt as object,
              stepState: stepState as object,
              currentStep: newCurrent,
            },
          });
          return { ok: true, newStep: newCurrent };
        },
      }),
      pause_play: tool({
        description: 'Pause the play when the user says they will come back later.',
        inputSchema: z.object({}),
        execute: async () => {
          await prisma.stakeholderEngagementPlay.update({
            where: { id: runId },
            data: { playState: 'paused' },
          });
          return { ok: true };
        },
      }),
    };

    const modelMessages = await convertToModelMessages(messages as Parameters<typeof convertToModelMessages>[0]);
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: modelMessages,
      system: systemPrompt,
      tools: playTools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Play chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

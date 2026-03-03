/**
 * Cron: Process scheduled actions.
 *
 * Runs every 15 minutes. Picks up ScheduledAction records where
 * status=pending and scheduledAt <= now, processes them in order,
 * and marks them completed or failed.
 *
 * Action types:
 *   - send_email: sends an outbound email via the user's email provider
 *   - share_briefing: creates and shares a briefing (future)
 *   - advance_sequence: advances a contact's sequence enrollment
 *   - run_plan_step: executes a deferred plan workflow step
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOutboundProvider } from '@/lib/email';
import { advanceEnrollment } from '@/lib/sequences/get-next-touch-context';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_ACTIONS_PER_RUN = 50;
const MAX_ATTEMPTS = 3;

type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  contactId?: string;
  companyId?: string;
  enrollmentId?: string;
  stepIndex?: number;
};

type AdvanceSequencePayload = {
  enrollmentId: string;
};

export async function GET() {
  const now = new Date();

  const actions = await prisma.scheduledAction.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { scheduledAt: 'asc' },
    take: MAX_ACTIONS_PER_RUN,
  });

  if (actions.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const action of actions) {
    await prisma.scheduledAction.update({
      where: { id: action.id },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    try {
      switch (action.type) {
        case 'send_email': {
          const payload = action.payload as unknown as EmailPayload;
          const provider = await getOutboundProvider(action.userId);
          const result = await provider.send({
            to: payload.to,
            subject: payload.subject,
            html: payload.body,
            text: payload.body.replace(/<[^>]*>/g, ''),
          });

          if (!result.ok) throw new Error(result.error);

          if (payload.contactId && payload.companyId) {
            const activity = await prisma.activity.create({
              data: {
                type: 'Email',
                summary: `Scheduled email: ${payload.subject}`,
                content: payload.body,
                companyId: payload.companyId,
                contactId: payload.contactId,
                userId: action.userId,
                resendEmailId: result.messageId,
                agentUsed: 'scheduled_action',
              },
            });

            // If this email was from a sequence step, record the touch and advance
            if (payload.enrollmentId) {
              await prisma.sequenceTouch.create({
                data: {
                  enrollmentId: payload.enrollmentId,
                  stepIndex: payload.stepIndex ?? 0,
                  channel: 'email',
                  sentAt: new Date(),
                  activityId: activity.id,
                },
              });
              await advanceEnrollment(payload.enrollmentId);
            }
          }
          break;
        }

        case 'advance_sequence': {
          const payload = action.payload as unknown as AdvanceSequencePayload;
          await advanceEnrollment(payload.enrollmentId);
          break;
        }

        case 'run_plan_step': {
          // Future: re-enter the plan workflow at a specific step
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      await prisma.scheduledAction.update({
        where: { id: action.id },
        data: { status: 'completed', executedAt: new Date() },
      });
      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = (action.attempts ?? 0) + 1;
      await prisma.scheduledAction.update({
        where: { id: action.id },
        data: {
          status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          error: errorMsg,
        },
      });
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, total: actions.length });
}

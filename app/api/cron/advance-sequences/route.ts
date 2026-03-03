/**
 * Cron: Advance outreach sequences.
 *
 * Runs hourly. Finds ContactSequenceEnrollments where:
 *   - status = active
 *   - nextTouchDueAt <= now
 * For each, creates a ScheduledAction of type 'send_email' so the
 * process-scheduled-actions cron picks it up and sends via the user's
 * email provider.
 *
 * This bridges the gap between the sequence model (which knows WHEN
 * to send) and the email provider abstraction (which knows HOW to send).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_PER_RUN = 100;

export async function GET() {
  const now = new Date();

  const dueEnrollments = await prisma.contactSequenceEnrollment.findMany({
    where: {
      status: 'active',
      nextTouchDueAt: { lte: now },
    },
    take: MAX_PER_RUN,
  });

  if (dueEnrollments.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let scheduled = 0;
  let skipped = 0;

  for (const enrollment of dueEnrollments) {
    // Load related data separately for clean typing
    const contact = await prisma.contact.findUnique({
      where: { id: enrollment.contactId },
      select: { id: true, firstName: true, lastName: true, email: true, title: true, companyId: true },
    });
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: enrollment.sequenceId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!contact || !sequence) {
      skipped++;
      continue;
    }

    const step = sequence.steps[enrollment.currentStepIndex];
    if (!step) {
      skipped++;
      continue;
    }

    if (step.channel !== 'email') {
      skipped++;
      continue;
    }

    if (!contact.email) {
      skipped++;
      continue;
    }

    const contactDisplayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;
    let subject = `Follow-up: ${sequence.name}`;
    let body = step.promptTemplate ?? `Hi ${contact.firstName ?? 'there'},\n\nFollowing up on our previous conversation.`;

    if (step.promptTemplate) {
      try {
        const { text } = await generateText({
          model: getChatModel('fast'),
          prompt: `Draft a short follow-up email for ${contactDisplayName ?? 'a contact'}${contact.title ? ` (${contact.title})` : ''}.

Sequence: ${sequence.name}
Step role: ${step.role}
Step template: ${step.promptTemplate}
${step.ctaType ? `CTA type: ${step.ctaType}` : ''}

Return in format:
Subject: <subject>
---
<body>

Keep it under 100 words. Be direct and personal.`,
          maxOutputTokens: 300,
        });

        const subjectMatch = text.match(/^Subject:\s*(.+)/m);
        const bodyContent = text.split('---').slice(1).join('---').trim();
        if (subjectMatch?.[1] && bodyContent) {
          subject = subjectMatch[1].trim();
          body = bodyContent;
        }
      } catch {
        // Use defaults
      }
    }

    await prisma.scheduledAction.create({
      data: {
        userId: enrollment.userId,
        companyId: contact.companyId,
        contactId: contact.id,
        type: 'send_email',
        payload: {
          to: contact.email,
          subject,
          body,
          contactId: contact.id,
          companyId: contact.companyId,
          enrollmentId: enrollment.id,
          stepIndex: enrollment.currentStepIndex,
        },
        scheduledAt: now,
      },
    });

    scheduled++;
  }

  return NextResponse.json({ scheduled, skipped, total: dueEnrollments.length });
}

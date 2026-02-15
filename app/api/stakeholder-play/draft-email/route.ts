import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playId } = await req.json();
    if (!playId) {
      return NextResponse.json({ error: 'playId required' }, { status: 400 });
    }

    const play = await prisma.stakeholderEngagementPlay.findFirst({
      where: { id: playId },
      include: {
        company: { select: { id: true, name: true, industry: true, userId: true } },
        contact: { select: { firstName: true, lastName: true, title: true } },
      },
    });
    if (!play || play.company.userId !== session.user.id) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const messagingSection = await getMessagingContextForAgent(play.company.userId, play.company.industry ?? undefined);

    const research = (play.researchData as { summary?: string; contactName?: string; companyName?: string }) ?? {};
    const contactName = [play.contact.firstName, play.contact.lastName].filter(Boolean).join(' ') || research.contactName || 'there';

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 1000,
      system: `You draft a short, warm intro email for a new executive/stakeholder at an existing account. Tone: professional, congratulatory, one clear value hook. Reference the research brief and any existing relationship. Do not use placeholders like [Company] - use the actual company and contact names.
${messagingSection}`,
      prompt: `Draft an intro email for this new stakeholder engagement.

Research brief:
${research.summary ?? 'No research yet.'}

Contact name: ${contactName}
Title: ${play.contact.title ?? '—'}
Company: ${play.company.name}

Return ONLY a JSON object with two keys: "subject" (string) and "body" (string). The body should be plain text, 2-4 short paragraphs, no HTML.`,
    });

    let subject = 'Congratulations on your new role';
    let body = '';
    try {
      const parsed = JSON.parse(text.trim().replace(/^```json?\n?|\n?```$/g, ''));
      if (parsed.subject) subject = parsed.subject;
      if (parsed.body) body = parsed.body;
    } catch {
      body = text;
    }

    const draftEmail = { subject, body };
    const stepState = (play.stepState as Record<string, string>) ?? {};
    stepState['2'] = 'needs_review';
    await prisma.stakeholderEngagementPlay.update({
      where: { id: playId },
      data: {
        draftEmail: draftEmail as object,
        stepState: stepState as object,
        playState: 'waiting_for_user',
      },
    });

    return NextResponse.json({ success: true, draftEmail });
  } catch (error) {
    console.error('Stakeholder play draft email error:', error);
    return NextResponse.json(
      { error: 'Draft failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

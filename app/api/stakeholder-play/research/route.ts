import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const researchOutputSchema = z.object({
  summary: z.string().optional(),
  background: z.array(z.string()).optional(),
  recentActivity: z.array(z.string()).optional(),
  warmIntroPaths: z.array(z.string()).optional(),
  talkingPoints: z.array(z.string()).optional(),
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
        company: { select: { id: true, name: true, domain: true, industry: true, userId: true } },
        contact: { select: { id: true, firstName: true, lastName: true, title: true, department: true, linkedinUrl: true, bio: true, enrichedData: true } },
      },
    });
    if (!play || play.company.userId !== session.user.id) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const contact = play.contact;
    const company = play.company;
    const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
    const enriched = (contact.enrichedData as Record<string, unknown>) ?? {};

    await prisma.stakeholderEngagementPlay.update({
      where: { id: playId },
      data: { playState: 'running' },
    });

    const contextParts: string[] = [
      `Contact: ${contactName}`,
      contact.title ? `Title: ${contact.title}` : '',
      contact.department ? `Department: ${contact.department}` : '',
      contact.bio ? `Bio: ${contact.bio}` : '',
      company.name ? `Company: ${company.name}` : '',
      company.industry ? `Industry: ${company.industry}` : '',
      JSON.stringify(enriched).length > 10 ? `Enriched data: ${JSON.stringify(enriched)}` : '',
    ].filter(Boolean);
    const context = contextParts.join('\n');

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 2000,
      schema: researchOutputSchema,
      system: `You are a sales research assistant. Extract structured research for a new-stakeholder intro.
Return:
- summary: 2-3 sentence brief (optional).
- background: array of bullet strings (previous roles, education, tenure) e.g. "VP Engineering at Tesla (2019-2025) — Led Autopilot".
- recentActivity: array of recent quotes, posts, talks e.g. "Accelerating EV design cycles — Automotive News interview, Jan 2026".
- warmIntroPaths: array of mutual connections or warm paths e.g. "Sarah Chen (your champion at GM) — worked together on AV project".
- talkingPoints: array of sales talking points e.g. "Tesla background → understands AI/ML infrastructure".
If information is missing for a section use "Not available" or omit.`,
      prompt: `Research for new stakeholder engagement:\n\n${context}`,
    });

    const stepCompletedAt = (play.stepCompletedAt as Record<string, string>) ?? {};
    stepCompletedAt['1'] = new Date().toISOString();
    const stepState = (play.stepState as Record<string, string>) ?? {};
    stepState['1'] = 'completed';
    stepState['2'] = 'pending';

    const researchData = {
      ...object,
      contactName,
      title: contact.title,
      department: contact.department,
      companyName: company.name,
      industry: company.industry,
      linkedinUrl: contact.linkedinUrl,
      enrichedData: enriched,
      generatedAt: new Date().toISOString(),
    };

    await prisma.stakeholderEngagementPlay.update({
      where: { id: playId },
      data: {
        researchData: researchData as object,
        stepCompletedAt: stepCompletedAt as object,
        stepState: stepState as object,
        currentStep: 2,
        playState: 'waiting_for_user',
      },
    });

    return NextResponse.json({ success: true, researchData });
  } catch (error) {
    console.error('Stakeholder play research error:', error);
    return NextResponse.json(
      { error: 'Research failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

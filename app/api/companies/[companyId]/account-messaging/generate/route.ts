import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { researchCompany } from '@/lib/tools/perplexity';
import { ContentType } from '@prisma/client';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const suggestedSchema = {
  whyThisCompany: [] as string[],
  useCases: [] as Array<{ contentLibraryId: string; customNote?: string; departmentFit?: string[] }>,
  successStories: [] as Array<{
    contentLibraryId: string;
    whyRelevant: string;
    bestForDepartments?: string[];
  }>,
  objectionHandlers: [] as Array<{ objection: string; response: string }>,
  doNotMention: [] as Array<{ topic: string; reason: string }>,
};

export async function POST(
  _req: NextRequest,
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
      select: { id: true, name: true, domain: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let researchSummary = '';
    const researchResult = await researchCompany({
      query: `Brief summary (2-4 sentences) of ${company.name}${company.domain ? ` (${company.domain})` : ''}: strategic priorities, industry focus, and any known initiatives relevant to B2B software or technology adoption.`,
      companyName: company.name,
      companyDomain: company.domain ?? undefined,
    });
    if (researchResult.ok && researchResult.summary) {
      researchSummary = researchResult.summary;
    }

    const contentLibrary = await prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
        isActive: true,
      },
      select: { id: true, title: true, type: true, content: true },
      orderBy: { title: 'asc' },
      take: 30,
    });

    const contentSummary =
      contentLibrary.length > 0
        ? contentLibrary
            .map(
              (c) =>
                `- id: ${c.id}, title: ${c.title}, type: ${c.type}`
            )
            .join('\n')
        : 'No use cases or success stories in content library.';

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      maxTokens: 4000,
      system: `You are helping populate account-level messaging for a B2B sales team. Output valid JSON only, no markdown.`,
      prompt: `Company: ${company.name}
Domain: ${company.domain ?? '—'}
Industry: ${company.industry ?? '—'}

${researchSummary ? `Research summary:\n${researchSummary}\n` : ''}

Content Library (use case and success story IDs and titles — only suggest IDs that appear in this list):
${contentSummary}

Generate suggested account messaging for this company. Return a single JSON object with these exact keys (all arrays):
- whyThisCompany: array of 3-5 short bullet strings (why this company should care about our solution)
- useCases: array of objects { "contentLibraryId": "<id from list>", "customNote": "optional short note", "departmentFit": ["DepartmentName"] } — pick 2-4 most relevant use cases
- successStories: array of objects { "contentLibraryId": "<id from list>", "whyRelevant": "one sentence", "bestForDepartments": ["Dept"] } — pick 1-3
- objectionHandlers: array of { "objection": "common objection", "response": "suggested response" } — 2-4 pairs
- doNotMention: array of { "topic": "topic to avoid", "reason": "brief reason" } — 0-3 items

Only use contentLibraryId values that appear in the Content Library list above. Return only the JSON object.`,
    });

    let suggested: typeof suggestedSchema;
    try {
      const raw = text.trim().replace(/^```json?\n?|\n?```$/g, '');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      suggested = {
        whyThisCompany: Array.isArray(parsed.whyThisCompany)
          ? (parsed.whyThisCompany as string[]).filter((x) => typeof x === 'string')
          : [],
        useCases: Array.isArray(parsed.useCases)
          ? (parsed.useCases as typeof suggestedSchema.useCases).filter(
              (u) => u && typeof u.contentLibraryId === 'string'
            )
          : [],
        successStories: Array.isArray(parsed.successStories)
          ? (parsed.successStories as typeof suggestedSchema.successStories).filter(
              (s) => s && typeof s.contentLibraryId === 'string' && typeof s.whyRelevant === 'string'
            )
          : [],
        objectionHandlers: Array.isArray(parsed.objectionHandlers)
          ? (parsed.objectionHandlers as typeof suggestedSchema.objectionHandlers).filter(
              (o) => o && typeof o.objection === 'string' && typeof o.response === 'string'
            )
          : [],
        doNotMention: Array.isArray(parsed.doNotMention)
          ? (parsed.doNotMention as typeof suggestedSchema.doNotMention).filter(
              (d) => d && typeof d.topic === 'string' && typeof d.reason === 'string'
            )
          : [],
      };
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON' },
        { status: 500 }
      );
    }

    const accountMessaging = await prisma.accountMessaging.upsert({
      where: { companyId },
      create: {
        companyId,
        userId: session.user.id,
        whyThisCompany: suggested.whyThisCompany,
        useCases: suggested.useCases,
        successStories: suggested.successStories,
        objectionHandlers: suggested.objectionHandlers,
        doNotMention: suggested.doNotMention,
        aiGenerated: true,
      },
      update: {
        whyThisCompany: suggested.whyThisCompany,
        useCases: suggested.useCases,
        successStories: suggested.successStories,
        objectionHandlers: suggested.objectionHandlers,
        doNotMention: suggested.doNotMention,
        aiGenerated: true,
      },
    });

    return NextResponse.json({
      id: accountMessaging.id,
      companyId: accountMessaging.companyId,
      whyThisCompany: accountMessaging.whyThisCompany,
      useCases: accountMessaging.useCases,
      successStories: accountMessaging.successStories,
      objectionHandlers: accountMessaging.objectionHandlers,
      doNotMention: accountMessaging.doNotMention,
      aiGenerated: accountMessaging.aiGenerated,
      updatedAt: accountMessaging.updatedAt,
    });
  } catch (e) {
    console.error('POST account-messaging/generate', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

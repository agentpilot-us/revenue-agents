import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateText, Output } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';

const suggestTagsSchema = z.object({
  industry: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, productId } = await req.json();

    const confirmedContent = await prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        userConfirmed: true,
      },
      select: {
        title: true,
        content: true,
        persona: true,
        department: true,
        industry: true,
        inferredTags: true,
      },
      take: 10,
    });

    const examplesText = confirmedContent
      .map(
        (c) =>
          `Title: ${c.title}\nContent snippet: ${JSON.stringify(c.content).slice(0, 200)}\nTags: Industry=${c.industry ?? ''}, Department=${c.department ?? ''}, Persona=${c.persona ?? ''}`
      )
      .join('\n\n');

    const contentSnippet = JSON.stringify(content).slice(0, 500);

    const { output: suggestions } = await generateText({
      model: getChatModel(),
      maxOutputTokens: 1000,
      prompt: `Based on how this user has tagged similar content in the past, suggest appropriate tags for new content.

PAST CONFIRMED TAGGING EXAMPLES:
${examplesText}

NEW CONTENT TO TAG:
${contentSnippet}

Suggest industry, department, persona, confidence (high|medium|low), and brief reasoning.`,
      output: Output.object({
        schema: suggestTagsSchema,
        name: 'TagSuggestions',
        description: 'Suggested tags and confidence based on user tagging patterns',
      }),
    });

    return NextResponse.json({
      suggestions: {
        industry: suggestions.industry ?? null,
        department: suggestions.department ?? null,
        persona: suggestions.persona ?? null,
        confidence: suggestions.confidence,
        reasoning: suggestions.reasoning,
      },
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest tags' },
      { status: 500 }
    );
  }
}

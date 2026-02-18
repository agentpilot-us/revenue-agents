import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateText, Output } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';


const useCaseSchema = z.object({
  name: z.string(),
  description: z.string(),
  benefits: z.array(z.string()).optional(),
  targetDepartment: z.string().optional(),
});

const successStorySchema = z.object({
  company: z.string(),
  industry: z.string().optional(),
  department: z.string().optional(),
  challenge: z.string(),
  solution: z.string(),
  results: z.array(z.string()).optional(),
  quote: z.string().optional(),
  quoteName: z.string().optional(),
});

const sectionSchema = z.object({
  title: z.string(),
  department: z.string(),
  valueProp: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  proofPoints: z.array(z.string()).optional(),
  talkingPoints: z.array(z.string()).optional(),
  successStories: z.array(successStorySchema).optional(),
  useCases: z.array(useCaseSchema).optional(),
  painPoints: z.array(z.string()).optional(),
});

const extractionSchema = z.object({
  industry: z.string().nullable().optional(),
  sections: z.array(sectionSchema),
});

const SYSTEM_PROMPT = `You extract structured sales enablement content from pasted text (e.g. from a PDF sales messaging guide).

SPLIT BY BUYING GROUP: If the content is a sales messaging guide with distinct sections per buying group or department (e.g. Manufacturing, Industrial Design, Autonomous Vehicles, IT / Data Center, Supply Chain), split into one block per section. Use the section heading or context to set "department" (e.g. "Manufacturing", "Industrial Design", "Autonomous Vehicles", "IT / Data Center", "Supply Chain"). If there are no clear sections, return a single section with department set from context or leave as a generic label.

For each section extract:
- title: short title for the section
- department: buying group/department name
- valueProp, benefits, proofPoints, talkingPoints, successStories, useCases, painPoints where present

Set industry at the top level (e.g. "Automotive" for GM/auto content).`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, productId, company: requestedCompany } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text' },
        { status: 400 }
      );
    }
    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId' },
        { status: 400 }
      );
    }

    const company = requestedCompany ?? 'General Motors';
    const truncated = text.slice(0, 50000);

    const { output: extracted } = await generateText({
      model: getChatModel(),
      maxOutputTokens: 8000,
      system: SYSTEM_PROMPT,
      prompt: `Extract structured sales enablement content from this pasted text. Split by buying group/department if it is a messaging guide with sections. Set industry (e.g. Automotive) at the top level.

Pasted content:
${truncated}`,
      output: Output.object({
        schema: extractionSchema,
        name: 'TextExtraction',
        description: 'Structured content split by section/department',
      }),
    });

    const industry = extracted.industry ?? 'Automotive';
    const sections = extracted.sections?.length
      ? extracted.sections
      : [
          {
            title: 'Imported content',
            department: '',
            valueProp: '',
            benefits: [],
            proofPoints: [],
            talkingPoints: [],
            successStories: [],
            useCases: [],
            painPoints: [],
          },
        ];

    const items = sections.map((s) => ({
      title: s.title,
      type: 'Framework' as const,
      content: {
        valueProp: s.valueProp ?? '',
        benefits: s.benefits ?? [],
        painPoints: s.painPoints ?? [],
        proofPoints: s.proofPoints ?? [],
        talkingPoints: s.talkingPoints ?? [],
        successStories: s.successStories ?? [],
        useCases: s.useCases ?? [],
      },
      inference: {
        industry,
        department: s.department || null,
        persona: null,
        confidence: 'medium' as const,
        reasoning: 'Extracted from pasted text',
      },
      company,
    }));

    return NextResponse.json({
      success: true,
      items,
      productId,
    });
  } catch (error) {
    console.error('Import from text error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import from text',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

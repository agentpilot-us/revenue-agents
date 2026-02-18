import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateText, Output } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';

const contentTypeEnum = z.enum([
  'Framework',
  'UseCase',
  'SuccessStory',
  'Persona',
  'Battlecard',
]);

const inferenceSchema = z.object({
  industry: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  reasoning: z.string().optional(),
});

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

const extractionSchema = z.object({
  title: z.string(),
  type: contentTypeEnum.default('Framework'),
  valueProp: z.string().optional(),
  inference: inferenceSchema.optional(),
  useCases: z.array(useCaseSchema).optional(),
  benefits: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  technicalSpecs: z.record(z.string()).optional(),
  customers: z.array(z.string()).optional(),
  proofPoints: z.array(z.string()).optional(),
  talkingPoints: z.array(z.string()).optional(),
  successStories: z.array(successStorySchema).optional(),
});

const SYSTEM_PROMPT = `Analyze marketing/product pages and extract structured sales enablement content.
Extract marketing content AND infer organizational tags from context.

INFERENCE GUIDELINES:
- Industry: Look for customer logos (BMW, Ford → Automotive), technical terminology, vertical-specific use cases
- Department: Look for phrases like "autonomous vehicles", "factory floor", "IT infrastructure", "design teams"
- Persona: Infer from technical depth (deep tech specs → CTO/VP Eng, ROI focus → CFO, operational focus → VP Ops)
- Confidence:
  * HIGH: Page explicitly mentions industry/department OR shows 3+ same-industry customer logos
  * MEDIUM: Can infer from technical terminology and use cases
  * LOW: Generic content, could apply to multiple industries/departments

Examples:
- "autonomous vehicles" + Mercedes/Volvo logos → Industry: Automotive, Dept: Autonomous Vehicles, HIGH confidence
- "factory simulation" + BMW/Ford → Industry: Automotive, Dept: Manufacturing, HIGH confidence
- "GPU infrastructure" + technical specs → Dept: IT Infrastructure, Persona: CTO, MEDIUM confidence
- Generic "productivity" claims → LOW confidence`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, productId } = await req.json();

    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error: 'Firecrawl is not configured',
          details: 'Add FIRECRAWL_API_KEY to .env.local (get an API key at firecrawl.dev), then restart the dev server. See Content Library for setup steps.',
        },
        { status: 503 }
      );
    }

    console.log('🌐 Scraping URL:', url);

    // STEP 1: Scrape with Firecrawl v2
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      throw new Error(`Firecrawl failed: ${scrapeResponse.status}`);
    }

    const scrapeData = (await scrapeResponse.json()) as { success?: boolean; data?: { markdown?: string } };
    const markdown = scrapeData.data?.markdown;

    if (!markdown) {
      throw new Error('No markdown content returned');
    }

    console.log('✅ Scraped:', markdown.length, 'characters');

    // STEP 2: Extract + Infer with Claude via AI SDK
    console.log('🤖 Extracting with LLM...');

    const pageContent = markdown.slice(0, 15000);
    const userPrompt = `Extract structured sales enablement content from this page. Include inference (industry, department, persona, confidence, reasoning) based on context clues.

Page content:
${pageContent}`;

    const useLmStudioFallback = process.env.LLM_PROVIDER === 'lmstudio';
    let extracted: z.infer<typeof extractionSchema>;

    if (useLmStudioFallback) {
      const jsonHint = `
Respond with only a single JSON object. No markdown, no code fences. Keys: title, type, valueProp?, inference?: { industry?, department?, persona?, confidence?, reasoning? }, useCases?, benefits?, painPoints?, technicalSpecs?, customers?, proofPoints?, talkingPoints?, successStories?.`;
      const { text } = await generateText({
        model: getChatModel(),
        maxOutputTokens: 4000,
        system: SYSTEM_PROMPT + jsonHint,
        prompt: userPrompt,
      });
      const raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = extractionSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        console.error('LM Studio extraction JSON validation failed:', parsed.error.flatten());
        return NextResponse.json(
          { error: 'AI returned invalid extraction structure. Try again.', details: parsed.error.flatten() },
          { status: 500 }
        );
      }
      extracted = parsed.data;
    } else {
      const { output } = await generateText({
        model: getChatModel(),
        maxOutputTokens: 4000,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        output: Output.object({
          schema: extractionSchema,
          name: 'ContentExtraction',
          description:
            'Structured sales enablement content and inferred organizational tags',
        }),
      });
      extracted = output as z.infer<typeof extractionSchema>;
    }

    console.log('✅ LLM response received');

    const result = {
      success: true,
      extractedContent: {
        title: extracted.title,
        type: extracted.type ?? 'Framework',
        valueProp: extracted.valueProp ?? '',
        useCases: extracted.useCases ?? [],
        benefits: extracted.benefits ?? [],
        painPoints: extracted.painPoints ?? [],
        technicalSpecs: extracted.technicalSpecs ?? {},
        customers: extracted.customers ?? [],
        proofPoints: extracted.proofPoints ?? [],
        talkingPoints: extracted.talkingPoints ?? [],
        successStories: extracted.successStories ?? [],
      },
      inference: {
        industry: extracted.inference?.industry ?? null,
        department: extracted.inference?.department ?? null,
        persona: extracted.inference?.persona ?? null,
        confidence: extracted.inference?.confidence ?? 'low',
        reasoning: extracted.inference?.reasoning ?? 'No reasoning provided',
      },
      sourceUrl: url,
      scrapedLength: markdown.length,
    };

    console.log('✅ Extraction complete:', {
      confidence: result.inference.confidence,
      industry: result.inference.industry,
      department: result.inference.department,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

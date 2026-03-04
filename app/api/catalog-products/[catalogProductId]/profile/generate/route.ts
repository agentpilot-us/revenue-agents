import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getChatModel } from '@/lib/llm/get-model';
import { generateObject } from 'ai';
import { z } from 'zod';

const profileSchema = z.object({
  oneLiner: z.string().describe('One-sentence tagline for the product'),
  elevatorPitch: z
    .string()
    .describe('2-3 sentence elevator pitch for a sales conversation'),
  valueProps: z
    .array(z.string())
    .describe('Key value propositions, each one sentence'),
  painPoints: z
    .array(z.string())
    .describe('Customer pain points this product addresses'),
  objectionHandlers: z.array(
    z.object({
      objection: z.string().describe('Common sales objection'),
      response: z.string().describe('Recommended response'),
    })
  ),
  competitivePositioning: z
    .array(z.string())
    .describe('Competitive differentiators and positioning statements'),
  priceRangeText: z
    .string()
    .describe('Price range or pricing model if available, otherwise "Contact sales"'),
  salesCycle: z
    .string()
    .describe('Typical sales cycle length if inferable, otherwise "Varies"'),
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ catalogProductId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { catalogProductId } = await params;
  const userId = session.user.id;

  const catalogProduct = await prisma.catalogProduct.findFirst({
    where: { id: catalogProductId, userId },
    select: { id: true, name: true, description: true, useCases: true },
  });

  if (!catalogProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const contentItems = await prisma.contentLibrary.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { title: { contains: catalogProduct.name, mode: 'insensitive' } },
        ...(catalogProduct.name.includes(' ')
          ? catalogProduct.name
              .split(' ')
              .filter((w) => w.length > 3)
              .map((word) => ({
                title: { contains: word, mode: 'insensitive' as const },
              }))
          : []),
      ],
    },
    select: {
      title: true,
      type: true,
      content: true,
      sourceUrl: true,
    },
    take: 15,
  });

  if (contentItems.length === 0) {
    const fallbackItems = await prisma.contentLibrary.findMany({
      where: {
        userId,
        isActive: true,
        type: { in: ['FeatureRelease', 'UseCase', 'ResourceLink'] },
      },
      select: { title: true, type: true, content: true, sourceUrl: true },
      take: 10,
    });
    contentItems.push(...fallbackItems);
  }

  const contentSummaries = contentItems.map((item) => {
    const obj = item.content as Record<string, unknown> | null;
    const body =
      typeof obj === 'object' && obj !== null
        ? (obj as Record<string, string>).summary ??
          (obj as Record<string, string>).description ??
          (obj as Record<string, string>).text ??
          JSON.stringify(obj).slice(0, 600)
        : '';
    return `Title: ${item.title}\nType: ${item.type}\nURL: ${item.sourceUrl ?? 'N/A'}\nContent: ${String(body).slice(0, 500)}`;
  });

  const model = getChatModel('full');

  const result = await generateObject({
    model,
    schema: profileSchema,
    system: `You are a sales enablement expert. Generate a comprehensive sales profile for a product based on information from the company's website. The profile should be actionable for sales reps — concise, specific, and persuasive. If information is not available in the content, make reasonable inferences based on the product type and industry context, but do not fabricate specific numbers or claims.`,
    prompt: `Generate a sales profile for this product:\n\nProduct: ${catalogProduct.name}\nDescription: ${catalogProduct.description ?? 'No description provided'}\nUse cases: ${(catalogProduct.useCases as string[] | null)?.join(', ') ?? 'Not specified'}\n\nHere is content from the company's website related to this product:\n\n${contentSummaries.join('\n\n---\n\n') || 'No specific content found — generate based on the product name and description.'}`,
  });

  const profile = result.object;

  const upserted = await prisma.productProfile.upsert({
    where: {
      catalogProductId_userId: {
        catalogProductId: catalogProduct.id,
        userId,
      },
    },
    update: {
      oneLiner: profile.oneLiner,
      elevatorPitch: profile.elevatorPitch,
      valueProps: profile.valueProps,
      painPoints: profile.painPoints,
      objectionHandlers: profile.objectionHandlers,
      competitivePositioning: profile.competitivePositioning,
      priceRangeText: profile.priceRangeText,
      salesCycle: profile.salesCycle,
    },
    create: {
      catalogProductId: catalogProduct.id,
      userId,
      oneLiner: profile.oneLiner,
      elevatorPitch: profile.elevatorPitch,
      valueProps: profile.valueProps,
      painPoints: profile.painPoints,
      objectionHandlers: profile.objectionHandlers,
      competitivePositioning: profile.competitivePositioning,
      priceRangeText: profile.priceRangeText,
      salesCycle: profile.salesCycle,
    },
  });

  return NextResponse.json(upserted);
}

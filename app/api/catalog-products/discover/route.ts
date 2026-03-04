import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getChatModel } from '@/lib/llm/get-model';
import { generateObject } from 'ai';
import { z } from 'zod';

const discoveredProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe('Product name as it appears on the website'),
      description: z
        .string()
        .describe('One-paragraph description synthesized from the content'),
      useCases: z
        .array(z.string())
        .describe('Primary use cases for this product'),
      sourceContentIds: z
        .array(z.string())
        .describe('IDs of ContentLibrary items this product was identified from'),
    })
  ),
});

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const contentItems = await prisma.contentLibrary.findMany({
    where: {
      userId,
      isActive: true,
      type: { in: ['FeatureRelease', 'UseCase', 'ResourceLink', 'Framework'] },
    },
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      sourceUrl: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  if (contentItems.length === 0) {
    return NextResponse.json({ products: [], message: 'No content library items found.' });
  }

  const existingProducts = await prisma.catalogProduct.findMany({
    where: { userId },
    select: { name: true },
  });
  const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));

  const contentSummaries = contentItems.map((item) => {
    const contentObj = item.content as Record<string, unknown> | null;
    const body =
      typeof contentObj === 'object' && contentObj !== null
        ? (contentObj as Record<string, string>).summary ??
          (contentObj as Record<string, string>).description ??
          (contentObj as Record<string, string>).text ??
          JSON.stringify(contentObj).slice(0, 500)
        : '';
    return `[ID: ${item.id}] Title: ${item.title}\nType: ${item.type}\nURL: ${item.sourceUrl ?? 'N/A'}\nContent: ${String(body).slice(0, 400)}`;
  });

  const model = getChatModel('full');

  const result = await generateObject({
    model,
    schema: discoveredProductSchema,
    system: `You are a sales operations analyst. Given content scraped from a company's website, identify the distinct products or product lines the company sells. Group related content together under the same product. Only return products that are clearly identifiable — do not invent products. Each product should have a clear name, description, and use cases derived from the actual content.`,
    prompt: `Here are ${contentItems.length} content items from the company's website:\n\n${contentSummaries.join('\n\n---\n\n')}\n\nIdentify the distinct products or product lines. For each, provide the name, a description, use cases, and which content item IDs informed it.`,
  });

  const discovered = result.object.products.filter(
    (p) => !existingNames.has(p.name.toLowerCase())
  );

  return NextResponse.json({ products: discovered });
}

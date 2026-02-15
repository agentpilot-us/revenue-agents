import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { ContentType } from '@prisma/client';
import { z } from 'zod';

const itemSchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  suggestedType: z.string(),
  industry: z.string().optional(),
  department: z.string().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
});

/** Map suggestedType from smart-import to ContentType. */
function suggestedTypeToContentType(suggested: string): ContentType {
  const lower = suggested.toLowerCase();
  if (lower.includes('case') || lower.includes('success')) return 'SuccessStory';
  if (lower.includes('event') || lower.includes('webinar')) return 'CompanyEvent';
  if (lower.includes('product')) return 'FeatureRelease';
  if (lower.includes('solution') || lower.includes('use case')) return 'UseCase';
  if (lower.includes('playbook') || lower.includes('framework')) return 'Framework';
  if (lower.includes('pricing')) return 'ResourceLink';
  return 'ResourceLink';
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let product = await prisma.product.findFirst({
      where: { userId: session.user.id, name: 'Company content' },
      select: { id: true },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          userId: session.user.id,
          name: 'Company content',
          description: 'Content from company setup / website import',
          category: 'Content',
        },
        select: { id: true },
      });
    }

    const created: Array<{ id: string; title: string; type: string }> = [];
    for (const item of parsed.data.items) {
      const type = suggestedTypeToContentType(item.suggestedType);
      const existing = await prisma.contentLibrary.findFirst({
        where: {
          userId: session.user.id,
          sourceUrl: item.url,
          isActive: true,
        },
      });
      if (existing) continue;

      const contentItem = await prisma.contentLibrary.create({
        data: {
          userId: session.user.id,
          productId: product.id,
          title: item.title.slice(0, 500),
          type,
          content: { description: item.description ?? '', suggestedType: item.suggestedType },
          industry: item.industry ?? null,
          department: item.department ?? null,
          sourceUrl: item.url,
          userConfirmed: true,
          scrapedAt: new Date(),
        },
      });
      created.push({ id: contentItem.id, title: contentItem.title, type });
    }

    return NextResponse.json({
      created: created.length,
      items: created,
    });
  } catch (e) {
    console.error('POST company-setup/smart-import/approve', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Approve failed' },
      { status: 500 }
    );
  }
}

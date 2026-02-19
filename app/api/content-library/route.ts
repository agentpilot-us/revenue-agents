import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { ContentType } from '@prisma/client';
import { calculateContentHash } from '@/lib/content-library/content-hash';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const persona = searchParams.get('persona');
    const department = searchParams.get('department');
    const industry = searchParams.get('industry');

    const validTypes: ContentType[] = [
      'Framework',
      'UseCase',
      'SuccessStory',
      'Persona',
      'Battlecard',
      'FeatureRelease',
      'CompanyEvent',
      'EmailContent',
      'VideoLink',
      'ResourceLink',
      'UploadedDocument',
    ];
    const typeFilter =
      type && validTypes.includes(type as ContentType) ? (type as ContentType) : undefined;

    const content = await prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        ...(productId && { productId }),
        ...(typeFilter && { type: typeFilter }),
        ...(persona && { persona }),
        ...(department && { department }),
        ...(industry && { industry }),
        isActive: true,
      },
      include: {
        product: {
          select: { name: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      productId,
      title,
      type,
      content,
      persona,
      department,
      industry,
      company,
      competitor,
      sourceUrl,
      inferredTags,
      confidenceScore,
    } = await req.json();

    let resolvedProductId: string | null = productId ?? null;
    if (resolvedProductId) {
      const product = await prisma.product.findFirst({
        where: { id: resolvedProductId, userId: session.user.id },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
      }
    }

    const contentHash = calculateContentHash(content);

    const contentItem = await prisma.contentLibrary.create({
      data: {
        userId: session.user.id,
        productId: resolvedProductId,
        title,
        type,
        content,
        contentHash,
        version: '1.0',
        persona,
        department,
        industry,
        company,
        competitor,
        sourceUrl,
        inferredTags,
        confidenceScore,
        userConfirmed: true,
        scrapedAt: sourceUrl ? new Date() : null,
      },
    });

    return NextResponse.json({ content: contentItem }, { status: 201 });
  } catch (error) {
    console.error('Content creation error:', error);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

const PATCH_ALLOWED_KEYS = [
  'title',
  'type',
  'content',
  'persona',
  'department',
  'industry',
  'company',
  'competitor',
  'sourceUrl',
  'inferredTags',
  'confidenceScore',
  'userConfirmed',
  'isActive',
] as const;

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...rest } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
    }

    const existing = await prisma.contentLibrary.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Content not found or access denied' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of PATCH_ALLOWED_KEYS) {
      if (key in rest) updates[key] = rest[key];
    }
    updates.userConfirmed = true;

    const contentItem = await prisma.contentLibrary.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ content: contentItem });
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

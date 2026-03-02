import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateOneContent, type GenerateContentType } from '@/lib/plays/generate-content';

const contentTypeSchema = ['email', 'linkedin', 'custom_url', 'talking_points', 'presentation'] as const;

function isContentType(s: string): s is GenerateContentType {
  return contentTypeSchema.includes(s as GenerateContentType);
}

export async function POST(
  req: NextRequest,
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
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let body: { contentType?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const contentType = isContentType(body.contentType ?? '') ? (body.contentType as GenerateContentType) : 'email';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const { content } = await generateOneContent({
      companyId,
      userId: session.user.id,
      contentType,
      prompt,
    });

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error('Create content API error:', error);

    const isQuotaError =
      (error as { statusCode?: number })?.statusCode === 429 ||
      (error as { data?: { error?: { code?: string } } })?.data?.error?.code === 'insufficient_quota' ||
      (error instanceof Error && /quota|rate limit|429/i.test(error.message));

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: 'Embedding quota exceeded',
          details: 'Your OpenAI (or embedding provider) quota or billing limit was exceeded.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

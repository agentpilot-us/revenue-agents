import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const putBodySchema = z.object({
  whyThisCompany: z.array(z.string()).optional(),
  useCases: z
    .array(
      z.object({
        contentLibraryId: z.string(),
        customNote: z.string().optional(),
        departmentFit: z.array(z.string()).optional(),
      })
    )
    .optional(),
  successStories: z
    .array(
      z.object({
        contentLibraryId: z.string(),
        whyRelevant: z.string(),
        bestForDepartments: z.array(z.string()).optional(),
      })
    )
    .optional(),
  objectionHandlers: z
    .array(
      z.object({
        objection: z.string(),
        response: z.string(),
      })
    )
    .optional(),
  doNotMention: z
    .array(
      z.object({
        topic: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
});

export async function GET(
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
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const accountMessaging = await prisma.accountMessaging.findUnique({
      where: { companyId },
    });

    if (!accountMessaging) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      id: accountMessaging.id,
      companyId: accountMessaging.companyId,
      whyThisCompany: accountMessaging.whyThisCompany as string[] | null,
      useCases: accountMessaging.useCases as unknown[] | null,
      successStories: accountMessaging.successStories as unknown[] | null,
      objectionHandlers: accountMessaging.objectionHandlers as unknown[] | null,
      doNotMention: accountMessaging.doNotMention as unknown[] | null,
      aiGenerated: accountMessaging.aiGenerated,
      updatedAt: accountMessaging.updatedAt,
    });
  } catch (e) {
    console.error('GET account-messaging', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await req.json();
    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = {
      whyThisCompany: parsed.data.whyThisCompany ?? undefined,
      useCases: parsed.data.useCases ?? undefined,
      successStories: parsed.data.successStories ?? undefined,
      objectionHandlers: parsed.data.objectionHandlers ?? undefined,
      doNotMention: parsed.data.doNotMention ?? undefined,
      aiGenerated: false,
    };

    const accountMessaging = await prisma.accountMessaging.upsert({
      where: { companyId },
      create: {
        companyId,
        userId: session.user.id,
        ...data,
      },
      update: data,
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
    console.error('PUT account-messaging', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

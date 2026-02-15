import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { autoGenerateAccountMessaging } from '@/lib/account-messaging/auto-generate';

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
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Use auto-generation logic (prioritizes company-branded Content Library, includes ALL)
    const messagingData = await autoGenerateAccountMessaging(companyId, session.user.id);

    if (!messagingData) {
      return NextResponse.json(
        { error: 'Failed to generate account messaging. Ensure research data exists.' },
        { status: 400 }
      );
    }

    const accountMessaging = await prisma.accountMessaging.upsert({
      where: { companyId },
      create: {
        companyId,
        userId: session.user.id,
        whyThisCompany: messagingData.whyThisCompany,
        useCases: messagingData.useCases,
        successStories: messagingData.successStories,
        objectionHandlers: messagingData.objectionHandlers,
        doNotMention: messagingData.doNotMention,
        aiGenerated: true,
      },
      update: {
        whyThisCompany: messagingData.whyThisCompany,
        useCases: messagingData.useCases,
        successStories: messagingData.successStories,
        objectionHandlers: messagingData.objectionHandlers,
        doNotMention: messagingData.doNotMention,
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

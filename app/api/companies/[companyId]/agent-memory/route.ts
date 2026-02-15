import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({
  conversationSummary: z.string().optional(),
  decisions: z.array(z.string()).optional(),
  contactInteractionSummary: z.string().optional(),
});

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
      select: { id: true, agentContext: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    type AgentContext = {
      lastConversationSummary?: string;
      decisions?: string[];
      contactInteractionSummary?: string;
    };
    const current = (company.agentContext as AgentContext | null) ?? {};
    const updates: AgentContext = { ...current };
    if (parsed.data.conversationSummary !== undefined) {
      updates.lastConversationSummary = parsed.data.conversationSummary;
    }
    if (parsed.data.decisions?.length) {
      updates.decisions = [...(current.decisions ?? []), ...parsed.data.decisions];
    }
    if (parsed.data.contactInteractionSummary !== undefined) {
      updates.contactInteractionSummary = parsed.data.contactInteractionSummary;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { agentContext: updates as object, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST agent-memory', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

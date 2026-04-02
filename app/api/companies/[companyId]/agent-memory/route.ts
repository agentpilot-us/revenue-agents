import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  mergeStradexSellerProfileAfterPatch,
  refreshStradexDemoNoteLine,
} from '@/lib/stradex/seller-profile';

const stradexSellerProfilePatchSchema = z
  .object({
    companyName: z.string().min(1).optional(),
    website: z.string().nullable().optional(),
    toneOrPositioningNotes: z.string().nullable().optional(),
  })
  .optional();

const bodySchema = z.object({
  conversationSummary: z.string().optional(),
  decisions: z.array(z.string()).optional(),
  contactInteractionSummary: z.string().optional(),
  stradexSellerProfile: stradexSellerProfilePatchSchema,
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
      select: {
        id: true,
        agentContext: true,
        dealObjective: true,
        researchGoal: true,
        demoNote: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    let next = { ...(company.agentContext as Record<string, unknown> | null) ?? {} };
    let demoNote: string | null | undefined;

    const sp = parsed.data.stradexSellerProfile;
    const hasStradexPatch = sp != null && Object.keys(sp).length > 0;
    if (hasStradexPatch) {
      if (!next.stradexLead) {
        return NextResponse.json(
          { error: 'stradexSellerProfile applies only to companies created from Stradex lead intake.' },
          { status: 400 }
        );
      }
      try {
        const { agentContext, sellerCompanyName } = mergeStradexSellerProfileAfterPatch({
          prevAgentContext: next,
          dealObjective: company.dealObjective,
          researchGoal: company.researchGoal,
          patch: sp,
        });
        next = { ...agentContext };
        demoNote = refreshStradexDemoNoteLine(company.demoNote, sellerCompanyName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid Stradex seller profile patch';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (parsed.data.conversationSummary !== undefined) {
      next.lastConversationSummary = parsed.data.conversationSummary;
    }
    if (parsed.data.decisions?.length) {
      const prevDecisions = (next.decisions as string[] | undefined) ?? [];
      next.decisions = [...prevDecisions, ...parsed.data.decisions];
    }
    if (parsed.data.contactInteractionSummary !== undefined) {
      next.contactInteractionSummary = parsed.data.contactInteractionSummary;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        agentContext: next as object,
        ...(demoNote !== undefined ? { demoNote } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST agent-memory', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({
  event: z.enum(['visit', 'share']),
  sessionId: z.string().optional(),
  sharedByEmail: z.string().email().optional(),
  channel: z.enum(['email', 'copy_link']).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const campaign = await prisma.segmentCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { event, sessionId, sharedByEmail, channel } = parsed.data;

    if (event === 'visit') {
      await prisma.campaignVisit.create({
        data: {
          campaignId,
          sessionId: sessionId ?? null,
        },
      });
    } else if (event === 'share') {
      await prisma.campaignShare.create({
        data: {
          campaignId,
          sharedByEmail: sharedByEmail ?? null,
          channel: channel ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/go/[id]/track error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Track failed' },
      { status: 500 }
    );
  }
}

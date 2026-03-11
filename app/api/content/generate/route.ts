import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateOneContent } from '@/lib/plays/generate-content';
import { CONTENT_INTENT_IDS } from '@/lib/content/content-intents';
import type { ChannelId } from '@/lib/content/channel-config';

const CHANNEL_IDS = [
  'email',
  'linkedin_inmail',
  'linkedin_post',
  'slack',
  'sms',
  'sales_page',
  'presentation',
  'ad_brief',
  'demo_script',
  'video',
  'one_pager',
  'talk_track',
  'champion_enablement',
  'map',
  'qbr_ebr_script',
] as const;

const GenerateSchema = z.object({
  companyId: z.string(),
  divisionId: z.string().optional(),
  channel: z.enum(CHANNEL_IDS),
  contactIds: z.array(z.string()).optional(),
  triggerId: z.string().optional(),
  activeActionIndex: z.number().int().min(0).optional(),
  userContext: z.string().max(1000).optional(),
  contentIntent: z.enum(CONTENT_INTENT_IDS).optional(),
  motion: z.string().optional(),
  playId: z.string().optional(),
  contentType: z.string().optional(),
  senderRole: z.string().optional(),
  tone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = GenerateSchema.parse(json);

    type ContactRow = {
      firstName: string | null;
      lastName: string | null;
      title: string | null;
    };

    const [contacts, signal] = await Promise.all([
      input.contactIds && input.contactIds.length > 0
        ? prisma.contact.findMany({
            where: {
              companyId: input.companyId,
              id: { in: input.contactIds },
            },
            select: { firstName: true, lastName: true, title: true },
          })
        : Promise.resolve([] as ContactRow[]),
      input.triggerId
        ? prisma.accountSignal.findFirst({
            where: {
              id: input.triggerId,
              companyId: input.companyId,
              userId: session.user.id,
            },
            select: { title: true, summary: true },
          })
        : Promise.resolve(null),
    ]);

    const { raw, parsed } = await generateOneContent({
      companyId: input.companyId,
      userId: session.user.id,
      channel: input.channel as ChannelId,
      divisionId: input.divisionId,
      contacts,
      motion: input.motion,
      playId: input.playId,
      contentType: input.contentType,
      contentIntent: input.contentIntent,
      senderRole: input.senderRole,
      tone: input.tone,
      userContext: input.userContext,
      signalContext: signal
        ? {
            title: signal.title,
            summary: signal.summary,
          }
        : undefined,
      activeActionIndex: input.activeActionIndex,
    });

    return NextResponse.json({
      contentId: crypto.randomUUID(),
      raw,
      ...parsed,
    });
  } catch (error) {
    console.error('POST /api/content/generate error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 },
    );
  }
}

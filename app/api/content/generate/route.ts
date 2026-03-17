import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateOneContent } from '@/lib/content/generate-content';
import { CONTENT_INTENT_IDS } from '@/lib/content/content-intents';
import {
  channelSupportsVariants,
  getChannelConfig,
  type ChannelId,
} from '@/lib/content/channel-config';
import { buildContentContext } from '@/lib/content/build-content-context';
import { buildAssetPackage } from '@/lib/content/build-asset-package';

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
  'generated_image',
  'generated_video',
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
  mediaAspectRatio: z.string().optional(),
  mediaDurationSeconds: z.number().int().min(1).max(8).optional(),
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

    const generationInput = {
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
      mediaAspectRatio: input.mediaAspectRatio,
      mediaDurationSeconds: input.mediaDurationSeconds,
      signalContext: signal
        ? {
            title: signal.title,
            summary: signal.summary,
          }
        : undefined,
      activeActionIndex: input.activeActionIndex,
    };
    const shouldReturnVariants = channelSupportsVariants(input.channel);
    const context = await buildContentContext(generationInput);
    const result = await generateOneContent({
      ...generationInput,
      variantCount: shouldReturnVariants ? 3 : undefined,
    });
    const config = getChannelConfig(input.channel);
    const firstVariant = result.variants?.[0];
    const assetPackage = await buildAssetPackage({
      contextInput: generationInput,
      context,
      generation: {
        raw: firstVariant?.raw ?? result.raw,
        parsed: firstVariant?.parsed ?? result.parsed,
      },
    });

    return NextResponse.json({
      contentId: crypto.randomUUID(),
      raw: firstVariant?.raw ?? result.raw,
      renderer: config.renderer,
      deliveryMode: config.deliveryMode,
      destinationTargets: config.destinationTargets,
      templateType: config.templateType,
      assetPackage,
      media: result.media,
      variants: result.variants?.map((variant) => ({
        contentId: crypto.randomUUID(),
        label: variant.label,
        raw: variant.raw,
        ...variant.parsed,
      })),
      ...(firstVariant?.parsed ?? result.parsed),
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

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getAllChannels } from '@/lib/content/channel-config';
import { getContentIntents, type ContentIntentId, type MotionFilter } from '@/lib/content/content-intents';
import {
  getMotions,
  getContentTypes,
  type MotionId,
} from '@/lib/content/content-matrix';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const motion = searchParams.get('motion') as MotionId | null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultContentIntent: true },
  });

  const motionFilter = motion as MotionFilter | null;

  const channels = getAllChannels().map((ch) => ({
    ...ch,
    intents: getContentIntents(ch.id, motionFilter ?? undefined).map((i) => ({ id: i.id, label: i.label })),
  }));

  const outreachChannels = channels.filter((ch) => ch.group === 'outreach');
  const salesAssetChannels = channels.filter((ch) => ch.group === 'sales_asset');

  const motions = getMotions().map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    stageContext: m.stageContext,
  }));

  const contentTypes = getContentTypes(motion ? { motion } : undefined).map((t) => ({
    id: t.id,
    label: t.label,
    stage: t.stage,
    channelIds: t.channelIds,
    motions: t.motions,
  }));

  return NextResponse.json({
    channels,
    channelGroups: {
      outreach: outreachChannels,
      salesAsset: salesAssetChannels,
    },
    motions,
    contentTypes,
    defaultContentIntent: (user?.defaultContentIntent as ContentIntentId | null) ?? null,
  });
}

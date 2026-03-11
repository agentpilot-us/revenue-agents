import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateObject, generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { buildContentContext } from '@/lib/content/build-content-context';
import { CONTENT_INTENT_IDS } from '@/lib/content/content-intents';
import { getChannelConfig, type ChannelId } from '@/lib/content/channel-config';
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
  'one_pager',
  'talk_track',
  'champion_enablement',
  'map',
  'qbr_ebr_script',
] as const;

const RegenerateSchema = z.object({
  contentId: z.string(),
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
  feedback: z.string().max(500).optional(),
  previousOutput: z.string().max(10000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = RegenerateSchema.parse(json);

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

    const ctx = await buildContentContext({
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

    const messages =
      input.feedback && input.previousOutput
        ? [
            { role: 'user' as const, content: ctx.userPrompt },
            { role: 'assistant' as const, content: input.previousOutput },
            {
              role: 'user' as const,
              content: `Please revise the content above based on this feedback: "${input.feedback}"\n\nKeep the same format and structure. Only change what the feedback asks for.`,
            },
          ]
        : [{ role: 'user' as const, content: ctx.userPrompt }];
    const model = getChatModel(
      ctx.effectiveModelTier,
      ctx.modelHint,
      ctx.gatewayModel,
    );
    const config = getChannelConfig(input.channel);

    if (config.outputMode === 'object' && config.outputSchema) {
      const { object } = await generateObject({
        model,
        schema: config.outputSchema,
        maxOutputTokens: ctx.maxOutputTokens,
        system: ctx.systemPrompt,
        messages,
      });

      const parsed = object as Record<string, unknown>;
      const raw = config.formatOutput(parsed);
      const assetPackage = await buildAssetPackage({
        contextInput: {
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
        },
        context: ctx,
        generation: { raw, parsed },
      });

      return NextResponse.json({
        contentId: input.contentId,
        raw,
        renderer: config.renderer,
        deliveryMode: config.deliveryMode,
        destinationTargets: config.destinationTargets,
        templateType: config.templateType,
        assetPackage,
        ...parsed,
      });
    }

    const { text } = await generateText({
      model,
      maxOutputTokens: ctx.maxOutputTokens,
      system: ctx.systemPrompt,
      messages,
    });

    const raw = text.trim();
    const parsed = config.parseOutput(raw);
    const assetPackage = await buildAssetPackage({
      contextInput: {
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
      },
      context: ctx,
      generation: { raw, parsed },
    });

    return NextResponse.json({
      contentId: input.contentId,
      raw,
      renderer: config.renderer,
      deliveryMode: config.deliveryMode,
      destinationTargets: config.destinationTargets,
      templateType: config.templateType,
      assetPackage,
      ...parsed,
    });
  } catch (error) {
    console.error('POST /api/content/regenerate error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to regenerate content' },
      { status: 500 },
    );
  }
}


import { generateObject } from 'ai';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getChatModel } from '@/lib/llm/get-model';
import { prisma } from '@/lib/db';
import type { PlayContext, PlayId } from './plays-config';
import { PLAYS } from './plays-config';

const PlayOutputSchema = z.object({
  page: z.object({
    headline: z.string(),
    subheadline: z.string(),
    sections: z.array(
      z.object({
        type: z.string(),
        content: z.record(z.unknown()),
      })
    ),
    ctaLabel: z.string(),
    ctaUrl: z.string().optional(),
  }),
  email: z.object({
    subject: z.string(),
    body: z.string(),
  }),
});

export type ExecutePlayParams = {
  playId: PlayId;
  companyId: string;
  userId: string;
  context: PlayContext;
  ctaUrl?: string;
};

export type ExecutePlayResult = {
  campaignId: string;
  slug: string;
  page: z.infer<typeof PlayOutputSchema>['page'];
  email: z.infer<typeof PlayOutputSchema>['email'];
  previewUrl: string;
};

export async function executePlay(params: ExecutePlayParams): Promise<ExecutePlayResult> {
  const { playId, companyId, userId, context, ctaUrl } = params;

  const play = PLAYS.find((p) => p.id === playId);
  if (!play) throw new Error(`Play not found: ${playId}`);

  const prompt = play.buildPrompt(context);

  const { object } = await generateObject({
    model: getChatModel(),
    schema: PlayOutputSchema,
    prompt,
    maxOutputTokens: 2000,
  });

  const parsed = PlayOutputSchema.safeParse(object);
  if (!parsed.success) {
    throw new Error('AI returned invalid play output structure');
  }
  const { page, email } = parsed.data;

  const slugBase = `${companyId}-${playId}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'play';
  let slug = slugBase;
  let suffix = 0;
  let existing = await prisma.segmentCampaign.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  while (existing) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
    existing = await prisma.segmentCampaign.findUnique({
      where: { userId_slug: { userId, slug } },
    });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const url = `${baseUrl}/go/${slug}`;

  const campaign = await prisma.segmentCampaign.create({
    data: {
      userId,
      companyId,
      departmentId: context.segment.id,
      slug,
      title: `${play.name} — ${context.segment.name}`,
      description: null,
      type: 'landing_page',
      url,
      pageType: play.pageType,
      headline: page.headline,
      subheadline: page.subheadline ?? null,
      body: null,
      ctaLabel: page.ctaLabel ?? null,
      ctaUrl: ctaUrl ?? page.ctaUrl ?? null,
      sections: page.sections?.length ? (page.sections as Prisma.InputJsonValue) : Prisma.JsonNull,
      isMultiDepartment: false,
      playId,
      draftEmailSubject: email.subject,
      draftEmailBody: email.body,
    },
  });

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    page,
    email,
    previewUrl: `/go/${slug}`,
  };
}

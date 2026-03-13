/**
 * Shared channel configuration for all content generation paths.
 * Defines per-channel constraints, routing metadata, structured schemas,
 * serializers, and render hints so ad-hoc content and play-based generation
 * stay in sync.
 */

import { z } from 'zod';
import type { ContentHint } from '@/lib/llm/get-model';

export type ChannelId =
  | 'email'
  | 'linkedin_inmail'
  | 'linkedin_post'
  | 'slack'
  | 'sms'
  | 'sales_page'
  | 'presentation'
  | 'ad_brief'
  | 'demo_script'
  | 'video'
  | 'generated_image'
  | 'generated_video'
  | 'one_pager'
  | 'talk_track'
  | 'champion_enablement'
  | 'map'
  | 'qbr_ebr_script';

export type ChannelGroup = 'outreach' | 'sales_asset';
export type ChannelMode = 'one_to_one' | 'broadcast';
export type ContextTier = 'light' | 'standard' | 'deep';
export type OutputMode = 'text' | 'object';
export type DeliveryMode = 'direct_draft' | 'asset_package';
export type GenerationKind = 'text' | 'image' | 'video';
export type TemplateType =
  | 'email_message'
  | 'linkedin_message'
  | 'linkedin_post'
  | 'slack_message'
  | 'sms_message'
  | 'sales_page_html'
  | 'presentation_deck'
  | 'ad_brief_doc'
  | 'demo_runbook'
  | 'video_script_package'
  | 'generated_image_asset'
  | 'generated_video_asset'
  | 'one_pager_doc'
  | 'talk_track_sheet'
  | 'champion_kit'
  | 'map_timeline'
  | 'qbr_report';
export type DestinationTarget =
  | 'google_docs'
  | 'google_slides'
  | 'google_drive_file'
  | 'gmail_draft'
  | 'pptx_download'
  | 'html_preview'
  | 'download'
  | 'copy';
export type RendererKind =
  | 'text'
  | 'email'
  | 'linkedin_inmail'
  | 'linkedin_post'
  | 'sales_page'
  | 'presentation'
  | 'ad_brief'
  | 'demo_script'
  | 'video'
  | 'image_asset'
  | 'video_asset'
  | 'one_pager'
  | 'talk_track'
  | 'champion_enablement'
  | 'map'
  | 'qbr_ebr_script';

export type GeneratedVariant = {
  label: string;
  raw: string;
  parsed: Record<string, unknown>;
};

export interface ChannelConfig {
  id: ChannelId;
  label: string;
  mode: ChannelMode;
  group: ChannelGroup;
  deliveryMode: DeliveryMode;
  templateType: TemplateType;
  destinationTargets: DestinationTarget[];
  contextTier: ContextTier;
  modelTier: 'fast' | 'full';
  maxOutputTokens: number;
  generationKind: GenerationKind;
  outputMode: OutputMode;
  renderer: RendererKind;
  gatewayModel?: string;
  modelHint?: ContentHint;
  outputSchema?: z.ZodType<Record<string, unknown>>;
  buildVariantSchema?: (
    count: number,
  ) => z.ZodType<{ variants: Array<Record<string, unknown>> }>;
  buildInstruction: (companyName: string) => string;
  buildUserPrompt: () => string;
  parseOutput: (raw: string) => Record<string, unknown>;
  formatOutput: (value: Record<string, unknown>) => string;
}

const SENIORITY_KEYWORDS: Record<string, number> = {
  chief: 6,
  ceo: 6,
  cfo: 6,
  cto: 6,
  coo: 6,
  cio: 6,
  cmo: 6,
  cro: 6,
  'c-level': 6,
  president: 6,
  'senior vice president': 5,
  svp: 5,
  'executive vice president': 5,
  evp: 5,
  'vice president': 4,
  vp: 4,
  director: 3,
  'senior director': 3,
  'group director': 3,
  manager: 2,
  'senior manager': 2,
  lead: 2,
  head: 2,
};

export function inferSeniority(title: string | null | undefined): number {
  if (!title) return 1;
  const lower = title.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
    if (lower.includes(keyword)) return level;
  }
  return 1;
}

export function seniorityLabel(level: number): string {
  if (level >= 6) return 'C-Suite';
  if (level >= 4) return 'VP-level';
  if (level >= 3) return 'Director-level';
  if (level >= 2) return 'Manager-level';
  return 'Individual Contributor';
}

export function deriveToneFromContacts(
  contacts: Array<{ title?: string | null }>,
): string {
  if (contacts.length === 0) return '';
  const maxLevel = Math.max(...contacts.map((c) => inferSeniority(c.title)));
  const label = seniorityLabel(maxLevel);
  if (maxLevel >= 4) {
    return `Tone: Executive-level. Be concise, lead with strategic impact, avoid jargon. Writing to ${label} recipients.\n`;
  }
  if (maxLevel >= 3) {
    return `Tone: Senior stakeholder. Focus on operational outcomes and team impact. Writing to ${label} recipients.\n`;
  }
  return `Tone: Practitioner-level. Be specific, reference technical details and day-to-day benefits. Writing to ${label} recipients.\n`;
}

export function buildRecipientsBlock(
  contacts: Array<{
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  }>,
  channelMode: ChannelMode,
): string {
  if (contacts.length === 0) return '';
  const lines = contacts.map((c, i) => {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Contact';
    return `- Recipient ${i + 1}: ${name}${c.title ? ` (${c.title})` : ''}`;
  });

  let header = `\nRECIPIENTS:\n${lines.join('\n')}`;
  if (channelMode === 'one_to_one' && contacts.length > 1) {
    header += `\n\nIMPORTANT: This is a 1:1 channel. Write the content addressed to ${contacts[0].firstName ?? 'the first recipient'} only. Each other recipient will receive their own personalized variant.`;
  }
  return header;
}

function truncateAtBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const boundary = Math.max(lastPeriod, lastQuestion);
  if (boundary > maxChars * 0.5) return truncated.slice(0, boundary + 1);
  return truncated.trimEnd() + '…';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function recordArray<T extends Record<string, unknown>>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is T =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

const emailSchema = z.object({
  subject: z.string().min(1).max(80),
  body: z.string().min(1),
  ps: z.string().optional(),
});

const emailVariantSchema = z.object({
  label: z.string().min(1),
  subject: z.string().min(1).max(80),
  body: z.string().min(1),
  ps: z.string().optional(),
});

const linkedinInmailSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(1900),
});

const linkedinInmailVariantSchema = z.object({
  label: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(1900),
});

const linkedinPostSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
});

const linkedinPostVariantSchema = z.object({
  label: z.string().min(1),
  hook: z.string().min(1),
  body: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
});

const salesPageSchema = z.object({
  headline: z.string().min(1),
  valueProps: z.array(z.string()).min(3).max(5),
  cta: z.string().min(1),
});

const presentationSchema = z.object({
  slides: z
    .array(
      z.object({
        title: z.string().min(1),
        bullets: z.array(z.string()).min(1),
        speakerNotes: z.string().optional(),
      }),
    )
    .min(3)
    .max(5),
});

const adBriefSchema = z.object({
  objective: z.string().min(1),
  targetAudience: z.string().min(1),
  keyMessage: z.string().min(1),
  headlineOptions: z.array(z.string()).min(2).max(4),
  bodyCopy: z.string().min(1),
  cta: z.string().min(1),
  visualDirection: z.string().min(1),
});

const demoScriptSchema = z.object({
  setup: z.string().min(1),
  discoveryQuestions: z.array(z.string()).min(2),
  demoFlow: z
    .array(
      z.object({
        feature: z.string().min(1),
        narrative: z.string().min(1),
      }),
    )
    .min(2),
  close: z.string().min(1),
});

const videoSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  talkTrack: z.string().min(1),
});

const onePagerSchema = z.object({
  headline: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(2),
  cta: z.string().min(1),
});

const talkTrackSchema = z.object({
  opening: z.string().min(1),
  painProbe: z.string().min(1),
  valueProps: z.array(z.string()).min(2),
  objections: z
    .array(
      z.object({
        objection: z.string().min(1),
        response: z.string().min(1),
      }),
    )
    .min(1),
  proofPoint: z.string().min(1),
  nextStep: z.string().min(1),
});

const championEnablementSchema = z.object({
  deckOutline: z
    .array(
      z.object({
        slide: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .min(3),
  talkingPoints: z.array(z.string()).min(3),
  forwardEmail: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
});

const mapSchema = z.object({
  milestones: z
    .array(
      z.object({
        date: z.string().min(1),
        action: z.string().min(1),
        owner: z.string().min(1),
        status: z.string().min(1),
      }),
    )
    .min(3),
});

const qbrEbrSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        metrics: z.array(z.string()).optional(),
        narrative: z.string().min(1),
        recommendations: z.array(z.string()).min(1),
      }),
    )
    .min(3),
});

function buildVariantsSchema<T extends z.ZodType<Record<string, unknown>>>(
  itemSchema: T,
  count: number,
) {
  return z.object({
    variants: z.array(itemSchema).min(count).max(count),
  });
}

function formatEmail(value: Record<string, unknown>): string {
  const subject = truncateAtBoundary(stringValue(value.subject), 80);
  const body = stringValue(value.body).trim();
  const ps = stringValue(value.ps).trim();
  return [`Subject: ${subject}`, '', body, ps ? `P.S. ${ps}` : '']
    .filter(Boolean)
    .join('\n');
}

function formatLinkedInInmail(value: Record<string, unknown>): string {
  const subject = truncateAtBoundary(stringValue(value.subject), 200);
  const body = truncateAtBoundary(stringValue(value.body).trim(), 1900);
  return [`SUBJECT: ${subject}`, '', body].join('\n');
}

function formatLinkedInPost(value: Record<string, unknown>): string {
  const hook = stringValue(value.hook).trim();
  const body = stringValue(value.body).trim();
  const hashtags = stringArray(value.hashtags)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ');
  return [hook, '', body, hashtags].filter(Boolean).join('\n');
}

function formatSalesPage(value: Record<string, unknown>): string {
  return [
    `HEADLINE: ${stringValue(value.headline)}`,
    '',
    'VALUE PROPS:',
    bulletList(stringArray(value.valueProps)),
    '',
    `CTA: ${stringValue(value.cta)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatPresentation(value: Record<string, unknown>): string {
  const slides = recordArray<{
    title: string;
    bullets: string[];
    speakerNotes?: string;
  }>(value.slides);
  return slides
    .map((slide, index) =>
      [
        `SLIDE ${index + 1}: ${slide.title}`,
        'BULLETS:',
        bulletList(slide.bullets),
        slide.speakerNotes ? `SPEAKER NOTES: ${slide.speakerNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

function formatAdBrief(value: Record<string, unknown>): string {
  return [
    `OBJECTIVE: ${stringValue(value.objective)}`,
    `TARGET AUDIENCE: ${stringValue(value.targetAudience)}`,
    `KEY MESSAGE: ${stringValue(value.keyMessage)}`,
    '',
    'HEADLINE OPTIONS:',
    bulletList(stringArray(value.headlineOptions)),
    '',
    `BODY COPY: ${stringValue(value.bodyCopy)}`,
    `CTA: ${stringValue(value.cta)}`,
    `VISUAL DIRECTION: ${stringValue(value.visualDirection)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatDemoScript(value: Record<string, unknown>): string {
  const flow = recordArray<{ feature: string; narrative: string }>(value.demoFlow);
  return [
    `SETUP: ${stringValue(value.setup)}`,
    '',
    'DISCOVERY QUESTIONS:',
    bulletList(stringArray(value.discoveryQuestions)),
    '',
    'DEMO FLOW:',
    flow
      .map((item, index) =>
        [`STEP ${index + 1}: ${item.feature}`, `NARRATIVE: ${item.narrative}`].join(
          '\n',
        ),
      )
      .join('\n\n'),
    '',
    `CLOSE: ${stringValue(value.close)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatVideo(value: Record<string, unknown>): string {
  return [
    `HOOK: ${stringValue(value.hook)}`,
    '',
    `BODY: ${stringValue(value.body)}`,
    '',
    `CTA: ${stringValue(value.cta)}`,
    '',
    `TALK TRACK: ${stringValue(value.talkTrack)}`,
  ].join('\n');
}

function formatOnePager(value: Record<string, unknown>): string {
  const sections = recordArray<{ heading: string; body: string }>(value.sections);
  return [
    `HEADLINE: ${stringValue(value.headline)}`,
    '',
    ...sections.flatMap((section) => [
      `${section.heading.toUpperCase()}:`,
      section.body,
      '',
    ]),
    `CTA: ${stringValue(value.cta)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatTalkTrack(value: Record<string, unknown>): string {
  const objections = recordArray<{ objection: string; response: string }>(
    value.objections,
  );
  return [
    `OPENING: ${stringValue(value.opening)}`,
    '',
    `PAIN PROBE: ${stringValue(value.painProbe)}`,
    '',
    'VALUE PROPS:',
    bulletList(stringArray(value.valueProps)),
    '',
    'OBJECTIONS:',
    objections
      .map((item) => `- ${item.objection}\n  RESPONSE: ${item.response}`)
      .join('\n'),
    '',
    `PROOF POINT: ${stringValue(value.proofPoint)}`,
    '',
    `NEXT STEP: ${stringValue(value.nextStep)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatChampionEnablement(value: Record<string, unknown>): string {
  const deckOutline = recordArray<{ slide: string; content: string }>(
    value.deckOutline,
  );
  const forwardEmail =
    value.forwardEmail && typeof value.forwardEmail === 'object'
      ? (value.forwardEmail as Record<string, unknown>)
      : {};
  return [
    'DECK OUTLINE:',
    deckOutline
      .map((item, index) => `- Slide ${index + 1}: ${item.slide}\n  ${item.content}`)
      .join('\n'),
    '',
    'TALKING POINTS:',
    bulletList(stringArray(value.talkingPoints)),
    '',
    `FORWARD EMAIL SUBJECT: ${stringValue(forwardEmail.subject)}`,
    `FORWARD EMAIL BODY: ${stringValue(forwardEmail.body)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatMap(value: Record<string, unknown>): string {
  const milestones = recordArray<{
    date: string;
    action: string;
    owner: string;
    status: string;
  }>(value.milestones);
  return [
    'MILESTONES:',
    milestones
      .map(
        (item) =>
          `- ${item.date} | ${item.owner} | ${item.action} | ${item.status.toUpperCase()}`,
      )
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n');
}

function formatQbrEbr(value: Record<string, unknown>): string {
  const sections = recordArray<{
    title: string;
    metrics?: string[];
    narrative: string;
    recommendations: string[];
  }>(value.sections);
  return sections
    .map((section) =>
      [
        `SECTION: ${section.title}`,
        section.metrics?.length
          ? `METRICS:\n${bulletList(section.metrics)}`
          : '',
        `NARRATIVE: ${section.narrative}`,
        `RECOMMENDATIONS:\n${bulletList(section.recommendations)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

function parseEmail(raw: string): Record<string, unknown> {
  const lines = raw.split('\n');
  let subject = '';
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].toLowerCase().startsWith('subject:')) {
      subject = lines[i].replace(/^subject:\s*/i, '').trim();
      bodyStart = i + 1;
      if (lines[bodyStart]?.trim() === '') bodyStart += 1;
      break;
    }
  }
  const body = lines.slice(bodyStart).join('\n').trim();
  return { subject, body };
}

function parseLinkedInInmail(raw: string): Record<string, unknown> {
  const subjectMatch = raw.match(/^(?:SUBJECT|HOOK):\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim() ?? '';
  const body = raw
    .replace(/^(?:SUBJECT|HOOK):.*$/im, '')
    .replace(/^BODY:\s*/im, '')
    .trim();
  return { subject, body };
}

function parseTextBody(raw: string): Record<string, unknown> {
  return { body: raw.trim() };
}

const CHANNEL_TIERS: Record<
  ChannelId,
  {
    contextTier: ContextTier;
    modelTier: 'fast' | 'full';
    gatewayModel?: string;
    modelHint?: ContentHint;
  }
> = {
  email: { contextTier: 'standard', modelTier: 'fast' },
  linkedin_inmail: { contextTier: 'standard', modelTier: 'fast' },
  linkedin_post: { contextTier: 'standard', modelTier: 'fast' },
  slack: { contextTier: 'light', modelTier: 'fast' },
  sms: { contextTier: 'light', modelTier: 'fast' },
  sales_page: { contextTier: 'deep', modelTier: 'full' },
  presentation: { contextTier: 'deep', modelTier: 'full' },
  ad_brief: {
    contextTier: 'standard',
    modelTier: 'fast',
    modelHint: 'visual',
  },
  demo_script: { contextTier: 'deep', modelTier: 'full' },
  video: { contextTier: 'standard', modelTier: 'fast' },
  generated_image: {
    contextTier: 'standard',
    modelTier: 'fast',
    gatewayModel:
      process.env.GATEWAY_IMAGE_MODEL ?? 'google/gemini-3-pro-image',
    modelHint: 'visual',
  },
  generated_video: {
    contextTier: 'standard',
    modelTier: 'full',
    gatewayModel:
      process.env.GATEWAY_VIDEO_MODEL ?? 'google/veo-3.1-generate-001',
    modelHint: 'visual',
  },
  one_pager: { contextTier: 'deep', modelTier: 'full' },
  talk_track: { contextTier: 'standard', modelTier: 'fast' },
  champion_enablement: { contextTier: 'deep', modelTier: 'full' },
  map: { contextTier: 'standard', modelTier: 'fast' },
  qbr_ebr_script: { contextTier: 'deep', modelTier: 'full' },
};

const emailConfig: ChannelConfig = {
  id: 'email',
  label: 'Email',
  mode: 'one_to_one',
  group: 'outreach',
  deliveryMode: 'direct_draft',
  templateType: 'email_message',
  destinationTargets: ['gmail_draft', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'email',
  ...CHANNEL_TIERS.email,
  maxOutputTokens: 1200,
  outputSchema: emailSchema,
  buildVariantSchema: (count) => buildVariantsSchema(emailVariantSchema, count),
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Email
- Return structured email content with subject, body, and optional postscript.
- Subject: compelling, specific, under 80 characters.
- Body: 2-4 short paragraphs in plain text.
- Address the recipient by first name when possible.
- End with a clear, low-pressure CTA.
- Do NOT use markdown or HTML.`,
  buildUserPrompt: () =>
    'Generate the email in structured form with keys for subject, body, and optional ps.',
  parseOutput: parseEmail,
  formatOutput: formatEmail,
};

const linkedinInmailConfig: ChannelConfig = {
  id: 'linkedin_inmail',
  label: 'LinkedIn InMail',
  mode: 'one_to_one',
  group: 'outreach',
  deliveryMode: 'direct_draft',
  templateType: 'linkedin_message',
  destinationTargets: ['copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'linkedin_inmail',
  ...CHANNEL_TIERS.linkedin_inmail,
  maxOutputTokens: 700,
  outputSchema: linkedinInmailSchema,
  buildVariantSchema: (count) =>
    buildVariantsSchema(linkedinInmailVariantSchema, count),
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: LinkedIn InMail
- Return structured content with subject and body.
- Subject: curiosity-driven, under 200 characters.
- Body: 2-3 short paragraphs, under 1900 characters.
- Reference something specific to their role or company.
- End with one low-pressure question.`,
  buildUserPrompt: () =>
    'Generate the LinkedIn InMail in structured form with keys for subject and body.',
  parseOutput: parseLinkedInInmail,
  formatOutput: formatLinkedInInmail,
};

const linkedinPostConfig: ChannelConfig = {
  id: 'linkedin_post',
  label: 'LinkedIn Post',
  mode: 'broadcast',
  group: 'outreach',
  deliveryMode: 'direct_draft',
  templateType: 'linkedin_post',
  destinationTargets: ['copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'linkedin_post',
  ...CHANNEL_TIERS.linkedin_post,
  maxOutputTokens: 900,
  outputSchema: linkedinPostSchema,
  buildVariantSchema: (count) =>
    buildVariantsSchema(linkedinPostVariantSchema, count),
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: LinkedIn Post
- Return structured content with hook, body, and optional hashtags.
- Hook: first line that stops the scroll.
- Body: 1-3 concise paragraphs.
- Hashtags: optional relevant tags only.`,
  buildUserPrompt: () =>
    'Generate the LinkedIn post in structured form with keys for hook, body, and optional hashtags.',
  parseOutput: parseTextBody,
  formatOutput: formatLinkedInPost,
};

const slackConfig: ChannelConfig = {
  id: 'slack',
  label: 'Slack DM',
  mode: 'one_to_one',
  group: 'outreach',
  deliveryMode: 'direct_draft',
  templateType: 'slack_message',
  destinationTargets: ['copy'],
  generationKind: 'text',
  outputMode: 'text',
  renderer: 'text',
  ...CHANNEL_TIERS.slack,
  maxOutputTokens: 200,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Slack DM
- 2-4 sentences, max 500 characters.
- Friendly, casual-professional tone.
- End with a quick ask or link.`,
  buildUserPrompt: () => 'Generate the Slack DM as plain text only.',
  parseOutput: parseTextBody,
  formatOutput: (value) => stringValue(value.body).trim(),
};

const smsConfig: ChannelConfig = {
  id: 'sms',
  label: 'Text / SMS',
  mode: 'one_to_one',
  group: 'outreach',
  deliveryMode: 'direct_draft',
  templateType: 'sms_message',
  destinationTargets: ['copy'],
  generationKind: 'text',
  outputMode: 'text',
  renderer: 'text',
  ...CHANNEL_TIERS.sms,
  maxOutputTokens: 100,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: SMS / Text Message
- Max 160 characters.
- 1-2 sentences only.
- Clear CTA.`,
  buildUserPrompt: () => 'Generate the SMS as plain text only.',
  parseOutput: parseTextBody,
  formatOutput: (value) =>
    truncateAtBoundary(stringValue(value.body).trim(), 160),
};

const salesPageConfig: ChannelConfig = {
  id: 'sales_page',
  label: 'Sales Page',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'sales_page_html',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'sales_page',
  ...CHANNEL_TIERS.sales_page,
  maxOutputTokens: 1800,
  outputSchema: salesPageSchema,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Sales Page Outline
- Return structured content with headline, valueProps, and cta.
- Value props should be account-specific and concise.`,
  buildUserPrompt: () =>
    'Generate the sales page outline in structured form with keys for headline, valueProps, and cta.',
  parseOutput: parseTextBody,
  formatOutput: formatSalesPage,
};

const presentationConfig: ChannelConfig = {
  id: 'presentation',
  label: 'Presentation',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'presentation_deck',
  destinationTargets: ['pptx_download', 'google_slides', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'presentation',
  ...CHANNEL_TIERS.presentation,
  maxOutputTokens: 2600,
  outputSchema: presentationSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Presentation Outline (3-5 slides for ${companyName})
- Return structured content with a slides array.
- Each slide must include title, bullets, and optional speakerNotes.`,
  buildUserPrompt: () =>
    'Generate the presentation as a structured slides array.',
  parseOutput: parseTextBody,
  formatOutput: formatPresentation,
};

const adBriefConfig: ChannelConfig = {
  id: 'ad_brief',
  label: 'Ad Brief',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'ad_brief_doc',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'ad_brief',
  ...CHANNEL_TIERS.ad_brief,
  maxOutputTokens: 1400,
  outputSchema: adBriefSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Ad Brief for ${companyName}
- Return structured content with objective, targetAudience, keyMessage, headlineOptions, bodyCopy, cta, and visualDirection.`,
  buildUserPrompt: () => 'Generate the ad brief as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatAdBrief,
};

const demoScriptConfig: ChannelConfig = {
  id: 'demo_script',
  label: 'Demo Script',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'demo_runbook',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'demo_script',
  ...CHANNEL_TIERS.demo_script,
  maxOutputTokens: 2600,
  outputSchema: demoScriptSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Demo Script for ${companyName}
- Return structured content with setup, discoveryQuestions, demoFlow, and close.`,
  buildUserPrompt: () => 'Generate the demo script as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatDemoScript,
};

const videoConfig: ChannelConfig = {
  id: 'video',
  label: 'Video Script',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'video_script_package',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'video',
  ...CHANNEL_TIERS.video,
  maxOutputTokens: 2200,
  outputSchema: videoSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Video Script for ${companyName}
- Return structured content with hook, body, cta, and talkTrack.
- Keep the body readable as a script and the talkTrack conversational.`,
  buildUserPrompt: () => 'Generate the video script as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatVideo,
};

const generatedImageConfig: ChannelConfig = {
  id: 'generated_image',
  label: 'Generated Image',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'direct_draft',
  templateType: 'generated_image_asset',
  destinationTargets: ['download'],
  generationKind: 'image',
  outputMode: 'text',
  renderer: 'image_asset',
  ...CHANNEL_TIERS.generated_image,
  maxOutputTokens: 800,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Generated Image for ${companyName}
- Generate a single polished marketing or sales image.
- Ground the visual in the account context, value props, and buying group needs.
- Prioritize clarity, realism, and brand-safe composition.
- Avoid adding unreadable fine text inside the image.
- If the request implies a slide, social graphic, ad concept, or hero image, translate that into one strong visual direction.`,
  buildUserPrompt: () =>
    'Generate a single image concept from the account context. The result should be one finished image, not a written brief.',
  parseOutput: parseTextBody,
  formatOutput: (value) => stringValue(value.body).trim(),
};

const generatedVideoConfig: ChannelConfig = {
  id: 'generated_video',
  label: 'Generated Video',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'direct_draft',
  templateType: 'generated_video_asset',
  destinationTargets: ['download'],
  generationKind: 'video',
  outputMode: 'text',
  renderer: 'video_asset',
  ...CHANNEL_TIERS.generated_video,
  maxOutputTokens: 1200,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Generated Video for ${companyName}
- Generate a short finished video, not a script.
- Use cinematic but practical B2B visuals that fit the account context.
- Keep motion smooth and easy to follow.
- Avoid dense on-screen text, logos you cannot verify, or jarring scene changes.
- Favor one clear idea or scene progression over too many concepts.`,
  buildUserPrompt: () =>
    'Generate a short video from the account context. The result should be a finished video asset, not a written script.',
  parseOutput: parseTextBody,
  formatOutput: (value) => stringValue(value.body).trim(),
};

const onePagerConfig: ChannelConfig = {
  id: 'one_pager',
  label: 'One-Pager',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'one_pager_doc',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'one_pager',
  ...CHANNEL_TIERS.one_pager,
  maxOutputTokens: 1600,
  outputSchema: onePagerSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: One-Pager for ${companyName}
- Return structured content with headline, sections, and cta.
- Keep sections concise and export-friendly.`,
  buildUserPrompt: () => 'Generate the one-pager as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatOnePager,
};

const talkTrackConfig: ChannelConfig = {
  id: 'talk_track',
  label: 'Talk Track',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'talk_track_sheet',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'talk_track',
  ...CHANNEL_TIERS.talk_track,
  maxOutputTokens: 2000,
  outputSchema: talkTrackSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Talk Track for ${companyName}
- Return structured content with opening, painProbe, valueProps, objections, proofPoint, and nextStep.`,
  buildUserPrompt: () => 'Generate the talk track as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatTalkTrack,
};

const championEnablementConfig: ChannelConfig = {
  id: 'champion_enablement',
  label: 'Champion Kit',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'champion_kit',
  destinationTargets: ['google_slides', 'google_docs', 'google_drive_file', 'gmail_draft', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'champion_enablement',
  ...CHANNEL_TIERS.champion_enablement,
  maxOutputTokens: 2400,
  outputSchema: championEnablementSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Champion Enablement Kit for ${companyName}
- Return structured content with deckOutline, talkingPoints, and forwardEmail.`,
  buildUserPrompt: () =>
    'Generate the champion enablement kit as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatChampionEnablement,
};

const mapConfig: ChannelConfig = {
  id: 'map',
  label: 'Mutual Action Plan',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'map_timeline',
  destinationTargets: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'map',
  ...CHANNEL_TIERS.map,
  maxOutputTokens: 1600,
  outputSchema: mapSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Mutual Action Plan for ${companyName}
- Return structured content with milestones.
- Each milestone should include date, action, owner, and status.`,
  buildUserPrompt: () => 'Generate the MAP as a structured milestones object.',
  parseOutput: parseTextBody,
  formatOutput: formatMap,
};

const qbrEbrScriptConfig: ChannelConfig = {
  id: 'qbr_ebr_script',
  label: 'QBR / EBR Script',
  mode: 'broadcast',
  group: 'sales_asset',
  deliveryMode: 'asset_package',
  templateType: 'qbr_report',
  destinationTargets: ['google_slides', 'google_docs', 'google_drive_file', 'copy'],
  generationKind: 'text',
  outputMode: 'object',
  renderer: 'qbr_ebr_script',
  ...CHANNEL_TIERS.qbr_ebr_script,
  maxOutputTokens: 2600,
  outputSchema: qbrEbrSchema,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: QBR / EBR Script for ${companyName}
- Return structured content with sections.
- Each section should include title, optional metrics, narrative, and recommendations.`,
  buildUserPrompt: () =>
    'Generate the QBR / EBR script as a structured object.',
  parseOutput: parseTextBody,
  formatOutput: formatQbrEbr,
};

const CHANNEL_CONFIGS: Record<ChannelId, ChannelConfig> = {
  email: emailConfig,
  linkedin_inmail: linkedinInmailConfig,
  linkedin_post: linkedinPostConfig,
  slack: slackConfig,
  sms: smsConfig,
  sales_page: salesPageConfig,
  presentation: presentationConfig,
  ad_brief: adBriefConfig,
  demo_script: demoScriptConfig,
  video: videoConfig,
  generated_image: generatedImageConfig,
  generated_video: generatedVideoConfig,
  one_pager: onePagerConfig,
  talk_track: talkTrackConfig,
  champion_enablement: championEnablementConfig,
  map: mapConfig,
  qbr_ebr_script: qbrEbrScriptConfig,
};

export function getChannelConfig(channel: string): ChannelConfig {
  return CHANNEL_CONFIGS[channel as ChannelId] ?? emailConfig;
}

export function getAllChannels(): Array<{
  id: ChannelId;
  label: string;
  mode: ChannelMode;
  group: ChannelGroup;
  deliveryMode: DeliveryMode;
  templateType: TemplateType;
  destinationTargets: DestinationTarget[];
}> {
  return Object.values(CHANNEL_CONFIGS).map((c) => ({
    id: c.id,
    label: c.label,
    mode: c.mode,
    group: c.group,
    deliveryMode: c.deliveryMode,
    templateType: c.templateType,
    destinationTargets: c.destinationTargets,
  }));
}

export function isOneToOneChannel(channel: string): boolean {
  return getChannelConfig(channel).mode === 'one_to_one';
}

export function channelSupportsVariants(channel: string): boolean {
  return !!getChannelConfig(channel).buildVariantSchema;
}

export function isAssetPackageChannel(channel: string): boolean {
  return getChannelConfig(channel).deliveryMode === 'asset_package';
}

export function serializeChannelContent(
  channel: string,
  value: Record<string, unknown> | null | undefined,
): string {
  if (!value) return '';
  if (typeof value.raw === 'string' && value.raw.trim()) return value.raw;
  return getChannelConfig(channel).formatOutput(value);
}

export function playContentTypeToChannel(contentType: string): ChannelId {
  const map: Record<string, ChannelId> = {
    email: 'email',
    linkedin: 'linkedin_inmail',
    linkedin_inmail: 'linkedin_inmail',
    linkedin_post: 'linkedin_post',
    sms: 'sms',
    slack: 'slack',
    custom_url: 'sales_page',
    talking_points: 'talk_track',
    presentation: 'presentation',
    sales_page: 'sales_page',
    ad_brief: 'ad_brief',
    demo_script: 'demo_script',
    video: 'video',
    generated_image: 'generated_image',
    generated_video: 'generated_video',
    one_pager: 'one_pager',
    talk_track: 'talk_track',
    champion_enablement: 'champion_enablement',
    map: 'map',
    qbr_ebr_script: 'qbr_ebr_script',
  };
  return map[contentType] ?? 'email';
}

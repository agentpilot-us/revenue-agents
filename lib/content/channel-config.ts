/**
 * Shared channel configuration for all content generation paths.
 * Defines per-channel constraints, prompt instructions, output token
 * limits, and response parsers so ad-hoc content and play-based
 * generation stay in sync.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  | 'video';

export type ChannelMode = 'one_to_one' | 'broadcast';

export interface ChannelConfig {
  id: ChannelId;
  label: string;
  mode: ChannelMode;
  maxOutputTokens: number;
  /** Build the channel-specific instruction block. `companyName` is the target account. */
  buildInstruction: (companyName: string) => string;
  /** Build the user-message prompt sent alongside the system prompt. */
  buildUserPrompt: () => string;
  /** Parse raw LLM output into structured fields + apply hard limits. */
  parseOutput: (raw: string) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Seniority helpers
// ---------------------------------------------------------------------------

const SENIORITY_KEYWORDS: Record<string, number> = {
  chief: 6, ceo: 6, cfo: 6, cto: 6, coo: 6, cio: 6, cmo: 6, cro: 6, 'c-level': 6, president: 6,
  'senior vice president': 5, svp: 5, 'executive vice president': 5, evp: 5,
  'vice president': 4, vp: 4,
  director: 3, 'senior director': 3, 'group director': 3,
  manager: 2, 'senior manager': 2, lead: 2, head: 2,
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

// ---------------------------------------------------------------------------
// Helpers for multi-contact context
// ---------------------------------------------------------------------------

export function buildRecipientsBlock(
  contacts: Array<{ firstName?: string | null; lastName?: string | null; title?: string | null }>,
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

// ---------------------------------------------------------------------------
// Truncation / validation helpers
// ---------------------------------------------------------------------------

function truncateAtBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const boundary = Math.max(lastPeriod, lastQuestion);
  if (boundary > maxChars * 0.5) return truncated.slice(0, boundary + 1);
  return truncated.trimEnd() + '…';
}

// ---------------------------------------------------------------------------
// Per-channel configs
// ---------------------------------------------------------------------------

const emailConfig: ChannelConfig = {
  id: 'email',
  label: 'Email',
  mode: 'one_to_one',
  maxOutputTokens: 1000,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Email
- First line: "Subject: <subject line>" — MAX 60 characters, compelling and specific.
- Then one blank line.
- Then the email body: 2–4 short paragraphs, plain text.
- Address the recipient by first name.
- End with a clear, low-pressure CTA (e.g., "Would a 15-minute call next week make sense?").
- Do NOT use markdown, HTML, or bullet points in the body.
- Sign off with the sender's name.`,
  buildUserPrompt: () =>
    'Generate the email. Output ONLY the Subject line and email body — no other text.',
  parseOutput: (raw) => {
    const lines = raw.split('\n');
    let subject = '';
    let bodyStart = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().startsWith('subject:')) {
        subject = lines[i].replace(/^subject:\s*/i, '').trim();
        bodyStart = i + 1;
        if (lines[bodyStart]?.trim() === '') bodyStart++;
        break;
      }
    }
    subject = truncateAtBoundary(subject, 80);
    const body = lines.slice(bodyStart).join('\n').trim();
    return { subject, body };
  },
};

const linkedinInmailConfig: ChannelConfig = {
  id: 'linkedin_inmail',
  label: 'LinkedIn InMail',
  mode: 'one_to_one',
  maxOutputTokens: 600,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: LinkedIn InMail
- Line 1: "SUBJECT: <subject line>" — MAX 200 characters. Make it a question or curiosity trigger, not a headline.
- Blank line.
- Line 3+: The InMail body — 2–3 short paragraphs, MAX 1900 characters total.
- Address the recipient by first name.
- Reference something specific to their role or company.
- End with a single low-pressure question (not "let's schedule a demo").
- Output plain text only — no markdown, no bullet points, no labels in the body.`,
  buildUserPrompt: () =>
    'Generate the LinkedIn InMail. Output ONLY the SUBJECT line and body — no other text, no "BODY:" prefix.',
  parseOutput: (raw) => {
    let hook = '';
    let body = raw;

    // Try SUBJECT: first, then HOOK: for backward compat
    const subjectMatch = raw.match(/^(?:SUBJECT|HOOK):\s*(.+)/im);
    if (subjectMatch) {
      hook = subjectMatch[1].trim();
      // Find where the body starts (after the SUBJECT line + optional blank)
      const afterSubject = raw.slice(raw.indexOf(subjectMatch[0]) + subjectMatch[0].length);
      // Strip optional BODY: prefix
      body = afterSubject.replace(/^\s*\n?\s*(?:BODY:\s*)?/i, '').trim();
    }

    // If body is empty or still contains only the hook, use raw minus the subject line
    if (!body || body === hook) {
      const lines = raw.split('\n');
      const subjectLineIdx = lines.findIndex((l) =>
        /^(?:SUBJECT|HOOK):/i.test(l),
      );
      if (subjectLineIdx >= 0) {
        let start = subjectLineIdx + 1;
        while (start < lines.length && lines[start].trim() === '') start++;
        body = lines
          .slice(start)
          .join('\n')
          .replace(/^BODY:\s*/i, '')
          .trim();
      }
    }

    hook = truncateAtBoundary(hook, 200);
    body = truncateAtBoundary(body, 1900);

    return { hook, body };
  },
};

const linkedinPostConfig: ChannelConfig = {
  id: 'linkedin_post',
  label: 'LinkedIn Post',
  mode: 'broadcast',
  maxOutputTokens: 500,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: LinkedIn Post
- 1–3 short paragraphs, MAX 3000 characters total.
- Start with a strong hook sentence that stops the scroll.
- Conversational, value-driven — share insight, not a pitch.
- Do NOT include any labels, prefixes, or markdown.
- Optional: end with 2–3 relevant hashtags.
- Plain text only.`,
  buildUserPrompt: () =>
    'Generate the LinkedIn post. Output ONLY the post text — no other text.',
  parseOutput: (raw) => {
    const body = truncateAtBoundary(raw.trim(), 3000);
    return { body };
  },
};

const slackConfig: ChannelConfig = {
  id: 'slack',
  label: 'Slack DM',
  mode: 'one_to_one',
  maxOutputTokens: 200,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Slack DM
- 2–4 sentences, MAX 500 characters.
- Friendly, casual-professional tone — like messaging a colleague.
- Use the recipient's first name.
- End with a quick ask or link.
- Plain text only. Emojis are OK sparingly.`,
  buildUserPrompt: () =>
    'Generate the Slack DM. Output ONLY the message text.',
  parseOutput: (raw) => {
    const body = truncateAtBoundary(raw.trim(), 500);
    return { body };
  },
};

const smsConfig: ChannelConfig = {
  id: 'sms',
  label: 'Text / SMS',
  mode: 'one_to_one',
  maxOutputTokens: 100,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: SMS / Text Message
- MAX 160 characters (one SMS segment). Brevity is critical.
- 1–2 sentences only.
- Use first name. Clear CTA.
- Plain text, no links unless essential.`,
  buildUserPrompt: () =>
    'Generate the SMS. Output ONLY the message text, under 160 characters.',
  parseOutput: (raw) => {
    const body = truncateAtBoundary(raw.trim(), 160);
    return { body };
  },
};

const salesPageConfig: ChannelConfig = {
  id: 'sales_page',
  label: 'Sales Page',
  mode: 'broadcast',
  maxOutputTokens: 1500,
  buildInstruction: () => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Sales Page Outline
- Headline: one compelling line.
- 3–5 bullet points of value props specific to this division/account.
- One suggested CTA label (e.g., "Book a Strategy Session").
- Output as plain text with clear line breaks.`,
  buildUserPrompt: () =>
    'Generate the sales page outline. Output ONLY the headline, bullets, and CTA.',
  parseOutput: (raw) => {
    const body = raw.trim();
    return { body };
  },
};

const presentationConfig: ChannelConfig = {
  id: 'presentation',
  label: 'Presentation',
  mode: 'broadcast',
  maxOutputTokens: 2500,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Presentation Outline (3–5 slides for ${companyName})
Structure each slide as:

SLIDE [N]: [Title]
BULLETS:
- [bullet point]
SPEAKER NOTES: [what to say, 2-3 sentences]

Suggested structure:
Slide 1: Their world (account initiative/pain, not about us)
Slide 2: How we map to that (product fit, specific to this division)
Slide 3: Proof (case study or metric from a similar company)
Slide 4: What changes for them (outcomes, not features)
Slide 5: Suggested next step

Output plain text with the SLIDE/BULLETS/SPEAKER NOTES markers.`,
  buildUserPrompt: () =>
    'Generate the presentation outline. Output ONLY the SLIDE/BULLETS/SPEAKER NOTES blocks.',
  parseOutput: (raw) => {
    const slides: Array<{
      slideNumber: number;
      title: string;
      bullets: string[];
      speakerNotes: string;
    }> = [];
    const slideBlocks = raw.split(/\n(?=SLIDE\s*\d+\s*:)/im);
    for (const block of slideBlocks) {
      const numMatch = block.match(/^SLIDE\s*(\d+)\s*:\s*(.+?)(?=\n|$)/im);
      if (!numMatch) continue;
      const slideNumber = parseInt(numMatch[1], 10);
      const title = numMatch[2].trim();
      let bullets: string[] = [];
      let speakerNotes = '';
      const bulletsMatch = block.match(
        /BULLETS?\s*:\s*([\s\S]*?)(?=SPEAKER\s+NOTES\s*:|$)/im,
      );
      if (bulletsMatch) {
        bullets = bulletsMatch[1]
          .split(/\n/)
          .map((l) => l.replace(/^[\s\-*]*/, '').trim())
          .filter(Boolean);
      }
      const notesMatch = block.match(/SPEAKER\s+NOTES\s*:\s*([\s\S]*?)$/im);
      if (notesMatch) {
        speakerNotes = notesMatch[1].trim();
      }
      slides.push({ slideNumber, title, bullets, speakerNotes });
    }
    if (slides.length === 0) {
      slides.push({
        slideNumber: 1,
        title: 'Presentation',
        bullets: [raw],
        speakerNotes: '',
      });
    }
    return { slides };
  },
};

const adBriefConfig: ChannelConfig = {
  id: 'ad_brief',
  label: 'Ad Brief',
  mode: 'broadcast',
  maxOutputTokens: 1200,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Ad Brief for ${companyName}
Structure:
OBJECTIVE: One sentence describing what the ad should accomplish.
TARGET AUDIENCE: Who sees this ad (role, seniority, industry).
KEY MESSAGE: The single most important takeaway (one sentence).
HEADLINE OPTIONS:
- [option 1]
- [option 2]
- [option 3]
BODY COPY: 2–3 sentences of ad body text.
CTA: The call-to-action label and destination.
VISUAL DIRECTION: 1–2 sentences describing imagery/layout suggestions.
Output plain text with the section markers above.`,
  buildUserPrompt: () =>
    'Generate the ad brief. Output ONLY the structured sections — no other text.',
  parseOutput: (raw) => {
    const body = raw.trim();
    return { body };
  },
};

const demoScriptConfig: ChannelConfig = {
  id: 'demo_script',
  label: 'Demo Script',
  mode: 'broadcast',
  maxOutputTokens: 2500,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Demo Script for ${companyName}
Structure each section as:

SECTION [N]: [Title] ([estimated minutes])
TALK TRACK: What the presenter says (2–4 sentences, conversational).
DEMO ACTION: What to show on screen (1–2 sentences).
KEY POINT: The one takeaway from this section.

Suggested structure:
Section 1: Hook — why this matters to them (1 min)
Section 2: Their world — current pain/workflow (2 min)
Section 3: Live product walkthrough — show the core value (5 min)
Section 4: Results/proof — metrics or case study (2 min)
Section 5: Next steps — clear ask (1 min)

Output plain text with SECTION/TALK TRACK/DEMO ACTION/KEY POINT markers.`,
  buildUserPrompt: () =>
    'Generate the demo script. Output ONLY the SECTION blocks.',
  parseOutput: (raw) => {
    const body = raw.trim();
    return { body };
  },
};

const videoConfig: ChannelConfig = {
  id: 'video',
  label: 'Video Script',
  mode: 'broadcast',
  maxOutputTokens: 2000,
  buildInstruction: (companyName: string) => `
=== OUTPUT FORMAT (STRICT) ===
Channel: Video Script for ${companyName}
Structure:

TITLE: Video title (compelling, under 80 chars).
DURATION: Suggested length (e.g. "90 seconds", "3 minutes").
HOOK (0:00–0:10): Opening line that grabs attention. 1–2 sentences.
PROBLEM (0:10–0:30): Pain point the viewer relates to. 2–3 sentences.
SOLUTION (0:30–1:30): How your product solves it, with specifics. 3–5 sentences.
PROOF (1:30–2:00): Quick stat, quote, or case study reference. 1–2 sentences.
CTA (2:00–2:15): What the viewer should do next. 1 sentence.
VISUAL NOTES: Brief notes on what should be shown on screen at each section.

Output plain text with the section markers above.`,
  buildUserPrompt: () =>
    'Generate the video script. Output ONLY the structured sections.',
  parseOutput: (raw) => {
    const body = raw.trim();
    return { body };
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

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
};

export function getChannelConfig(channel: string): ChannelConfig {
  const config = CHANNEL_CONFIGS[channel as ChannelId];
  if (!config) return emailConfig;
  return config;
}

export function isOneToOneChannel(channel: string): boolean {
  return getChannelConfig(channel).mode === 'one_to_one';
}

/**
 * Maps play content types (email, linkedin, etc.) to the closest ChannelId.
 */
export function playContentTypeToChannel(
  contentType: string,
): ChannelId {
  const map: Record<string, ChannelId> = {
    email: 'email',
    linkedin: 'linkedin_inmail',
    linkedin_inmail: 'linkedin_inmail',
    linkedin_post: 'linkedin_post',
    sms: 'sms',
    slack: 'slack',
    custom_url: 'sales_page',
    talking_points: 'email',
    presentation: 'presentation',
    sales_page: 'sales_page',
    ad_brief: 'ad_brief',
    demo_script: 'demo_script',
    video: 'video',
  };
  return map[contentType] ?? 'email';
}

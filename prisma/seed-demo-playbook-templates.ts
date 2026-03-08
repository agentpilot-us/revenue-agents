/**
 * Seed 5 built-in PlaybookTemplates for the NVIDIA/GM demo account.
 *
 * Designed for demo-techinfra@agentpilot.us (or any userId passed in).
 * Idempotent: checks by name before creating — safe to re-run.
 *
 * Run:
 *   npx dotenv -e .env.local -- tsx prisma/seed-demo-playbook-templates.ts
 *
 * Or import seedDemoPlaybookTemplates(userId) from another seed.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const DEMO_EMAIL = process.env.DEMO_GM_EMAIL ?? 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL env var is required');
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions
// ─────────────────────────────────────────────────────────────────────────────

type StepDefD = {
  order: number; dayOffset: number; label: string; name: string;
  description: string; playId: string; assetTypes: string[];
  channel: string; promptHint: string; assignedRole: string;
  requiresApproval?: boolean; phase?: string; targetPersona?: string;
};

function derivePhase(step: StepDefD): string {
  if (step.phase) return step.phase;
  if (step.dayOffset <= 0 && step.channel === 'internal') return 'signal';
  if (step.dayOffset <= 0 && step.channel === 'crm') return 'signal';
  if (step.dayOffset <= 1) return 'prep';
  if (step.dayOffset <= 3) return 'activate';
  if (step.dayOffset <= 14) return 'engage';
  if (step.dayOffset <= 28) return 'convert';
  return 'advocacy';
}

const TEMPLATES = [
  // ── 1. New Executive Introduction ─────────────────────────────────────────
  {
    name: 'New Executive Introduction',
    description:
      'Find or add the new executive, send a personalised intro email to set up a meeting, connect on LinkedIn, and follow up.',
    triggerType: 'new_exec_intro',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Find or Add Contact',
        name: 'Look Up New Executive',
        description: 'Find the new executive in contacts or add them with enriched email, phone, and LinkedIn URL.',
        playId: 'new_exec_intro',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Contact discovery step. Look up this executive in the existing contact database. If not found, use the signal details (name, title, company) to find their professional email, phone number, and LinkedIn profile URL through enrichment. Summarise what was found: full name, title, division, email, phone, LinkedIn URL, and brief background (recent posts, press mentions). Flag if any contact info is missing.',
        phase: 'signal',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 0,
        label: 'Intro Email',
        name: 'Send Congratulations Email & Meeting Request',
        description: 'Congratulate on the new role, reference what your company is doing in the account, and ask for a 15-minute intro call.',
        playId: 'new_exec_intro',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'First-touch intro email to a newly hired executive. Open with a genuine congrats on their new role — reference something specific from the signal (e.g., their previous company or the role they\'re filling). Briefly mention how your company is already working with this account and their division. Close with a low-pressure ask for a 15-minute intro call. Under 120 words. Subject line must feel personal, not like a blast.',
        phase: 'activate',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 3,
        dayOffset: 1,
        label: 'LinkedIn InMail',
        name: 'Send LinkedIn InMail',
        description: 'Send a LinkedIn InMail with a different angle than the email — reference a shared interest, event, or industry trend.',
        playId: 'new_exec_intro',
        assetTypes: ['linkedin_inmail'],
        channel: 'linkedin',
        promptHint:
          'LinkedIn InMail to the same executive. Different angle from the email — reference a mutual interest, a recent post they made, a shared conference, or an industry initiative. Mention a specific reason to connect (upcoming event, relevant case study, shared contact). Under 100 words. Warm and conversational, not a sales pitch. Do not repeat the email content.',
        phase: 'activate',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 4,
        dayOffset: 1,
        label: 'Connect on LinkedIn',
        name: 'Send LinkedIn Connection Request',
        description: 'Send a connection request with a short personalised note.',
        playId: 'new_exec_intro',
        assetTypes: ['linkedin'],
        channel: 'linkedin',
        promptHint:
          'LinkedIn connection request note. Keep it under 200 characters. Reference one thing specific to them — their new role, their previous company, or an industry topic. No selling. Just a human reason to connect.',
        phase: 'activate',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 5,
        dayOffset: 3,
        label: 'Follow-Up Email',
        name: 'Follow-Up If No Response',
        description: 'If no response after 3 days, send a follow-up email with a fresh angle — new signal, event, or case study.',
        playId: 'new_exec_intro',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Follow-up email if no response after 3 days. Do NOT open with "just following up" or "checking in." Reference a new development, upcoming event, or relevant case study as a fresh reason to connect. Tie it back to their division and your company\'s value. Under 80 words. End with a clear ask (e.g., "Would a 15-minute call this week work?"). Subject line should feel like a new thread, not a chase.',
        phase: 'engage',
        assignedRole: 'ae',
        requiresApproval: false,
      },
    ],
  },

  // ── 2. Event Invite ────────────────────────────────────────────────────────
  {
    name: 'Event Invite',
    description:
      'End-to-end event invitation workflow: match sessions to divisions, generate personalised invite email + event sales page, phone outreach, send, and schedule follow-up to drive registration.',
    triggerType: 'event',
    steps: [
      {
        order: 1,
        dayOffset: -21,
        label: 'Match Sessions to Division',
        name: 'Match Event Sessions to Division',
        description: 'Internal prep — map event sessions, speakers, and demos to this contact\'s division priorities and use cases.',
        playId: 'event_invite',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Internal session-matching step. Review the event agenda (sessions, speakers, demos, topics) and map each to this contact\'s division and role. Produce a ranked list: (1) "Must-attend" sessions — directly relevant to their division\'s current initiatives and NVIDIA products they use or evaluate; (2) "Worth attending" — adjacent topics that expand their understanding; (3) Networking opportunities — speakers or attendees from similar companies/roles. Include a one-line rationale for each recommendation. Also note the event date, location, and registration URL. This is internal prep for outreach.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: -14,
        label: 'Personalised Invite Email',
        name: 'Generate Personalised Invite Email',
        description: 'Event invite email with a division-specific agenda highlighting the most relevant sessions.',
        playId: 'event_invite',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Personalised event invite email. Structure: (1) Open with "I thought of you specifically because…" — reference their division\'s current initiative or challenge; (2) Highlight 2-3 sessions/demos directly relevant to their role (use the session-matching prep); (3) Include a personalised mini-agenda: "Here\'s what I\'d recommend for your team: [Session A] on [topic], [Demo B] featuring [product]"; (4) Include event name, date, location, and registration link; (5) Close with a personal CTA — offer to walk them through the agenda or reserve a seat. Under 180 words. Must NOT feel like a mass invite.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 3,
        dayOffset: -14,
        label: 'Event Sales Page',
        name: 'Generate Division-Specific Event Page',
        description: 'Create a personalised event landing page / sales page tailored to this division with relevant sessions, products, and case studies.',
        playId: 'event_invite',
        assetTypes: ['presentation'],
        channel: 'task',
        promptHint:
          'Generate a personalised event sales page for this contact\'s division. Sections: (1) Hero — event name, date, location with a division-specific hook ("Why [Division] leaders attend"); (2) Recommended sessions — 3-5 sessions mapped to their use cases with brief descriptions; (3) Product showcase — NVIDIA products/demos relevant to their division on display at the event; (4) Customer proof — case studies or success stories from similar companies/divisions; (5) CTA — register now with the event URL. Use division context, product knowledge, and case studies. This page can be shared as a link in the invite email.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 4,
        dayOffset: -12,
        label: 'Call Script',
        name: 'Generate Call Script for Event Invite',
        description: 'Phone outreach script to personally invite the contact and walk them through the most relevant sessions.',
        playId: 'event_invite',
        assetTypes: ['talking_points'],
        channel: 'call',
        promptHint:
          'Phone call script to personally invite this contact to the event. Structure: (1) Opening — "I wanted to personally invite you to [event] because…"; (2) Value hook — 1-2 sessions specifically relevant to their division\'s priorities; (3) Social proof — "Several [similar role] leaders from [similar companies] will be there"; (4) Ask — "Can I reserve a spot for you? I can also send over a personalised agenda for your team"; (5) If voicemail — 20-second version with event name, date, and one compelling session. Under 150 words. Enthusiastic but not pushy.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: -10,
        label: 'Send & Track RSVP',
        name: 'Send Invites and Track RSVP',
        description: 'Confirm email was sent, share the sales page link, and track RSVP status.',
        playId: 'event_invite',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Send tracking step. Confirm: (1) Invite email was sent; (2) Sales page link was included or shared separately; (3) Phone call was attempted. Log RSVP status. If no response after 3 days, generate a one-line follow-up nudge: acknowledge they\'re busy, restate the single most relevant session, and offer to send a calendar invite directly. Under 40 words.',
        assignedRole: 'ae',
      },
      {
        order: 6,
        dayOffset: -5,
        label: 'Follow-Up to Drive Registration',
        name: 'Generate Follow-Up Email',
        description: 'Follow-up email if no RSVP — drive urgency with limited spots, new speaker announcements, or peer attendance.',
        playId: 'event_invite',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Follow-up email to drive event registration if no RSVP yet. Do NOT just re-send the invite. Create urgency with one of: (1) a new speaker or session announcement relevant to their division; (2) "Several of your peers at [similar companies] have registered"; (3) limited spots remaining for a specific demo or workshop. Include the sales page link again. End with a direct ask: "Can I add you to the list?" Under 100 words. Subject line should feel like new information, not a reminder.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
    ],
  },

  // ── 3. Signal Response ─────────────────────────────────────────────────────
  {
    name: 'Signal Response',
    description:
      'Respond quickly to a breaking account signal — prep briefing, outreach email, and best-channel send.',
    triggerType: 'signal',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Prep Me Briefing',
        name: 'Generate Talking Points (Prep Me Briefing)',
        description: 'Internal briefing — what the signal means, how it affects the deal, and what to say.',
        playId: 're_engagement',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Prep Me briefing for the AE about this specific signal. Structure it as: (1) What happened — plain English summary of the signal; (2) Why it matters for this deal — how it affects GM\'s priorities or creates urgency for NVIDIA; (3) What to say — 2-3 specific talking points the AE can use today; (4) What NOT to do — any landmines or sensitivities given this signal. 200 words max.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 0,
        label: 'Signal Response Email',
        name: 'Generate Email Referencing the Signal',
        description: 'Timely outreach email that references the signal as a reason to connect now.',
        playId: 'new_buying_group',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Outreach email using the account signal as the hook. Open with the signal — "I saw that GM just announced…" or "Given the recent news about your [initiative]…" — and connect it to how NVIDIA can help right now. This is a reason-to-engage email, not a cold intro. Assume some prior relationship or awareness. Under 100 words. Clear CTA: 15-minute call this week.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 3,
        dayOffset: 1,
        label: 'Best Channel Send',
        name: 'Send on Best Channel',
        description: 'Manual decision step — confirm email was sent or route to LinkedIn/phone based on contact preferences.',
        playId: 're_engagement',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Channel routing step. Generate a LinkedIn message version of the same signal-triggered outreach (under 80 words) and a phone call opener (2 sentences) in case the contact is more reachable by phone. The AE picks the best channel. If switching to LinkedIn, note it as a touchpoint.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 4. Re-Engagement ──────────────────────────────────────────────────────
  {
    name: 'Re-Engagement',
    description:
      'Warm up a dormant GM contact with a value-first sequence — new case study or value prop, LinkedIn touch, and a meeting request.',
    triggerType: 're_engagement',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Value Prop Email',
        name: 'Generate "Checking In" Email with New Value Prop or Case Study',
        description: 'Re-engagement email that leads with something new and valuable — not a generic check-in.',
        playId: 're_engagement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Re-engagement email for a dormant GM contact. Do NOT open with "just checking in" or "hope you\'re well." Lead with something specific and new: a relevant NVIDIA case study from automotive or manufacturing, a recent product capability that maps to their division\'s use case, or a GM-specific signal that creates urgency. Under 120 words. One clear CTA.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 2,
        dayOffset: 3,
        label: 'LinkedIn Touch',
        name: 'Generate LinkedIn Touch',
        description: 'Parallel LinkedIn message — shorter and more personal than the email.',
        playId: 'champion_enablement',
        assetTypes: ['linkedin'],
        channel: 'linkedin',
        promptHint:
          'LinkedIn re-engagement message for the same dormant contact. Shorter and more human than the email — reference something specific to them (a post they made, a role change, a GM announcement from their division). Under 80 words. Ends with a soft ask: "Would love to reconnect — even a 10-minute catch-up would be great."',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 3,
        dayOffset: 5,
        label: 'Meeting Request',
        name: 'Set Meeting Request',
        description: 'Follow-up meeting request if no response to email or LinkedIn — direct and easy to say yes to.',
        playId: 're_engagement',
        assetTypes: ['email'],
        channel: 'meeting',
        promptHint:
          'Meeting request follow-up. If no response to the prior email and LinkedIn touch after 5 days, generate a short follow-up (under 60 words) that: (1) acknowledges they\'re busy, (2) offers one very specific reason to meet now (new capability, upcoming event, or signal), and (3) proposes two specific 30-minute slots. Tone: confident and direct, not apologetic.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
    ],
  },

  // ── 5. Feature / Product Announcement ────────────────────────────────────
  {
    name: 'Feature / Product Announcement',
    description:
      'Share a new NVIDIA capability or product release with GM contacts — personalised to their division\'s use case.',
    triggerType: 'feature_release',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Announcement Email',
        name: 'Generate Announcement Email Personalized to Division Use Case',
        description: 'Feature announcement email that connects the release to the contact\'s specific division use case.',
        playId: 'feature_release',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Feature/product announcement email. Do NOT just describe what the feature does — lead with what it means for THIS contact\'s specific division. For example: "Your ADAS team can now simulate [X] 3x faster using the new [feature]." Then briefly explain the capability and include a link or offer a demo. Under 150 words. Tone: excited but substantive — AEs who know their stuff, not marketing fluff.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'LinkedIn Post Draft',
        name: 'Generate LinkedIn Post Draft for AE\'s Feed',
        description: 'LinkedIn post draft the AE can publish on their own feed to amplify the announcement.',
        playId: 'feature_release',
        assetTypes: ['linkedin'],
        channel: 'linkedin',
        promptHint:
          'LinkedIn post for the AE\'s personal feed about this NVIDIA feature/product announcement. Written in first person as the AE. Lead with a personal take or observation — "I\'ve been talking to a lot of automotive teams about [problem], and this new capability is going to change how they…" Reference a real use case from automotive or manufacturing. Include a call to action (tag someone, comment with a question, or follow for more). 100-150 words. No hashtag spam — max 3 relevant hashtags.',
        assignedRole: 'ae',
        requiresApproval: true,
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Track Engagement',
        name: 'Track Engagement',
        description: 'Manual step — note opens, replies, or LinkedIn reactions and decide on follow-up.',
        playId: 'feature_release',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Engagement tracking step. Generate a brief follow-up script for contacts who opened the email or reacted to the LinkedIn post but haven\'t replied: a one-sentence response to their reaction that opens a conversation, plus a suggested next step (quick call, demo, or forwarding the release to their team). Under 60 words total.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 6. Engagement Follow-Up ───────────────────────────────────────────────
  {
    name: 'Engagement Follow-Up',
    description:
      'Respond to high-value engagement signals (page visits, CTA clicks, form submissions, chat conversations) with timely, personalised follow-up.',
    triggerType: 'engagement_followup',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Engagement Brief',
        name: 'Summarize Engagement Context',
        description: 'Internal prep — summarize what the visitor engaged with and build a follow-up strategy.',
        playId: 're_engagement',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Internal prep step. Summarize this visitor\'s engagement: what page they visited, how long they spent, what content they viewed, whether they clicked CTAs or submitted forms, and any chat messages. Cross-reference with their contact record if available. Recommend the best follow-up approach (email, LinkedIn, phone) and timing. Include 2-3 personalised hooks based on the content they engaged with.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 2,
        dayOffset: 0,
        label: 'Follow-Up Email',
        name: 'Generate Personalised Follow-Up Email',
        description: 'Personalised email referencing the specific content they engaged with.',
        playId: 're_engagement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Follow-up email to a visitor who just engaged with our content. Reference the specific page or content they viewed. Don\'t say "I noticed you visited our page" — instead, lead with value: share an insight, a relevant case study, or a data point related to what they were looking at. Include a soft CTA (reply, book a call, or "happy to walk you through this"). Keep it under 150 words, warm but professional.',
        assignedRole: 'ae',
        requiresApproval: true,
      },
      {
        order: 3,
        dayOffset: 1,
        label: 'LinkedIn Touch',
        name: 'Generate LinkedIn Message',
        description: 'Shorter LinkedIn message as a second touch if no email reply.',
        playId: 're_engagement',
        assetTypes: ['linkedin'],
        channel: 'linkedin',
        promptHint:
          'Short LinkedIn message (50-80 words) as a follow-up to the email. Don\'t duplicate the email — reference a different angle or share a quick insight. Mention something specific about their company or role. End with a question, not a pitch.',
        assignedRole: 'ae',
        requiresApproval: true,
      },
    ],
  },

  // ── 7. Meeting Prep ──────────────────────────────────────────────────────
  {
    name: 'Meeting Prep',
    description:
      'Comprehensive preparation workflow triggered 24 hours before a scheduled meeting or event. Generates a contact brief, talking points, discovery questions, and a follow-up email template.',
    triggerType: 'meeting_prep',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Contact & Account Brief',
        name: 'Generate Meeting Brief',
        description: 'Comprehensive brief on the contact, their division, and recent account activity.',
        playId: 'new_buying_group',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Pre-meeting brief. Cover: (1) Contact background — role, tenure, likely priorities, recent LinkedIn activity. (2) Division context — what NVIDIA products are active/opportunity, use cases, objections. (3) Account signals — any recent news, earnings, hires, or product announcements. (4) Relationship history — past emails, meetings, content shared. (5) Competitive landscape — any incumbent products to be aware of. Format as a scannable one-pager the AE can review in 5 minutes.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 2,
        dayOffset: 0,
        label: 'Talking Points',
        name: 'Generate Talking Points & Questions',
        description: 'Tailored talking points and discovery questions for the meeting.',
        playId: 'new_buying_group',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Generate two sections: (1) TALKING POINTS — 5-7 key points to cover in the meeting, each with a one-sentence rationale. Prioritise by importance. Include product-specific talking points relevant to their division. (2) DISCOVERY QUESTIONS — 5-7 open-ended questions to uncover pain points, budget, timeline, and decision process. Tailor questions to their seniority level and role. Avoid generic questions — make them specific to this account and what we know about their initiatives.',
        assignedRole: 'ae',
        requiresApproval: false,
      },
      {
        order: 3,
        dayOffset: 0,
        label: 'Follow-Up Template',
        name: 'Draft Post-Meeting Follow-Up',
        description: 'Email template to customise and send after the meeting.',
        playId: 're_engagement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Post-meeting follow-up email template. Structure: (1) Thank them for their time and reference a specific topic discussed (placeholder: [TOPIC]). (2) Summarise key takeaways and agreed next steps (placeholder: [NEXT_STEPS]). (3) Attach or link to any promised materials (placeholder: [MATERIALS]). (4) Propose a specific next meeting date/time. Keep it under 200 words. Professional but warm. The AE will customise the placeholders after the meeting.',
        assignedRole: 'ae',
        requiresApproval: true,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function — callable from other scripts
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDemoPlaybookTemplates(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const created: string[] = [];
  const updated: string[] = [];

  for (const tmpl of TEMPLATES) {
    const exists = await prisma.playbookTemplate.findFirst({
      where: { userId, name: tmpl.name },
      select: { id: true },
    });

    if (exists) {
      // Delete old steps and re-create with updated definitions
      await prisma.playbookTemplateStep.deleteMany({
        where: { templateId: exists.id },
      });

      await prisma.playbookTemplate.update({
        where: { id: exists.id },
        data: {
          description: tmpl.description,
          triggerType: tmpl.triggerType,
          steps: {
            create: tmpl.steps.map((step: StepDefD) => ({
              order: step.order,
              dayOffset: step.dayOffset,
              label: step.label,
              name: step.name,
              description: step.description,
              playId: step.playId,
              assetTypes: step.assetTypes,
              channel: step.channel,
              promptHint: step.promptHint,
              assignedRole: step.assignedRole,
              phase: derivePhase(step),
              targetPersona: step.targetPersona ?? null,
              requiresApproval: step.requiresApproval ?? false,
            })),
          },
        },
      });

      updated.push(tmpl.name);
      continue;
    }

    await prisma.playbookTemplate.create({
      data: {
        userId,
        name: tmpl.name,
        description: tmpl.description,
        triggerType: tmpl.triggerType,
        isBuiltIn: true,
        isDefault: false,
        steps: {
          create: tmpl.steps.map((step: StepDefD) => ({
            order: step.order,
            dayOffset: step.dayOffset,
            label: step.label,
            name: step.name,
            description: step.description,
            playId: step.playId,
            assetTypes: step.assetTypes,
            channel: step.channel,
            promptHint: step.promptHint,
            assignedRole: step.assignedRole,
            phase: derivePhase(step),
            targetPersona: step.targetPersona ?? null,
            requiresApproval: step.requiresApproval ?? false,
          })),
        },
      },
    });

    created.push(tmpl.name);
  }

  if (created.length) {
    console.log(`Created ${created.length} playbook templates:`);
    created.forEach((n) => console.log(`   + ${n}`));
  }
  if (updated.length) {
    console.log(`Updated ${updated.length} playbook templates:`);
    updated.forEach((n) => console.log(`   ~ ${n}`));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct execution
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const prismaClient = createPrisma();

  try {
    const user = await prismaClient.user.findFirst({
      where: { email: DEMO_EMAIL },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error(
        `User ${DEMO_EMAIL} not found. Run the main NVIDIA/GM seed first.`,
      );
    }

    console.log(`Seeding demo playbook templates for ${user.email} …`);
    await seedDemoPlaybookTemplates(prismaClient, user.id);
  } finally {
    await prismaClient.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

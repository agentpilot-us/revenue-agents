/**
 * seed-playbook-templates.ts
 *
 * Seeds three default PlaybookTemplate records for a given userId.
 * Run after the main seed or call from setup wizard.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx prisma/seed-playbook-templates.ts
 *
 * Or call seedDefaultPlaybookTemplates(userId) from your app seed.
 */

import { prisma } from '@/lib/db';

export async function seedDefaultPlaybookTemplates(userId: string) {
  const existing = await prisma.playbookTemplate.count({ where: { userId } });
  if (existing > 0) {
    console.log(`User ${userId} already has ${existing} templates — skipping.`);
    return;
  }

  // ── Template 1: 90-Day Renewal ────────────────────────────────────────────
  const renewal = await prisma.playbookTemplate.create({
    data: {
      userId,
      name: '90-Day Renewal',
      description:
        'Structured renewal campaign starting 90 days out. Builds executive relationship, demonstrates ROI, then closes commercial conversation.',
      triggerType: 'renewal',
      isBuiltIn: true,
      isDefault: true,
      steps: {
        create: [
          {
            order: 1,
            dayOffset: -90,
            label: 'Health Check & Kickoff',
            name: 'Health Check & Kickoff',
            description:
              'Internal step — review account health before outreach starts.',
            playId: 're_engagement',
            assetTypes: ['talking_points'],
            channel: 'internal',
            promptHint:
              'This is an internal prep step 90 days before renewal. Generate talking points for the rep to review: account health signals, open issues, expansion opportunities, and renewal risk factors. No outreach content needed.',
            assignedRole: 'csm',
          },
          {
            order: 2,
            dayOffset: -50,
            label: 'Executive Dinner Invite',
            name: 'Executive Dinner Invite',
            description:
              'Warm relationship touchpoint — invite economic buyer to a small executive dinner or roundtable.',
            playId: 'event_invite',
            assetTypes: ['email', 'linkedin'],
            channel: 'email',
            promptHint:
              'This is a warm executive dinner invite 50 days before renewal. Tone should be relationship-first, not commercial. Reference the value they have gotten. The invite is to a small executive dinner or roundtable — not a vendor event. Subject line should feel personal, not like a mass blast.',
            assignedRole: 'ae',
            requiresApproval: false,
          },
          {
            order: 3,
            dayOffset: -30,
            label: 'Product Roadmap Share',
            name: 'Product Roadmap Share',
            description:
              'Share upcoming roadmap items most relevant to this account. Position as insider preview.',
            playId: 'champion_enablement',
            assetTypes: ['email', 'talking_points'],
            channel: 'email',
            promptHint:
              'This step is sharing the product roadmap 30 days before renewal. Frame it as an insider preview — "here is what is coming that is relevant to what you are trying to do." The champion should be able to forward this to their exec team as evidence of continued investment. Not a features list — connect roadmap items to their specific initiatives.',
            assignedRole: 'ae',
          },
          {
            order: 4,
            dayOffset: -14,
            label: 'ROI & Business Review',
            name: 'ROI & Business Review',
            description:
              'Quantified value delivered. Data-backed case for renewal and expansion.',
            playId: 're_engagement',
            assetTypes: ['email', 'talking_points'],
            channel: 'email',
            promptHint:
              'This is the business review 14 days before renewal. Lead with quantified value delivered — time saved, revenue impact, cost reduction. If specific metrics are not available, use industry benchmarks and ask the rep to fill in account-specific numbers. The talking points should prepare the rep for the commercial conversation: expected objections, negotiation range, expansion ask.',
            assignedRole: 'ae',
            requiresApproval: true,
          },
          {
            order: 5,
            dayOffset: -7,
            label: 'Commercial Conversation',
            name: 'Commercial Conversation',
            description:
              'Final touchpoint before renewal. Close or escalate.',
            playId: 're_engagement',
            assetTypes: ['email', 'talking_points'],
            channel: 'call',
            promptHint:
              'This is the final outreach 7 days before renewal. Tone: confident and direct. The email should confirm the renewal conversation and make it easy to say yes — not another value pitch. The talking points are for the actual renewal call: how to open, how to handle price objections, when to escalate to manager, how to close.',
            assignedRole: 'ae',
            requiresApproval: false,
          },
        ],
      },
    },
  });

  // ── Template 2: New Logo Pursuit ──────────────────────────────────────────
  const newLogo = await prisma.playbookTemplate.create({
    data: {
      userId,
      name: 'New Logo — 60-Day Pursuit',
      description:
        'Structured new business campaign. Multi-threaded buying group approach with signal-based triggers.',
      triggerType: 'new_logo',
      isBuiltIn: true,
      isDefault: true,
      steps: {
        create: [
          {
            order: 1,
            dayOffset: 0,
            label: 'Open RevOps Buying Group',
            name: 'Open RevOps Buying Group',
            description:
              'First outreach — economic buyer and champion in primary buying group.',
            playId: 'new_buying_group',
            assetTypes: ['email', 'linkedin', 'talking_points'],
            channel: 'email',
            promptHint:
              'This is day-one outreach to a new account. Generate a cold intro email, LinkedIn connection request, and talking points for the first discovery call. The email should lead with a specific pain point for this buying group — not a company overview. The LinkedIn message should be under 200 characters. Talking points should include the 3 questions to ask in the first call.',
            assignedRole: 'ae',
          },
          {
            order: 2,
            dayOffset: 7,
            label: 'Multi-Thread IT Buying Group',
            name: 'Multi-Thread IT Buying Group',
            description:
              "Open a second buying group — don't be single-threaded.",
            playId: 'new_buying_group',
            assetTypes: ['email', 'linkedin'],
            channel: 'email',
            promptHint:
              'This is the second thread in the account, targeting the IT or technical buying group. The messaging should be technically focused — reference integration complexity, governance, scale. Different from the economic buyer message. The email should acknowledge that the rep may already be talking to the business team.',
            assignedRole: 'ae',
          },
          {
            order: 3,
            dayOffset: 14,
            label: 'Feature Release Follow-Up',
            name: 'Feature Release Follow-Up',
            description:
              'Share a relevant feature or case study as a reason to re-engage.',
            playId: 'feature_release',
            assetTypes: ['email', 'linkedin'],
            channel: 'email',
            promptHint:
              'This is a follow-up at day 14 using a recent feature release as the hook. The email should feel like a genuine "thought you should see this" — not a second cold email. Reference any specific pain points from the first outreach.',
            assignedRole: 'ae',
          },
          {
            order: 4,
            dayOffset: 30,
            label: 'Champion Enablement',
            name: 'Champion Enablement',
            description:
              'Build internal champion — give them content to share with their executive.',
            playId: 'champion_enablement',
            assetTypes: ['email', 'talking_points'],
            channel: 'email',
            promptHint:
              'By day 30 there should be a champion engaged. This step builds an exec-facing asset the champion can forward internally. The email to the champion should explain what the asset is and why it will help them build internal support. The asset itself should be business-outcomes focused — not a feature list.',
            assignedRole: 'ae',
            requiresApproval: false,
          },
          {
            order: 5,
            dayOffset: 45,
            label: 'Re-Engagement or Breakup',
            name: 'Re-Engagement or Breakup',
            description:
              'If no response after 45 days — re-engage with a news hook or send a breakup email.',
            playId: 're_engagement',
            assetTypes: ['email'],
            channel: 'email',
            promptHint:
              'This is day 45. If no response to prior outreach, generate a re-engagement email with a specific reason to respond now (news signal, new case study, upcoming deadline). Alternatively generate a polite breakup email that leaves the door open. The rep should choose which version to send based on account state.',
            assignedRole: 'ae',
          },
        ],
      },
    },
  });

  // ── Template 3: Event-Based Acceleration ─────────────────────────────────
  const eventAccel = await prisma.playbookTemplate.create({
    data: {
      userId,
      name: 'Event Acceleration',
      description:
        'Use a conference or dinner as an anchor to accelerate a deal. Works for both prospects and customers.',
      triggerType: 'event',
      isBuiltIn: true,
      isDefault: true,
      steps: {
        create: [
          {
            order: 1,
            dayOffset: -21,
            label: 'Event Invite — Economic Buyer',
            name: 'Event Invite — Economic Buyer',
            description:
              'Invite the economic buyer or executive sponsor to the event.',
            playId: 'event_invite',
            assetTypes: ['email', 'linkedin'],
            channel: 'email',
            promptHint:
              'This is an event invite 21 days before the event. Target the economic buyer or executive. The email should explain why this specific event is worth their time — not a generic invite. Reference 2-3 sessions or speakers that are directly relevant to their initiatives. Keep it under 150 words.',
            assignedRole: 'ae',
          },
          {
            order: 2,
            dayOffset: -14,
            label: 'Event Invite — Champion',
            name: 'Event Invite — Champion',
            description: 'Invite the champion and technical evaluator.',
            playId: 'event_invite',
            assetTypes: ['email'],
            channel: 'email',
            promptHint:
              'Invite the technical champion 14 days before the event. Different from the exec invite — focus on hands-on sessions, product deep-dives, and peer networking. The champion should feel like this event will help them succeed in their job, not just be a vendor pitch.',
            assignedRole: 'ae',
          },
          {
            order: 3,
            dayOffset: -3,
            label: 'Pre-Event Talking Points',
            name: 'Pre-Event Talking Points',
            description: 'Prep the rep for conversations at the event.',
            playId: 're_engagement',
            assetTypes: ['talking_points'],
            channel: 'internal',
            promptHint:
              'Internal prep step 3 days before the event. Generate talking points for the rep: conversation openers for each contact attending, key topics to cover at the event, deal-specific questions to ask, what a successful event looks like for this account (outcome: meeting scheduled? demo agreed? exec intro made?).',
            assignedRole: 'ae',
          },
          {
            order: 4,
            dayOffset: 1,
            label: 'Post-Event Follow-Up',
            name: 'Post-Event Follow-Up',
            description:
              'Same-day or next-day follow-up while the event is fresh.',
            playId: 're_engagement',
            assetTypes: ['email', 'linkedin'],
            channel: 'email',
            promptHint:
              'Post-event follow-up sent the day after the event. Reference a specific conversation or session from the event — make it feel personal, not templated. The email should have one clear next step: a call, a demo, an intro to another stakeholder. Keep it under 100 words.',
            assignedRole: 'ae',
          },
          {
            order: 5,
            dayOffset: 7,
            label: 'Deal Acceleration',
            name: 'Deal Acceleration',
            description:
              'Capitalize on event momentum — push for next milestone.',
            playId: 'champion_enablement',
            assetTypes: ['email', 'talking_points'],
            channel: 'call',
            promptHint:
              'One week after the event. Use the momentum from the event to push for the next deal milestone. The email should reference what was discussed and make a specific ask (demo, proposal review, exec intro, POC kickoff). The talking points are for the follow-up call: how to use the event as a reference point, how to advance past any stalls.',
            assignedRole: 'ae',
            requiresApproval: false,
          },
        ],
      },
    },
  });

  console.log('✅ Seeded 3 default playbook templates:');
  console.log(`  - ${renewal.name} (id: ${renewal.id})`);
  console.log(`  - ${newLogo.name} (id: ${newLogo.id})`);
  console.log(`  - ${eventAccel.name} (id: ${eventAccel.id})`);

  return { renewal, newLogo, eventAccel };
}

// Direct execution
async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) throw new Error('No users found — sign in first');
  await seedDefaultPlaybookTemplates(user.id);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

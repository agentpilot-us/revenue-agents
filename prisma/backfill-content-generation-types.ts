/**
 * Backfill ContentTemplate.contentGenerationType by matching name + channel to spec table.
 * Run after migration that adds contentGenerationType, requiresContact, isAutomatable.
 * Usage: npx dotenv -e .env.local -- tsx prisma/backfill-content-generation-types.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

type Rule = {
  channel: string | null;
  namePattern: RegExp | string;
  contentGenerationType: string;
};

const RULES: Rule[] = [
  { channel: 'EMAIL', namePattern: /congratulat/i, contentGenerationType: 'congratulations_email' },
  { channel: 'EMAIL', namePattern: /executive intro|intro email|new stakeholder/i, contentGenerationType: 'executive_intro_email' },
  { channel: 'EMAIL', namePattern: /value prop|value proposition/i, contentGenerationType: 'value_prop_email' },
  { channel: 'EMAIL', namePattern: /roi|assessment/i, contentGenerationType: 'roi_assessment_email' },
  { channel: 'EMAIL', namePattern: /early win|quick win/i, contentGenerationType: 'early_win_email' },
  { channel: 'EMAIL', namePattern: /renewal|renew/i, contentGenerationType: 'renewal_touchpoint_email' },
  { channel: 'EMAIL', namePattern: /competitive|why switch|battle card|displacement/i, contentGenerationType: 'competitive_response_email' },
  { channel: 'EMAIL', namePattern: /follow.?up|followup/i, contentGenerationType: 'follow_up_email' },
  { channel: 'EMAIL', namePattern: /event|invitation|invite|webinar|briefing/i, contentGenerationType: 'event_invitation_email' },
  { channel: 'LINKEDIN', namePattern: /connection|connect/i, contentGenerationType: 'linkedin_connection_note' },
  { channel: 'LINKEDIN', namePattern: /engagement|comment/i, contentGenerationType: 'linkedin_engagement_comment' },
  { channel: 'LINKEDIN', namePattern: /inmail|dm|message/i, contentGenerationType: 'linkedin_inmail' },
  { channel: null, namePattern: /talking points|prep|talk track/i, contentGenerationType: 'meeting_talking_points' },
  { channel: null, namePattern: /agenda/i, contentGenerationType: 'meeting_agenda' },
  { channel: 'INTERNAL', namePattern: /executive brief|briefing|profile/i, contentGenerationType: 'executive_briefing' },
  { channel: 'INTERNAL', namePattern: /research|account brief|scorecard/i, contentGenerationType: 'account_research_brief' },
  { channel: null, namePattern: /contact research|find contact|persona/i, contentGenerationType: 'contact_research' },
  { channel: null, namePattern: /calendar|invite/i, contentGenerationType: 'calendar_invite' },
  { channel: null, namePattern: /phone|call script/i, contentGenerationType: 'phone_call_script' },
];

function matchRule(name: string, channel: string | null): string {
  const normChannel = channel?.toUpperCase() ?? null;
  for (const rule of RULES) {
    const channelOk =
      rule.channel == null || (normChannel && rule.channel === normChannel);
    if (!channelOk) continue;
    const matches =
      typeof rule.namePattern === 'string'
        ? name.toLowerCase().includes(rule.namePattern.toLowerCase())
        : rule.namePattern.test(name);
    if (matches) return rule.contentGenerationType;
  }
  return 'custom_content';
}

async function main() {
  const templates = await prisma.contentTemplate.findMany({
    select: { id: true, name: true, channel: true, contentGenerationType: true },
  });
  let updated = 0;
  for (const t of templates) {
    const current =
      (t as { contentGenerationType?: string }).contentGenerationType;
    if (current && current !== 'custom_content') continue;
    const inferred = matchRule(t.name, t.channel);
    if (inferred === 'custom_content' && current === 'custom_content') continue;
    await prisma.contentTemplate.update({
      where: { id: t.id },
      data: { contentGenerationType: inferred },
    });
    updated++;
    console.log(`  ${t.name} (${t.channel ?? 'n/a'}) → ${inferred}`);
  }
  console.log(`Done. Updated ${updated} of ${templates.length} ContentTemplates.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

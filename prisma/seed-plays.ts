/**
 * Seed the 6 starter PlayTemplates (aggressive play system) with phases and ContentTemplates.
 * Run: npx dotenv -e .env.local -- tsx prisma/seed-plays.ts
 *
 * Requires: at least one User in the DB. Uses the first user by default, or set SEED_USER_ID.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-plays.ts');
  }
  const normalized = normalizeDatabaseUrlForPg(connectionString);
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

const prisma = createPrisma();

async function main() {
  const userId = process.env.SEED_USER_ID ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;
  if (!userId) {
    throw new Error('No user found. Create a user first or set SEED_USER_ID.');
  }
  console.log('Seeding plays for userId:', userId);

  // 1. PlayGovernance (defaults)
  await prisma.playGovernance.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  console.log('PlayGovernance upserted.');

  // 2. Play 1: Contract Renewal
  const contractRenewal = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'contract-renewal' } },
    create: {
      userId,
      name: 'Contract Renewal',
      description: 'T-90 health check, T-30 proposal, T-0 close. Timeline anchored to contract end date.',
      slug: 'contract-renewal',
      scope: 'COMPANY',
      category: 'RENEWAL',
      status: 'ACTIVE',
      triggerType: 'TIMELINE',
      anchorField: 'contractEndDate',
      anchorOffsetDays: -90,
      signalTypes: [],
    },
    update: {},
  });

  const renewalPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: contractRenewal.id, orderIndex: 0 } },
    create: {
      playTemplateId: contractRenewal.id,
      orderIndex: 0,
      name: 'Health Check & EBR',
      description: 'Account health scorecard, EBR deck, renewal proposal email.',
      offsetDays: -90,
      gateType: 'MANUAL',
    },
    update: {},
  });
  const renewalPhase1 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: contractRenewal.id, orderIndex: 1 } },
    create: {
      playTemplateId: contractRenewal.id,
      orderIndex: 1,
      name: 'Negotiate & Close',
      description: 'Negotiation brief, close confirmation email.',
      offsetDays: -30,
      gateType: 'MANUAL',
    },
    update: {},
  });
  const renewalPhase2 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: contractRenewal.id, orderIndex: 2 } },
    create: {
      playTemplateId: contractRenewal.id,
      orderIndex: 2,
      name: 'Post-Close',
      description: 'Next cycle kickoff summary.',
      offsetDays: 0,
      gateType: 'CRM_FIELD',
      gateConfig: { field: 'stage', value: 'Closed Won' },
    },
    update: {},
  });

  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase0.id,
    name: 'Account Health Scorecard',
    contentType: 'BRIEF',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'support_tickets', 'stakeholder_map'],
    promptTemplate: `Generate an account health scorecard for {{account.name}}.
Include: usage trends (last 6 months), open support tickets, stakeholder engagement summary, and outcome tracking vs. original business case. Flag any at-risk indicators.
{{governance.valueNarrative}}`,
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase0.id,
    name: 'Executive Business Review Deck',
    contentType: 'EBR_DECK',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'company_news', 'governance'],
    promptTemplate: `Create an EBR narrative for {{account.name}} covering: 1) ROI delivered vs. original business case; 2) Usage trends and adoption metrics; 3) Strategic alignment with {{account.name}}'s current priorities; 4) Renewal + expansion recommendation. Use approved messaging: {{governance.renewalMessaging}}. Value narrative: {{governance.valueNarrative}}.`,
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase0.id,
    name: 'Renewal Proposal Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'governance', 'stakeholder_map'],
    targetPersona: 'economic_buyer',
    governanceRules: 'Maximum discount: {{governance.maxDiscountPct}}%. Multi-year: {{governance.multiYearDiscountPct}}%. Early renewal: {{governance.earlyRenewalDiscountPct}}% if renewing {{governance.earlyRenewalWindowDays}}+ days before expiry. Do NOT exceed.',
    promptTemplate: 'Draft a renewal proposal email for the economic buyer at {{account.name}}, within governance discount limits.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase1.id,
    name: 'Negotiation Objection Brief',
    contentType: 'BRIEF',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'support_tickets', 'governance'],
    promptTemplate: 'Prepare objection handling brief for {{account.name}} renewal. Address: price, scope reduction, competitor alternatives. BATNA within guardrails. Competitive context: {{governance.competitiveRules}}.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase1.id,
    name: 'Close Confirmation Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'HAIKU',
    targetPersona: 'economic_buyer',
    contextSources: ['crm_opportunity'],
    promptTemplate: 'Short close confirmation email for {{account.name}} renewal.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: renewalPhase2.id,
    name: 'Next Cycle Kickoff Summary',
    contentType: 'INTERNAL_NOTE',
    modelTier: 'HAIKU',
    contextSources: ['crm_opportunity', 'usage_data'],
    promptTemplate: 'Internal summary: renewal closed for {{account.name}}. Next cycle kickoff notes.',
  });
  console.log('Play 1: Contract Renewal (3 phases, 6 content templates).');

  // 3. Play 2: Quarterly Business Value Check-In
  const quarterly = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'quarterly-value-checkin' } },
    create: {
      userId,
      name: 'Quarterly Business Value Check-In',
      description: 'Value snapshot email at 90 days from contract start; recurrence by cron.',
      slug: 'quarterly-value-checkin',
      scope: 'COMPANY',
      category: 'ENGAGEMENT',
      status: 'ACTIVE',
      triggerType: 'TIMELINE',
      anchorField: 'contractStartDate',
      anchorOffsetDays: 90,
      signalTypes: [],
    },
    update: {},
  });
  const quarterlyPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: quarterly.id, orderIndex: 0 } },
    create: {
      playTemplateId: quarterly.id,
      orderIndex: 0,
      name: 'Generate & Send',
      offsetDays: 90,
      gateType: 'CONTENT_SENT',
    },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: quarterlyPhase0.id,
    name: 'Quarterly Value Snapshot Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    contextSources: ['usage_data', 'support_tickets', 'crm_opportunity', 'company_news'],
    targetPersona: 'champion',
    promptTemplate: 'Write a brief (3 paragraph) value check-in email for {{contact.name}} at {{account.name}}. Include: key usage/adoption metrics from last 90 days, business outcomes delivered, one forward-looking recommendation. Tone: {{governance.brandVoice}}. Under 150 words.',
  });
  console.log('Play 2: Quarterly Business Value Check-In.');

  // 4. Play 3: New Product / Feature Launch
  const featureLaunch = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'feature-launch' } },
    create: {
      userId,
      name: 'New Product / Feature Launch',
      description: 'Personalized outreach when product/feature launch signal fires.',
      slug: 'feature-launch',
      scope: 'COMPANY',
      category: 'LAUNCH',
      status: 'ACTIVE',
      triggerType: 'SIGNAL',
      signalTypes: ['product_launch'],
    },
    update: {},
  });
  const launchPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: featureLaunch.id, orderIndex: 0 } },
    create: {
      playTemplateId: featureLaunch.id,
      orderIndex: 0,
      name: 'Personalized Outreach',
      gateType: 'CONTENT_SENT',
    },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: launchPhase0.id,
    name: 'Feature Launch Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'governance'],
    promptTemplate: 'Write a personalized email to {{contact.name}} at {{account.name}} about {{signal.productName}}. Explain why this feature matters to their use case. Use ONLY approved positioning: {{governance.expansionSkus}}. Tone: {{governance.brandVoice}}.',
  });
  console.log('Play 3: New Product / Feature Launch.');

  // 5. Play 4: Executive Intro
  const execIntro = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'executive-intro' } },
    create: {
      userId,
      name: 'Executive Intro / New Stakeholder',
      description: 'Research then personalized intro email. Manual trigger.',
      slug: 'executive-intro',
      scope: 'ACCOUNT',
      category: 'PROSPECTING',
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      signalTypes: [],
    },
    update: {},
  });
  const execPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: execIntro.id, orderIndex: 0 } },
    create: {
      playTemplateId: execIntro.id,
      orderIndex: 0,
      name: 'Research',
      gateType: 'AUTO',
    },
    update: {},
  });
  const execPhase1 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: execIntro.id, orderIndex: 1 } },
    create: {
      playTemplateId: execIntro.id,
      orderIndex: 1,
      name: 'Outreach',
      gateType: 'CONTENT_SENT',
    },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: execPhase0.id,
    name: 'Stakeholder Research Brief',
    contentType: 'BRIEF',
    modelTier: 'SONNET',
    contextSources: ['linkedin', 'company_news', '10k_earnings', 'crm_opportunity'],
    promptTemplate: 'Research {{contact.name}} ({{contact.title}}) at {{account.name}}. Compile: career background, recent public statements, strategic priorities from company filings/news, mutual connections. Identify 2-3 personalized hooks for outreach.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: execPhase1.id,
    name: 'Personalized Executive Intro Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    contextSources: ['linkedin', 'company_news', 'crm_opportunity', 'governance'],
    targetPersona: 'economic_buyer',
    approvedMessaging: '{{governance.valueNarrative}}',
    promptTemplate: 'Draft a personalized executive intro email to {{contact.name}} at {{account.name}}. Use approved value narrative.',
  });
  console.log('Play 4: Executive Intro / New Stakeholder.');

  // 6. Play 5: Competitive Displacement
  const competitive = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'competitive-displacement' } },
    create: {
      userId,
      name: 'Competitive Displacement',
      description: 'Battle card + positioning, then why-switch email. Manual or competitor_detected signal.',
      slug: 'competitive-displacement',
      scope: 'ACCOUNT',
      category: 'COMPETITIVE',
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      signalTypes: ['competitor_detected'],
    },
    update: {},
  });
  const compPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: competitive.id, orderIndex: 0 } },
    create: { playTemplateId: competitive.id, orderIndex: 0, name: 'Intel', gateType: 'AUTO' },
    update: {},
  });
  const compPhase1 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: competitive.id, orderIndex: 1 } },
    create: { playTemplateId: competitive.id, orderIndex: 1, name: 'Outreach', gateType: 'CONTENT_SENT' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: compPhase0.id,
    name: 'Competitive Battle Card',
    contentType: 'BATTLE_CARD',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'company_news', 'governance'],
    governanceRules: '{{governance.competitiveRules}}',
    promptTemplate: 'Generate a competitive battle card for displacing {{account.primaryCompetitor}} at {{account.name}}. Include: competitor weaknesses, our differentiators, landmine questions, proof points. ONLY use approved competitive claims: {{governance.competitiveRules}}.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: compPhase0.id,
    name: 'Account-Specific Competitive Positioning',
    contentType: 'BRIEF',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'company_news'],
    promptTemplate: 'Account-specific competitive positioning brief for {{account.name}}.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: compPhase1.id,
    name: 'Why Switch Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    targetPersona: 'champion',
    governanceRules: '{{governance.competitiveRules}}',
    contextSources: ['crm_opportunity', 'governance'],
    promptTemplate: 'Draft a "why switch" email for the champion at {{account.name}}. Use only approved competitive claims.',
  });
  console.log('Play 5: Competitive Displacement.');

  // 7. Play 6: Expansion / Cross-Sell
  const expansion = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'expansion-cross-sell' } },
    create: {
      userId,
      name: 'Expansion / Cross-Sell',
      description: 'Build the case (proposal + champion brief) then expansion intro email.',
      slug: 'expansion-cross-sell',
      scope: 'ACCOUNT',
      category: 'EXPANSION',
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      signalTypes: [],
    },
    update: {},
  });
  const expPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: expansion.id, orderIndex: 0 } },
    create: { playTemplateId: expansion.id, orderIndex: 0, name: 'Build the Case', gateType: 'MANUAL' },
    update: {},
  });
  const expPhase1 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: expansion.id, orderIndex: 1 } },
    create: { playTemplateId: expansion.id, orderIndex: 1, name: 'Outreach', gateType: 'CONTENT_SENT' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: expPhase0.id,
    name: 'Expansion Proposal',
    contentType: 'PROPOSAL',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'governance'],
    promptTemplate: 'Create an expansion proposal for {{account.name}} targeting {{expansion.targetDepartment}} / {{expansion.useCase}}. Tie existing deployment success to the new opportunity. Available SKUs: {{governance.expansionSkus}}. Messaging: {{governance.expansionMessaging}}.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: expPhase0.id,
    name: 'Champion Enablement Brief',
    contentType: 'CHAMPION_ENABLEMENT',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data'],
    promptTemplate: 'Create an internal selling document for {{contact.name}} to advocate expanding to {{expansion.targetDepartment}}. Include: ROI of current deployment, projected value, 3 talking points for leadership.',
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: expPhase1.id,
    name: 'Expansion Intro Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    modelTier: 'SONNET',
    targetPersona: 'economic_buyer',
    contextSources: ['crm_opportunity', 'governance'],
    promptTemplate: 'Draft an expansion intro email to the economic buyer at {{account.name}}.',
  });
  console.log('Play 6: Expansion / Cross-Sell.');

  // 7. Additional play templates (catalog expansion; can grow to 20+)
  const championDev = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'champion-development' } },
    create: {
      userId,
      name: 'Champion Development',
      description: 'Nurture and enable internal champions.',
      slug: 'champion-development',
      scope: 'ACCOUNT',
      category: 'ENGAGEMENT',
      status: 'ACTIVE',
      triggerType: 'SIGNAL',
      signalTypes: ['champion_development'],
    },
    update: {},
  });
  const championPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: championDev.id, orderIndex: 0 } },
    create: { playTemplateId: championDev.id, orderIndex: 0, name: 'Outreach', offsetDays: 0, gateType: 'MANUAL' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: championPhase0.id,
    name: 'Champion Enablement Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    contentGenerationType: 'email',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data'],
    promptTemplate: 'Draft a short email to {{contact.name}} to strengthen champion relationship and share one enablement resource.',
  });

  const reEngage = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 're-engagement' } },
    create: {
      userId,
      name: 'Re-engagement',
      description: 'Re-engage dormant or at-risk accounts.',
      slug: 're-engagement',
      scope: 'COMPANY',
      category: 'ENGAGEMENT',
      status: 'ACTIVE',
      triggerType: 'SIGNAL',
      signalTypes: ['re_engagement'],
    },
    update: {},
  });
  const reEngagePhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: reEngage.id, orderIndex: 0 } },
    create: { playTemplateId: reEngage.id, orderIndex: 0, name: 'Outreach', offsetDays: 0, gateType: 'MANUAL' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: reEngagePhase0.id,
    name: 'Re-engagement Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    contentGenerationType: 'email',
    modelTier: 'SONNET',
    contextSources: ['usage_data', 'crm_opportunity'],
    promptTemplate: 'Write a friendly re-engagement email for {{account.name}} acknowledging time since last touch and offering one clear next step.',
  });

  const newLogo = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'new-logo-intro' } },
    create: {
      userId,
      name: 'New Logo Intro',
      description: 'Welcome and onboard new customers.',
      slug: 'new-logo-intro',
      scope: 'COMPANY',
      category: 'ENGAGEMENT',
      status: 'ACTIVE',
      triggerType: 'SIGNAL',
      signalTypes: ['new_logo'],
    },
    update: {},
  });
  const newLogoPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: newLogo.id, orderIndex: 0 } },
    create: { playTemplateId: newLogo.id, orderIndex: 0, name: 'Welcome', offsetDays: 0, gateType: 'MANUAL' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: newLogoPhase0.id,
    name: 'Welcome Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    contentGenerationType: 'email',
    modelTier: 'HAIKU',
    contextSources: ['crm_opportunity'],
    promptTemplate: 'Draft a concise welcome email for new customer {{account.name}}.',
  });

  const ebrPlay = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'executive-business-review' } },
    create: {
      userId,
      name: 'Executive Business Review',
      description: 'EBR prep and delivery.',
      slug: 'executive-business-review',
      scope: 'COMPANY',
      category: 'ENGAGEMENT',
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      signalTypes: [],
    },
    update: {},
  });
  const ebrPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: ebrPlay.id, orderIndex: 0 } },
    create: { playTemplateId: ebrPlay.id, orderIndex: 0, name: 'Prep & Send', offsetDays: 0, gateType: 'MANUAL' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: ebrPhase0.id,
    name: 'EBR Brief',
    contentType: 'BRIEF',
    contentGenerationType: 'executive_briefing',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data', 'governance'],
    promptTemplate: 'Create an executive business review brief for {{account.name}} with ROI, usage trends, and recommendations.',
  });

  const upsellPlay = await prisma.playTemplate.upsert({
    where: { userId_slug: { userId, slug: 'upsell-motion' } },
    create: {
      userId,
      name: 'Upsell Motion',
      description: 'Targeted upsell to existing accounts.',
      slug: 'upsell-motion',
      scope: 'COMPANY',
      category: 'EXPANSION',
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      signalTypes: [],
    },
    update: {},
  });
  const upsellPhase0 = await prisma.playPhaseTemplate.upsert({
    where: { playTemplateId_orderIndex: { playTemplateId: upsellPlay.id, orderIndex: 0 } },
    create: { playTemplateId: upsellPlay.id, orderIndex: 0, name: 'Outreach', offsetDays: 0, gateType: 'MANUAL' },
    update: {},
  });
  await createContentTemplate(prisma, userId, {
    phaseTemplateId: upsellPhase0.id,
    name: 'Upsell Email',
    contentType: 'EMAIL',
    channel: 'EMAIL',
    contentGenerationType: 'email',
    modelTier: 'SONNET',
    contextSources: ['crm_opportunity', 'usage_data'],
    promptTemplate: 'Draft an upsell email for {{account.name}} highlighting one relevant product or tier.',
  });

  console.log('Plays 7–11: Champion Development, Re-engagement, New Logo Intro, EBR, Upsell.');

  // 8. Optional: seed a few SignalPlayMappings
  const signalTypes = ['exec_hire', 'product_launch', 'competitor_detected'];
  for (const signalType of signalTypes) {
    const play = signalType === 'exec_hire' ? execIntro : signalType === 'product_launch' ? featureLaunch : competitive;
    await prisma.signalPlayMapping.upsert({
      where: {
        userId_signalType_playTemplateId: { userId, signalType, playTemplateId: play.id },
      },
      create: {
        userId,
        signalType,
        playTemplateId: play.id,
        autoActivate: signalType === 'product_launch',
        priority: 'MEDIUM',
      },
      update: {},
    });
  }
  console.log('SignalPlayMappings created (exec_hire → Executive Intro, product_launch → Feature Launch, competitor_detected → Competitive).');

  console.log('Done. 11 plays seeded (expand to 20+ as needed).');
}

async function createContentTemplate(
  prisma: PrismaClient,
  userId: string,
  data: {
    phaseTemplateId: string;
    name: string;
    contentType: string;
    channel?: string;
    modelTier: string;
    contextSources: string[];
    promptTemplate: string;
    targetPersona?: string;
    governanceRules?: string;
    approvedMessaging?: string;
    contentGenerationType?: string;
  }
) {
  const existing = await prisma.contentTemplate.findFirst({
    where: { userId, phaseTemplateId: data.phaseTemplateId, name: data.name },
  });
  if (existing) return;
  const contentGenerationType =
    data.contentGenerationType ??
    (data.channel === 'EMAIL' ? 'email' : data.contentType === 'BRIEF' ? 'executive_briefing' : 'custom_content');
  await prisma.contentTemplate.create({
    data: {
      userId,
      phaseTemplateId: data.phaseTemplateId,
      name: data.name,
      contentType: data.contentType as any,
      channel: (data.channel as any) ?? undefined,
      modelTier: data.modelTier as any,
      contextSources: data.contextSources,
      promptTemplate: data.promptTemplate,
      targetPersona: data.targetPersona ?? undefined,
      governanceRules: data.governanceRules ?? undefined,
      approvedMessaging: data.approvedMessaging ?? undefined,
      contentGenerationType,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

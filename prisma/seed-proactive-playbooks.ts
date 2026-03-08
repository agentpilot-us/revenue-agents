/**
 * Seed 50 proactive-play PlaybookTemplates.
 *
 * Idempotent: checks by name before creating — safe to re-run.
 *
 * Run:
 *   npx dotenv -e .env.local -- tsx prisma/seed-proactive-playbooks.ts
 *
 * Or import seedProactivePlaybooks(prisma, userId) from another seed.
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
// Template definitions — 50 proactive plays across 6 groups
// ─────────────────────────────────────────────────────────────────────────────

type StepDefP = {
  order: number; dayOffset: number; label: string; name: string;
  description: string; playId: string; assetTypes: string[];
  channel: string; promptHint: string; assignedRole: string;
  requiresApproval?: boolean; phase?: string; targetPersona?: string;
};

function derivePhase(step: StepDefP): string {
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
  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 1 — Product & Company (7 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. New Product Release ─────────────────────────────────────────────────
  {
    name: 'New Product Release',
    description:
      'Launch a multi-step campaign around a new product release — target accounts by product fit, offer executive briefings, host a launch webinar, and close with ROI proof points.',
    triggerType: 'product_release',
    priority: 8,
    targetDepartmentTypes: ['ENGINEERING', 'PRODUCT', 'IT', 'OPERATIONS', 'EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail'],
    targetPersonas: ['C-Suite', 'Department heads with budget', 'Current product champions', 'Technical evaluators'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0 },
    expectedOutcome: '15-20% book demo, 5-10% conversion to opportunity, upsell existing customers',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Build Target Account List',
        name: 'Create target account list by product fit',
        description: 'Internal step — segment existing customers for cross-sell, strategic prospects with matching use case, and accounts using a competitor product.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal research step. Build a target account list for this product launch: (1) existing customers with cross-sell potential, (2) strategic prospects whose use case matches the new product, (3) accounts known to use a competitor. For each segment, note why the product is relevant and suggest the best contact to reach. Output a prioritized list with rationale.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Personalized Product Email',
        name: 'Personalized email with product brief',
        description: 'First-touch email tailored to the account\'s specific use case, leading with the product value proposition.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Product launch email personalized to this account. Lead with the specific problem this product solves for THEIR business — not a generic announcement. Include 1-2 bullet points on key capabilities, a link to the product brief, and a CTA to book a demo or briefing. Under 150 words. Subject line should feel personal.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Offer Executive Briefing',
        name: 'Offer executive briefing or demo',
        description: 'Invite key decision-makers to an exclusive executive briefing or personalized demo of the new product.',
        playId: 'new_buying_group', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Executive briefing invitation. Position this as an exclusive first-look for strategic accounts. Reference their specific initiatives and how the new product aligns. Offer a 30-minute briefing with your product leadership. Include both an email version and a shorter LinkedIn message. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Launch Webinar Invitation',
        name: 'Host launch webinar with Q&A',
        description: 'Invite target accounts to a product launch webinar featuring live demo and Q&A with product team.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Webinar invitation for the product launch. Highlight 2-3 sessions or demos most relevant to the recipient\'s role. Include date, time, and registration link placeholder. Emphasize the live Q&A with product leadership as a chance to get direct answers. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'ROI Calculator Follow-Up',
        name: 'Follow up with ROI calculator',
        description: 'Send a personalized ROI calculator showing projected value of the new product for their specific environment.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Follow-up email with ROI calculator. Reference any engagement from the webinar or briefing. Include a personalized ROI estimate based on their company size and industry. Offer to walk through the numbers on a call. Talking points for the call: key ROI drivers, how to handle skepticism on projections, upsell angles. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 2. New Feature Release ─────────────────────────────────────────────────
  {
    name: 'New Feature Release',
    description:
      'Announce a new feature to current customers and win-back targets — segment by relevance, offer early access, and drive adoption with use-case content.',
    triggerType: 'feature_release_proactive',
    priority: 8,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Product users', 'Department heads', 'Technical champions', 'Previous detractors'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: '30-40% feature adoption, win-back 10-15% churned, convert 5-8% previous "no"',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Segment by Feature Relevance',
        name: 'Segment current customers by feature relevance',
        description: 'Internal step — identify customers who requested this feature, those using workarounds, churned accounts, and prospects who previously declined.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal segmentation step. Identify four segments: (1) customers who explicitly requested this feature, (2) customers using workarounds the feature replaces, (3) recently churned accounts where this was a gap, (4) prospects who said no partly due to missing this capability. Prioritize by win-back potential and revenue impact.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: '"Built for You" Message',
        name: 'Send personalized "built for you" message',
        description: 'Personalized email framing the feature as directly inspired by their feedback or use case.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Feature release email framed as "we built this for you." Reference their specific feedback, workaround, or pain point that this feature addresses. Make it personal — "You mentioned X last quarter, and I wanted you to be the first to know…" Include a link to try it. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Early Access Invitation',
        name: 'Offer early access or beta participation',
        description: 'Invite power users and champions to early access, positioning it as exclusive and influential.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Early access invitation. Emphasize exclusivity — "We\'re giving a small group of our most valued customers first access." Include what they get (early access, direct line to product team, influence on final design). Ask for feedback in return. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Feature Use Cases',
        name: 'Create feature-specific use cases',
        description: 'Share tailored use-case documentation showing exactly how the feature applies to their workflow.',
        playId: 'feature_release', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Use-case email with a specific scenario for the recipient\'s industry and role. Show a before/after: how they do it today vs. with the new feature. Include metrics or estimates. Talking points cover common questions and objections about the feature. Email under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Product Update Calls',
        name: 'Schedule product update calls',
        description: 'Book one-on-one product update calls to walk through the feature and identify expansion opportunities.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Meeting request email. Reference their engagement with the feature (or lack thereof). Offer a 20-minute walkthrough tailored to their environment. Position it as a product update, not a sales call. Propose 2-3 specific time slots. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 3. Beta Program Invitation ─────────────────────────────────────────────
  {
    name: 'Beta Program Invitation',
    description:
      'Recruit power users and strategic accounts into an exclusive beta program — deepen relationships, gather feedback, and create advocates.',
    triggerType: 'beta_invitation',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare'],
    targetPersonas: ['Product power users', 'Technical champions', 'Innovation-focused executives', 'Product managers'],
    timingConfig: { validWindowDays: 56, triggerDaysBefore: 56 },
    expectedOutcome: 'Deepen relationships, generate product feedback, create advocates, 50%+ convert to case study',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Power Users',
        name: 'Identify power users and champions',
        description: 'Internal step — select the top 10-20% most engaged customers and strategic accounts with the specific pain point the beta addresses.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal selection step. Identify candidates for the beta program: top 10-20% by product engagement, strategic accounts with the pain point this beta addresses, and innovation-forward customers. Score each candidate on engagement level, strategic importance, and likelihood to provide quality feedback. Output a ranked shortlist.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Exclusive Beta Invitation',
        name: 'Personalized invitation emphasizing exclusivity',
        description: 'Send a personalized invitation that makes the recipient feel hand-picked for an exclusive opportunity.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Beta invitation email. Emphasize that they were hand-selected — "We chose fewer than 20 customers for this, and your team was at the top of our list." Explain what they get: early access, direct product team access, influence on the final product. Frame it as a partnership, not a favor. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Beta Feedback Loop',
        name: 'Create beta feedback loop',
        description: 'Set up a structured feedback channel — Slack group, weekly check-ins, or feedback form.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Feedback loop setup email. Welcome them to the beta. Explain the feedback process: what channels to use, how often you\'ll check in, what kind of feedback is most valuable. Include a quick-start guide. Talking points for the kickoff call: expectations, timeline, support resources. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Roadmap Influence Offer',
        name: 'Offer influence on roadmap',
        description: 'Deepen engagement by offering beta participants a seat at the roadmap table.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Roadmap influence email. Offer a dedicated session where they can share priorities that will shape the final product. Position as "your input directly influences what we build." Propose a 30-minute roadmap session with your product team. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Case Study Ask',
        name: 'Leverage for case study/testimonial',
        description: 'At the end of beta, ask for a case study or testimonial based on their experience.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Case study request email. Thank them for their beta participation. Reference a specific win or insight from their experience. Ask if they\'d be open to a brief case study or testimonial — position it as showcasing their innovation leadership. Make it low-effort: "We handle the writing, you just approve." Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 4. Product Roadmap Session ─────────────────────────────────────────────
  {
    name: 'Product Roadmap Session',
    description:
      'Host an intimate roadmap session for top-tier accounts — collect feedback, identify expansion opportunities, and build executive relationships.',
    triggerType: 'roadmap_session',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'IT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['C-Suite', 'VP-level product stakeholders', 'Champions', 'Technical decision makers'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: 'Increase retention of at-risk accounts, identify upsell opportunities, generate expansion pipeline, build exec relationships',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Select Top-Tier Accounts',
        name: 'Invite top tier accounts only (top 20% by ARR)',
        description: 'Internal step — curate the invite list from the top 20% of accounts by ARR, including at-risk and expansion candidates.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal curation step. Select accounts for the roadmap session: top 20% by ARR, accounts in expansion conversations, at-risk accounts where executive face time could help, and accounts evaluating competitors. Limit to 15-20 accounts. For each, note the key contact, relationship status, and what you want to learn from them.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Intimate Session Invite',
        name: 'Host intimate virtual or in-person session',
        description: 'Send an exclusive invitation to selected executives for the roadmap session.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Roadmap session invitation. Emphasize intimacy and exclusivity — "We\'re hosting a small group of our most strategic partners for a first look at our product direction." Include date, format (virtual/in-person), and agenda highlights. Make it clear this is a two-way conversation, not a presentation. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Collect Feedback',
        name: 'Collect feedback on priorities',
        description: 'During the session, capture structured feedback on roadmap priorities and pain points.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Facilitator talking points for the roadmap session. Include: (1) Opening framing — why their input matters, (2) Key questions to ask about priorities, (3) How to probe on pain points and unmet needs, (4) How to capture expansion signals without being salesy, (5) Closing — next steps and follow-up commitment. Keep the session collaborative, not transactional.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Identify Expansion Opportunities',
        name: 'Identify expansion opportunities',
        description: 'Internal step — analyze session feedback for expansion signals and at-risk indicators.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Post-session analysis. Review feedback from each attendee and identify: (1) Expansion opportunities — features or capabilities they expressed interest in, (2) At-risk signals — dissatisfaction, competitor mentions, unmet needs, (3) Relationship status — who engaged most, who was disengaged. Create an action plan for each account.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Custom Roadmap Alignment',
        name: 'Follow up with custom roadmap alignment',
        description: 'Send each attendee a personalized follow-up showing how the roadmap aligns with their specific priorities.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Personalized roadmap follow-up email. Reference 2-3 specific priorities they raised during the session. Show which upcoming roadmap items address their needs and approximate timelines. Include a CTA for a deeper 1:1 discussion. Under 150 words. This should feel like a personal response, not a mass follow-up.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 5. Integration Partnership Announcement ────────────────────────────────
  {
    name: 'Integration Partnership Announcement',
    description:
      'Capitalize on a new integration partnership — target dual users, co-host events, and build combined ROI stories.',
    triggerType: 'integration_announcement',
    priority: 5,
    targetDepartmentTypes: ['IT', 'ENGINEERING', 'OPERATIONS', 'PRODUCT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail'],
    targetPersonas: ['Integration owners/admins', 'Department heads using both tools', 'Technical/IT', 'Executive sponsors'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 0 },
    expectedOutcome: '20-30% dual users adopt integration, partner co-selling 10-15% net new, competitive differentiation',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Dual-Platform Accounts',
        name: 'Identify accounts using both platforms',
        description: 'Internal step — find accounts already using both platforms, prospects using the partner, and accounts who previously requested this integration.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal research step. Identify three segments: (1) current customers also using the partner platform, (2) prospects who use the partner and could be co-sold, (3) accounts who explicitly asked for this integration. For each, note which contacts to target and the specific workflow the integration improves.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Joint Use Case Docs',
        name: 'Create joint use case documentation',
        description: 'Develop and share use-case documentation showing the combined value of both platforms.',
        playId: 'feature_release', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Integration announcement email with joint use case. Lead with the combined value — "Now you can [workflow] seamlessly between [our product] and [partner]." Include a specific use case relevant to the recipient\'s role. Attach or link to the joint documentation. Talking points cover common integration questions. Email under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Co-Host Partner Webinar',
        name: 'Co-host webinar with partner',
        description: 'Invite target accounts to a joint webinar with the integration partner showcasing combined workflows.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Joint webinar invitation co-hosted with the integration partner. Highlight 2-3 workflows the integration enables. Include speakers from both companies. Emphasize live demo and Q&A. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Integration Setup Help',
        name: 'Offer integration setup assistance',
        description: 'Offer white-glove assistance to set up the integration, reducing friction to adoption.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Integration setup offer email. Offer free setup assistance — "Our team can have you up and running in 30 minutes." Include what the setup involves, any prerequisites, and a booking link for a setup call. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Combined ROI Story',
        name: 'Build combined ROI story',
        description: 'Share a combined ROI analysis showing the value of using both platforms together.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Combined ROI email. Present a data-driven case for the integration: time saved, error reduction, workflow efficiency gains. Use industry benchmarks or early adopter data. Include a CTA for a deeper ROI discussion. Talking points for the follow-up call: how to quantify the combined value for their specific environment. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 6. Certification/Compliance Achievement ────────────────────────────────
  {
    name: 'Certification/Compliance Achievement',
    description:
      'Leverage a new certification or compliance milestone to unblock stalled enterprise deals and enter regulated verticals.',
    triggerType: 'compliance_achievement',
    priority: 8,
    targetDepartmentTypes: ['IT', 'SECURITY', 'COMPLIANCE', 'LEGAL', 'EXECUTIVE'],
    targetIndustries: ['Financial Services', 'Healthcare', 'Government', 'Insurance', 'Pharmaceuticals'],
    targetPersonas: ['CISOs', 'Compliance officers', 'Legal/risk', 'Procurement', 'IT leadership'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: 'Unblock 30-40% stalled enterprise deals, enter regulated verticals, reduce security review objections by 50%',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Segment by Compliance Need',
        name: 'Segment accounts by compliance requirement',
        description: 'Internal step — identify enterprise prospects blocked by this compliance requirement, regulated industry targets, and accounts in active security review.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal segmentation step. Identify: (1) enterprise deals stalled specifically due to this compliance/certification gap, (2) regulated industry prospects where this was a prerequisite, (3) accounts currently in security review or vendor assessment. Prioritize by deal size and likelihood to unblock. Note the key security/compliance contact for each.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Achievement Announcement',
        name: 'Announce achievement with proof points',
        description: 'Announce the certification with specific proof points and what it means for their security posture.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Compliance achievement announcement email. Lead with what this means for them — "The [certification] you required is now in place." Include the specific certification, what it covers, and a link to the full compliance documentation. Reference their specific requirements if known. Under 120 words. Professional and factual tone — compliance buyers value precision.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Compliance Documentation',
        name: 'Offer compliance documentation package',
        description: 'Provide a comprehensive compliance documentation package they can share with their security team.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Compliance documentation email. Offer a complete package: audit reports, penetration test summaries, data processing agreements, and architecture documentation. Frame it as "everything your security team needs to complete their review." Offer a call with your security team for any questions. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Unblock Stalled Deals',
        name: 'Target previously blocked enterprise deals',
        description: 'Re-engage enterprise deals that were specifically blocked by this compliance gap.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Re-engagement email for previously blocked deals. Reference the specific objection — "When we last spoke, [certification] was the remaining item on your security checklist." Announce it\'s resolved and propose next steps to resume the evaluation. Talking points: how to re-open the conversation, handle lingering concerns, accelerate the review. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Regulated Industry Push',
        name: 'Position for regulated industries',
        description: 'Broader campaign targeting regulated industries where this certification is table stakes.',
        playId: 'new_buying_group', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Outreach email for regulated industry prospects. Position the certification as enabling entry into their sector. Reference similar regulated companies already using the product. Include a LinkedIn message version targeting CISOs and compliance officers. Email under 120 words, LinkedIn under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 7. Price/Packaging Change ──────────────────────────────────────────────
  {
    name: 'Price/Packaging Change',
    description:
      'Manage a pricing or packaging change proactively — grandfather existing customers, announce upgrade paths, and create limited-time incentives to accelerate stalled deals.',
    triggerType: 'pricing_change',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'FINANCE', 'PROCUREMENT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Economic buyers (CFO)', 'Department budget owners', 'Procurement', 'Current champions'],
    timingConfig: { validWindowDays: 60, triggerDaysBefore: 0 },
    expectedOutcome: 'Accelerate 15-20% stalled deals, convert price objections, upsell to higher tiers',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Grandfather Existing Customers',
        name: 'Grandfather existing customers proactively',
        description: 'Reach out to existing customers proactively to lock in their current pricing and build goodwill.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Grandfathering announcement email to existing customers. Lead with good news — "Your current pricing is locked in." Explain the change transparently, why it\'s happening, and what it means for them (nothing changes). Build goodwill by being proactive rather than waiting for them to find out. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'New Options Announcement',
        name: 'Announce new options with upgrade paths',
        description: 'Present new packaging options and upgrade paths that may better fit their growing needs.',
        playId: 'feature_release', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'New packaging announcement. Frame new options as expanding value, not increasing cost. For each option, highlight what the recipient gains. Include a comparison chart or link. Talking points for objection handling: "Why is pricing changing?", "What if I don\'t want to upgrade?", "Can I lock in current pricing?" Email under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Limited-Time Promotion',
        name: 'Create limited-time promotions',
        description: 'Offer time-limited incentives to accelerate deals that have been stuck in procurement.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Limited-time promotion email for stalled deals. Create urgency — "Lock in current pricing before [date]." Reference their specific deal and where it left off. Make it easy: one sentence on the offer, one on the deadline, one on how to act. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Pricing Consultation',
        name: 'Offer pricing consultations',
        description: 'Offer one-on-one pricing consultations for accounts with complex needs or multiple products.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Pricing consultation offer. For accounts with complex needs, offer a dedicated session to find the right package. Frame it as advisory, not sales — "Let\'s make sure you\'re on the plan that gives you the best value for how you use the product." Propose 2-3 time slots. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Value Over Price Positioning',
        name: 'Position value over price',
        description: 'For price-sensitive accounts, share ROI data and customer success stories that justify the investment.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Value justification email. For accounts citing price concerns, lead with ROI data and a relevant case study. Show the cost of NOT using the product (manual processes, risk, opportunity cost). Talking points: how to reframe price conversations, total cost of ownership vs alternatives, business case ammunition for the champion. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 2 — Events & Experiences (9 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 8. Executive Dinner (Intimate 8-12) ────────────────────────────────────
  {
    name: 'Executive Dinner (Intimate 8-12)',
    description:
      'Plan and execute an intimate executive dinner for 8-12 strategic accounts — personalized CEO invitations, strategic seating, and 48-hour follow-up.',
    triggerType: 'exec_dinner_intimate',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['CEO', 'President', 'CRO', 'CTO', 'CFO', 'Board members'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 42 },
    expectedOutcome: '60-70% advance deal stage, $2-5M pipeline per dinner, 3.4x higher pipeline per attendee',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Select Strategic Accounts',
        name: 'Identify 8-12 strategic accounts (mix customers/prospects)',
        description: 'Internal step — curate a list of 8-12 accounts mixing existing customers and strategic prospects.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal selection step. Curate 8-12 accounts for the executive dinner: mix of customers (social proof) and prospects (pipeline). For each, identify the ONE executive to invite (CEO/President level). Consider industry diversity for peer networking value. Note the strategic objective for each account: advance deal, build relationship, retain, expand.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'CEO/Exec Invitation',
        name: 'Personalized invitation from your CEO/exec',
        description: 'Send a highly personalized invitation from your CEO or senior executive to each selected attendee.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Executive dinner invitation from YOUR CEO to THEIR CEO. Ultra-personal tone — first-name basis, reference a specific shared interest or business connection. Make the topic sound compelling but not sales-y (e.g., "The Future of AI in Manufacturing" not "Why You Should Buy Our Product"). Emphasize the intimate format: "just 8-10 leaders." Under 120 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Discussion Topic Planning',
        name: 'Plan discussion topic (not sales pitch)',
        description: 'Prepare the discussion agenda and talking points — focused on industry challenges, not a product pitch.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Discussion planning for the dinner. Create: (1) A compelling discussion theme around industry challenges (NOT product features), (2) 3-5 open-ended questions to drive conversation, (3) Talking points for your exec to weave in your value naturally, (4) How to handle if conversation turns to competitors. The goal is peer-to-peer exchange, not a pitch.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Strategic Seating Map',
        name: 'Seat mapping for strategic conversations',
        description: 'Plan seating arrangements to maximize strategic conversations between your execs and attendees.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Seating strategy. For each attendee, note: (1) Who from your team should sit next to them, (2) Key conversation topics for that pairing, (3) Specific asks or outcomes you want from the conversation, (4) Potential introductions between attendees that add value. Create a seating map optimized for strategic outcomes.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: '48-Hour Follow-Up',
        name: 'Follow-up within 48 hours with next steps',
        description: 'Send a personalized follow-up within 48 hours referencing the specific conversation had at dinner.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-dinner follow-up from your exec. Reference the specific conversation they had — "I really enjoyed our discussion about [topic]." Include one specific next step: intro to someone on your team, a follow-up meeting, sharing a resource mentioned at dinner. Keep it warm and personal. Under 80 words. Must go out within 48 hours.',
        assignedRole: 'ae', requiresApproval: true,
      },
    ],
  },

  // ── 9. Executive Dinner (Larger 15-20) ─────────────────────────────────────
  {
    name: 'Executive Dinner (Larger 15-20)',
    description:
      'Organize a larger executive dinner for 15-20 accounts with customer panelists, structured content, and AE-to-attendee assignments.',
    triggerType: 'exec_dinner_large',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'SALES', 'PRODUCT', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['C-Suite', 'VP-level buyers', 'Buying committee members', 'Customer advocates'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 42 },
    expectedOutcome: '40-50% progress deals forward, $1-3M pipeline, multi-threading into accounts, customer advocacy',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Target 15-20 Accounts',
        name: 'Target 15-20 accounts (broader mix)',
        description: 'Internal step — select a broader mix of accounts including customer speakers and key prospects.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal selection step. Curate 15-20 accounts: mix of customers who can speak to success, prospects in active deals, and expansion targets. Multiple contacts per account OK. Identify 2-3 customer speakers/panelists. For each account, note the objective and who from your team owns the relationship.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Invite with Customer Speakers',
        name: 'Include customer speakers/panelists',
        description: 'Send invitations highlighting the customer speakers and panel discussion format.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Executive dinner invitation highlighting customer speakers. Lead with the panel topic and speaker names/titles. Emphasize peer learning — "Hear how [Customer Company] tackled [challenge]." Include date, location, and RSVP. Multiple contacts per account OK. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Structure Content & Networking',
        name: 'Structure with formal content + networking',
        description: 'Plan the agenda with a balance of structured content and open networking.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Agenda planning. Structure the evening: (1) Welcome and networking (30 min), (2) Customer panel discussion (20 min), (3) Q&A and open discussion (15 min), (4) Dinner and free networking (90 min). Prepare panel questions, moderator talking points, and conversation starters for the networking portions. No hard sell — the content should sell itself.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'AE-to-Attendee Assignments',
        name: 'Assign AEs to specific attendees',
        description: 'Map each AE to specific attendees they should engage with during the dinner.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'AE assignment plan. For each attendee, assign the owning AE and note: (1) Key topics to discuss, (2) Specific questions to ask, (3) What a successful conversation looks like (meeting booked, intro made, deal advanced), (4) Backup conversation topics. Include an overall coverage plan so no attendee is neglected.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Capture & Follow-Up',
        name: 'Capture attendee questions for follow-up',
        description: 'Compile all attendee questions and interests, then send personalized follow-ups.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-dinner follow-up. Reference a specific conversation or question from the dinner. Include a next step tailored to where they are in the process: demo for new prospects, expansion conversation for customers, resource for those who asked a specific question. Under 100 words. Each follow-up should feel unique.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 10. Conference Booth/Sponsorship ───────────────────────────────────────
  {
    name: 'Conference Booth/Sponsorship',
    description:
      'Maximize conference ROI with pre-event outreach 60 days out, booked meetings, VIP hospitality, customer speaking, and 7-day post-event follow-up.',
    triggerType: 'conference_booth',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'IT', 'SALES', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Media'],
    targetPersonas: ['Department heads', 'C-Suite', 'Buying committees', 'Champions', 'Competitive users'],
    timingConfig: { validWindowDays: 67, triggerDaysBefore: 60 },
    expectedOutcome: '40-50 qualified meetings, $3-5M pipeline, 20-30% meetings convert to opportunity',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Pre-Conference Outreach',
        name: 'Pre-conference outreach (60 days before)',
        description: 'Start outreach 60 days before the conference to target attendees and book advance meetings.',
        playId: 'event_invite', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Pre-conference outreach email. "I\'ll be at [Conference] — would love to connect." Reference 2-3 sessions relevant to the recipient. Offer to book a meeting in advance — "Our calendar fills up fast, so wanted to reach out early." Include a LinkedIn version. Email under 120 words, LinkedIn under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Book Advance Meetings',
        name: 'Book meetings in advance (target 20-30)',
        description: 'Push to book 20-30 meetings in advance with strategic accounts attending the conference.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Meeting booking email. Reference the conference and their confirmed attendance. Propose a specific 30-minute slot at your booth or suite. Mention who from your team they\'ll meet (exec name-drop if relevant). Include a calendar link. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'VIP Hospitality Suite',
        name: 'VIP lounge or hospitality suite for top accounts',
        description: 'Invite top-tier accounts to a VIP hospitality suite or exclusive reception at the conference.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'VIP suite invitation for top accounts. Ultra-exclusive tone — "We\'re hosting a private reception for a small group of leaders." Include date/time at the conference, what to expect (drinks, conversation, exec access), and RSVP. Under 100 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 4, dayOffset: 7, label: 'Customer Speaking Session',
        name: 'Speaking session with customer',
        description: 'Promote the customer speaking session to drive booth traffic and credibility.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Customer speaking session promotion. "Our customer [Company] is presenting on [topic] at [time/location]." Highlight the practical takeaways — what attendees will learn they can apply immediately. Encourage prospects to attend for peer validation. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Post-Event Follow-Up',
        name: 'Post-event follow-up campaign (7 days)',
        description: 'Execute a segmented follow-up campaign within 7 days post-event based on engagement level.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Post-conference follow-up. Segment: (1) Met at booth — reference specific conversation, propose next step. (2) Attended session — share session recording/slides, offer deeper discussion. (3) VIP suite — personalized exec follow-up. Generate email templates for each segment. Talking points for follow-up calls. Each email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 11. Private Conference Suite ───────────────────────────────────────────
  {
    name: 'Private Conference Suite',
    description:
      'Run a high-touch private suite program at a conference — pre-book 15-20 strategic accounts for exclusive time slots with your executive team.',
    triggerType: 'conference_suite',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE', 'FINANCE', 'PRODUCT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['C-Suite (exclusive)', 'VP-level buying committee', 'Economic buyers'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 56 },
    expectedOutcome: '70-80% advance deal stage, $5-10M pipeline, high-quality face time with decision makers',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Pre-Book Strategic Accounts',
        name: 'Pre-book 15-20 strategic accounts for time slots',
        description: 'Internal step — select and schedule 15-20 accounts for private meeting slots 6-8 weeks ahead.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal planning step. Select 15-20 accounts for suite meetings. For each: identify 2-3 attendees max, assign a time slot, and note the meeting objective (advance deal, exec intro, expansion conversation). Create a master schedule with 45-minute slots and 15-minute buffers.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Invite-Only Experience',
        name: 'Create invite-only experience',
        description: 'Send exclusive invitations emphasizing the private, invite-only nature of the suite.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Private suite invitation. Extremely exclusive tone — "We\'ve reserved a private suite at [Conference] for one-on-one conversations with our leadership team." Offer a specific time slot. Mention which of your execs will be there. Limit to 2-3 attendees from their side. Under 100 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: '1:1 Meeting Prep',
        name: '1-on-1 or small group meetings',
        description: 'Prepare detailed briefs for each meeting — account context, objectives, and conversation guides.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Meeting prep for each suite meeting. For each account: (1) Account brief — deal status, key stakeholders, recent signals, (2) Meeting objective — what does success look like?, (3) Conversation guide — opening, key questions, discovery topics, (4) Landmines to avoid, (5) Ask/next step to close with. One page per account.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Executive Face Time',
        name: 'Bring executive team for face time',
        description: 'Coordinate your executive team\'s schedule to maximize high-value face time.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Executive coordination plan. Map your exec team to account meetings based on peer level and strategic fit. For each pairing: note the relationship goal, key topics, and how your exec should transition to the AE for follow-up. Include exec talking points for each meeting.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Immediate CRM Capture',
        name: 'Capture next steps in CRM immediately',
        description: 'Log all meeting outcomes and next steps in CRM within 24 hours of each meeting.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'task',
        promptHint: 'Post-meeting capture and follow-up. For each suite meeting: (1) CRM update template — outcome, next steps, timeline, (2) Follow-up email to send within 24 hours referencing the conversation, (3) Internal handoff notes if action needed from other teams. Email template under 80 words. Capture immediately — don\'t let meetings go cold.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 12. Industry Roundtable ────────────────────────────────────────────────
  {
    name: 'Industry Roundtable',
    description:
      'Host a roundtable for same-role leaders from non-competing companies — facilitate discussion, capture insights, and convert attendees to opportunities.',
    triggerType: 'industry_roundtable',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'SALES', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive'],
    targetPersonas: ['Same role across companies (all CROs, all CTOs, etc.)', 'VP-level for peer credibility'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 28 },
    expectedOutcome: '50-60% prospects convert to opportunity, thought leadership positioning, peer validation',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Curate Attendee List',
        name: 'Curate attendee list by role (all same title)',
        description: 'Internal step — build a peer group of 10-15 leaders with the same title from non-competing companies.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal curation step. Build a list of 10-15 leaders with the same title (e.g., all CROs or all CTOs) from non-competing companies. Mix customers and prospects for social proof. Ensure industry diversity for richer discussion. For each, note their key challenge and what they\'d gain from peer exchange.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Peer Group Invitation',
        name: 'Invite from non-competing companies',
        description: 'Send invitations emphasizing the peer-learning format and the caliber of attendees.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Roundtable invitation. Emphasize peer learning — "A conversation among [10-12] [title]s tackling [shared challenge]." Name-drop 2-3 confirmed attendees (with permission) for credibility. Clearly state this is NOT a sales event — it\'s a facilitated discussion. Include date, format, and duration. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Facilitate Discussion',
        name: 'Facilitate discussion (not sales pitch)',
        description: 'Prepare facilitation guide with industry-relevant questions and discussion prompts.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Facilitation guide. Include: (1) Icebreaker question, (2) 3-4 meaty discussion questions tied to shared challenges, (3) How to keep the conversation balanced (no one dominates), (4) When and how to subtly reference your product (only if asked), (5) Closing that transitions to "if anyone wants to continue this conversation individually…" No hard sell.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Capture Insights',
        name: 'Capture challenges and insights',
        description: 'Document key themes, challenges, and insights from the roundtable for follow-up content.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Post-roundtable analysis. Document: (1) Key themes and challenges discussed, (2) Quotes and insights (anonymized for the summary report), (3) Individual attendee signals — who expressed specific pain points you can solve, (4) Opportunities identified for follow-up. Create a summary report draft to share with attendees.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Summary Report & Follow-Up',
        name: 'Share summary report to attendees + follow-up',
        description: 'Share a polished summary report and offer individual follow-up conversations.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Follow-up email with summary report. "Thank you for contributing to a great discussion." Attach the summary report. Highlight 2-3 key takeaways. Offer an individual follow-up: "If any of the challenges we discussed resonated, happy to share how we\'re helping other [title]s tackle them." Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 13. Webinar (Educational) ──────────────────────────────────────────────
  {
    name: 'Webinar (Educational)',
    description:
      'Run an educational webinar with an industry expert and customer speaker — promote broadly, identify hot prospects via Q&A, and segment follow-up by engagement.',
    triggerType: 'webinar_educational',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'MARKETING', 'SALES'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media', 'Education'],
    targetPersonas: ['Directors and VPs', 'Individual contributors', 'Anyone researching the space', 'Multiple per account'],
    timingConfig: { validWindowDays: 21, triggerDaysBefore: 21 },
    expectedOutcome: '20-30% attendance rate, 5-10% convert to opportunity, 100-200 new leads',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Promote to Database & ABM',
        name: 'Promote to broad database + ABM targets',
        description: 'Launch multi-channel promotion to the full database and ABM target accounts.',
        playId: 'event_invite', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Webinar promotion email. Lead with the educational value, not your product. Highlight the external expert/analyst co-presenting. Include customer speaker for credibility. Make the topic irresistible — "How [industry] leaders are solving [challenge] in 2025." Include date, time, and registration link. LinkedIn version for ABM targets. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Partner with Expert',
        name: 'Partner with industry expert/analyst',
        description: 'Coordinate with the industry expert on content, promotion, and audience engagement.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Expert coordination talking points. Cover: (1) Content alignment — what they\'ll present and how it connects to your narrative, (2) Promotion plan — how they\'ll share with their audience, (3) Q&A strategy — how to handle product-specific questions without making it salesy, (4) Post-webinar — how to leverage their content for follow-up.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Customer Speaker Prep',
        name: 'Include customer speaker for credibility',
        description: 'Prepare the customer speaker with talking points and practice session.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Customer speaker preparation. Include: (1) Suggested talking points — focus on their journey, not your product, (2) Key metrics to share (with their approval), (3) Questions the moderator will ask, (4) How to handle "what product do you use?" naturally, (5) Practice session logistics. The customer should shine — not feel like a sales prop.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Identify Hot Prospects via Q&A',
        name: 'Live Q&A to identify hot prospects',
        description: 'During the webinar, track Q&A participation to identify the most engaged and sales-ready attendees.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Q&A analysis plan. After the webinar: (1) Flag attendees who asked buying-signal questions (pricing, implementation, comparison), (2) Note engagement metrics — time watched, polls answered, chat activity, (3) Segment into hot/warm/cold for differentiated follow-up. Create a prioritized follow-up list.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Segmented Follow-Up',
        name: 'Segment follow-up by engagement level',
        description: 'Send differentiated follow-ups: direct outreach for hot leads, nurture for warm, content for cold.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Segmented follow-up emails. Three versions: (1) HOT — reference their specific question, offer a 1:1 discussion, (2) WARM — share the recording and one additional resource, suggest a call, (3) COLD — recording link and newsletter opt-in. Each under 80 words. The hot follow-up should go out within 24 hours.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 14. Workshop/Training Session ──────────────────────────────────────────
  {
    name: 'Workshop/Training Session',
    description:
      'Host a hands-on workshop for customers and high-intent prospects — offer certification, drive adoption, and identify expansion opportunities during breakouts.',
    triggerType: 'workshop_training',
    priority: 8,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail'],
    targetPersonas: ['Product users', 'Team leads and managers', 'Champions', 'Multiple users per account (5-10)'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 28 },
    expectedOutcome: 'Increase product adoption 40-50%, identify expansion opportunities, turn users into champions, 30% prospects convert',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Target Customers & Prospects',
        name: 'Target customers + high-intent prospects',
        description: 'Build the attendee list mixing existing customers who need deeper adoption and high-intent prospects.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal targeting step. Identify: (1) Customers with low adoption who would benefit from training, (2) Customers in expansion conversations, (3) High-intent prospects in evaluation stage. Encourage 5-10 attendees per account for team training. Note the desired outcome for each account.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Certification Workshop Invite',
        name: 'Offer certification or credential',
        description: 'Invite attendees with the added incentive of earning a certification or credential.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Workshop invitation with certification incentive. "Earn your [Product] Certification in a hands-on, half-day workshop." Highlight what they\'ll learn (practical skills, not theory), the certification value, and that it\'s led by product experts. Encourage bringing their team. Include date, format, and registration. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Hands-On Exercises',
        name: 'Hands-on exercises and breakouts',
        description: 'Prepare hands-on lab exercises and breakout group activities using real-world scenarios.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Workshop exercise planning. Create: (1) 3-4 hands-on exercises progressing from basic to advanced, (2) Breakout group assignments (mix customers and prospects for peer learning), (3) Real-world scenarios relevant to attendees\' industries, (4) Discussion prompts for breakouts that naturally surface pain points and use cases.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Product Expert Instruction',
        name: 'Bring product experts as instructors',
        description: 'Coordinate product experts as instructors and position them as accessible resources.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Instructor prep. For each product expert: (1) Their session topic and key learning objectives, (2) How to identify expansion signals during exercises (what questions indicate bigger needs), (3) How to transition from instruction to "by the way, we also do X" naturally, (4) Post-workshop availability for follow-up questions.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Advanced Feature Upsell',
        name: 'Upsell advanced features during workshop',
        description: 'Follow up with attendees who engaged with advanced features, offering deeper exploration and expansion.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-workshop follow-up. Reference specific exercises or features they engaged with. For customers: suggest advanced features or additional use cases. For prospects: offer a personalized demo building on what they learned. Include their certification (if earned). Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 15. Executive Briefing Center Visit ────────────────────────────────────
  {
    name: 'Executive Briefing Center Visit',
    description:
      'Coordinate an EBC visit for strategic $1M+ deals — tailored executive agenda, custom product demo, facility tour, and relationship building.',
    triggerType: 'ebc_visit',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'IT', 'FINANCE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['C-Suite', 'Buying committee (full team)', 'Technical decision makers', 'Champion + manager'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 42 },
    expectedOutcome: '80-90% close rate for EBC visitors, accelerate deal velocity 30-40%, build exec relationships',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Qualify for EBC ($1M+)',
        name: 'Invite for strategic deals only ($1M+)',
        description: 'Internal step — qualify the deal for EBC eligibility and begin coordination.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal qualification step. Verify deal is $1M+ and EBC-worthy. Identify: (1) 3-5 attendees from the customer side (full buying committee), (2) Your exec team to participate, (3) Customer visits to coordinate same day for social proof, (4) Key deal blockers the EBC should address. Create a brief for the EBC team.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'VIP Visit Invitation',
        name: 'Coordinate with customer visits same day',
        description: 'Send a prestigious invitation and coordinate logistics for the visit.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'EBC visit invitation. Ultra-premium tone — "We\'d like to invite your team to our Executive Briefing Center for a day designed entirely around your priorities." Include proposed date, agenda overview, and logistics (travel, accommodation if needed). Mention they\'ll meet your CEO/CTO. Under 150 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Executive Agenda',
        name: 'Executive agenda: vision, roadmap, partnership',
        description: 'Build a custom agenda covering company vision, relevant roadmap, and partnership framework.',
        playId: 'champion_enablement', assetTypes: ['talking_points', 'presentation'], channel: 'internal',
        promptHint: 'Custom EBC agenda. Structure: (1) Welcome and exec introductions (30 min), (2) Their priorities and challenges (45 min — LISTEN first), (3) Vision and roadmap aligned to their needs (45 min), (4) Custom demo (60 min), (5) Partnership discussion and next steps (30 min), (6) Facility tour (30 min). Prepare exec talking points for each section.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Custom Demo Prep',
        name: 'Product demo tailored to their use case',
        description: 'Build a demo environment customized to their specific use case, data, and workflows.',
        playId: 'feature_release', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Custom demo preparation. Include: (1) Their specific use cases to demonstrate, (2) Demo environment setup with their data (anonymized if needed), (3) Key "wow moments" to engineer, (4) Competitive differentiation points to weave in, (5) Questions to ask during the demo to qualify deeper. The demo should feel like THEIR product, not a generic walkthrough.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Tour & Relationship Building',
        name: 'Tour facility, meet team, build relationship',
        description: 'Post-visit follow-up — send thank you, confirm next steps, and maintain the executive relationship.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-EBC follow-up from your executive. "It was a pleasure hosting your team." Reference a specific moment from the visit — a conversation, a demo reaction, a shared interest. Confirm the agreed next steps with timeline. Offer direct access to your exec for any questions. Under 100 words. Must go out within 24 hours.',
        assignedRole: 'ae', requiresApproval: true,
      },
    ],
  },

  // ── 16. User Conference (Annual) ───────────────────────────────────────────
  {
    name: 'User Conference (Annual)',
    description:
      'Plan and execute the annual user conference — prioritize customer invitations, offer VIP passes to prospects, feature customer speakers, reveal the roadmap, and drive expansion.',
    triggerType: 'user_conference',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Media', 'Energy'],
    targetPersonas: ['Power users', 'Department heads', 'Executives', 'Buying committee prospects (VIP for C-Suite)'],
    timingConfig: { validWindowDays: 84, triggerDaysBefore: 84 },
    expectedOutcome: '60-70% customer attendance, $10-20M expansion pipeline, 40-50% prospects convert to opportunity',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Prioritize Customer Invites',
        name: 'Invite all customers (prioritize top tier)',
        description: 'Send tiered invitations — VIP for top-tier customers, standard for others, with personalized messaging.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'User conference invitation. Two versions: (1) VIP for top-tier: personal note, VIP pass, exec access, reserved seating. (2) Standard: highlight sessions relevant to their role, early-bird registration. Both should emphasize community and learning over vendor content. VIP under 150 words, standard under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Free Passes for Prospects',
        name: 'Offer free tickets to strategic prospects',
        description: 'Offer complimentary passes to strategic prospects as a high-value touchpoint.',
        playId: 'new_buying_group', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Free pass offer for strategic prospects. "I have a limited number of complimentary passes and wanted to offer one to you." Highlight customer sessions they can learn from, the roadmap reveal, and networking opportunities. LinkedIn version for warm outreach. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Customer Speaking Sessions',
        name: 'Customer speaking sessions',
        description: 'Coordinate customer speakers and promote their sessions to drive attendance and credibility.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Customer speaker coordination. For each speaker: (1) Session topic and format, (2) Key messages and metrics to share, (3) Practice session schedule, (4) Promotion plan — how to drive their peers to attend, (5) Recognition and rewards for participating. Ensure diverse industries and use cases.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Roadmap Reveal Prep',
        name: 'Product roadmap reveals',
        description: 'Prepare the roadmap reveal content and identify expansion opportunities it creates.',
        playId: 'feature_release', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Roadmap reveal prep. For each major roadmap item: (1) Which accounts this is most relevant to, (2) Expansion conversations it could trigger, (3) Talking points for AEs to use in 1:1 conversations at the conference, (4) How to transition from "exciting feature" to "let\'s discuss how this applies to you." Map roadmap items to specific account opportunities.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Exec Office Hours & Expansion',
        name: 'Executive office hours and expansion conversations',
        description: 'Host executive office hours and schedule expansion conversations during the conference.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'Post-conference follow-up and expansion outreach. Reference the conference: "Great seeing you at [Conference]." For customers: transition to expansion conversation based on roadmap items that resonated. For prospects: propose next steps building on what they saw. Include talking points for expansion calls. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 3 — Content & Thought Leadership (8 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 17. Custom Research Report ─────────────────────────────────────────────
  {
    name: 'Custom Research Report',
    description:
      'Promote a proprietary research report to target accounts — offer personalized benchmarks, host a findings webinar, and follow up with account-specific insights.',
    triggerType: 'custom_research',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE', 'STRATEGY', 'PRODUCT', 'OPERATIONS', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['C-Suite', 'VPs and Directors', 'Strategy/Analytics', 'Anyone researching the industry'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 0 },
    expectedOutcome: '25-35% download-to-meeting conversion, thought leadership positioning, sales conversation starters',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Promote Report to Targets',
        name: 'Promote report to target accounts',
        description: 'Send personalized outreach promoting the research report to target accounts.',
        playId: 'feature_release', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Research report promotion email. Lead with a headline finding — "78% of [industry] leaders say [insight]." Tease 2-3 key findings relevant to the recipient\'s role. Include a download link. Do NOT give everything away — make them want the full report. LinkedIn version with a different hook. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Personalized Benchmark Offer',
        name: 'Offer personalized benchmark vs their data',
        description: 'Offer to benchmark the recipient\'s company against the report findings.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'Benchmark offer email. "We can show you exactly how [their company] compares to the industry data." Offer a 20-minute benchmarking session where you walk through the findings with their data. This is the conversion mechanism — the benchmark requires a conversation. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Conversation Starter',
        name: 'Use as conversation starter',
        description: 'For engaged accounts, use specific report findings as conversation starters in outreach.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Conversation-starter email using a specific finding. "One thing that stood out in our research: companies in [their industry] are [finding]. I\'d love to hear if that matches what you\'re seeing." Talking points for the call: how to use findings to uncover pain points and position your solution. Email under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Findings Webinar',
        name: 'Host webinar presenting findings',
        description: 'Host a webinar presenting the research findings to a broader audience.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Webinar invitation presenting the research findings. "Join us for a deep dive into [Report Title]." Include the presenting analyst/expert, key topics, and Q&A opportunity. Target accounts that downloaded but didn\'t engage further. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Account-Specific Insights',
        name: 'Follow up with account-specific insights',
        description: 'Send personalized follow-ups with insights specifically relevant to each engaged account.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Account-specific insight email. Pull 1-2 findings most relevant to their company and role. Add your own analysis — "Based on what we\'ve seen with companies like yours…" Offer to discuss how these trends apply to their specific situation. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 18. ROI/Business Case Tool ─────────────────────────────────────────────
  {
    name: 'ROI/Business Case Tool',
    description:
      'Use a personalized ROI assessment to advance active opportunities — walk through the calculator, deliver a custom report, and arm champions with an exec-ready business case.',
    triggerType: 'roi_business_case',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'FINANCE', 'OPERATIONS', 'IT', 'PRODUCT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Economic buyers (CFO)', 'Champions', 'Procurement', 'Department budget owners', 'C-Suite'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '60-70% advance to next stage, reduce sales cycle 20-30%, increase average deal size',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Offer ROI Assessment',
        name: 'Offer personalized ROI assessment',
        description: 'Offer the prospect a personalized ROI assessment using their company data.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'ROI assessment offer email. "We\'ve built a model that shows the specific ROI for companies like yours — can I walk you through it with your numbers?" Position as a free, no-obligation analysis. Reference a similar company\'s results as proof. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Calculator Walkthrough Call',
        name: 'Schedule call to walk through calculator',
        description: 'Book a call to walk through the ROI calculator using their specific inputs.',
        playId: 'new_buying_group', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'Meeting booking email for ROI walkthrough. "Let\'s spend 20 minutes running your numbers through our model." Talking points for the call: (1) What inputs to gather beforehand, (2) How to guide the conversation to uncover pain points, (3) How to handle skepticism on projections, (4) How to transition to next steps. Email under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Custom ROI Report',
        name: 'Deliver custom report with their numbers',
        description: 'Send a polished, custom ROI report using the data gathered during the call.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'ROI report delivery email. "Attached is your custom ROI analysis based on the numbers we discussed." Highlight the 2-3 most compelling findings. Note any conservative assumptions. Offer to present the findings to their leadership team. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Business Case for Proposal',
        name: 'Use output in business case/proposal',
        description: 'Incorporate ROI findings into the formal business case or proposal document.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal step — integrate ROI findings into the deal. Create: (1) Business case summary slide for the proposal, (2) Key metrics to highlight in the executive summary, (3) Objection-handling guide for financial pushback, (4) Comparison to alternatives (including do-nothing cost). Make the ROI undeniable.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Champion Business Case Kit',
        name: 'Arm champion with exec-ready business case',
        description: 'Provide the champion with a polished, exec-ready business case they can present internally.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Champion enablement email. "I\'ve put together a one-pager you can share with [their CFO/CEO] that summarizes the business case." Include the exec-ready document. Talking points for the champion: how to present it, how to handle questions, what to say if asked about alternatives. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 19. Customer Case Study ────────────────────────────────────────────────
  {
    name: 'Customer Case Study',
    description:
      'Leverage customer case studies as sales weapons — segment by industry, share with similar accounts, offer reference calls, and deploy in competitive situations.',
    triggerType: 'case_study_share',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Buying committee', 'Skeptics/detractors', 'C-Suite', 'Technical teams'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '50-60% request a reference call, increase close rate 20-30%, shorten sales cycle',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Segment Case Studies',
        name: 'Segment case studies by industry/use case',
        description: 'Internal step — match available case studies to target accounts by industry, size, and use case.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal matching step. For each target account, identify the most relevant case study by: (1) Same industry, (2) Similar company size, (3) Matching use case, (4) Comparable challenges. Rank the top 2-3 case studies for each account. Note the specific proof points most compelling for their situation.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Share with Similar Accounts',
        name: 'Share with similar accounts',
        description: 'Send the most relevant case study with a personalized angle connecting it to the prospect\'s situation.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Case study share email. "I thought you\'d find this relevant — [Customer Company] faced a similar challenge to what you described." Highlight the 2-3 most compelling metrics. Make the connection explicit between their situation and the case study. Include a link or attachment. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Offer Reference Call',
        name: 'Offer customer reference call',
        description: 'Offer to arrange a direct conversation with the case study customer.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Reference call offer. "If it would be helpful, I can arrange a call with [Customer Company] so you can hear directly from them." Position it as peer-to-peer — not a vendor-orchestrated testimonial. Mention the customer contact\'s role. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Include in Proposals',
        name: 'Include in proposals and follow-ups',
        description: 'Embed relevant case study metrics into proposals and deal follow-ups.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal step. Create: (1) Case study summary slide for the proposal, (2) Key quotes and metrics to reference in conversations, (3) How to handle "but they\'re different from us" objections, (4) Additional case studies to share if they want more proof. Make the case study work harder throughout the deal cycle.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Competitive Displacement Use',
        name: 'Use in competitive displacements',
        description: 'Deploy case studies specifically in competitive situations, focusing on switch stories and TCO comparisons.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Competitive case study email. For accounts evaluating competitors: "[Customer] switched from [Competitor] and saw [results]." Focus on the switch story — why they moved, how easy the transition was, the before/after metrics. Talking points for handling competitive objections. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 20. Analyst Report/Validation ──────────────────────────────────────────
  {
    name: 'Analyst Report/Validation',
    description:
      'Leverage analyst reports (Gartner, Forrester, etc.) to validate your market position — share with enterprise accounts, overcome competitive objections, and establish leadership.',
    triggerType: 'analyst_report',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'IT', 'PROCUREMENT', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Government', 'Insurance'],
    targetPersonas: ['C-Suite', 'IT/Technical buyers', 'Procurement/vendor management', 'Enterprise architecture'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: 'Increase enterprise win rate 30-40%, shorter vendor selection, increased pricing power',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Share with Enterprise Accounts',
        name: 'Share with enterprise accounts',
        description: 'Distribute the analyst report to enterprise accounts with a personalized note on the key findings.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Analyst report share email. "[Analyst firm] just positioned us as a [Leader/Visionary] in [category]." Reference the specific strengths noted. Offer a complimentary copy (if gated) or link. Make it relevant to their evaluation — "Given that you\'re looking at [category], I thought this would be timely." Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Reference in Proposals',
        name: 'Reference in proposals and pitches',
        description: 'Incorporate analyst findings into active proposals and pitch decks.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal enablement. Create: (1) Key analyst quotes to drop into proposals, (2) Analyst comparison charts to include in decks, (3) How to reference the report without overselling it ("Don\'t take our word for it — here\'s what [Analyst] says"), (4) Cautions — what the report says about your weaknesses and how to preempt.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Analyst Briefing Offer',
        name: 'Offer analyst briefing for strategic accounts',
        description: 'For the largest deals, offer to arrange a direct analyst briefing.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'Analyst briefing offer. "For a deal of this significance, we can arrange a direct briefing with [Analyst] to discuss their findings." This is a high-value offer — use sparingly for strategic accounts. Explain the format and what the prospect will learn. Under 100 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 4, dayOffset: 7, label: 'Competitive Objection Handler',
        name: 'Use to overcome competitive objections',
        description: 'Deploy analyst findings specifically to counter competitive objections and FUD.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Competitive objection-handling email. When a prospect mentions a competitor advantage: "Interestingly, [Analyst] noted that [your strength] vs [competitor weakness]." Use analyst data as neutral third-party validation. Talking points for each major competitor comparison. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Market Leader Positioning',
        name: 'Position as market leader/visionary',
        description: 'Broader campaign using the analyst validation to position your company as the market leader.',
        playId: 'new_buying_group', assetTypes: ['email', 'linkedin'], channel: 'email',
        promptHint: 'Market leadership positioning email. For new prospects: use the analyst report as a credibility anchor in initial outreach. "As recognized by [Analyst] as a [Leader] in [category], we…" LinkedIn post version for AE\'s feed to amplify. Email under 100 words, LinkedIn under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 21. Interactive Product Demo ───────────────────────────────────────────
  {
    name: 'Interactive Product Demo',
    description:
      'Deploy an interactive self-service demo as a qualification and engagement tool — track usage patterns, follow up on features explored, and convert to live conversations.',
    triggerType: 'interactive_demo',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Technical users', 'Product managers', 'Individual contributors', 'Champions'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '30-40% engaged users convert to meeting, effective qualification tool, reduce demo no-shows',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Share Demo in Outreach',
        name: 'Share demo link in outreach sequences',
        description: 'Include the interactive demo link in outreach emails as a low-friction way to explore the product.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Interactive demo share email. "Rather than schedule a call, I thought you might want to explore on your own time." Include the demo link with a brief setup (what to look for, suggested 10-minute path). Position as no-commitment exploration. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Track Engagement Patterns',
        name: 'Track engagement and usage patterns',
        description: 'Monitor which features prospects explore and how deeply they engage.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Engagement tracking plan. Define: (1) Key engagement signals to track (time spent, features explored, repeated visits), (2) Scoring criteria — what constitutes high/medium/low intent, (3) Trigger thresholds for sales follow-up, (4) How to use demo analytics in the follow-up conversation. Map features explored to buying signals.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Feature-Based Follow-Up',
        name: 'Follow up based on features explored',
        description: 'Send a personalized follow-up based on which specific features the prospect explored in the demo.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Feature-based follow-up email. "I noticed you spent time exploring [feature area]." Share a deeper resource on that specific capability — a case study, video, or guide. Offer a live walkthrough of that specific area. Don\'t mention ALL features — just the ones they showed interest in. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Live Walkthrough Offer',
        name: 'Offer live walkthrough of specific features',
        description: 'For highly engaged users, offer a live walkthrough focused on the features they explored most.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Live walkthrough offer. "You\'ve seen the self-guided version — the live version is even better because I can show you [specific capability] with your actual use case." Propose a 20-minute focused session. Include 2-3 time slots. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Qualification Assessment',
        name: 'Use as qualification tool',
        description: 'Use demo engagement data as a qualification input to prioritize follow-up resources.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Qualification assessment. Based on demo engagement, score the account: (1) High intent — spent 10+ min, explored advanced features, repeated visits → prioritize for AE follow-up. (2) Medium intent — completed basic tour → nurture sequence. (3) Low intent — opened but bounced → deprioritize. Create action plans for each tier.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 22. Executive Video Message ────────────────────────────────────────────
  {
    name: 'Executive Video Message',
    description:
      'Record custom video messages from your executives targeting strategic accounts — break through stalled deals with personal, high-touch outreach via personalized landing pages.',
    triggerType: 'exec_video_message',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['CEO', 'President', 'CRO', 'CFO', 'CTO'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: '40-50% response rate, re-engage stalled deals, significant differentiation from competitors',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Record Custom Video',
        name: 'Record custom video for strategic accounts',
        description: 'Record a 2-3 minute personalized video from your executive addressing the specific account.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Video script/talking points for your executive. Structure: (1) Personal greeting using their name, (2) Reference a specific challenge or opportunity they\'ve discussed, (3) Why your exec is personally invested in this relationship, (4) One specific ask — meeting, call, or intro. Keep it conversational, not scripted. 2-3 minutes max.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Reference Specific Challenge',
        name: 'Reference specific challenge or opportunity',
        description: 'Send the video via a personalized landing page with messaging aligned to their specific challenge.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Video delivery email. Short and intriguing — "I asked our [CEO/CTO] to record a quick message for you. It\'s about [their specific challenge]." Include the personalized landing page link. No long email — let the video do the talking. Under 60 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Exec-to-Exec Conversation',
        name: 'Offer exec-to-exec conversation',
        description: 'Follow up by offering a direct exec-to-exec conversation.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Exec-to-exec meeting request. "Our [CEO] mentioned they\'d love to continue the conversation from the video." Offer specific times for a 30-minute exec-to-exec call. Frame it as strategic, not sales. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Stalled Deal Breakthrough',
        name: 'Use for breakthrough in stalled deals',
        description: 'For stalled deals, use the exec video as a pattern-interrupt to re-engage the prospect.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Stalled deal strategy. Analyze: (1) Why the deal stalled — what\'s the real blocker?, (2) Has the video been viewed? (check analytics), (3) If viewed but no response — what\'s the next move?, (4) If not viewed — alternative delivery method (LinkedIn, phone call referencing the video). Create a recovery plan.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Personalized Landing Page',
        name: 'Send via personalized landing page',
        description: 'For accounts that haven\'t engaged, try a different channel with the personalized landing page.',
        playId: 're_engagement', assetTypes: ['linkedin'], channel: 'linkedin',
        promptHint: 'LinkedIn follow-up with landing page link. Different angle from the email — "I shared something with you last week that I think you\'d find valuable. In case it got lost in the inbox…" Include the landing page link. Under 80 words. Personal and warm, not salesy.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 23. Competitive Battlecard/Comparison ──────────────────────────────────
  {
    name: 'Competitive Battlecard/Comparison',
    description:
      'Deploy competitive intelligence when a competitor is in the deal — share differentiation, highlight TCO advantages, offer proof-of-concept, and arm champions with competitive talking points.',
    triggerType: 'competitive_battlecard',
    priority: 8,
    targetDepartmentTypes: ['IT', 'ENGINEERING', 'PRODUCT', 'FINANCE', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Technical evaluators', 'Economic buyers', 'Champions', 'Buying committee'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: 'Win 50-60% competitive deals, increase deal size via value positioning, reduce discounting, faster vendor selection',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Deploy Competitive Intel',
        name: 'Share when competitor is in the deal',
        description: 'When a competitor is identified in the deal, share targeted competitive intelligence with the prospect.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Competitive differentiation email. Don\'t trash the competitor — elevate your strengths. "Since you\'re evaluating options, I wanted to share how we approach [key differentiator differently]." Focus on 2-3 unique advantages. Include a comparison framework (not a feature checklist). Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'TCO Analysis',
        name: 'Highlight differentiation and TCO analysis',
        description: 'Provide a total cost of ownership analysis comparing your solution to the competitor.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'TCO comparison email. "When evaluating total cost, there are factors beyond license price." Present a TCO analysis covering: implementation, training, ongoing support, hidden costs, and productivity impact. Include a comparison chart. Talking points for handling "but they\'re cheaper" objections. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Trial/POC Offer',
        name: 'Offer trial/POC to prove superiority',
        description: 'Offer a proof-of-concept or trial to let them see the difference firsthand.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'POC offer in competitive situation. "The best way to compare is to try both." Offer a focused POC on the specific capability where you have the strongest advantage. Define clear success criteria upfront. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Champion Competitive Ammo',
        name: 'Arm champion with competitive talking points',
        description: 'Give the internal champion ammunition to advocate for your solution in internal discussions.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Champion competitive enablement. "Here are some points that might be helpful when your team is comparing options." Provide: (1) Key differentiators in their language, (2) Questions to ask the competitor that expose weaknesses, (3) Customer quotes from similar companies who chose you over the competitor. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Value Positioning',
        name: 'Position on value, not just features',
        description: 'Shift the conversation from feature comparison to business value and outcomes.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Value positioning email. Move beyond features — "Ultimately, this decision isn\'t about features, it\'s about [business outcome]." Share a case study where a company chose you over the competitor and the resulting business impact. Future-proof the decision — why your roadmap wins long-term. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 24. Personalized Video Demo ────────────────────────────────────────────
  {
    name: 'Personalized Video Demo',
    description:
      'Record personalized 5-10 minute demos using the prospect\'s name and company — show exactly how you solve their problem, track viewing, and follow up within 24 hours.',
    triggerType: 'personalized_demo',
    priority: 8,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Buying committee', 'Stakeholders who missed live demo', 'Technical evaluators', 'Champions'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0 },
    expectedOutcome: '60-70% view rate, enable multi-threading through async evaluation, 40% viewers advance to next stage',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Record Personalized Demo',
        name: 'Record 5-10 min demo using their name/company',
        description: 'Record a personalized demo using the prospect\'s name, company, and specific use case.',
        playId: 'feature_release', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Demo recording guide. Structure: (1) Personal intro — "Hi [Name], I recorded this specifically for [Company]," (2) Show the 2-3 features most relevant to their stated needs, (3) Use their company name and scenario where possible, (4) End with a clear next step. Keep it 5-10 minutes. Conversational, not scripted.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Show Their Problem Solved',
        name: 'Show exactly how you solve their problem',
        description: 'Send the personalized demo video with a brief email context.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Demo delivery email. Short — let the video sell. "I recorded a quick demo showing how [your product] handles [their specific challenge]." Include the video link (via Vidyard/Loom for tracking). Mention it\'s 5-10 min. No long email. Under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Include Their Scenarios',
        name: 'Include their data/scenarios where possible',
        description: 'For high-value deals, create a follow-up demo or supplement using their actual data or scenarios.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Enhanced demo follow-up. "I took it a step further and built a demo using [their specific scenario/data]." Share the enhanced version. Offer to screen-share for a deeper dive. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Track Viewing Analytics',
        name: 'Send via video platform (track viewing)',
        description: 'Monitor viewing analytics — who watched, how much, and which sections they replayed.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Viewing analytics analysis. Check: (1) Did they watch? How much? (2) Which sections did they replay or skip? (3) Did they share with colleagues? (4) Based on viewing patterns, what are they most interested in? Create a follow-up strategy based on their engagement pattern.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: '24-Hour View Follow-Up',
        name: 'Follow up within 24 hours of viewing',
        description: 'When the video is viewed, follow up within 24 hours while it\'s fresh.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'View-triggered follow-up. "I saw you had a chance to watch the demo — what did you think about [specific section they likely found most relevant]?" Ask one specific question. Offer to discuss any questions or show more. Under 60 words. Timing is everything — send within 24 hours of viewing.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 4 — Gifting & Personal Touch (8 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 25. High-Value Executive Gift ──────────────────────────────────────────
  {
    name: 'High-Value Executive Gift',
    description:
      'Send a high-value, personalized gift to C-Suite targets — research their interests, include a handwritten note from your executive, and follow up 1-2 weeks later.',
    triggerType: 'gift_high_value',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['C-Suite only', 'Ultimate decision makers', 'Executive champions'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: '50-60% response rate, relationship building with hard-to-reach executives, breakthrough conversations',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Research Personal Interests',
        name: 'Research personal interests (LinkedIn, social)',
        description: 'Deep research into the executive\'s personal interests, hobbies, and passions for a meaningful gift.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Personal interest research. Investigate: (1) LinkedIn profile — interests, groups, posts they engage with, (2) Social media — hobbies, sports teams, charitable causes, (3) Public speaking — topics they\'re passionate about, (4) Company bio — alma mater, board memberships. Suggest 3 gift ideas that feel personal and thoughtful, not corporate.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Executive Note + Gift',
        name: 'Personalized note from your executive',
        description: 'Draft a handwritten-style note from your executive to accompany the gift.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'task',
        promptHint: 'Draft the executive\'s personal note to accompany the gift. Reference a specific shared interest or connection. No product mention — purely relationship. The note should feel like it came from a real person, not a marketing team. 3-4 sentences max. Also draft the gift order details and shipping instructions.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Send Gift (Permission-Based)',
        name: 'Send to home or office (permission-based)',
        description: 'Coordinate gift delivery — office delivery preferred, home only with established relationship.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'task',
        promptHint: 'Gift logistics checklist. (1) Confirm shipping address (office vs home — office default unless close relationship), (2) Verify gift compliance with their company policy, (3) Track delivery confirmation, (4) Prepare delivery notification — a brief text or email: "Something should be arriving for you today." Keep it mysterious and exciting.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'No Immediate Ask',
        name: 'No immediate ask (relationship building)',
        description: 'After gift delivery, resist the urge to sell — let the gift speak for itself.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal patience step. DO NOT send a sales email immediately after the gift. The gift is an investment in the relationship. Note: (1) Was the gift acknowledged? (2) Any social media post or mention? (3) What\'s the right window before a follow-up? (1-2 weeks minimum). Plan the follow-up approach.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Follow-Up Meeting Request',
        name: 'Follow up 1-2 weeks later with meeting request',
        description: 'After 1-2 weeks, send a warm follow-up referencing the gift and requesting a meeting.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Gift follow-up email. Warm and casual — "Hope you enjoyed the [gift]." Then a soft pivot: "I\'d love to find 30 minutes to discuss [relevant topic]." No hard sell — the meeting request should feel like a natural extension of the relationship. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 26. Thoughtful Lower-Value Gift ────────────────────────────────────────
  {
    name: 'Thoughtful Lower-Value Gift',
    description:
      'Send thoughtful, conversation-specific gifts to multiple contacts at an account — scale personal touch across the buying committee to stay top of mind.',
    triggerType: 'gift_lower_value',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Buying committee', 'Champions', 'Department heads', 'Technical evaluators'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: '30-40% response rate, stay top-of-mind throughout deal cycle, build rapport and differentiation',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Tie to Conversation',
        name: 'Tie to specific conversation or interest',
        description: 'Select a gift that connects to a specific conversation, interest, or challenge they mentioned.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Gift ideation. For each contact, recall a specific conversation or interest: (1) A book they\'d love based on a discussion topic, (2) A team snack/treat they mentioned, (3) Something related to a hobby or interest. The key: it should make them think "they were actually listening." Suggest 2-3 options per contact.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Personalized Note',
        name: 'Personalized note referencing discussion',
        description: 'Write a personalized note connecting the gift to the specific conversation or interest.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'task',
        promptHint: 'Gift note draft. Reference the exact conversation — "After our chat about [topic], I thought you\'d enjoy this." No product pitch. No ask. Just thoughtfulness. 2-3 sentences max. Also include gift ordering details for each contact at the account.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Multi-Contact Gifting',
        name: 'Send to multiple contacts at account',
        description: 'Send gifts to multiple contacts at the same account — different gifts based on individual conversations.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'task',
        promptHint: 'Multi-contact gift logistics. Plan gifts for 3-5 contacts at the account. Each gift should be different and specific to that person. Track: (1) Gift selected, (2) Note written, (3) Shipping address, (4) Delivery date. Stagger delivery over a few days so it doesn\'t look orchestrated.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Nurture Touchpoint',
        name: 'Use as touchpoint in nurture',
        description: 'Use the gift as a natural touchpoint to continue the nurture sequence.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-gift touchpoint email. Brief and natural — "Hope the [gift] brightened your day." Add one piece of value: a relevant article, a case study, or an insight. Don\'t ask for anything yet — just maintain the warmth. Under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Follow-Up with Content/Meeting',
        name: 'Follow up with relevant content or meeting ask',
        description: 'Convert the goodwill into a meeting or deeper engagement.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Gift-to-meeting transition email. "I\'ve been thinking about what you said about [challenge from earlier conversation] — I have some ideas I\'d love to share." Natural transition from relationship building to business conversation. Suggest a coffee or lunch, not a formal meeting. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 27. Charitable Donation in Their Name ──────────────────────────────────
  {
    name: 'Charitable Donation in Their Name',
    description:
      'Make a charitable donation aligned with the prospect\'s values — research their causes, send a personalized acknowledgment, and build a values-based relationship.',
    triggerType: 'charitable_donation',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE', 'CSR', 'SUSTAINABILITY'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Energy', 'Retail'],
    targetPersonas: ['C-Suite', 'Sustainability/CSR officers', 'Founder/CEO', 'Executive sponsors'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: 'Values-based relationship building, strong differentiation, goodwill, 40-50% respond positively',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Research Charitable Causes',
        name: 'Research company\'s charitable initiatives',
        description: 'Research the prospect\'s company and personal charitable interests and CSR initiatives.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Charitable research. Investigate: (1) Company CSR page — what causes do they support?, (2) Executive\'s personal philanthropy (board memberships, LinkedIn causes), (3) Company foundation or matching programs, (4) Recent charitable press releases. Suggest 2-3 charities that align with BOTH their values and your company\'s values.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Donation + Acknowledgment',
        name: 'Make donation and send certificate/acknowledgment',
        description: 'Make the donation and send a personalized certificate or acknowledgment.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Donation acknowledgment email. "In appreciation of our conversation and shared commitment to [cause], we\'ve made a donation to [charity] in your name." Include the donation certificate. Brief explanation of why this cause matters to your company too. No sales ask. Under 100 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Shared Values Note',
        name: 'Personalized note about shared values',
        description: 'Follow up with a note about shared values and what the cause means to your company.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Shared values email. Brief and authentic — "One of the reasons I enjoy working with [companies/leaders] like yours is the commitment to [cause]." Share a brief story about your company\'s involvement with the cause. Build a values-based connection. Under 80 words. Zero product mention.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'No Sales Ask (Goodwill)',
        name: 'No immediate sales ask (goodwill)',
        description: 'Let the goodwill build naturally — no sales ask for at least two weeks.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Patience step. Do NOT follow up with a sales ask. Track: (1) Did they acknowledge the donation? (2) Any social media mention? (3) Has the relationship warmth increased? Plan the timing for re-engaging on business topics. Wait at least 2 weeks.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Warm Re-Engagement',
        name: 'Follow up 2 weeks later',
        description: 'After two weeks, re-engage with a warm, values-aligned business conversation.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Warm re-engagement email. Transition from values to business — "I\'ve been thinking about how organizations like yours approach [business challenge related to their values/mission]." Offer to share insights or have a conversation. The donation opened the door — now walk through it naturally. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 28. Personalized Research/Insight ──────────────────────────────────────
  {
    name: 'Personalized Research/Insight',
    description:
      'Create a custom research document or market analysis for a strategic account — pure value, no product pitch, positioned as genuine helpfulness.',
    triggerType: 'personalized_insight',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'STRATEGY', 'PRODUCT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['C-Suite', 'Strategy/Analytics', 'Department heads', 'Champions needing ammunition'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: '50-60% response rate, thought leadership positioning, conversation starters, build trust',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Research Their Challenges',
        name: 'Research their company\'s challenges/market',
        description: 'Deep research into the company\'s market position, challenges, competitors, and strategic priorities.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Deep company research. Analyze: (1) Recent earnings calls or investor presentations, (2) Competitive dynamics — who\'s gaining/losing, (3) Industry trends affecting their business, (4) Public strategic priorities, (5) Challenges their peers are facing. Identify 3-5 insights that would be genuinely valuable to their leadership.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Custom Insight Document',
        name: 'Create custom insight document or analysis',
        description: 'Create a polished, one-page insight document with analysis specific to their company.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Insight delivery email. "I put together a brief analysis on [market trend/competitive dynamic] that I thought might be useful for your team." Attach the custom insight document. No product mention. The value should stand on its own. Under 80 words. The document should be 1-2 pages, data-driven, and actionable.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'No Product Pitch',
        name: 'No product pitch—pure value',
        description: 'If they engage, continue providing value without pitching — establish yourself as a trusted advisor.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Value-add follow-up. If they responded positively: "Glad you found it useful. Here\'s one more thing I came across that\'s relevant…" Share an additional insight, article, or data point. Continue building trust. Still no product pitch. Under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: '"Thought This Would Help"',
        name: 'Position as "thought this would help"',
        description: 'Frame all interactions as genuine helpfulness — "I thought of you when I saw this."',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Relationship assessment. (1) Have they engaged with the insights? (2) Have they shared with colleagues? (3) Is the trust level sufficient to transition to a business conversation? (4) What\'s the natural bridge from "helpful advisor" to "let me show you how we solve this"? Plan the transition.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Deeper Dive Conversation',
        name: 'Follow up offering deeper dive conversation',
        description: 'Offer a deeper conversation about the insights — naturally transitioning to how you can help.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Deeper dive email. "Based on the research I\'ve been doing on [their market], I have some thoughts on how companies in your position are tackling [challenge]. Would love to share over a 20-minute call." The transition to business should feel natural and earned. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 29. Tickets to Event/Experience ────────────────────────────────────────
  {
    name: 'Tickets to Event/Experience',
    description:
      'Offer premium event tickets based on personal interests — sports, concerts, theater — to build relationships in a relaxed setting outside the office.',
    triggerType: 'event_tickets',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'SALES', 'FINANCE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['C-Suite and VP-level', 'Economic buyers', 'Executive champions'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 42 },
    expectedOutcome: 'Relationship deepening, face time in relaxed setting, 60-70% leads to meaningful business conversation',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Research Personal Interests',
        name: 'Identify personal interests (social media research)',
        description: 'Research the executive\'s personal interests to match with the right event or experience.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Interest research. Investigate: (1) Sports teams they follow (LinkedIn, social media), (2) Music/concert interests, (3) Cultural interests (theater, art), (4) Food and wine interests, (5) Local events coming up in their area. Suggest 2-3 event options that feel personally selected, not corporate generic.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Offer 2-4 Tickets',
        name: 'Offer 2-4 tickets (bring family/colleagues)',
        description: 'Offer 2-4 tickets so they can bring family or colleagues — generous, not transactional.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Ticket offer email. Personal and generous — "I have [2-4] tickets to [Event] and thought of you. Bring whoever you\'d like — family, friends, colleagues." Reference why you thought of them (their interest). No business agenda mentioned. Under 80 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Optional: Attend Together',
        name: 'Optional: attend together (relationship building)',
        description: 'Offer to attend together if appropriate — maximize face time in a relaxed setting.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Attendance strategy. Decide: (1) Should you attend together? (depends on relationship closeness), (2) If attending: talking topics (NOT business — sports, family, travel), (3) When to briefly mention business (only if they bring it up), (4) If not attending: just send the tickets as a gift. Plan for both scenarios.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'No Sales Talk at Event',
        name: 'No sales talk during event',
        description: 'If attending together, keep it social — no product pitches or business pressure.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Event behavior guide. Golden rules: (1) Do NOT pitch at the event, (2) Be genuinely present and enjoy it, (3) If THEY bring up business, keep it brief and say "let\'s grab time next week to discuss properly," (4) Take a photo together (with permission) for relationship memory. Focus on building a real human connection.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Post-Event Meeting Request',
        name: 'Follow up after event with meeting request',
        description: 'A week after the event, follow up with a warm reference and meeting request.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-event follow-up. "Great time at [Event] last week! [Reference a specific moment — a play, a song, the food]." Then a natural transition: "I\'d love to catch up properly — any time next week for coffee or a call?" Under 60 words. Warm and personal.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 30. Lunch & Learn Sponsorship ──────────────────────────────────────────
  {
    name: 'Lunch & Learn Sponsorship',
    description:
      'Sponsor a lunch and learn for the prospect\'s team (15-30 people) — educational workshop format, bring a product expert or customer speaker, and multi-thread into multiple users.',
    triggerType: 'lunch_learn',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'SALES'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail'],
    targetPersonas: ['Entire team/department (15-30)', 'Mix of users/managers/leaders', 'Champions bring colleagues'],
    timingConfig: { validWindowDays: 21, triggerDaysBefore: 21 },
    expectedOutcome: 'Multi-threading (10-20 contacts), build consensus across team, educate users, 50-60% advance deal',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Offer Lunch for Their Team',
        name: 'Offer to bring lunch for their team (15-30 people)',
        description: 'Offer to sponsor a lunch and learn for their department with a relevant educational topic.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Lunch & learn offer. "We\'d love to bring lunch for your team and share some insights on [educational topic relevant to their challenges]." Emphasize it\'s educational, not a sales pitch. Mention you\'ll bring a product expert or customer speaker. Offer to cover 15-30 people. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Educational Workshop Plan',
        name: 'Educational workshop (not sales pitch)',
        description: 'Design the workshop content to be genuinely educational — the product should be a natural supporting example.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Workshop content plan. Design a 30-45 minute educational session: (1) Industry challenge or best practice topic, (2) 3-4 key insights or frameworks, (3) Where your product fits naturally (as an example, not a pitch), (4) Interactive Q&A structure, (5) Handout or resource to leave behind. The ratio should be 80% education, 20% product.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Expert/Customer Speaker',
        name: 'Bring product expert or customer speaker',
        description: 'Coordinate the product expert or customer speaker for the session.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Speaker preparation. (1) Confirm product expert or customer speaker, (2) Align on content and messaging, (3) Prepare for common questions from the team, (4) Plan how to handle "how much does it cost?" and similar premature sales questions, (5) Logistics — AV, food order, timing.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Hands-On Q&A',
        name: 'Hands-on learning or Q&A',
        description: 'During the session, include hands-on learning and interactive Q&A to maximize engagement.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Q&A facilitation guide. (1) Seed 2-3 questions with your champion to start discussion, (2) Watch for buying signals in questions (who asks about pricing, implementation, comparison), (3) Note every attendee name and role, (4) Identify potential champions from the room, (5) Close with "anyone who wants to learn more, I\'m happy to chat after."',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Multi-Thread Follow-Up',
        name: 'Multi-thread into multiple users',
        description: 'After the session, follow up with individual attendees to build multiple relationships.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Multi-thread follow-up emails. Create personalized follow-ups for each key attendee (especially those who asked questions or engaged actively). Reference their specific question or comment. Offer to discuss further. Connect on LinkedIn. The goal: 10-20 contacts from one event. Each email under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 31. Personalized Video Message (AE) ────────────────────────────────────
  {
    name: 'Personalized Video Message (AE)',
    description:
      'Record short 1-2 minute personalized video messages as human touchpoints in email sequences — track viewing and follow up when watched.',
    triggerType: 'ae_video_message',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'EXECUTIVE', 'SALES'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['All buyer personas', 'Champions', 'Anyone in sales process'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0 },
    expectedOutcome: '2-3x higher response vs text email, humanize outreach, memorability, 30-40% view rate',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Record 1-2 Min Video',
        name: 'Record 1-2 min video using their name',
        description: 'Record a brief, personalized video using the prospect\'s name and referencing their specific situation.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Video recording guide. Structure: (1) Hold up their name on a whiteboard or say it clearly, (2) Reference one specific thing about their company or challenge, (3) Share one insight or offer one thing of value, (4) Clear ask — reply, book a call, watch a demo. Keep it 1-2 minutes. Authentic and human, not polished.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Reference Pain Point',
        name: 'Reference specific conversation or pain point',
        description: 'Send the video via email with a brief text that references their specific pain point.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Video delivery email. Super brief — the video is the content. "I recorded a quick message for you about [their challenge]." Include the video thumbnail/link via Vidyard/Loom. One sentence max below the video. Under 30 words of text.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Track Viewing (Vidyard/Loom)',
        name: 'Share via Vidyard/Loom (track viewing)',
        description: 'Monitor video viewing analytics to gauge interest and inform follow-up timing.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Video analytics check. (1) Was the video viewed? (2) How much was watched? (3) Was it shared or forwarded? (4) Based on viewing behavior, what\'s the follow-up strategy? Viewed = follow up within 24 hours. Not viewed after 3 days = try LinkedIn or phone.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Human Touch in Sequence',
        name: 'Human touch in email sequence',
        description: 'Use the video as a pattern-interrupt in the broader outreach sequence.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Sequence integration plan. The video should interrupt the pattern of text-only emails. Best placement: after 2-3 text emails with no response. The video breaks through because it\'s different. Plan where in the sequence to insert videos for maximum impact.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: '24-Hour View Follow-Up',
        name: 'Follow up within 24 hours if viewed',
        description: 'When the video is viewed, send an immediate follow-up while you\'re top of mind.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'View-triggered follow-up. "Glad you had a chance to watch! Any thoughts on [the topic from the video]?" One line, one question. Make it easy to reply. If they watched the whole thing, be more direct with a meeting ask. Under 40 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 32. Swag/Company Merchandise ───────────────────────────────────────────
  {
    name: 'Swag/Company Merchandise',
    description:
      'Deploy branded swag strategically — after key milestones, at conferences, and as champion appreciation. Low-cost, high-frequency touchpoints.',
    triggerType: 'swag_merch',
    priority: 3,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['All contacts (low cost = high volume)', 'Champions', 'Conference targets', 'New customers'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0 },
    expectedOutcome: 'Brand awareness, customer appreciation, conference booth traffic, low-cost ongoing touchpoint',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Milestone-Based Swag',
        name: 'Send after key milestones (demo, proposal, close)',
        description: 'Send swag after key deal milestones as a celebration and relationship reinforcement.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'task',
        promptHint: 'Milestone swag plan. Map swag to milestones: (1) After first demo — branded notebook + pen, (2) After proposal — premium item (hoodie, backpack), (3) After close — welcome kit for the team. Include personalized note with each. Track: milestone trigger, item, shipping address.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Personalized Note',
        name: 'Include personalized note',
        description: 'Every swag shipment includes a brief personalized note referencing the milestone or relationship.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'task',
        promptHint: 'Swag note draft. Brief and warm — "Congrats on [milestone]! A small something from our team." Or: "Thanks for being an amazing champion — you deserve this." 1-2 sentences. No sales message. Just appreciation.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Conference Promotions',
        name: 'Use for conference promotions',
        description: 'Plan swag for upcoming conferences to drive booth traffic and engagement.',
        playId: 'event_invite', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Conference swag plan. (1) Booth giveaways (t-shirts, stickers, water bottles) to drive traffic, (2) Premium items for scheduled meetings, (3) VIP gifts for exec meetings in the suite. Plan quantities and logistics. The swag should be high-quality — something people actually want to wear/use.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Champion Appreciation',
        name: 'Send to champions (appreciation)',
        description: 'Send appreciation swag to champions who\'ve been advocates — reinforce the relationship.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Champion appreciation email. "You\'ve been an incredible advocate and I wanted to show our appreciation." Let them know something is on its way. Reference a specific thing they did (referenced you in a meeting, gave a testimonial, introduced a colleague). Under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Customer Appreciation',
        name: 'Customer appreciation touchpoint',
        description: 'Regular customer appreciation swag — quarterly or after support milestones.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Customer appreciation touchpoint. "Just a small token of thanks for being a valued customer." Include a brief update on what\'s new or an upcoming event. Turn the swag into a touchpoint for engagement. Under 60 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 5 — Customer Success (9 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 33. Customer Reference Program ─────────────────────────────────────────
  {
    name: 'Customer Reference Program',
    description:
      'Build and manage a customer reference program — recruit top customers with incentives, match references to prospects, and track participation.',
    triggerType: 'reference_program',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['C-Suite (exec-to-exec)', 'Department heads', 'Power users', 'Champions'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '70-80% reference-backed deals close, 30% higher close rates, 20-30% faster sales cycles',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Top Customers',
        name: 'Identify top 20% most successful customers',
        description: 'Internal step — identify the most successful customers based on outcomes, satisfaction, and willingness to advocate.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Reference program recruitment list. Identify top 20% customers by: (1) Measurable success metrics (ROI, adoption, satisfaction), (2) Relationship quality (NPS, CSM feedback), (3) Willingness to advocate (have they spoken publicly?), (4) Strategic fit — diverse industries, company sizes, and use cases for broad matching. Create a prioritized recruitment list.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Recruit with Incentives',
        name: 'Recruit with incentives (credits, gifts, priority support)',
        description: 'Recruit customers into the reference program with compelling incentives.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Reference program recruitment email. "Your success story is incredible, and I think other [industry] leaders would love to hear it." Outline what\'s in it for them: credits, priority support, exclusive access, gift. Explain the commitment: 2-3 calls per quarter, max 30 minutes each. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Match to Prospects',
        name: 'Match references to similar prospects',
        description: 'Create a matching system to pair references with prospects by industry, size, and use case.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Reference matching framework. For each reference: (1) Industries they can speak to, (2) Use cases they\'ve implemented, (3) Company size range they\'re credible for, (4) Executive level willing to speak, (5) Availability and preferences. Create a matching matrix for quick reference selection.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Schedule Reference Calls',
        name: 'Schedule reference calls for key deals',
        description: 'For deals in late stages, schedule matched reference calls.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Reference call scheduling email to the prospect. "I\'d like to connect you with [Reference Name] at [Company] — they faced a similar challenge and I think you\'d find the conversation valuable." Propose 2-3 times. Brief the reference beforehand on the prospect\'s situation. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Track & Reward',
        name: 'Track and reward participation',
        description: 'Track reference participation and ensure advocates are recognized and rewarded.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Reference appreciation email. "Thank you for taking the time to speak with [Prospect]. Your insight made a real impact." Send a small gift or credit as thanks. Track: (1) Number of calls completed, (2) Deal outcomes influenced, (3) Reference satisfaction. Quarterly recognition for top advocates. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 34. Customer Case Study Creation ───────────────────────────────────────
  {
    name: 'Customer Case Study Creation',
    description:
      'Systematically create customer case studies — identify strong results, interview customers, produce multi-format assets, and reward participants.',
    triggerType: 'case_study_creation',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'ENGINEERING', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['Executive sponsors', 'Product users', 'Department heads', 'Champions'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '15-20 quality case studies annually, increase win rate 25-30%, deepen customer relationships',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Strong Results',
        name: 'Identify customers with strong results (3-5 per quarter)',
        description: 'Internal step — select customers with measurable, compelling results for case study development.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Case study candidate selection. Identify 3-5 customers per quarter with: (1) Quantifiable results (revenue impact, time saved, cost reduction), (2) Willingness to be public, (3) Diverse industries for broad applicability, (4) Compelling narrative (challenge → solution → result). Prioritize by sales team demand — which stories would close the most deals?',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Customer Interview',
        name: 'Interview customer and capture metrics',
        description: 'Conduct a structured interview to capture the customer\'s story and key metrics.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'Case study interview setup. Email to schedule: "We\'d love to feature your success story. It\'s a 30-minute conversation — we handle all the writing." Interview guide: (1) What challenge did you face?, (2) Why did you choose us?, (3) What results have you seen? (specific numbers), (4) What would you say to someone considering us? Under 100 words for email.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Multi-Format Assets',
        name: 'Create multi-format assets (written, video, one-pager)',
        description: 'Produce the case study in multiple formats for different use cases.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Asset production plan. From one interview, create: (1) Full written case study (2 pages), (2) Executive one-pager with key metrics, (3) Video testimonial script (if customer agrees), (4) Social media quotes, (5) Slide for sales decks. Ensure all assets highlight the same 3 key metrics. Coordinate customer approval process.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Promote to Similar Prospects',
        name: 'Promote to similar prospects',
        description: 'Distribute the case study to prospects with matching industry, size, or use case.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Case study promotion email to matching prospects. "I wanted to share how [Customer Company] achieved [key result] — their situation is very similar to yours." Include a link to the full case study and highlight the 2-3 most relevant metrics. Offer a reference call. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Reward Customer',
        name: 'Reward customer',
        description: 'Thank and reward the customer for participating in the case study.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Customer thank you email. "Your case study is live and it\'s already making an impact." Share the published link. Send a thank-you gift or credit. Offer to promote THEM (LinkedIn feature, conference speaking opportunity). Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 35. Customer Advisory Board ────────────────────────────────────────────
  {
    name: 'Customer Advisory Board',
    description:
      'Manage a Customer Advisory Board (CAB) — recruit top customers, host quarterly meetings with product team, and leverage for retention and expansion.',
    triggerType: 'advisory_board',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['C-Suite', 'VP-level product stakeholders', 'Champions'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '95%+ retention of CAB members, $5-10M expansion pipeline, stronger product-market fit',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Invite Top 15-20 Customers',
        name: 'Invite top 15-20 customers (by ARR + strategic fit)',
        description: 'Select and invite the top 15-20 customers based on ARR and strategic alignment.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'CAB invitation. Ultra-exclusive — "We\'re forming a Customer Advisory Board of 15-20 leaders who will directly shape our product direction." Explain the commitment (quarterly meetings, 12-month term), the benefits (first access, product influence, peer networking, VIP support), and why they were selected. Under 150 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 2, dayOffset: 1, label: 'Quarterly Product Meeting',
        name: 'Quarterly meetings with product team',
        description: 'Host the quarterly CAB meeting with your product team — structured agenda with feedback loops.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'CAB meeting facilitation guide. Agenda: (1) Product update and roadmap preview (20 min), (2) Feature prioritization exercise (30 min), (3) Open discussion on challenges (20 min), (4) Peer networking and breakouts (20 min). Talking points for each section. Ensure every member gets airtime. Capture all feedback systematically.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Influence Roadmap',
        name: 'Influence roadmap and provide feedback',
        description: 'Show CAB members how their feedback directly influences the product roadmap.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Post-meeting follow-up. "Thank you for your input. Here\'s how your feedback is shaping our roadmap: [specific examples]." Show the direct connection between their suggestions and product decisions. This reinforces the value of their participation. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Executive Networking',
        name: 'Executive networking and peer learning',
        description: 'Facilitate peer connections between CAB members for additional value.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Networking facilitation plan. Identify synergies between CAB members: (1) Who would benefit from meeting each other? (2) Shared challenges that could lead to peer learning, (3) Potential introductions that add value, (4) Follow-up topics from the meeting that could spark offline conversations. The network effect increases stickiness.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'VIP Retention & Expansion',
        name: 'VIP treatment (retention + expansion)',
        description: 'Use CAB membership as a retention and expansion lever — VIP treatment and proactive success management.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'VIP follow-up and expansion outreach. For each CAB member: (1) Personalized update on their requested features, (2) Expansion opportunity based on roadmap alignment, (3) Proactive risk mitigation if any concerns surfaced. Talking points for the 1:1 follow-up: how to transition from CAB engagement to expansion conversation. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 36. Customer Awards Program ────────────────────────────────────────────
  {
    name: 'Customer Awards Program',
    description:
      'Run a customer awards program — create outcome-based categories, nominate winners, announce publicly, and leverage for advocacy and references.',
    triggerType: 'awards_program',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['C-Suite', 'Department heads', 'Champions', 'Power users'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: 'Customer retention, advocacy and reference pipeline, case study content, gamification of product adoption',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Create Award Categories',
        name: 'Create award categories tied to business outcomes',
        description: 'Design award categories that highlight business outcomes, not just product usage.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Award category design. Create 4-6 categories tied to outcomes: (1) Innovation Award (most creative use case), (2) Impact Award (highest measurable ROI), (3) Champion Award (strongest internal advocate), (4) Transformation Award (most significant process change), (5) Community Award (most helpful to other customers). Each category should have clear criteria.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Nominate & Select Winners',
        name: 'Nominate and select winners (3-5 per category)',
        description: 'Gather nominations from the sales and success teams, then select winners.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Nomination and selection process. (1) Collect nominations from AEs and CSMs, (2) Score against criteria, (3) Select 3-5 finalists per category, (4) Verify winners are willing to be public, (5) Prepare award materials: trophy/certificate, press release draft, social media content. Ensure industry diversity among winners.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Public Announcement',
        name: 'Announce at user conference or publicly',
        description: 'Announce winners publicly — at the user conference, on social media, and via press release.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'email',
        promptHint: 'Winner announcement email. "Congratulations — you\'ve won the [Award Category]!" Explain what they won, how they\'ll be recognized (conference stage, press release, social media), and next steps. Offer to coordinate with their marketing team for co-promotion. Under 120 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 4, dayOffset: 7, label: 'Case Studies of Winners',
        name: 'Create case studies of winners',
        description: 'Convert award winners into detailed case studies.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Case study request to award winners. "We\'d love to tell your award-winning story in more detail." Offer to handle all writing, they just approve. The award gives them a reason to say yes. Reference their specific achievement. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Advocacy & References',
        name: 'Use for advocacy and references',
        description: 'Recruit award winners into the reference and advocacy programs.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Advocacy recruitment email. "Your award-winning results make you the perfect voice for [category]. Would you be open to occasionally sharing your experience with companies facing similar challenges?" Low commitment ask. Position as thought leadership for them. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 37. Co-Marketing Opportunity ───────────────────────────────────────────
  {
    name: 'Co-Marketing Opportunity',
    description:
      'Partner with customers on co-marketing content — joint webinars, blog posts, and videos that benefit both audiences and generate new opportunities.',
    triggerType: 'co_marketing',
    priority: 5,
    targetDepartmentTypes: ['MARKETING', 'EXECUTIVE', 'PRODUCT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Customer marketing teams', 'Customer executives', 'Subject matter experts'],
    timingConfig: { validWindowDays: 56, triggerDaysBefore: 0 },
    expectedOutcome: 'Reach customer audience, social proof, customer retention, 10-20 new opportunities per co-marketing activity',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Co-Marketing Partners',
        name: 'Identify customers willing to co-present',
        description: 'Identify customers with strong results and a marketing team willing to collaborate.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Co-marketing partner identification. Look for customers with: (1) Measurable results to share, (2) Active marketing presence (blog, social, events), (3) Good relationship and willingness to advocate, (4) Complementary audience you want to reach. Suggest 3-5 candidates with specific co-marketing ideas for each.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Create Joint Content',
        name: 'Create joint content (webinar, blog, video)',
        description: 'Propose a co-marketing collaboration and agree on the content format.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Co-marketing proposal email. "We think there\'s a great story to tell together. Here\'s what we had in mind…" Propose 2-3 content ideas (joint webinar, co-authored blog, video interview). Explain the mutual benefit: they get thought leadership and exposure, you get credibility and reach. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Co-Promote to Both Audiences',
        name: 'Co-promote to both audiences',
        description: 'Develop a joint promotion plan that leverages both companies\' audiences.',
        playId: 'event_invite', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Co-promotion plan. (1) Their channels: newsletter, social, website, (2) Your channels: email database, social, partners, (3) Cross-promotion timeline: who promotes when, (4) Tracking: unique URLs or codes to measure each audience\'s contribution, (5) Follow-up plan for leads from their audience.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Customer Gets Exposure',
        name: 'Customer gets exposure + thought leadership',
        description: 'Ensure the customer gets meaningful exposure and thought leadership value from the collaboration.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Exposure delivery email. Share the results with the customer: "Your webinar/post reached [X] people and got [Y] engagement." Send them all assets to reshare. Offer additional exposure: "Would your team like to write a follow-up post for our blog?" Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'New Prospect Reach',
        name: 'Get credibility + new prospect reach',
        description: 'Follow up with new leads generated from the customer\'s audience.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'New lead follow-up from co-marketing. For leads from the customer\'s audience: "You may have seen the [webinar/post] we did with [Customer Company]. I\'d love to share how we can help your team achieve similar results." Reference the co-marketing content as social proof. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 38. Executive Business Review (QBR) ────────────────────────────────────
  {
    name: 'Executive Business Review (QBR)',
    description:
      'Run a structured Quarterly Business Review — custom metrics report, executive alignment, expansion opportunity identification, and mutual goal setting.',
    triggerType: 'qbr',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'IT', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Energy'],
    targetPersonas: ['Executive sponsor', 'Department heads', 'Champions', 'Your account team'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 30 },
    expectedOutcome: '80%+ customer retention, identify 30-40% expansion opportunities, proactive issue resolution',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Prepare Custom Report',
        name: 'Prepare custom report with metrics/outcomes',
        description: 'Build a comprehensive metrics report showing value delivered, usage trends, and business impact.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'QBR preparation. Compile: (1) Usage metrics and trends (up/down, why), (2) Business outcomes achieved vs goals set last quarter, (3) Support ticket analysis — themes and resolution quality, (4) Adoption metrics by team/department, (5) ROI calculation update, (6) Benchmark comparison vs peers. Create an executive-ready presentation.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Schedule with Exec Sponsor',
        name: 'Schedule with executive sponsor + team',
        description: 'Schedule the QBR with the executive sponsor and ensure key stakeholders attend.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'QBR scheduling email. "It\'s time for our quarterly review — I\'ve prepared a comprehensive update on your team\'s results." Suggest 2-3 time slots (60-90 min). Request the executive sponsor, department heads, and champions attend. Share a brief agenda preview. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Review Success & Challenges',
        name: 'Review success, challenges, and roadmap',
        description: 'During the QBR, review successes, address challenges, and share relevant roadmap updates.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'QBR facilitation talking points. Structure: (1) Celebrate wins — lead with their successes (15 min), (2) Address challenges honestly — what\'s not working and your plan to fix it (15 min), (3) Roadmap alignment — what\'s coming that matters to them (15 min), (4) Expansion discussion — "based on your success, here\'s what else we can do" (15 min). Ask great questions.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Identify Expansion',
        name: 'Identify expansion opportunities',
        description: 'Post-QBR analysis — identify expansion signals, at-risk indicators, and action items.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Post-QBR analysis. Document: (1) Expansion opportunities surfaced (new departments, use cases, seats), (2) At-risk signals (declining usage, unresolved issues, competitor mentions), (3) Action items for both sides, (4) Relationship health assessment. Create follow-up plan with timelines for each opportunity and risk.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Mutual Goals for Next Quarter',
        name: 'Align on mutual goals for next quarter',
        description: 'Send a follow-up confirming mutual goals and next steps for the upcoming quarter.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'QBR follow-up email. "Thank you for a great review. Here\'s a summary of what we agreed on for next quarter: [goals, action items, timeline]." Include expansion proposals naturally. Set the date for the next QBR. Under 150 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 39. Customer Expansion Workshop ────────────────────────────────────────
  {
    name: 'Customer Expansion Workshop',
    description:
      'Drive customer expansion through structured discovery — review current usage, map untapped capabilities, identify new departments, and build an expansion business case.',
    triggerType: 'expansion_workshop',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'ENGINEERING', 'IT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['Current department heads', 'Champions', 'New department heads', 'Cross-functional leaders', 'Executive sponsor'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '50-60% result in expansion opportunity, $50-200K average expansion, multi-department adoption',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Review Current Usage',
        name: 'Review current usage and adoption',
        description: 'Analyze current usage patterns to identify underutilized capabilities and expansion potential.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Usage analysis. Review: (1) Which features are heavily used vs untouched, (2) How many licensed users are active, (3) Departments currently using the product, (4) Adjacent departments with similar needs, (5) Usage compared to similar-sized customers. Identify the biggest gaps between current usage and full potential.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Unused Feature Discovery',
        name: 'Identify unused features and capabilities',
        description: 'Present unused features and capabilities that could deliver additional value.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'Expansion workshop invitation. "We\'ve noticed some opportunities for your team to get even more value. I\'d like to show you capabilities you might not know about." Schedule a 45-minute session. Talking points: for each unused feature, prepare a specific use case relevant to their business. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Map Other Departments',
        name: 'Map other departments with similar needs',
        description: 'Identify other departments in the organization that could benefit from the product.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Department mapping. Based on the workshop: (1) Which other departments have similar workflows?, (2) Who are the department heads? (get introductions from champion), (3) What\'s the estimated value for each department?, (4) What\'s the best way to introduce the product to a new department? Create an expansion territory map.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Expansion Business Case',
        name: 'Create expansion business case',
        description: 'Build a formal expansion business case with ROI projections for the additional scope.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Expansion business case email. "Based on our workshop, here\'s a proposal for expanding your usage." Include: (1) Current value delivered, (2) Additional value from unused features, (3) New department opportunity and projected ROI, (4) Investment required, (5) Implementation timeline. Under 120 words with attached business case document.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'New Department Intros',
        name: 'Introduce to new department stakeholders',
        description: 'Get introductions to new department stakeholders and begin the expansion sales cycle.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'New department intro email (via champion introduction). "Hi [New Department Head], [Champion] suggested we connect — their team has been seeing great results with [product] and thought your team might benefit too." Reference the champion\'s success metrics. Offer a brief overview. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 40. Customer Testimonial (Video) ───────────────────────────────────────
  {
    name: 'Customer Testimonial (Video)',
    description:
      'Produce professional video testimonials from willing customers — coordinate production, conduct customer interviews, edit into multiple formats, and deploy across sales and marketing.',
    triggerType: 'testimonial_video',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail'],
    targetPersonas: ['Executive sponsors', 'Department heads', 'Power users', 'Champions'],
    timingConfig: { validWindowDays: 56, triggerDaysBefore: 0 },
    expectedOutcome: '3-5 quality videos per year, website conversion increase 20-30%, powerful sales enablement',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Willing Customers',
        name: 'Identify willing customers with great stories',
        description: 'Select customers with compelling results who are willing to appear on camera.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Video testimonial candidate list. Identify customers with: (1) Strong quantifiable results, (2) Articulate spokespeople (check their LinkedIn videos/speaking), (3) Well-known company name for credibility, (4) Willingness confirmed by CSM, (5) Diverse industries for broad appeal. Shortlist 5-8 candidates for 3-5 final videos.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Coordinate Production',
        name: 'Coordinate video production',
        description: 'Coordinate logistics for video production — remote or on-site, schedule, and equipment.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Video testimonial request email. "We\'d love to capture your story on video — it\'s a simple 30-minute remote interview and we handle all editing." Explain the process: questions in advance, professional remote recording, their approval before publishing. Offer to do it at their office or ours. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Customer Interview',
        name: 'Customer interview format (3-5 min)',
        description: 'Conduct the video interview with pre-shared questions and a conversational format.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Video interview guide. Questions: (1) What challenge were you facing?, (2) How did you find and choose us?, (3) What results have you achieved? (specific numbers), (4) What would you tell someone considering us?, (5) What surprised you most? Tips: warm up with off-camera chat, keep it conversational, aim for 15-20 min raw for a 3-5 min final cut.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Edit Multiple Formats',
        name: 'Edit into multiple formats',
        description: 'Edit the raw footage into multiple formats: full testimonial, 30-second clips, social cuts.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Video editing plan. From one interview, create: (1) Full testimonial (3-5 min) for website and sales, (2) 30-60 second highlight clip for email signatures and social, (3) Quote cards with key soundbites for social media, (4) Audio clip for podcast or internal enablement. Send customer the final cuts for approval before publishing.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Deploy Across Channels',
        name: 'Use across website, sales, and social',
        description: 'Deploy the video across all channels — website, sales decks, email sequences, social media.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Video deployment plan. Distribute: (1) Website — landing page, homepage, case study page, (2) Sales — include in prospect-facing emails, (3) Social — publish clips with customer tagged, (4) Internal — enable sales team with talking points. Track views and engagement. Share performance data with the customer. Send customer a thank-you gift.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 41. Customer Advocacy on Social ────────────────────────────────────────
  {
    name: 'Customer Advocacy on Social',
    description:
      'Build a social media advocacy program — provide customers with draft posts, spotlight their success, engage with their content, and reward active advocates.',
    triggerType: 'social_advocacy',
    priority: 3,
    targetDepartmentTypes: ['MARKETING', 'EXECUTIVE', 'PRODUCT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media'],
    targetPersonas: ['Champions', 'Marketing teams', 'Executives', 'Power users'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: 'Organic social proof, reach new audiences, build customer community, identify strongest advocates',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Provide Draft Social Posts',
        name: 'Provide draft social posts to customers',
        description: 'Create ready-to-post social media content that customers can easily share.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Social content package email. "We created a few posts you might want to share — feel free to edit or use as-is." Include 3-4 draft LinkedIn posts they can customize: (1) About a result they achieved, (2) About a feature they love, (3) About the partnership, (4) An industry insight using your data. Make them sound like the customer, not marketing. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Tag Customer in Success Posts',
        name: 'Tag customer in your posts about their success',
        description: 'Create posts on your company\'s social channels featuring the customer\'s success and tag them.',
        playId: 'champion_enablement', assetTypes: ['linkedin'], channel: 'linkedin',
        promptHint: 'Customer spotlight LinkedIn post draft. "Shoutout to [Customer Company] for [achievement]." Include specific metrics and tag the customer contact. Make it about THEIR success, not your product. Draft for the company page and the AE\'s personal feed. Under 100 words each.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Engage with Their Posts',
        name: 'Engage with customer\'s organic posts',
        description: 'Systematically engage with the customer\'s organic social media content — likes, comments, shares.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Social engagement plan. (1) Set alerts for customer posts, (2) Like and comment on their thought leadership content, (3) Share their posts with your audience when relevant, (4) Add insightful comments (not just "Great post!"), (5) Connect with their team members. Build genuine social rapport. Track engagement frequency.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Customer Spotlight Series',
        name: 'Run customer spotlight series on social',
        description: 'Run a recurring customer spotlight series featuring one customer per week or month.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Spotlight series plan. Monthly format: (1) Short Q&A with the customer (5 questions), (2) Photo or video clip, (3) Key metrics and quote, (4) Posted on company social + tagged. Ask customers for permission. Create a content calendar with 3-6 months of spotlights. Ensure industry diversity.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'Reward Active Advocates',
        name: 'Reward most active advocates',
        description: 'Recognize and reward customers who are most active in social advocacy.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Advocate recognition email. "You\'ve been an incredible advocate on social — we wanted to say thank you." Include: (1) Specific posts or engagement you noticed, (2) Impact metrics (reach, engagement), (3) A reward (gift, credits, conference pass). Ask if they\'d be interested in more formal advocacy opportunities. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 6 — Sales Motions (9 plays)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 42. Free Trial / Freemium ──────────────────────────────────────────────
  {
    name: 'Free Trial / Freemium',
    description:
      'Drive trial adoption as a bottom-up acquisition motion — promote in outreach, track usage, trigger sales touchpoints based on behavior, and convert with onboarding and limited-time offers.',
    triggerType: 'free_trial',
    priority: 5,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Media', 'Education'],
    targetPersonas: ['Individual contributors', 'Team leads', 'Small business owners', 'Anyone wanting hands-on evaluation'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '20-30% trial-to-paid conversion, product-qualified leads, reduce SMB sales cycle, bottoms-up adoption',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Promote Trial in Outreach',
        name: 'Promote trial in outreach sequences',
        description: 'Include the free trial offer in outreach sequences as a low-friction entry point.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Trial promotion email. "See it in action — start a free trial, no credit card required." Position the trial as the easiest way to evaluate. Include: what they get in the trial, how long it lasts, and a link to start. Keep it friction-free. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Track Usage & Engagement',
        name: 'Track trial usage and engagement',
        description: 'Monitor trial usage patterns to identify high-value users and trigger sales actions.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Trial engagement tracking plan. Define key metrics: (1) Daily active usage, (2) Features explored, (3) Team invitations sent, (4) Key actions completed (imports, integrations, reports). Set thresholds: high engagement → AE outreach, medium → automated nurture, low → re-engagement email. Score each trial user for sales prioritization.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Behavior-Based Touchpoints',
        name: 'Trigger sales touchpoints based on behavior',
        description: 'When trial users hit key engagement milestones, trigger personalized sales outreach.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Behavior-triggered outreach. "I noticed you\'ve been exploring [feature area] — I can show you how to get even more out of it." Reference their specific usage pattern. Offer a 15-minute call to answer questions and show advanced capabilities. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'White-Glove Onboarding',
        name: 'Offer white-glove onboarding to high-value',
        description: 'For high-value trial users, offer personalized onboarding to accelerate adoption.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'White-glove onboarding offer. For enterprise-grade trial users: "I\'d love to personally walk your team through setup and show you some shortcuts we\'ve learned from similar companies." Offer a 30-minute onboarding session. Mention you can import their existing data. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Convert with Limited-Time Offer',
        name: 'Convert to paid with limited-time offer',
        description: 'As the trial nears its end, present a conversion offer with a time-limited incentive.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Trial conversion email. "Your trial ends in [X] days — here\'s how to keep everything you\'ve built." Highlight what they\'ll lose if they don\'t convert. Include a limited-time incentive (discount, extended trial, bonus features). Make the conversion process simple — one-click upgrade. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 43. Proof of Concept (POC) ─────────────────────────────────────────────
  {
    name: 'Proof of Concept (POC)',
    description:
      'Run a structured POC with mutually agreed success criteria — dedicated support, weekly check-ins, and seamless conversion to paid when criteria are met.',
    triggerType: 'poc',
    priority: 8,
    targetDepartmentTypes: ['ENGINEERING', 'IT', 'PRODUCT', 'OPERATIONS', 'EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['Technical evaluators', 'Department heads', 'Executive sponsor', 'Full buying committee'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '60-70% POC-to-close conversion, de-risk large deals, demonstrate clear ROI, build internal champions',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Agree on Success Criteria',
        name: 'Agree on success criteria upfront (mutual close plan)',
        description: 'Establish mutually agreed success criteria before starting the POC — this becomes the close plan.',
        playId: 'new_buying_group', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'POC kickoff email and success criteria framework. "Before we start, let\'s agree on what success looks like." Propose: (1) 3-5 measurable success criteria, (2) Timeline (30-60-90 days), (3) Who evaluates results, (4) What happens if criteria are met (commitment to purchase). Talking points for the alignment meeting. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Dedicated Onboarding',
        name: 'Dedicated onboarding and support',
        description: 'Provide white-glove onboarding and dedicated support throughout the POC.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'POC onboarding email. "Your dedicated team for this POC is…" Introduce the support team (SE, CSM, exec sponsor). Include the onboarding plan, key contacts, and escalation path. Set expectations for response times. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Weekly Check-Ins',
        name: 'Weekly check-ins and progress tracking',
        description: 'Conduct weekly check-ins to track progress against success criteria and address blockers.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'meeting',
        promptHint: 'Weekly check-in guide. For each check-in: (1) Review progress against each success criterion, (2) Identify and resolve blockers, (3) Capture wins — even small ones, (4) Note expansion signals, (5) Maintain momentum — what happens before next check-in. Document progress to build the business case.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Capture Business Value',
        name: 'Capture wins and business value',
        description: 'Document every win and piece of business value generated during the POC.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Mid-POC value capture email. "Here\'s what we\'ve achieved so far in your POC…" Summarize progress against each success criterion with specific metrics. Highlight any surprises or bonus value discovered. Share with the executive sponsor — not just the technical team. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Seamless Paid Transition',
        name: 'Convert to paid with seamless transition',
        description: 'When success criteria are met, execute the pre-agreed close plan and transition to paid.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'POC conclusion and conversion email. "Your POC results are in, and you\'ve exceeded [X] of [Y] success criteria." Present the results summary. Reference the agreed close plan. Make the transition seamless — "Everything you\'ve built stays exactly as is." Talking points for the close conversation. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 44. Pilot Program ──────────────────────────────────────────────────────
  {
    name: 'Pilot Program',
    description:
      'Run a defined pilot program — scope one team or use case, measure outcomes, create an internal success story, and expand to other departments.',
    triggerType: 'pilot_program',
    priority: 8,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Energy'],
    targetPersonas: ['One department (10-50 users)', 'Department head', 'Executive sponsor', 'Champions'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '70-80% expand to full rollout, internal proof point for broader adoption, 5-10x expansion potential',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Define Pilot Scope',
        name: 'Define pilot scope (one team, one use case)',
        description: 'Define the pilot scope — one team, one use case, with clear success metrics.',
        playId: 'new_buying_group', assetTypes: ['email', 'talking_points'], channel: 'meeting',
        promptHint: 'Pilot scoping email. "Let\'s start with a focused pilot so you can see results quickly." Propose: (1) One team (10-50 users), (2) One primary use case, (3) 60-90 day timeline, (4) Specific metrics to track. Talking points: why starting small is smart, how this de-risks the decision, the expansion path. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Measure vs Baseline',
        name: 'Measure outcomes vs baseline',
        description: 'Establish baselines before the pilot begins and measure outcomes throughout.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Baseline measurement plan. Before the pilot starts: (1) Document current metrics (time spent, error rates, costs, satisfaction), (2) Set up tracking for pilot metrics, (3) Define the comparison methodology, (4) Plan for weekly measurement check-ins, (5) Create a simple dashboard the customer can access. The data will be the expansion business case.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Create Internal Success Story',
        name: 'Create success story from pilot',
        description: 'As results come in, build an internal success story the champion can share with other departments.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Mid-pilot success snapshot. "Here\'s a quick summary of what your team has achieved in the first [X] weeks." Include 2-3 specific metrics showing improvement vs baseline. Format it so the champion can forward to their exec — clean, professional, data-driven. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Expand to Other Departments',
        name: 'Expand to other departments/regions',
        description: 'Use pilot results to pitch expansion to other departments, regions, or use cases.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'Expansion pitch email (via champion intro to new department). "Based on [Pilot Team]\'s results — [key metric] — we think your team could see similar or better outcomes." Include the pilot results as proof. Offer a brief overview tailored to their department. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Pilot-to-Business Case',
        name: 'Use pilot results in business case',
        description: 'Package pilot results into a formal business case for full rollout.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Pilot conclusion and expansion business case. "Your pilot results speak for themselves: [key metrics]." Present the case for full rollout: (1) Pilot results, (2) Projected organization-wide impact, (3) Implementation plan, (4) Investment and ROI. Talking points for the expansion conversation. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 45. Competitive Displacement Play ──────────────────────────────────────
  {
    name: 'Competitive Displacement Play',
    description:
      'Target accounts using a specific competitor — research weaknesses, build differentiation messaging, offer migration incentives, and provide risk-reversal guarantees.',
    triggerType: 'competitive_displacement',
    priority: 8,
    targetDepartmentTypes: ['IT', 'ENGINEERING', 'PRODUCT', 'OPERATIONS', 'EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Economic buyers', 'Technical evaluators', 'End users frustrated with competitor', 'Champions'],
    timingConfig: { validWindowDays: 180, triggerDaysBefore: 0 },
    expectedOutcome: '20-30% competitive win rate, premium pricing vs competitor, market share gains, 6-12 month deal cycle',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Competitor Accounts',
        name: 'Identify accounts using target competitor',
        description: 'Build a target list of accounts known to use the competitor.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Competitive target list. Identify accounts using [competitor] through: (1) Technographic data, (2) Job postings mentioning the tool, (3) Customer intel from references, (4) Social media mentions, (5) Review sites (G2, Gartner Peer Insights). For each, note contract renewal timing if known. Prioritize by deal size and likelihood to switch.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Research Competitor Weaknesses',
        name: 'Research competitor weaknesses and complaints',
        description: 'Deep-dive into competitor weaknesses, common complaints, and switching triggers.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Competitive intelligence brief. Research: (1) G2/Gartner reviews — common complaints, (2) Reddit/community discussions — frustrations, (3) Recent product changes that upset users, (4) Pricing changes or policy shifts, (5) Known technical limitations. Map each weakness to your corresponding strength. Create a "why they switch" narrative.',
        assignedRole: 'ae',
      },
      {
        order: 3, dayOffset: 3, label: 'Differentiation Messaging',
        name: 'Build competitive differentiation messaging',
        description: 'Craft outreach messaging that highlights key differentiators without explicitly bashing the competitor.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Competitive displacement outreach. Don\'t lead with "your current tool sucks." Instead: "Companies like [reference customer] recently moved to us because [key differentiator]. The results: [metrics]." Focus on outcomes, not features. Include a switch story if available. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Migration Incentives',
        name: 'Offer migration assistance and incentives',
        description: 'Reduce switching friction with migration assistance, data transfer support, and financial incentives.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'email',
        promptHint: 'Migration offer email. "Switching shouldn\'t be painful — we handle the heavy lifting." Include: (1) Free migration service, (2) Data transfer support, (3) Overlapping licenses during transition, (4) Training for the team. If applicable, offer to buy out their remaining contract. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Risk-Reversal Guarantee',
        name: 'Risk-reversal guarantees',
        description: 'Offer risk-reversal guarantees to eliminate the perceived risk of switching.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Risk-reversal offer. "We\'re so confident you\'ll see better results that we\'ll [guarantee]." Options: money-back guarantee, performance guarantee, free rollback support. Talking points for handling "but switching is risky" objections. The goal: make saying yes less risky than staying with the competitor. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 46. Renewal Expansion Play ─────────────────────────────────────────────
  {
    name: 'Renewal Expansion Play',
    description:
      'Start renewal conversations 90-120 days early — review usage, build expansion cases, bundle renewal with growth, and lock in multi-year commitments.',
    triggerType: 'renewal_expansion',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE', 'FINANCE', 'PRODUCT', 'OPERATIONS', 'IT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Energy'],
    targetPersonas: ['Executive sponsor', 'Economic buyer', 'Department heads', 'Champions', 'CSM + AE'],
    timingConfig: { validWindowDays: 120, triggerDaysBefore: 120 },
    expectedOutcome: '40-50% renewals include expansion, 20-30% ARR growth per renewal, multi-year lock-in',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Start 90-120 Days Early',
        name: 'Start renewal 90-120 days early',
        description: 'Begin the renewal process 90-120 days before expiration — never wait for the deadline.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Pre-renewal strategy. 90-120 days out: (1) Account health check — NPS, usage, open issues, (2) Risk assessment — any churn signals?, (3) Expansion opportunity sizing — which departments, features, seats?, (4) Champion health — is our champion still engaged and influential?, (5) Competitive landscape — any threats? Create a renewal + expansion plan.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Usage Review & Expansion ID',
        name: 'Conduct usage review and identify expansion',
        description: 'Review usage data and present an expansion opportunity to the champion.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Usage review meeting request. "Your renewal is coming up and I\'d love to review the incredible results your team has achieved." Schedule a 30-minute usage review. Come with: (1) Usage highlights, (2) ROI metrics, (3) Unused features they\'d benefit from, (4) Expansion possibilities. Frame it as a success review, not a sales pitch. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Build Expansion Business Case',
        name: 'Build expansion business case with ROI',
        description: 'Create a formal expansion business case showing the ROI of additional investment.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Expansion business case email. "Based on your team\'s results, here\'s the case for expanding: [projected ROI for additional scope]." Include: (1) Current value delivered, (2) Projected value from expansion, (3) Net new departments/use cases, (4) Investment breakdown. Talking points for the expansion conversation. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Bundle Renewal + Expansion',
        name: 'Bundle renewal + expansion with discount',
        description: 'Present a bundled renewal and expansion proposal with a discount incentive.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Bundled proposal email. "Here\'s a proposal that includes your renewal and the expansion we discussed — bundled for a [X]% savings." Present two options: (1) Renewal only (current scope), (2) Renewal + expansion (with discount). Make option 2 clearly better value. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Multi-Year Price Lock',
        name: 'Multi-year deal for price lock',
        description: 'Offer a multi-year commitment with price protection as additional incentive.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Multi-year offer email. "Lock in today\'s pricing with a multi-year commitment." Include: (1) Price protection guarantee, (2) Budget predictability benefit, (3) Additional discount for multi-year, (4) Growth tiers built in. Talking points for handling objections: "What if our needs change?", "What about flexibility?" Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 47. Executive Sponsorship Program ──────────────────────────────────────
  {
    name: 'Executive Sponsorship Program',
    description:
      'Match your executives with customer executives for ongoing 1:1 strategic relationships — quarterly check-ins, industry advisory, and VIP treatment.',
    triggerType: 'exec_sponsorship',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Energy'],
    targetPersonas: ['Customer C-Suite matched with your C-Suite'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '95%+ retention for sponsored accounts, 2-3x expansion vs non-sponsored, executive champions, competitive insulation',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Match Exec to Exec',
        name: 'Match your exec with customer exec (peer level)',
        description: 'Pair your executives with customer executives based on seniority, interests, and strategic fit.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Executive matching plan. For each top-tier account: (1) Identify the customer C-Suite contact, (2) Match with your peer-level exec, (3) Find shared interests or background (alma mater, industry experience, hobbies), (4) Brief your exec on the account context, relationship goals, and expansion potential. Create exec pairing cards with key conversation starters.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Quarterly Strategic Check-Ins',
        name: 'Quarterly strategic check-ins',
        description: 'Schedule the first quarterly strategic check-in between matched executives.',
        playId: 'event_invite', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Executive sponsorship intro email. From your exec to their exec: "I\'ve taken personal responsibility for our partnership with [Company]. I\'d love to schedule a quarterly call to discuss your strategic priorities and how we can better support you." Frame as strategic, not operational. Propose a 30-minute call. Under 100 words.',
        assignedRole: 'ae', requiresApproval: true,
      },
      {
        order: 3, dayOffset: 3, label: 'Industry Advisory',
        name: 'Advisory on industry trends and best practices',
        description: 'Your exec shares relevant industry insights and best practices as a value-add.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Industry insight sharing email from your exec. "I came across this [report/trend/insight] and thought of you." Share something genuinely valuable about their industry. No product mention. Build the reputation of your exec as a trusted advisor. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Network & Resources Access',
        name: 'Access to network and resources',
        description: 'Offer the customer exec access to your executive\'s network, events, and exclusive resources.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Executive value delivery plan. What your exec can offer: (1) Introductions to other industry leaders, (2) Invitations to exclusive events (dinners, roundtables), (3) Early access to research or product roadmap, (4) Advisory on common challenges they\'ve seen across the industry. Map these offerings to each sponsored account\'s needs.',
        assignedRole: 'ae',
      },
      {
        order: 5, dayOffset: 14, label: 'VIP Relationship Building',
        name: 'VIP treatment and relationship building',
        description: 'Ensure sponsored accounts receive VIP treatment across all touchpoints.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'VIP treatment checklist and follow-up. Ensure: (1) Priority support escalation, (2) First access to new features and betas, (3) Conference VIP treatment, (4) Quarterly exec dinner invitations. Follow-up email from your exec after the first call: reference a specific discussion topic and next steps. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 48. Champion Development Program ───────────────────────────────────────
  {
    name: 'Champion Development Program',
    description:
      'Systematically develop internal champions — identify engaged users, enable with tools and content, arm with business cases, connect across accounts, and reward contributions.',
    triggerType: 'champion_development',
    priority: 8,
    targetDepartmentTypes: ['PRODUCT', 'ENGINEERING', 'IT', 'OPERATIONS', 'SALES'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Power users', 'Mid-level managers', 'Directors/VPs', 'Anyone who loves your product'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0 },
    expectedOutcome: '80%+ close rate with strong champion, faster sales cycles, multi-threading through champion, advocacy pipeline',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Potential Champions',
        name: 'Identify potential champions (engaged users)',
        description: 'Spot potential champions based on product engagement, enthusiasm, and internal influence.',
        playId: 'champion_enablement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Champion identification criteria. Look for: (1) High product usage and engagement, (2) Enthusiasm in conversations (asks questions, gives feedback), (3) Internal influence (respected by peers, access to leadership), (4) Career ambition (will they champion if it helps their career?), (5) Political capital (can they push decisions through?). Score and rank potential champions.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Champion Enablement Kit',
        name: 'Provide champion enablement (tools, content, swag)',
        description: 'Equip the champion with everything they need to advocate internally.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Champion enablement email. "I\'ve put together some resources to help you build the case internally." Include: (1) Executive one-pager they can forward, (2) ROI data specific to their use case, (3) Competitive comparison for objection handling, (4) Branded swag as a thank-you. Make them feel like a VIP partner. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Arm with Business Case',
        name: 'Arm with business case and ROI data',
        description: 'Give the champion a polished business case and ROI data they can present to leadership.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Business case for the champion. "Here\'s a one-pager for [their CFO/VP] that makes the case." Include: (1) Exec-ready business case, (2) Talking points for presenting it, (3) How to handle common objections from finance, (4) Questions their exec will ask and suggested answers. Make the champion look like a hero. Email under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Connect Champions Across Accounts',
        name: 'Connect champions across accounts (community)',
        description: 'Build a champion community connecting advocates from different accounts for peer learning.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Champion community invitation. "We\'re building a community of our top champions — would you like to join?" Benefits: (1) Peer networking with other champions, (2) Monthly insider calls with product team, (3) Early access to features, (4) Annual champion summit. Frame it as an exclusive group of power users who shape the product. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Reward & Recognize',
        name: 'Reward and recognize contributions',
        description: 'Formally recognize and reward champion contributions to maintain engagement.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Champion recognition email. "I wanted to thank you for everything you\'ve done — your advocacy has made a real impact." Include: (1) Specific contributions you appreciate, (2) A meaningful reward (gift, credits, conference pass), (3) Continued VIP status. The champion should feel genuinely valued, not just used. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 49. Multi-Year Deal Incentive ──────────────────────────────────────────
  {
    name: 'Multi-Year Deal Incentive',
    description:
      'Present multi-year pricing in proposals — emphasize price lock, budget predictability, and growth tiers to increase deal value and lock in revenue.',
    triggerType: 'multi_year_deal',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'FINANCE', 'PROCUREMENT'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Automotive', 'Retail', 'Energy'],
    targetPersonas: ['CFO and Finance', 'Economic buyers', 'Procurement', 'Executive sponsor'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '20-30% higher deal value, locked-in revenue, customer commitment, faster close via financial incentive',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Multi-Year in Proposals',
        name: 'Offer multi-year pricing in proposals',
        description: 'Include multi-year options alongside single-year pricing in all proposals.',
        playId: 'new_buying_group', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Multi-year proposal email. "I\'ve included two pricing options: annual and multi-year." Present both clearly: (1) Annual price, (2) 2-year price with discount, (3) 3-year price with bigger discount. Highlight the savings. Talking points for the pricing discussion: when to push multi-year, when to accept annual. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 2, dayOffset: 1, label: 'Price Lock Benefit',
        name: 'Emphasize price lock and budget predictability',
        description: 'Sell the value of price lock and budget predictability to the CFO/finance team.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Price lock value email for finance buyers. "Lock in today\'s pricing for [2-3] years — no surprises at renewal." Highlight: (1) Budget predictability, (2) Protection against price increases, (3) Simplified procurement (one deal vs annual renewals), (4) Total savings over the term. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: 'Reduce Renewal Friction',
        name: 'Reduce annual renewal friction',
        description: 'Position multi-year as reducing the annual renewal hassle — one decision vs many.',
        playId: 're_engagement', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Internal strategy for pushing multi-year. Talk tracks for: (1) "We can\'t commit long-term" → growth flexibility clauses, (2) "What if our needs change?" → built-in adjustment provisions, (3) "Our procurement won\'t approve multi-year" → payment flexibility options. Map objections to responses.',
        assignedRole: 'ae',
      },
      {
        order: 4, dayOffset: 7, label: 'Growth Tiers for Expansion',
        name: 'Include growth tiers for expansion',
        description: 'Build growth tiers into the multi-year deal to accommodate expected expansion.',
        playId: 'champion_enablement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Growth-tier proposal email. "We\'ve built in flexibility for your growth: as you add users or departments, pricing scales favorably." Include: (1) Tier structure with pricing at each level, (2) Auto-scaling provisions, (3) How this compares to buying à la carte. Under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Financial Incentive Close',
        name: 'Financial incentive for commitment',
        description: 'Present a final financial incentive to close the multi-year commitment.',
        playId: 're_engagement', assetTypes: ['email'], channel: 'email',
        promptHint: 'Closing incentive email. "To make this decision easier, we\'re offering [specific incentive] if you commit by [date]." Include one compelling financial incentive: bonus credits, free months, additional users, or implementation services. Create urgency without being pushy. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },

  // ── 50. Bundle/Package Deal ────────────────────────────────────────────────
  {
    name: 'Bundle/Package Deal',
    description:
      'Increase deal size through bundling — identify single-product customers, create "better together" packages, and drive platform adoption across departments.',
    triggerType: 'bundle_deal',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE', 'PRODUCT', 'OPERATIONS', 'IT', 'ENGINEERING', 'SALES'],
    targetIndustries: ['Technology', 'Manufacturing', 'Financial Services', 'Healthcare', 'Retail', 'Automotive'],
    targetPersonas: ['Economic buyers', 'Multiple department heads', 'Executive sponsor', 'Champions across departments'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0 },
    expectedOutcome: '40-50% take the bundle, 30-50% higher ACV, platform adoption creating competitive moat',
    steps: [
      {
        order: 1, dayOffset: 0, label: 'Identify Single-Product Users',
        name: 'Identify customers using only one product',
        description: 'Find customers and prospects who are only using one product from your platform.',
        playId: 'new_buying_group', assetTypes: ['talking_points'], channel: 'internal',
        promptHint: 'Bundle opportunity identification. Analyze: (1) Current customers using only one product — which additional product would they benefit from?, (2) Active prospects — can we present a bundle vs single product?, (3) Competitors they use for the other capability. For each account, map the bundle opportunity and estimated deal uplift.',
        assignedRole: 'ae',
      },
      {
        order: 2, dayOffset: 1, label: 'Create Bundled Offer',
        name: 'Create bundled offer at discount',
        description: 'Build a compelling bundled package with a discount that makes the combined offer irresistible.',
        playId: 'feature_release', assetTypes: ['email'], channel: 'email',
        promptHint: 'Bundle offer email. "You\'re getting great results from [Product A] — imagine adding [Product B] at [X]% off." Present: (1) What each product does, (2) The combined value (1+1=3), (3) Bundle pricing vs buying separately, (4) Customer example who uses both. Under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 3, dayOffset: 3, label: '"Better Together" Value',
        name: 'Position as "better together" value',
        description: 'Show how the products work better together than individually — integration value, shared data, unified experience.',
        playId: 'champion_enablement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: '"Better together" email. Show the integration value: "When [Product A] and [Product B] work together, you get [unique capability]." Include a specific workflow that\'s only possible with both products. Customer quote if available. Talking points: unique bundle value, integration benefits, total platform story. Email under 120 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 4, dayOffset: 7, label: 'Solve Multiple Pain Points',
        name: 'Solve multiple pain points in one deal',
        description: 'Position the bundle as solving multiple pain points in a single procurement event.',
        playId: 'new_buying_group', assetTypes: ['email'], channel: 'meeting',
        promptHint: 'Bundle discovery meeting request. "I\'d love 20 minutes to show you how we can address [Pain Point A] and [Pain Point B] together, for less than you\'d spend on separate solutions." Offer a tailored demo showing the combined workflow. Under 80 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
      {
        order: 5, dayOffset: 14, label: 'Upsell Bundle vs Single',
        name: 'Upsell bundle vs single product',
        description: 'For active deals considering a single product, present the bundle as a better-value alternative.',
        playId: 're_engagement', assetTypes: ['email', 'talking_points'], channel: 'email',
        promptHint: 'Bundle upsell email. "Before you finalize on [Product A], I wanted to show you an option that gives you significantly more value." Present the bundle: (1) What you get additionally, (2) The per-unit savings, (3) How other customers who started with one product ended up buying both anyway. Talking points for the upgrade conversation. Email under 100 words.',
        assignedRole: 'ae', requiresApproval: false,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function — callable from other scripts
// ─────────────────────────────────────────────────────────────────────────────

export async function seedProactivePlaybooks(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const tmpl of TEMPLATES) {
    const exists = await prisma.playbookTemplate.findFirst({
      where: { userId, name: tmpl.name },
    });

    if (exists) {
      skipped.push(tmpl.name);
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
        priority: tmpl.priority,
        targetDepartmentTypes: tmpl.targetDepartmentTypes,
        targetIndustries: tmpl.targetIndustries,
        targetPersonas: tmpl.targetPersonas,
        timingConfig: tmpl.timingConfig as object,
        expectedOutcome: tmpl.expectedOutcome,
        steps: {
          create: tmpl.steps.map((step: StepDefP) => ({
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
    console.log(`✅ Created ${created.length} proactive playbook templates:`);
    created.forEach((n) => console.log(`   + ${n}`));
  }
  if (skipped.length) {
    console.log(`⏭  Skipped (already exist): ${skipped.join(', ')}`);
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
        `User ${DEMO_EMAIL} not found. Run the main seed first.`,
      );
    }

    console.log(`Seeding 50 proactive playbook templates for ${user.email} …`);
    await seedProactivePlaybooks(prismaClient, user.id);
  } finally {
    await prismaClient.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

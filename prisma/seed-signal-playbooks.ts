/**
 * Seed 56 signal-response PlaybookTemplates.
 *
 * Idempotent: checks by name before creating — safe to re-run.
 *
 * Run:
 *   npx dotenv -e .env.local -- tsx prisma/seed-signal-playbooks.ts
 *
 * Or import seedSignalPlaybooks(prisma, userId) from another seed.
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
// Template definitions — 56 signal-response playbooks
// ─────────────────────────────────────────────────────────────────────────────

interface StepDef {
  order: number;
  dayOffset: number;
  label: string;
  name: string;
  description: string;
  playId: string;
  assetTypes: string[];
  channel: string;
  promptHint: string;
  assignedRole: string;
  phase?: string;
  targetPersona?: string;
}

function derivePhase(step: StepDef): string {
  if (step.phase) return step.phase;
  if (step.dayOffset <= 0 && step.channel === 'internal') return 'signal';
  if (step.dayOffset <= 0 && step.channel === 'crm') return 'signal';
  if (step.dayOffset <= 1) return 'prep';
  if (step.dayOffset <= 3) return 'activate';
  if (step.dayOffset <= 14) return 'engage';
  if (step.dayOffset <= 28) return 'convert';
  return 'advocacy';
}

interface TemplateDef {
  name: string;
  description: string;
  triggerType: string;
  priority: number;
  targetDepartmentTypes: string[];
  targetIndustries: string[];
  targetPersonas: string[];
  timingConfig: Record<string, unknown>;
  expectedOutcome: string;
  steps: StepDef[];
}

const TEMPLATES: TemplateDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Category 1 — Leadership & Organization (11)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. New C-Suite Executive ───────────────────────────────────────────────
  {
    name: 'New C-Suite Executive',
    description:
      'Multi-step response to a new C-suite executive hire. Personalized congratulations, research, executive briefing, ROI assessment, and early-win positioning.',
    triggerType: 'new_csuite_executive',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'FINANCE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 56, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '40-50% secure discovery meeting within 60 days, executive relationship established, 2-3x higher win rate when contacted in first 30 days',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Personalized Congratulations',
        name: 'Send Personalized Congratulations',
        description: 'First touch within 48 hours of the hire announcement.',
        playId: 'new_csuite_executive',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send personalized congratulations within 48 hours. Reference their new role, the company, and why you\'re excited for them. Keep it warm and human — not a pitch. Under 100 words.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Research Background',
        name: 'Research Background & Tech Stack',
        description: 'Internal prep — research new exec background and previous company tech stack.',
        playId: 'new_csuite_executive',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Research their background and previous company tech stack. Identify where they came from, what tools they used, what initiatives they led, and what their likely 90-day priorities will be. Flag any connections to your product or competitors.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Executive Welcome Briefing',
        name: 'Host Executive Welcome Briefing',
        description: 'Invite to an executive briefing or exclusive dinner.',
        playId: 'new_csuite_executive',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Host Executive Welcome Briefing or invite to exclusive Executive Dinner. Position as peer-level engagement, not a sales pitch. Frame around industry trends and their new company\'s strategic direction.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Custom ROI Assessment',
        name: 'Offer Custom ROI Assessment',
        description: 'Align ROI to their known 90-day objectives.',
        playId: 'new_csuite_executive',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer custom ROI assessment aligned to their known 90-day objectives. Reference specific goals they\'re likely tackling in their first quarter. Show how your solution maps to their success metrics.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Early Wins Positioning',
        name: 'Position as Early Win Partner',
        description: 'Help them achieve early wins and build credibility.',
        playId: 'new_csuite_executive',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as helping them achieve early wins and build credibility. Frame your solution as a quick win they can show the board in their first 90 days. Reference similar executives who leveraged your platform for early impact.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 2. New VP-Level Hire ───────────────────────────────────────────────────
  {
    name: 'New VP-Level Hire',
    description:
      'Targeted outreach to newly hired VPs. Video congratulations, benchmark sharing, onboarding session, department priorities, and fast-path positioning.',
    triggerType: 'new_vp_hire',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '35-40% book intro meeting, position as quick win for first 90 days',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Video Congratulations',
        name: 'Send Personalized Video Message',
        description: 'Stand out with a personalized video congratulation.',
        playId: 'new_vp_hire',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send personalized video message congratulating them. Script a brief, warm video message that references their new role and company. Include talking points for a 30-second personal video the AE can record.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Industry Benchmark Report',
        name: 'Share Industry Benchmark Report',
        description: 'Provide immediate value with a relevant benchmark report.',
        playId: 'new_vp_hire',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share relevant industry benchmark report they can use immediately. Pick a report that aligns with their department and role. Frame it as "I thought this would be useful as you ramp up" — not a sales touch.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Tactical Onboarding Session',
        name: 'Offer Tactical Onboarding Session',
        description: 'Offer quick-wins assessment or onboarding session.',
        playId: 'new_vp_hire',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Tactical Onboarding session or Quick-Wins Assessment. Position as a complimentary session to help them identify 3-5 quick wins in their first 90 days using industry best practices.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Department Priorities',
        name: 'Reference Department Priorities',
        description: 'Align to their department\'s likely priorities.',
        playId: 'new_vp_hire',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference their department\'s likely priorities based on role. Research what VPs in this function typically tackle in their first 90 days and connect your solution to those initiatives.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Fast Path to Success',
        name: 'Position as Fast Path to Success',
        description: 'Position as fast path to early departmental success.',
        playId: 'new_vp_hire',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as fast path to early departmental success. Show how similar VPs used your solution to deliver measurable results within their first quarter. Include a specific case study or metric.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 3. Multiple Department Heads Hired ─────────────────────────────────────
  {
    name: 'Multiple Department Heads Hired',
    description:
      'Response to multiple new department heads being hired. Org mapping, team lunch-and-learn, department workshop, multi-threaded outreach, and budget holder identification.',
    triggerType: 'multiple_dept_heads_hired',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 42, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Identify 1-2 new expansion use cases, multi-threading across new org, 30-40% generate expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Map Org Structure',
        name: 'Map New Org Structure',
        description: 'Internal research — map the new decision makers.',
        playId: 'multiple_dept_heads_hired',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Map out the new org structure and decision makers. Identify all new department heads, their reporting lines, and which ones are most relevant to your solution. Flag overlaps and potential champions.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Leadership Lunch-and-Learn',
        name: 'Host Leadership Lunch-and-Learn',
        description: 'Sponsored session for the new leadership team.',
        playId: 'multiple_dept_heads_hired',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Host sponsored Lunch-and-Learn for new leadership team. Position as an industry best-practices session, not a product demo. Include agenda items relevant to their collective challenges.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Department Mapping Workshop',
        name: 'Offer Department Mapping Workshop',
        description: 'Show how similar orgs use your platform.',
        playId: 'multiple_dept_heads_hired',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Department Mapping Workshop showing how similar orgs use your platform. Map their new org structure to your solution\'s capabilities. Identify cross-department use cases.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Multi-Threaded Outreach',
        name: 'Coordinate Multi-Threaded Outreach',
        description: 'Outreach across new leaders simultaneously.',
        playId: 'multiple_dept_heads_hired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Coordinate multi-threaded outreach across new leaders. Send personalized emails to each new department head, referencing their specific function and how your solution helps. Ensure messages are complementary, not redundant.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Identify Budget Holder',
        name: 'Identify Primary Budget Holder',
        description: 'Determine who holds the budget for your solution.',
        playId: 'multiple_dept_heads_hired',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify the primary budget holder for your solution. Based on outreach responses and org mapping, determine who owns the budget and decision authority. Build a plan to secure a joint meeting.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 4. Executive Departure ─────────────────────────────────────────────────
  {
    name: 'Executive Departure',
    description:
      'Response to executive departure. Monitor replacement, empower interim leaders, provide extended support, and execute appropriate play based on replacement type.',
    triggerType: 'executive_departure',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'C-Suite'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Prevent churn during transition, build loyalty with interim leaders, 50-60% of interim promotions lead to expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Monitor Replacement',
        name: 'Monitor for Replacement Announcement',
        description: 'Track news for replacement hire.',
        playId: 'executive_departure',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Monitor for replacement announcement closely. Set up alerts for the company and role. Track LinkedIn, press releases, and board announcements. Document timeline and interim leadership arrangements.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Champion Empowerment',
        name: 'Champion Empowerment Play',
        description: 'Offer certification or training to interim leaders.',
        playId: 'executive_departure',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Champion Empowerment Play: free certification or advanced training to interim leaders. Position as supporting them during the transition. Help them shine in front of their leadership.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Extended Support',
        name: 'Provide Extended Support',
        description: 'Help interim leaders gap-fill responsibilities.',
        playId: 'executive_departure',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide extended support to help them gap-fill responsibilities. Offer additional training, priority support, or strategic sessions to help the team maintain momentum during the transition.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Interim Promoted Outreach',
        name: 'Outreach if Interim Promoted',
        description: 'Congratulate if interim is promoted.',
        playId: 'executive_departure',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If interim promoted: reach out immediately with congratulations. Reference their work during the transition and position as a partner who supported them through it. Offer expanded strategic session.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'New Exec Play Trigger',
        name: 'Execute New Exec Play if External Hire',
        description: 'Wait for external hire and execute new exec play.',
        playId: 'executive_departure',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'If external search: wait for hire then execute new exec play. Set reminders and monitoring. When announced, immediately trigger the New C-Suite Executive or New VP-Level Hire playbook.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 5. Founder Stepping Down ───────────────────────────────────────────────
  {
    name: 'Founder Stepping Down',
    description:
      'Response to founder transition. Research new CEO, peer-to-peer executive review, historical ROI presentation, C-level reference, and strategic partner positioning.',
    triggerType: 'founder_stepping_down',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 120, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Preempt vendor consolidation by proving ROI, executive sponsorship secured, 70-80% retention if proactive within 60 days',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Research New CEO',
        name: 'Research New CEO Background',
        description: 'Deep-dive on new CEO\'s history and priorities.',
        playId: 'founder_stepping_down',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Research new CEO\'s background, previous companies, and known strategic priorities. Identify their leadership style, past vendor preferences, and likely 100-day plan. Flag risks and opportunities.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Strategic Business Review',
        name: 'Offer Strategic Business Review',
        description: 'Peer-to-peer executive engagement.',
        playId: 'founder_stepping_down',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Strategic Business Review with your executive (peer-to-peer). Position as CEO-to-CEO or VP-to-VP engagement to discuss strategic alignment and how your partnership supports their vision.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Historical ROI Presentation',
        name: 'Present Historical ROI',
        description: 'Show the value delivered to date.',
        playId: 'founder_stepping_down',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Present historical ROI and value delivered to date. Compile metrics, usage data, and business outcomes since the partnership began. Make it easy for the new CEO to see the value without needing context.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'C-Level Peer Reference',
        name: 'Offer C-Level Peer Reference',
        description: 'Connect new CEO with an existing C-level customer.',
        playId: 'founder_stepping_down',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer intro to one of your C-level customers for peer reference. Identify a CEO or executive at a similar company who can vouch for the value. Make the introduction warm and relevant.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Strategic Partner Positioning',
        name: 'Position as Strategic Partner',
        description: 'Align to the new vision.',
        playId: 'founder_stepping_down',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as strategic partner aligned to new vision. Connect your roadmap and capabilities to the new CEO\'s stated priorities. Frame the relationship as essential to their strategic agenda.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 6. Layoffs/Headcount Reduction ─────────────────────────────────────────
  {
    name: 'Layoffs/Headcount Reduction',
    description:
      'Response to layoffs or headcount reduction. Assess solution fit, offer efficiency consultation, present ROI calculator, and focus on productivity gains.',
    triggerType: 'layoffs_headcount_reduction',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'OPERATIONS', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 180, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'If efficiency: 40-50% receptive to conversation, protect accounts from churn, displace competitors with consolidation',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Assess Solution Fit',
        name: 'Assess Efficiency vs Growth Fit',
        description: 'Determine if solution drives efficiency or growth.',
        playId: 'layoffs_headcount_reduction',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Assess if your solution drives efficiency/cost savings or is growth-focused. Determine the right approach based on the company\'s current mode. If efficiency play, move fast. If growth tool, plan for 3-6 month delayed outreach.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Do More With Less Consult',
        name: 'Offer Efficiency Consultation',
        description: 'Free consultation on doing more with less.',
        playId: 'layoffs_headcount_reduction',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If efficiency play: offer free "Do More With Less" consultation immediately. Frame as helping their remaining team maintain or increase output. Lead with empathy, not opportunism.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'ROI Calculator',
        name: 'Present ROI Calculator',
        description: 'Hard cost savings and vendor consolidation opportunity.',
        playId: 'layoffs_headcount_reduction',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Present ROI calculator with hard cost savings or vendor consolidation opportunity. Show specific dollar amounts they could save by consolidating tools or automating manual processes. Make the business case clear.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Wait for Stabilization',
        name: 'Wait for Stabilization (Growth Tool)',
        description: 'If growth tool, wait 3-6 months until stabilization.',
        playId: 'layoffs_headcount_reduction',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'If growth tool: wait 3-6 months until stabilization. Set monitoring alerts for signs of recovery (new hires, press releases, earnings improvement). Plan re-engagement timing.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Productivity Messaging',
        name: 'Focus on Productivity Gains',
        description: 'Message around doing more with fewer resources.',
        playId: 'layoffs_headcount_reduction',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Focus messaging on productivity gains with fewer resources. Share case studies of companies that used your platform to maintain output during headcount reduction. Quantify productivity improvements.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 7. Rapid Hiring Surge ──────────────────────────────────────────────────
  {
    name: 'Rapid Hiring Surge',
    description:
      'Response to rapid hiring. Identify expanding function, offer scalability workshop, provide seat expansion discount, and position for rapid onboarding.',
    triggerType: 'rapid_hiring_surge',
    priority: 8,
    targetDepartmentTypes: ['SALES', 'ENGINEERING', 'OPERATIONS', 'MARKETING', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Immediate seat expansion 20-50%, deeper adoption, multi-year commitment based on growth',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Identify Expanding Function',
        name: 'Identify Hiring Function',
        description: 'Determine which function is scaling.',
        playId: 'rapid_hiring_surge',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify which function is hiring (Sales, Eng, Ops, Marketing). Analyze job postings, LinkedIn data, and press releases. Map hiring patterns to your solution\'s relevance for that function.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Scalability Workshop',
        name: 'Offer Scalability Workshop',
        description: 'Show how to scale the expanding function.',
        playId: 'rapid_hiring_surge',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Scalability Workshop showing how to scale that function. Include best practices from similar companies who scaled rapidly. Focus on tooling, process, and onboarding infrastructure.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Expansion Discount',
        name: 'Provide Seat Expansion Discount',
        description: 'Bulk-seat or new hire onboarding package.',
        playId: 'rapid_hiring_surge',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide bulk-seat expansion discount or New Hire Onboarding Package. Present volume pricing tiers, ramp pricing for new seats, and onboarding support included. Make the economics compelling.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Align to Scaling Challenge',
        name: 'Align Solution to Scaling Challenge',
        description: 'Connect solution to their growth needs.',
        playId: 'rapid_hiring_surge',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Align solution to their scaling challenge. Show how your platform reduces time-to-productivity for new hires. Reference specific features that support rapid onboarding and team growth.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Rapid Onboarding Positioning',
        name: 'Position for Rapid Onboarding',
        description: 'Enable rapid onboarding and productivity.',
        playId: 'rapid_hiring_surge',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as enabling rapid onboarding and productivity. Share metrics on how existing customers onboard new users. Propose a multi-year agreement aligned to their growth trajectory.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 8. Engineering Team Expansion ──────────────────────────────────────────
  {
    name: 'Engineering Team Expansion',
    description:
      'Response to engineering team growth. Technical roadmap deep-dive, beta access, engineering productivity positioning, case studies, and dev stack integration.',
    triggerType: 'engineering_team_expansion',
    priority: 8,
    targetDepartmentTypes: ['ENGINEERING', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing'],
    targetPersonas: ['C-Suite', 'VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Expand into engineering pods, technical use case adoption, 40-50% conversion to technical POC',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Technical Roadmap Deep-Dive',
        name: 'Invite to Technical Roadmap Deep-Dive',
        description: 'Engage VP Eng or CTO with technical session.',
        playId: 'engineering_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite VP Eng/CTO to Technical Roadmap Deep-Dive. Position as a peer technical conversation about their scaling challenges, not a product demo. Reference their hiring patterns.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Beta Program Access',
        name: 'Offer Beta Program or Advisory Board',
        description: 'Exclusive access and influence over product direction.',
        playId: 'engineering_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer beta program access or technical advisory board seat. Position as exclusive early access that lets them shape the product roadmap. Appeal to their technical curiosity and influence.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Engineering Productivity',
        name: 'Position Engineering Productivity Solutions',
        description: 'Solutions for engineering scale and infrastructure.',
        playId: 'engineering_team_expansion',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Position solutions for engineering productivity and infrastructure. Show how your platform helps teams ship faster, reduce technical debt, and scale their engineering practices.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Scale Case Studies',
        name: 'Share Scale Case Studies',
        description: 'Case studies from similar companies at similar scale.',
        playId: 'engineering_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share case studies from similar companies at similar scale. Highlight engineering teams that grew from similar size and how they used your platform during that transition.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Dev Stack Integration',
        name: 'Offer Dev Stack Integration',
        description: 'Integration with their existing development stack.',
        playId: 'engineering_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer integration with their existing dev stack. Research their current tools (CI/CD, monitoring, project management) and show how your solution fits seamlessly into their workflow.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 9. Sales Team Expansion ────────────────────────────────────────────────
  {
    name: 'Sales Team Expansion',
    description:
      'Response to sales team growth. SKO co-hosting, enablement bootcamp, rep ramp tools, sales intelligence positioning, and time-to-productivity ROI.',
    triggerType: 'sales_team_expansion',
    priority: 8,
    targetDepartmentTypes: ['SALES', 'EXECUTIVE_LEADERSHIP'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'License expansion for new reps, embed in standard onboarding, 50-60% attach rate',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'SKO Co-Host Offer',
        name: 'Offer SKO Co-Host Session',
        description: 'Co-host a session at their Sales Kickoff.',
        playId: 'sales_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer to co-host session at their Sales Kickoff (SKO). Position as adding value to their event with industry insights or best practices. Not a product pitch — a genuinely useful session.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Enablement Bootcamp',
        name: 'Provide Sales Enablement Bootcamp',
        description: 'Onboarding playbooks for new reps.',
        playId: 'sales_team_expansion',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide Sales Enablement Bootcamp with onboarding playbooks. Include rep ramp checklists, call scripts, competitive battlecards, and product training materials tailored to their selling motion.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Rep Ramp Tools',
        name: 'Position Rep Ramp Tools',
        description: 'Tools that help ramp new reps faster.',
        playId: 'sales_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position tools that help ramp new reps faster. Show how your platform reduces time-to-first-deal for new hires. Reference specific features for onboarding, coaching, and performance tracking.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Sales Intelligence Offer',
        name: 'Offer Sales Intelligence & Data',
        description: 'Sales intelligence, data, or compensation tools.',
        playId: 'sales_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer sales intelligence, data, or compensation tools. Position solutions that give new reps access to better data, prospect intelligence, and territory insights from day one.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Time-to-Productivity ROI',
        name: 'Show Time-to-Productivity ROI',
        description: 'ROI based on faster rep ramp time.',
        playId: 'sales_team_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Show ROI based on faster time-to-productivity. Calculate the cost of slow rep ramp and show how your solution accelerates it. Include benchmarks from similar sales team expansions.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 10. Geographic Expansion ───────────────────────────────────────────────
  {
    name: 'Geographic Expansion',
    description:
      'Response to geographic expansion. Localized welcome, regional launch support, regional training, expansion case studies, and multi-region compliance positioning.',
    triggerType: 'geographic_expansion',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Expand enterprise agreement to new geography, establish regional champions, 30-40% expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Localized Welcome',
        name: 'Send Localized Welcome Gift',
        description: 'Welcome gift to new office location.',
        playId: 'geographic_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send localized welcome gift to new office. Include a culturally appropriate welcome package and a personalized note referencing their expansion into the new market.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Regional Launch Support',
        name: 'Offer Regional Launch Support',
        description: 'Localization package for the new region.',
        playId: 'geographic_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Regional Launch Support & Localization Package. Include region-specific configurations, language support, local compliance requirements, and dedicated regional onboarding.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Regional Training',
        name: 'Provide Regional Training Sessions',
        description: 'Training and market entry capabilities.',
        playId: 'geographic_expansion',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide regional training sessions and market entry capabilities. Offer sessions in the local time zone covering platform features, best practices, and region-specific use cases.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Expansion Case Studies',
        name: 'Share Regional Expansion Case Studies',
        description: 'Case studies from similar regional expansions.',
        playId: 'geographic_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share case studies from similar regional expansions. Highlight companies that successfully launched in the same geography and how your platform supported their entry.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Region Compliance',
        name: 'Position Multi-Region Support',
        description: 'Multi-region support and compliance features.',
        playId: 'geographic_expansion',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position multi-region support and compliance features. Highlight data residency, GDPR/local compliance, multi-language support, and regional infrastructure capabilities.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 11. Job Posting for Your Category ──────────────────────────────────────
  {
    name: 'Job Posting for Your Category',
    description:
      'Highest-intent signal: company is hiring for your category. Reference job posting, offer candidate enablement, reach hiring manager, provide onboarding resources, and embed as prerequisite.',
    triggerType: 'job_posting_your_category',
    priority: 10,
    targetDepartmentTypes: ['ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '60-70% lead to discovery, accelerate sales cycle, embed as prerequisite',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Reference Job Posting',
        name: 'Reference Specific Job Posting',
        description: 'Use the job posting as the outreach hook.',
        playId: 'job_posting_your_category',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference the specific job posting in outreach. Quote relevant requirements from the listing that align with your solution. Show that you understand exactly what they\'re building.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Candidate Enablement',
        name: 'Offer Candidate Enablement Play',
        description: 'Sandbox account for candidates or interview resources.',
        playId: 'job_posting_your_category',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Candidate Enablement Play: sandbox account for candidates or interview questions. Position as helping them evaluate candidates with hands-on experience with your tool.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Hiring Manager Outreach',
        name: 'Reach Out to Hiring Manager',
        description: 'Offer to help new hire be successful from day 1.',
        playId: 'job_posting_your_category',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reach out to hiring manager offering to help new hire be successful from day 1. Position as a partner in onboarding, not just a vendor. Offer dedicated training and ramp support.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Onboarding Resources',
        name: 'Provide Onboarding Resources',
        description: 'Training materials for the incoming hire.',
        playId: 'job_posting_your_category',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide onboarding resources and training materials. Include certification paths, quick-start guides, and a curated learning path tailored to the role they\'re hiring for.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Prerequisite Positioning',
        name: 'Position as Prerequisite Tool',
        description: 'Embed as required tool for the role.',
        playId: 'job_posting_your_category',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as prerequisite tool for the role. Show how your solution is standard infrastructure for this function. Reference that top candidates will expect to use it.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 2 — Financial & Funding (8)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 12. Series A/Seed Funding ──────────────────────────────────────────────
  {
    name: 'Series A/Seed Funding',
    description:
      'Response to Series A or Seed funding. Startup success package, startup-friendly pricing, founder networking, foundational infrastructure positioning, and stage-appropriate case studies.',
    triggerType: 'series_a_seed',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Secure foundational vendor status, 30-40% conversion within 4 weeks',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Startup Success Package',
        name: 'Send Startup Success Package',
        description: 'Congratulations with startup program offer.',
        playId: 'series_a_seed',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send congratulations with Startup Success Package offer. Reference the funding announcement, amount raised, and stated plans. Offer your startup program with special terms.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Startup Pricing Tier',
        name: 'Offer Startup-Friendly Pricing',
        description: 'Flexible terms for early-stage companies.',
        playId: 'series_a_seed',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer startup-friendly pricing tier and flexible terms. Include free trial, startup credits, or graduated pricing that scales with their growth. Remove friction from getting started.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Founder Networking Event',
        name: 'Invite to Founder Networking',
        description: 'Exclusive founder/VC networking event.',
        playId: 'series_a_seed',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite founders to exclusive Founder/VC networking event. Position as access to a peer community, not a sales event. Mention other notable founders or investors who attend.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Foundational Infrastructure',
        name: 'Position as Foundational Infrastructure',
        description: 'Infrastructure for scaling from 0 to 1.',
        playId: 'series_a_seed',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as foundational infrastructure for scaling from 0→1. Show how choosing the right tools early prevents costly migrations later. Reference early-stage companies that grew on your platform.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Stage-Matched Case Studies',
        name: 'Share Stage-Matched Case Studies',
        description: 'Case studies from similar-stage companies.',
        playId: 'series_a_seed',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share case studies from similar stage companies. Highlight startups that started using your platform at Series A/Seed and how it helped them scale efficiently through subsequent stages.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 13. Series B Funding ───────────────────────────────────────────────────
  {
    name: 'Series B Funding',
    description:
      'Critical response to Series B funding. Growth scaling workshop, funding reference, architecture review, growth target alignment, and premium tier positioning.',
    triggerType: 'series_b',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING', 'SALES', 'FINANCE'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '50-60% secure meeting within 2 weeks, upgrade to premium, 2-3x higher deal size',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Growth Scaling Workshop',
        name: 'Offer Growth Scaling Workshop',
        description: 'Reach out within 2 weeks with workshop offer.',
        playId: 'series_b',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reach out within 2 weeks with Growth Scaling Workshop offer. Reference the funding amount and congratulate them. Offer a session focused on scaling infrastructure and processes for growth.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Funding Reference',
        name: 'Reference Funding & Use of Funds',
        description: 'Reference press release and stated priorities.',
        playId: 'series_b',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference funding amount and stated use of funds from press release. Connect their stated plans directly to your solution capabilities. Show you\'ve done your homework.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Architecture Review',
        name: 'Offer Architecture Review & Peer Roundtable',
        description: 'Technical review and growth-stage peer event.',
        playId: 'series_b',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer architecture review and invite to growth-stage peer roundtable. Position as helping them build the right foundation for their next phase of growth. Include other Series B companies.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Growth Target Alignment',
        name: 'Align to Growth Targets',
        description: 'Show how you help hit aggressive growth targets.',
        playId: 'series_b',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Show how you help them hit aggressive growth targets. Map your features to their likely 12-18 month growth plan. Quantify the impact with relevant benchmarks.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Premium Tier Positioning',
        name: 'Position Premium Tier',
        description: 'Premium tier with growth-stage features.',
        playId: 'series_b',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position premium tier with growth features. Present the business case for investing in the premium tier now rather than upgrading later. Show total cost of delayed adoption.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 14. Series C+ / Late-Stage Funding ─────────────────────────────────────
  {
    name: 'Series C+ / Late-Stage Funding',
    description:
      'Response to late-stage funding. Enterprise readiness assessment, executive briefing center visit, enterprise features positioning, IPO readiness resources, and multi-year ELA proposal.',
    triggerType: 'series_c_late_stage',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'FINANCE', 'ENGINEERING'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Manufacturing'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Multi-year ELA, cross-department expansion, $500K-$2M+ deal sizes',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Enterprise Readiness Assessment',
        name: 'Offer Enterprise Readiness Assessment',
        description: 'Compliance and security audit.',
        playId: 'series_c_late_stage',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Enterprise Readiness Assessment (compliance/security audit). Position as helping them prepare for the enterprise maturity their funding stage demands. Reference SOC 2, GDPR, and industry-specific compliance.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Executive Briefing Center',
        name: 'Invite to Executive Briefing Center',
        description: 'In-person EBC visit.',
        playId: 'series_c_late_stage',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to Executive Briefing Center (EBC) visit. Offer an in-person, high-touch experience tailored to their strategic needs. Include meetings with your product and engineering leadership.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Enterprise Features',
        name: 'Position Enterprise Features',
        description: 'Security, compliance, and integration capabilities.',
        playId: 'series_c_late_stage',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Position enterprise features, security, compliance, integrations. Demonstrate the platform capabilities they need at their new scale: SSO, audit logs, role-based access, API limits, SLAs.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'IPO Readiness Resources',
        name: 'Share IPO Readiness Resources',
        description: 'Case studies and resources for public-company preparation.',
        playId: 'series_c_late_stage',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share IPO readiness resources and case studies. Highlight companies that used your platform through their pre-IPO phase. Show how your solution supports public-company requirements.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Year ELA Proposal',
        name: 'Propose Multi-Year ELA',
        description: 'Enterprise license agreement proposal.',
        playId: 'series_c_late_stage',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Multi-year enterprise license agreement proposal. Present comprehensive packaging that covers their projected growth over 2-3 years. Include price-lock incentives and dedicated support.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 15. Quarterly Earnings Beat ────────────────────────────────────────────
  {
    name: 'Quarterly Earnings Beat',
    description:
      'Response to earnings beat. Congratulatory gift, earnings-referenced outreach, early access offer, momentum solutions, and VIP event invitation.',
    triggerType: 'earnings_beat',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '40-50% receptive to expansion, cross-sell premium, accelerate deals by 30%',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Congratulatory Gift',
        name: 'Send Congratulatory Gift',
        description: 'High-end personalized gift within 1 week.',
        playId: 'earnings_beat',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send congratulatory high-end personalized gift within 1 week. Include a handwritten note referencing a specific metric from the earnings call. Make it memorable and personal.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Earnings-Referenced Outreach',
        name: 'Reference Growth Metrics',
        description: 'Outreach referencing specific earnings call metrics.',
        playId: 'earnings_beat',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference specific growth metrics from earnings call in outreach. Quote their revenue growth, margin improvement, or customer expansion numbers. Connect your solution to sustaining that momentum.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Early Access Offer',
        name: 'Offer Early Access to Premium Features',
        description: 'Exclusive early access to new capabilities.',
        playId: 'earnings_beat',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer early access to new AI/premium features. Position as exclusive access for high-performing companies. Frame as helping them maintain their competitive edge.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Momentum Solutions',
        name: 'Position Momentum Solutions',
        description: 'Solutions that help maintain strong results.',
        playId: 'earnings_beat',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position solutions that help maintain momentum. Show how your platform amplifies the strategies that drove their strong quarter. Focus on scalability and sustaining growth.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'VIP Event Invitation',
        name: 'Invite to VIP Conference Track',
        description: 'Exclusive executive dinner or conference track.',
        playId: 'earnings_beat',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to VIP conference track or executive dinner. Position as recognition of their success and access to a peer group of high-performing companies. Make it feel exclusive.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 16. Quarterly Earnings Miss ────────────────────────────────────────────
  {
    name: 'Quarterly Earnings Miss',
    description:
      'Response to earnings miss. Identify missed metric, offer turnaround session, share targeted content, position as fix, and wait if not relevant.',
    triggerType: 'earnings_miss',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'SALES', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'If relevant: 30-40% receptive to targeted solution, position as emergency fix',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Identify Missed Metric',
        name: 'Identify Missed Metric',
        description: 'Determine what they missed and if you can help.',
        playId: 'earnings_miss',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify which metric they missed (revenue, margins, efficiency). Analyze the earnings call transcript for specific areas of underperformance. Determine if your solution directly addresses the gap.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Turnaround Strategy Session',
        name: 'Offer Turnaround Strategy Session',
        description: 'Immediate targeted session if solution is relevant.',
        playId: 'earnings_miss',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If you solve that problem: offer Turnaround Strategy Session immediately. Frame as helping them address the specific metric they missed. Lead with empathy and a concrete plan, not a product pitch.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Targeted Content',
        name: 'Share Targeted Content',
        description: 'Webinar or whitepaper on fixing the exact metric.',
        playId: 'earnings_miss',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share targeted webinar or whitepaper on fixing that exact metric. Provide actionable content specifically about improving the area where they underperformed. Include data and benchmarks.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Position as Fix',
        name: 'Position Product as Fix',
        description: 'Show ROI focused on the missed metric.',
        playId: 'earnings_miss',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position product as the "fix" with ROI focus. Show specific, quantified impact your solution can have on the metric they missed. Include customer examples of similar turnarounds.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Delayed Outreach',
        name: 'Wait and Re-evaluate',
        description: 'If not relevant, wait 2-4 weeks before outreach.',
        playId: 'earnings_miss',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'If not relevant: wait 2-4 weeks before outreach. Set a follow-up reminder to reassess after the dust settles. Monitor for new initiatives or leadership changes that create an opening.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 17. Raised Guidance/Forecast ───────────────────────────────────────────
  {
    name: 'Raised Guidance/Forecast',
    description:
      'Response to raised guidance. Momentum scaling playbook, guidance-referenced outreach, VIP event invitation, growth solutions positioning, and expansion proposal.',
    triggerType: 'raised_guidance',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Expand seat count matching growth, 40-50% receptive within 2 weeks, multi-year deals',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Momentum Scaling Playbook',
        name: 'Share Momentum Scaling Playbook',
        description: 'Share playbook and case studies for scaling.',
        playId: 'raised_guidance',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share Momentum Scaling Playbook and case studies. Provide a curated set of resources for companies experiencing accelerated growth. Include practical frameworks they can implement.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Guidance-Referenced Outreach',
        name: 'Reference Optimistic Guidance',
        description: 'Reference their positive forecast in outreach.',
        playId: 'raised_guidance',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference their optimistic guidance in outreach. Quote their raised targets and connect your solution to achieving those ambitious goals. Show you understand their growth trajectory.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'VIP Event Invitation',
        name: 'Invite to VIP Event',
        description: 'Conference track or executive roundtable.',
        playId: 'raised_guidance',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to VIP conference track or executive roundtable. Position as a peer group of high-growth companies sharing scaling strategies. Make the invitation feel earned, not generic.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Growth Solutions',
        name: 'Position Growth-Enabling Solutions',
        description: 'Solutions and premium features for scaling.',
        playId: 'raised_guidance',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position growth-enabling solutions and premium features. Map specific platform capabilities to the growth areas they highlighted. Show how premium features accelerate their trajectory.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Expansion Proposal',
        name: 'Propose Expansion',
        description: 'Expansion aligned to projected growth.',
        playId: 'raised_guidance',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Propose expansion aligned to their projected growth. Model their seat/usage growth based on raised guidance and present a proactive expansion plan with volume incentives.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 18. IPO Announcement ───────────────────────────────────────────────────
  {
    name: 'IPO Announcement/S-1 Filing',
    description:
      'Response to IPO announcement. Compliance audit, executive briefing center, security positioning, public company case studies, and longer sales cycle expectations.',
    triggerType: 'ipo_announcement',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Manufacturing'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Upgrade to highest enterprise tier, compliance add-ons, $250K-$1M+ expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Public Company Compliance Audit',
        name: 'Offer Compliance Audit',
        description: 'Compliance audit and IPO-readiness module.',
        playId: 'ipo_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Public Company Compliance Audit and IPO-readiness module. Reference their S-1 filing. Position as helping them meet the heightened compliance and security requirements of being public.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Security Upgrade',
        name: 'Position Security & Compliance Add-ons',
        description: 'Security upgrade and compliance features.',
        playId: 'ipo_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position security upgrade and compliance add-ons. Highlight SOX compliance, enhanced audit trails, advanced access controls, and data governance features required for public companies.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Multi-Team Threading',
        name: 'Multi-Thread to Finance, Legal, Security',
        description: 'Engage finance, legal, and security teams.',
        playId: 'ipo_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Multi-thread to finance, legal, security teams. Identify the CFO, General Counsel, and CISO. Tailor messaging for each stakeholder\'s IPO-related concerns and how your solution addresses them.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Public Company Case Studies',
        name: 'Share Public Company Case Studies',
        description: 'Case studies from other public companies.',
        playId: 'ipo_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share case studies from other public companies. Highlight companies that went through IPO while using your platform and how it helped them meet compliance and growth demands.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Enterprise Tier Proposal',
        name: 'Expect Longer Cycle, Higher Value',
        description: 'Expect longer sales cycles but higher deal values.',
        playId: 'ipo_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Expect longer sales cycles but higher deal values. Present a comprehensive enterprise proposal that addresses compliance, security, and scaling needs. Include multi-year options with IPO-stage pricing.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 19. Post-IPO (First Quarter) ───────────────────────────────────────────
  {
    name: 'Post-IPO (First Quarter)',
    description:
      'Response to first post-IPO quarter. Shareholder value workshop, KPI alignment, growth/margin solutions, public metric focus, and QBR format.',
    triggerType: 'post_ipo_first_quarter',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'SALES', 'OPERATIONS'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Manufacturing'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 180, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Cement vendor status before scrutiny, 30-40% expansion before Q2, multi-year lock-in',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Shareholder Value Workshop',
        name: 'Present Shareholder Value Workshop',
        description: 'Workshop with ROI analysis for public metrics.',
        playId: 'post_ipo_first_quarter',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Present Shareholder Value Workshop with ROI analysis. Frame your solution\'s impact in terms of public company KPIs: revenue growth, gross margin, net retention, and operating efficiency.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Public KPI Alignment',
        name: 'Align to Public KPIs',
        description: 'Show how tool impacts newly public metrics.',
        playId: 'post_ipo_first_quarter',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Show how your tool impacts their newly public KPIs. Map your solution\'s capabilities to the metrics they now report to Wall Street. Make the connection explicit and quantifiable.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Revenue & Margin Solutions',
        name: 'Position Revenue & Margin Solutions',
        description: 'Solutions driving revenue growth or margin improvement.',
        playId: 'post_ipo_first_quarter',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position solutions that drive revenue growth or margin improvement. Focus on the metrics that analysts and investors will scrutinize most. Show direct impact on their investor story.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Public Metrics Focus',
        name: 'Focus on Publicly Reported Metrics',
        description: 'Align messaging to metrics they report publicly.',
        playId: 'post_ipo_first_quarter',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Focus on metrics they\'ll report publicly. Review their S-1 and first earnings call. Identify the 2-3 key metrics investors are watching and show how your platform moves them.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Executive Business Review',
        name: 'Offer Executive Business Review',
        description: 'QBR format aligned to investor metrics.',
        playId: 'post_ipo_first_quarter',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer executive business review (QBR) format. Structure the review around their public KPIs and show how your partnership contributes to each. Make it board-presentable.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 3 — M&A & Partnerships (6)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 20. Acquisition (They Acquired) ────────────────────────────────────────
  {
    name: 'Acquisition (They Acquired)',
    description:
      'Critical response when target account acquires another company. Protect existing relationship, offer integration playbook, discovery session, consolidation pricing, and standardization positioning.',
    triggerType: 'acquisition_they_acquired',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Expand into acquired company, standardize on platform, 50-70% for 2-5x expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Protect & Expand Outreach',
        name: 'Protect Account & Reach Parent Buyer',
        description: 'Protect existing relationship and engage buyer.',
        playId: 'acquisition_they_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If you serve acquired company: protect account and reach out to parent buyer. If you serve acquirer: offer Post-Merger Integration Playbook. Prioritize relationship protection above all.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Integration Discovery',
        name: 'Provide Integration Discovery Session',
        description: 'Help plan the technical integration.',
        playId: 'acquisition_they_acquired',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide integration discovery session. Map the tech stacks of both companies. Identify overlaps, gaps, and opportunities for standardization on your platform. Create a joint roadmap.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Consolidation Pricing',
        name: 'Offer Consolidation Pricing',
        description: 'Parent-subsidiary license bundle.',
        playId: 'acquisition_they_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer parent-subsidiary license bundle with consolidation pricing. Present volume discounts that make it economically compelling to standardize both entities on your platform.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Standardization Platform',
        name: 'Position as Standardization Platform',
        description: 'Position for standardization across both entities.',
        playId: 'acquisition_they_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as standardization platform across both entities. Show how a single platform reduces complexity, lowers total cost, and accelerates integration. Reference similar M&A standardization wins.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Executive Alignment',
        name: 'Align with Integration Leadership',
        description: 'Connect with VP Integration and CIO.',
        playId: 'acquisition_they_acquired',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Align with integration leadership. Schedule meeting with VP Integration and CIO to present a comprehensive standardization plan. Include timeline, migration support, and projected savings.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 21. Acquisition (They Were Acquired) ───────────────────────────────────
  {
    name: 'Acquisition (They Were Acquired)',
    description:
      'Critical response when customer is acquired. Proactive EBR, introduction to parent counterpart, value defense, integration support, and speed to prevent vendor consolidation.',
    triggerType: 'acquisition_they_were_acquired',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '60-70% retention if proactive within 30 days, potential 5-10x expansion into parent',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Proactive EBR',
        name: 'Schedule Executive Business Review',
        description: 'Show ROI immediately to defend value.',
        playId: 'acquisition_they_were_acquired',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Proactively schedule Executive Business Review showing ROI immediately. Compile all value metrics, usage data, and business outcomes. Present a compelling case before the parent company begins vendor evaluation.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Parent Company Introduction',
        name: 'Request Parent Company Introduction',
        description: 'Get introduced to counterpart at parent.',
        playId: 'acquisition_they_were_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Request introduction to counterpart buyer at parent company. Ask your champion to make a warm introduction. Prepare talking points for how your solution could benefit the combined entity.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Value Defense',
        name: 'Present Value Defense & Expansion',
        description: 'Defend value and present expansion into parent.',
        playId: 'acquisition_they_were_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Present value defense and expansion opportunity into parent. Build a business case that shows the cost of switching vs. the value of expanding your solution to the parent company.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Integration & Pilot Support',
        name: 'Offer Integration Support & Parent Pilot',
        description: 'Support integration and pilot for parent company.',
        playId: 'acquisition_they_were_acquired',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer integration support and parent company pilot. Provide free professional services for integration and a no-risk pilot for the parent company to evaluate your platform.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Move Fast',
        name: 'Move Before Vendor Consolidation',
        description: 'Act before parent mandates vendor consolidation.',
        playId: 'acquisition_they_were_acquired',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Move quickly before parent mandates vendor consolidation. Track the integration timeline. Secure meetings with parent procurement. Present consolidated pricing before they run an RFP.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 22. Merger Announcement ────────────────────────────────────────────────
  {
    name: 'Merger Announcement',
    description:
      'Response to merger announcement. Map stakeholders across both entities, offer consolidation advisory, provide extended trial, position as integration partner, and manage complex evaluation.',
    triggerType: 'merger_announcement',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Win vendor bake-off if engaged in first 60 days, 40-50% win rate, $500K-$2M+ consolidated',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Stakeholder Mapping',
        name: 'Map Stakeholders in Both Entities',
        description: 'Map decision makers across both companies.',
        playId: 'merger_announcement',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Map stakeholders in both merging entities. Identify decision makers, technical leads, and champions at both companies. Determine who will lead the integration committee and vendor evaluation.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Consolidation Advisory',
        name: 'Offer Systems Consolidation Advisory',
        description: 'Joint architectural review for consolidation.',
        playId: 'merger_announcement',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Systems Consolidation Advisory and joint architectural review. Position as a neutral advisor helping them plan their systems integration. Share best practices from other mergers.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Extended Trial',
        name: 'Provide Extended Trial for Merging Entity',
        description: 'Trial for the entity that doesn\'t use your platform yet.',
        playId: 'merger_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide extended trial for the merging entity. Offer 90-day no-risk access to the entity that doesn\'t currently use your platform. Include dedicated onboarding and migration support.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Integration Partner',
        name: 'Position as Integration Partner',
        description: 'Position as partner, not just vendor.',
        playId: 'merger_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as integration partner (not just vendor). Offer professional services for systems integration. Show how your platform bridges both entities during the transition.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Complex Evaluation',
        name: 'Navigate Complex Multi-Stakeholder Eval',
        description: 'Prepare for complex evaluation process.',
        playId: 'merger_announcement',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Expect complex multi-stakeholder evaluation. Build a deal strategy that accounts for multiple decision makers, competing priorities, and a likely formal RFP process. Identify allies and blockers.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 23. Divestiture/Spin-off ───────────────────────────────────────────────
  {
    name: 'Divestiture/Spin-off',
    description:
      'Response to divestiture or spin-off. Day-1 infrastructure package, aggressive deployment, fast implementation, dedicated team, and multi-year price lock.',
    triggerType: 'divestiture_spinoff',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 60, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Net-new logo with multi-year contract, 60-70% conversion, fast 30-60 day cycle',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Day-1 Infrastructure Package',
        name: 'Offer Day-1 Infrastructure Package',
        description: 'Waived setup fees for the new entity.',
        playId: 'divestiture_spinoff',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Day-1 Infrastructure Package with waived setup fees. Position as helping the new entity launch with enterprise-grade tools from day one. Emphasize speed and simplicity.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Aggressive Deployment',
        name: 'Position Aggressive Deployment Package',
        description: 'Fast spin-off deployment with premium support.',
        playId: 'divestiture_spinoff',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position aggressive spin-off deployment package. Include accelerated implementation timeline, dedicated support, and premium features. Make it easy to say yes under time pressure.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Fast Implementation',
        name: 'Emphasize Fast Implementation',
        description: '30-60 day deployment timeline.',
        playId: 'divestiture_spinoff',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Emphasize fast implementation (30-60 days). Present a detailed implementation plan with milestones. Show how you get them live before their Transition Services Agreement expires.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Dedicated Implementation Team',
        name: 'Provide Dedicated Implementation Team',
        description: 'Assign dedicated resources for the spin-off.',
        playId: 'divestiture_spinoff',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide dedicated implementation team. Name specific people who will own their success. Include project manager, technical lead, and customer success manager.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Year Price Lock',
        name: 'Offer Multi-Year Price Lock',
        description: 'Lock in pricing for the new company.',
        playId: 'divestiture_spinoff',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer multi-year price lock for new company. Present 2-3 year agreement with locked pricing. Position as removing budget uncertainty during their critical first years as an independent entity.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 24. Strategic Partnership Announcement ─────────────────────────────────
  {
    name: 'Strategic Partnership Announcement',
    description:
      'Response to strategic partnership. Co-marketing proposal, joint case study, complementary solution positioning, mutual account identification, and joint GTM coordination.',
    triggerType: 'strategic_partnership',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'MARKETING', 'SALES'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      '10-20 net-new pipeline opportunities, integration increases stickiness, 15-25% incremental pipeline',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Co-Marketing Proposal',
        name: 'Propose Co-Marketing Initiative',
        description: 'Joint value proposition with partner.',
        playId: 'strategic_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Propose Co-Marketing & Joint Value Prop initiative. Identify synergies between your solution and their new partnership. Offer to create joint content or co-branded materials.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Joint Case Study',
        name: 'Offer Joint Case Study or Webinar',
        description: 'Three-way case study with partner.',
        playId: 'strategic_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer three-way case study or joint webinar with partner. Position as thought leadership that benefits all parties. Identify a shared customer who can participate.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Complementary Solution',
        name: 'Position Complementary Solution',
        description: 'Solution within partner ecosystem.',
        playId: 'strategic_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position complementary solution within partner ecosystem. Show how your solution enhances the value of their new partnership. Create a "better together" narrative.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Mutual Target Accounts',
        name: 'Identify Mutual Target Accounts',
        description: 'Find co-selling opportunities.',
        playId: 'strategic_partnership',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify mutual target accounts for co-selling. Cross-reference your target accounts with the partner\'s customer base. Build a joint target list for co-selling motions.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Joint GTM Coordination',
        name: 'Coordinate Joint GTM',
        description: 'Work with partnerships team on joint go-to-market.',
        playId: 'strategic_partnership',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Coordinate with partnerships team for joint GTM. Set up regular cadence with partner account teams. Define lead sharing, co-selling rules, and shared success metrics.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 25. Technology Partnership/Integration ─────────────────────────────────
  {
    name: 'Technology Partnership/Integration',
    description:
      'Response to technology partnership. Integration showcase, ecosystem dinner, integrated solution positioning, joint customer stories, and setup assistance.',
    triggerType: 'technology_partnership',
    priority: 5,
    targetDepartmentTypes: ['ENGINEERING', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Drive adoption of integrated features, increase stickiness 40-60%, partner-sourced 30% higher win',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Integration Showcase',
        name: 'Offer Ecosystem Integration Showcase',
        description: 'Free sandbox with integration demo.',
        playId: 'technology_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Ecosystem Integration Showcase with free sandbox. Provide a hands-on environment where they can test the integration between your platform and their new technology partner.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Ecosystem Dinner',
        name: 'Invite to Ecosystem Dinner',
        description: 'Ecosystem-specific networking event.',
        playId: 'technology_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to ecosystem-specific dinner or roundtable. Gather users of both platforms for a peer discussion on integration best practices and shared workflows.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Integrated Solution',
        name: 'Position as Integrated Solution',
        description: 'Solution within their chosen platform.',
        playId: 'technology_partnership',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Position as integrated solution within their chosen platform. Show the combined value proposition and how the integration creates a workflow that neither tool can deliver alone.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Joint Customer Stories',
        name: 'Share Joint Customer Success Stories',
        description: 'Stories from customers using both platforms.',
        playId: 'technology_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share joint customer success stories. Highlight customers who use both platforms together and the results they\'ve achieved. Quantify the integrated value.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Integration Setup Assistance',
        name: 'Offer Integration Setup Assistance',
        description: 'Help setting up the integration.',
        playId: 'technology_partnership',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer integration setup assistance. Provide dedicated support for configuring the integration. Include documentation, hands-on help, and a follow-up optimization session.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 4 — Technology & Product (7)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 26. New Technology Adoption ────────────────────────────────────────────
  {
    name: 'New Technology Adoption',
    description:
      'Response to new technology adoption. Integration briefing, tech-stack roundtable, implementation guide, joint success stories, and platform investment enhancement.',
    triggerType: 'new_technology_adoption',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 60, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Cross-sell integration module, increase daily usage 30-40%, embed into workflow',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Integration Briefing',
        name: 'Share Integration Briefing',
        description: 'Better Together briefing specific to new platform.',
        playId: 'new_technology_adoption',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share "Better Together" Integration Briefing specific to their new platform. Show how your solution connects with the technology they just adopted. Include architecture diagrams and data flow.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Tech-Stack Roundtable',
        name: 'Invite to Tech-Stack Roundtable',
        description: 'Roundtable with other users of both platforms.',
        playId: 'new_technology_adoption',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to tech-stack specific roundtable with other users. Facilitate peer discussion about integration patterns, best practices, and lessons learned from combining both platforms.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Implementation Guide',
        name: 'Provide Integration Playbook',
        description: 'Step-by-step integration implementation guide.',
        playId: 'new_technology_adoption',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide integration playbook and implementation guide. Include step-by-step instructions, common configurations, and troubleshooting tips for connecting both platforms.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Joint Success Stories',
        name: 'Show Joint Customer Success Stories',
        description: 'Case studies from integrated customers.',
        playId: 'new_technology_adoption',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Show joint customer success stories. Share examples of companies using both technologies together and the business outcomes achieved. Include metrics on adoption and efficiency gains.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Enhance Platform Investment',
        name: 'Position as Enhancing Platform Investment',
        description: 'Amplify the value of their new technology.',
        playId: 'new_technology_adoption',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as enhancing their platform investment. Show how your solution multiplies the ROI of the technology they just adopted. Frame the integration as essential to realizing full value.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 27. Platform Migration ─────────────────────────────────────────────────
  {
    name: 'Platform Migration',
    description:
      'Response to platform migration. Migration de-risking service, account protection, free sandbox POC, de-risk positioning, and migration assistance.',
    triggerType: 'platform_migration',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Prevent churn if migrating away, 50-60% displacement if migrating TO, embed deeply',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Migration De-Risking Service',
        name: 'Offer Migration De-Risking Service',
        description: 'Help them reduce migration risk.',
        playId: 'platform_migration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If you integrate with NEW platform: offer Migration De-risking Service. If you integrate with OLD platform: protect account urgently. Tailor the approach based on which direction they\'re migrating.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Account Protection',
        name: 'Protect Account if Relevant',
        description: 'Urgent outreach if migration threatens your position.',
        playId: 'platform_migration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If you integrate with OLD platform: protect account urgently. Schedule immediate call with champion. Present migration path that keeps your solution in the stack. Show compatibility with new platform.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Sandbox POC',
        name: 'Provide Free Sandbox POC',
        description: 'Free professional services or POC on new environment.',
        playId: 'platform_migration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide free professional services or sandbox POC on new environment. Demonstrate your solution works seamlessly on their target platform. Remove technical risk as a concern.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'De-Risk Positioning',
        name: 'Position as De-Risking Their Migration',
        description: 'Reduce migration risk and complexity.',
        playId: 'platform_migration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as de-risking their migration. Show how your solution provides continuity during the platform transition. Highlight zero-downtime migration paths and rollback capabilities.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Migration Assistance',
        name: 'Offer Migration & Change Management',
        description: 'Full migration and change management support.',
        playId: 'platform_migration',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer migration assistance and change management support. Include user training, data migration, configuration migration, and parallel running support. Position as the easiest part of their migration.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 28. Legacy System Sunset ───────────────────────────────────────────────
  {
    name: 'Legacy System Sunset',
    description:
      'Critical response to legacy system sunset. Displacement fast-track with competitive buyout, migration tooling, modern replacement positioning, change management, and time-bound evaluation.',
    triggerType: 'legacy_system_sunset',
    priority: 10,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS', 'EXECUTIVE_LEADERSHIP'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 90, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '60-80% conversion (forced buying), win without prolonged RFP, fast 60-90 day cycle',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Displacement Fast-Track',
        name: 'Offer Displacement Fast-Track',
        description: 'Competitive buyout with free months until old contract expires.',
        playId: 'legacy_system_sunset',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Displacement Fast-Track with competitive buyout (free months until old contract expires). Make switching economically painless. Remove the financial barrier to moving quickly.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Migration Tooling',
        name: 'Provide Migration Tooling & Team',
        description: 'Dedicated migration tools and implementation team.',
        playId: 'legacy_system_sunset',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide migration tooling and dedicated implementation team. Include automated data migration, configuration transfer, and hands-on onboarding. Show that migration is managed, not self-serve.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Modern Replacement',
        name: 'Position as Modern Replacement',
        description: 'Modern alternative with ROI justification.',
        playId: 'legacy_system_sunset',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Position as modern replacement with ROI justification. Show a side-by-side comparison of legacy vs. modern capabilities. Quantify the productivity and efficiency gains of upgrading.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Change Management Support',
        name: 'Emphasize Change Management',
        description: 'User adoption and change management resources.',
        playId: 'legacy_system_sunset',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Emphasize change management and user adoption support. Address the biggest fear in legacy migration: user resistance. Offer training programs, adoption coaching, and phased rollout plans.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Time-Bound Evaluation',
        name: 'Expect Time-Bound Evaluation',
        description: 'Serious evaluation with a hard deadline.',
        playId: 'legacy_system_sunset',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Expect serious time-bound evaluation. Track their legacy system sunset date. Build urgency around the timeline. Offer an accelerated evaluation process that fits within their migration window.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 29. Product Launch Announcement ────────────────────────────────────────
  {
    name: 'Product Launch Announcement',
    description:
      'Response to product launch. Congratulatory gift, launch support package, success positioning, launch case studies, and pilot program offer.',
    triggerType: 'product_launch_announcement',
    priority: 8,
    targetDepartmentTypes: ['MARKETING', 'ENGINEERING', 'SALES', 'EXECUTIVE_LEADERSHIP'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Expand seat count, 40-50% expansion opportunity, lock in as foundational tool',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Congratulatory Gift',
        name: 'Send Congratulatory Gift',
        description: 'Celebrate their launch and identify tool needs.',
        playId: 'product_launch_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send congratulatory gift and identify tools needed for new product. Reference their launch specifics. Position your congratulations as genuine excitement about their new product.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Launch Support Package',
        name: 'Offer Launch Support Care Package',
        description: 'Use-case workshop for their new product.',
        playId: 'product_launch_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Launch Support Care Package and use-case workshop. Include resources specifically tailored to supporting their new product launch: templates, workflows, and best practices.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Launch Success Solutions',
        name: 'Position Solutions for Launch Success',
        description: 'Tools that help the launch succeed.',
        playId: 'product_launch_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position solutions that help launch succeed. Map your capabilities to the specific needs of a product launch: marketing automation, customer feedback, analytics, or team collaboration.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Launch Case Studies',
        name: 'Share Launch Case Studies',
        description: 'Case studies from similar product launches.',
        playId: 'product_launch_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share case studies from similar product launches. Highlight companies that used your platform during their product launch and the results they achieved.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Pilot Program',
        name: 'Offer Pilot Program',
        description: 'Pilot program for the new product team.',
        playId: 'product_launch_announcement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer pilot program for new product team. Provide dedicated access and support for the team building the new product. Frame as a low-risk way to evaluate your solution for this use case.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 30. Security Breach/Incident ───────────────────────────────────────────
  {
    name: 'Security Breach/Incident',
    description:
      'Critical response to security breach. Urgent remediation consult, CISO briefing, emergency free trial, empathetic fast positioning, and delayed outreach if not security solution.',
    triggerType: 'security_breach',
    priority: 10,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'EXECUTIVE_LEADERSHIP', 'ENGINEERING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Emergency deployment 7-14 days, 70-80% conversion to enterprise contract, board-level urgency',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Urgent Remediation Consult',
        name: 'Offer Urgent Remediation Consult',
        description: 'Immediate help within 1 week if relevant.',
        playId: 'security_breach',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'If security solution: offer Urgent Remediation Consult within 1 week. Lead with empathy and genuine desire to help. Do not capitalize on fear — offer real, immediate value.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Confidential CISO Briefing',
        name: 'Provide Confidential Security Briefing',
        description: 'Briefing with your CISO.',
        playId: 'security_breach',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide confidential security briefing with your CISO. Offer peer-to-peer conversation about incident response, remediation steps, and prevention. Keep it confidential and empathetic.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Emergency Free Trial',
        name: 'Offer Emergency Free Trial',
        description: '30-day emergency trial with white-glove support.',
        playId: 'security_breach',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer 30-day emergency free trial with white-glove support. Include dedicated security engineer, 24/7 support, and immediate implementation. Remove all friction from getting started.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Empathetic Fast-Value',
        name: 'Emphasize Empathy & Fast Time-to-Value',
        description: 'Lead with empathy and speed.',
        playId: 'security_breach',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Emphasize empathy and fast time-to-value. Focus messaging on helping them recover and prevent recurrence. Show deployment timelines measured in days, not weeks.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Wait if Not Security',
        name: 'Wait 2-3 Months if Not Security Solution',
        description: 'Delay outreach if solution is not security-related.',
        playId: 'security_breach',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'If not security solution: wait 2-3 months. Set a delayed follow-up. When you do reach out, reference lessons learned from the breach as context for improving their overall operations.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 31. Compliance Certification Pursued ───────────────────────────────────
  {
    name: 'Compliance Certification Pursued',
    description:
      'Response to compliance certification pursuit. Compliance accelerator kit, expert session, certification resources, compliance features positioning, and audit support.',
    triggerType: 'compliance_certification',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'EXECUTIVE_LEADERSHIP', 'FINANCE'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Manufacturing'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 180, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Upsell compliance modules, 50-60% conversion during cert process, trusted partner',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Compliance Accelerator Kit',
        name: 'Offer Compliance Accelerator Kit',
        description: 'Relevant compliance mapping report.',
        playId: 'compliance_certification',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Compliance Accelerator Kit with relevant mapping report. Show how your platform maps to their target certification requirements. Include gap analysis templates and checklists.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Compliance Expert Session',
        name: 'Provide Expert Session',
        description: 'Session with your compliance experts.',
        playId: 'compliance_certification',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide session with your compliance experts. Offer a complimentary session where your team walks through the certification requirements and shows how your platform accelerates compliance.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Certification Resources',
        name: 'Share Certification Resources',
        description: 'Resources to help achieve certification faster.',
        playId: 'compliance_certification',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share resources to help achieve certification faster. Include guides, templates, control mapping documents, and timelines from similar companies who achieved the same certification.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Compliance Features',
        name: 'Position Compliance Features',
        description: 'Compliance-enabling features and security add-ons.',
        playId: 'compliance_certification',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position compliance-enabling features and security add-ons. Demonstrate specific platform capabilities that directly map to certification controls. Show audit trail, access management, and encryption features.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Audit Support',
        name: 'Offer Audit Support',
        description: 'Audit support and documentation assistance.',
        playId: 'compliance_certification',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer audit support and documentation. Provide auditor-ready documentation packages, evidence collection support, and audit preparation assistance. Position as a compliance partner.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 32. Tech Stack Changes Detected ────────────────────────────────────────
  {
    name: 'Tech Stack Changes Detected',
    description:
      'Response to tech stack changes. ABM tech-stack video, integration gap analysis, stack optimization review, connective tissue positioning, and tool adoption reference.',
    triggerType: 'tech_stack_changes',
    priority: 5,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'MARKETING', 'SALES', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 28, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      '30-40% receptive, position as integration layer, expand into new use case',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Tech-Stack Tear-Down Video',
        name: 'Send ABM Tech-Stack Video',
        description: 'Personalized tech-stack analysis video.',
        playId: 'tech_stack_changes',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send ABM personalized tech-stack tear-down video. Create a brief video walkthrough analyzing their updated tech stack and identifying where your solution fills gaps or enhances integrations.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Integration Gaps',
        name: 'Highlight Integration Gaps',
        description: 'Show gaps and complementary capabilities.',
        playId: 'tech_stack_changes',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Highlight integration gaps or complementary capabilities. Identify specific workflows that break or degrade with their stack changes and how your platform bridges those gaps.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Stack Optimization Review',
        name: 'Offer Stack Optimization Review',
        description: 'Comprehensive review of their updated stack.',
        playId: 'tech_stack_changes',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Stack Optimization Review. Provide a complimentary assessment of their updated tech stack, identifying redundancies, integration opportunities, and areas where your solution adds value.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Connective Tissue',
        name: 'Position as Connective Tissue',
        description: 'Your tool as the integration layer in their stack.',
        playId: 'tech_stack_changes',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position your tool as connective tissue in new stack. Show how your platform integrates the various tools in their updated stack, creating a unified workflow and single source of truth.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'New Tool Adoption Reference',
        name: 'Reference New Tool Adoption',
        description: 'Use their new tool adoption as conversation hook.',
        playId: 'tech_stack_changes',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference new tool adoption in outreach. Use their specific tool changes as a natural conversation starter. Show you\'re paying attention to their evolving needs.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 5 — Market & Competitive (6)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 33. Analyst Recognition ────────────────────────────────────────────────
  {
    name: 'Analyst Recognition',
    description:
      'Response to analyst recognition. Physical report with note, benchmark workshop, report-referenced outreach, leader positioning, and competitive differentiation.',
    triggerType: 'analyst_recognition',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Elevate brand perception, 30-40% increase in enterprise win rate, shorter selection',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Physical Report & Note',
        name: 'Send Physical Report with Note',
        description: 'Physical copy with personalized message.',
        playId: 'analyst_recognition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send physical copy of analyst report with personalized note. Reference their specific evaluation process or known priorities. Make it feel curated, not mass-mailed.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Benchmark Workshop',
        name: 'Offer Analyst Benchmark Workshop',
        description: 'Compare their metrics to industry peers.',
        playId: 'analyst_recognition',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer Analyst Benchmark Workshop comparing their metrics to peers. Use the analyst report data to show where they rank relative to competitors and where your solution improves their position.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Report-Referenced Outreach',
        name: 'Reference Report in Outreach',
        description: 'Use the report in proposals and emails.',
        playId: 'analyst_recognition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Reference report in outreach and proposals. Quote specific findings relevant to their situation. Position your solution within the analyst\'s framework and recommendations.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Leader Positioning',
        name: 'Position Among Leaders',
        description: 'Solution used by other leaders in the quadrant.',
        playId: 'analyst_recognition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as solution used by other leaders in the quadrant. Reference notable companies in the leader category who use your platform. Create peer pressure through positive association.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Competitive Differentiation',
        name: 'Use for Competitive Differentiation',
        description: 'Leverage report for competitive positioning.',
        playId: 'analyst_recognition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Use for competitive differentiation. Create comparison materials using analyst criteria. Show where your solution outperforms alternatives on the dimensions the report measures.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 34. Regulatory Changes ─────────────────────────────────────────────────
  {
    name: 'Regulatory Changes',
    description:
      'Response to regulatory changes. Expert webinar, regulatory audit, compliance solutions, implementation guides, and time-bound urgency.',
    triggerType: 'regulatory_change',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Healthcare', 'Finance', 'Automotive', 'Manufacturing', 'Technology'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Create immediate upgrade urgency, 50-60% conversion during window, compliance partner',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Expert Webinar',
        name: 'Host Expert Webinar on New Regulation',
        description: 'Webinar within 1-2 weeks on the new regulation.',
        playId: 'regulatory_change',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Host expert webinar on new regulation within 1-2 weeks. Position your team as thought leaders on the regulatory change. Include practical guidance and compliance timelines.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Regulatory Audit',
        name: 'Offer Regulatory Preparedness Audit',
        description: 'Free gap analysis against new regulations.',
        playId: 'regulatory_change',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer free Regulatory Preparedness Audit or gap analysis. Help them understand where they stand relative to the new requirements and what gaps need to be addressed.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Compliance Solutions',
        name: 'Position Compliance Solutions',
        description: 'Solutions that help adapt faster.',
        playId: 'regulatory_change',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position compliance solutions that help adapt faster. Map your platform\'s capabilities to specific regulatory requirements. Show how you accelerate their path to compliance.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Regulatory Resources',
        name: 'Share Regulatory Resources',
        description: 'Implementation guides and resources.',
        playId: 'regulatory_change',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share regulatory resources and implementation guides. Provide comprehensive documentation on how your platform helps meet each requirement. Include compliance checklists and timelines.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Time-Bound Urgency',
        name: 'Create Time-Bound Urgency',
        description: 'Urgency around compliance deadline.',
        playId: 'regulatory_change',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Create event with time-bound urgency. Reference the regulatory compliance deadline. Show the cost of non-compliance and the timeline needed for implementation. Drive urgency to act now.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 35. Competitor Displacement ────────────────────────────────────────────
  {
    name: 'Competitor Displacement',
    description:
      'Critical response to competitor displacement opportunity. Research departure reasons, aggressive switch campaign, free migration, target weaknesses, and fast 30-60 day window.',
    triggerType: 'competitor_displacement',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 60, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '40-60% win rate if engaged within 30 days, fast 60-90 day cycle, premium pricing',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Research Departure Reasons',
        name: 'Research Why They Left Competitor',
        description: 'Understand complaints, gaps, and pricing issues.',
        playId: 'competitor_displacement',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Research why they left competitor (complaints, gaps, pricing). Scan reviews, social media, and community forums. Identify the specific pain points that drove the decision to switch.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Switch & Save Campaign',
        name: 'Offer Switch & Save Campaign',
        description: 'Aggressive displacement package.',
        playId: 'competitor_displacement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer aggressive Switch & Save Campaign with displacement package. Include competitive buyout pricing, free migration, extended trial, and dedicated onboarding. Make switching irresistible.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Free Migration',
        name: 'Provide Free Migration & Implementation',
        description: 'Data migration and implementation support.',
        playId: 'competitor_displacement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide free data migration and implementation support. Offer white-glove migration services including data transfer, configuration mapping, and user training. Remove all switching costs.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Target Weaknesses',
        name: 'Position Against Competitor Weaknesses',
        description: 'Address specific competitor shortcomings.',
        playId: 'competitor_displacement',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position against competitor\'s specific weaknesses. Address the exact pain points you identified in your research. Show how your solution specifically solves each problem they experienced.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Move Fast — 30-60 Day Window',
        name: 'Move Quickly Before Window Closes',
        description: 'Fast evaluation before new vendor selected.',
        playId: 'competitor_displacement',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Move quickly before new vendor selected (30-60 day window). Accelerate the evaluation process. Offer rapid POC, expedited procurement, and decision-maker alignment meetings.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 36. Contract Renewal Window ────────────────────────────────────────────
  {
    name: 'Contract Renewal Window',
    description:
      'Response to competitor contract renewal window. Research incumbent weaknesses, vendor bake-off invitation, switching business case, competitive battlecard, and risk-reversal offer.',
    triggerType: 'contract_renewal_window',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'FINANCE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 180, triggerDaysBefore: 180, urgencyDecay: 'linear' },
    expectedOutcome:
      '25-35% competitive win rate, premium pricing, multi-year lock-in',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Research Incumbent',
        name: 'Research Incumbent Weaknesses',
        description: 'Identify pain points with current vendor.',
        playId: 'contract_renewal_window',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Research incumbent weaknesses and customer pain points. Scan reviews, community forums, and social media for complaints about their current vendor. Build a competitive intelligence brief.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Vendor Bake-off Invitation',
        name: 'Offer Vendor Bake-off Invitation',
        description: 'Custom POC and competitive evaluation.',
        playId: 'contract_renewal_window',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Vendor Bake-off Invitation with custom POC. Position as a risk-free way to evaluate alternatives before they renew. Provide a structured evaluation framework.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Switching Business Case',
        name: 'Build Business Case for Switching',
        description: 'Include switching costs and TCO analysis.',
        playId: 'contract_renewal_window',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Build business case for switching including switching costs. Show the total cost of ownership comparison over 3 years. Include hidden costs of staying with incumbent vs. migration investment.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Competitive Battlecard',
        name: 'Provide Competitive Battlecard & TCO',
        description: 'Detailed competitive analysis and total cost.',
        playId: 'contract_renewal_window',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide competitive battlecard and TCO analysis. Create a detailed feature comparison, pricing comparison, and customer satisfaction comparison. Make it easy to justify the switch internally.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Risk-Reversal',
        name: 'Offer Risk-Reversal',
        description: 'Easy migration, trial period, and guarantees.',
        playId: 'contract_renewal_window',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer risk-reversal (easy migration, trial period). Remove the perceived risk of switching: satisfaction guarantee, free migration, parallel running, and a clear rollback plan.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 37. Public Vendor Complaints ───────────────────────────────────────────
  {
    name: 'Public Vendor Complaints',
    description:
      'Response to public vendor complaints. Personalized empathetic email, pain-point rescue video, migration support, exact-pain solution, and speed while frustration is high.',
    triggerType: 'public_vendor_complaints',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 2, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '50-70% response rate, convert frustrated user into champion, fast displacement',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Empathetic Email',
        name: 'Send Empathetic Personalized Email',
        description: 'Reference the specific issue with empathy.',
        playId: 'public_vendor_complaints',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send highly personalized empathetic email referencing the specific issue. Acknowledge their frustration genuinely. Do not pitch — offer help and understanding first.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Pain-Point Rescue Video',
        name: 'Offer Pain-Point Rescue Mission',
        description: 'Direct solution video addressing their issue.',
        playId: 'public_vendor_complaints',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Pain-Point Rescue Mission with direct solution video. Create a brief personalized video showing exactly how your platform solves the specific issue they complained about.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Migration Support',
        name: 'Provide Migration Support',
        description: 'Migration support and dedicated onboarding.',
        playId: 'public_vendor_complaints',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide migration support and dedicated onboarding. Make switching as easy as possible. Include data migration, setup assistance, and hands-on onboarding for their team.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Exact-Pain Solution',
        name: 'Position as Exact Solution',
        description: 'Solution to their exact complaint.',
        playId: 'public_vendor_complaints',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position as solution to their exact complaint. Show a direct comparison of how the specific issue they experienced would not happen on your platform. Be specific and evidence-based.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Strike While Hot',
        name: 'Strike While Frustration is High',
        description: 'Follow up within 24-48 hours.',
        playId: 'public_vendor_complaints',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Strike within 24-48 hours while pain is fresh. Track their response to outreach. If engaged, fast-track to demo and POC. If no response, try alternate channel (LinkedIn, phone).',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 38. Competitor Acquisition ─────────────────────────────────────────────
  {
    name: 'Competitor Acquisition',
    description:
      'Response to competitor being acquired. Safe harbor migration with price lock, stability positioning, dedicated migration teams, acquired vendor concerns, and transition urgency.',
    triggerType: 'competitor_acquisition',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Capture 20-30% market share, 6-12 month cycle, multi-year deals',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Safe Harbor Migration',
        name: 'Offer Safe Harbor Migration',
        description: 'Price-lock guarantees and stability.',
        playId: 'competitor_acquisition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Safe Harbor Migration with price-lock guarantees. Reference the acquisition news. Position your platform as a stable alternative with guaranteed pricing and roadmap clarity.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Stability & Roadmap',
        name: 'Position Stability & Clear Roadmap',
        description: 'Clear roadmap vs acquisition uncertainty.',
        playId: 'competitor_acquisition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position stability and clear roadmap vs uncertainty. Highlight the risks of staying with an acquired vendor: product direction changes, team turnover, integration distractions, and support degradation.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Dedicated Migration Teams',
        name: 'Provide Dedicated Migration Teams',
        description: 'Migration teams and support resources.',
        playId: 'competitor_acquisition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide dedicated migration teams and support. Assign named individuals responsible for their migration. Include project timeline, data migration plan, and training schedule.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Acquired Vendor Concerns',
        name: 'Highlight Acquired Vendor Concerns',
        description: 'Concerns about acquired vendor focus and stability.',
        playId: 'competitor_acquisition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Highlight concerns about acquired vendor\'s focus. Share industry data on what typically happens to acquired products: reduced investment, team departures, feature stagnation. Be factual, not fear-mongering.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Transition Urgency',
        name: 'Create Transition Window Urgency',
        description: 'Urgency around 6-12 month transition window.',
        playId: 'competitor_acquisition',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Create urgency around transition window (6-12 months). Show that the best migration deals and support are available now, before the dust settles. Position early movers as getting the best terms.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 6 — Digital & Intent Signals (8, skipping duplicate job_posting)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 39. Pricing Page Visits ────────────────────────────────────────────────
  {
    name: 'Pricing Page Visits',
    description:
      'Critical response to pricing page visits. Immediate personalized outreach, custom pricing consultation, pricing comparison, objection handling, and fast-track to proposal.',
    triggerType: 'pricing_page_visits',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '40-50% conversion to meeting within 48 hours, fast-track to pricing proposal',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Immediate Personalized Outreach',
        name: 'Trigger Immediate Outreach',
        description: 'Personalized email or chat within 1 hour.',
        playId: 'pricing_page_visits',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Trigger immediate personalized email or chat within 1 hour. Reference their company and likely use case. Offer to help them understand pricing options. Don\'t be pushy — be helpful.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Custom Pricing Consultation',
        name: 'Offer Custom Pricing Consultation',
        description: 'ROI calculator session and custom pricing.',
        playId: 'pricing_page_visits',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer custom pricing consultation and ROI calculator session. Position as helping them build the business case internally. Include preliminary ROI estimates based on their company size and industry.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Pricing Comparison',
        name: 'Provide Pricing Comparison',
        description: 'Value justification and comparison.',
        playId: 'pricing_page_visits',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide pricing comparison and value justification. Show how your pricing compares to alternatives and the total value delivered. Include ROI examples from similar companies.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Objection Handling',
        name: 'Address Pricing Objections',
        description: 'Proactively handle common pricing concerns.',
        playId: 'pricing_page_visits',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Address common pricing objections proactively. Anticipate concerns about cost, ROI timeline, and budget approval. Provide ammunition for the internal champion to justify the investment.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Fast-Track to Proposal',
        name: 'Fast-Track to Proposal',
        description: 'Move quickly to formal proposal.',
        playId: 'pricing_page_visits',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Fast-track to proposal stage. If there\'s engagement, move directly to a formal pricing proposal. Include custom packaging, implementation timeline, and contract terms. Remove delays.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 40. Demo Request/Trial Signup ──────────────────────────────────────────
  {
    name: 'Demo Request/Trial Signup',
    description:
      'Critical response to demo request or trial signup. Speed-to-lead response, senior AE routing, personalized sandbox, fast demo booking, and multi-threading.',
    triggerType: 'demo_request_trial',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '60-70% demo show rate if within 2 hours, 30-40% to opportunity, fast 30-60 day cycle',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Speed-to-Lead Response',
        name: 'Respond Within 2 Hours',
        description: 'Speed-to-lead is critical.',
        playId: 'demo_request_trial',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Respond within 2 hours (speed-to-lead critical). Acknowledge their request immediately. Confirm you\'ll be their dedicated contact. Ask one qualifying question to personalize the demo.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Senior AE Routing',
        name: 'Route to Senior AE',
        description: 'Ensure the right person handles the opportunity.',
        playId: 'demo_request_trial',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Route to senior AE immediately. Qualify the lead and ensure the right AE is assigned based on territory, deal size, and industry. Brief the AE with all available context.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Personalized Sandbox',
        name: 'Provide Personalized Sandbox',
        description: 'Sandbox pre-loaded with their industry data.',
        playId: 'demo_request_trial',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide personalized sandbox pre-loaded with their industry data. Set up a trial environment that reflects their use case. Include sample data, workflows, and configurations relevant to their industry.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Fast Demo Booking',
        name: 'Book Demo Within 48 Hours',
        description: 'Schedule demo as quickly as possible.',
        playId: 'demo_request_trial',
        assetTypes: ['email'],
        channel: 'meeting',
        promptHint:
          'Book demo within 48 hours. Send calendar invite with multiple time options. Include a brief agenda tailored to their stated needs. Confirm attendees and their roles.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Thread',
        name: 'Multi-Thread to Decision Maker',
        description: 'Engage the requester\'s manager and decision maker.',
        playId: 'demo_request_trial',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Multi-thread to manager/decision maker immediately. After the demo, reach out to the requester\'s manager with a tailored message. Position the demo results and next steps for broader evaluation.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 41. Case Study Downloads ───────────────────────────────────────────────
  {
    name: 'Case Study Downloads',
    description:
      'Response to case study downloads. Send additional studies, offer peer reference call, identify use case signals, customer reference follow-up, and fast-track to validation.',
    triggerType: 'case_study_downloads',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '50-60% request reference call, validate and move to selection, shorten cycle by 20%',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Additional Case Studies',
        name: 'Send Additional Relevant Case Studies',
        description: 'More studies from similar companies.',
        playId: 'case_study_downloads',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send additional relevant case studies from similar companies. Based on what they downloaded, curate 2-3 more case studies that match their industry, size, or use case.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Peer Reference Call',
        name: 'Offer Peer-to-Peer Reference Call',
        description: 'Direct call with featured customer.',
        playId: 'case_study_downloads',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Peer-to-Peer Reference: direct call with featured customer. Identify a reference customer in a similar role and industry who can speak to the results firsthand.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Use Case Identification',
        name: 'Identify Use Case from Downloads',
        description: 'Determine which case studies signal their priorities.',
        playId: 'case_study_downloads',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify which case studies downloaded (signals use case). Analyze their download pattern to determine their primary pain point, priority use case, and likely buying stage.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Customer Reference',
        name: 'Follow Up with Reference Offer',
        description: 'Offer customer reference for validation.',
        playId: 'case_study_downloads',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Follow up with customer reference offer. Provide specific names and companies willing to speak. Make it easy for them to schedule directly. Include a brief on what each reference can speak to.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Fast-Track Validation',
        name: 'Fast-Track to Validation Stage',
        description: 'Move to selection and validation.',
        playId: 'case_study_downloads',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Fast-track to validation stage. Based on their engagement with case studies and references, propose a structured evaluation: POC, technical review, or business case workshop.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 42. Content Consumption Spike ──────────────────────────────────────────
  {
    name: 'Content Consumption Spike',
    description:
      'Response to content consumption spike. Track consumed content, send premium content gift, nurture with resources, offer educational webinar, and establish thought leadership.',
    triggerType: 'content_consumption_spike',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      '25-30% convert to discovery, establish thought leadership, low-pressure relationship',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Track Content Consumed',
        name: 'Track Content Consumption Patterns',
        description: 'Identify pain points from content consumed.',
        playId: 'content_consumption_spike',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Track which content consumed (identify pain points). Analyze the topics, formats, and frequency of their content engagement. Build a profile of their likely concerns and priorities.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Premium Content Gift',
        name: 'Send High-Value Content Gift',
        description: 'Premium book or proprietary research.',
        playId: 'content_consumption_spike',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send High-Value Content Gift: premium book or proprietary research. Choose something related to the topics they\'ve been consuming. Position as "since you\'ve been exploring X, you might find this valuable."',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Educational Resources',
        name: 'Nurture with Educational Resources',
        description: 'Relevant educational content and resources.',
        playId: 'content_consumption_spike',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Nurture with relevant educational resources. Send a curated learning path based on their content consumption patterns. Include a mix of formats: articles, videos, webinars, and templates.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Educational Webinar',
        name: 'Offer Educational Webinar or Assessment',
        description: 'Webinar or assessment on their topic of interest.',
        playId: 'content_consumption_spike',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer educational webinar or assessment. Invite them to a live session on the topic they\'ve been researching. Position as educational, not a sales pitch.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Thought Leadership',
        name: 'Position as Thought Leader',
        description: 'Establish thought leadership relationship.',
        playId: 'content_consumption_spike',
        assetTypes: ['linkedin_inmail'],
        channel: 'linkedin',
        promptHint:
          'Position as thought leader. Connect on LinkedIn with a message referencing shared interests in the topics they\'ve been exploring. Share your own perspective or content on the subject.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 43. Competitor Comparison Views ────────────────────────────────────────
  {
    name: 'Competitor Comparison Views',
    description:
      'Critical response to competitor comparison views. Transparent executive briefing, competitive battlecard, custom POC, comparison call, and narrative control.',
    triggerType: 'competitor_comparison_views',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '50-60% win rate with proactive response, control bake-off narrative',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Why We Win Briefing',
        name: 'Send Why We Win Executive Briefing',
        description: 'Transparent competitive briefing within 24 hours.',
        playId: 'competitor_comparison_views',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send transparent Why We Win Executive Briefing within 24 hours. Be honest about strengths and differentiation. Don\'t trash competitors — show clear, fact-based advantages.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Competitive Battlecard',
        name: 'Provide Competitive Battlecard',
        description: 'Differentiation and comparison materials.',
        playId: 'competitor_comparison_views',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide competitive battlecard and differentiation. Include feature comparison, customer satisfaction data, and specific areas where you outperform. Use third-party data when possible.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Custom POC',
        name: 'Offer Custom POC to Prove Differentiators',
        description: 'POC focused on competitive advantages.',
        playId: 'competitor_comparison_views',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer custom POC to prove differentiators. Design the POC to showcase your specific advantages over the competitor they\'re evaluating. Include measurable success criteria.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Comparison Call',
        name: 'Schedule Comparison Discussion',
        description: 'Call to address comparison questions.',
        playId: 'competitor_comparison_views',
        assetTypes: ['talking_points'],
        channel: 'call',
        promptHint:
          'Schedule call to address comparison questions. Prepare specific answers to the comparison criteria they\'re evaluating. Be ready to do a live side-by-side demonstration.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Control Narrative',
        name: 'Control the Bake-Off Narrative',
        description: 'Get ahead before competitor controls the story.',
        playId: 'competitor_comparison_views',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Control the narrative before competitor does. Set the evaluation criteria. Provide your own comparison framework that highlights your strengths. Ensure your champion has the tools to advocate internally.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 44. Review Site Research ───────────────────────────────────────────────
  {
    name: 'Review Site Research',
    description:
      'Response to review site research. Proactively share best reviews, ROI metrics, customer panel webinar, address negative themes, and offer references.',
    triggerType: 'review_site_research',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 2, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Neutralize negative reviews early, 40-50% advance to selection, increase win rate 20-30%',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Share Best Reviews',
        name: 'Proactively Share Best Reviews',
        description: 'Send top G2/Gartner Peer Insights reviews.',
        playId: 'review_site_research',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Proactively send best G2/Gartner Peer Insights reviews. Curate the top 5-10 reviews most relevant to their industry and use case. Include review excerpts in the email.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'ROI & Satisfaction Data',
        name: 'Share ROI Metrics & Satisfaction Data',
        description: 'Customer satisfaction and ROI evidence.',
        playId: 'review_site_research',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Share ROI metrics and customer satisfaction data. Include NPS scores, customer retention rates, average ROI achieved, and time-to-value metrics. Use aggregate data for credibility.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Customer Panel Webinar',
        name: 'Invite to Customer Panel Webinar',
        description: 'Hear from real customers in a live setting.',
        playId: 'review_site_research',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to customer panel webinar. Offer a live session where real customers discuss their experience. Include customers from similar industries and use cases.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Address Negative Themes',
        name: 'Address Negative Review Themes',
        description: 'Proactively address common negative themes.',
        playId: 'review_site_research',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Address common negative review themes proactively. Identify the top 3 concerns from reviews and explain what you\'ve done to address them. Show product improvements and customer feedback.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Customer References',
        name: 'Offer Customer References',
        description: 'Direct references for validation.',
        playId: 'review_site_research',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer customer references to validate. Provide 3-5 reference customers matched to their industry, size, and use case. Include brief descriptions of what each reference can speak to.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 45. Event/Webinar Registration ─────────────────────────────────────────
  {
    name: 'Event/Webinar Registration',
    description:
      'Response to event or webinar registration. Pre-event thank you, post-event personalized video, deeper dive session, session priority identification, and educational to sales conversion.',
    triggerType: 'event_webinar_registration',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      '20-30% convert to opportunity, 40% higher close rate, multi-threading',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Pre-Event Thank You',
        name: 'Send Pre-Event Resources',
        description: 'Personalized thank you and pre-event materials.',
        playId: 'event_webinar_registration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send personalized thank you and pre-event resources. Reference the specific event or webinar they registered for. Include preparatory materials that enhance their experience.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Post-Event Video',
        name: 'Send Post-Event Personalized Video',
        description: 'Video summarizing key takeaways after event.',
        playId: 'event_webinar_registration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'After event: personalized video summarizing key takeaways. Record a brief video highlighting the 2-3 most relevant insights from the event for their specific situation.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Deeper Dive Session',
        name: 'Offer Deeper Dive Session',
        description: 'Tailored session on topics from the event.',
        playId: 'event_webinar_registration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer deeper dive session tailored to their company. Propose a follow-up conversation that goes deeper on the topics most relevant to their business. Make it educational, not a demo.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Session Priority ID',
        name: 'Identify Priorities from Sessions',
        description: 'Use sessions attended to signal priorities.',
        playId: 'event_webinar_registration',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify which sessions attended (signals priorities). Analyze their session choices to understand their primary concerns and interests. Use this intelligence to tailor follow-up messaging.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Convert to Sales Conversation',
        name: 'Convert Educational Interest to Sales',
        description: 'Bridge from educational engagement to opportunity.',
        playId: 'event_webinar_registration',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Convert educational interest to sales conversation. Based on their event engagement and follow-up interactions, make a natural transition from education to evaluation. Propose a specific next step.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 46. Social Media Complaint ─────────────────────────────────────────────
  {
    name: 'Social Media Complaint',
    description:
      'Response to social media complaint. Public helpful reply, private DM with solution offer, empathetic help-first approach, immediate value delivery, and speed while pain is fresh.',
    triggerType: 'social_media_complaint',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'OPERATIONS', 'SALES', 'MARKETING'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '50-70% respond to empathetic outreach, highly qualified opportunity, pain-driven faster cycle',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Public Helpful Reply',
        name: 'Reply Publicly with Helpful Tip',
        description: 'Public reply with helpful tip, no pitch.',
        playId: 'social_media_complaint',
        assetTypes: ['linkedin_inmail'],
        channel: 'linkedin',
        promptHint:
          'Reply publicly with helpful tip (no pitch). Respond to their complaint with genuine advice or a workaround. Build credibility by helping without expecting anything in return.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Private DM Offer',
        name: 'DM Privately with Solution Offer',
        description: 'Private message offering consultation.',
        playId: 'social_media_complaint',
        assetTypes: ['linkedin_inmail'],
        channel: 'linkedin',
        promptHint:
          'DM privately offering free consultation or solution access. Reference your public reply. Offer to help them solve the underlying problem. Keep it personal and empathetic.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Help-First Approach',
        name: 'Public Help & Private Pitch',
        description: 'Empathize with pain and provide immediate value.',
        playId: 'social_media_complaint',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Public Help & Private Pitch approach. Follow up with an email that expands on your helpful tip. Include a brief case study showing how your solution addresses their exact pain.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Immediate Value Delivery',
        name: 'Empathize and Provide Value',
        description: 'Deliver tangible value based on their pain.',
        playId: 'social_media_complaint',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Empathize with pain and provide immediate value. Offer a free resource, tool, or assessment that directly addresses their complaint. No strings attached — build trust first.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Strike While Fresh',
        name: 'Strike Within 24 Hours',
        description: 'Act while pain is fresh for maximum impact.',
        playId: 'social_media_complaint',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Strike within 24 hours while pain is fresh. Track their response to your public and private outreach. If engaged, fast-track to demo. If no response, follow up one more time on a different channel.',
        assignedRole: 'ae',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Category 7 — Customer Expansion (9)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 48. Usage Spike/Seat Growth ────────────────────────────────────────────
  {
    name: 'Usage Spike/Seat Growth',
    description:
      'Response to usage spike or seat growth. Enterprise true-up proposal, VIP training for power users, premium tier positioning, expansion ROI, and annual contract conversion.',
    triggerType: 'usage_spike_seat_growth',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Convert 40-50% to larger contract, upsell premium, prevent churn from hitting limits',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Enterprise True-Up Proposal',
        name: 'Offer Enterprise True-Up Proposal',
        description: 'Volume discounts for growing usage.',
        playId: 'usage_spike_seat_growth',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer Enterprise True-up Proposal with volume discounts. Reference their growing usage patterns. Present tiered pricing that rewards their growth. Frame as optimizing their investment.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'VIP Power User Training',
        name: 'Invite Power Users to VIP Training',
        description: 'Advanced training or certification for power users.',
        playId: 'usage_spike_seat_growth',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite power users to VIP training or advanced certification. Identify their most active users and offer exclusive access to advanced training. Build deeper product expertise and loyalty.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Premium Tier Upsell',
        name: 'Position Premium Tier',
        description: 'Proactive premium tier or seat expansion.',
        playId: 'usage_spike_seat_growth',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position premium tier or additional seats proactively. Show which premium features would benefit their power users. Present the upgrade as unlocking capabilities they\'re already trying to use.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Expansion ROI',
        name: 'Provide Expansion ROI',
        description: 'ROI based on current usage trends.',
        playId: 'usage_spike_seat_growth',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide expansion ROI based on current usage trends. Show the correlation between their increased usage and business outcomes. Quantify the value of maintaining and growing their investment.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Annual Contract Conversion',
        name: 'Convert to Predictable Annual Contract',
        description: 'Convert overages into annual commitment.',
        playId: 'usage_spike_seat_growth',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Convert overages into predictable annual contract. Present a comprehensive annual agreement that covers their projected usage. Include growth buffer and volume incentives.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 49. Premium Feature Request ────────────────────────────────────────────
  {
    name: 'Premium Feature Request',
    description:
      'Response to premium feature request. Beta program invitation, free premium trial, use-case demo, upgrade business case, and fast-track proposal.',
    triggerType: 'premium_feature_request',
    priority: 8,
    targetDepartmentTypes: ['IT_INFRASTRUCTURE', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager', 'Individual Contributor'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      '60-70% convert to premium, sell add-on module, average $25-75K expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Beta Program Invitation',
        name: 'Invite to Beta Program',
        description: 'Early access to the requested feature.',
        playId: 'premium_feature_request',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to Beta Program for the requested feature. Acknowledge their feature request and offer exclusive early access. Make them feel heard and valued as a product influencer.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Premium Free Trial',
        name: 'Offer Premium Tier Free Trial',
        description: '30-day trial of premium tier with the feature.',
        playId: 'premium_feature_request',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer 30-day free trial of premium tier including the feature. Remove friction from evaluating the premium tier. Let them experience the full value before committing.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Use-Case Demo',
        name: 'Demo Feature in Their Use Case',
        description: 'Show premium feature in context of their work.',
        playId: 'premium_feature_request',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Demo premium feature in context of their use case. Show exactly how the feature they requested solves their specific workflow. Use their data or scenarios when possible.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Upgrade Business Case',
        name: 'Build Business Case for Upgrade',
        description: 'ROI justification for premium tier.',
        playId: 'premium_feature_request',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Build business case for upgrade with ROI. Quantify the value of the premium feature in their context. Include time savings, productivity gains, and competitive advantage.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Fast-Track Upgrade',
        name: 'Fast-Track Upgrade Proposal',
        description: 'Expedite the upgrade process.',
        playId: 'premium_feature_request',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Fast-track upgrade proposal. Present a streamlined upgrade path with clear pricing, implementation timeline, and training plan. Make it easy to get internal approval.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 50. New Department Interest ────────────────────────────────────────────
  {
    name: 'New Department Interest',
    description:
      'Response to new department showing interest. Champion-hosted lunch-and-learn, dedicated workshop, separate business case, cross-department case studies, and new buying center threading.',
    triggerType: 'new_department_interest',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE', 'IT_INFRASTRUCTURE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      '50-60% expansion opportunity, cross-sell into net-new unit, average 2-3x expansion',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Champion-Led Lunch-and-Learn',
        name: 'Champion-Hosted Internal Session',
        description: 'Existing champion hosts session for new department.',
        playId: 'new_department_interest',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Have champion host Internal Lunch-and-Learn for new department. Prepare talking points and demo materials for your internal champion. Make them the hero presenting the solution to their peers.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Department Workshop',
        name: 'Offer Dedicated Workshop',
        description: 'Workshop tailored to new department use case.',
        playId: 'new_department_interest',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Offer dedicated workshop for new department\'s use case. Design a session specifically for their department\'s workflows, challenges, and goals. Show how the platform adapts to their needs.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Separate Business Case',
        name: 'Build Separate Business Case',
        description: 'Independent business case for new department.',
        playId: 'new_department_interest',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Build separate business case for new department. Create a standalone ROI analysis for their specific use case. Don\'t rely on the existing department\'s justification.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Cross-Department Case Studies',
        name: 'Share Cross-Department Case Studies',
        description: 'Case studies from similar cross-department adoption.',
        playId: 'new_department_interest',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Provide case studies from similar cross-department adoption. Show companies that expanded from one department to another and the incremental value created. Include adoption timelines.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'New Buying Center',
        name: 'Multi-Thread into New Buying Center',
        description: 'Engage new department\'s decision makers.',
        playId: 'new_department_interest',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Multi-thread into new buying center. Identify the department head, budget owner, and key users. Tailor messaging for each stakeholder. Use the existing champion for warm introductions.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 51. Customer Raised Funding ────────────────────────────────────────────
  {
    name: 'Customer Raised Funding',
    description:
      'Critical response to existing customer raising funding. Celebratory champagne, executive strategy QBR, growth alignment, growth tier offer, and multi-year expansion proposal.',
    triggerType: 'customer_raised_funding',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'ENGINEERING', 'SALES'],
    targetIndustries: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'],
    targetPersonas: ['C-Suite', 'VP'],
    timingConfig: { validWindowDays: 14, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Massive 2-5x expansion, 60-70% receptive within 4 weeks, ride new budget wave',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Celebratory Gift',
        name: 'Send Celebratory Champagne Gift',
        description: 'High-touch celebration of their funding.',
        playId: 'customer_raised_funding',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send celebratory champagne gift and congratulations. Make it premium and personal. Reference the funding amount and their plans. Express genuine excitement for their growth.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Executive Strategy QBR',
        name: 'Schedule Executive Strategy QBR',
        description: 'In-person executive strategy session or dinner.',
        playId: 'customer_raised_funding',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Schedule in-person Executive Strategy QBR or dinner. Elevate the relationship to executive level. Discuss their growth plans and how your partnership accelerates their funded initiatives.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Growth Alignment',
        name: 'Align Expansion to Growth Goals',
        description: 'Connect your expansion to their funded goals.',
        playId: 'customer_raised_funding',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Align expansion to their growth goals funded by raise. Map your product roadmap to their stated use of funds. Show how expanding your platform directly supports their growth plan.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Growth Tier Offer',
        name: 'Offer Growth Tier',
        description: 'Premium tier with features for scaling.',
        playId: 'customer_raised_funding',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer growth tier with features for scaling. Present the premium tier as the natural next step for their new growth phase. Include features that support their funded initiatives.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Year Expansion',
        name: 'Propose Multi-Year Expansion',
        description: 'Expansion matching their growth trajectory.',
        playId: 'customer_raised_funding',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Propose multi-year expansion matching growth trajectory. Model their expected growth and present a 2-3 year agreement that scales with them. Include favorable pricing locked against future increases.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 52. Customer M&A Activity ──────────────────────────────────────────────
  {
    name: 'Customer M&A Activity',
    description:
      'Response to customer M&A activity. Enterprise standardization blueprint, M&A expansion discount, proactive churn prevention, integration support, and multi-entity pricing.',
    triggerType: 'customer_ma_activity',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Double or triple account size, 50-60% expand into acquired entity, protect from displacement',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Standardization Blueprint',
        name: 'Present Enterprise Standardization Blueprint',
        description: 'Consolidation plan for combined entity.',
        playId: 'customer_ma_activity',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Present Enterprise Standardization Blueprint for consolidation. Show how your platform can serve as the standard across both entities. Include migration timeline and projected savings.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'M&A Discount',
        name: 'Offer M&A Expansion Discount',
        description: 'Special pricing for expanding into acquired company.',
        playId: 'customer_ma_activity',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer M&A discount for expanding into acquired company. Present volume pricing that makes it economically compelling to standardize. Include migration support in the package.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Churn Prevention',
        name: 'Proactive Churn Prevention Outreach',
        description: 'Protect relationship if customer was acquired.',
        playId: 'customer_ma_activity',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Proactive outreach to prevent displacement if acquired. Immediately schedule executive business review. Present ROI and value defense before the parent company evaluates vendors.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Integration Support',
        name: 'Provide Integration & Change Management',
        description: 'Support for integration and change management.',
        playId: 'customer_ma_activity',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Provide integration support and change management. Offer professional services for consolidating both entities onto your platform. Include training, data migration, and parallel running support.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Entity Pricing',
        name: 'Present Multi-Entity Pricing',
        description: 'Comprehensive pricing for combined organization.',
        playId: 'customer_ma_activity',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Multi-entity pricing proposal. Present a unified enterprise agreement covering both entities. Include volume discounts, migration services, and dedicated support. Lock in multi-year commitment.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 53. Contract Renewal Approaching ───────────────────────────────────────
  {
    name: 'Contract Renewal Approaching',
    description:
      'Critical response to approaching contract renewal. Early renewal conversation, business value assessment, expansion identification, renewal + expansion bundle, and multi-year deal proposal.',
    triggerType: 'contract_renewal_approaching',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'FINANCE', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 120, triggerDaysBefore: 120, urgencyDecay: 'linear' },
    expectedOutcome:
      '40-50% renewals include expansion, secure early renewal, lock in multi-year',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Early Renewal Conversation',
        name: 'Start Renewal Conversation Early',
        description: 'Begin renewal 90-120 days before expiration.',
        playId: 'contract_renewal_approaching',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Start renewal conversation 90-120 days early. Frame as a strategic review, not a transactional renewal. Express desire to align the next agreement with their evolving needs.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Business Value Assessment',
        name: 'Conduct Business Value Assessment',
        description: 'Comprehensive ROI review.',
        playId: 'contract_renewal_approaching',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Conduct Business Value Assessment with comprehensive ROI. Compile all usage data, business outcomes, and value delivered during the contract period. Present a compelling renewal case.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Expansion Opportunities',
        name: 'Identify Expansion Opportunities',
        description: 'Find growth areas during usage review.',
        playId: 'contract_renewal_approaching',
        assetTypes: ['talking_points'],
        channel: 'internal',
        promptHint:
          'Identify expansion opportunities during usage review. Analyze which features they\'re underusing, which departments aren\'t onboarded, and where premium features would add value.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Renewal + Expansion Bundle',
        name: 'Bundle Renewal with Expansion',
        description: 'Discount incentive for combined renewal and expansion.',
        playId: 'contract_renewal_approaching',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Bundle renewal + expansion with discount incentive. Present a combined package that makes expanding during renewal more attractive than renewing at the current level.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Multi-Year Deal',
        name: 'Propose Multi-Year Deal',
        description: 'Multi-year commitment with price lock.',
        playId: 'contract_renewal_approaching',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Propose multi-year deal with price lock. Present 2-3 year options with locked pricing. Show the total savings vs. annual renewal. Include growth provisions and flexibility.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 54. Champion Promoted ──────────────────────────────────────────────────
  {
    name: 'Champion Promoted',
    description:
      'Response to champion being promoted. Premium congratulatory gift, next-level strategy briefing, broader purview session, new team introductions, and expansion aligned to new role.',
    triggerType: 'champion_promoted',
    priority: 8,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'ENGINEERING', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['VP', 'Director', 'Manager'],
    timingConfig: { validWindowDays: 7, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Secure top-down mandate for expansion, 60-70% lead to expansion, expand across purview',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Premium Congratulatory Gift',
        name: 'Send Premium Congratulatory Gift',
        description: 'High-quality gift celebrating their promotion.',
        playId: 'champion_promoted',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Send premium congratulatory gift immediately. Make it personal and high-touch. Reference their promotion specifically and your history of working together. Celebrate their success genuinely.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Next-Level Strategy Briefing',
        name: 'Schedule Next-Level Strategy Briefing',
        description: 'Strategy session for their new scope.',
        playId: 'champion_promoted',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Schedule "Next Level" Strategy Briefing for their new scope. Position as helping them think about how to leverage the platform across their expanded responsibilities.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Broader Purview Session',
        name: 'Offer Broader Purview Session',
        description: 'Leverage tool across expanded responsibilities.',
        playId: 'champion_promoted',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer session on leveraging tool across broader purview. Show how the platform capabilities they know can be applied to their new, larger scope. Include use cases they haven\'t explored yet.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'New Team Introductions',
        name: 'Request New Team Introductions',
        description: 'Get introduced to their new team members.',
        playId: 'champion_promoted',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Request introduction to their new team. Ask your champion to connect you with key people in their expanded org. Prepare tailored value propositions for each new stakeholder.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Role-Aligned Expansion',
        name: 'Position Expansion for New Role',
        description: 'Expansion aligned to new responsibilities.',
        playId: 'champion_promoted',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position expansion aligned to new role responsibilities. Present a specific expansion proposal that maps to their new org structure and goals. Make it easy for them to champion internally.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 55. Low NPS/Negative Feedback ──────────────────────────────────────────
  {
    name: 'Low NPS/Negative Feedback',
    description:
      'Critical response to low NPS or negative feedback. Executive escalation call, emergency rescue session, customized remediation plan, concessions offer, and weekly check-ins.',
    triggerType: 'low_nps_negative_feedback',
    priority: 10,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 1, triggerDaysBefore: 0, urgencyDecay: 'step' },
    expectedOutcome:
      'Save 60-70% of at-risk accounts, rebuild trust, prevent churn',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Executive Escalation Call',
        name: 'Executive Escalation Call',
        description: 'Your CEO/VP calls their executive immediately.',
        playId: 'low_nps_negative_feedback',
        assetTypes: ['talking_points'],
        channel: 'call',
        promptHint:
          'Executive Escalation: Your CEO/VP calls their executive immediately. Prepare talking points for your executive: acknowledge the feedback, express concern, and commit to a remediation plan. No defensiveness.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Emergency Rescue Session',
        name: 'Schedule Red-Account Rescue Session',
        description: 'Emergency session to address concerns.',
        playId: 'low_nps_negative_feedback',
        assetTypes: ['talking_points'],
        channel: 'meeting',
        promptHint:
          'Schedule emergency Red-Account Rescue session. Bring your best people: product, engineering, customer success. Listen first, then present a concrete plan to address every concern raised.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'Remediation Plan',
        name: 'Build Customized Remediation Plan',
        description: 'Clear timeline for addressing all concerns.',
        playId: 'low_nps_negative_feedback',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Build customized Remediation Plan with clear timeline. Address every piece of feedback point by point. Include specific actions, owners, and deadlines. Make it a commitment, not a promise.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Concessions Offer',
        name: 'Offer Concessions',
        description: 'Credits, free services, or dedicated support.',
        playId: 'low_nps_negative_feedback',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer concessions (credits, free services, dedicated support). Demonstrate commitment to making things right with tangible investment. Include account credits, premium support upgrade, or free professional services.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Weekly Check-Ins',
        name: 'Weekly Check-Ins Until Recovered',
        description: 'Ongoing follow-up until satisfaction improves.',
        playId: 'low_nps_negative_feedback',
        assetTypes: ['talking_points'],
        channel: 'task',
        promptHint:
          'Weekly check-ins until satisfaction recovered. Set up recurring check-in cadence. Track progress against remediation plan. Escalate any delays. Don\'t stop until NPS improves.',
        assignedRole: 'ae',
      },
    ],
  },

  // ── 56. Customer Case Study Participation ──────────────────────────────────
  {
    name: 'Customer Case Study Participation',
    description:
      'Response to customer participating in case study. Advisory board invitation, early feature access, VIP conference treatment, high-value recognition gift, and expansion during positive moment.',
    triggerType: 'customer_case_study_participation',
    priority: 5,
    targetDepartmentTypes: ['EXECUTIVE_LEADERSHIP', 'MARKETING', 'SALES'],
    targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail'],
    targetPersonas: ['C-Suite', 'VP', 'Director'],
    timingConfig: { validWindowDays: 30, triggerDaysBefore: 0, urgencyDecay: 'linear' },
    expectedOutcome:
      'Cement lifelong loyalty, 40-50% receptive to expansion, turn into referral engine',
    steps: [
      {
        order: 1,
        dayOffset: 0,
        label: 'Advisory Board Invitation',
        name: 'Invite to Customer Advisory Board',
        description: 'Exclusive membership on advisory board.',
        playId: 'customer_case_study_participation',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Invite to Customer Advisory Board. Position as recognition of their thought leadership and impact. Include exclusive benefits: product influence, executive access, and peer networking.',
        assignedRole: 'ae',
      },
      {
        order: 2,
        dayOffset: 1,
        label: 'Early Feature Access',
        name: 'Offer Exclusive Early Feature Access',
        description: 'First access to new capabilities.',
        playId: 'customer_case_study_participation',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Offer exclusive early access to new features. Position as a thank-you for their participation and advocacy. Give them first look at upcoming capabilities relevant to their use case.',
        assignedRole: 'ae',
      },
      {
        order: 3,
        dayOffset: 3,
        label: 'VIP Conference Treatment',
        name: 'Fly to Annual Conference (VIP)',
        description: 'VIP treatment at your annual event.',
        playId: 'customer_case_study_participation',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Fly to annual user conference (VIP treatment). Cover travel and accommodations. Include speaker slot, VIP lounge access, executive dinner invitation, and on-stage recognition.',
        assignedRole: 'ae',
      },
      {
        order: 4,
        dayOffset: 7,
        label: 'Recognition Gift',
        name: 'Send High-Value Recognition Gift',
        description: 'Premium thank-you gift with recognition.',
        playId: 'customer_case_study_participation',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Thank with high-value gift and recognition. Send a premium, personalized gift that acknowledges their contribution. Include a handwritten note from your executive team.',
        assignedRole: 'ae',
      },
      {
        order: 5,
        dayOffset: 14,
        label: 'Expansion During Positive Moment',
        name: 'Position Expansion During Goodwill',
        description: 'Leverage positive sentiment for expansion conversation.',
        playId: 'customer_case_study_participation',
        assetTypes: ['email'],
        channel: 'email',
        promptHint:
          'Position next tier or expansion during positive moment. While sentiment is high, introduce expansion opportunities that align with their stated success. Frame as deepening the partnership they just celebrated.',
        assignedRole: 'ae',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function — callable from other scripts
// ─────────────────────────────────────────────────────────────────────────────

export async function seedSignalPlaybooks(
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
          create: tmpl.steps.map((step) => ({
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
            requiresApproval: false,
          })),
        },
      },
    });

    created.push(tmpl.name);
  }

  if (created.length) {
    console.log(`✅ Created ${created.length} signal playbook templates:`);
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

    console.log(`Seeding signal playbook templates for ${user.email} …`);
    await seedSignalPlaybooks(prismaClient, user.id);
  } finally {
    await prismaClient.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

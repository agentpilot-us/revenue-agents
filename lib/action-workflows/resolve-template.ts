/**
 * Shared template resolution for all signal→action and plan→action flows.
 *
 * Resolution order:
 * 0. PlaybookActivation — account-activated playbooks (Layer 2) matching trigger type
 * 1. Roadmap action mapping with explicit templateId
 * 2. Roadmap action mapping actionType → PlaybookTemplate name match
 * 3. Signal type → hardcoded fallback map
 * 4. Plan context → salesMapTemplate phase suggestedPlanTypes
 * 5. First available template for the user
 */

import { prisma } from '@/lib/db';

const SIGNAL_TYPE_TEMPLATE_MAP: Record<string, string[]> = {
  // Leadership & Organization
  new_csuite_executive: ['New C-Suite Executive', 'New Executive Introduction', 'new_exec_intro'],
  new_vp_hire: ['New VP-Level Hire', 'New Executive Introduction', 'new_exec_intro'],
  multiple_dept_heads_hired: ['Multiple Department Heads Hired', 'New Executive Introduction'],
  executive_departure: ['Executive Departure', 'New Executive Introduction', 'new_exec_intro'],
  founder_stepping_down: ['Founder Stepping Down', 'New Executive Introduction'],
  layoffs_headcount_reduction: ['Layoffs/Headcount Reduction', 'Signal Response'],
  rapid_hiring_surge: ['Rapid Hiring Surge', 'Signal Response'],
  engineering_team_expansion: ['Engineering Team Expansion', 'Signal Response'],
  sales_team_expansion: ['Sales Team Expansion', 'Signal Response'],
  geographic_expansion: ['Geographic Expansion', 'Signal Response'],
  job_posting_your_category: ['Job Posting for Your Category', 'Signal Response'],
  // Financial & Funding
  series_a_seed: ['Series A/Seed Funding', 'Signal Response'],
  series_b: ['Series B Funding', 'Signal Response'],
  series_c_late_stage: ['Series C+ / Late-Stage Funding', 'Signal Response'],
  earnings_beat: ['Quarterly Earnings Beat', 'Signal Response'],
  earnings_miss: ['Quarterly Earnings Miss', 'Signal Response'],
  raised_guidance: ['Raised Guidance/Forecast', 'Signal Response'],
  ipo_announcement: ['IPO Announcement/S-1 Filing', 'Signal Response'],
  post_ipo_first_quarter: ['Post-IPO (First Quarter)', 'Signal Response'],
  // M&A & Partnerships
  acquisition_they_acquired: ['Acquisition (They Acquired)', 'Signal Response'],
  acquisition_they_were_acquired: ['Acquisition (They Were Acquired)', 'Signal Response'],
  merger_announcement: ['Merger Announcement', 'Signal Response'],
  divestiture_spinoff: ['Divestiture/Spin-off', 'Signal Response'],
  strategic_partnership: ['Strategic Partnership Announcement', 'Signal Response'],
  technology_partnership: ['Technology Partnership/Integration', 'Signal Response'],
  // Technology & Product
  new_technology_adoption: ['New Technology Adoption', 'Signal Response'],
  platform_migration: ['Platform Migration', 'Signal Response'],
  legacy_system_sunset: ['Legacy System Sunset', 'Signal Response'],
  product_launch_announcement: ['Product Launch Announcement', 'Feature / Product Announcement', 'feature_release'],
  security_breach: ['Security Breach/Incident', 'Signal Response'],
  compliance_certification: ['Compliance Certification Pursued', 'Signal Response'],
  tech_stack_changes: ['Tech Stack Changes Detected', 'Signal Response'],
  // Market & Competitive
  analyst_recognition: ['Analyst Recognition', 'Signal Response'],
  regulatory_change: ['Regulatory Changes', 'Signal Response'],
  competitor_displacement: ['Competitor Displacement', 'Competitive Displacement Play', 'Signal Response'],
  contract_renewal_window: ['Contract Renewal Window', 'Renewal Expansion Play', 'Signal Response'],
  public_vendor_complaints: ['Public Vendor Complaints', 'Signal Response'],
  competitor_acquisition: ['Competitor Acquisition', 'Signal Response'],
  // Digital & Intent Signals
  pricing_page_visits: ['Pricing Page Visits', 'Signal Response'],
  demo_request_trial: ['Demo Request/Trial Signup', 'Signal Response'],
  case_study_downloads: ['Case Study Downloads', 'Signal Response'],
  content_consumption_spike: ['Content Consumption Spike', 'Signal Response'],
  competitor_comparison_views: ['Competitor Comparison Views', 'Signal Response'],
  review_site_research: ['Review Site Research', 'Signal Response'],
  event_webinar_registration: ['Event/Webinar Registration', 'Signal Response'],
  social_media_complaint: ['Social Media Complaint', 'Signal Response'],
  // Customer Expansion
  usage_spike_seat_growth: ['Usage Spike/Seat Growth', 'Signal Response'],
  premium_feature_request: ['Premium Feature Request', 'Signal Response'],
  new_department_interest: ['New Department Interest', 'Signal Response'],
  customer_raised_funding: ['Customer Raised Funding', 'Signal Response'],
  customer_ma_activity: ['Customer M&A Activity', 'Signal Response'],
  contract_renewal_approaching: ['Contract Renewal Approaching', 'Renewal Expansion Play', 'Signal Response'],
  champion_promoted: ['Champion Promoted', 'Signal Response'],
  low_nps_negative_feedback: ['Low NPS/Negative Feedback', 'Signal Response'],
  customer_case_study_participation: ['Customer Case Study Participation', 'Signal Response'],
  // Legacy types (backward compat)
  executive_hire: ['New C-Suite Executive', 'New Executive Introduction', 'new_exec_intro'],
  earnings_call: ['Quarterly Earnings Beat', 'Signal Response', 'signal_response'],
  industry_news: ['Signal Response', 'signal_response'],
  product_announcement: ['Product Launch Announcement', 'Feature / Product Announcement', 'feature_release'],
  job_posting_signal: ['Job Posting for Your Category', 'Signal Response'],
  funding_round: ['Series B Funding', 'Signal Response'],
  acquisition: ['Acquisition (They Acquired)', 'Signal Response'],
};

export type TemplateResolutionInput = {
  userId: string;
  companyId: string;
  signalType?: string;
  signalId?: string;
  roadmapPlanId?: string;
};

export async function resolveTemplateForContext(
  input: TemplateResolutionInput,
): Promise<string | null> {
  const { userId, companyId, signalType, roadmapPlanId } = input;

  // Step 0: Check PlaybookActivation — account-activated playbooks take priority
  if (signalType) {
    const templateId = await resolveFromActivations(userId, companyId, signalType);
    if (templateId) return templateId;
  }

  // Step 1 & 2: Check roadmap action mappings for this company
  if (signalType) {
    const templateId = await resolveFromRoadmapMappings(userId, companyId, signalType);
    if (templateId) return templateId;
  }

  // Step 3: Signal type → hardcoded fallback map
  if (signalType) {
    const templateId = await resolveFromSignalTypeMap(userId, signalType);
    if (templateId) return templateId;
  }

  // Step 4: Plan context → salesMapTemplate phase hints
  if (roadmapPlanId) {
    const templateId = await resolveFromPlanContext(userId, roadmapPlanId);
    if (templateId) return templateId;
  }

  // Step 5: First available template
  const fallback = await prisma.playbookTemplate.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

/**
 * Step 0: Check PlaybookActivation records for this account's roadmap.
 * If any activated playbook has a triggerType matching the signal type, use it.
 * Higher priority templates win.
 */
async function resolveFromActivations(
  userId: string,
  companyId: string,
  signalType: string,
): Promise<string | null> {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!roadmap) return null;

  // Map signal types to playbook trigger types for PlaybookActivation matching
  const triggerTypeMap: Record<string, string[]> = {
    // Leadership & Organization
    new_csuite_executive: ['new_csuite_executive', 'new_exec_intro', 'signal'],
    new_vp_hire: ['new_vp_hire', 'new_exec_intro', 'signal'],
    multiple_dept_heads_hired: ['multiple_dept_heads_hired', 'new_exec_intro', 'signal'],
    executive_departure: ['executive_departure', 'new_exec_intro', 'signal'],
    founder_stepping_down: ['founder_stepping_down', 'signal'],
    layoffs_headcount_reduction: ['layoffs_headcount_reduction', 'signal'],
    rapid_hiring_surge: ['rapid_hiring_surge', 'signal'],
    engineering_team_expansion: ['engineering_team_expansion', 'signal'],
    sales_team_expansion: ['sales_team_expansion', 'signal'],
    geographic_expansion: ['geographic_expansion', 'signal'],
    job_posting_your_category: ['job_posting_your_category', 'signal'],
    // Financial & Funding
    series_a_seed: ['series_a_seed', 'signal'],
    series_b: ['series_b', 'signal'],
    series_c_late_stage: ['series_c_late_stage', 'signal'],
    earnings_beat: ['earnings_beat', 'signal'],
    earnings_miss: ['earnings_miss', 'signal'],
    raised_guidance: ['raised_guidance', 'signal'],
    ipo_announcement: ['ipo_announcement', 'signal'],
    post_ipo_first_quarter: ['post_ipo_first_quarter', 'signal'],
    // M&A & Partnerships
    acquisition_they_acquired: ['acquisition_they_acquired', 'signal'],
    acquisition_they_were_acquired: ['acquisition_they_were_acquired', 'signal'],
    merger_announcement: ['merger_announcement', 'signal'],
    divestiture_spinoff: ['divestiture_spinoff', 'signal'],
    strategic_partnership: ['strategic_partnership', 'signal'],
    technology_partnership: ['technology_partnership', 'signal'],
    // Technology & Product
    new_technology_adoption: ['new_technology_adoption', 'signal'],
    platform_migration: ['platform_migration', 'signal'],
    legacy_system_sunset: ['legacy_system_sunset', 'signal'],
    product_launch_announcement: ['product_launch_announcement', 'feature_release'],
    security_breach: ['security_breach', 'signal'],
    compliance_certification: ['compliance_certification', 'signal'],
    tech_stack_changes: ['tech_stack_changes', 'signal'],
    // Market & Competitive
    analyst_recognition: ['analyst_recognition', 'signal'],
    regulatory_change: ['regulatory_change', 'signal'],
    competitor_displacement: ['competitor_displacement', 'competitive_displacement', 'signal'],
    contract_renewal_window: ['contract_renewal_window', 'renewal_expansion', 'signal'],
    public_vendor_complaints: ['public_vendor_complaints', 'signal'],
    competitor_acquisition: ['competitor_acquisition', 'signal'],
    // Digital & Intent
    pricing_page_visits: ['pricing_page_visits', 'signal'],
    demo_request_trial: ['demo_request_trial', 'signal'],
    case_study_downloads: ['case_study_downloads', 'signal'],
    content_consumption_spike: ['content_consumption_spike', 'signal'],
    competitor_comparison_views: ['competitor_comparison_views', 'signal'],
    review_site_research: ['review_site_research', 'signal'],
    event_webinar_registration: ['event_webinar_registration', 'signal'],
    social_media_complaint: ['social_media_complaint', 'signal'],
    // Customer Expansion
    usage_spike_seat_growth: ['usage_spike_seat_growth', 'signal'],
    premium_feature_request: ['premium_feature_request', 'signal'],
    new_department_interest: ['new_department_interest', 'signal'],
    customer_raised_funding: ['customer_raised_funding', 'signal'],
    customer_ma_activity: ['customer_ma_activity', 'signal'],
    contract_renewal_approaching: ['contract_renewal_approaching', 'renewal_expansion', 'signal'],
    champion_promoted: ['champion_promoted', 'signal'],
    low_nps_negative_feedback: ['low_nps_negative_feedback', 'signal'],
    customer_case_study_participation: ['customer_case_study_participation', 'signal'],
    // Legacy
    executive_hire: ['new_csuite_executive', 'new_exec_intro', 'signal'],
    earnings_call: ['earnings_beat', 'signal'],
    industry_news: ['signal'],
    product_announcement: ['product_launch_announcement', 'feature_release'],
    job_posting_signal: ['job_posting_your_category', 'signal'],
    funding_round: ['series_b', 'signal'],
    acquisition: ['acquisition_they_acquired', 'signal'],
  };

  const possibleTriggerTypes = triggerTypeMap[signalType] ?? ['signal', signalType];

  const activation = await prisma.playbookActivation.findFirst({
    where: {
      roadmapId: roadmap.id,
      isActive: true,
      template: {
        triggerType: { in: possibleTriggerTypes },
      },
    },
    include: {
      template: { select: { id: true, priority: true } },
    },
    orderBy: {
      template: { priority: 'desc' },
    },
  });

  return activation?.template?.id ?? null;
}

async function resolveFromRoadmapMappings(
  userId: string,
  companyId: string,
  signalType: string,
): Promise<string | null> {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!roadmap) return null;

  // Find action mappings that match this signal category
  const mappings = await prisma.roadmapActionMapping.findMany({
    where: {
      roadmapId: roadmap.id,
      OR: [
        { signalCategory: signalType },
        {
          signalRule: {
            category: signalType,
          },
        },
      ],
    },
    select: {
      templateId: true,
      actionType: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Prefer mappings with explicit templateId
  for (const mapping of mappings) {
    if (mapping.templateId) {
      const exists = await prisma.playbookTemplate.findUnique({
        where: { id: mapping.templateId },
        select: { id: true },
      });
      if (exists) return mapping.templateId;
    }
  }

  // Fall back: try matching actionType string against template names
  for (const mapping of mappings) {
    if (!mapping.actionType) continue;
    const tmpl = await prisma.playbookTemplate.findFirst({
      where: {
        userId,
        OR: [
          { name: { contains: mapping.actionType, mode: 'insensitive' } },
          { triggerType: { equals: mapping.actionType, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (tmpl) return tmpl.id;
  }

  return null;
}

async function resolveFromSignalTypeMap(
  userId: string,
  signalType: string,
): Promise<string | null> {
  const candidates = SIGNAL_TYPE_TEMPLATE_MAP[signalType];
  if (!candidates || candidates.length === 0) return null;

  for (const nameOrTrigger of candidates) {
    const tmpl = await prisma.playbookTemplate.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: nameOrTrigger, mode: 'insensitive' } },
          { triggerType: nameOrTrigger },
        ],
      },
      select: { id: true },
    });
    if (tmpl) return tmpl.id;
  }

  return null;
}

async function resolveFromPlanContext(
  userId: string,
  roadmapPlanId: string,
): Promise<string | null> {
  const plan = await prisma.roadmapPlan.findUnique({
    where: { id: roadmapPlanId },
    select: {
      signal: { select: { type: true } },
      salesMapTemplate: {
        select: {
          phases: {
            select: { suggestedPlanTypes: true },
            orderBy: { phaseOrder: 'asc' },
          },
        },
      },
    },
  });
  if (!plan) return null;

  // If the plan has a signal, try resolving from signal type
  if (plan.signal?.type) {
    const fromSignal = await resolveFromSignalTypeMap(userId, plan.signal.type);
    if (fromSignal) return fromSignal;
  }

  // Try matching suggestedPlanTypes from the sales map template phases
  if (plan.salesMapTemplate?.phases) {
    for (const phase of plan.salesMapTemplate.phases) {
      const planTypes = phase.suggestedPlanTypes as string[] | null;
      if (!planTypes) continue;
      for (const planType of planTypes) {
        const tmpl = await prisma.playbookTemplate.findFirst({
          where: {
            userId,
            OR: [
              { name: { contains: planType, mode: 'insensitive' } },
              { triggerType: { equals: planType, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (tmpl) return tmpl.id;
      }
    }
  }

  return null;
}

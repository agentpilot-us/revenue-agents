/**
 * Default seed for Adaptive Roadmap: signal rules, action mappings, and conditions.
 * Used when creating a new demo roadmap or when the user has none (e.g. "Load example config").
 */

import { prisma } from '@/lib/db';

export async function seedDefaultRoadmapConfig(roadmapId: string): Promise<void> {
  const existingRules = await prisma.roadmapSignalRule.count({
    where: { roadmapId },
  });
  if (existingRules > 0) return;

  // —— Signal rules ——
  const ruleEarnings = await prisma.roadmapSignalRule.create({
    data: {
      roadmapId,
      name: 'Earnings call — strategic priorities',
      category: 'earnings_call',
      description:
        'Earnings calls or financial reports mentioning strategic initiatives, capex, or new investments.',
      keywords: ['earnings', 'strategic', 'investment', 'initiative', 'growth'],
      sources: ['news', 'financial_report'],
      priorityWeight: 2,
    },
  });

  const ruleJobs = await prisma.roadmapSignalRule.create({
    data: {
      roadmapId,
      name: 'Job posting — key roles',
      category: 'job_posting_signal',
      description: 'New job postings for leadership or key technical roles in target areas.',
      keywords: ['hiring', 'director', 'VP', 'lead', 'head of'],
      sources: ['job_boards', 'linkedin'],
      priorityWeight: 1,
    },
  });

  const ruleProduct = await prisma.roadmapSignalRule.create({
    data: {
      roadmapId,
      name: 'Product or partnership announcement',
      category: 'product_announcement',
      description: 'Press or blog posts about product launches or new partnerships.',
      keywords: ['launch', 'partnership', 'announcement', 'release'],
      sources: ['news', 'blog'],
      priorityWeight: 1,
    },
  });

  // —— Action mappings (linked to rules) ——
  const mappingEarnings = await prisma.roadmapActionMapping.create({
    data: {
      roadmapId,
      signalRuleId: ruleEarnings.id,
      signalCategory: 'earnings_call',
      actionType: 'generate_email',
      autonomyLevel: 'draft_review',
      promptHint:
        'Draft a short executive briefing email that ties the account’s stated priorities to our solution.',
    },
  });

  const mappingJobs = await prisma.roadmapActionMapping.create({
    data: {
      roadmapId,
      signalRuleId: ruleJobs.id,
      signalCategory: 'job_posting_signal',
      actionType: 'generate_email',
      autonomyLevel: 'draft_review',
      promptHint:
        'Draft a concise outreach email congratulating on the new role and connecting our value prop to their focus area.',
    },
  });

  await prisma.roadmapActionMapping.create({
    data: {
      roadmapId,
      signalRuleId: ruleProduct.id,
      signalCategory: 'product_announcement',
      actionType: 'research_account',
      autonomyLevel: 'notify_only',
      promptHint:
        'Summarize how this announcement might create an opening for our solution; suggest next step.',
    },
  });

  // —— Conditions & modifiers ——
  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'event_window',
      config: {
        description: 'Prioritize accounts in a defined event or campaign window',
        defaultDays: 30,
      },
      isActive: true,
    },
  });

  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'product_launch',
      config: {
        description: 'Boost actions when our product has a relevant launch or update',
        appliesTo: ['generate_email', 'generate_page'],
      },
      isActive: true,
    },
  });

  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'engagement_threshold',
      config: {
        description: 'Only suggest high-autonomy actions when contact engagement is above threshold',
        minTouchpoints: 2,
      },
      isActive: true,
    },
  });
}

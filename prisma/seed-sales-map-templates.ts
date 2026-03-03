/**
 * seed-sales-map-templates.ts
 *
 * Seeds four default SalesMapTemplate records (built-in, userId=null).
 * Call seedDefaultSalesMapTemplates() from your app seed or run standalone.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx prisma/seed-sales-map-templates.ts
 */

import { prisma } from '@/lib/db';

export async function seedDefaultSalesMapTemplates() {
  const existing = await prisma.salesMapTemplate.count({ where: { isBuiltIn: true } });
  if (existing >= 4) {
    console.log(`Already have ${existing} built-in Sales Map templates — skipping.`);
    return;
  }

  // Clean existing built-in templates before re-seeding
  await prisma.salesMapTemplatePhase.deleteMany({
    where: { template: { isBuiltIn: true, userId: null } },
  });
  await prisma.salesMapTemplate.deleteMany({
    where: { isBuiltIn: true, userId: null },
  });

  // Template 1: Upsell / Cross-Sell
  await prisma.salesMapTemplate.create({
    data: {
      name: 'Upsell / Cross-Sell',
      slug: 'upsell-cross-sell',
      isBuiltIn: true,
      userId: null,
      phases: {
        create: [
          {
            phaseOrder: 1,
            name: 'Educate & Build Trust',
            description: 'Introduce the new product as a natural evolution of what the customer already uses. Build on the existing relationship.',
            weekRange: 'Weeks 1-3',
            suggestedPlanTypes: ['product_introduction', 'event_invite', 'new_leader_intro'],
            defaultContentTypes: ['email', 'event_invite'],
          },
          {
            phaseOrder: 2,
            name: 'Address Objections & Demonstrate Fit',
            description: 'Proactively address TCO, migration, and coexistence concerns. Show how the new product fits with existing stack.',
            weekRange: 'Weeks 3-6',
            suggestedPlanTypes: ['tco_transparency', 'stack_fit_workshop', 'peer_reference'],
            defaultContentTypes: ['presentation', 'case_study', 'email'],
          },
          {
            phaseOrder: 3,
            name: 'Prove Value & Close',
            description: 'Propose a limited pilot, build the ROI business case, and advance to contract expansion.',
            weekRange: 'Weeks 6-10',
            suggestedPlanTypes: ['pilot_proposal', 'roi_business_case', 'contract_expansion'],
            defaultContentTypes: ['talking_points', 'roi_deck', 'email'],
          },
        ],
      },
    },
  });

  // Template 2: New Logo
  await prisma.salesMapTemplate.create({
    data: {
      name: 'New Logo',
      slug: 'new-logo',
      isBuiltIn: true,
      userId: null,
      phases: {
        create: [
          {
            phaseOrder: 1,
            name: 'Discovery & Qualify',
            description: 'Research the account, map the buying group, and qualify product fit. Establish initial contact with a personalized outreach.',
            weekRange: 'Weeks 1-2',
            suggestedPlanTypes: ['cold_outreach', 'research_buying_group', 'event_invite'],
            defaultContentTypes: ['email', 'linkedin_inmail'],
          },
          {
            phaseOrder: 2,
            name: 'Propose & Differentiate',
            description: 'Present a tailored value proposition. Differentiate from incumbent vendors. Share relevant proof points.',
            weekRange: 'Weeks 2-4',
            suggestedPlanTypes: ['value_prop_presentation', 'competitive_brief', 'peer_reference'],
            defaultContentTypes: ['presentation', 'one_pager', 'email'],
          },
          {
            phaseOrder: 3,
            name: 'Negotiate & Close',
            description: 'Build the business case, address final objections, and move to commercial terms.',
            weekRange: 'Weeks 4-6',
            suggestedPlanTypes: ['roi_business_case', 'executive_briefing', 'contract_proposal'],
            defaultContentTypes: ['talking_points', 'roi_deck', 'email'],
          },
        ],
      },
    },
  });

  // Template 3: Renewal / Expansion
  await prisma.salesMapTemplate.create({
    data: {
      name: 'Renewal / Expansion',
      slug: 'renewal-expansion',
      isBuiltIn: true,
      userId: null,
      phases: {
        create: [
          {
            phaseOrder: 1,
            name: 'Health Check & Value Review',
            description: 'Assess current usage health, document realized value, and identify expansion opportunities within the existing deployment.',
            weekRange: 'Weeks 1-2',
            suggestedPlanTypes: ['health_check', 'value_realized_summary', 'usage_review'],
            defaultContentTypes: ['email', 'talking_points'],
          },
          {
            phaseOrder: 2,
            name: 'Expansion Proposal',
            description: 'Propose expanding to additional teams, divisions, or use cases based on the health check findings.',
            weekRange: 'Weeks 2-4',
            suggestedPlanTypes: ['expansion_proposal', 'new_use_case_intro', 'peer_reference'],
            defaultContentTypes: ['presentation', 'email', 'case_study'],
          },
          {
            phaseOrder: 3,
            name: 'Renewal Negotiation',
            description: 'Lock in the renewal with expanded terms. Address any churn signals. Secure multi-year commitment if possible.',
            weekRange: 'Weeks 4-6',
            suggestedPlanTypes: ['renewal_proposal', 'executive_alignment', 'contract_expansion'],
            defaultContentTypes: ['talking_points', 'email'],
          },
        ],
      },
    },
  });

  // Template 4: Competitive Displacement
  await prisma.salesMapTemplate.create({
    data: {
      name: 'Competitive Displacement',
      slug: 'competitive-displacement',
      isBuiltIn: true,
      userId: null,
      phases: {
        create: [
          {
            phaseOrder: 1,
            name: 'Intel Gathering & Proof of Concept',
            description: 'Research the competitor footprint, identify pain points with the incumbent, and propose a side-by-side evaluation.',
            weekRange: 'Weeks 1-4',
            suggestedPlanTypes: ['competitive_intel', 'pain_point_discovery', 'poc_proposal'],
            defaultContentTypes: ['email', 'one_pager', 'presentation'],
          },
          {
            phaseOrder: 2,
            name: 'Migration Planning',
            description: 'Develop a detailed migration plan that addresses switching costs, timeline, and risk mitigation.',
            weekRange: 'Weeks 4-8',
            suggestedPlanTypes: ['migration_plan', 'tco_comparison', 'technical_workshop'],
            defaultContentTypes: ['presentation', 'talking_points', 'email'],
          },
          {
            phaseOrder: 3,
            name: 'Close & Transition',
            description: 'Finalize the business case, secure executive sponsorship for the switch, and begin transition execution.',
            weekRange: 'Weeks 8-12',
            suggestedPlanTypes: ['roi_business_case', 'executive_briefing', 'transition_kickoff'],
            defaultContentTypes: ['roi_deck', 'talking_points', 'email'],
          },
        ],
      },
    },
  });

  console.log('Seeded 4 built-in Sales Map templates.');
}

// Standalone execution
if (require.main === module) {
  seedDefaultSalesMapTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

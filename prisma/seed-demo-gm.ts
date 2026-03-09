/**
 * Seed the GM demo for demo-techinfra@agentpilot.us with more hot signals and
 * related data (activities, campaign visits). Ensures GM company, roadmap,
 * divisions, and contacts exist, then adds 6–8 AccountSignals (last 48h,
 * relevance 7–10) so the dashboard Hot Signals and NBA panels are populated.
 *
 * Run: npm run seed:demo:gm
 * Or:  npx dotenv -e .env.local -- tsx prisma/seed-demo-gm.ts
 *
 * Optional: DEMO_GM_EMAIL=demo-techinfra@agentpilot.us (default)
 */

import { PrismaClient, DepartmentType, DepartmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEMO_EMAIL = process.env.DEMO_GM_EMAIL ?? 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-demo-gm.ts');
  }
  const normalized = connectionString
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

const prisma = createPrisma();

/** Hot signals only show when publishedAt is within last 48h and relevanceScore >= 7 */
function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: DEMO_EMAIL, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No user found with email: ${DEMO_EMAIL}. Sign in as that user once, then run this seed.`);
    process.exit(1);
  }
  console.log('Using user:', user.email);

  // —— Find or create General Motors company ——
  let company = await prisma.company.findFirst({
    where: {
      userId: user.id,
      OR: [
        { name: { equals: 'General Motors', mode: 'insensitive' } },
        { domain: { equals: 'gm.com', mode: 'insensitive' } },
      ],
    },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        userId: user.id,
        name: 'General Motors',
        domain: 'gm.com',
        industry: 'Automotive',
        website: 'https://www.gm.com',
      },
    });
    console.log('Created company: General Motors');
  } else {
    console.log('Using existing company:', company.name);
  }

  // —— Ensure AdaptiveRoadmap (enterprise_expansion for nvidia_gm) ——
  let roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: user.id, companyId: company.id },
    select: { id: true },
  });
  if (!roadmap) {
    roadmap = await prisma.adaptiveRoadmap.create({
      data: {
        userId: user.id,
        companyId: company.id,
        roadmapType: 'enterprise_expansion',
        objective: {
          goalText: 'Land 2 new divisional NVIDIA use cases at General Motors this year.',
          metric: { type: 'new_divisional_use_cases', targetCount: 2, timeHorizon: 'this_year' },
          accountContext: { primaryAccount: 'General Motors', divisions: ['Manufacturing', 'Autonomous Vehicles', 'IT'] },
        },
        contentStrategy: {
          tone: 'executive_consultative_technical',
          primaryChannels: ['executive_email', 'division_briefing_doc', 'sales_page'],
          contentTypes: ['division_specific_sales_page', 'executive_briefing', 'use_case_comparison_matrix'],
        },
      },
    });
    console.log('Created AdaptiveRoadmap (enterprise_expansion)');
  }

  // —— Ensure company-level roadmap target ——
  let gmTarget = await prisma.roadmapTarget.findFirst({
    where: { roadmapId: roadmap.id, companyId: company.id, targetType: 'company' },
    select: { id: true },
  });
  if (!gmTarget) {
    gmTarget = await prisma.roadmapTarget.create({
      data: {
        roadmapId: roadmap.id,
        targetType: 'company',
        name: company.name,
        companyId: company.id,
        stage: 'Expanding',
      },
    });
  }

  type DivisionSeed = { label: string; type: DepartmentType; stage: string; notes: string };
  const divisions: DivisionSeed[] = [
    { label: 'Vehicle Engineering & Simulation', type: DepartmentType.ENGINEERING, stage: 'Expansion Target', notes: 'Ultium EV platform and digital twin initiatives.' },
    { label: 'Autonomous Driving & ADAS (includes Cruise)', type: DepartmentType.OPERATIONS, stage: 'Active Program', notes: 'Cruise L4 plus GM AV/ADAS teams.' },
    { label: 'Manufacturing & Supply Chain', type: DepartmentType.OPERATIONS, stage: 'Expansion Target', notes: 'Digital factories and Ultium plants.' },
    { label: 'IT Infrastructure & AI Platform', type: DepartmentType.IT_INFRASTRUCTURE, stage: 'Strategic Platform', notes: 'DGX/HGX and AI platform.' },
    { label: 'Software-Defined Vehicle & Connected Services', type: DepartmentType.CONNECTED_SERVICES, stage: 'Emerging', notes: 'Ultifi and connected services.' },
  ];

  for (const div of divisions) {
    let dept = await prisma.companyDepartment.findFirst({
      where: { companyId: company.id, type: div.type },
    });
    if (!dept) {
      dept = await prisma.companyDepartment.create({
        data: {
          companyId: company.id,
          type: div.type,
          customName: div.label,
          status: DepartmentStatus.EXPANSION_TARGET,
          notes: div.notes,
        },
      });
    }
    let target = await prisma.roadmapTarget.findFirst({
      where: {
        roadmapId: roadmap.id,
        parentTargetId: gmTarget.id,
        companyDepartmentId: dept.id,
        targetType: 'division',
      },
    });
    if (!target) {
      target = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'division',
          name: div.label,
          parentTargetId: gmTarget.id,
          companyId: company.id,
          companyDepartmentId: dept.id,
          stage: div.stage,
        },
      });
    }
    // One contact per division for demo
    const contactEmail = `demo.${div.type.toLowerCase().replace(/_/g, '-')}@gm.com`;
    const existingContact = await prisma.contact.findFirst({
      where: { companyId: company.id, email: contactEmail },
    });
    if (!existingContact) {
      const c = await prisma.contact.create({
        data: {
          companyId: company.id,
          companyDepartmentId: dept.id,
          firstName: 'Demo',
          lastName: div.label.split(' ')[0],
          email: contactEmail,
          title: `Director, ${div.label.split(' &')[0]}`,
        },
      });
      await prisma.roadmapContact.create({
        data: { targetId: target.id, contactId: c.id, personaRole: 'Division Stakeholder', connectionStatus: 'identified' },
      });
    }
  }
  console.log('Ensured 5 divisions and contacts');

  // —— More hot signals (publishedAt in last 48h, relevanceScore >= 7) ——
  const existingSignalCount = await prisma.accountSignal.count({
    where: { companyId: company.id, userId: user.id },
  });
  const signalSeeds: Array<{
    type: string;
    title: string;
    summary: string;
    url: string;
    publishedAt: Date;
    relevanceScore: number;
  }> = [
    {
      type: 'earnings_call',
      title: 'GM earnings call: increased AV and digital factory investment',
      summary: 'Latest GM earnings call highlighted accelerated investment in autonomous driving programs and digital manufacturing, especially for Ultium-powered vehicles.',
      url: 'https://investor.gm.com/earnings/demo',
      publishedAt: hoursAgo(6),
      relevanceScore: 9,
    },
    {
      type: 'job_posting_signal',
      title: 'GM hiring Director, Simulation & Digital Twins',
      summary: 'GM posted a role for Director, Simulation & Digital Twins focused on EV development and factory digitalization.',
      url: 'https://careers.gm.com/job/demo-sim-director',
      publishedAt: hoursAgo(12),
      relevanceScore: 8,
    },
    {
      type: 'product_announcement',
      title: 'GM expands Super Cruise to more models; Ultium battery updates',
      summary: 'GM announced broader rollout of Super Cruise and Ultium battery improvements, signaling continued bet on ADAS and EV.',
      url: 'https://www.gm.com/super-cruise-expansion',
      publishedAt: hoursAgo(18),
      relevanceScore: 8,
    },
    {
      type: 'executive_hire',
      title: 'New VP of Vehicle Software Engineering hired at General Motors',
      summary: 'David Chen joined GM as VP of Vehicle Software Engineering. Previously VP Platform at Rivian. Background in autonomous systems and ADAS.',
      url: 'https://linkedin.com/in/david-chen-example',
      publishedAt: hoursAgo(24),
      relevanceScore: 9,
    },
    {
      type: 'industry_news',
      title: 'GM and Qualcomm announce partnership for software-defined vehicle cockpit',
      summary: 'Partnership to deliver next-gen digital cockpit and SDV platform; relevant to Software-Defined Vehicle and connected services divisions.',
      url: 'https://www.gm.com/qualcomm-partnership',
      publishedAt: hoursAgo(30),
      relevanceScore: 7,
    },
    {
      type: 'job_posting_signal',
      title: 'GM posted 3 AI/ML Engineer roles in Manufacturing',
      summary: 'Manufacturing & Supply Chain division is hiring AI/ML engineers for digital factory and quality initiatives.',
      url: 'https://careers.gm.com/job/ai-ml-manufacturing',
      publishedAt: hoursAgo(36),
      relevanceScore: 8,
    },
    {
      type: 'industry_news',
      title: 'Mary Barra mentioned $2B AV investment in earnings call',
      summary: 'CEO highlighted autonomous vehicle investment as top-3 corporate priority for GM.',
      url: 'https://investor.gm.com/av-investment',
      publishedAt: hoursAgo(42),
      relevanceScore: 9,
    },
  ];

  if (existingSignalCount >= 5) {
    console.log('Company already has', existingSignalCount, 'signals; skipping signal creation to avoid duplicates. Delete some AccountSignals and re-run to add these.');
  } else {
    for (const s of signalSeeds) {
      await prisma.accountSignal.create({
        data: {
          companyId: company.id,
          userId: user.id,
          type: s.type,
          title: s.title,
          summary: s.summary,
          url: s.url,
          publishedAt: s.publishedAt,
          relevanceScore: s.relevanceScore,
          status: 'new',
        },
      });
    }
    console.log('Created', signalSeeds.length, 'AccountSignals (hot signals)');
  }

  // —— Activities (engagement / timeline) ——
  const depts = await prisma.companyDepartment.findMany({
    where: { companyId: company.id },
    select: { id: true },
    take: 2,
  });
  const firstDeptId = depts[0]?.id ?? null;
  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id },
    select: { id: true },
    take: 2,
  });
  const firstContactId = contacts[0]?.id ?? null;

  const activityData = [
    { type: 'EMAIL_SENT', summary: 'Executive briefing sent to Vehicle Engineering', createdAt: hoursAgo(24), companyDepartmentId: firstDeptId, contactId: firstContactId },
    { type: 'Landing Page Visit', summary: 'VP visited IT Infrastructure sales page', createdAt: hoursAgo(12), companyDepartmentId: firstDeptId },
    { type: 'Research', summary: 'Account research completed for GM', createdAt: hoursAgo(72) },
    { type: 'Contact Added', summary: 'Contacts added to Autonomous Driving buying group', createdAt: hoursAgo(36), companyDepartmentId: depts[1]?.id ?? firstDeptId },
  ];
  for (const a of activityData) {
    await prisma.activity.create({
      data: {
        companyId: company.id,
        userId: user.id,
        type: a.type,
        summary: a.summary,
        companyDepartmentId: a.companyDepartmentId,
        contactId: a.contactId ?? undefined,
        createdAt: a.createdAt,
      },
    });
  }
  console.log('Created', activityData.length, 'Activity rows');

  // —— Campaign visits (so page-view style hot signals can appear if we have a campaign) ——
  const campaign = await prisma.segmentCampaign.findFirst({
    where: { companyId: company.id },
    select: { id: true, departmentId: true },
  });
  if (campaign) {
    const visitContacts = await prisma.contact.findMany({
      where: { companyId: company.id },
      select: { email: true, title: true },
      take: 3,
    });
    const visits = [
      { visitorEmail: visitContacts[0]?.email ?? 'mark.haener@gm.com', visitorJobTitle: 'VP IT Infrastructure', timeOnPage: 120, ctaClicked: true, visitedAt: hoursAgo(4) },
      { visitorEmail: visitContacts[1]?.email ?? null, visitorJobTitle: 'Director, ADAS', timeOnPage: 45, ctaClicked: false, visitedAt: hoursAgo(10) },
      { visitorEmail: null, visitorJobTitle: null, timeOnPage: 30, ctaClicked: false, visitedAt: hoursAgo(20) },
    ];
    for (const v of visits) {
      await prisma.campaignVisit.create({
        data: {
          campaignId: campaign.id,
          departmentId: campaign.departmentId,
          visitorEmail: v.visitorEmail ?? undefined,
          visitorJobTitle: v.visitorJobTitle ?? undefined,
          visitorCompany: 'General Motors',
          timeOnPage: v.timeOnPage,
          ctaClicked: v.ctaClicked,
          visitedAt: v.visitedAt,
        },
      });
    }
    console.log('Created', visits.length, 'CampaignVisit rows');
  } else {
    console.log('No SegmentCampaign for company; skip campaign visits. Create a sales page from demo setup to get visit-based hot signals.');
  }

  // —— Optional: ensure user company name for My Company ——
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyName: true, companyWebsite: true },
  });
  if (!u?.companyName?.trim() || !u?.companyWebsite?.trim()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        companyName: u?.companyName?.trim() || 'NVIDIA',
        companyWebsite: u?.companyWebsite?.trim() || 'https://www.nvidia.com',
      },
    });
    console.log('Updated user company name/website for My Company');
  }

  console.log('\nDone. Sign in as', DEMO_EMAIL, 'and open the dashboard to see hot signals, division radar, and activities.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

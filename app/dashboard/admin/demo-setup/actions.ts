'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ensureDemoRoadmap } from '@/lib/demo/load-roadmap';
import { getDemoPersona } from '@/lib/demo/context';
import { revalidatePath } from 'next/cache';
import { DepartmentType, DepartmentStatus } from '@prisma/client';

const VERTICALS = ['saas', 'pharma', 'semiconductor', 'fintech'] as const;

export type DemoStepStatus = 'pending' | 'running' | 'done' | 'error';

export async function getAllowDemoSetup(): Promise<boolean> {
  return process.env.ALLOW_DEMO_SETUP === 'true';
}

export async function lockAsDemo(
  companyId: string,
  demoVertical: string,
  demoNote: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  await prisma.company.update({
    where: { id: companyId },
    data: {
      isDemoAccount: true,
      demoVertical: demoVertical || null,
      demoLockedAt: new Date(),
      demoNote: demoNote?.trim() || null,
    },
  });
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

export async function getCompaniesForDemo(userId: string) {
  return prisma.company.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      domain: true,
      isDemoAccount: true,
      demoLockedAt: true,
      demoVertical: true,
      researchData: true,
      _count: { select: { contacts: true, departments: true } },
      accountMessaging: { select: { id: true } },
      segmentCampaigns: { select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getVerticals(): Promise<readonly string[]> {
  return VERTICALS;
}

export async function createDemoCampaign(companyId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const existing = await prisma.segmentCampaign.findFirst({
    where: { companyId },
    select: { id: true, url: true },
  });
  if (existing) return { ok: true, url: existing.url };

  const slugBase = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'demo';
  let slug = slugBase;
  let counter = 1;
  while (await prisma.segmentCampaign.findFirst({ where: { userId: session.user.id, slug } })) {
    slug = `${slugBase}-${counter}`;
    counter++;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const url = `${baseUrl}/go/${slug}`;

  await prisma.segmentCampaign.create({
    data: {
      userId: session.user.id,
      companyId,
      departmentId: null,
      slug,
      title: `${company.name} — Demo`,
      description: null,
      type: 'landing_page',
      url,
      headline: null,
      body: null,
      ctaLabel: null,
      ctaUrl: null,
      isMultiDepartment: false,
    },
  });
  revalidatePath('/dashboard/admin/demo-setup');
  return { ok: true, url };
}

/** Seed a few Activity rows so demo account analytics look live. Use exact type strings that get_account_changes and analytics expect. */
export async function seedDemoActivities(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const depts = await prisma.companyDepartment.findMany({
    where: { companyId },
    select: { id: true },
    take: 2,
  });
  const firstDeptId = depts[0]?.id ?? null;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const data = [
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo email sent', createdAt: threeDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo follow-up sent', createdAt: threeDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'MEETING_SCHEDULED', summary: 'Demo discovery call scheduled', createdAt: oneWeekAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Research', summary: 'Account research completed', createdAt: oneWeekAgo },
    { companyId, userId: session.user.id, type: 'Research', summary: 'Buying groups identified', createdAt: oneWeekAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Contact Added', summary: 'Contacts added to buying group', createdAt: twoDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Landing Page Visit', summary: 'Visited sales page', createdAt: twoDaysAgo, companyDepartmentId: firstDeptId },
  ];
  for (const d of data) {
    await prisma.activity.create({ data: d });
  }
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

/** Seed campaign visits so Engagement tab and Sales Page engagement preview show non-zero metrics. */
export async function seedDemoCampaignVisits(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const campaigns = await prisma.segmentCampaign.findMany({
    where: { companyId },
    select: { id: true, departmentId: true },
    take: 2,
  });
  if (campaigns.length === 0) return { ok: false, error: 'No campaign found. Create a sales page first.' };

  const campaign = campaigns[0];
  const contactEmails = await prisma.contact.findMany({
    where: { companyId },
    select: { email: true },
    take: 5,
  });
  const emails = contactEmails.map((c) => c.email).filter(Boolean) as string[];

  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const visits: Array<{
    campaignId: string;
    departmentId: string | null;
    visitorEmail: string | null;
    timeOnPage: number;
    chatMessages: number;
    ctaClicked: boolean;
    ctaClickedAt: Date | null;
    visitedAt: Date;
  }> = [
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[0] ?? null, timeOnPage: 45, chatMessages: 0, ctaClicked: true, ctaClickedAt: oneDayAgo, visitedAt: oneDayAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[1] ?? emails[0] ?? null, timeOnPage: 120, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: twoDaysAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[2] ?? null, timeOnPage: 30, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: twoDaysAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: null, timeOnPage: 15, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: oneDayAgo },
  ];
  for (const v of visits) {
    await prisma.campaignVisit.create({
      data: {
        campaignId: v.campaignId,
        departmentId: v.departmentId,
        visitorEmail: v.visitorEmail,
        timeOnPage: v.timeOnPage,
        chatMessages: v.chatMessages,
        ctaClicked: v.ctaClicked,
        ctaClickedAt: v.ctaClickedAt,
        visitedAt: v.visitedAt,
      },
    });
  }
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

/** Seed all demo data for a company: campaign visits + activities. Run after campaign exists. */
export async function seedDemoData(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const act = await seedDemoActivities(companyId);
  if (!act.ok) return act;
  const vis = await seedDemoCampaignVisits(companyId);
  if (!vis.ok) return vis;
  return { ok: true };
}

/**
 * Seed AdaptiveRoadmap targets and contacts for demo personas so the
 * Account Radar and Roadmap views have meaningful, Roadmap-driven data.
 * Currently focuses on creating partner/division targets and relationship
 * penetration for the demo scenarios.
 */
export async function seedDemoRoadmapForCompany(
  companyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const email = (session.user as { email?: string | null }).email ?? null;
  const persona = getDemoPersona(email);
  if (!persona) {
    return { ok: false, error: 'Current user is not a recognized demo persona' };
  }

  // Ensure base roadmap exists (company-scoped)
  await ensureDemoRoadmap(session.user.id, email, company.id);
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id, companyId: company.id },
    select: { id: true, roadmapType: true },
  });
  if (!roadmap) return { ok: false, error: 'Failed to create or load AdaptiveRoadmap' };

  if (persona === 'sercante') {
    // Channel influence: partner = Salesforce; division = Enterprise Sales, Financial Services
    // Use the selected company as the partner org for now.
    let partnerTarget = await prisma.roadmapTarget.findFirst({
      where: {
        roadmapId: roadmap.id,
        companyId: company.id,
        targetType: 'company',
      },
    });
    if (!partnerTarget) {
      partnerTarget = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'company',
          name: company.name,
          companyId: company.id,
          stage: 'Active Partner',
        },
      });
    }

    let fsDivision = await prisma.roadmapTarget.findFirst({
      where: {
        roadmapId: roadmap.id,
        parentTargetId: partnerTarget.id,
        targetType: 'division',
      },
    });
    if (!fsDivision) {
      fsDivision = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'division',
          name: 'Enterprise Sales — Financial Services',
          parentTargetId: partnerTarget.id,
          stage: 'Building Relationships',
        },
      });
    }

    const existingContacts = await prisma.roadmapContact.count({
      where: { targetId: fsDivision.id },
    });
    if (existingContacts === 0) {
      await prisma.roadmapContact.createMany({
        data: [
          {
            targetId: fsDivision.id,
            personaRole: 'Partner AE',
            connectionStatus: 'engaged',
            relationshipStage: 'engaged',
            territory: 'Enterprise Banking, West',
            activeDealsInTerritory: 4,
          },
          {
            targetId: fsDivision.id,
            personaRole: 'Partner AE',
            connectionStatus: 'connected',
            relationshipStage: 'connected',
            territory: 'Enterprise Insurance, National',
            activeDealsInTerritory: 2,
          },
          {
            targetId: fsDivision.id,
            personaRole: 'Partner SE',
            connectionStatus: 'champion',
            relationshipStage: 'trusted_partner',
            territory: 'Financial Services, West',
            activeDealsInTerritory: 0,
          },
        ],
      });
    }

    return { ok: true };
  }

  if (persona === 'nvidia_gm') {
    // Ensure NVIDIA catalog products exist so "Build demo" (research) can run
    const existingProducts = await prisma.catalogProduct.count({
      where: { userId: session.user.id },
    });
    if (existingProducts === 0) {
      const nvidiaProducts = [
        {
          name: 'NVIDIA DRIVE',
          slug: 'nvidia-drive',
          description:
            'End-to-end autonomous vehicle development platform: simulation, perception, mapping, and in-vehicle compute for L2+ to L4/L5.',
          targetDepartments: [
            DepartmentType.ENGINEERING,
            DepartmentType.OPERATIONS,
            DepartmentType.PRODUCT,
          ] as DepartmentType[],
          targetPersonas: ['VP Vehicle Engineering', 'AV/ADAS Director', 'Software-Defined Vehicle Lead'],
          useCases: ['AV development', 'Simulation', 'In-vehicle compute'],
          contentTags: ['automotive', 'autonomous', 'simulation'],
        },
        {
          name: 'NVIDIA Omniverse',
          slug: 'nvidia-omniverse',
          description:
            'Platform for 3D design collaboration and digital twin simulation; connects tools and teams for manufacturing and vehicle engineering.',
          targetDepartments: [
            DepartmentType.ENGINEERING,
            DepartmentType.OPERATIONS,
          ] as DepartmentType[],
          targetPersonas: ['VP Manufacturing', 'Digital Twin Lead', 'Simulation Director'],
          useCases: ['Digital twin', 'Design collaboration', 'Factory simulation'],
          contentTags: ['digital-twin', 'manufacturing', 'simulation'],
        },
        {
          name: 'NVIDIA DGX',
          slug: 'nvidia-dgx',
          description:
            'AI infrastructure and platform for training and inference; DGX/HGX systems for enterprise AI, AV training, and data center workloads.',
          targetDepartments: [DepartmentType.IT_INFRASTRUCTURE, DepartmentType.ENGINEERING] as DepartmentType[],
          targetPersonas: ['VP IT', 'AI/ML Director', 'Data Center Lead'],
          useCases: ['AI training', 'Simulation at scale', 'Enterprise AI platform'],
          contentTags: ['AI', 'data-center', 'training'],
        },
      ];
      for (const p of nvidiaProducts) {
        await prisma.catalogProduct.create({
          data: {
            userId: session.user.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            targetDepartments: p.targetDepartments,
            targetPersonas: p.targetPersonas,
            useCases: p.useCases,
            contentTags: p.contentTags,
          },
        });
      }
      // Also create legacy Product rows so "Your company data" → Products section shows them
      for (const p of nvidiaProducts) {
        await prisma.product.create({
          data: {
            userId: session.user.id,
            name: p.name,
            description: p.description,
            category: p.contentTags[0] ?? 'Platform',
          },
        });
      }
    } else {
      // Already have catalog products; ensure legacy Product rows exist so "Your company data" → Products shows them
      const legacyProductCount = await prisma.product.count({
        where: { userId: session.user.id },
      });
      if (legacyProductCount === 0) {
        const nvidiaProductNames = [
          { name: 'NVIDIA DRIVE', description: 'End-to-end autonomous vehicle development platform.', category: 'Platform' },
          { name: 'NVIDIA Omniverse', description: 'Platform for 3D design collaboration and digital twin simulation.', category: 'Platform' },
          { name: 'NVIDIA DGX', description: 'AI infrastructure for training and inference.', category: 'Platform' },
        ];
        for (const p of nvidiaProductNames) {
          await prisma.product.create({
            data: { userId: session.user.id, name: p.name, description: p.description, category: p.category },
          });
        }
      }
    }

    // Ensure NVIDIA company info so "Your company data" shows Company + Website (not empty)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyName: true, companyWebsite: true },
    });
    if (!currentUser?.companyName?.trim() || !currentUser?.companyWebsite?.trim()) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          companyName: currentUser?.companyName?.trim() || 'NVIDIA',
          companyWebsite: currentUser?.companyWebsite?.trim() || 'https://www.nvidia.com',
        },
      });
    }

    // Enterprise expansion: GM divisions as roadmap targets + demo contacts/signals/plans
    // Ensure a company-level target for GM
    let gmTarget = await prisma.roadmapTarget.findFirst({
      where: {
        roadmapId: roadmap.id,
        companyId: company.id,
        targetType: 'company',
      },
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

    type DivisionSeed = {
      label: string;
      type: DepartmentType;
      stage: string;
      notes: string;
    };

    const divisions: DivisionSeed[] = [
      {
        label: 'Vehicle Engineering & Simulation',
        type: DepartmentType.ENGINEERING,
        stage: 'Expansion Target',
        notes:
          'Ultium EV platform timelines and digital twin initiatives; heavy use of simulation (CFD/CAE) and battery thermal analysis.',
      },
      {
        label: 'Autonomous Driving & ADAS (includes Cruise)',
        type: DepartmentType.OPERATIONS,
        stage: 'Active Program',
        notes:
          'Cruise L4 robotaxis plus GM corporate AV/ADAS teams; needs scalable compute and simulation from development to deployment.',
      },
      {
        label: 'Manufacturing & Supply Chain',
        type: DepartmentType.OPERATIONS,
        stage: 'Expansion Target',
        notes:
          'Digital factories and supply chain optimization for Ultium plants; interest in quality control, predictive maintenance, and throughput.',
      },
      {
        label: 'IT Infrastructure & AI Platform',
        type: DepartmentType.IT_INFRASTRUCTURE,
        stage: 'Strategic Platform',
        notes:
          'DGX/HGX clusters and AI platform to support AV training, simulation, and broader enterprise AI workloads.',
      },
      {
        label: 'Software-Defined Vehicle & Connected Services',
        type: DepartmentType.PRODUCT,
        stage: 'Emerging',
        notes:
          'Ultifi software-defined vehicle platform and connected services; in-vehicle AI and OTA feature roadmap.',
      },
    ];

    // Create or update divisions, contacts, and roadmap contacts
    for (const div of divisions) {
      // Ensure CompanyDepartment exists
      let dept = await prisma.companyDepartment.findFirst({
        where: {
          companyId: company.id,
          type: div.type,
        },
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
      } else if (!dept.customName || dept.customName !== div.label) {
        await prisma.companyDepartment.update({
          where: { id: dept.id },
          data: { customName: div.label, notes: div.notes },
        });
      }

      // Ensure RoadmapTarget division exists
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

      // Create demo Contacts in the core contact model (1–2 per division)
      const contactSeeds =
        div.label === 'Vehicle Engineering & Simulation'
          ? [
              {
                firstName: 'Alex',
                lastName: 'Nguyen',
                title: 'VP Vehicle Engineering',
                email: 'alex.nguyen@gm.com',
              },
              {
                firstName: 'Priya',
                lastName: 'Srinivasan',
                title: 'Director, Simulation & Digital Twins',
                email: 'priya.srinivasan@gm.com',
              },
            ]
          : div.label.startsWith('Autonomous Driving')
            ? [
                {
                  firstName: 'David',
                  lastName: 'Richardson',
                  title: 'VP Autonomous Vehicle Engineering',
                  email: 'david.richardson@gm.com',
                },
                {
                  firstName: 'Maria',
                  lastName: 'Lopez',
                  title: 'Director, ADAS & Safety Systems',
                  email: 'maria.lopez@gm.com',
                },
              ]
            : [
                {
                  firstName: 'Jordan',
                  lastName: 'Lee',
                  title: `Director ${div.label}`,
                  email: `jordan.lee+${div.type.toLowerCase()}@gm.com`,
                },
              ];

      const contactIds: string[] = [];
      for (const seed of contactSeeds) {
        const existingCore = await prisma.contact.findFirst({
          where: { companyId: company.id, email: seed.email },
        });
        if (existingCore) {
          contactIds.push(existingCore.id);
          continue;
        }
        const created = await prisma.contact.create({
          data: {
            firstName: seed.firstName,
            lastName: seed.lastName,
            email: seed.email,
            title: seed.title,
            companyId: company.id,
            companyDepartmentId: dept.id,
            linkedinUrl: `https://www.linkedin.com/in/${seed.firstName.toLowerCase()}-${seed.lastName.toLowerCase()}-gm`,
            engagementScore: div.label.startsWith('Autonomous Driving') ? 70 : 30,
            isResponsive: div.label.startsWith('Autonomous Driving'),
          },
        });
        contactIds.push(created.id);
      }

      const existingContacts = await prisma.roadmapContact.count({
        where: { targetId: target.id },
      });
      if (existingContacts === 0) {
        await prisma.roadmapContact.createMany({
          data: contactIds.map((contactId, index) => ({
            targetId: target.id,
            contactId,
            personaRole:
              index === 0 && div.label === 'Vehicle Engineering & Simulation'
                ? 'Division Economic Buyer'
                : index === 0 && div.label.startsWith('Autonomous Driving')
                  ? 'AV Engineering Lead'
                  : 'Division Stakeholder',
            connectionStatus:
              div.label.startsWith('Autonomous Driving') && index === 0 ? 'engaged' : 'identified',
            relationshipStage:
              div.label.startsWith('Autonomous Driving') && index === 0 ? 'engaged' : 'unknown',
          })),
        });
      }
    }

    // Seed a small number of demo signals and plans so the dashboard
    // immediately shows a realistic signal → plan flow.
    const existingSignals = await prisma.accountSignal.count({
      where: { companyId: company.id, userId: session.user.id },
    });
    if (existingSignals === 0) {
      const now = new Date();
      const earnings = await prisma.accountSignal.create({
        data: {
          companyId: company.id,
          userId: session.user.id,
          type: 'earnings_call',
          title: 'GM earnings call: increased AV and digital factory investment',
          summary:
            'Latest GM earnings call highlighted accelerated investment in autonomous driving programs and digital manufacturing, especially for Ultium-powered vehicles.',
          url: 'https://investor.gm.com/earnings/demo',
          publishedAt: now,
          relevanceScore: 9,
          status: 'new',
        },
      });
      const jobs = await prisma.accountSignal.create({
        data: {
          companyId: company.id,
          userId: session.user.id,
          type: 'job_posting_signal',
          title: 'GM hiring Director, Simulation & Digital Twins',
          summary:
            'GM posted a role for Director, Simulation & Digital Twins focused on EV development and factory digitalization.',
          url: 'https://careers.gm.com/job/demo-sim-director',
          publishedAt: now,
          relevanceScore: 8,
          status: 'new',
        },
      });

      // Simple rules/action mappings for the demo flow
      const ruleEarnings = await prisma.roadmapSignalRule.create({
        data: {
          roadmapId: roadmap.id,
          name: 'Earnings call — AV & digital factory',
          category: 'earnings_call',
          description: 'GM mentions investment in AV and digital manufacturing.',
          keywords: ['earnings', 'autonomous', 'digital factory', 'Ultium'],
          sources: ['news', 'financial_report'],
          priorityWeight: 2,
        },
      });
      const mappingEarnings = await prisma.roadmapActionMapping.create({
        data: {
          roadmapId: roadmap.id,
          signalRuleId: ruleEarnings.id,
          signalCategory: 'earnings_call',
          actionType: 'generate_email',
          autonomyLevel: 'draft_review',
          promptHint:
            'Draft an executive briefing email for the relevant GM division summarizing how NVIDIA can support the investments mentioned.',
        },
      });

      const ruleJobs = await prisma.roadmapSignalRule.create({
        data: {
          roadmapId: roadmap.id,
          name: 'Job posting — simulation & digital twins',
          category: 'job_posting_signal',
          description: 'New GM job postings for simulation and digital twin leadership.',
          keywords: ['simulation', 'digital twin'],
          sources: ['job_boards'],
          priorityWeight: 1,
        },
      });
      const mappingJobs = await prisma.roadmapActionMapping.create({
        data: {
          roadmapId: roadmap.id,
          signalRuleId: ruleJobs.id,
          signalCategory: 'job_posting_signal',
          actionType: 'generate_email',
          autonomyLevel: 'draft_review',
          promptHint:
            'Draft a short outreach email connecting NVIDIA Omniverse and GPU-accelerated simulation to the focus of this new role.',
        },
      });

      // Attach one plan to Vehicle Engineering & Simulation and one to AV/ADAS
      const vEngTarget = await prisma.roadmapTarget.findFirst({
        where: { roadmapId: roadmap.id, name: 'Vehicle Engineering & Simulation' },
      });
      const avTarget = await prisma.roadmapTarget.findFirst({
        where: { roadmapId: roadmap.id, name: { startsWith: 'Autonomous Driving' } },
      });

      if (vEngTarget) {
        await prisma.roadmapPlan.create({
          data: {
            roadmapId: roadmap.id,
            signalId: earnings.id,
            signalRuleId: ruleEarnings.id,
            actionMappingId: mappingEarnings.id,
            targetId: vEngTarget.id,
            status: 'pending',
            autonomyLevel: 'draft_review',
            previewPayload: {
              subject: 'GM earnings: proposal to accelerate Ultium engineering timelines',
              bodyPreview:
                'GM’s latest earnings call highlighted increased investment in AV and digital factories. Here’s a tailored briefing for Vehicle Engineering & Simulation on how NVIDIA Omniverse and GPU-accelerated CAE/CFD can compress Ultium development by up to 50%.',
            },
            matchInfo: {
              matchedKeywords: ['earnings', 'autonomous', 'digital factory'],
              ruleName: ruleEarnings.name,
              confidence: 0.9,
            },
          },
        });
      }

      if (avTarget) {
        await prisma.roadmapPlan.create({
          data: {
            roadmapId: roadmap.id,
            signalId: earnings.id,
            signalRuleId: ruleEarnings.id,
            actionMappingId: mappingEarnings.id,
            targetId: avTarget.id,
            status: 'pending',
            autonomyLevel: 'draft_review',
            previewPayload: {
              subject: 'Scaling Cruise learnings across GM’s AV and ADAS programs',
              bodyPreview:
                'The earnings call confirmed GM’s long-term commitment to both L4 Cruise robotaxis and L2+/L3 ADAS. This plan proposes a briefing to GM AV & ADAS leaders on standardizing on the NVIDIA DRIVE + Omniverse + DGX stack from development to deployment.',
            },
            matchInfo: {
              matchedKeywords: ['earnings', 'autonomous'],
              ruleName: ruleEarnings.name,
              confidence: 0.9,
            },
          },
        });
      }

      if (vEngTarget) {
        await prisma.roadmapPlan.create({
          data: {
            roadmapId: roadmap.id,
            signalId: jobs.id,
            signalRuleId: ruleJobs.id,
            actionMappingId: mappingJobs.id,
            targetId: vEngTarget.id,
            status: 'pending',
            autonomyLevel: 'draft_review',
            previewPayload: {
              subject: 'Congrats on the new Simulation & Digital Twins leadership role',
              bodyPreview:
                'Saw GM is hiring a Director for Simulation & Digital Twins. This is a perfect moment to show how other OEMs are using NVIDIA Omniverse and GPU-accelerated simulation to hit aggressive EV timelines while cutting physical test costs by ~40%.',
            },
            matchInfo: {
              matchedKeywords: ['simulation', 'digital twin'],
              ruleName: ruleJobs.name,
              confidence: 0.85,
            },
          },
        });
      }
    }

    return { ok: true };
  }

  // Other personas can be expanded later (e.g. Revenue Vessel/FedEx)
  return { ok: true };
}


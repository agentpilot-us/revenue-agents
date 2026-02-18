/**
 * Seed AgentPilot content library and demo landing page for enterprise/strategic-customer demo.
 * Run: npm run seed:demo   or   npx dotenv -e .env.local -- tsx prisma/seed-demo-agentpilot.ts
 *
 * Creates: User (uses first), Product, CatalogProduct, ProductProfile, ContentLibrary (SuccessStory x2, CompanyEvent x1),
 *          Company, SegmentCampaign. All under the same user so /go/demo-enterprise chat has full context.
 */

import { PrismaClient, ContentType, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-demo-agentpilot.ts');
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

const DEMO_SLUG = 'demo-enterprise';
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    console.error('No user found. Sign in once to create a user, then run this seed.');
    process.exit(1);
  }
  console.log('Using user:', user.email);

  // —— Product (user-scoped, for ContentLibrary) ——
  let product = await prisma.product.findFirst({
    where: { userId: user.id, name: 'AgentPilot' },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        userId: user.id,
        name: 'AgentPilot',
        description: 'AI-Native Account Engagement Platform',
        category: 'GTM',
      },
    });
    console.log('Created Product: AgentPilot');
  } else {
    console.log('Using existing Product: AgentPilot');
  }

  // —— CatalogProduct (global) ——
  const catalogSlug = 'agentpilot-platform';
  let catalogProduct = await prisma.catalogProduct.findUnique({
    where: { slug: catalogSlug },
  });
  if (!catalogProduct) {
    catalogProduct = await prisma.catalogProduct.create({
      data: {
        name: 'AgentPilot Platform',
        slug: catalogSlug,
        description: 'AI-Native Account Engagement Platform. AI researches your accounts, builds personalized pages, and tells you when to follow up.',
        priceMin: 987,
        priceMax: 987,
        pricingModel: 'per_user',
        targetDepartments: [],
        targetPersonas: [],
        useCases: ['Account research', 'Personalized landing pages', 'AI chat', 'Real-time alerts'],
        contentTags: ['enterprise', 'ABM', 'strategic accounts'],
      },
    });
    console.log('Created CatalogProduct: AgentPilot Platform ($987/user)');
  } else {
    await prisma.catalogProduct.update({
      where: { id: catalogProduct.id },
      data: { priceMin: 987, priceMax: 987 },
    });
    console.log('Updated CatalogProduct pricing to $987/user');
  }

  // —— ProductProfile (FAQ, security, value props) ——
  const objectionHandlers = [
    { objection: 'Is my data secure?', response: 'Yes. We use enterprise-grade security: encryption in transit and at rest, SOC 2 compliance, and optional SSO. Your account and visitor data stay in your control.' },
    { objection: 'How does pricing work?', response: 'AgentPilot is $987 per user per month. Volume and annual discounts are available for larger teams.' },
    { objection: 'Do we need to change our CRM?', response: 'No. AgentPilot works alongside Salesforce and HubSpot. We push leads and activities into your existing CRM.' },
    { objection: 'How long to get the first landing page live?', response: 'Most teams have their first personalized landing page and chat live in under 5 minutes after connecting their content.' },
    { objection: 'Can we use our own domain?', response: 'Yes. You can use AgentPilot-hosted links or configure custom subdomains for branded experiences.' },
  ];

  await prisma.productProfile.upsert({
    where: {
      catalogProductId_userId: {
        catalogProductId: catalogProduct.id,
        userId: user.id,
      },
    },
    create: {
      userId: user.id,
      catalogProductId: catalogProduct.id,
      oneLiner: 'AI that researches your accounts, builds personalized pages, and tells you when to follow up.',
      elevatorPitch:
        'AgentPilot learns your product, then automatically researches target accounts — mapping buying groups, surfacing initiatives, and generating hyper-personalized landing pages with AI chat. When a high-value prospect engages, you get real-time alerts.',
      valueProps: [
        '10+ hours saved per account on research and personalization',
        '5 minutes to generate personalized campaigns per buying group',
        'Real-time alerts when executives visit your pages',
        'Auto-sync: pages update as your accounts evolve',
      ],
      painPoints: [
        'Manual research and one-size-fits-all landing pages',
        'No visibility into who is engaging until it’s too late',
      ],
      bestForIndustries: ['Technology', 'Enterprise', 'Mid-Market', 'ABM'],
      bestForDepartments: ['Sales', 'Demand Gen', 'Customer Success'],
      priceRangeText: '$987 per user',
      objectionHandlers: objectionHandlers as unknown as Prisma.InputJsonValue,
    },
    update: {
      priceRangeText: '$987 per user',
      oneLiner: 'AI that researches your accounts, builds personalized pages, and tells you when to follow up.',
      elevatorPitch:
        'AgentPilot learns your product, then automatically researches target accounts — mapping buying groups, surfacing initiatives, and generating hyper-personalized landing pages with AI chat. When a high-value prospect engages, you get real-time alerts.',
      valueProps: [
        '10+ hours saved per account on research and personalization',
        '5 minutes to generate personalized campaigns per buying group',
        'Real-time alerts when executives visit your pages',
        'Auto-sync: pages update as your accounts evolve',
      ],
      objectionHandlers: objectionHandlers as unknown as Prisma.InputJsonValue,
    },
  });
  console.log('Upserted ProductProfile (pricing, FAQ, security)');

  // —— ContentLibrary: SuccessStory — NVIDIA ——
  const nvidiaContent = {
    headline: 'NVIDIA – AI at scale',
    oneLiner: 'Enterprise AI leader uses AgentPilot to personalize GTM at scale for strategic accounts.',
    fullSummary:
      'NVIDIA uses AgentPilot to research target accounts, map buying groups, and generate personalized landing pages with AI chat for each segment. Sales and demand gen teams cut research time from 10+ hours to minutes and see real-time engagement from executives.',
    keyMetrics: [
      '10+ hours saved per account on research',
      '5 minutes to generate personalized campaigns per buying group',
      'Real-time alerts when high-value prospects engage',
    ],
    whenToUse: 'Best for enterprise and strategic accounts where personalized messaging and executive engagement matter.',
    valueProp: 'AI-powered account research and hyper-personalized landing pages with embedded chat.',
  };

  let nvidiaStory = await prisma.contentLibrary.findFirst({
    where: { userId: user.id, productId: product.id, title: { contains: 'NVIDIA' }, type: ContentType.SuccessStory },
  });
  if (!nvidiaStory) {
    nvidiaStory = await prisma.contentLibrary.create({
      data: {
        userId: user.id,
        productId: product.id,
        title: 'NVIDIA – AI at scale',
        type: ContentType.SuccessStory,
        content: nvidiaContent as unknown as Prisma.InputJsonValue,
        industry: 'Technology',
        company: 'NVIDIA',
        isActive: true,
      },
    });
    console.log('Created ContentLibrary: NVIDIA Success Story');
  }

  // —— ContentLibrary: SuccessStory — Revenue Vessel ——
  const revenueVesselContent = {
    headline: 'Revenue Vessel – Mid-Market Supply Chain',
    oneLiner: 'Mid-market supply chain vendor scales personalized outreach with AgentPilot.',
    fullSummary:
      'Revenue Vessel, a mid-market supply chain technology vendor, uses AgentPilot to create personalized landing pages and AI chat for each buying group. They reduced time-to-first-touch and increased meeting conversion with segment-specific messaging and real-time alerts.',
    keyMetrics: [
      'Faster time-to-first-touch across supply chain and operations segments',
      'Higher meeting conversion from personalized pages',
      'Single platform for research, pages, and chat',
    ],
    whenToUse: 'Ideal for mid-market vendors selling into supply chain, operations, and logistics teams.',
    valueProp: 'Personalized landing pages and AI chat for each segment without dev or marketing ops bottlenecks.',
  };

  let revenueVesselStory = await prisma.contentLibrary.findFirst({
    where: { userId: user.id, productId: product.id, title: { contains: 'Revenue Vessel' }, type: ContentType.SuccessStory },
  });
  if (!revenueVesselStory) {
    revenueVesselStory = await prisma.contentLibrary.create({
      data: {
        userId: user.id,
        productId: product.id,
        title: 'Revenue Vessel – Mid-Market Supply Chain',
        type: ContentType.SuccessStory,
        content: revenueVesselContent as unknown as Prisma.InputJsonValue,
        industry: 'Supply Chain',
        company: 'Revenue Vessel',
        isActive: true,
      },
    });
    console.log('Created ContentLibrary: Revenue Vessel Success Story');
  }

  // —— ContentLibrary: CompanyEvent (optional) ——
  const eventContent = {
    eventDate: 'March 2026',
    eventType: 'Summit',
    description: 'Global Infrastructure Summit – keynotes, workshops, and customer panels on cloud, AI, and platform strategy.',
    registrationUrl: 'https://revenue-agents.vercel.app/#cta',
    targetAudience: ['Engineering', 'IT', 'Operations', 'Executive'],
    location: 'Virtual + select cities',
    topics: ['Cloud', 'AI', 'Platform', 'Infrastructure'],
    primaryTopic: 'Infrastructure',
  };

  let demoEvent = await prisma.contentLibrary.findFirst({
    where: { userId: user.id, productId: product.id, title: { contains: 'Global Infrastructure' }, type: ContentType.CompanyEvent },
  });
  if (!demoEvent) {
    demoEvent = await prisma.contentLibrary.create({
      data: {
        userId: user.id,
        productId: product.id,
        title: 'Global Infrastructure Summit',
        type: ContentType.CompanyEvent,
        content: eventContent as unknown as Prisma.InputJsonValue,
        industry: 'Technology',
        isActive: true,
      },
    });
    console.log('Created ContentLibrary: Global Infrastructure Summit event');
  }

  // —— Company (enterprise demo; no domain = no landing auth required) ——
  let company = await prisma.company.findFirst({
    where: { userId: user.id, name: 'Enterprise Demo' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        userId: user.id,
        name: 'Enterprise Demo',
        domain: null,
        industry: 'Technology',
        website: 'https://revenue-agents.vercel.app',
      },
    });
    console.log('Created Company: Enterprise Demo');
  } else {
    console.log('Using existing Company: Enterprise Demo');
  }

  // —— SegmentCampaign (landing page) ——
  const campaignUrl = `${BASE_URL}/go/${DEMO_SLUG}`;
  const pageSections = {
    caseStudy: {
      title: nvidiaStory?.title ?? 'NVIDIA – AI at scale',
      summary: (nvidiaContent as { fullSummary?: string }).fullSummary ?? 'Enterprise AI leader uses AgentPilot to personalize GTM at scale.',
      link: 'https://revenue-agents.vercel.app',
    },
    successStory: {
      title: revenueVesselStory?.title ?? 'Revenue Vessel – Mid-Market Supply Chain',
      summary: (revenueVesselContent as { fullSummary?: string }).fullSummary ?? 'Mid-market supply chain vendor scales personalized outreach with AgentPilot.',
      link: 'https://revenue-agents.vercel.app',
    },
  };

  await prisma.segmentCampaign.upsert({
    where: {
      userId_slug: { userId: user.id, slug: DEMO_SLUG },
    },
    create: {
      userId: user.id,
      companyId: company.id,
      departmentId: null,
      slug: DEMO_SLUG,
      title: 'Built for Your Strategic Customers',
      description: 'AI-powered landing page and chat for enterprise and strategic accounts.',
      url: campaignUrl,
      type: 'landing_page',
      headline: 'Give every strategic account a personalized experience',
      body: 'Use AgentPilot to research accounts, map buying groups, and launch hyper-personalized landing pages with AI chat. When executives engage, get real-time alerts and follow up with context.',
      ctaLabel: 'Book a 15-Min Demo',
      ctaUrl: 'https://revenue-agents.vercel.app/#cta',
      pageSections: pageSections as unknown as Prisma.InputJsonValue,
    },
    update: {
      companyId: company.id,
      title: 'Built for Your Strategic Customers',
      url: campaignUrl,
      headline: 'Give every strategic account a personalized experience',
      body: 'Use AgentPilot to research accounts, map buying groups, and launch hyper-personalized landing pages with AI chat. When executives engage, get real-time alerts and follow up with context.',
      pageSections: pageSections as unknown as Prisma.InputJsonValue,
    },
  });
  console.log('Upserted SegmentCampaign:', DEMO_SLUG);

  console.log('\nDone. Demo landing page:', campaignUrl);
  console.log('Verify: Content Library in dashboard, then open the URL and try chat (pricing, FAQ, security, case studies).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

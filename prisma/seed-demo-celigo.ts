/**
 * Seed AgentPilot demo environment for Celigo → Lattice HQ demo.
 * Account: demo-saas@agentpilot.us
 *
 * Run: npm run seed:demo:celigo   or   npx dotenv -e .env.local -- tsx prisma/seed-demo-celigo.ts
 * Requires: DATABASE_URL. Optional: DEMO_USER_EMAIL (default demo-saas@agentpilot.us). User must exist (sign in once first).
 *
 * Creates:
 *   - CatalogProduct x3 (Core iPaaS, AI Automation, B2B/EDI) — scoped to user
 *   - ProductProfile x3
 *   - ContentLibrary: SuccessStory x2, CompanyEvent x1, FeatureRelease x1
 *   - Company: Lattice HQ
 *   - CompanyDepartment x4 (RevOps, IT, PeopleOps, Finance) — by DepartmentType
 *   - Contact x12 (3 per department)
 *   - SegmentCampaign x3 (RevOps page, IT page, CONNECT 2026 event page)
 */

import { PrismaClient, ContentType, Prisma, DepartmentType, DepartmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-demo-celigo.ts');
  }
  const normalized = connectionString
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

const prisma = createPrisma();

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo-saas@agentpilot.us';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Map string labels to DepartmentType for CatalogProduct.targetDepartments
function mapTargetDepartments(labels: string[]): DepartmentType[] {
  const map: Record<string, DepartmentType> = {
    IT: DepartmentType.IT_DATA_CENTER,
    RevOps: DepartmentType.REVENUE_OPERATIONS,
    Operations: DepartmentType.OTHER,
    Finance: DepartmentType.FINANCE,
    Engineering: DepartmentType.ENGINEERING,
    'Supply Chain': DepartmentType.SUPPLY_CHAIN,
    HR: DepartmentType.HR,
  };
  return labels.map((l) => map[l] ?? DepartmentType.OTHER);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG PRODUCTS (with userId and DepartmentType[])
// ─────────────────────────────────────────────────────────────────────────────

function getCatalogProducts(userId: string) {
  return [
    {
      userId,
      name: 'Celigo Integration Platform',
      slug: 'celigo-ipaas',
      description:
        'Connect any app, automate any workflow — no integration backlog required. The #1 iPaaS platform on G2 for 8 consecutive quarters with 1,000+ prebuilt connectors.',
      priceMin: null,
      priceMax: null,
      pricingModel: 'subscription',
      targetDepartments: mapTargetDepartments(['IT', 'RevOps', 'Operations', 'Finance']),
      targetPersonas: ['VP of IT', 'Director of Enterprise Applications', 'RevOps Manager', 'VP of Finance'],
      useCases: [
        'CRM + ERP sync',
        'Quote-to-cash automation',
        'Lead lifecycle management',
        'Order-to-fulfillment',
        'Financial close automation',
      ],
      contentTags: ['iPaaS', 'integration', 'automation', 'RevOps', 'SaaS'],
    },
    {
      userId,
      name: 'Celigo AI Automation',
      slug: 'celigo-ai-automation',
      description:
        'AI-guided integration design and autonomous error handling — ship automations 70% faster. Describe a workflow in plain English; Celigo builds it.',
      priceMin: null,
      priceMax: null,
      pricingModel: 'subscription',
      targetDepartments: mapTargetDepartments(['IT', 'Engineering', 'Operations']),
      targetPersonas: ['CTO', 'VP Engineering', 'Director of IT Operations'],
      useCases: [
        'AI-guided flow design',
        'Autonomous error resolution (95% auto-resolved)',
        'Reusable template library',
        'Governed AI agents',
      ],
      contentTags: ['AI', 'automation', 'iPaaS', 'error handling'],
    },
    {
      userId,
      name: 'Celigo B2B/EDI Hub',
      slug: 'celigo-edi',
      description:
        'Manage all trading partner connections and EDI transactions alongside your other integrations — one platform, complete visibility.',
      priceMin: null,
      priceMax: null,
      pricingModel: 'subscription',
      targetDepartments: mapTargetDepartments(['Operations', 'Supply Chain', 'IT']),
      targetPersonas: ['VP Supply Chain', 'Director of Operations', 'IT Director'],
      useCases: [
        'Trading partner onboarding',
        'EDI transaction management',
        'Supply chain automation',
        'Retailer compliance',
      ],
      contentTags: ['EDI', 'B2B', 'supply chain', 'integration'],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT PROFILES (per user)
// ─────────────────────────────────────────────────────────────────────────────

function buildProductProfiles(userId: string, catalogIds: Record<string, string>) {
  return [
    {
      userId,
      catalogProductId: catalogIds['celigo-ipaas'],
      oneLiner: 'Connect any app, automate any workflow — without an integration backlog.',
      elevatorPitch:
        'Celigo is the integration platform that SaaS and tech teams use to automate the workflows that slow them down. Quote-to-cash. Lead routing. HR provisioning. Financial close. 1,000+ prebuilt connectors, AI-powered error handling, and IT-governed templates so business teams can move without waiting in the queue.',
      valueProps: [
        '70% faster automation delivery with AI Copilot and prebuilt templates',
        '95% of integration errors auto-resolved by Celigo AI — no manual monitoring',
        '1,000+ prebuilt connectors including Salesforce, NetSuite, Workday, HubSpot',
        '#1 iPaaS on G2 for 8 consecutive quarters — 2025 Gartner Customers Choice',
        'Business teams build their own flows with IT governance built in',
      ],
      painPoints: [
        'Integration backlog: IT is the bottleneck for every app connection request',
        'Manual reconciliation between CRM, ERP, and billing system every quarter close',
        'New hire provisioning done manually across 5+ systems',
        'Revenue leakage from quote-to-cash gaps between Salesforce and NetSuite',
      ],
      bestForIndustries: ['SaaS', 'Technology', 'Ecommerce', 'Professional Services', 'Healthcare'],
      bestForDepartments: ['IT', 'RevOps', 'Finance', 'Operations', 'HR'],
      priceRangeText: 'Contact for pricing — subscription based on flow volume',
      objectionHandlers: [
        { objection: 'We already use MuleSoft / Workato / Zapier', response: "Those tools each solve part of the problem. MuleSoft requires developer resources and has high implementation costs. Workato is strong but expensive at scale. Zapier doesn't handle enterprise complexity. Celigo is purpose-built for the middle — powerful enough for IT, accessible enough for business teams, with transparent pricing and no hidden costs." },
        { objection: "How long does it take to get the first integration live?", response: 'Most teams have a simple integration running the same day with a prebuilt connector. Complex integrations like Salesforce-to-NetSuite quote-to-cash typically take 2-4 weeks, not 6 months.' },
        { objection: 'Is our data secure?', response: 'Celigo is SOC 2 Type II certified, deploys on AWS with multi-availability zones, and has maintained 99.99%+ uptime for 3+ years. EU data residency is available (AWS Germany). All data in transit and at rest is encrypted.' },
        { objection: 'Do business teams actually use it, or does it require developers?', response: "Both. Celigo's Integration Apps (prebuilt for Salesforce, NetSuite, Shopify, Workday, etc.) are no-code — business teams set them up and run them. For custom integrations, IT uses the full platform with scripting support. IT governs everything through RBAC and audit logs." },
        { objection: 'How is pricing structured?', response: 'Subscription based on the number of active flows and integrations — transparent pricing, no per-transaction surprises. Annual contracts with volume discounts available.' },
      ] as unknown as Prisma.InputJsonValue,
    },
    {
      userId,
      catalogProductId: catalogIds['celigo-ai-automation'],
      oneLiner: 'Describe a workflow in plain English. Celigo AI builds it.',
      elevatorPitch:
        "Celigo AI Copilot lets any team member describe an integration in plain English and get a working flow — field mappings, error handling, test cases included. Pair that with runtime AI that auto-resolves 95% of errors and you get an automation program that runs itself.",
      valueProps: [
        'AI Copilot builds new integrations from natural language — 70% faster than manual build',
        '95% of runtime errors auto-resolved without human intervention',
        'Reusable intelligence: templates and connectors get smarter across your flows',
        'Governed: IT reviews and approves AI-generated flows before they run in production',
      ],
      painPoints: [
        'Building new integrations takes weeks of engineering time',
        'Runtime errors require manual investigation and re-run',
        'Knowledge lives in one developer — no institutional reuse',
      ],
      bestForIndustries: ['SaaS', 'Technology', 'Enterprise'],
      bestForDepartments: ['IT', 'Engineering', 'Operations'],
      priceRangeText: 'Add-on to Celigo Integration Platform — contact for pricing',
      objectionHandlers: [
        { objection: 'How accurate is AI-generated integration design?', response: "Celigo AI suggests the flow structure, field mappings, and error handling — your team reviews and approves before it goes live. It's not fully autonomous; it's AI-assisted with human review, which is the right model for production integrations." },
        { objection: "We're not ready for AI in our integration stack", response: 'AI features are additive — you can run Celigo without AI Copilot. The error auto-resolution is the highest-value feature and works in the background without any change to how your team builds integrations.' },
      ] as unknown as Prisma.InputJsonValue,
    },
    {
      userId,
      catalogProductId: catalogIds['celigo-edi'],
      oneLiner: 'EDI, APIs, and app integrations — one platform, complete visibility.',
      elevatorPitch:
        "Celigo's B2B/EDI Hub manages all your trading partner connections alongside your other integrations. Onboard partners faster, support multiple EDI standards, and get automatic error detection — without maintaining a separate EDI platform.",
      valueProps: [
        'Faster trading partner onboarding — EDI and API connections in the same workflow',
        'Automatic error detection and intelligent error resolution',
        'Single pane of glass: B2B/EDI alongside all your other integrations',
        'Multi-standard support: X12, EDIFACT, and more',
      ],
      painPoints: [
        'Separate EDI platform that IT has to maintain alongside everything else',
        'Partner onboarding takes weeks of manual setup',
        'No visibility into EDI transaction failures until partners complain',
      ],
      bestForIndustries: ['Retail', 'Supply Chain', 'Manufacturing', 'Logistics'],
      bestForDepartments: ['Operations', 'IT', 'Supply Chain'],
      priceRangeText: 'Subscription based on transaction volume — contact for pricing',
      objectionHandlers: [] as unknown as Prisma.InputJsonValue,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT LIBRARY (ContentType: SuccessStory, CompanyEvent, FeatureRelease)
// ─────────────────────────────────────────────────────────────────────────────

function buildContentLibrary(userId: string, productId: string) {
  return [
    {
      userId,
      productId,
      title: 'Therabody — Eliminating Seasonal Labor Costs with Automation',
      type: ContentType.SuccessStory,
      content: {
        headline: 'Therabody eliminates seasonal hiring with Celigo automation',
        oneLiner: 'Consumer products company fully automates peak season operations — no temporary labor required.',
        fullSummary:
          "Therabody, a leading consumer wellness brand, faced a recurring challenge: every peak season brought a surge in orders that required expensive temporary labor to manually process across Shopify, NetSuite, and their 3PL. With Celigo, they built a fully automated order-to-fulfillment workflow. When an order arrives in Shopify, Celigo automatically syncs it to NetSuite for financial processing and to the 3PL for fulfillment — in real time, with error handling built in. Seasonal hiring is now a thing of the past.",
        keyMetrics: [
          'Eliminated seasonal temporary labor costs entirely',
          'Order processing automated end-to-end across Shopify, NetSuite, and 3PL',
          'Operations team now focuses on growth, not data entry',
          '99%+ fulfillment accuracy with automated order sync',
        ],
        whenToUse:
          'Use with operations, IT, and finance buyers at companies with ecommerce, fulfillment, or high-volume order processing. Strong proof point for the "eliminate manual work" value prop.',
        valueProp: 'Celigo automates the operations workflows that scale badly — so your team scales without adding headcount.',
        industry: 'Consumer Products / Ecommerce',
        companySize: '500-1,000 employees',
      } as unknown as Prisma.InputJsonValue,
      industry: 'Consumer Products',
      company: 'Therabody',
      isActive: true,
    },
    {
      userId,
      productId,
      title: 'CDC Foundation — From Manual Processes to Automation-First',
      type: ContentType.SuccessStory,
      content: {
        headline: 'CDC Foundation becomes an automation-first organization with Celigo',
        oneLiner: 'Non-profit transitions from outdated on-prem systems to fully integrated cloud — every department automated.',
        fullSummary:
          "The CDC Foundation faced a challenge familiar to many growing organizations: outdated on-premises systems, manual processes across every department, and an IT team that had become the bottleneck for every integration request. They chose Celigo to lead their transformation. Starting with finance and operations workflows, they expanded to HR, programs, and executive reporting. Today, every department runs automated workflows — and IT has shifted from maintenance to innovation.",
        keyMetrics: [
          'Every department now running automated workflows on a single platform',
          'IT shifted from handling integration requests to enabling business teams',
          'Moved fully from legacy on-prem systems to integrated cloud',
          "CIO: 'They've made us an automation-first company'",
        ],
        whenToUse:
          'Use with IT and C-suite buyers at companies undergoing digital transformation or dealing with an integration backlog. Especially powerful when the prospect has legacy systems and an IT team under pressure.',
        valueProp: 'Celigo transforms IT from a bottleneck into an enabler — one platform for every integration across every department.',
        industry: 'Non-profit',
        companySize: '200-500 employees',
      } as unknown as Prisma.InputJsonValue,
      industry: 'Non-profit',
      company: 'CDC Foundation',
      isActive: true,
    },
    {
      userId,
      productId,
      title: 'Celigo CONNECT 2026 — Annual Customer Summit',
      type: ContentType.CompanyEvent,
      content: {
        eventDate: 'April 15-17, 2026',
        eventType: 'Annual Conference',
        description:
          "Celigo's annual customer conference. Sessions on AI-powered automation, integration best practices, and the future of iPaaS. Hands-on workshops on Salesforce + NetSuite integration, HR system automation, and RevOps workflows. Direct access to Celigo's product team and 500+ automation professionals.",
        registrationUrl: 'https://celigo.com/connect',
        targetAudience: ['IT', 'RevOps', 'Operations', 'Finance', 'Engineering'],
        location: 'San Francisco, CA + Virtual',
        topics: ['AI automation', 'iPaaS', 'RevOps', 'HR automation', 'Financial close', 'Salesforce integration', 'NetSuite'],
        primaryTopic: 'AI-Powered Automation',
        pitchAngleForSaaS:
          'Sessions specifically on Salesforce + NetSuite + HR system integration — directly relevant to RevOps and IT teams at SaaS companies. Best ROI for teams that want to see what automation looks like at their scale.',
      } as unknown as Prisma.InputJsonValue,
      industry: 'Technology',
      isActive: true,
    },
    {
      userId,
      productId,
      title: 'Celigo AI Copilot for Integration Design — January 2026',
      type: ContentType.FeatureRelease,
      content: {
        releaseDate: 'January 2026',
        featureName: 'Celigo AI Copilot',
        headline: 'Describe an integration in plain English. Celigo builds it.',
        description:
          "Celigo AI Copilot lets any team member — technical or not — describe an integration workflow in plain English and receive a fully designed flow with field mappings, error handling, and test cases. IT reviews and approves before it goes live. New integrations that used to take weeks now take hours.",
        keyCapabilities: [
          'Natural language integration design — describe the workflow, Celigo builds the flow',
          'Automatic field mapping suggestions based on connected systems',
          'Error handling and retry logic generated automatically',
          'IT approval workflow before any AI-generated flow goes live',
          '70% reduction in time to build new integrations',
        ],
        bestForOutreach:
          'Perfect for IT and RevOps teams with an integration backlog. The angle: "You have 20 integration requests in the queue — AI Copilot lets your team clear that backlog in days, not months."',
        availableOn: 'All Celigo plans — contact your rep to enable',
      } as unknown as Prisma.InputJsonValue,
      industry: 'Technology',
      isActive: true,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS (Buying Groups) — schema: type (DepartmentType), customName, status; no name/priority
// targetRoles as { economicBuyer, technicalEvaluator, champion, influencer }
// Key deptIds by customName for buildContacts/buildCampaigns
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENTS: Array<{
  type: DepartmentType;
  customName: string;
  useCase: string;
  valueProp: string;
  targetRoles: string[];
  segmentType: string;
}> = [
  {
    type: DepartmentType.REVENUE_OPERATIONS,
    customName: 'RevOps',
    useCase: 'Quote-to-cash automation and lead lifecycle management — connecting Salesforce, billing, and NetSuite to eliminate manual reconciliation and revenue leakage.',
    valueProp:
      "Celigo eliminates the manual handoffs in Lattice's quote-to-cash motion. Salesforce CPQ to billing to NetSuite — automated, accurate, real-time. Your team gets full pipeline visibility without the spreadsheet reconciliation every quarter close.",
    targetRoles: ['VP of Revenue Operations', 'Director of RevOps', 'Senior RevOps Manager', 'Head of Sales Operations'],
    segmentType: 'primary',
  },
  {
    type: DepartmentType.IT_DATA_CENTER,
    customName: 'IT',
    useCase: 'Integration platform governance, new hire provisioning automation, and eliminating the IT integration backlog across Workday, Okta, Slack, and Zendesk.',
    valueProp:
      "Celigo gives Lattice's IT team a governed integration platform where business teams own their workflows — without creating shadow IT. IT sets the guardrails, approves templates, and monitors everything from one dashboard. The backlog disappears.",
    targetRoles: ['VP of IT', 'Director of Enterprise Applications', 'IT Manager', 'Head of Business Systems'],
    segmentType: 'technical',
  },
  {
    type: DepartmentType.HR,
    customName: 'PeopleOps',
    useCase: 'HR system integration — automating new hire onboarding, benefits administration, and HRIS synchronization across Workday and downstream tools.',
    valueProp:
      "Lattice sells people management software to other HR teams — and their own People Ops team has the same manual integration pain. Celigo automates the workflows they manage every day: new hire provisioning, benefits changes, performance cycle notifications. Irony: the HR platform company has manual HR processes. Celigo fixes that.",
    targetRoles: ['VP of People', 'Chief People Officer', 'Director of HR Technology', 'HR Systems Manager'],
    segmentType: 'secondary',
  },
  {
    type: DepartmentType.FINANCE,
    customName: 'Finance',
    useCase: 'Financial close automation — eliminating manual reconciliation between billing systems, expense platforms, and ERP for faster close and audit-ready financials.',
    valueProp:
      "Celigo compresses Lattice's month-end close by eliminating manual reconciliation between their billing system, Brex (expense), and ERP. Faster close, audit-ready data, no surprises. For a Series E company preparing for eventual IPO, clean financials aren't optional.",
    targetRoles: ['CFO', 'VP of Finance', 'Controller', 'Director of FP&A'],
    segmentType: 'economic_buyer',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS — omit notes and isPrimary (schema has no such fields); optional bio for notes
// deptIds keyed by customName: RevOps, IT, PeopleOps, Finance
// ─────────────────────────────────────────────────────────────────────────────

function buildContacts(
  companyId: string,
  deptIds: Record<string, string>
): Array<{
  companyId: string;
  companyDepartmentId: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  linkedinUrl: string;
  bio?: string;
}> {
  return [
    { companyId, companyDepartmentId: deptIds['RevOps'], firstName: 'Sarah', lastName: 'Chen', title: 'VP of Revenue Operations', email: 'sarah.chen@lattice.com', linkedinUrl: 'https://linkedin.com/in/sarahchen-revops', bio: 'Owns quote-to-cash motion end-to-end. Direct pain: Salesforce and billing reconciliation is manual, slowing down every quarter close. Most likely first champion.' },
    { companyId, companyDepartmentId: deptIds['RevOps'], firstName: 'Marcus', lastName: 'Webb', title: 'Director of Sales Operations', email: 'marcus.webb@lattice.com', linkedinUrl: 'https://linkedin.com/in/marcuswebb-salesops', bio: 'Manages Salesforce admin and RevOps tooling day-to-day. Will be the hands-on champion if Sarah buys in.' },
    { companyId, companyDepartmentId: deptIds['RevOps'], firstName: 'Priya', lastName: 'Sharma', title: 'Senior RevOps Manager', email: 'priya.sharma@lattice.com', linkedinUrl: 'https://linkedin.com/in/priyasharma-revops', bio: 'Runs day-to-day RevOps processes. Likely the one manually reconciling data every month close. Most aware of the operational pain.' },
    { companyId, companyDepartmentId: deptIds['IT'], firstName: 'David', lastName: 'Kim', title: 'Director of Enterprise Applications', email: 'david.kim@lattice.com', linkedinUrl: 'https://linkedin.com/in/davidkim-entsystems', bio: 'Owns Workday, Salesforce, and all SaaS app integrations. Direct pain: integration backlog, manual provisioning. Technical champion for IT group.' },
    { companyId, companyDepartmentId: deptIds['IT'], firstName: 'Rachel', lastName: 'Torres', title: 'VP of IT', email: 'rachel.torres@lattice.com', linkedinUrl: 'https://linkedin.com/in/rachelTorres-IT', bio: 'Budget owner for IT tooling. Economic approver for IT purchasing. Cares about governance, security, and reducing IT ticket volume.' },
    { companyId, companyDepartmentId: deptIds['IT'], firstName: 'James', lastName: 'Park', title: 'IT Systems Manager', email: 'james.park@lattice.com', linkedinUrl: 'https://linkedin.com/in/jamespark-systems', bio: 'Day-to-day systems management. Will evaluate Celigo technically. Likely internal advocate if demo resonates.' },
    { companyId, companyDepartmentId: deptIds['PeopleOps'], firstName: 'Alicia', lastName: 'Morgan', title: 'VP of People Operations', email: 'alicia.morgan@lattice.com', linkedinUrl: 'https://linkedin.com/in/aliciamorgan-people', bio: 'Owns HR technology stack. Unique warm angle: she sells people management software (Lattice) to other HR teams and manages her own HR manually. High resonance.' },
    { companyId, companyDepartmentId: deptIds['PeopleOps'], firstName: 'Tom', lastName: 'Bradley', title: 'Director of HR Technology', email: 'tom.bradley@lattice.com', linkedinUrl: 'https://linkedin.com/in/tombradley-hrtech', bio: 'Manages Workday implementation and HR system integrations. Technical champion in the People Ops buying group.' },
    { companyId, companyDepartmentId: deptIds['PeopleOps'], firstName: 'Nina', lastName: 'Patel', title: 'HR Systems Manager', email: 'nina.patel@lattice.com', linkedinUrl: 'https://linkedin.com/in/ninapatel-hrsystems', bio: 'Day-to-day HRIS management. Most directly impacted by manual provisioning workflows.' },
    { companyId, companyDepartmentId: deptIds['Finance'], firstName: 'Chris', lastName: 'Okonkwo', title: 'CFO', email: 'chris.okonkwo@lattice.com', linkedinUrl: 'https://linkedin.com/in/chrisokonkwo-cfo', bio: 'Economic buyer. Cares about clean financials for eventual IPO readiness. Signs any significant software investment.' },
    { companyId, companyDepartmentId: deptIds['Finance'], firstName: 'Jessica', lastName: 'Liu', title: 'VP of Finance', email: 'jessica.liu@lattice.com', linkedinUrl: 'https://linkedin.com/in/jessicaliu-finance', bio: 'Owns financial operations. Direct pain: month-end close delays, revenue recognition lag, manual ERP reconciliation.' },
    { companyId, companyDepartmentId: deptIds['Finance'], firstName: 'Ryan', lastName: 'Costa', title: 'Controller', email: 'ryan.costa@lattice.com', linkedinUrl: 'https://linkedin.com/in/ryancosta-controller', bio: 'Closes the books every month. Most directly impacted by current manual reconciliation between billing, expense, and ERP.' },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT CAMPAIGNS (Sales Pages) — departmentId from deptIds by customName
// ─────────────────────────────────────────────────────────────────────────────

function buildCampaigns(
  userId: string,
  companyId: string,
  deptIds: Record<string, string>
) {
  return [
    {
      userId,
      companyId,
      departmentId: deptIds['RevOps'],
      slug: 'celigo-lattice-revops',
      title: "Celigo for Lattice's Revenue Operations Team",
      description: "Personalized sales page for Lattice's RevOps buying group — quote-to-cash and lead lifecycle automation.",
      url: `${BASE_URL}/go/celigo-lattice-revops`,
      type: 'landing_page',
      headline: "Lattice's Revenue Operations team deserves a quote-to-cash motion that actually closes.",
      body: "Your team is growing fast. New reps, new contracts, new markets — and the same manual process holding everything together. Every quarter close means hours of reconciliation between systems that don't talk to each other. That's not a RevOps problem. That's an integration problem.\n\nCeligo connects Salesforce, your billing system, and NetSuite so your RevOps team stops reconciling spreadsheets and starts driving revenue. Real-time sync. Automated lead routing. Financial close without the fire drill.",
      ctaLabel: 'See it in action for the Lattice RevOps stack',
      ctaUrl: 'https://celigo.com/demo',
      pageSections: {
        valueProps: [
          { headline: 'Close the books without the manual reconciliation', body: 'Celigo syncs your billing system, Salesforce, and NetSuite in real time. Month-end becomes a verification, not a marathon.' },
          { headline: 'Leads route instantly — no manual handoffs', body: "New MQL from HubSpot? Celigo triggers the Salesforce record, assigns the rep, and sends the sequence — in seconds, not hours." },
          { headline: 'Your RevOps team owns it — no engineering required', body: "Celigo's 1,000+ prebuilt connectors and AI Copilot mean your team builds and manages integrations without waiting in the IT queue." },
        ],
        socialProof: { quote: "We're saving 10-15 hours on data reconciliation every month with Celigo.", attribution: '— Assistant Controller, Avenue One', gartner: '2025 Gartner Customers Choice for iPaaS. #1 on G2 for 8 consecutive quarters.' },
        caseStudy: { title: 'CDC Foundation — Automation-First Transformation', summary: "From manual processes across every department to a fully integrated cloud platform. IT shifted from bottleneck to enabler. Every team now runs automated workflows." },
      } as unknown as Prisma.InputJsonValue,
    },
    {
      userId,
      companyId,
      departmentId: deptIds['IT'],
      slug: 'celigo-lattice-it',
      title: "Celigo for Lattice's IT & Enterprise Applications Team",
      description: "Personalized sales page for Lattice's IT buying group — integration governance and new hire provisioning automation.",
      url: `${BASE_URL}/go/celigo-lattice-it`,
      type: 'landing_page',
      headline: "Your IT team shouldn't be the bottleneck for every app connection at Lattice.",
      body: "600 employees. Dozens of SaaS tools. Every new integration goes through IT. Every new hire requires manual provisioning across Workday, Okta, Slack, and Zendesk. It's not sustainable — and you know it.\n\nCeligo gives your team a governed integration platform where business teams can build and run their own automations — within the guardrails IT sets. You stay in control. The integration backlog disappears.",
      ctaLabel: 'See how IT teams at 5,000+ companies run Celigo',
      ctaUrl: 'https://celigo.com/demo',
      pageSections: {
        valueProps: [
          { headline: 'End the integration backlog', body: "Business teams use Celigo's no-code builder to connect their own tools — no IT ticket required. IT approves templates and monitors everything from one dashboard." },
          { headline: 'New hire, Day 1 ready', body: 'Celigo automates provisioning across Workday, Okta, Slack, and every downstream app the moment HR creates the record. Zero manual steps, complete audit trail.' },
          { headline: 'One platform for every integration pattern', body: 'APIs, app integrations, EDI, data flows, and AI agents — all governed and monitored from a single pane of glass. No tool sprawl.' },
        ],
        socialProof: { quote: "Celigo's knowledgeable support team, the documentation, and Celigo AI simplified our implementation — we completed our first 3 integrations within 3 months.", attribution: '— IT Manager, Gartner Peer Insights', gartner: '2025 Gartner Customers Choice. SOC 2 Type II certified. 99.99%+ uptime for 3+ years.' },
        caseStudy: { title: 'Therabody — Eliminated Seasonal Labor with Automation', summary: 'Automated order-to-fulfillment across Shopify, NetSuite, and 3PL. Seasonal hiring eliminated. Operations now focused on growth.' },
      } as unknown as Prisma.InputJsonValue,
    },
    // Event-based sales page: Celigo CONNECT 2026 (company-wide, no department)
    // Uses sections so /go/celigo-connect-2026 renders StaticSalesPage with template + CTA
    {
      userId,
      companyId,
      departmentId: null,
      slug: 'celigo-connect-2026',
      title: 'Celigo CONNECT 2026 — Annual Customer Summit',
      description: 'Invite Lattice to Celigo CONNECT 2026. Sessions on AI automation, Salesforce + NetSuite integration, and RevOps workflows.',
      url: `${BASE_URL}/go/celigo-connect-2026`,
      type: 'landing_page',
      pageType: 'event_invite',
      headline: 'Join 500+ automation leaders at Celigo CONNECT 2026',
      subheadline: 'April 15–17, 2026 — San Francisco, CA + Virtual',
      body:
        "Celigo's annual customer conference is the place for IT, RevOps, and Operations teams to see what's next in iPaaS: AI-powered integration design, hands-on workshops for Salesforce + NetSuite + HR automation, and direct access to the Celigo product team.",
      ctaLabel: 'Register for CONNECT 2026',
      ctaUrl: 'https://celigo.com/connect',
      sections: [
        { type: 'hero', headline: 'Join 500+ automation leaders at Celigo CONNECT 2026', body: 'April 15–17, 2026 — San Francisco + Virtual. Sessions on AI-powered integration design, hands-on workshops, and direct access to the Celigo product team.' },
        { type: 'value_props', items: [
          { title: 'AI-Powered Automation', body: 'Sessions on Celigo AI Copilot and the future of integration design.' },
          { title: 'Hands-on workshops', body: 'Salesforce + NetSuite integration, HR system automation, RevOps workflows.' },
          { title: 'Direct access to product', body: 'Meet the Celigo team and shape the roadmap.' },
        ]},
        { type: 'event', name: 'Celigo CONNECT 2026', date: 'April 15–17, 2026', location: 'San Francisco, CA + Virtual', description: "Celigo's annual customer conference. Sessions on AI automation, integration best practices, and the future of iPaaS. Hands-on workshops and peer networking with 500+ automation professionals.", registerUrl: 'https://celigo.com/connect' },
        { type: 'social_proof', quotes: [{ text: 'CONNECT is where we see what automation looks like at scale.', author: 'VP of IT', title: 'Gartner Peer Insights' }] },
        { type: 'cta', headline: 'Reserve your spot', buttonLabel: 'Register for CONNECT 2026', buttonUrl: 'https://celigo.com/connect' },
      ] as unknown as Prisma.InputJsonValue,
      pageSections: {
        valueProps: [
          { headline: 'AI-Powered Automation', body: 'Sessions on Celigo AI Copilot and the future of integration design.' },
          { headline: 'Hands-on workshops', body: 'Salesforce + NetSuite integration, HR system automation, RevOps workflows.' },
          { headline: 'Direct access to product', body: 'Meet the Celigo team and shape the roadmap.' },
        ],
        socialProof: { quote: 'CONNECT is where we see what automation looks like at scale.', attribution: '— VP of IT, Gartner Peer Insights', gartner: '' },
        caseStudy: { title: 'CDC Foundation — Automation-First', summary: 'From manual processes to fully integrated cloud. Every department now runs automated workflows.' },
      } as unknown as Prisma.InputJsonValue,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO ACCOUNT SIGNALS (show in dashboard hot signals + company Activity without Exa)
// publishedAt within last 48h, relevanceScore >= 7 so they appear in hot signals
// ─────────────────────────────────────────────────────────────────────────────

function buildDemoSignals(companyId: string, userId: string): Array<{
  companyId: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  relevanceScore: number;
  suggestedPlay: string | null;
  status: string;
}> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return [
    {
      companyId,
      userId,
      type: 'product_announcement',
      title: 'Lattice launches new performance management features',
      summary: 'Lattice announced updates to its performance and engagement suite, with stronger integrations for HR and People teams. Good moment to reach out to People Ops and RevOps.',
      url: 'https://lattice.com/blog/performance-management-2026',
      publishedAt: yesterday,
      relevanceScore: 8,
      suggestedPlay: 'feature_release',
      status: 'new',
    },
    {
      companyId,
      userId,
      type: 'executive_hire',
      title: 'Lattice appoints new VP of Revenue Operations',
      summary: 'Sarah Chen joined as VP of RevOps to scale quote-to-cash and GTM systems. Strong champion candidate for integration and RevOps conversations.',
      url: 'https://lattice.com/about/leadership',
      publishedAt: twoDaysAgo,
      relevanceScore: 9,
      suggestedPlay: 'new_buying_group',
      status: 'new',
    },
    {
      companyId,
      userId,
      type: 'industry_news',
      title: 'Lattice expands enterprise customer base in SaaS vertical',
      summary: 'Lattice is seeing increased adoption among mid-market and enterprise SaaS companies. Integration and automation pain points are top of mind.',
      url: 'https://lattice.com/press/enterprise-growth',
      publishedAt: yesterday,
      relevanceScore: 7,
      suggestedPlay: 're_engagement',
      status: 'new',
    },
    {
      companyId,
      userId,
      type: 'earnings_call',
      title: 'Lattice reports strong Q4 results, raises full-year guidance',
      summary: 'Revenue beat expectations; management highlighted investment in product and go-to-market. Budget cycles may be opening for RevOps and IT tools.',
      url: 'https://investors.lattice.com/earnings',
      publishedAt: twoDaysAgo,
      relevanceScore: 8,
      suggestedPlay: 're_engagement',
      status: 'new',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: DEMO_USER_EMAIL },
  });
  if (!user) {
    console.error(`No user found with email: ${DEMO_USER_EMAIL}`);
    console.error('Sign in once as that account, then re-run this seed.');
    process.exit(1);
  }
  console.log('Using user:', user.email);

  // Set user company basics so "Your company data" page loads (getCompanySetupState requires companyWebsite).
  await prisma.user.update({
    where: { id: user.id },
    data: {
      companyName: 'Celigo',
      companyWebsite: 'https://celigo.com',
      companyIndustry: 'Technology',
      primaryIndustrySellTo: 'SaaS',
    },
  });
  console.log('Updated user company info (Celigo) so Your company data loads.');

  let product = await prisma.product.findFirst({
    where: { userId: user.id, name: 'Celigo Integration Platform' },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        userId: user.id,
        name: 'Celigo Integration Platform',
        description: '#1 iPaaS — connect any app, automate any workflow',
        category: 'Integration',
      },
    });
    console.log('Created Product: Celigo Integration Platform');
  } else {
    console.log('Using existing Product:', product.name);
  }

  const catalogProducts = getCatalogProducts(user.id);
  const catalogIds: Record<string, string> = {};
  for (const cp of catalogProducts) {
    const existing = await prisma.catalogProduct.findFirst({
      where: { userId: user.id, slug: cp.slug },
    });
    if (!existing) {
      const created = await prisma.catalogProduct.create({ data: cp });
      catalogIds[cp.slug] = created.id;
      console.log('Created CatalogProduct:', cp.name);
    } else {
      catalogIds[cp.slug] = existing.id;
      console.log('Using existing CatalogProduct:', cp.name);
    }
  }

  const profiles = buildProductProfiles(user.id, catalogIds);
  for (const profile of profiles) {
    await prisma.productProfile.upsert({
      where: {
        catalogProductId_userId: {
          catalogProductId: profile.catalogProductId,
          userId: profile.userId,
        },
      },
      create: profile,
      update: {
        oneLiner: profile.oneLiner,
        elevatorPitch: profile.elevatorPitch,
        valueProps: profile.valueProps,
        painPoints: profile.painPoints,
        objectionHandlers: profile.objectionHandlers,
        priceRangeText: profile.priceRangeText,
      },
    });
    console.log('Upserted ProductProfile for:', profile.catalogProductId);
  }

  const contentItems = buildContentLibrary(user.id, product.id);
  for (const item of contentItems) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId: user.id, title: item.title, type: item.type },
    });
    if (!existing) {
      await prisma.contentLibrary.create({ data: item });
      console.log('Created ContentLibrary:', item.title);
    } else {
      await prisma.contentLibrary.update({
        where: { id: existing.id },
        data: { content: item.content, isActive: true },
      });
      console.log('Updated ContentLibrary:', item.title);
    }
  }

  let company = await prisma.company.findFirst({
    where: { userId: user.id, name: 'Lattice HQ' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        userId: user.id,
        name: 'Lattice HQ',
        domain: 'lattice.com',
        website: 'https://lattice.com',
        industry: 'SaaS / HR Technology',
        employees: '600',
        revenue: '$127M ARR',
        headquarters: 'San Francisco, CA',
        researchGoal:
          'Break into Lattice across RevOps, IT, and HR Ops. They are scaling fast and their integration debt is growing. Position Celigo as the platform that lets each team own their automations without waiting on IT.',
      },
    });
    console.log('Created Company: Lattice HQ');
  } else {
    console.log('Using existing Company: Lattice HQ');
  }

  const deptIds: Record<string, string> = {};
  for (const dept of DEPARTMENTS) {
    const existing = await prisma.companyDepartment.findUnique({
      where: { companyId_type: { companyId: company.id, type: dept.type } },
    });
    const targetRolesJson = {
      economicBuyer: dept.targetRoles,
      technicalEvaluator: [] as string[],
      champion: [] as string[],
      influencer: [] as string[],
    } as Prisma.InputJsonValue;
    if (!existing) {
      const created = await prisma.companyDepartment.create({
        data: {
          companyId: company.id,
          type: dept.type,
          customName: dept.customName,
          status: DepartmentStatus.RESEARCH_PHASE,
          useCase: dept.useCase,
          valueProp: dept.valueProp,
          targetRoles: targetRolesJson,
          segmentType: dept.segmentType,
        },
      });
      deptIds[dept.customName] = created.id;
      console.log('Created Department:', dept.customName);
    } else {
      deptIds[dept.customName] = existing.id;
      await prisma.companyDepartment.update({
        where: { id: existing.id },
        data: { useCase: dept.useCase, valueProp: dept.valueProp, targetRoles: targetRolesJson, segmentType: dept.segmentType },
      });
      console.log('Using existing Department:', dept.customName);
    }
  }

  const contacts = buildContacts(company.id, deptIds);
  let contactsCreated = 0;
  for (const contact of contacts) {
    const existing = await prisma.contact.findFirst({
      where: { companyId: contact.companyId, email: contact.email },
    });
    if (!existing) {
      await prisma.contact.create({
        data: {
          companyId: contact.companyId,
          companyDepartmentId: contact.companyDepartmentId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          email: contact.email,
          linkedinUrl: contact.linkedinUrl,
          ...(contact.bio != null && { bio: contact.bio }),
        },
      });
      contactsCreated++;
    }
  }
  console.log(`Contacts: ${contactsCreated} created, ${contacts.length - contactsCreated} already existed`);

  const campaigns = buildCampaigns(user.id, company.id, deptIds);
  for (const campaign of campaigns) {
    await prisma.segmentCampaign.upsert({
      where: { userId_slug: { userId: user.id, slug: campaign.slug } },
      create: campaign,
      update: {
        companyId: campaign.companyId,
        departmentId: campaign.departmentId,
        headline: campaign.headline,
        subheadline: (campaign as { subheadline?: string | null }).subheadline ?? null,
        body: campaign.body,
        ctaLabel: campaign.ctaLabel,
        pageSections: campaign.pageSections,
        sections: (campaign as { sections?: unknown }).sections ?? undefined,
        url: campaign.url,
      },
    });
    console.log('Upserted SegmentCampaign:', campaign.slug);
  }

  // Demo account signals (show in dashboard hot signals + company Activity without Exa)
  const existingSignalCount = await prisma.accountSignal.count({
    where: { companyId: company.id },
  });
  if (existingSignalCount < 4) {
    const demoSignals = buildDemoSignals(company.id, user.id);
    for (const signal of demoSignals) {
      const existing = await prisma.accountSignal.findFirst({
        where: { companyId: company.id, url: signal.url },
      });
      if (!existing) {
        await prisma.accountSignal.create({ data: signal });
        console.log('Created AccountSignal:', signal.type);
      }
    }
    console.log('Demo account signals ready (dashboard hot signals + company Activity).');
  } else {
    console.log('Using existing demo account signals.');
  }

  console.log('\n──────────────────────────────────────────');
  console.log('Celigo / Lattice demo environment seeded.');
  console.log('');
  console.log('Sales pages:');
  console.log(' RevOps:', `${BASE_URL}/go/celigo-lattice-revops`);
  console.log(' IT:    ', `${BASE_URL}/go/celigo-lattice-it`);
  console.log(' Event: ', `${BASE_URL}/go/celigo-connect-2026`);
  console.log('');
  console.log('Next steps:');
  console.log(' 1. Open AgentPilot as demo-saas@agentpilot.us');
  console.log(' 2. Verify: Your company data → 3 products + 2 success stories + 1 event + 1 feature release');
  console.log(' 3. Verify: Target Accounts → Lattice HQ → 4 buying groups, 12 contacts, 2 sales pages');
  console.log(' 4. Verify: Dashboard hot signals + company Activity tab show demo signals (no Exa run)');
  console.log(' 5. Optional: Dashboard → Demo setup → select Lattice HQ → Build demo → Lock as demo');
  console.log('──────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Comprehensive NVIDIA → General Motors demo seed.
 *
 * Sets up the full selling environment for demo-techinfra@agentpilot.us:
 *   - NVIDIA as seller (User fields, CatalogProducts, ProductProfiles, legacy Products)
 *   - General Motors as target (Company, 5 divisions, 13 pre-enriched contacts)
 *   - ContentLibrary (4 events, 3 success stories, 2 use cases, 2 feature releases)
 *   - AccountSignals (3 GM-side: new hire, Cruise restructuring, Q4 earnings)
 *   - EventAttendance records for My Company events
 *   - CompanyProduct matrix (NVIDIA products × GM divisions)
 *   - AdaptiveRoadmap + targets, contacts, signal rules, action mappings, plans
 *   - Activities + demo lock
 *   - Personas for automotive selling
 *
 * Idempotent: safe to re-run. Uses find-or-create / upsert throughout.
 *
 * Run:  npm run seed:demo:nvidia-gm
 * Or:   npx dotenv -e .env.local -- tsx prisma/seed-demo-nvidia-gm.ts
 */

import {
  PrismaClient,
  DepartmentType,
  DepartmentStatus,
  ContentType,
  ProductOwnershipStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedDemoPlaybookTemplates } from './seed-demo-playbook-templates';
import { seedDefaultSalesMapTemplates } from './seed-sales-map-templates';
import { seedSignalPlaybooks } from './seed-signal-playbooks';
import { seedProactivePlaybooks } from './seed-proactive-playbooks';

const DEMO_EMAIL = process.env.DEMO_GM_EMAIL ?? 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-demo-nvidia-gm.ts');
  }
  const normalized = connectionString
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

const prisma = createPrisma();

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600_000);
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86400_000);
}
function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 86400_000);
}

// ─────────────────────────────────────────────
// Step 1 — User & Seller Setup (NVIDIA)
// ─────────────────────────────────────────────
async function seedSellerSetup() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: DEMO_EMAIL, mode: 'insensitive' } },
  });
  if (!user) {
    console.error(`No user found with email: ${DEMO_EMAIL}. Sign in as that user once, then run this seed.`);
    process.exit(1);
  }
  console.log('Using user:', user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      companyName: 'NVIDIA',
      companyWebsite: 'https://www.nvidia.com',
      companyIndustry: 'Semiconductors',
      primaryIndustrySellTo: 'Automotive',
      companyLogoUrl: 'https://upload.wikimedia.org/wikipedia/sco/thumb/2/21/Nvidia_logo.svg/351px-Nvidia_logo.svg.png',
    },
  });
  console.log('Updated user with NVIDIA seller info');
  return user;
}

// ─────────────────────────────────────────────
// Step 2 — NVIDIA Catalog Products + Profiles
// ─────────────────────────────────────────────
const NVIDIA_PRODUCTS = [
  {
    name: 'NVIDIA DRIVE',
    slug: 'nvidia-drive',
    description:
      'End-to-end autonomous vehicle development platform: simulation, perception, mapping, and in-vehicle compute for L2+ to L4/L5.',
    targetDepartments: [DepartmentType.OPERATIONS, DepartmentType.ENGINEERING, DepartmentType.CONNECTED_SERVICES],
    targetPersonas: ['VP Vehicle Engineering', 'AV/ADAS Director', 'Software-Defined Vehicle Lead'],
    useCases: ['AV development', 'ADAS', 'Simulation', 'In-vehicle compute'],
    contentTags: ['automotive', 'autonomous', 'simulation', 'ADAS'],
    priceMin: 500_000,
    priceMax: 5_000_000,
    pricingModel: 'platform_license',
    profile: {
      oneLiner: 'The end-to-end platform for developing, testing, and deploying autonomous vehicles at scale.',
      elevatorPitch:
        'NVIDIA DRIVE gives automotive OEMs a unified AI compute and software platform spanning simulation, perception, mapping, and in-vehicle deployment — from L2+ ADAS to L4/L5 autonomy. OEMs can cut development cycles by 50% while improving safety validation coverage by 10x.',
      valueProps: [
        '10x improvement in simulation coverage for safety validation',
        '50% faster AV development cycles with end-to-end platform',
        'Single architecture from development to deployment',
        'Scalable from L2+ ADAS to L4/L5 full autonomy',
      ],
      painPoints: [
        'Fragmented AV toolchains across perception, simulation, and deployment',
        'Insufficient simulation scale for safety-critical validation',
        'High cost of physical test fleets',
      ],
      bestForDepartments: ['Autonomous Vehicles', 'Vehicle Engineering', 'ADAS'],
      bestForIndustries: ['Automotive', 'Transportation', 'Logistics'],
      objectionHandlers: [
        { objection: 'We already have an in-house AV stack', response: 'NVIDIA DRIVE complements in-house stacks — many OEMs use it for simulation and compute while keeping proprietary perception layers. It accelerates what you already do.' },
        { objection: 'The cost is too high for our AV program budget', response: 'Consider the cost of physical testing: one year of 100-car test fleet ≈ $50M. DRIVE Sim replaces 90% of those miles at a fraction of cost.' },
      ],
      priceRangeText: '$500K–$5M platform license',
    },
  },
  {
    name: 'NVIDIA Omniverse',
    slug: 'nvidia-omniverse',
    description:
      'Platform for 3D design collaboration, industrial digital twins, and large-scale simulation for manufacturing and engineering.',
    targetDepartments: [DepartmentType.ENGINEERING, DepartmentType.OPERATIONS, DepartmentType.INDUSTRIAL_DESIGN],
    targetPersonas: ['VP Manufacturing', 'Digital Twin Lead', 'Simulation Director', 'VP Vehicle Engineering'],
    useCases: ['Digital twin', 'Design collaboration', 'Factory simulation', 'Battery thermal analysis'],
    contentTags: ['digital-twin', 'manufacturing', 'simulation', '3D'],
    priceMin: 200_000,
    priceMax: 2_000_000,
    pricingModel: 'enterprise_license',
    profile: {
      oneLiner: 'Build physically accurate digital twins of vehicles, factories, and supply chains.',
      elevatorPitch:
        'NVIDIA Omniverse connects engineering and manufacturing tools into a single, physically accurate simulation environment. Automotive OEMs use it to build digital twins of factories, validate assembly lines before buildout, and run GPU-accelerated CFD/CAE for battery thermal and crash analysis — cutting design iteration time by 40%.',
      valueProps: [
        '40% reduction in design iteration time for EV platforms',
        'Validate factory layouts virtually before physical buildout',
        'GPU-accelerated CFD/CAE for battery thermal analysis',
        'Universal Scene Description (OpenUSD) connects all tools',
      ],
      painPoints: [
        'Siloed design tools that don\'t interoperate',
        'Costly and slow physical prototype cycles',
        'Inability to simulate full factory operations digitally',
      ],
      bestForDepartments: ['Engineering', 'Manufacturing', 'Industrial Design'],
      bestForIndustries: ['Automotive', 'Manufacturing', 'Aerospace'],
      objectionHandlers: [
        { objection: 'We already use Siemens/Dassault for digital twin', response: 'Omniverse integrates with Siemens Teamcenter and Dassault tools via OpenUSD connectors — it enhances your existing investment rather than replacing it.' },
        { objection: 'Our engineering team isn\'t GPU-ready', response: 'Omniverse Cloud runs on NVIDIA infrastructure — no on-prem GPU deployment needed. Teams access it through their existing browser-based workflow.' },
      ],
      priceRangeText: '$200K–$2M enterprise license',
    },
  },
  {
    name: 'NVIDIA DGX',
    slug: 'nvidia-dgx',
    description:
      'AI infrastructure for training and inference — DGX/HGX systems for enterprise AI, AV model training, and data center workloads.',
    targetDepartments: [DepartmentType.IT_INFRASTRUCTURE, DepartmentType.ENGINEERING],
    targetPersonas: ['VP IT Infrastructure', 'AI/ML Director', 'Data Center Lead'],
    useCases: ['AI training', 'AV model training', 'Enterprise AI platform', 'Simulation at scale'],
    contentTags: ['AI', 'data-center', 'training', 'inference', 'GPU'],
    priceMin: 300_000,
    priceMax: 10_000_000,
    pricingModel: 'hardware_plus_support',
    profile: {
      oneLiner: 'Purpose-built AI supercomputing for enterprise training and inference workloads.',
      elevatorPitch:
        'NVIDIA DGX systems give automotive OEMs dedicated AI infrastructure for training AV perception models, running large-scale simulation, and powering enterprise AI workloads. DGX Cloud provides on-demand GPU clusters without the capital investment of on-prem deployment.',
      valueProps: [
        '3–5x faster AV model training versus general-purpose cloud GPU',
        'Turnkey AI infrastructure with integrated networking and software',
        'DGX Cloud option eliminates upfront capex for initial deployments',
        'Single platform supports AV training, simulation, and enterprise AI',
      ],
      painPoints: [
        'Cloud GPU costs ballooning for large-scale AI training',
        'AV model training taking weeks instead of days',
        'Separate infrastructure for AV vs. enterprise AI workloads',
      ],
      bestForDepartments: ['IT / Data Center', 'Engineering', 'Autonomous Vehicles'],
      bestForIndustries: ['Automotive', 'Technology', 'Research'],
      objectionHandlers: [
        { objection: 'We\'re committed to cloud-first infrastructure', response: 'DGX Cloud runs in AWS, Azure, and Oracle Cloud with the same DGX software stack — you get dedicated GPU performance with cloud flexibility.' },
        { objection: 'The upfront cost is significant', response: 'Compare to cloud GPU spend: teams running 100+ GPU training jobs typically break even within 12 months on DGX vs. on-demand cloud pricing.' },
      ],
      priceRangeText: '$300K–$10M (hardware + support)',
    },
  },
] as const;

async function seedCatalogProducts(userId: string) {
  const catalogIds: Record<string, string> = {};

  for (const p of NVIDIA_PRODUCTS) {
    let catalog = await prisma.catalogProduct.findFirst({
      where: { userId, slug: p.slug },
    });
    if (!catalog) {
      catalog = await prisma.catalogProduct.create({
        data: {
          userId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          targetDepartments: [...p.targetDepartments],
          targetPersonas: [...p.targetPersonas],
          useCases: [...p.useCases],
          contentTags: [...p.contentTags],
          priceMin: p.priceMin,
          priceMax: p.priceMax,
          pricingModel: p.pricingModel,
        },
      });
      console.log('Created CatalogProduct:', p.name);
    }
    catalogIds[p.slug] = catalog.id;

    // ProductProfile
    await prisma.productProfile.upsert({
      where: { catalogProductId_userId: { catalogProductId: catalog.id, userId } },
      create: {
        userId,
        catalogProductId: catalog.id,
        oneLiner: p.profile.oneLiner,
        elevatorPitch: p.profile.elevatorPitch,
        valueProps: p.profile.valueProps as unknown as Prisma.InputJsonValue,
        painPoints: p.profile.painPoints as unknown as Prisma.InputJsonValue,
        bestForDepartments: p.profile.bestForDepartments as unknown as Prisma.InputJsonValue,
        bestForIndustries: p.profile.bestForIndustries as unknown as Prisma.InputJsonValue,
        objectionHandlers: p.profile.objectionHandlers as unknown as Prisma.InputJsonValue,
        priceRangeText: p.profile.priceRangeText,
      },
      update: {
        oneLiner: p.profile.oneLiner,
        elevatorPitch: p.profile.elevatorPitch,
        valueProps: p.profile.valueProps as unknown as Prisma.InputJsonValue,
        painPoints: p.profile.painPoints as unknown as Prisma.InputJsonValue,
        objectionHandlers: p.profile.objectionHandlers as unknown as Prisma.InputJsonValue,
        priceRangeText: p.profile.priceRangeText,
      },
    });

    // Legacy Product row
    const legacyProduct = await prisma.product.findFirst({
      where: { userId, name: p.name },
    });
    if (!legacyProduct) {
      await prisma.product.create({
        data: { userId, name: p.name, description: p.description, category: 'Platform' },
      });
    }
  }
  console.log('Ensured 3 CatalogProducts + ProductProfiles + legacy Products');
  return catalogIds;
}

// ─────────────────────────────────────────────
// Step 3 — General Motors Company + Departments
// ─────────────────────────────────────────────
type DivisionSeed = {
  label: string;
  type: DepartmentType;
  status: DepartmentStatus;
  estimatedSize: number;
  notes: string;
  useCase: string;
  targetRoles: object;
  estimatedOpportunity: string;
  valueProp: string;
};

const GM_DIVISIONS: DivisionSeed[] = [
  {
    label: 'Vehicle Engineering & Simulation',
    type: DepartmentType.ENGINEERING,
    status: DepartmentStatus.EXPANSION_TARGET,
    estimatedSize: 8000,
    notes: 'Ultium EV platform timelines and digital twin initiatives; heavy use of simulation (CFD/CAE) and battery thermal analysis.',
    useCase: 'GPU-accelerated CFD/CAE for battery thermal analysis, EV platform simulation, and digital twin validation of vehicle designs.',
    targetRoles: {
      economicBuyer: ['VP Vehicle Engineering', 'SVP Engineering'],
      technicalEvaluator: ['Director Simulation', 'Director Digital Twin'],
      champion: ['Senior Manager CAE/CFD', 'Principal Engineer Simulation'],
      influencer: ['Chief Engineer EV Platform'],
    },
    estimatedOpportunity: '$1M–$3M',
    valueProp: 'Compress Ultium EV development cycles by 40% with GPU-accelerated simulation and Omniverse digital twins.',
  },
  {
    label: 'Autonomous Driving & ADAS (includes Cruise)',
    type: DepartmentType.OPERATIONS,
    status: DepartmentStatus.ACTIVE_CUSTOMER,
    estimatedSize: 3500,
    notes: 'Cruise L4 robotaxis plus GM corporate AV/ADAS teams; needs scalable compute and simulation from development to deployment.',
    useCase: 'End-to-end AV development platform: perception model training (DGX), driving simulation (DRIVE Sim), and in-vehicle compute (DRIVE Thor).',
    targetRoles: {
      economicBuyer: ['VP Autonomous Vehicle Engineering'],
      technicalEvaluator: ['Director ADAS', 'Director AV Compute'],
      champion: ['Senior Manager AV Platform', 'Principal Engineer Perception'],
      influencer: ['Chief Safety Officer'],
    },
    estimatedOpportunity: '$3M–$8M',
    valueProp: 'Unify Cruise L4 and GM ADAS on a single NVIDIA DRIVE + DGX stack — 10x simulation coverage, 3x faster model training.',
  },
  {
    label: 'Manufacturing & Supply Chain',
    type: DepartmentType.OPERATIONS,
    status: DepartmentStatus.EXPANSION_TARGET,
    estimatedSize: 12000,
    notes: 'Digital factories and supply chain optimization for Ultium plants; interest in quality control, predictive maintenance, and throughput.',
    useCase: 'Omniverse-powered digital twin of Ultium battery plants for layout optimization, predictive maintenance, and quality inspection using AI vision.',
    targetRoles: {
      economicBuyer: ['VP Manufacturing Technology'],
      technicalEvaluator: ['Director Digital Factory', 'Director Quality Systems'],
      champion: ['Manager Smart Factory Initiatives'],
      influencer: ['SVP Global Manufacturing'],
    },
    estimatedOpportunity: '$500K–$2M',
    valueProp: 'Build digital twins of Ultium plants to optimize throughput, reduce defects by 30%, and validate layouts before physical buildout.',
  },
  {
    label: 'IT Infrastructure & AI Platform',
    type: DepartmentType.IT_INFRASTRUCTURE,
    status: DepartmentStatus.RESEARCH_PHASE,
    estimatedSize: 1500,
    notes: 'DGX/HGX clusters and AI platform to support AV training, simulation, and broader enterprise AI workloads.',
    useCase: 'DGX-based AI supercomputing infrastructure for centralized model training, serving AV, manufacturing, and enterprise AI teams.',
    targetRoles: {
      economicBuyer: ['VP IT Infrastructure', 'CTO'],
      technicalEvaluator: ['Director AI/ML Platform', 'Director Data Center Operations'],
      champion: ['Senior Manager GPU Infrastructure'],
      influencer: ['CISO'],
    },
    estimatedOpportunity: '$2M–$10M',
    valueProp: 'Consolidate GM\'s AI compute on DGX — 3x faster training, 40% lower per-job cost vs. cloud GPU, single platform for all AI workloads.',
  },
  {
    label: 'Software-Defined Vehicle & Connected Services',
    type: DepartmentType.CONNECTED_SERVICES,
    status: DepartmentStatus.NOT_ENGAGED,
    estimatedSize: 2000,
    notes: 'Ultifi software-defined vehicle platform and connected services; in-vehicle AI and OTA feature roadmap.',
    useCase: 'NVIDIA DRIVE-powered in-vehicle AI for Ultifi SDV platform, OTA feature delivery, and next-gen connected services.',
    targetRoles: {
      economicBuyer: ['VP Vehicle Software Platform'],
      technicalEvaluator: ['Director Connected Services', 'Director OTA Engineering'],
      champion: ['Senior Manager In-Vehicle AI'],
      influencer: ['Chief Digital Officer'],
    },
    estimatedOpportunity: '$500K–$2M',
    valueProp: 'Power GM\'s Ultifi SDV platform with NVIDIA DRIVE in-vehicle AI — enable real-time OTA features and connected services.',
  },
];

// Pre-built research data so the "Account research" step shows as complete
// without needing to call any AI API. workflowStep=3 marks the account as
// fully set up (research done + buying groups + contacts).
const GM_RESEARCH_DATA = {
  businessOverview:
    'General Motors Company (GM) is one of the world\'s largest automotive manufacturers, headquartered in Detroit, Michigan. With approximately 167,000 employees and $171.8B in 2024 revenue, GM operates globally under brands including Chevrolet, GMC, Buick, and Cadillac. GM is executing a multi-year transformation into an EV-first, software-defined vehicle company through three strategic pillars: (1) Ultium EV platform — the foundation for all next-gen electric vehicles; (2) Cruise autonomous driving — L4 robotaxi program undergoing restructuring and consolidation under GM corporate AV; and (3) Ultifi — GM\'s software-defined vehicle platform for OTA features and connected services.',
  keyInitiatives: [
    'Ultium EV platform: electrify full lineup by 2035, targeting 1M+ EV annual units by 2026',
    'Cruise AV consolidation: integrate Cruise R&D under GM corporate autonomous vehicle engineering with unified ADAS + L4 roadmap',
    'Digital manufacturing: digitize all Ultium battery plants with smart factory and digital twin capabilities by 2027',
    'Ultifi SDV platform: OTA software-defined features, in-vehicle AI, and connected services monetization',
    'AI/ML platform: build centralized enterprise AI infrastructure for AV training, simulation, and manufacturing analytics',
  ],
  dealObjective:
    'Expand NVIDIA\'s footprint at GM from the existing AV/ADAS (DRIVE + DGX) relationship into three new divisions: (1) Vehicle Engineering & Simulation via Omniverse for Ultium EV digital twins, (2) Manufacturing & Supply Chain via Omniverse for Ultium plant digital twins, and (3) IT Infrastructure via DGX AI platform consolidation.',
  segmentationStrategy: 'DIVISIONAL',
  segmentationRationale:
    'GM is organized around distinct engineering and technology divisions with separate budgets and buying groups. The NVIDIA opportunity maps to 5 divisions with distinct use cases and buyers: AV/ADAS (existing), Vehicle Engineering (Omniverse expansion), Manufacturing (Omniverse expansion), IT Infrastructure (DGX consolidation), and SDV/Connected Services (DRIVE in-vehicle AI).',
  researchData: {
    summary: 'GM is executing a major technology transformation across EV, AV, digital manufacturing, and SDV. Each initiative creates a distinct NVIDIA opportunity. The Cruise restructuring is a near-term catalyst — unified AV budget and compute strategy expected in H1 2026.',
    buyingGroups: [
      {
        name: 'Autonomous Driving & ADAS',
        status: 'Active Customer',
        keyContacts: ['VP Autonomous Vehicle Engineering', 'Director ADAS'],
        nvidiaProducts: ['NVIDIA DRIVE', 'NVIDIA DGX'],
        currentArr: '$3,700,000',
        expansionOpportunity: 'Thor migration + expanded DGX cluster',
      },
      {
        name: 'Vehicle Engineering & Simulation',
        status: 'Expansion Target',
        keyContacts: ['VP Vehicle Engineering', 'Director Simulation & Digital Twins'],
        nvidiaProducts: ['NVIDIA Omniverse'],
        expansionOpportunity: 'Omniverse for Ultium EV digital twins + GPU-accelerated CFD/CAE',
      },
      {
        name: 'Manufacturing & Supply Chain',
        status: 'Expansion Target',
        keyContacts: ['VP Manufacturing Technology', 'Director Digital Factory Operations'],
        nvidiaProducts: ['NVIDIA Omniverse'],
        expansionOpportunity: 'Omniverse for Ultium plant digital twins',
      },
      {
        name: 'IT Infrastructure & AI Platform',
        status: 'Research Phase',
        keyContacts: ['VP IT Infrastructure', 'Director AI/ML Platform Engineering'],
        nvidiaProducts: ['NVIDIA DGX'],
        expansionOpportunity: 'DGX AI platform consolidation — replace fragmented cloud GPU spend',
      },
      {
        name: 'Software-Defined Vehicle & Connected Services',
        status: 'Not Engaged',
        keyContacts: ['Director Vehicle Software Platform'],
        nvidiaProducts: ['NVIDIA DRIVE'],
        expansionOpportunity: 'DRIVE in-vehicle AI for Ultifi SDV platform',
      },
    ],
  },
};

async function seedGMCompanyAndDepartments(userId: string) {
  let company = await prisma.company.findFirst({
    where: {
      userId,
      OR: [
        { name: { equals: 'General Motors', mode: 'insensitive' } },
        { domain: { equals: 'gm.com', mode: 'insensitive' } },
      ],
    },
  });

  const companyData = {
    userId,
    name: 'General Motors',
    domain: 'gm.com',
    industry: 'Automotive',
    website: 'https://www.gm.com',
    size: '150,000+',
    employees: '~167,000',
    headquarters: 'Detroit, Michigan',
    revenue: '$171.8B (2024)',
    businessOverview: GM_RESEARCH_DATA.businessOverview,
    keyInitiatives: GM_RESEARCH_DATA.keyInitiatives as unknown as Prisma.InputJsonValue,
    dealObjective: GM_RESEARCH_DATA.dealObjective,
    segmentationStrategy: GM_RESEARCH_DATA.segmentationStrategy,
    segmentationRationale: GM_RESEARCH_DATA.segmentationRationale,
    researchData: GM_RESEARCH_DATA.researchData as unknown as Prisma.InputJsonValue,
    // workflowStep=3 marks the account as fully set up (research + buying groups + contacts done)
    workflowStep: 3,
    accountIntelligenceCompletedAt: new Date(),
  };

  if (!company) {
    company = await prisma.company.create({ data: companyData });
    console.log('Created company: General Motors');
  } else {
    // Update existing company with research data so setup shows as complete
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        businessOverview: companyData.businessOverview,
        keyInitiatives: companyData.keyInitiatives,
        dealObjective: companyData.dealObjective,
        segmentationStrategy: companyData.segmentationStrategy,
        segmentationRationale: companyData.segmentationRationale,
        researchData: companyData.researchData,
        workflowStep: 3,
        accountIntelligenceCompletedAt: new Date(),
        employees: companyData.employees,
        headquarters: companyData.headquarters,
        revenue: companyData.revenue,
        size: companyData.size,
      },
    });
    console.log('Updated existing company with research data:', company.name);
  }

  const deptMap: Record<string, string> = {};

  for (const div of GM_DIVISIONS) {
    let dept = await prisma.companyDepartment.findFirst({
      where: { companyId: company.id, type: div.type },
    });
    if (!dept) {
      dept = await prisma.companyDepartment.create({
        data: {
          companyId: company.id,
          type: div.type,
          customName: div.label,
          status: div.status,
          estimatedSize: div.estimatedSize,
          notes: div.notes,
          useCase: div.useCase,
          targetRoles: div.targetRoles as unknown as Prisma.InputJsonValue,
          estimatedOpportunity: div.estimatedOpportunity,
          valueProp: div.valueProp,
        },
      });
    } else {
      await prisma.companyDepartment.update({
        where: { id: dept.id },
        data: {
          customName: div.label,
          status: div.status,
          notes: div.notes,
          useCase: div.useCase,
          targetRoles: div.targetRoles as unknown as Prisma.InputJsonValue,
          estimatedOpportunity: div.estimatedOpportunity,
          valueProp: div.valueProp,
        },
      });
    }
    deptMap[div.type] = dept.id;
  }
  console.log('Ensured 5 GM divisions');
  return { company, deptMap };
}

// ─────────────────────────────────────────────
// Step 4 — Pre-Enriched GM Contacts (no Apollo)
// ─────────────────────────────────────────────
type ContactSeed = {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  deptType: DepartmentType;
  seniority: string;
  seniorityLevel: number;
  city: string;
  state: string;
  linkedinUrl: string;
  bio: string;
  engagementScore: number;
  isResponsive: boolean;
};

const GM_CONTACTS: ContactSeed[] = [
  // Vehicle Engineering & Simulation
  {
    firstName: 'Alex', lastName: 'Nguyen', email: 'alex.nguyen@gm.com',
    title: 'VP Vehicle Engineering', deptType: DepartmentType.ENGINEERING,
    seniority: 'VP', seniorityLevel: 4,
    city: 'Warren', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/alex-nguyen-gm',
    bio: '20+ years in automotive engineering. Led Ultium EV platform development. Previously Director of Powertrain Engineering at Ford. Michigan State BS, Stanford MS in Mechanical Engineering.',
    engagementScore: 45, isResponsive: false,
  },
  {
    firstName: 'Priya', lastName: 'Srinivasan', email: 'priya.srinivasan@gm.com',
    title: 'Director, Simulation & Digital Twins', deptType: DepartmentType.ENGINEERING,
    seniority: 'Director', seniorityLevel: 3,
    city: 'Warren', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/priya-srinivasan-gm',
    bio: '15 years in CAE/CFD and simulation. Leading GM\'s digital twin initiative for Ultium battery thermal and crash analysis. PhD Mechanical Engineering, University of Michigan.',
    engagementScore: 55, isResponsive: false,
  },
  {
    firstName: 'Robert', lastName: 'Chang', email: 'robert.chang@gm.com',
    title: 'Senior Manager, CFD & Thermal Analysis', deptType: DepartmentType.ENGINEERING,
    seniority: 'Senior Manager', seniorityLevel: 2,
    city: 'Warren', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/robert-chang-gm',
    bio: 'Specialist in GPU-accelerated CFD for battery thermal management. Evaluating Omniverse for EV simulation workflows. MS Aerospace Engineering, Georgia Tech.',
    engagementScore: 35, isResponsive: false,
  },

  // Autonomous Driving & ADAS
  {
    firstName: 'David', lastName: 'Richardson', email: 'david.richardson@gm.com',
    title: 'VP Autonomous Vehicle Engineering', deptType: DepartmentType.OPERATIONS,
    seniority: 'VP', seniorityLevel: 4,
    city: 'San Francisco', state: 'California',
    linkedinUrl: 'https://www.linkedin.com/in/david-richardson-gm',
    bio: 'Led Cruise AV compute strategy. 18 years in autonomous systems. Previously Principal Engineer at Waymo. MIT BS, Carnegie Mellon MS in Robotics.',
    engagementScore: 75, isResponsive: true,
  },
  {
    firstName: 'Maria', lastName: 'Lopez', email: 'maria.lopez@gm.com',
    title: 'Director, ADAS & Safety Systems', deptType: DepartmentType.OPERATIONS,
    seniority: 'Director', seniorityLevel: 3,
    city: 'Warren', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/maria-lopez-gm',
    bio: 'Leading Super Cruise and next-gen ADAS programs. Background in functional safety (ISO 26262). 12 years at GM across ADAS and chassis controls.',
    engagementScore: 65, isResponsive: true,
  },
  {
    firstName: 'James', lastName: 'Park', email: 'james.park@gm.com',
    title: 'Senior Manager, AV Compute Platform', deptType: DepartmentType.OPERATIONS,
    seniority: 'Senior Manager', seniorityLevel: 2,
    city: 'San Francisco', state: 'California',
    linkedinUrl: 'https://www.linkedin.com/in/james-park-gm',
    bio: 'Managing AV compute hardware selection and integration. Evaluating NVIDIA DRIVE Thor for next-gen centralized architecture. Previously at Tesla Autopilot HW team.',
    engagementScore: 60, isResponsive: true,
  },

  // Manufacturing & Supply Chain
  {
    firstName: 'Michael', lastName: 'Torres', email: 'michael.torres@gm.com',
    title: 'VP Manufacturing Technology', deptType: DepartmentType.OPERATIONS,
    seniority: 'VP', seniorityLevel: 4,
    city: 'Detroit', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/michael-torres-gm',
    bio: 'Overseeing GM\'s digital factory transformation. 22 years in automotive manufacturing. Led Ultium plant buildout in Spring Hill, TN. Purdue BS Industrial Engineering.',
    engagementScore: 40, isResponsive: false,
  },
  {
    firstName: 'Sarah', lastName: 'Kim', email: 'sarah.kim@gm.com',
    title: 'Director, Digital Factory Operations', deptType: DepartmentType.OPERATIONS,
    seniority: 'Director', seniorityLevel: 3,
    city: 'Spring Hill', state: 'Tennessee',
    linkedinUrl: 'https://www.linkedin.com/in/sarah-kim-gm',
    bio: 'Leading smart factory initiatives across Ultium battery plants. Interested in digital twin for factory layout and predictive maintenance. MS Industrial Engineering, Northwestern.',
    engagementScore: 35, isResponsive: false,
  },

  // IT Infrastructure & AI Platform
  {
    firstName: 'Mark', lastName: 'Haener', email: 'mark.haener@gm.com',
    title: 'VP IT Infrastructure', deptType: DepartmentType.IT_INFRASTRUCTURE,
    seniority: 'VP', seniorityLevel: 4,
    city: 'Austin', state: 'Texas',
    linkedinUrl: 'https://www.linkedin.com/in/mark-haener-gm',
    bio: 'Leading GM\'s enterprise AI infrastructure strategy. Evaluating DGX vs. cloud GPU options for centralized AI training. 20 years in enterprise IT, previously VP Infrastructure at Dell.',
    engagementScore: 50, isResponsive: false,
  },
  {
    firstName: 'Rachel', lastName: 'Chen', email: 'rachel.chen@gm.com',
    title: 'Director, AI/ML Platform Engineering', deptType: DepartmentType.IT_INFRASTRUCTURE,
    seniority: 'Director', seniorityLevel: 3,
    city: 'Austin', state: 'Texas',
    linkedinUrl: 'https://www.linkedin.com/in/rachel-chen-gm',
    bio: 'Building GM\'s centralized AI/ML platform serving AV, manufacturing, and enterprise teams. PhD Computer Science, UC Berkeley. Previously at Google Cloud AI.',
    engagementScore: 45, isResponsive: false,
  },
  {
    firstName: 'Thomas', lastName: 'Wright', email: 'thomas.wright@gm.com',
    title: 'Senior Manager, GPU Infrastructure', deptType: DepartmentType.IT_INFRASTRUCTURE,
    seniority: 'Senior Manager', seniorityLevel: 2,
    city: 'Austin', state: 'Texas',
    linkedinUrl: 'https://www.linkedin.com/in/thomas-wright-gm',
    bio: 'Managing GM\'s GPU cluster operations and procurement. Running benchmarks on DGX H100 systems. Previously at NVIDIA as Solutions Architect.',
    engagementScore: 55, isResponsive: false,
  },

  // New GM hire — General Manager of AV & ADAS (demo centerpiece signal)
  {
    firstName: 'Jordan', lastName: 'Lee', email: 'jordan.lee@gm.com',
    title: 'General Manager, Autonomous Vehicles & ADAS', deptType: DepartmentType.OPERATIONS,
    seniority: 'GM', seniorityLevel: 5,
    city: 'Detroit', state: 'Michigan',
    linkedinUrl: 'https://www.linkedin.com/in/jordan-lee-gm-av',
    bio: 'Newly appointed GM of AV & ADAS at General Motors, consolidating leadership after the Cruise restructuring. Previously SVP Autonomous Driving at Mobileye, where she led the SuperVision ADAS platform from prototype to mass production across 7 OEMs.',
    engagementScore: 0, isResponsive: false,
  },

  // Software-Defined Vehicle & Connected Services
  {
    firstName: 'Kevin', lastName: 'O\'Brien', email: 'kevin.obrien@gm.com',
    title: 'Director, Vehicle Software Platform', deptType: DepartmentType.CONNECTED_SERVICES,
    seniority: 'Director', seniorityLevel: 3,
    city: 'Mountain View', state: 'California',
    linkedinUrl: 'https://www.linkedin.com/in/kevin-obrien-gm',
    bio: 'Leading Ultifi SDV platform development. Background in embedded systems and OTA. 10 years at GM, previously at Apple Special Projects Group.',
    engagementScore: 25, isResponsive: false,
  },
];

async function seedContacts(companyId: string, deptMap: Record<string, string>) {
  const contactIdMap: Record<string, string> = {};

  for (const c of GM_CONTACTS) {
    const deptId = deptMap[c.deptType];
    const existing = await prisma.contact.findFirst({
      where: { companyId, email: c.email },
    });
    if (existing) {
      contactIdMap[c.email] = existing.id;
      continue;
    }
    const created = await prisma.contact.create({
      data: {
        companyId,
        companyDepartmentId: deptId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        title: c.title,
        seniority: c.seniority,
        seniorityLevel: c.seniorityLevel,
        city: c.city,
        state: c.state,
        country: 'United States',
        linkedinUrl: c.linkedinUrl,
        bio: c.bio,
        engagementScore: c.engagementScore,
        isResponsive: c.isResponsive,
        enrichmentStatus: 'complete',
        enrichedAt: new Date(),
        enrichedData: {
          source: 'seed',
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          seniority: c.seniority,
          city: c.city,
          state: c.state,
          country: 'United States',
          linkedinUrl: c.linkedinUrl,
          bio: c.bio,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    contactIdMap[c.email] = created.id;
  }
  console.log('Ensured', GM_CONTACTS.length, 'pre-enriched GM contacts');
  return contactIdMap;
}

// ─────────────────────────────────────────────
// Step 5 — ContentLibrary Items (NVIDIA Content)
// ─────────────────────────────────────────────
async function seedContentLibrary(userId: string) {
  const nvidiaProduct = await prisma.product.findFirst({
    where: { userId, name: 'NVIDIA DRIVE' },
    select: { id: true },
  });
  const omniverseProduct = await prisma.product.findFirst({
    where: { userId, name: 'NVIDIA Omniverse' },
    select: { id: true },
  });
  const dgxProduct = await prisma.product.findFirst({
    where: { userId, name: 'NVIDIA DGX' },
    select: { id: true },
  });

  type ContentSeed = {
    title: string;
    type: ContentType;
    content: object;
    industry?: string;
    department?: string;
    company?: string;
    persona?: string;
    productId?: string | null;
  };

  const contentItems: ContentSeed[] = [
    // CompanyEvent (4)
    {
      title: 'NVIDIA GTC 2026',
      type: ContentType.CompanyEvent,
      content: {
        eventDate: 'March 17–20, 2026',
        eventType: 'Conference',
        description: 'NVIDIA GTC 2026 — the premier AI conference. Keynotes from Jensen Huang, 900+ sessions on AI, autonomous vehicles, digital twins, and accelerated computing. Automotive track features AV development, in-vehicle AI, and factory simulation.',
        registrationUrl: 'https://www.nvidia.com/gtc/',
        targetAudience: ['Engineering', 'IT', 'Executive', 'Autonomous Vehicles', 'Manufacturing'],
        location: 'San Jose Convention Center, CA + Virtual',
        topics: ['AI', 'Autonomous Vehicles', 'Digital Twin', 'Accelerated Computing', 'Robotics'],
        primaryTopic: 'AI',
        speakers: ['Jensen Huang', 'Danny Shapiro', 'Rev Lebaredian'],
        industries: ['Automotive', 'Manufacturing', 'Technology', 'Healthcare'],
      },
      industry: 'Automotive',
      department: 'Engineering',
    },
    {
      title: 'NVIDIA Automotive Day at CES 2026',
      type: ContentType.CompanyEvent,
      content: {
        eventDate: 'January 7, 2026',
        eventType: 'Industry Event',
        description: 'Exclusive NVIDIA Automotive Day at CES 2026. Latest announcements on DRIVE Thor, in-vehicle AI, and autonomous driving partnerships with major OEMs. Hands-on demos of next-gen ADAS and cockpit AI.',
        registrationUrl: 'https://www.nvidia.com/automotive-ces/',
        targetAudience: ['Autonomous Vehicles', 'Engineering', 'Executive', 'Connected Services'],
        location: 'Las Vegas, NV',
        topics: ['Autonomous Vehicles', 'ADAS', 'DRIVE Thor', 'In-Vehicle AI', 'Software-Defined Vehicle'],
        primaryTopic: 'Autonomous Vehicles',
        industries: ['Automotive'],
      },
      industry: 'Automotive',
      department: 'Autonomous Vehicles',
    },
    {
      title: 'NVIDIA Omniverse Digital Twin Summit',
      type: ContentType.CompanyEvent,
      content: {
        eventDate: 'May 14–15, 2026',
        eventType: 'Workshop',
        description: 'Two-day hands-on summit on building industrial digital twins with NVIDIA Omniverse. Sessions on automotive factory simulation, OpenUSD workflows, and GPU-accelerated CFD/CAE. Includes guided lab building a digital twin of a battery assembly line.',
        registrationUrl: 'https://www.nvidia.com/omniverse-summit/',
        targetAudience: ['Manufacturing', 'Engineering', 'Industrial Design'],
        location: 'Santa Clara, CA + Virtual',
        topics: ['Digital Twin', 'Manufacturing', 'Simulation', 'OpenUSD', 'Battery Thermal'],
        primaryTopic: 'Manufacturing',
        industries: ['Automotive', 'Manufacturing'],
      },
      industry: 'Automotive',
      department: 'Manufacturing',
      productId: omniverseProduct?.id,
    },
    {
      title: 'NVIDIA AI Enterprise Workshop Series',
      type: ContentType.CompanyEvent,
      content: {
        eventDate: 'Quarterly (next: April 2026)',
        eventType: 'Workshop',
        description: 'Quarterly hands-on workshop series on deploying NVIDIA AI Enterprise and DGX infrastructure. Covers cluster setup, model training optimization, multi-tenant GPU sharing, and MLOps pipelines for automotive AI workloads.',
        registrationUrl: 'https://www.nvidia.com/ai-enterprise-workshops/',
        targetAudience: ['IT', 'Engineering', 'AI/ML'],
        location: 'Virtual',
        topics: ['AI Platform', 'DGX', 'MLOps', 'GPU Infrastructure', 'Training Optimization'],
        primaryTopic: 'AI Platform',
        industries: ['Automotive', 'Technology'],
      },
      industry: 'Automotive',
      department: 'IT',
      productId: dgxProduct?.id,
    },

    // SuccessStory (3)
    {
      title: 'BMW Group: Omniverse-Powered Digital Twins for Factory Planning',
      type: ContentType.SuccessStory,
      content: {
        headline: 'BMW Group: Omniverse-Powered Digital Twins for Factory Planning',
        oneLiner: 'BMW cut factory planning time by 30% using NVIDIA Omniverse digital twins.',
        fullSummary: 'BMW Group deployed NVIDIA Omniverse to create physically accurate digital twins of their manufacturing facilities worldwide. The platform connects engineering tools from Siemens, Dassault, and PTC into a single simulation environment. Results: 30% reduction in factory planning time, validated assembly line layouts before physical buildout, and real-time collaboration across 31 plants globally.',
        keyMetrics: [
          '30% reduction in factory planning time',
          '31 plants connected in a single digital twin environment',
          'Validated layouts before physical buildout — saving $50M+ in rework',
        ],
        whenToUse: 'Best for manufacturing and engineering leaders evaluating digital twin platforms. Especially relevant for EV plant buildout and factory modernization.',
        valueProp: 'Omniverse digital twins unify engineering tools and enable physically accurate factory simulation at global scale.',
      },
      industry: 'Automotive',
      department: 'Manufacturing',
      company: 'BMW Group',
      productId: omniverseProduct?.id,
    },
    {
      title: 'Mercedes-Benz: NVIDIA DRIVE for Next-Gen ADAS and Autonomous Driving',
      type: ContentType.SuccessStory,
      content: {
        headline: 'Mercedes-Benz: NVIDIA DRIVE for Next-Gen ADAS',
        oneLiner: 'Mercedes-Benz partnered with NVIDIA to deploy DRIVE Orin across its fleet for L2+/L3 ADAS.',
        fullSummary: 'Mercedes-Benz selected NVIDIA DRIVE Orin as the compute platform for its next-generation ADAS and autonomous driving systems. The partnership covers the full stack: centralized compute, DRIVE Sim for validation, and DGX infrastructure for perception model training. Mercedes shipped L3 highway driving (DRIVE PILOT) using the NVIDIA platform — a global first for a production OEM.',
        keyMetrics: [
          'First OEM to ship SAE Level 3 highway driving in production',
          'DRIVE Orin deployed across multiple model lines',
          '10x simulation coverage vs. physical testing alone',
        ],
        whenToUse: 'Best for AV/ADAS leaders evaluating compute platforms. Demonstrates production-validated L3 deployment on NVIDIA DRIVE.',
        valueProp: 'NVIDIA DRIVE enabled the world\'s first production L3 system — proving the platform from simulation to deployment.',
      },
      industry: 'Automotive',
      department: 'Autonomous Vehicles',
      company: 'Mercedes-Benz',
      productId: nvidiaProduct?.id,
    },
    {
      title: 'Toyota: DGX-Powered AI Training for Autonomous Driving Research',
      type: ContentType.SuccessStory,
      content: {
        headline: 'Toyota: DGX-Powered AI Training',
        oneLiner: 'Toyota Research Institute uses NVIDIA DGX to train AV perception models 5x faster.',
        fullSummary: 'Toyota Research Institute (TRI) deployed NVIDIA DGX SuperPOD to accelerate perception model training for its autonomous driving programs. The dedicated AI infrastructure replaced cloud GPU instances, delivering 5x faster training throughput at 40% lower per-job cost. TRI also uses the same DGX cluster for robotics and generative AI research, consolidating workloads on a single platform.',
        keyMetrics: [
          '5x faster perception model training vs. cloud GPU',
          '40% lower per-job cost with dedicated DGX infrastructure',
          'Single platform for AV, robotics, and generative AI workloads',
        ],
        whenToUse: 'Best for IT and engineering leaders evaluating AI infrastructure. Shows dedicated DGX vs. cloud GPU economics for automotive AI.',
        valueProp: 'DGX SuperPOD consolidates automotive AI workloads — AV training, simulation, and enterprise AI — on one platform.',
      },
      industry: 'Automotive',
      department: 'IT',
      company: 'Toyota',
      productId: dgxProduct?.id,
    },

    {
      title: 'Continental: NVIDIA DRIVE Platform for Scalable ADAS Deployment',
      type: ContentType.SuccessStory,
      content: {
        headline: 'Continental: NVIDIA DRIVE for Tier 1 ADAS at Scale',
        oneLiner: 'Continental selected NVIDIA DRIVE Orin and Thor for a joint ADAS platform serving European and US OEMs.',
        fullSummary: 'Continental partnered with NVIDIA to build a full-stack ADAS platform leveraging DRIVE Orin and DRIVE Thor. Continental provides system integration, sensor fusion, and safety certification while NVIDIA provides the centralized compute and software stack. The joint platform targets L2+ through L4 across multiple OEM customers, validating the NVIDIA DRIVE ecosystem for Tier 1 deployment at scale.',
        keyMetrics: [
          'Joint ADAS platform covering L2+ through L4 capability',
          'Multi-OEM deployment across European and US manufacturers',
          'Full Tier 1 integration: sensors, safety certification, OTA updates',
        ],
        whenToUse: 'Best for ADAS/AV leaders evaluating compute platforms — demonstrates Tier 1 ecosystem maturity and multi-OEM validation of NVIDIA DRIVE.',
        valueProp: 'Continental\'s adoption proves NVIDIA DRIVE is production-ready with full Tier 1 integration — reducing deployment risk for OEMs.',
      },
      industry: 'Automotive',
      department: 'Autonomous Vehicles',
      company: 'Continental',
      productId: nvidiaProduct?.id,
    },

    // UseCase (2)
    {
      title: 'GPU-Accelerated CFD/CAE for EV Battery Thermal Analysis',
      type: ContentType.UseCase,
      content: {
        headline: 'GPU-Accelerated CFD/CAE for EV Battery Thermal Analysis',
        description: 'Automotive OEMs are moving battery thermal simulation from CPU clusters to GPU-accelerated workflows using NVIDIA Omniverse and cuNumeric. This enables running full-vehicle thermal models in hours instead of days, critical for Ultium-class battery pack development.',
        applicableDepartments: ['Engineering', 'Manufacturing'],
        applicableProducts: ['NVIDIA Omniverse', 'NVIDIA DGX'],
        benefits: [
          'Run full-vehicle thermal models in 4 hours vs. 3 days on CPU',
          'Simulate thousands of battery cell configurations in parallel',
          'Catch thermal runaway scenarios earlier in design cycle',
        ],
        implementationSteps: [
          'Connect existing CAE tools (ANSYS, Siemens STAR-CCM+) to Omniverse via USD connectors',
          'Deploy GPU-accelerated solvers on DGX or Omniverse Cloud',
          'Build parameterized battery pack models for automated design exploration',
          'Integrate results into digital twin for continuous validation',
        ],
      },
      industry: 'Automotive',
      department: 'Engineering',
      productId: omniverseProduct?.id,
    },
    {
      title: 'End-to-End AV Development with NVIDIA DRIVE Sim',
      type: ContentType.UseCase,
      content: {
        headline: 'End-to-End AV Development with NVIDIA DRIVE Sim',
        description: 'DRIVE Sim provides a physically accurate, cloud-scalable simulation platform for developing and validating autonomous vehicles from L2+ ADAS to L4 robotaxis. OEMs can generate billions of synthetic driving miles, validate perception and planning algorithms, and test edge cases that are impossible to encounter in real-world driving.',
        applicableDepartments: ['Autonomous Vehicles', 'Engineering'],
        applicableProducts: ['NVIDIA DRIVE', 'NVIDIA DGX'],
        benefits: [
          '10x more simulation coverage than physical testing alone',
          'Test 10,000+ edge case scenarios including rare safety-critical events',
          'Reduce physical test fleet costs by up to 90%',
          'Seamless deployment from simulation to DRIVE Thor in-vehicle compute',
        ],
        implementationSteps: [
          'Ingest HD map and sensor data into DRIVE Sim environment',
          'Build scenario libraries from real-world driving logs + synthetic generation',
          'Run large-scale validation on DGX clusters (billions of miles per month)',
          'Deploy validated models to DRIVE Thor in-vehicle compute',
        ],
      },
      industry: 'Automotive',
      department: 'Autonomous Vehicles',
      productId: nvidiaProduct?.id,
    },

    // FeatureRelease (2)
    {
      title: 'NVIDIA DRIVE Thor: Next-Gen Centralized Car Computer',
      type: ContentType.FeatureRelease,
      content: {
        headline: 'NVIDIA DRIVE Thor: Next-Gen Centralized Car Computer',
        description: 'DRIVE Thor is NVIDIA\'s next-generation centralized car computer delivering 2,000 TFLOPS of AI performance. It consolidates ADAS, AV, infotainment, and parking into a single SoC — replacing 3-5 separate ECUs. DRIVE Thor samples in 2025 with OEM production vehicles expected in 2026-2027 model years.',
        releaseDate: 'Production: 2026–2027 MY',
        keyCapabilities: [
          '2,000 TFLOPS AI performance on a single chip',
          'Consolidates ADAS, AV, infotainment, and parking ECUs',
          'Transformer engine for multi-modal AI (vision + lidar + radar fusion)',
          'Software-defined vehicle architecture with OTA updates',
        ],
        relevantDepartments: ['Autonomous Vehicles', 'Connected Services', 'Engineering'],
        migrationPath: 'Upgrade from DRIVE Orin (254 TFLOPS) to Thor (2,000 TFLOPS) with backward-compatible software stack.',
      },
      industry: 'Automotive',
      department: 'Autonomous Vehicles',
      productId: nvidiaProduct?.id,
    },
    {
      title: 'Omniverse Cloud: Scalable Digital Twin Simulation',
      type: ContentType.FeatureRelease,
      content: {
        headline: 'Omniverse Cloud: Scalable Digital Twin Simulation',
        description: 'NVIDIA Omniverse Cloud brings GPU-accelerated digital twin simulation to the cloud. Engineering and manufacturing teams can run large-scale factory simulations, vehicle design reviews, and CFD/CAE workloads without deploying on-prem GPU infrastructure. Available on AWS, Azure, and Oracle Cloud with enterprise security and SSO.',
        releaseDate: 'GA Q1 2026',
        keyCapabilities: [
          'Browser-based access to full Omniverse platform — no local GPU needed',
          'Auto-scaling GPU compute for burst simulation workloads',
          'Enterprise security: SSO, encryption, SOC 2 Type II',
          'Pre-built connectors for Siemens, Dassault, ANSYS, PTC',
        ],
        relevantDepartments: ['Engineering', 'Manufacturing', 'Industrial Design'],
        migrationPath: 'Existing Omniverse Enterprise customers can migrate workloads to Cloud with no scene changes — same OpenUSD format.',
      },
      industry: 'Automotive',
      department: 'Engineering',
      productId: omniverseProduct?.id,
    },
  ];

  for (const item of contentItems) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: item.title, type: item.type },
    });
    if (existing) continue;

    await prisma.contentLibrary.create({
      data: {
        userId,
        productId: item.productId ?? null,
        title: item.title,
        type: item.type,
        content: item.content as unknown as Prisma.InputJsonValue,
        industry: item.industry ?? null,
        department: item.department ?? null,
        company: item.company ?? null,
        persona: item.persona ?? null,
        isActive: true,
      },
    });
  }
  console.log('Ensured', contentItems.length, 'ContentLibrary items (events, stories, use cases, releases)');
}

// ─────────────────────────────────────────────
// Step 6 — Signals (GM only; NVIDIA news surfaces via company triggers)
// ─────────────────────────────────────────────
async function seedSignals(companyId: string, userId: string) {
  // Always delete and recreate so signals reset to status='new' with fresh timestamps
  const existingCount = await prisma.accountSignal.count({ where: { companyId, userId } });
  if (existingCount > 0) {
    await prisma.accountSignal.deleteMany({ where: { companyId, userId } });
    console.log('Cleared', existingCount, 'stale signals for fresh re-seed');
  }

  const signals: Array<{
    type: string;
    title: string;
    summary: string;
    url: string;
    publishedAt: Date;
    relevanceScore: number;
    suggestedPlay?: string;
  }> = [
    // Signal 1: Demo centerpiece — new GM of AV/ADAS
    {
      type: 'executive_hire',
      title: 'New General Manager of Autonomous Vehicles & ADAS at General Motors',
      summary: 'GM has appointed Jordan Lee as General Manager of AV & ADAS, consolidating leadership following the Cruise restructuring. Previously SVP Autonomous Driving at Mobileye where she led SuperVision ADAS to production across 7 OEMs. Expected to rebuild the AV compute strategy.',
      url: 'https://www.linkedin.com/posts/general-motors/jordan-lee-gm-av-adas',
      publishedAt: hoursAgo(1),
      relevanceScore: 10,
    },
    // Signal 2: Cruise restructuring — org change
    {
      type: 'industry_news',
      title: 'GM Cruise restructuring: autonomous driving R&D consolidated under GM corporate',
      summary: 'GM is consolidating Cruise\'s AV R&D into GM\'s corporate autonomous vehicle engineering group. New unified team will manage both L4 robotaxi and L2+/L3 ADAS programs. Budget and headcount expected to increase.',
      url: 'https://www.reuters.com/gm-cruise-restructuring-2026',
      publishedAt: hoursAgo(6),
      relevanceScore: 9,
    },
    // Signal 3: Q4 earnings — investment signal
    {
      type: 'earnings_call',
      title: 'GM Q4 earnings: $2B AV investment and accelerated digital factory roadmap',
      summary: 'GM CEO Mary Barra highlighted autonomous driving and digital manufacturing as top-3 corporate priorities. Announced $2B incremental investment in AV technology and committed to digitizing all Ultium plants by 2027.',
      url: 'https://investor.gm.com/earnings/q4-2025',
      publishedAt: hoursAgo(12),
      relevanceScore: 9,
    },
  ];

  for (const s of signals) {
    await prisma.accountSignal.create({
      data: {
        companyId,
        userId,
        type: s.type,
        title: s.title,
        summary: s.summary,
        url: s.url,
        publishedAt: s.publishedAt,
        relevanceScore: s.relevanceScore,
        suggestedPlay: s.suggestedPlay ?? null,
        status: 'new',
      },
    });
  }
  console.log('Created', signals.length, 'GM AccountSignals, all with status=new');
}

// ─────────────────────────────────────────────
// Step 7 — EventAttendance Records
// ─────────────────────────────────────────────
async function seedEventAttendance(companyId: string) {
  const contacts = await prisma.contact.findMany({
    where: { companyId },
    select: { id: true, email: true, title: true },
  });

  const eventSeeds: Array<{
    contactEmail: string;
    eventName: string;
    eventDate: Date;
    source: string;
    rsvpStatus: string;
  }> = [
    // GTC 2026 — mix of registered and invited for a realistic coverage view
    { contactEmail: 'david.richardson@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'registered' },
    { contactEmail: 'james.park@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'registered' },
    { contactEmail: 'rachel.chen@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'registered' },
    { contactEmail: 'alex.nguyen@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'invited' },
    { contactEmail: 'priya.srinivasan@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'invited' },
    { contactEmail: 'mark.haener@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'invited' },
    { contactEmail: 'michael.torres@gm.com', eventName: 'NVIDIA GTC 2026', eventDate: new Date('2026-03-17'), source: 'import', rsvpStatus: 'invited' },
    // CES 2026 — past event, attended
    { contactEmail: 'maria.lopez@gm.com', eventName: 'NVIDIA Automotive Day at CES 2026', eventDate: new Date('2026-01-07'), source: 'import', rsvpStatus: 'attended' },
    { contactEmail: 'david.richardson@gm.com', eventName: 'NVIDIA Automotive Day at CES 2026', eventDate: new Date('2026-01-07'), source: 'import', rsvpStatus: 'attended' },
    // Omniverse DT Summit — future event, registered
    { contactEmail: 'priya.srinivasan@gm.com', eventName: 'NVIDIA Omniverse Digital Twin Summit', eventDate: new Date('2026-05-14'), source: 'import', rsvpStatus: 'registered' },
    { contactEmail: 'sarah.kim@gm.com', eventName: 'NVIDIA Omniverse Digital Twin Summit', eventDate: new Date('2026-05-14'), source: 'import', rsvpStatus: 'registered' },
  ];

  let created = 0;
  for (const ev of eventSeeds) {
    const contact = contacts.find((c) => c.email === ev.contactEmail);
    if (!contact) continue;

    const existing = await prisma.eventAttendance.findUnique({
      where: { contactId_eventName: { contactId: contact.id, eventName: ev.eventName } },
    });
    if (existing) continue;

    await prisma.eventAttendance.create({
      data: {
        contactId: contact.id,
        eventName: ev.eventName,
        eventDate: ev.eventDate,
        source: ev.source,
        rsvpStatus: ev.rsvpStatus,
      },
    });
    created++;
  }
  console.log('Created', created, 'EventAttendance records');
}

// ─────────────────────────────────────────────
// Step 8 — CompanyProduct Matrix
// ─────────────────────────────────────────────
async function seedProductMatrix(companyId: string, userId: string, deptMap: Record<string, string>, catalogIds: Record<string, string>) {
  type MatrixEntry = {
    deptType: DepartmentType;
    productSlug: string;
    status: ProductOwnershipStatus;
    arr?: number;
    fitScore?: number;
    opportunitySize?: number;
  };

  const matrix: MatrixEntry[] = [
    // Engineering
    { deptType: DepartmentType.ENGINEERING, productSlug: 'nvidia-drive', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 80, opportunitySize: 1_500_000 },
    { deptType: DepartmentType.ENGINEERING, productSlug: 'nvidia-omniverse', status: ProductOwnershipStatus.ACTIVE, arr: 350_000, fitScore: 92 },
    { deptType: DepartmentType.ENGINEERING, productSlug: 'nvidia-dgx', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 75, opportunitySize: 800_000 },

    // Autonomous Vehicles
    { deptType: DepartmentType.OPERATIONS, productSlug: 'nvidia-drive', status: ProductOwnershipStatus.ACTIVE, arr: 2_500_000, fitScore: 95 },
    { deptType: DepartmentType.OPERATIONS, productSlug: 'nvidia-omniverse', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 85, opportunitySize: 500_000 },
    { deptType: DepartmentType.OPERATIONS, productSlug: 'nvidia-dgx', status: ProductOwnershipStatus.ACTIVE, arr: 1_200_000, fitScore: 90 },

    // Manufacturing
    { deptType: DepartmentType.OPERATIONS, productSlug: 'nvidia-omniverse', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 88, opportunitySize: 1_000_000 },
    { deptType: DepartmentType.OPERATIONS, productSlug: 'nvidia-dgx', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 70, opportunitySize: 400_000 },

    // IT/Data Center
    { deptType: DepartmentType.IT_INFRASTRUCTURE, productSlug: 'nvidia-dgx', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 93, opportunitySize: 5_000_000 },

    // Connected Services
    { deptType: DepartmentType.CONNECTED_SERVICES, productSlug: 'nvidia-drive', status: ProductOwnershipStatus.OPPORTUNITY, fitScore: 75, opportunitySize: 800_000 },
  ];

  for (const entry of matrix) {
    const deptId = deptMap[entry.deptType];
    const productId = catalogIds[entry.productSlug];
    if (!deptId || !productId) continue;

    await prisma.companyProduct.upsert({
      where: {
        companyId_companyDepartmentId_productId: { companyId, companyDepartmentId: deptId, productId },
      },
      create: {
        companyId,
        companyDepartmentId: deptId,
        productId,
        status: entry.status,
        arr: entry.arr ?? null,
        fitScore: entry.fitScore ?? null,
        opportunitySize: entry.opportunitySize ?? null,
      },
      update: {
        status: entry.status,
        arr: entry.arr ?? undefined,
        fitScore: entry.fitScore ?? undefined,
        opportunitySize: entry.opportunitySize ?? undefined,
      },
    });
  }
  console.log('Ensured', matrix.length, 'CompanyProduct rows');
}

// ─────────────────────────────────────────────
// Step 9 — Adaptive Roadmap + Plans
// ─────────────────────────────────────────────
async function seedRoadmapAndPlans(companyId: string, userId: string, deptMap: Record<string, string>, contactIdMap: Record<string, string>) {
  // Roadmap
  let roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
  });
  if (!roadmap) {
    roadmap = await prisma.adaptiveRoadmap.create({
      data: {
        userId,
        companyId,
        roadmapType: 'enterprise_expansion',
        objective: {
          goalText: 'Expand NVIDIA footprint at General Motors from AV (DRIVE/DGX) into Vehicle Engineering (Omniverse), Manufacturing (Omniverse/DGX), and IT Infrastructure (DGX).',
          metric: { type: 'new_divisional_use_cases', targetCount: 3, timeHorizon: '12_months' },
          accountContext: { primaryAccount: 'General Motors', divisions: ['Vehicle Engineering', 'Autonomous Vehicles', 'Manufacturing', 'IT Infrastructure', 'Connected Services'] },
        },
        contentStrategy: {
          tone: 'executive_consultative_technical',
          primaryChannels: ['executive_email', 'division_briefing', 'event_invite', 'sales_page'],
          contentTypes: ['division_specific_sales_page', 'executive_briefing', 'use_case_comparison', 'event_invite'],
        },
      },
    });
    console.log('Created AdaptiveRoadmap (enterprise_expansion)');
  }

  // Company-level target
  let gmTarget = await prisma.roadmapTarget.findFirst({
    where: { roadmapId: roadmap.id, companyId, targetType: 'company' },
  });
  if (!gmTarget) {
    gmTarget = await prisma.roadmapTarget.create({
      data: {
        roadmapId: roadmap.id,
        targetType: 'company',
        name: 'General Motors',
        companyId,
        stage: 'Expanding',
      },
    });
  }

  // Division targets + RoadmapContacts
  for (const div of GM_DIVISIONS) {
    const deptId = deptMap[div.type];
    let target = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id, parentTargetId: gmTarget.id, companyDepartmentId: deptId, targetType: 'division' },
    });
    if (!target) {
      target = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'division',
          name: div.label,
          parentTargetId: gmTarget.id,
          companyId,
          companyDepartmentId: deptId,
          stage: div.status === DepartmentStatus.ACTIVE_CUSTOMER ? 'Active Program' :
                 div.status === DepartmentStatus.EXPANSION_TARGET ? 'Expansion Target' :
                 div.status === DepartmentStatus.RESEARCH_PHASE ? 'Research Phase' : 'Not Engaged',
        },
      });
    }

    // RoadmapContacts for this division
    const divContacts = GM_CONTACTS.filter((c) => c.deptType === div.type);
    for (let i = 0; i < divContacts.length; i++) {
      const cId = contactIdMap[divContacts[i].email];
      if (!cId) continue;

      const existing = await prisma.roadmapContact.findFirst({
        where: { targetId: target.id, contactId: cId },
      });
      if (existing) continue;

      await prisma.roadmapContact.create({
        data: {
          targetId: target.id,
          contactId: cId,
          personaRole: i === 0 ? 'Division Economic Buyer' : 'Division Stakeholder',
          connectionStatus: div.status === DepartmentStatus.ACTIVE_CUSTOMER && i < 2 ? 'engaged' : 'identified',
          relationshipStage: div.status === DepartmentStatus.ACTIVE_CUSTOMER && i < 2 ? 'engaged' : 'unknown',
        },
      });
    }
  }
  console.log('Ensured roadmap targets and contacts for 5 divisions');

  // Conditions
  const existingConditions = await prisma.roadmapCondition.count({ where: { roadmapId: roadmap.id } });
  if (existingConditions === 0) {
    await prisma.roadmapCondition.createMany({
      data: [
        { roadmapId: roadmap.id, type: 'event_window', config: { description: 'Prioritize accounts in a GTC or automotive event window', defaultDays: 30 }, isActive: true },
        { roadmapId: roadmap.id, type: 'product_launch', config: { description: 'Boost actions when NVIDIA has a relevant product launch (DRIVE Thor, Omniverse Cloud)', appliesTo: ['generate_email', 'generate_page'] }, isActive: true },
        { roadmapId: roadmap.id, type: 'engagement_threshold', config: { description: 'Only suggest high-autonomy actions when contact engagement is above threshold', minTouchpoints: 2 }, isActive: true },
      ],
    });
  }
  console.log('Ensured roadmap targets, contacts, and conditions');
}

// ─────────────────────────────────────────────
// Step 10 — Activities + Demo Lock
// ─────────────────────────────────────────────
async function seedActivitiesAndDemoLock(companyId: string, userId: string, deptMap: Record<string, string>, contactIdMap: Record<string, string>) {
  // Demo lock
  await prisma.company.update({
    where: { id: companyId },
    data: {
      isDemoAccount: true,
      demoVertical: 'semiconductor',
      demoLockedAt: new Date(),
      demoNote: `NVIDIA/GM semiconductor demo — built ${new Date().toISOString().slice(0, 10)} — contacts: ${GM_CONTACTS.length}, divisions: ${GM_DIVISIONS.length}`,
    },
  });
  console.log('Set isDemoAccount=true on General Motors');

  const existingActivities = await prisma.activity.count({ where: { companyId, userId } });
  if (existingActivities >= 5) {
    console.log('Company already has', existingActivities, 'activities; skipping.');
    return;
  }

  const engDeptId = deptMap[DepartmentType.ENGINEERING] ?? null;
  const avDeptId = deptMap[DepartmentType.OPERATIONS] ?? null;
  const mfgDeptId = deptMap[DepartmentType.OPERATIONS] ?? null;
  const itDeptId = deptMap[DepartmentType.IT_INFRASTRUCTURE] ?? null;

  const activities = [
    { type: 'Research', summary: 'Account research completed for General Motors — 5 divisions mapped', createdAt: daysAgo(14), companyDepartmentId: null as string | null, contactId: null as string | null },
    { type: 'Contact Added', summary: 'Contacts added to Autonomous Driving & ADAS buying group', createdAt: daysAgo(12), companyDepartmentId: avDeptId },
    { type: 'Contact Added', summary: 'Contacts added to Vehicle Engineering & Simulation buying group', createdAt: daysAgo(11), companyDepartmentId: engDeptId },
    { type: 'EMAIL_SENT', summary: 'Executive briefing sent to VP Autonomous Vehicle Engineering', createdAt: daysAgo(7), companyDepartmentId: avDeptId, contactId: contactIdMap['david.richardson@gm.com'] ?? null },
    { type: 'MEETING_SCHEDULED', summary: 'Discovery call scheduled with AV Compute Platform team', createdAt: daysAgo(5), companyDepartmentId: avDeptId, contactId: contactIdMap['james.park@gm.com'] ?? null },
    { type: 'EMAIL_SENT', summary: 'Omniverse demo invite sent to Simulation & Digital Twins team', createdAt: daysAgo(3), companyDepartmentId: engDeptId, contactId: contactIdMap['priya.srinivasan@gm.com'] ?? null },
    { type: 'Landing Page Visit', summary: 'VP IT Infrastructure visited NVIDIA solutions page', createdAt: daysAgo(2), companyDepartmentId: itDeptId },
    { type: 'Research', summary: 'Manufacturing & Supply Chain buying group research completed', createdAt: daysAgo(1), companyDepartmentId: mfgDeptId },
  ];

  for (const a of activities) {
    await prisma.activity.create({
      data: {
        companyId,
        userId,
        type: a.type,
        summary: a.summary,
        createdAt: a.createdAt,
        companyDepartmentId: a.companyDepartmentId ?? undefined,
        contactId: a.contactId ?? undefined,
      },
    });
  }
  console.log('Created', activities.length, 'Activity rows');
}

// ─────────────────────────────────────────────
// Step 11 — Personas
// ─────────────────────────────────────────────
async function seedPersonas() {
  const personas = [
    {
      name: 'AV Engineering Leader',
      description: 'VP/Director-level autonomous vehicle and ADAS engineering leadership at automotive OEMs.',
      includeTitles: ['VP Autonomous', 'VP AV', 'Director ADAS', 'Director Autonomous', 'Head of AV', 'Chief Engineer AV'],
      excludeTitles: ['Intern', 'Coordinator'],
      primaryDepartment: DepartmentType.OPERATIONS,
      secondaryDepartments: [DepartmentType.ENGINEERING, DepartmentType.CONNECTED_SERVICES],
      painPoints: [
        'Simulation scale insufficient for safety-critical validation',
        'Fragmented AV toolchain across perception, simulation, and deployment',
        'High cost and slow cycle time of physical test fleets',
        'Recruiting and retaining top AV engineering talent',
      ],
      successMetrics: ['Miles of simulation coverage', 'Safety validation pass rate', 'Time-to-deployment for new ADAS features', 'Cost per simulated mile'],
      contentTypes: ['UseCase', 'SuccessStory', 'FeatureRelease'],
      messagingTone: 'technical_consultative',
      preferredChannels: ['email', 'event_invite', 'linkedin'],
    },
    {
      name: 'Manufacturing Technology Leader',
      description: 'VP/Director-level manufacturing and digital factory leadership at automotive OEMs.',
      includeTitles: ['VP Manufacturing', 'Director Manufacturing', 'Director Digital Factory', 'Director Smart Factory', 'Head of Manufacturing Technology'],
      excludeTitles: ['Intern', 'Line Supervisor'],
      primaryDepartment: DepartmentType.OPERATIONS,
      secondaryDepartments: [DepartmentType.SUPPLY_CHAIN, DepartmentType.ENGINEERING],
      painPoints: [
        'Costly physical prototyping and factory layout changes',
        'Quality control gaps in high-volume EV battery production',
        'Inability to simulate full factory operations digitally',
        'Slow adoption of AI/ML for predictive maintenance',
      ],
      successMetrics: ['Factory planning time reduction', 'Defect rate reduction', 'Production line uptime', 'Time-to-launch for new plant'],
      contentTypes: ['SuccessStory', 'UseCase', 'CompanyEvent'],
      messagingTone: 'business',
      preferredChannels: ['email', 'event_invite'],
    },
    {
      name: 'IT Infrastructure Leader',
      description: 'VP/Director-level IT infrastructure and AI platform leadership at large enterprises.',
      includeTitles: ['VP IT', 'Director AI Platform', 'Director Data Center', 'Director Infrastructure', 'Head of AI/ML Platform', 'CTO'],
      excludeTitles: ['Intern', 'Help Desk'],
      primaryDepartment: DepartmentType.IT_INFRASTRUCTURE,
      secondaryDepartments: [DepartmentType.ENGINEERING],
      painPoints: [
        'Cloud GPU costs escalating for large-scale AI training',
        'Separate infrastructure silos for AV, manufacturing, and enterprise AI',
        'Difficulty right-sizing GPU compute for burst training workloads',
        'Security and compliance requirements for AI infrastructure',
      ],
      successMetrics: ['Cost per AI training job', 'GPU utilization rate', 'Time-to-provision for new AI workloads', 'Infrastructure consolidation ratio'],
      contentTypes: ['SuccessStory', 'UseCase', 'FeatureRelease'],
      messagingTone: 'business',
      preferredChannels: ['email', 'event_invite'],
    },
    {
      name: 'Vehicle Software Leader',
      description: 'Director+ level software-defined vehicle and connected services leadership at automotive OEMs.',
      includeTitles: ['VP Vehicle Software', 'Director Vehicle Software', 'Director Connected Services', 'Director SDV', 'Head of OTA', 'Director In-Vehicle AI'],
      excludeTitles: ['Intern'],
      primaryDepartment: DepartmentType.CONNECTED_SERVICES,
      secondaryDepartments: [DepartmentType.ENGINEERING, DepartmentType.OPERATIONS],
      painPoints: [
        'Building a competitive SDV platform from scratch vs. leveraging partners',
        'OTA update reliability and feature delivery cadence',
        'In-vehicle compute power limitations for next-gen AI features',
        'Balancing proprietary software control with platform partnerships',
      ],
      successMetrics: ['OTA feature delivery cadence', 'In-vehicle AI performance', 'Connected services attach rate', 'Platform development timeline'],
      contentTypes: ['FeatureRelease', 'UseCase'],
      messagingTone: 'technical_consultative',
      preferredChannels: ['email', 'linkedin'],
    },
  ];

  for (const p of personas) {
    const existing = await prisma.persona.findFirst({ where: { name: p.name } });
    if (existing) continue;

    await prisma.persona.create({
      data: {
        name: p.name,
        description: p.description,
        includeTitles: p.includeTitles,
        excludeTitles: p.excludeTitles,
        primaryDepartment: p.primaryDepartment,
        secondaryDepartments: p.secondaryDepartments,
        painPoints: p.painPoints,
        successMetrics: p.successMetrics,
        contentTypes: p.contentTypes,
        messagingTone: p.messagingTone,
        preferredChannels: p.preferredChannels,
      },
    });
  }
  console.log('Ensured 4 Persona records');
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('=== NVIDIA → GM Demo Seed ===\n');

  // Step 1: User & Seller Setup
  const user = await seedSellerSetup();

  // Step 2: NVIDIA Catalog Products
  const catalogIds = await seedCatalogProducts(user.id);

  // Step 3: GM Company + Departments
  const { company, deptMap } = await seedGMCompanyAndDepartments(user.id);

  // Step 4: Pre-enriched Contacts
  const contactIdMap = await seedContacts(company.id, deptMap);

  // Step 5: ContentLibrary
  await seedContentLibrary(user.id);

  // Step 5b: Clean slate — delete ALL existing ActionWorkflows for this account
  const deletedWorkflows = await prisma.actionWorkflow.deleteMany({
    where: { userId: user.id, companyId: company.id },
  });
  if (deletedWorkflows.count > 0) {
    console.log('Deleted', deletedWorkflows.count, 'existing workflows (clean slate)');
  }

  // Step 6: Signals
  await seedSignals(company.id, user.id);

  // Step 7: EventAttendance
  await seedEventAttendance(company.id);

  // Step 8: CompanyProduct Matrix
  await seedProductMatrix(company.id, user.id, deptMap, catalogIds);

  // Step 9: Adaptive Roadmap + Plans
  await seedRoadmapAndPlans(company.id, user.id, deptMap, contactIdMap);

  // Step 10: Activities + Demo Lock
  await seedActivitiesAndDemoLock(company.id, user.id, deptMap, contactIdMap);

  // Step 11: Personas
  await seedPersonas();

  // Step 12: Demo Playbook Templates (5 built-in plays)
  console.log('\nStep 12: Seeding demo playbook templates…');
  await seedDemoPlaybookTemplates(prisma as unknown as PrismaClient, user.id);

  // Step 13: Sales Map Templates (4 built-in templates for plan generation)
  console.log('\nStep 13: Seeding Sales Map templates…');
  await seedDefaultSalesMapTemplates();

  // Step 14: Update PlaybookTemplate targeting fields + create PlaybookActivations for GM
  console.log('\nStep 14: Updating playbook targeting fields and creating activations…');
  await seedPlaybookTargetingAndActivations(user.id, company.id);

  // Step 15: Signal-Response Playbook Templates (56 across 7 categories)
  console.log('\nStep 15: Seeding signal-response playbook templates (56)…');
  await seedSignalPlaybooks(prisma as unknown as PrismaClient, user.id);

  // Step 16: Proactive Play Templates (50 across 6 groups)
  console.log('\nStep 16: Seeding proactive playbook templates (50)…');
  await seedProactivePlaybooks(prisma as unknown as PrismaClient, user.id);

  // Step 17: Create expanded signal rules + action mappings + activations for GM
  console.log('\nStep 17: Creating expanded signal rules and activations for GM…');
  await seedExpandedSignalRulesAndActivations(user.id, company.id);

  // Step 18: Create 1 in-progress workflow to show on My Day
  console.log('\nStep 18: Seeding 1 in-progress workflow…');
  await seedInProgressWorkflow(user.id, company.id, deptMap, contactIdMap);

  console.log('\n=== Done ===');
  console.log('Sign in as', DEMO_EMAIL, 'and open the dashboard.');
  console.log('- Hot Signals: 3 (new GM hire, Cruise restructuring, Q4 earnings)');
  console.log('- Contacts: 13 pre-enriched (no Apollo needed)');
  console.log('- Content Library: 11 items (events, stories, use cases, releases)');
  console.log('- Playbook Templates: ~111 (5 original + 56 signal + 50 proactive)');
  console.log('- In-Progress Workflows: 1');
  console.log('- SAP Approved Plays: 3 (power recommended plays on My Day)');
  console.log('- Roadmap: 5 division targets with plans linked to signals');
}

async function seedPlaybookTargetingAndActivations(userId: string, companyId: string) {
  const TARGETING: Record<string, {
    targetDepartmentTypes?: string[];
    targetIndustries?: string[];
    targetPersonas?: string[];
    timingConfig?: Record<string, unknown>;
    expectedOutcome?: string;
    priority?: number;
  }> = {
    'New Executive Introduction': {
      targetDepartmentTypes: ['ENGINEERING', 'OPERATIONS', 'EXECUTIVE', 'CONNECTED_SERVICES', 'IT_INFRASTRUCTURE'],
      targetIndustries: ['Automotive', 'Technology', 'Manufacturing'],
      targetPersonas: ['VP', 'C-Suite', 'Director'],
      timingConfig: { triggerDaysBefore: 0, validWindowDays: 56, urgencyDecay: 'step' },
      expectedOutcome: 'Meeting booked with new executive within 2 weeks of hire announcement',
      priority: 10,
    },
    'Event Invite': {
      targetDepartmentTypes: ['ENGINEERING', 'OPERATIONS', 'CONNECTED_SERVICES', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
      targetIndustries: ['Automotive', 'Technology', 'Manufacturing', 'Retail'],
      targetPersonas: ['VP', 'Director', 'Manager'],
      timingConfig: { triggerDaysBefore: 30, validWindowDays: 30, urgencyDecay: 'linear' },
      expectedOutcome: 'Event registration and meeting scheduled during event',
      priority: 8,
    },
    'Signal Response': {
      targetDepartmentTypes: ['ENGINEERING', 'OPERATIONS', 'IT_INFRASTRUCTURE'],
      targetIndustries: ['Automotive', 'Technology'],
      targetPersonas: ['VP', 'Director', 'C-Suite'],
      timingConfig: { triggerDaysBefore: 0, validWindowDays: 14, urgencyDecay: 'linear' },
      expectedOutcome: 'Timely outreach referencing signal, reply within 5 business days',
      priority: 7,
    },
    'Re-Engagement': {
      targetDepartmentTypes: ['ENGINEERING', 'OPERATIONS', 'CONNECTED_SERVICES'],
      targetIndustries: ['Automotive', 'Technology'],
      targetPersonas: ['VP', 'Director'],
      timingConfig: { triggerDaysBefore: 0, validWindowDays: 30, urgencyDecay: 'linear' },
      expectedOutcome: 'Meeting request accepted, pipeline re-opened',
      priority: 5,
    },
    'Feature / Product Announcement': {
      targetDepartmentTypes: ['ENGINEERING', 'OPERATIONS', 'CONNECTED_SERVICES', 'IT_INFRASTRUCTURE', 'OPERATIONS'],
      targetIndustries: ['Automotive', 'Technology', 'Manufacturing'],
      targetPersonas: ['VP', 'Director', 'Manager'],
      timingConfig: { triggerDaysBefore: 7, validWindowDays: 30, urgencyDecay: 'linear' },
      expectedOutcome: 'Product awareness and demo/meeting scheduled',
      priority: 9,
    },
  };

  for (const [name, fields] of Object.entries(TARGETING)) {
    const tmpl = await prisma.playbookTemplate.findFirst({
      where: { userId, name: { contains: name, mode: 'insensitive' } },
    });
    if (!tmpl) {
      console.log(`  Playbook "${name}" not found — skipping targeting update`);
      continue;
    }

    await prisma.playbookTemplate.update({
      where: { id: tmpl.id },
      data: {
        targetDepartmentTypes: fields.targetDepartmentTypes ?? undefined,
        targetIndustries: fields.targetIndustries ?? undefined,
        targetPersonas: fields.targetPersonas ?? undefined,
        timingConfig: (fields.timingConfig as Prisma.InputJsonValue) ?? undefined,
        expectedOutcome: fields.expectedOutcome ?? undefined,
        priority: fields.priority ?? 0,
      },
    });
    console.log(`  Updated targeting for "${tmpl.name}"`);
  }

  // Clean slate: delete ALL existing activations for this roadmap
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });

  if (!roadmap) {
    console.log('  No roadmap found for GM — skipping activations');
    return;
  }

  await prisma.playbookActivation.deleteMany({ where: { roadmapId: roadmap.id } });
  console.log('  Cleared all existing PlaybookActivations');

  // Activate exactly 3 plays — these power the "Recommended Plays" on My Day
  const templatesToActivate = [
    'New Executive Introduction',
    'Event Invite',
    'Feature / Product Announcement',
  ];

  for (const name of templatesToActivate) {
    const tmpl = await prisma.playbookTemplate.findFirst({
      where: { userId, name: { contains: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (!tmpl) continue;

    await prisma.playbookActivation.upsert({
      where: { roadmapId_templateId: { roadmapId: roadmap.id, templateId: tmpl.id } },
      create: {
        roadmapId: roadmap.id,
        templateId: tmpl.id,
        isActive: true,
      },
      update: { isActive: true },
    });
    console.log(`  Activated "${tmpl.name}" for GM roadmap`);
  }
}

async function seedExpandedSignalRulesAndActivations(userId: string, companyId: string) {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!roadmap) {
    console.log('  No roadmap found — skipping expanded rules');
    return;
  }

  // Clean slate: remove old rules, mappings, and plans
  await prisma.roadmapPlan.deleteMany({ where: { roadmapId: roadmap.id } });
  await prisma.roadmapActionMapping.deleteMany({ where: { roadmapId: roadmap.id } });
  await prisma.roadmapSignalRule.deleteMany({ where: { roadmapId: roadmap.id } });

  const SIGNAL_RULE_DEFS = [
    { name: 'Executive hire at GM', category: 'executive_hire', keywords: ['hired', 'appointed', 'VP', 'GM', 'General Manager'], priority: 3 },
    { name: 'GM organizational restructuring', category: 'industry_news', keywords: ['restructuring', 'consolidation', 'reorganization', 'Cruise'], priority: 2 },
    { name: 'GM earnings & investment signals', category: 'earnings_call', keywords: ['earnings', 'investment', 'AV', 'digital factory', 'Ultium'], priority: 2 },
  ];

  const ruleMap: Record<string, { ruleId: string; mappingId: string }> = {};

  for (const def of SIGNAL_RULE_DEFS) {
    const rule = await prisma.roadmapSignalRule.create({
      data: {
        roadmapId: roadmap.id,
        name: def.name,
        category: def.category,
        description: `Auto-created rule for ${def.category} signals.`,
        keywords: def.keywords,
        sources: ['news', 'web'],
        priorityWeight: def.priority,
      },
    });

    const mapping = await prisma.roadmapActionMapping.create({
      data: {
        roadmapId: roadmap.id,
        signalRuleId: rule.id,
        signalCategory: def.category,
        actionType: 'auto_workflow',
        autonomyLevel: 'draft_review',
        promptHint: `Auto-create workflow for ${def.category} signals matching ${def.name}.`,
      },
    });
    ruleMap[def.category] = { ruleId: rule.id, mappingId: mapping.id };
    console.log(`  Created rule + mapping: "${def.name}"`);
  }

  // Create roadmap plans linked to our 3 signals
  const hireSignal = await prisma.accountSignal.findFirst({
    where: { companyId, userId, type: 'executive_hire' },
    orderBy: { publishedAt: 'desc' },
  });
  const restructuringSignal = await prisma.accountSignal.findFirst({
    where: { companyId, userId, type: 'industry_news' },
    orderBy: { publishedAt: 'desc' },
  });
  const earningsSignal = await prisma.accountSignal.findFirst({
    where: { companyId, userId, type: 'earnings_call' },
    orderBy: { publishedAt: 'desc' },
  });

  const avTarget = await prisma.roadmapTarget.findFirst({
    where: { roadmapId: roadmap.id, name: { startsWith: 'Autonomous Driving' } },
  });
  const vEngTarget = await prisma.roadmapTarget.findFirst({
    where: { roadmapId: roadmap.id, name: 'Vehicle Engineering & Simulation' },
  });
  const mfgTarget = await prisma.roadmapTarget.findFirst({
    where: { roadmapId: roadmap.id, name: 'Manufacturing & Supply Chain' },
  });

  if (hireSignal && avTarget && ruleMap['executive_hire']) {
    await prisma.roadmapPlan.create({
      data: {
        roadmapId: roadmap.id,
        signalId: hireSignal.id,
        signalRuleId: ruleMap['executive_hire'].ruleId,
        actionMappingId: ruleMap['executive_hire'].mappingId,
        targetId: avTarget.id,
        status: 'pending',
        autonomyLevel: 'draft_review',
        previewPayload: {
          subject: 'New GM of AV & ADAS — introduction and NVIDIA DRIVE briefing',
          bodyPreview: 'Jordan Lee was appointed GM of AV & ADAS, consolidating Cruise and corporate AV. Opportunity to introduce the NVIDIA DRIVE + DGX stack and brief on the unified AV compute strategy.',
        },
        matchInfo: {
          matchedKeywords: ['appointed', 'General Manager', 'AV'],
          ruleName: 'Executive hire at GM',
          confidence: 0.97,
        },
      },
    });
    console.log('  Created roadmap plan: new GM hire → AV target');
  }

  if (restructuringSignal && avTarget && ruleMap['industry_news']) {
    await prisma.roadmapPlan.create({
      data: {
        roadmapId: roadmap.id,
        signalId: restructuringSignal.id,
        signalRuleId: ruleMap['industry_news'].ruleId,
        actionMappingId: ruleMap['industry_news'].mappingId,
        targetId: avTarget.id,
        status: 'pending',
        autonomyLevel: 'draft_review',
        previewPayload: {
          subject: 'Cruise restructuring — unified AV compute strategy briefing',
          bodyPreview: 'GM is consolidating Cruise R&D under corporate AV engineering. The unified budget creates an opening to standardize on NVIDIA DRIVE + DGX from training to deployment across L4 robotaxi and L2+/L3 ADAS.',
        },
        matchInfo: {
          matchedKeywords: ['restructuring', 'consolidation', 'Cruise'],
          ruleName: 'GM organizational restructuring',
          confidence: 0.93,
        },
      },
    });
    console.log('  Created roadmap plan: Cruise restructuring → AV target');
  }

  if (earningsSignal && vEngTarget && ruleMap['earnings_call']) {
    await prisma.roadmapPlan.create({
      data: {
        roadmapId: roadmap.id,
        signalId: earningsSignal.id,
        signalRuleId: ruleMap['earnings_call'].ruleId,
        actionMappingId: ruleMap['earnings_call'].mappingId,
        targetId: vEngTarget.id,
        status: 'pending',
        autonomyLevel: 'draft_review',
        previewPayload: {
          subject: 'GM Q4 earnings: accelerating Ultium with GPU-powered simulation',
          bodyPreview: 'GM\'s earnings highlighted $2B AV investment and digital manufacturing commitment. Briefing for Vehicle Engineering on how Omniverse and GPU-accelerated CFD/CAE can compress Ultium development cycles by 40%.',
        },
        matchInfo: {
          matchedKeywords: ['earnings', 'investment', 'digital factory', 'Ultium'],
          ruleName: 'GM earnings & investment signals',
          confidence: 0.92,
        },
      },
    });
    console.log('  Created roadmap plan: Q4 earnings → Vehicle Engineering target');
  }

  if (earningsSignal && mfgTarget && ruleMap['earnings_call']) {
    await prisma.roadmapPlan.create({
      data: {
        roadmapId: roadmap.id,
        signalId: earningsSignal.id,
        signalRuleId: ruleMap['earnings_call'].ruleId,
        actionMappingId: ruleMap['earnings_call'].mappingId,
        targetId: mfgTarget.id,
        status: 'pending',
        autonomyLevel: 'draft_review',
        previewPayload: {
          subject: 'Digitizing GM Ultium plants: Omniverse digital twin proposal',
          bodyPreview: 'GM committed to digitizing all Ultium plants by 2027. Proposal for Manufacturing on how BMW used NVIDIA Omniverse to cut factory planning time by 30% — directly applicable to GM\'s Ultium plant expansion.',
        },
        matchInfo: {
          matchedKeywords: ['earnings', 'digital factory', 'Ultium'],
          ruleName: 'GM earnings & investment signals',
          confidence: 0.87,
        },
      },
    });
    console.log('  Created roadmap plan: Q4 earnings → Manufacturing target');
  }
}

async function seedInProgressWorkflow(userId: string, companyId: string, deptMap: Record<string, string>, contactIdMap: Record<string, string>) {
  const template = await prisma.playbookTemplate.findFirst({
    where: { userId, name: { contains: 'Event Invite', mode: 'insensitive' } },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!template || template.steps.length === 0) {
    console.log('  "Event Invite" template not found — skipping in-progress workflow');
    return;
  }

  const avDeptId = deptMap[DepartmentType.OPERATIONS] ?? null;
  const contactId = contactIdMap['david.richardson@gm.com'] ?? null;

  const workflow = await prisma.actionWorkflow.create({
    data: {
      userId,
      companyId,
      templateId: template.id,
      targetDivisionId: avDeptId,
      targetContactId: contactId,
      title: 'Event Invite: NVIDIA GTC 2026 — AV & ADAS team',
      description: 'Invite GM AV leadership to NVIDIA GTC 2026 with personalized agenda highlighting autonomous driving sessions.',
      status: 'in_progress',
      urgencyScore: 180,
    },
  });

  const now = new Date();
  for (let i = 0; i < template.steps.length; i++) {
    const ts = template.steps[i];
    const isFirst = i === 0;
    const isSecond = i === 1;
    const dueAt = ts.dayOffset ? new Date(now.getTime() + ts.dayOffset * 86400_000) : now;

    const assetTypes = ts.assetTypes as string[] | null;

    await prisma.actionWorkflowStep.create({
      data: {
        workflowId: workflow.id,
        stepOrder: ts.order,
        stepType: 'generate_content',
        promptHint: ts.promptHint ?? null,
        contentType: assetTypes?.[0] ?? null,
        channel: ts.channel ?? null,
        contactId,
        divisionId: avDeptId,
        status: isFirst ? 'completed' : isSecond ? 'completed' : 'pending',
        completedAt: isFirst ? daysAgo(3) : isSecond ? daysAgo(1) : null,
        dueAt,
      },
    });
  }
  console.log(`  Created in-progress workflow "${workflow.title}" with ${template.steps.length} steps (2 completed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

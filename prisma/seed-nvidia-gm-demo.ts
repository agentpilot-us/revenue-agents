/**
 * NVIDIA → GM Demo Seed Script
 *
 * Target instance: demo-techinfra@agentpilot.us
 * Demo flag: OFF (real Exa signals, real Apollo enrichment, real content generation)
 *
 * Creates:
 * - NVIDIA company profile (the seller)
 * - 8 NVIDIA automotive products with profiles and relationships
 * - GM as target account with 5 buying groups (CompanyDepartment)
 * - 75 contacts (15 per buying group) with bogus emails, titles, LinkedIn
 * - GM research data (Company.researchData)
 * - 3 pre-seeded AccountSignals for demo reliability
 * - Content Library: 3 success stories, 2 use cases, 1 battlecard, 1 event, 1 framework
 * - Messaging Frameworks: 5 (core value prop, enterprise tone, competitive, renewal, expansion)
 * - Industry Playbook: Automotive
 * - PlayGovernance with NVIDIA-specific settings
 * - CompanyProduct for GM (DGX existing contract, renewal at T-85)
 *
 * Prerequisites: Run cleanup:official-demo first if you want a fresh slate. Ensure user exists (sign in once).
 * Run: npm run seed:nvidia-gm   or   npx dotenv -e .env.local -- tsx prisma/seed-nvidia-gm-demo.ts
 */

import {
  Prisma,
  PrismaClient,
  DepartmentType,
  DepartmentStatus,
  ProductOwnershipStatus,
  PlayScope,
  PlayCategory,
  PlayTemplateStatus,
  PlayTriggerType,
  PhaseGateType,
  PlayContentType,
  ContentChannel,
  ModelTier,
  ActionPriority,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { ContentType } from '@prisma/client';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/seed-nvidia-gm-demo.ts'
    );
  }
  const normalized = normalizeDatabaseUrlForPg(connectionString);
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

const prisma = createPrisma();

const DEMO_USER_EMAIL = 'demo-techinfra@agentpilot.us';

// Buying group name → DepartmentType for CompanyDepartment
const BUYING_GROUP_TYPE: Record<string, DepartmentType> = {
  'Autonomous Vehicle Engineering': 'ENGINEERING',
  'Vehicle Software Platform': 'ENGINEERING',
  'Manufacturing & Digital Twin': 'OPERATIONS',
  'In-Vehicle Experience': 'PRODUCT',
  'IT Infrastructure & ML Platform': 'IT_INFRASTRUCTURE',
};

// ============================================================
// NVIDIA PRODUCT CATALOG (Automotive Stack)
// ============================================================

const NVIDIA_PRODUCTS = [
  {
    name: 'NVIDIA DRIVE Orin',
    slug: 'drive-orin',
    description:
      'System-on-chip for autonomous driving. 254 TOPS of AI performance. Powers L2+ through L5 autonomous driving and advanced driver assistance systems.',
    category: 'Autonomous Driving',
    priceMin: 500000,
    priceMax: 5000000,
    pricingModel: 'per-vehicle-program',
    relatedProducts: {
      'drive-thor': 'upgrade_path',
      'drive-sim': 'complementary',
      'drive-hyperion': 'complementary',
      'dgx-systems': 'prerequisite',
    },
  },
  {
    name: 'NVIDIA DRIVE Thor',
    slug: 'drive-thor',
    description:
      'Next-generation centralized compute platform for software-defined vehicles. 2000 TOPS. Consolidates autonomous driving, parking, driver monitoring, and infotainment into a single SoC.',
    category: 'Autonomous Driving',
    priceMin: 2000000,
    priceMax: 15000000,
    pricingModel: 'per-vehicle-program',
    relatedProducts: {
      'drive-orin': 'replacement',
      'drive-sim': 'complementary',
      'nvidia-ai-enterprise': 'complementary',
    },
  },
  {
    name: 'NVIDIA DRIVE Hyperion',
    slug: 'drive-hyperion',
    description:
      'Reference sensor architecture for autonomous vehicles. Includes cameras, radar, lidar, and ultrasonics with DRIVE Orin/Thor compute. Full AV development kit.',
    category: 'Autonomous Driving',
    priceMin: 1000000,
    priceMax: 8000000,
    pricingModel: 'platform-license',
    relatedProducts: {
      'drive-orin': 'prerequisite',
      'drive-sim': 'complementary',
    },
  },
  {
    name: 'NVIDIA DRIVE Sim',
    slug: 'drive-sim',
    description:
      'Cloud-based simulation platform for autonomous vehicle development. Physically accurate, real-time rendering of driving scenarios. Validates AV software at scale without road testing.',
    category: 'Simulation & Digital Twin',
    priceMin: 500000,
    priceMax: 3000000,
    pricingModel: 'annual-subscription',
    relatedProducts: {
      'drive-orin': 'complementary',
      'omniverse': 'complementary',
      'dgx-systems': 'prerequisite',
    },
  },
  {
    name: 'NVIDIA DRIVE Concierge',
    slug: 'drive-concierge',
    description:
      'AI-powered in-vehicle assistant for intelligent cockpit experiences. Natural language interaction, gesture recognition, driver monitoring, and personalized recommendations.',
    category: 'In-Vehicle Experience',
    priceMin: 200000,
    priceMax: 2000000,
    pricingModel: 'per-vehicle-program',
    relatedProducts: {
      'drive-thor': 'complementary',
      'nvidia-ai-enterprise': 'complementary',
    },
  },
  {
    name: 'NVIDIA DGX Systems',
    slug: 'dgx-systems',
    description:
      'AI training infrastructure. DGX H100 and DGX SuperPOD for large-scale model training. Powers AV perception model training, simulation rendering, and fleet learning.',
    category: 'Training Infrastructure',
    priceMin: 500000,
    priceMax: 20000000,
    pricingModel: 'capital-purchase',
    relatedProducts: {
      'drive-sim': 'complementary',
      'nvidia-ai-enterprise': 'complementary',
      'omniverse': 'complementary',
    },
  },
  {
    name: 'NVIDIA Omniverse',
    slug: 'omniverse',
    description:
      'Platform for building and operating industrial digital twins. Factory planning, vehicle design visualization, manufacturing simulation, and real-time collaboration across distributed teams.',
    category: 'Digital Twin & Simulation',
    priceMin: 300000,
    priceMax: 5000000,
    pricingModel: 'annual-subscription',
    relatedProducts: {
      'drive-sim': 'complementary',
      'dgx-systems': 'prerequisite',
      'nvidia-ai-enterprise': 'complementary',
    },
  },
  {
    name: 'NVIDIA AI Enterprise',
    slug: 'nvidia-ai-enterprise',
    description:
      'End-to-end AI software platform. Includes frameworks, pretrained models, and tools for deploying AI across the enterprise. Powers computer vision, NLP, recommendation systems, and fleet analytics.',
    category: 'Software Platform',
    priceMin: 100000,
    priceMax: 2000000,
    pricingModel: 'annual-subscription',
    relatedProducts: {
      'dgx-systems': 'complementary',
      'omniverse': 'complementary',
      'drive-concierge': 'complementary',
    },
  },
];

// ProductProfile seed: one per catalog product (sales profiles for My Company → Products)
type ProductProfileSeed = {
  oneLiner: string;
  elevatorPitch: string;
  valueProps: string[];
  painPoints: string[];
  objectionHandlers: Array<{ objection: string; response: string }>;
  competitivePositioning: string[];
  priceRangeText: string;
  salesCycle: string;
  bestForDepartments?: string[];
  bestForIndustries?: string[];
  dealSizeSweetSpot?: string;
};

const PRODUCT_PROFILE_SEED: Record<string, ProductProfileSeed> = {
  'drive-orin': {
    oneLiner: 'Production-ready AI compute for L2+ through L5 autonomous driving at 254 TOPS.',
    elevatorPitch:
      'NVIDIA DRIVE Orin is the industry-leading SoC for autonomous driving and ADAS. It delivers 254 TOPS of AI performance in a single chip, enabling OEMs to deploy L2+ today and scale to L4/L5 with the same platform. Production-proven in millions of vehicles.',
    valueProps: [
      '254 TOPS in a single SoC — highest performance per watt for ADAS and AV',
      'Software-defined architecture supports OTA updates and new features without hardware changes',
      'Production-proven; designed for functional safety (ASIL-D)',
      'Unified platform from L2+ to L5 reduces development and validation cost',
    ],
    painPoints: [
      'Fragmented ECU architecture increases cost and delays time-to-market',
      'In-house silicon has 3–5 year development cycles and limits software agility',
      'Black-box solutions lock OEMs out of customization and differentiation',
    ],
    objectionHandlers: [
      { objection: 'Qualcomm / Snapdragon Ride', response: 'Lower TOPS and no integrated simulation platform. NVIDIA offers full-stack from training (DGX) to deployment (DRIVE) and simulation.' },
      { objection: 'Mobileye / EyeQ', response: 'Black-box approach limits OEM customization. DRIVE is open and programmable — your algorithms, our compute.' },
      { objection: 'In-house silicon', response: '3–5 year development cycle and ongoing node risk. DRIVE is production-ready today with a clear path to Thor.' },
    ],
    competitivePositioning: [
      'Largest ecosystem of AV software partners and OEM deployments',
      'Single platform from training to simulation to in-vehicle deployment',
      'Open, programmable architecture vs. closed black-box alternatives',
    ],
    priceRangeText: '$500K–$5M per vehicle program (volume-dependent)',
    salesCycle: '6–18 months for vehicle programs',
    bestForDepartments: ['Autonomous Vehicle Engineering', 'Vehicle Software Platform'],
    bestForIndustries: ['Automotive', 'Trucking', 'Mobility'],
    dealSizeSweetSpot: '$1M–$3M',
  },
  'drive-thor': {
    oneLiner: 'Next-gen centralized compute for software-defined vehicles — 2000 TOPS in a single SoC.',
    elevatorPitch:
      'DRIVE Thor consolidates autonomous driving, parking, driver monitoring, and infotainment into one centralized compute platform. At 2000 TOPS it replaces 30+ ECUs, cutting BOM cost and enabling software-defined revenue. The natural upgrade path from DRIVE Orin.',
    valueProps: [
      '2000 TOPS in a single SoC — consolidate 30+ ECUs into one domain controller',
      'Software-defined vehicle architecture enables OTA feature monetization',
      'Zone architecture reduces wiring harness weight and cost',
      'Unified pipeline from L2+ through L5 and cockpit on one chip',
    ],
    painPoints: [
      'Distributed ECUs drive high cost, weight, and integration complexity',
      'Multiple vendors and stacks slow OTA and feature rollout',
      'Legacy architecture blocks recurring software revenue',
    ],
    objectionHandlers: [
      { objection: 'Migration risk from Orin', response: 'NVIDIA provides reference software stack and migration tools. Same DRIVE OS and APIs; Toyota completed migration in 14 months.' },
      { objection: 'Vendor lock-in', response: 'DRIVE supports Linux, Android Automotive, QNX. APIs are standardized; you own the application layer.' },
      { objection: 'Cost', response: 'At scale, centralized compute reduces total cost. At 3M vehicles, DRIVE Thor is ~$12/vehicle for compute vs. $47+ for distributed ECUs.' },
    ],
    competitivePositioning: [
      'Only platform at 2000 TOPS with production roadmap',
      'Single SoC for AV + cockpit reduces system cost and complexity',
      'Clear upgrade path from Orin protects prior investment',
    ],
    priceRangeText: '$2M–$15M per vehicle program (volume-dependent)',
    salesCycle: '9–24 months for next-gen vehicle programs',
    bestForDepartments: ['Autonomous Vehicle Engineering', 'Vehicle Software Platform', 'In-Vehicle Experience'],
    bestForIndustries: ['Automotive', 'Trucking', 'Mobility'],
    dealSizeSweetSpot: '$5M–$12M',
  },
  'drive-hyperion': {
    oneLiner: 'Reference sensor and compute architecture for AV development — cameras, radar, lidar, and DRIVE Orin/Thor.',
    elevatorPitch:
      'DRIVE Hyperion is the full AV development reference design: sensors, compute, and software stack. OEMs and Tier 1s use it to accelerate development and validation, then customize for production. Cuts time from concept to production-ready system.',
    valueProps: [
      'Complete reference design — sensors, compute, calibration, and software',
      'Reduces integration risk and speeds time-to-first-drive',
      'Compatible with DRIVE Orin and Thor; one stack from dev to production',
      'Validated sensor suite (cameras, radar, lidar, ultrasonics) with known performance',
    ],
    painPoints: [
      'In-house sensor and compute integration delays programs by 12–18 months',
      'Multiple vendors increase integration and validation cost',
      'Lack of reference design extends learning curve for AV teams',
    ],
    objectionHandlers: [
      { objection: 'We want to pick our own sensors', response: 'Hyperion is a reference; you can substitute sensors. We provide interfaces and calibration tools for custom sensor sets.' },
      { objection: 'Only for prototyping', response: 'Same architecture scales to production. Many OEMs start with Hyperion and carry forward compute and software to production programs.' },
    ],
    competitivePositioning: [
      'Only full-stack AV reference with production DRIVE compute',
      'Proven at major OEMs for development and pre-production',
      'Single vendor for sensors + compute simplifies supply chain',
    ],
    priceRangeText: '$1M–$8M platform license (development and production)',
    salesCycle: '6–12 months',
    bestForDepartments: ['Autonomous Vehicle Engineering', 'Vehicle Software Platform'],
    bestForIndustries: ['Automotive', 'Trucking', 'Mobility'],
    dealSizeSweetSpot: '$2M–$5M',
  },
  'drive-sim': {
    oneLiner: 'Cloud-based AV simulation — physically accurate, real-time — validate at scale without road testing.',
    elevatorPitch:
      'DRIVE Sim is the simulation platform for autonomous vehicle development. Run millions of miles in the cloud with physically accurate sensors and scenarios. Cuts physical testing cost by up to 90% and accelerates validation cycles. Integrates with DGX training and DRIVE deployment.',
    valueProps: [
      'Physically accurate sensor simulation — lidar, radar, cameras — for validation at scale',
      'Reduces physical road testing by up to 90%; faster iteration',
      'Integrates with DGX (training) and DRIVE (deployment) for full-stack workflow',
      'Scenario library and synthetic data for edge cases and regression',
    ],
    painPoints: [
      'Physical road testing is expensive, slow, and cannot cover edge cases',
      'Validation bottlenecks delay program timelines',
      'Disconnect between simulation and production stack causes rework',
    ],
    objectionHandlers: [
      { objection: 'We have our own sim', response: 'DRIVE Sim plugs into your pipeline. We focus on sensor-accurate simulation and integration with DRIVE stack; you keep scenario and workflow ownership.' },
      { objection: 'Cloud cost', response: 'Pay per use; typically 40–60% cost reduction vs. physical testing. We can model ROI for your program size.' },
    ],
    competitivePositioning: [
      'Only simulation platform natively aligned with DRIVE perception and planning',
      'Used by leading OEMs for validation and certification support',
      'Scales from single developer to fleet-level regression',
    ],
    priceRangeText: '$500K–$3M annual subscription (usage-based)',
    salesCycle: '3–9 months',
    bestForDepartments: ['Autonomous Vehicle Engineering', 'Manufacturing & Digital Twin'],
    bestForIndustries: ['Automotive', 'Trucking', 'Mobility'],
    dealSizeSweetSpot: '$800K–$2M',
  },
  'drive-concierge': {
    oneLiner: 'AI-powered in-vehicle assistant — natural language, gesture, driver monitoring, and personalization on DRIVE.',
    elevatorPitch:
      'DRIVE Concierge delivers intelligent cockpit experiences on the DRIVE platform: natural language interaction, gesture recognition, driver monitoring, and personalized recommendations. Built for DRIVE Thor’s centralized compute so one SoC powers both AV and cabin AI.',
    valueProps: [
      'Natural language and gesture reduce distraction and improve UX',
      'Driver monitoring supports safety and personalization',
      'Runs on DRIVE Thor — no separate cockpit ECU; lower cost and complexity',
      'Personalized recommendations and OTA updates create recurring value',
    ],
    painPoints: [
      'Fragmented cockpit and ADAS stacks increase cost and delay features',
      'Generic voice assistants don’t understand vehicle context',
      'Driver monitoring and cabin AI often on separate, older silicon',
    ],
    objectionHandlers: [
      { objection: 'We use another voice provider', response: 'Concierge can integrate with your preferred NLU or stay NVIDIA-native. We focus on vehicle context, driver state, and DRIVE integration.' },
      { objection: 'Not our priority', response: 'Concierge is a differentiator for premium and SDV segments. Low incremental cost when already on DRIVE Thor.' },
    ],
    competitivePositioning: [
      'Only cabin AI stack optimized for DRIVE Thor centralized compute',
      'Unified AV + cabin roadmap simplifies software and supply chain',
      'OTA and personalization support recurring revenue models',
    ],
    priceRangeText: '$200K–$2M per vehicle program',
    salesCycle: '6–12 months',
    bestForDepartments: ['In-Vehicle Experience', 'Vehicle Software Platform'],
    bestForIndustries: ['Automotive', 'Mobility'],
    dealSizeSweetSpot: '$500K–$1.5M',
  },
  'dgx-systems': {
    oneLiner: 'AI training infrastructure — DGX H100 and SuperPOD — for AV model training and simulation.',
    elevatorPitch:
      'DGX systems are the standard for AI training at scale. For automotive, they power AV perception model training, DRIVE Sim rendering, and fleet learning. Customers who train on DGX deploy on DRIVE — same software stack, faster path to production.',
    valueProps: [
      'DGX H100 and SuperPOD deliver highest training throughput for large models',
      'Same software stack from training to DRIVE deployment reduces porting risk',
      'Powers DRIVE Sim and Omniverse for digital twin and synthetic data',
      'Proven for perception, prediction, and end-to-end AV model development',
    ],
    painPoints: [
      'Training on generic cloud GPUs creates porting and performance gaps to edge',
      'Scaling training is slow without purpose-built infrastructure',
      'Disconnect between research and production stacks delays deployment',
    ],
    objectionHandlers: [
      { objection: 'We use cloud', response: 'Hybrid is common: DGX for core training and large jobs; cloud for burst. We can model TCO and show 2–3x efficiency for AV workloads.' },
      { objection: 'Renewal / refresh', response: 'Lead with utilization and new model architectures (e.g. H100 vs A100). Position as infrastructure modernization and path to next-gen DRIVE.' },
    ],
    competitivePositioning: [
      'De facto standard for AI training; same stack as DRIVE deployment',
      'Best performance per watt and per dollar for large-model training',
      'Full-stack story: train on DGX, simulate in DRIVE Sim, deploy on DRIVE',
    ],
    priceRangeText: '$500K–$20M capital purchase (DGX to SuperPOD)',
    salesCycle: '3–12 months',
    bestForDepartments: ['Autonomous Vehicle Engineering', 'IT Infrastructure & ML Platform', 'Manufacturing & Digital Twin'],
    bestForIndustries: ['Automotive', 'Manufacturing', 'Healthcare', 'Financial Services'],
    dealSizeSweetSpot: '$2M–$10M',
  },
  omniverse: {
    oneLiner: 'Platform for industrial digital twins — factory planning, vehicle design, and real-time collaboration.',
    elevatorPitch:
      'NVIDIA Omniverse connects design, simulation, and manufacturing in a single collaborative platform. Build physics-accurate digital twins of factories and vehicles; run what-if scenarios and optimize before physical build. Used with DGX and DRIVE Sim for full pipeline.',
    valueProps: [
      'Physics-accurate digital twins for factories and production lines',
      'Real-time collaboration across distributed teams and tools',
      'Reduces physical prototyping and accelerates time-to-production',
      'Integrates with DGX (rendering, AI) and DRIVE Sim (AV scenarios)',
    ],
    painPoints: [
      'Design and manufacturing data live in silos; handoffs cause errors',
      'Physical prototyping is expensive and slow',
      'No single source of truth for factory and product digital twin',
    ],
    objectionHandlers: [
      { objection: 'We have other CAD/PLM tools', response: 'Omniverse connects to major CAD and PLM via USD. We are the collaboration and simulation layer, not a replacement.' },
      { objection: 'Only for visualization', response: 'Omniverse includes physics, robotics simulation, and AI. Used for layout optimization, robotics validation, and predictive maintenance.' },
    ],
    competitivePositioning: [
      'Only platform built on USD for cross-tool digital twin',
      'Real-time physics and rendering at scale',
      'Unified pipeline from design to factory to AV simulation',
    ],
    priceRangeText: '$300K–$5M annual subscription (seats and usage)',
    salesCycle: '3–9 months',
    bestForDepartments: ['Manufacturing & Digital Twin', 'Vehicle Software Platform', 'IT Infrastructure & ML Platform'],
    bestForIndustries: ['Automotive', 'Manufacturing', 'Industrial'],
    dealSizeSweetSpot: '$1M–$3M',
  },
  'nvidia-ai-enterprise': {
    oneLiner: 'End-to-end AI software platform — frameworks, models, and tools for deploying AI across the enterprise.',
    elevatorPitch:
      'NVIDIA AI Enterprise is the full software stack for building and deploying AI: frameworks, pretrained models, and MLOps tools. Powers computer vision, NLP, recommendation systems, and fleet analytics. Runs on DGX, cloud, or edge — and feeds into DRIVE and Omniverse for automotive.',
    valueProps: [
      'Single software stack from training to deployment (DGX, cloud, DRIVE)',
      'Enterprise support and security for regulated and production workloads',
      'Optimized for NVIDIA hardware; best performance and reliability',
      'Accelerates time-to-production for CV, NLP, and recommendation models',
    ],
    painPoints: [
      'Open-source and point tools create integration and support gaps',
      'Deploying models to edge and vehicle is complex without a unified stack',
      'Performance and security vary across DIY solutions',
    ],
    objectionHandlers: [
      { objection: 'We use open source only', response: 'AI Enterprise is built on open standards and frameworks. You get support, security patches, and optimization; no lock-in.' },
      { objection: 'Only for DGX', response: 'Runs on DGX, cloud instances, and DRIVE. Same APIs and models across environments.' },
    ],
    competitivePositioning: [
      'Only enterprise-grade AI stack optimized for full NVIDIA pipeline',
      'Support and SLA for production and regulated use cases',
      'Unified from data center to vehicle',
    ],
    priceRangeText: '$100K–$2M annual subscription (per instance or site)',
    salesCycle: '3–9 months',
    bestForDepartments: ['IT Infrastructure & ML Platform', 'Autonomous Vehicle Engineering', 'In-Vehicle Experience'],
    bestForIndustries: ['Automotive', 'Manufacturing', 'Healthcare', 'Financial Services'],
    dealSizeSweetSpot: '$300K–$1M',
  },
};

// ============================================================
// GM BUYING GROUPS (5 departments, 15 contacts each)
// ============================================================

const GM_BUYING_GROUPS = [
  {
    name: 'Autonomous Vehicle Engineering',
    description:
      'Cruise/AV division — autonomous driving software, perception, planning, simulation. The power center for DRIVE platform decisions.',
    valueProps: [
      'DRIVE Orin/Thor delivers industry-leading 254-2000 TOPS for L2+ through L5',
      'DRIVE Sim eliminates 90% of physical road testing cost',
      'End-to-end from training (DGX) to deployment (DRIVE) reduces time-to-production by 18 months',
    ],
    objectionHandlers: [
      { objection: 'Qualcomm Snapdragon Ride', response: 'Lower TOPS, no integrated simulation platform. NVIDIA is full-stack.' },
      { objection: 'Mobileye EyeQ', response: 'Black-box approach limits OEM customization. NVIDIA DRIVE is open and programmable.' },
      { objection: 'In-house silicon', response: '3-5 year development cycle vs. production-ready DRIVE platform.' },
    ],
    targetRoles: ['VP Autonomous Driving', 'Director AV Software', 'Chief Engineer ADAS', 'Head of Perception', 'Director Simulation'],
    estimatedOpportunity: '15000000',
    contacts: [
      // Real person for demo enrichment: Apollo matches on linkedin_url. See https://www.linkedin.com/in/shelly-chaka-968723121/
      { name: 'Shelly Chaka', title: 'VP Autonomous Vehicle Engineering', linkedinUrl: 'https://www.linkedin.com/in/shelly-chaka-968723121/' },
      { name: 'Sarah Williams', title: 'Director AV Software Platform' },
      { name: 'Michael Rodriguez', title: 'Chief Engineer ADAS' },
      { name: 'Emily Nakamura', title: 'Head of Perception Systems' },
      { name: 'David Park', title: 'Director Simulation & Validation' },
      { name: 'Lisa Zhang', title: 'Senior Manager AV Planning' },
      { name: 'Robert Kim', title: 'Principal Engineer Sensor Fusion' },
      { name: 'Jennifer Martinez', title: 'Manager AV Safety Validation' },
      { name: 'Thomas Anderson', title: 'Lead ML Engineer Perception' },
      { name: 'Amanda Foster', title: 'Director AV Mapping & Localization' },
      { name: 'Kevin Patel', title: 'Senior Program Manager AV' },
      { name: 'Rachel Lee', title: 'Manager AV Compute Architecture' },
      { name: 'Christopher Davis', title: 'Director Fleet Learning' },
      { name: 'Michelle Thompson', title: 'VP AV Strategy & Partnerships' },
      { name: 'Andrew Wilson', title: 'Chief Scientist Autonomous Driving' },
    ],
  },
  {
    name: 'Vehicle Software Platform',
    description:
      'Software-defined vehicle (SDV) architecture team. Centralized compute, OTA updates, vehicle OS, middleware. Key decision-maker for DRIVE Thor adoption.',
    valueProps: [
      'DRIVE Thor consolidates 30+ ECUs into single centralized compute — $1,200 BOM savings per vehicle',
      'Software-defined architecture enables OTA feature monetization (est. $500/vehicle/year recurring)',
      'Zone architecture with DRIVE Thor reduces wiring harness weight by 15kg per vehicle',
    ],
    objectionHandlers: [
      { objection: 'Migration risk', response: 'NVIDIA provides reference software stack and migration tools. Toyota completed migration in 14 months.' },
      { objection: 'Vendor lock-in', response: 'DRIVE platform is open — supports Linux, Android Automotive, QNX. APIs are standardized.' },
      { objection: 'Cost', response: 'Amortize across fleet. At 3M vehicles, DRIVE Thor is $12/vehicle for compute vs. $47 for distributed ECUs.' },
    ],
    targetRoles: ['VP Software-Defined Vehicle', 'Director Vehicle OS', 'Chief Software Architect', 'Head of OTA Platform'],
    estimatedOpportunity: '20000000',
    contacts: [
      { name: 'Daniel Cooper', title: 'VP Software-Defined Vehicle' },
      { name: 'Stephanie Burke', title: 'Director Vehicle OS Architecture' },
      { name: 'Marcus Johnson', title: 'Chief Software Architect SDV' },
      { name: 'Laura Hernandez', title: 'Head of OTA Platform' },
      { name: 'Brian Mitchell', title: 'Director Middleware & Integration' },
      { name: 'Christina Wu', title: 'Senior Manager Vehicle Cybersecurity' },
      { name: 'Nathan Taylor', title: 'Principal Architect Zonal Computing' },
      { name: 'Heather Scott', title: 'Director Software Quality & Compliance' },
      { name: 'Jason Clark', title: 'Manager DevOps & CI/CD' },
      { name: 'Megan Rivera', title: 'Lead Engineer Vehicle Diagnostics' },
      { name: "Patrick O'Brien", title: 'Director Cloud-to-Vehicle Infrastructure' },
      { name: 'Samantha Lee', title: 'Senior Program Manager SDV' },
      { name: 'William Chen', title: 'VP Engineering Vehicle Platform' },
      { name: 'Diana Nguyen', title: 'Head of Functional Safety Software' },
      { name: 'Gregory Adams', title: 'Director Partner Ecosystem SDV' },
    ],
  },
  {
    name: 'Manufacturing & Digital Twin',
    description:
      'Factory automation, manufacturing engineering, plant optimization. Key buyer for Omniverse digital twin and AI-powered quality inspection.',
    valueProps: [
      'Omniverse digital twin reduces factory retooling time by 30% — simulate before physical build',
      'AI-powered visual inspection catches 99.7% of defects vs. 94% human inspection rate',
      'Real-time factory simulation enables predictive maintenance, reducing unplanned downtime by 25%',
    ],
    objectionHandlers: [
      { objection: 'Siemens Xcelerator', response: 'Good for PLM but no real-time physics simulation. Omniverse is purpose-built for live digital twins.' },
      { objection: 'ROI timeline', response: 'Average Omniverse deployment pays back in 8 months through reduced prototyping and retooling costs.' },
      { objection: 'IT infrastructure', response: 'Omniverse Cloud eliminates on-prem GPU requirements. Scales with demand.' },
    ],
    targetRoles: ['VP Manufacturing Engineering', 'Director Factory Automation', 'Head of Digital Twin', 'Chief Manufacturing Officer'],
    estimatedOpportunity: '5000000',
    contacts: [
      { name: 'Richard Zhang', title: 'VP Manufacturing Engineering' },
      { name: 'Katherine Brooks', title: 'Director Factory Automation' },
      { name: 'Steven Yamamoto', title: 'Head of Digital Twin Initiative' },
      { name: 'Angela Martinez', title: 'Chief Manufacturing Technology Officer' },
      { name: 'Paul Henderson', title: 'Director Quality Engineering' },
      { name: 'Victoria Chen', title: 'Senior Manager Robotics & Automation' },
      { name: 'Derek Williams', title: 'Principal Engineer Industrial IoT' },
      { name: 'Monica Singh', title: 'Director Plant Operations - Orion' },
      { name: 'Timothy Brown', title: 'Manager Simulation & Planning' },
      { name: 'Sandra Kim', title: 'Lead Engineer Computer Vision QA' },
      { name: 'Jeffrey Parker', title: 'Director Supply Chain Optimization' },
      { name: 'Maria Gonzalez', title: 'Senior Program Manager Manufacturing AI' },
      { name: 'Douglas Lee', title: 'VP Global Manufacturing Operations' },
      { name: 'Natalie Foster', title: 'Head of Predictive Maintenance' },
      { name: 'Howard Jackson', title: 'Director Manufacturing Innovation Lab' },
    ],
  },
  {
    name: 'In-Vehicle Experience',
    description:
      'Infotainment, cockpit electronics, HMI, driver monitoring systems. Buyer for DRIVE Concierge and DRIVE Thor cockpit compute.',
    valueProps: [
      'DRIVE Concierge enables personalized AI assistant — voice, gesture, gaze tracking on single SoC',
      'Unified cockpit compute (DRIVE Thor) replaces 3-4 separate ECUs for instrument cluster, infotainment, and DMS',
      'OTA-updatable cockpit features create recurring revenue: est. $200/vehicle/year from feature subscriptions',
    ],
    objectionHandlers: [
      { objection: 'Qualcomm SA8295P', response: 'Good for infotainment only. DRIVE Thor handles cockpit + ADAS on one chip — no second supplier needed.' },
      { objection: 'Development cost', response: 'NVIDIA provides reference cockpit software and UI frameworks. 50% faster time-to-market vs. custom development.' },
      { objection: 'Android Automotive only', response: 'DRIVE supports multiple OS — Android Automotive, Linux, QNX. No platform lock-in.' },
    ],
    targetRoles: ['VP Cockpit Experience', 'Director Infotainment', 'Head of HMI Design', 'Director DMS & Cabin Sensing'],
    estimatedOpportunity: '8000000',
    contacts: [
      { name: 'Elizabeth Moore', title: 'VP In-Vehicle Experience' },
      { name: 'Ryan Tanaka', title: 'Director Infotainment Platform' },
      { name: 'Jessica Palmer', title: 'Head of HMI Design & UX' },
      { name: 'Charles Wang', title: 'Director Driver Monitoring Systems' },
      { name: 'Nicole Stewart', title: 'Senior Manager Cockpit Integration' },
      { name: 'Brandon Cooper', title: 'Principal Architect Cockpit Compute' },
      { name: 'Andrea Santos', title: 'Director Voice & NLP Systems' },
      { name: 'Kyle Robinson', title: 'Manager AR/VR Cockpit Innovation' },
      { name: 'Sophia Lee', title: 'Lead Engineer Gesture Recognition' },
      { name: 'Matthew Garcia', title: 'Director Connected Services' },
      { name: 'Hannah Wright', title: 'Senior Program Manager Cockpit' },
      { name: 'Oscar Ramirez', title: 'Manager Cabin Sensing & Personalization' },
      { name: 'Chloe Bennett', title: 'VP Digital Customer Experience' },
      { name: 'Isaac Patel', title: 'Head of Maps & Navigation' },
      { name: 'Grace Kim', title: 'Director Content & App Ecosystem' },
    ],
  },
  {
    name: 'IT Infrastructure & ML Platform',
    description:
      'Central IT, AI/ML infrastructure, data engineering, cloud and on-prem compute. Buyer for DGX systems and NVIDIA AI Enterprise software.',
    valueProps: [
      'DGX H100 delivers 32 petaflops AI training — 9x faster than previous generation for AV model training',
      'NVIDIA AI Enterprise standardizes ML workflows across all GM AI teams — unified platform, one support contract',
      'Base Command Manager provides fleet-wide GPU cluster orchestration, reducing GPU idle time from 40% to under 10%',
    ],
    objectionHandlers: [
      { objection: 'Cloud-only (AWS/Azure)', response: 'DGX provides data sovereignty and 3x cost advantage for sustained AV training workloads vs. cloud GPU instances.' },
      { objection: 'AMD MI300X', response: '15% lower on MLPerf AV training benchmarks. NVIDIA CUDA ecosystem has 10x more automotive AI libraries.' },
      { objection: 'Budget', response: 'DGX-as-a-Service offers OpEx model. Amortized over 3 years, DGX is 60% cheaper than equivalent cloud for AV workloads.' },
    ],
    targetRoles: ['CTO', 'VP IT Infrastructure', 'Director ML Platform', 'Head of Data Engineering', 'Chief AI Officer'],
    estimatedOpportunity: '10000000',
    contacts: [
      { name: 'Frank Morrison', title: 'CTO & VP Technology' },
      { name: 'Claire Dubois', title: 'VP IT Infrastructure' },
      { name: 'Raymond Zhao', title: 'Director ML Platform & Engineering' },
      { name: 'Patricia Walsh', title: 'Head of Data Engineering' },
      { name: 'Alexander Kim', title: 'Chief AI Officer' },
      { name: 'Janet Robinson', title: 'Director Cloud & Hybrid Infrastructure' },
      { name: 'Trevor Nakamura', title: 'Senior Manager GPU Cluster Operations' },
      { name: 'Diane Foster', title: 'Principal Architect AI/ML Infrastructure' },
      { name: 'Calvin Brooks', title: 'Manager Data Center Operations' },
      { name: 'Eva Schmidt', title: 'Director Enterprise AI Strategy' },
      { name: 'Leonard Park', title: 'Lead Engineer MLOps & Model Serving' },
      { name: 'Isabelle Chen', title: 'Senior Program Manager IT Transformation' },
      { name: 'Martin Hayes', title: 'VP Enterprise Technology & Innovation' },
      { name: 'Olivia Torres', title: 'Head of Compute Procurement' },
      { name: 'Benjamin Wright', title: 'Director Network & Security Infrastructure' },
    ],
  },
];

// ============================================================
// GM RESEARCH DATA (pre-loaded so chat has context)
// ============================================================

const GM_RESEARCH_DATA = {
  lastSummary: `General Motors (GM) is undergoing a significant strategic transformation in 2025-2026, with major implications for NVIDIA's automotive platform:

**AV Strategy (Cruise Restructuring):** GM restructured its Cruise autonomous vehicle division in late 2024 after safety incidents. They're rebuilding AV capabilities with a focus on production-integrated ADAS rather than standalone robotaxis. This creates an opening for NVIDIA DRIVE — GM needs a production-ready, safety-certified compute platform rather than custom in-house silicon. The Cruise team still has ~1,500 engineers focused on AV software.

**Software-Defined Vehicle Push:** GM announced its Ultifi software platform strategy, aiming to have all vehicles on a common software-defined architecture by 2027. This is a massive centralized compute opportunity — DRIVE Thor's consolidation value prop (30+ ECUs → 1 SoC) aligns directly with their SDV timeline. GM's VP of SDV (Daniel Cooper) has publicly stated they're evaluating third-party compute platforms.

**Manufacturing Modernization:** GM is building the new Orion assembly plant (opening 2026) as a "factory of the future" with extensive digital twin and AI-powered automation. This is a greenfield Omniverse opportunity — no legacy systems to displace. $4B investment in the plant.

**Current NVIDIA Footprint:** GM uses DGX systems for AV model training (purchased 2022, ~$8M deployment). No production vehicle deployment of DRIVE. Qualcomm Snapdragon Ride is currently selected for some ADAS functions in 2025 model year vehicles — this is the competitive displacement target.

**Financial Context:** GM reported $171B revenue in 2024, with $10B+ in technology investment. They're profitable and investing aggressively in electrification and software. Budget is available.

**Key Relationships:** NVIDIA has existing champion in IT Infrastructure (Frank Morrison, CTO) who sponsored the DGX purchase. No relationships in AV Engineering or Vehicle Software Platform — these are the critical gaps for DRIVE platform sales.`,
  lastResearchAt: new Date().toISOString(),
};

// ============================================================
// PRE-SEEDED SIGNALS (ensure demo has signals on day 1)
// ============================================================

const GM_SIGNALS = [
  {
    type: 'exec_hire',
    title: 'GM Promotes Shelly Chaka to VP AV Engineering (ex-Cruise CSO)',
    summary:
      "General Motors has promoted Shelly Chaka to VP of Autonomous Vehicle Engineering, expanding her role from Executive Director of SAFE-ADS. Previously CSO at Cruise, Chaka brings 30 years of AV safety engineering experience including the creation of Cruise's autonomous vehicle safety case. With GM's expanded NVIDIA partnership (GTC March 2025) and eyes-off driving target for 2028, she's a critical stakeholder for DRIVE platform safety certification.",
    relevanceScore: 9,
  },
  {
    type: 'earnings_beat',
    title: 'GM Q4 2025 Earnings Beat — Revenue Up 8%, Tech Investment Increased',
    summary:
      'GM reported Q4 2025 revenue of $47.3B (beat by $1.2B). CEO Mary Barra highlighted "accelerated investment in software-defined vehicles and AI-powered manufacturing." Technology capex increased 15% YoY to $3.2B for the quarter. Budget cycle is favorable for new platform purchases.',
    relevanceScore: 7,
  },
  {
    type: 'competitor_detected',
    title: 'Qualcomm Announces Snapdragon Ride Flex for GM 2027 Models',
    summary:
      "Qualcomm issued a press release announcing expanded Snapdragon Ride Flex deployment in GM's 2027 model year vehicles for ADAS L2+ functions. This confirms Qualcomm as the incumbent competitor. The DRIVE Thor consolidation story (cockpit + ADAS on one chip) is the counter-positioning: Qualcomm requires separate chips for ADAS and cockpit.",
    relevanceScore: 8,
  },
];

// ============================================================
// CONTENT LIBRARY ITEMS (type must match ContentType enum)
// ============================================================

const CONTENT_LIBRARY_ITEMS: Array<{
  title: string;
  type: ContentType;
  industry: string;
  department?: string;
  content: object;
}> = [
  {
    title: 'Toyota DRIVE Partnership: From Evaluation to Production in 18 Months',
    type: 'SuccessStory',
    industry: 'Automotive',
    content: {
      summary:
        'Toyota selected NVIDIA DRIVE Orin as the compute platform for their next-generation ADAS across 4 vehicle lines. The partnership moved from initial evaluation to production commitment in 18 months, with NVIDIA providing dedicated engineering support and simulation validation.',
      metrics:
        '18-month evaluation-to-production. 4 vehicle lines. 12M units projected over platform lifecycle. $340M total contract value. 40% reduction in AV software validation time using DRIVE Sim.',
      quote:
        'NVIDIA DRIVE gave us the compute headroom to grow our ADAS capabilities through software updates over the vehicle lifetime. No other platform offered this combination of performance and upgradability.',
    },
  },
  {
    title: 'Mercedes-Benz DRIVE Orin Deployment: L3 Highway Pilot',
    type: 'SuccessStory',
    industry: 'Automotive',
    content: {
      summary:
        'Mercedes-Benz deployed NVIDIA DRIVE Orin as the backbone of their L3 autonomous highway driving system, becoming the first automaker to receive L3 certification in multiple markets with an NVIDIA-powered platform.',
      metrics:
        'First L3-certified NVIDIA DRIVE vehicle. 5 global markets. 95% highway scenario coverage. $200M+ program value. 60% faster certification vs. previous generation.',
      quote:
        'The combination of DRIVE Orin compute and DRIVE Sim validation was instrumental in achieving L3 certification across markets on an accelerated timeline.',
    },
  },
  {
    title: 'Volvo Cars: Full-Stack NVIDIA DRIVE Integration',
    type: 'SuccessStory',
    industry: 'Automotive',
    content: {
      summary:
        'Volvo Cars adopted the full NVIDIA DRIVE stack — Orin SoC, Hyperion sensor suite, DRIVE Sim for validation, and DGX for training — becoming the deepest full-stack NVIDIA automotive deployment. The centralized compute architecture eliminated 8 legacy ECUs.',
      metrics:
        'Full-stack deployment across 3 vehicle platforms. 8 legacy ECUs eliminated. $1,200 BOM savings per vehicle. 25% reduction in wiring harness weight. $500M total program value over 5 years.',
      quote:
        'Going full-stack with NVIDIA eliminated the integration tax of multi-supplier compute. One platform, one software stack, continuous improvement through OTA.',
    },
  },
  {
    title: 'NVIDIA DRIVE for AV Development Pipeline Acceleration',
    type: 'UseCase',
    industry: 'Automotive',
    department: 'Autonomous Vehicle Engineering',
    content: {
      summary:
        'How NVIDIA DRIVE Sim combined with DGX training infrastructure accelerates autonomous vehicle development from concept to production-ready.',
      workflow:
        '1. Train perception models on DGX (100x faster than cloud). 2. Validate in DRIVE Sim (1M miles/day simulated). 3. Deploy to DRIVE Orin/Thor in vehicle. 4. Fleet data feeds back to DGX for continuous improvement.',
      outcome:
        'Reduces AV development cycle from 5 years to 2.5 years. Eliminates 90% of physical road testing. Enables continuous improvement post-launch.',
    },
  },
  {
    title: 'Omniverse Digital Twin for Automotive Manufacturing',
    type: 'UseCase',
    industry: 'Automotive',
    department: 'Manufacturing & Digital Twin',
    content: {
      summary:
        'How NVIDIA Omniverse enables automakers to build physics-accurate digital twins of manufacturing facilities for planning, optimization, and predictive maintenance.',
      workflow:
        '1. Import factory CAD/BIM into Omniverse. 2. Simulate production line with physics-accurate robotics. 3. Optimize layout and throughput before physical build. 4. Run real-time digital twin during production for predictive maintenance.',
      outcome:
        '30% reduction in factory retooling time. 25% reduction in unplanned downtime. 8-month payback period. Enables remote collaboration across global manufacturing teams.',
    },
  },
  {
    title: 'NVIDIA DRIVE vs Qualcomm Snapdragon Ride vs Mobileye EyeQ',
    type: 'Battlecard',
    industry: 'Automotive',
    content: {
      competitors: {
        'Qualcomm Snapdragon Ride': {
          strengths:
            'Strong mobile/connectivity heritage. Lower power for basic ADAS. Good relationship with Tier 1 suppliers.',
          weaknesses:
            'No integrated simulation platform. Separate chips for ADAS and cockpit (cannot consolidate). Limited training infrastructure. No full-stack offering.',
          approvedClaims:
            'NVIDIA DRIVE Thor consolidates ADAS + cockpit on a single SoC, eliminating the need for separate Qualcomm chips. DRIVE delivers 3x the AI compute performance per watt for ADAS workloads. NVIDIA provides end-to-end from training (DGX) to simulation (DRIVE Sim) to deployment (DRIVE) — Qualcomm only provides the edge chip.',
          prohibitedClaims:
            "Do not claim Qualcomm chips are unreliable. Do not reference specific Qualcomm customer losses. Do not disparage Qualcomm's 5G/connectivity capabilities.",
        },
        'Mobileye EyeQ': {
          strengths: 'Deep ADAS experience. Strong safety track record. Turnkey solution for basic ADAS.',
          weaknesses:
            'Black-box approach limits OEM customization. Closed software ecosystem. No path to L4/L5. No training or simulation infrastructure.',
          approvedClaims:
            'NVIDIA DRIVE is fully open and programmable — OEMs own their software IP. DRIVE provides a clear compute roadmap from L2+ through L5 with Orin → Thor upgrade path. Mobileye\'s closed approach means OEMs cannot differentiate their ADAS experience.',
          prohibitedClaims:
            'Do not reference Mobileye safety incidents. Do not claim Mobileye is "outdated." Do not disparage Intel.',
        },
      },
    },
  },
  {
    title: 'NVIDIA GTC 2026 — Automotive AI Summit',
    type: 'CompanyEvent',
    industry: 'Automotive',
    content: {
      date: '2026-05-18',
      location: 'San Jose Convention Center',
      summary:
        'NVIDIA GPU Technology Conference 2026 with dedicated Automotive AI Summit track. Keynotes on DRIVE Thor production timeline, Omniverse factory digital twin deployments, and next-gen AV simulation capabilities. Executive networking dinner for OEM leadership.',
      ctaType: 'event_invite',
    },
  },
  {
    title: 'NVIDIA Software-Defined Vehicle Methodology',
    type: 'Framework',
    industry: 'Automotive',
    content: {
      summary:
        "NVIDIA's approach to helping OEMs transition from distributed ECU architectures to centralized compute with DRIVE Thor. Four-phase methodology: Assess (current architecture audit), Design (zone architecture with DRIVE Thor), Migrate (software stack porting with NVIDIA tools), and Scale (OTA feature development and monetization).",
      phases: [
        'Assess: Architecture audit and compute consolidation roadmap',
        'Design: Zone architecture with DRIVE Thor centralized compute',
        'Migrate: Software stack porting with NVIDIA reference software and tools',
        'Scale: OTA feature development, app ecosystem, subscription monetization',
      ],
    },
  },
];

// ============================================================
// MESSAGING FRAMEWORKS
// ============================================================

const MESSAGING_FRAMEWORKS = [
  {
    name: 'Core Value Proposition — NVIDIA Automotive',
    content:
      'NVIDIA provides the only end-to-end AI compute platform for the automotive industry — from training infrastructure (DGX) through simulation (DRIVE Sim) to in-vehicle deployment (DRIVE Orin/Thor) and factory digital twins (Omniverse). No other vendor offers this full-stack capability. OEMs who adopt the NVIDIA platform reduce development cycles by 50%, eliminate supplier fragmentation, and create a foundation for continuous software-defined vehicle improvement through OTA updates.',
  },
  {
    name: 'Enterprise Outreach Tone — NVIDIA',
    content:
      'Tone: Technical authority with partnership mindset. Reference specific compute metrics (TOPS, PFLOPS, inference latency) when relevant. Position NVIDIA as an enabling platform, not a replacement for OEM expertise. Use phrases like "accelerate your roadmap," "your engineers, our platform," "production-ready compute." Avoid: hype language, disparaging competitors directly, claiming NVIDIA is the only option. Let performance data speak.',
  },
  {
    name: 'Competitive Positioning — Automotive',
    content:
      'Against Qualcomm: Lead with consolidation (ADAS + cockpit on one chip). Emphasize full-stack advantage (training → simulation → deployment). Against Mobileye: Lead with openness and OEM IP ownership. Emphasize upgrade path (Orin → Thor). Against in-house silicon: Lead with time-to-market and proven safety certification path. Never disparage competitor hardware reliability. Never reference competitor customer losses by name. Always pivot to NVIDIA ecosystem advantages rather than competitor shortcomings.',
  },
  {
    name: 'Renewal Messaging — NVIDIA Automotive',
    content:
      'For DGX infrastructure renewals: Lead with utilization data and training throughput improvements. Reference new model architectures that benefit from H100 vs. A100. Quantify cost savings vs. cloud alternative. Position renewal as "infrastructure modernization" not "hardware refresh." For DRIVE platform renewals: Lead with software-defined value — new features delivered via OTA since last contract. Reference production vehicle deployments that validate the platform choice. Position as "platform continuity" not "license renewal."',
  },
  {
    name: 'Expansion Messaging — NVIDIA Automotive',
    content:
      'Cross-sell strategy: When a customer owns DGX, position DRIVE as "deploy what you train." When they own DRIVE Orin, position Thor as "the natural upgrade path for SDV." When they own any compute, position Omniverse as "the missing link between digital and physical." Upsell strategy: Always reference the full-stack cost advantage — customers who buy 3+ NVIDIA products get dedicated engineering support and preferential access to next-gen hardware. Land with one product, expand to full-stack within 24 months.',
  },
];

// ============================================================
// PLAY GOVERNANCE (NVIDIA-specific)
// ============================================================

const PLAY_GOVERNANCE = {
  maxDiscountPct: 12,
  multiYearDiscountPct: 8,
  earlyRenewalDiscountPct: 5,
  earlyRenewalWindowDays: 60,
  defaultCooldownDays: 7,
  maxWeeklyTouchesPerContact: 2,
  maxWeeklyTouchesPerAccount: 6,
  brandVoice:
    'Technical authority with partnership mindset. Reference specific compute metrics (TOPS, PFLOPS, inference latency) when relevant. Position NVIDIA as an enabling platform. Use "accelerate your roadmap," "your engineers, our platform," "production-ready compute." Avoid hype, avoid disparaging competitors directly.',
  valueNarrative:
    'NVIDIA is the only company that provides end-to-end AI compute for automotive — from DGX training infrastructure through DRIVE Sim validation to DRIVE Orin/Thor in-vehicle deployment and Omniverse factory digital twins. This full-stack approach reduces development cycles by 50%, eliminates multi-vendor integration complexity, and creates a foundation for continuous vehicle improvement through software updates.',
  renewalMessaging:
    'Lead with utilization data and ROI delivered since last contract. Reference new capabilities (H100 vs A100 performance, new DRIVE software features). Position renewal as platform continuity and modernization. Quantify cost savings vs cloud alternative for DGX.',
  expansionMessaging:
    'When customer owns one NVIDIA product, position the next as "deploy what you train" (DGX→DRIVE) or "simulate before you build" (any→Omniverse). Full-stack customers get dedicated engineering support and preferential next-gen access. Land with one, expand to full-stack in 24 months.',
  emailSignatureTemplate:
    'Best regards,\n{name}\nStrategic Account Executive, Automotive\nNVIDIA Corporation',
  competitiveRules: {
    Qualcomm: {
      approved: [
        'DRIVE Thor consolidates ADAS + cockpit on single SoC',
        'NVIDIA provides full-stack from training to deployment',
        '3x AI compute performance per watt for ADAS',
      ],
      prohibited: [
        'Do not claim Qualcomm chips are unreliable',
        'Do not reference specific Qualcomm customer losses',
        'Do not disparage Qualcomm 5G/connectivity',
      ],
    },
    Mobileye: {
      approved: [
        'NVIDIA DRIVE is fully open and programmable',
        'Clear upgrade path from L2+ through L5',
        'OEMs own their software IP with NVIDIA',
      ],
      prohibited: [
        'Do not reference Mobileye safety incidents',
        'Do not claim Mobileye is outdated',
        'Do not disparage Intel',
      ],
    },
  },
  expansionSkus: [
    { slug: 'drive-thor', name: 'DRIVE Thor', position: 'SDV centralized compute upgrade from Orin' },
    { slug: 'omniverse', name: 'Omniverse', position: 'Factory digital twin for manufacturing customers' },
    { slug: 'drive-concierge', name: 'DRIVE Concierge', position: 'Cockpit AI for infotainment customers' },
    { slug: 'nvidia-ai-enterprise', name: 'AI Enterprise', position: 'Platform software for DGX customers' },
  ],
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop()!;
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🚀 Starting NVIDIA/GM demo seed...');

  const user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) {
    console.log(
      `⚠️  User ${DEMO_USER_EMAIL} not found. Create the user first (sign in via Google OAuth), then re-run this seed.`
    );
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.email} (${user.id})`);
  const userId = user.id;

  // 1. Create NVIDIA CatalogProducts (8 products)
  console.log('📦 Creating NVIDIA products...');
  const productMap: Record<string, string> = {};
  for (const prod of NVIDIA_PRODUCTS) {
    const existing = await prisma.catalogProduct.findFirst({
      where: { userId, slug: prod.slug },
    });
    if (existing) {
      productMap[prod.slug] = existing.id;
      console.log(`  ↳ ${prod.name} (exists: ${existing.id})`);
      continue;
    }
    const created = await prisma.catalogProduct.create({
      data: {
        userId,
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        priceMin: prod.priceMin,
        priceMax: prod.priceMax,
        pricingModel: prod.pricingModel,
        targetDepartments: [],
        targetPersonas: [],
        useCases: [],
        contentTags: prod.category ? [prod.category] : [],
        relatedProducts: [], // set below after all products exist
      },
    });
    productMap[prod.slug] = created.id;
    console.log(`  ✅ ${prod.name} (${created.id})`);
  }

  // Build relatedProducts as array of { productId, productName, relationship }
  for (const prod of NVIDIA_PRODUCTS) {
    const rel = prod.relatedProducts as unknown as Record<string, string> | undefined;
    if (!rel || Object.keys(rel).length === 0) continue;
    const arr = Object.entries(rel).map(([slug, relationship]) => ({
      productId: productMap[slug],
      productName: NVIDIA_PRODUCTS.find((p) => p.slug === slug)?.name ?? slug,
      relationship,
    }));
    await prisma.catalogProduct.update({
      where: { id: productMap[prod.slug] },
      data: { relatedProducts: arr as object },
    });
  }

  // 1b. Seed product profiles (My Company → Products: no more "No profile")
  console.log('📋 Seeding product profiles...');
  for (const prod of NVIDIA_PRODUCTS) {
    const seed = PRODUCT_PROFILE_SEED[prod.slug];
    if (!seed) continue;
    const catalogProductId = productMap[prod.slug];
    if (!catalogProductId) continue;
    await prisma.productProfile.upsert({
      where: {
        catalogProductId_userId: { catalogProductId, userId },
      },
      create: {
        catalogProductId,
        userId,
        oneLiner: seed.oneLiner,
        elevatorPitch: seed.elevatorPitch,
        valueProps: seed.valueProps as object,
        painPoints: seed.painPoints as object,
        objectionHandlers: seed.objectionHandlers as object,
        competitivePositioning: seed.competitivePositioning as object,
        priceRangeText: seed.priceRangeText,
        salesCycle: seed.salesCycle,
        ...(seed.bestForDepartments && { bestForDepartments: seed.bestForDepartments as object }),
        ...(seed.bestForIndustries && { bestForIndustries: seed.bestForIndustries as object }),
        ...(seed.dealSizeSweetSpot && { dealSizeSweetSpot: seed.dealSizeSweetSpot }),
      },
      update: {
        oneLiner: seed.oneLiner,
        elevatorPitch: seed.elevatorPitch,
        valueProps: seed.valueProps as object,
        painPoints: seed.painPoints as object,
        objectionHandlers: seed.objectionHandlers as object,
        competitivePositioning: seed.competitivePositioning as object,
        priceRangeText: seed.priceRangeText,
        salesCycle: seed.salesCycle,
        ...(seed.bestForDepartments && { bestForDepartments: seed.bestForDepartments as object }),
        ...(seed.bestForIndustries && { bestForIndustries: seed.bestForIndustries as object }),
        ...(seed.dealSizeSweetSpot && { dealSizeSweetSpot: seed.dealSizeSweetSpot }),
      },
    });
  }
  console.log('   Product profiles created/updated for', NVIDIA_PRODUCTS.length, 'products.');

  // 2. Create GM company (live demo: isDemoAccount = false)
  console.log('🏢 Creating GM company...');
  let gmCompany = await prisma.company.findFirst({
    where: { userId, name: { contains: 'General Motors' } },
  });
  if (!gmCompany) {
    gmCompany = await prisma.company.create({
      data: {
        userId,
        name: 'General Motors',
        website: 'https://www.gm.com',
        domain: 'gm.com',
        industry: 'Automotive',
        isDemoAccount: false,
        revenue: '171000000000',
        employees: '167000',
        accountType: 'customer',
        headquarters: 'Detroit, MI',
        researchData: GM_RESEARCH_DATA as object,
      },
    });
  } else {
    await prisma.company.update({
      where: { id: gmCompany.id },
      data: {
        researchData: GM_RESEARCH_DATA as object,
        revenue: '171000000000',
        employees: '167000',
        accountType: 'customer',
        headquarters: 'Detroit, MI',
        isDemoAccount: false,
      },
    });
  }
  console.log(`✅ GM: ${gmCompany.id}`);
  const gmId = gmCompany.id;

  // 3. Create CompanyDepartment (5 buying groups)
  console.log('🏛️ Creating GM buying groups (CompanyDepartment)...');
  const deptIdByGroupName: Record<string, string> = {};
  for (const bg of GM_BUYING_GROUPS) {
    const existing = await prisma.companyDepartment.findFirst({
      where: { companyId: gmId, customName: bg.name },
    });
    const type = BUYING_GROUP_TYPE[bg.name] ?? 'OTHER';
    const payload = {
      companyId: gmId,
      type,
      customName: bg.name,
      status: DepartmentStatus.RESEARCH_PHASE,
      valueProp: bg.valueProps.join('\n'),
      objectionHandlers: bg.objectionHandlers as object,
      targetRoles: bg.targetRoles as object,
      estimatedOpportunity: bg.estimatedOpportunity,
    };
    if (existing) {
      await prisma.companyDepartment.update({ where: { id: existing.id }, data: payload });
      deptIdByGroupName[bg.name] = existing.id;
    } else {
      const created = await prisma.companyDepartment.create({ data: payload });
      deptIdByGroupName[bg.name] = created.id;
    }
  }
  console.log(`  ✅ 5 buying groups`);

  // 4. Create CompanyProduct for DGX (existing deployment, renewal trigger)
  console.log('📄 Creating GM CompanyProduct (DGX renewal)...');
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 85);
  const dgxCatalogId = productMap['dgx-systems'];
  if (dgxCatalogId) {
    const existingCP = await prisma.companyProduct.findFirst({
      where: { companyId: gmId, productId: dgxCatalogId },
    });
    if (!existingCP) {
      await prisma.companyProduct.create({
        data: {
          companyId: gmId,
          productId: dgxCatalogId,
          status: ProductOwnershipStatus.ACTIVE,
          contractStart: new Date('2022-06-01'),
          contractEnd: renewalDate,
          contractRenewalDate: renewalDate,
          arr: 2400000,
          opportunitySize: 8000000,
        },
      });
      console.log(`  ✅ DGX CompanyProduct created (renewal: ${renewalDate.toISOString().split('T')[0]})`);
    }
  }

  // 5. Create contacts (75 total, 15 per buying group) with companyDepartmentId
  console.log('👥 Creating GM contacts (75)...');
  let contactCount = 0;
  for (const bg of GM_BUYING_GROUPS) {
    const deptId = deptIdByGroupName[bg.name];
    for (const c of bg.contacts) {
      const email = `${c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}@gm-demo.agentpilot.us`;
      const contactWithUrl = c as { name: string; title: string; linkedinUrl?: string };
      const linkedinUrl =
        contactWithUrl.linkedinUrl ??
        `https://linkedin.com/in/${c.name.toLowerCase().replace(/\s+/g, '-')}-demo`;
      const { firstName, lastName } = splitName(c.name);
      const existing = await prisma.contact.findFirst({
        where: { companyId: gmId, email },
      });
      if (!existing) {
        await prisma.contact.create({
          data: {
            companyId: gmId,
            companyDepartmentId: deptId ?? undefined,
            firstName,
            lastName,
            email,
            title: c.title,
            department: bg.name,
            linkedinUrl,
            city: 'Detroit',
            state: 'MI',
            country: 'US',
          },
        });
        contactCount++;
      }
    }
  }
  console.log(`  ✅ ${contactCount} contacts created`);

  // 6. Create AccountSignals (url and publishedAt required)
  console.log('📡 Creating pre-seeded signals...');
  for (const sig of GM_SIGNALS) {
    const existing = await prisma.accountSignal.findFirst({
      where: { companyId: gmId, title: sig.title },
    });
    if (!existing) {
      await prisma.accountSignal.create({
        data: {
          companyId: gmId,
          userId,
          type: sig.type,
          title: sig.title,
          summary: sig.summary,
          url: '',
          publishedAt: new Date(),
          relevanceScore: sig.relevanceScore,
        },
      });
    }
  }
  console.log('  ✅ 3 signals created');

  // Clean up product-update noise from My Day (cron/pipeline may create these from CatalogProducts)
  const deletedProductSignals = await prisma.accountSignal.deleteMany({
    where: { userId, title: { startsWith: 'Product Update:' } },
  });
  if (deletedProductSignals.count > 0) {
    console.log(`  🧹 Cleaned up ${deletedProductSignals.count} product-update signals from My Day`);
  }

  // 7. Content Library
  console.log('📚 Creating Content Library items...');
  for (const item of CONTENT_LIBRARY_ITEMS) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: item.title },
    });
    if (!existing) {
      await prisma.contentLibrary.create({
        data: {
          userId,
          title: item.title,
          type: item.type,
          industry: item.industry ?? null,
          department: item.department ?? null,
          content: item.content as object,
          userConfirmed: true,
        },
      });
    }
  }
  console.log(`  ✅ ${CONTENT_LIBRARY_ITEMS.length} content items created`);

  // 8. Messaging Frameworks
  console.log('💬 Creating Messaging Frameworks...');
  for (const mf of MESSAGING_FRAMEWORKS) {
    const existing = await prisma.messagingFramework.findFirst({
      where: { userId, name: mf.name },
    });
    if (!existing) {
      await prisma.messagingFramework.create({
        data: {
          userId,
          name: mf.name,
          content: mf.content,
        },
      });
    }
  }
  console.log(`  ✅ ${MESSAGING_FRAMEWORKS.length} frameworks created`);

  // 9. Industry Playbook: Automotive
  console.log('📋 Creating Industry Playbook (Automotive)...');
  const playbookSlug = 'automotive-oem';
  const existingPb = await prisma.industryPlaybook.findFirst({
    where: { userId, slug: playbookSlug },
  });
  if (!existingPb) {
    await prisma.industryPlaybook.create({
      data: {
        userId,
        name: 'Automotive OEM',
        slug: playbookSlug,
        overview: 'NVIDIA DRIVE, DGX, and Omniverse for automotive OEMs: AV engineering, SDV, manufacturing digital twin, cockpit, and IT/ML infrastructure.',
        departmentProductMapping: GM_BUYING_GROUPS.map((bg) => ({
          department: bg.name,
          productIds: Object.entries(productMap)
            .filter(([slug]) => slug !== 'nvidia-ai-enterprise')
            .slice(0, 4)
            .map(([, id]) => id),
          typicalDealSize: bg.estimatedOpportunity,
        })) as object,
        landmines: ['Do not disparage Qualcomm or Mobileye by name in customer-facing content.', 'Do not reference competitor customer losses.'],
      },
    });
    console.log('  ✅ Automotive playbook created');
  }

  // 10. PlayGovernance
  console.log('🏛️ Setting PlayGovernance...');
  const existingGov = await prisma.playGovernance.findUnique({ where: { userId } });
  const govData = {
    ...PLAY_GOVERNANCE,
    competitiveRules: PLAY_GOVERNANCE.competitiveRules as object,
    expansionSkus: PLAY_GOVERNANCE.expansionSkus as object,
  };
  if (existingGov) {
    await prisma.playGovernance.update({
      where: { userId },
      data: govData,
    });
  } else {
    await prisma.playGovernance.create({
      data: { userId, ...govData },
    });
  }
  console.log('  ✅ PlayGovernance configured');

  // 11. Play templates + SignalPlayMapping + AccountPlayActivation (so "Work This" works)
  console.log('🎭 Ensuring play templates and signal→play rules for demo...');
  const NEW_CSuite_STEPS: Array<{ name: string; contentType: PlayContentType; channel: ContentChannel; contentGenerationType: string }> = [
    { name: 'Research contact', contentType: PlayContentType.INTERNAL_NOTE, channel: ContentChannel.INTERNAL, contentGenerationType: 'contact_research' },
    { name: 'Send congratulations email', contentType: PlayContentType.EMAIL, channel: ContentChannel.EMAIL, contentGenerationType: 'congratulations_email' },
    { name: 'Research background & tech stack', contentType: PlayContentType.BRIEF, channel: ContentChannel.INTERNAL, contentGenerationType: 'executive_briefing' },
    { name: 'LinkedIn connection note', contentType: PlayContentType.LINKEDIN_MSG, channel: ContentChannel.LINKEDIN, contentGenerationType: 'linkedin_connection_note' },
    { name: 'Schedule executive welcome briefing', contentType: PlayContentType.BRIEF, channel: ContentChannel.INTERNAL, contentGenerationType: 'meeting_agenda' },
    { name: 'Custom ROI assessment', contentType: PlayContentType.EMAIL, channel: ContentChannel.EMAIL, contentGenerationType: 'roi_assessment_email' },
    { name: 'Position as early win partner', contentType: PlayContentType.EMAIL, channel: ContentChannel.EMAIL, contentGenerationType: 'early_win_email' },
  ];
  const demoPlaySlugs = [
    { slug: 'executive-intro', name: 'New C-Suite Executive', category: PlayCategory.PROSPECTING, signalTypes: ['exec_hire'] },
    { slug: 'expansion-cross-sell', name: 'Budget Cycle Expansion', category: PlayCategory.EXPANSION, signalTypes: ['earnings_beat'] },
    { slug: 'competitive-displacement', name: 'Competitive Response', category: PlayCategory.COMPETITIVE, signalTypes: ['competitor_detected'] },
  ];
  const playTemplateIds: string[] = [];
  for (const spec of demoPlaySlugs) {
    let t = await prisma.playTemplate.findFirst({
      where: { userId, slug: spec.slug },
      select: { id: true },
    });
    if (!t) {
      t = await prisma.playTemplate.create({
        data: {
          userId,
          name: spec.name,
          description:
            spec.slug === 'executive-intro'
              ? '7-step executive intro: research contact, congratulations email, briefing, LinkedIn, meeting, ROI email, early win.'
              : `Demo play for ${spec.signalTypes[0]}. Run seed-plays for full template.`,
          slug: spec.slug,
          scope: PlayScope.ACCOUNT,
          category: spec.category,
          status: PlayTemplateStatus.ACTIVE,
          triggerType: PlayTriggerType.SIGNAL,
          signalTypes: spec.signalTypes,
        },
      });
      const phase = await prisma.playPhaseTemplate.create({
        data: {
          playTemplateId: t.id,
          orderIndex: 0,
          name: 'Outreach',
          gateType: PhaseGateType.MANUAL,
        },
      });
      if (spec.slug === 'executive-intro') {
        for (let i = 0; i < NEW_CSuite_STEPS.length; i++) {
          const step = NEW_CSuite_STEPS[i];
          await prisma.contentTemplate.create({
            data: {
              userId,
              phaseTemplateId: phase.id,
              name: step.name,
              contentType: step.contentType,
              channel: step.channel,
              contentGenerationType: step.contentGenerationType,
              modelTier: ModelTier.SONNET,
              orderIndex: i,
              contextSources: ['crm_opportunity', 'governance', 'company_news'],
              promptTemplate: `{{account.name}} {{contact.name}} {{signal.summary}}. {{governance.valueNarrative}}`,
            },
          });
        }
        console.log('  ✅ Created New C-Suite Executive (7 steps, ordered)');
      } else {
        await prisma.contentTemplate.create({
          data: {
            userId,
            phaseTemplateId: phase.id,
            name: `${spec.name} step`,
            contentType: PlayContentType.EMAIL,
            channel: ContentChannel.EMAIL,
            modelTier: ModelTier.SONNET,
            contextSources: ['crm_opportunity', 'governance'],
            promptTemplate: `Draft outreach for {{account.name}}. {{governance.valueNarrative}}`,
          },
        });
        console.log(`  ✅ Created minimal play: ${spec.name}`);
      }
    }
    playTemplateIds.push(t.id);
  }

  // 4th play: Expansion DGX → DRIVE Thor (upsell demo, MANUAL trigger, 2 phases so step 3 is Day +3)
  let expansionThor = await prisma.playTemplate.findFirst({
    where: { userId, slug: 'expansion-dgx-to-drive-thor' },
    select: { id: true },
  });
  if (!expansionThor) {
    expansionThor = await prisma.playTemplate.create({
      data: {
        userId,
        name: 'Expansion: DGX to DRIVE Thor',
        description:
          'Upsell play: contact sweep of buying group, webinar invite, then DRIVE Thor spec to champion. GM uses DGX; expand to DRIVE Thor.',
        slug: 'expansion-dgx-to-drive-thor',
        scope: PlayScope.ACCOUNT,
        category: PlayCategory.EXPANSION,
        status: PlayTemplateStatus.ACTIVE,
        triggerType: PlayTriggerType.MANUAL,
        signalTypes: [],
      },
      select: { id: true },
    });
    const phaseOutreach = await prisma.playPhaseTemplate.create({
      data: {
        playTemplateId: expansionThor.id,
        orderIndex: 0,
        name: 'Outreach',
        offsetDays: 0,
        gateType: PhaseGateType.MANUAL,
      },
    });
    const phaseFollowUp = await prisma.playPhaseTemplate.create({
      data: {
        playTemplateId: expansionThor.id,
        orderIndex: 1,
        name: 'Follow-up',
        offsetDays: 3,
        gateType: PhaseGateType.MANUAL,
      },
    });
    await prisma.contentTemplate.create({
      data: {
        userId,
        phaseTemplateId: phaseOutreach.id,
        name: 'Contact sweep: buying group',
        contentType: PlayContentType.INTERNAL_NOTE,
        channel: ContentChannel.INTERNAL,
        contentGenerationType: 'contact_research',
        modelTier: ModelTier.SONNET,
        orderIndex: 0,
        contextSources: ['crm_opportunity', 'governance', 'company_news'],
        promptTemplate: `{{account.name}} {{division.name}}. {{governance.expansionMessaging}}`,
      },
    });
    await prisma.contentTemplate.create({
      data: {
        userId,
        phaseTemplateId: phaseOutreach.id,
        name: 'Send webinar invite',
        contentType: PlayContentType.EMAIL,
        channel: ContentChannel.EMAIL,
        contentGenerationType: 'event_invitation_email',
        modelTier: ModelTier.SONNET,
        orderIndex: 1,
        contextSources: ['crm_opportunity', 'governance', 'company_news'],
        promptTemplate: `{{account.name}} {{contact.name}}. {{governance.valueNarrative}}`,
      },
    });
    await prisma.contentTemplate.create({
      data: {
        userId,
        phaseTemplateId: phaseFollowUp.id,
        name: 'Send DRIVE Thor spec to champion',
        contentType: PlayContentType.EMAIL,
        channel: ContentChannel.EMAIL,
        contentGenerationType: 'value_prop_email',
        modelTier: ModelTier.SONNET,
        orderIndex: 0,
        contextSources: ['crm_opportunity', 'governance', 'company_news'],
        promptTemplate: `{{account.name}} {{contact.name}} {{governance.expansionMessaging}}`,
      },
    });
    console.log('  ✅ Created Expansion: DGX to DRIVE Thor (2 phases, 3 steps)');
  }
  playTemplateIds.push(expansionThor.id);

  const roadmapObjective = {
    goalText: '14 new use cases across 5 buying groups',
    metric: { type: 'use_cases', targetCount: 14 },
    timeHorizon: 'quarter',
    successDefinition: 'At least one new use case landed in each of the 5 buying groups.',
  } as const;

  let roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId: gmId },
    select: { id: true },
  });
  if (!roadmap) {
    roadmap = await prisma.adaptiveRoadmap.create({
      data: {
        userId,
        companyId: gmId,
        roadmapType: 'enterprise_expansion',
        objective: roadmapObjective as unknown as Prisma.InputJsonValue,
      },
    });
    console.log('  ✅ Created GM Strategic Account Plan (roadmap)');
  } else {
    await prisma.adaptiveRoadmap.update({
      where: { id: roadmap.id },
      data: { objective: roadmapObjective as unknown as Prisma.InputJsonValue },
    });
    console.log('  ✅ Updated GM roadmap objective');
  }

  // RoadmapTarget + RoadmapContact for GM AV Engineering (so "Work This" gets Shelly Chaka as targetContact)
  const avDeptId = deptIdByGroupName['Autonomous Vehicle Engineering'];
  if (avDeptId && roadmap?.id) {
    let avTarget = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id, companyDepartmentId: avDeptId },
      select: { id: true },
    });
    if (!avTarget) {
      avTarget = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'division',
          name: 'AV Engineering',
          companyId: gmId,
          companyDepartmentId: avDeptId,
        },
        select: { id: true },
      });
      console.log('  ✅ RoadmapTarget: AV Engineering');
    }
    const shellyChaka = await prisma.contact.findFirst({
      where: { companyId: gmId, firstName: 'Shelly', lastName: 'Chaka' },
      select: { id: true },
    });
    if (shellyChaka && avTarget) {
      const existingRc = await prisma.roadmapContact.findFirst({
        where: { targetId: avTarget.id, contactId: shellyChaka.id },
      });
      if (!existingRc) {
        await prisma.roadmapContact.create({
          data: {
            targetId: avTarget.id,
            contactId: shellyChaka.id,
            personaRole: 'Decision Maker',
            connectionStatus: 'identified',
          },
        });
        console.log('  ✅ RoadmapContact: Shelly Chaka → AV Engineering');
      } else {
        await prisma.roadmapContact.updateMany({
          where: { targetId: avTarget.id, contactId: shellyChaka.id },
          data: { personaRole: 'Decision Maker' },
        });
      }
    }
  }

  // Champion personas + RoadmapContact for upsell demo (Frank = Champion, Shelly = Decision Maker, Sarah = Technical Evaluator)
  const championPersona = await prisma.persona.upsert({
    where: { name: 'Champion' },
    create: {
      name: 'Champion',
      description: 'Executive sponsor or internal champion with budget authority.',
      includeTitles: [],
      excludeTitles: [],
      secondaryDepartments: [],
      painPoints: [],
      successMetrics: [],
      contentTypes: [],
      preferredChannels: [],
    },
    update: {},
    select: { id: true },
  });
  const decisionMakerPersona = await prisma.persona.upsert({
    where: { name: 'Decision Maker' },
    create: {
      name: 'Decision Maker',
      description: 'Key decision maker for the buying group.',
      includeTitles: [],
      excludeTitles: [],
      secondaryDepartments: [],
      painPoints: [],
      successMetrics: [],
      contentTypes: [],
      preferredChannels: [],
    },
    update: {},
    select: { id: true },
  });
  const technicalEvaluatorPersona = await prisma.persona.upsert({
    where: { name: 'Technical Evaluator' },
    create: {
      name: 'Technical Evaluator',
      description: 'Technical evaluator or gatekeeper.',
      includeTitles: [],
      excludeTitles: [],
      secondaryDepartments: [],
      painPoints: [],
      successMetrics: [],
      contentTypes: [],
      preferredChannels: [],
    },
    update: {},
    select: { id: true },
  });
  const frankMorrison = await prisma.contact.findFirst({
    where: { companyId: gmId, firstName: 'Frank', lastName: 'Morrison' },
    select: { id: true },
  });
  const shellyChakaForPersona = await prisma.contact.findFirst({
    where: { companyId: gmId, firstName: 'Shelly', lastName: 'Chaka' },
    select: { id: true },
  });
  const sarahWilliams = await prisma.contact.findFirst({
    where: { companyId: gmId, firstName: 'Sarah', lastName: 'Williams' },
    select: { id: true },
  });
  if (frankMorrison) {
    await prisma.contact.update({
      where: { id: frankMorrison.id },
      data: { personaId: championPersona.id },
    });
  }
  if (shellyChakaForPersona) {
    await prisma.contact.update({
      where: { id: shellyChakaForPersona.id },
      data: { personaId: decisionMakerPersona.id },
    });
  }
  if (sarahWilliams) {
    await prisma.contact.update({
      where: { id: sarahWilliams.id },
      data: { personaId: technicalEvaluatorPersona.id },
    });
  }
  const itDeptId = deptIdByGroupName['IT Infrastructure & ML Platform'];
  if (itDeptId && roadmap?.id) {
    let itTarget = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id, companyDepartmentId: itDeptId },
      select: { id: true },
    });
    if (!itTarget) {
      itTarget = await prisma.roadmapTarget.create({
        data: {
          roadmapId: roadmap.id,
          targetType: 'division',
          name: 'IT Infrastructure',
          companyId: gmId,
          companyDepartmentId: itDeptId,
        },
        select: { id: true },
      });
      console.log('  ✅ RoadmapTarget: IT Infrastructure');
    }
    if (frankMorrison && itTarget) {
      const existingFrankRc = await prisma.roadmapContact.findFirst({
        where: { targetId: itTarget.id, contactId: frankMorrison.id },
      });
      if (!existingFrankRc) {
        await prisma.roadmapContact.create({
          data: {
            targetId: itTarget.id,
            contactId: frankMorrison.id,
            personaRole: 'Champion',
            connectionStatus: 'engaged',
          },
        });
        console.log('  ✅ RoadmapContact: Frank Morrison → IT Infrastructure (Champion)');
      }
    }
  }
  if (roadmap?.id && deptIdByGroupName['Autonomous Vehicle Engineering'] && sarahWilliams) {
    const avTargetForSarah = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id, companyDepartmentId: deptIdByGroupName['Autonomous Vehicle Engineering'] },
      select: { id: true },
    });
    if (avTargetForSarah) {
      const existingSarahRc = await prisma.roadmapContact.findFirst({
        where: { targetId: avTargetForSarah.id, contactId: sarahWilliams.id },
      });
      if (!existingSarahRc) {
        await prisma.roadmapContact.create({
          data: {
            targetId: avTargetForSarah.id,
            contactId: sarahWilliams.id,
            personaRole: 'Technical Evaluator',
            connectionStatus: 'identified',
          },
        });
        console.log('  ✅ RoadmapContact: Sarah Williams → AV Engineering (Technical Evaluator)');
      }
    }
  }
  if (frankMorrison || shellyChakaForPersona || sarahWilliams) {
    console.log('  ✅ Champion personas: Frank (Champion), Shelly (Decision Maker), Sarah (Technical Evaluator)');
  }

  // Replace demo signal→play rows so we never keep stale playTemplateIds (upsert unique is per-template; old rows could orphan)
  const demoSignalTypes = ['exec_hire', 'earnings_beat', 'competitor_detected'] as const;
  await prisma.signalPlayMapping.deleteMany({
    where: { userId, signalType: { in: [...demoSignalTypes] } },
  });
  const signalMappings: Array<{ signalType: string; playTemplateId: string }> = [
    { signalType: 'exec_hire', playTemplateId: playTemplateIds[0] },
    { signalType: 'earnings_beat', playTemplateId: playTemplateIds[1] },
    { signalType: 'competitor_detected', playTemplateId: playTemplateIds[2] },
  ];
  for (const m of signalMappings) {
    await prisma.signalPlayMapping.create({
      data: {
        userId,
        signalType: m.signalType,
        playTemplateId: m.playTemplateId,
        autoActivate: false,
        priority: ActionPriority.MEDIUM,
      },
    });
  }
  console.log('  ✅ SignalPlayMappings (fresh): exec_hire → New C-Suite Executive, earnings_beat → Budget Cycle, competitor_detected → Competitive Response');

  for (const playTemplateId of playTemplateIds) {
    await prisma.accountPlayActivation.upsert({
      where: {
        roadmapId_playTemplateId: { roadmapId: roadmap.id, playTemplateId },
      },
      create: { roadmapId: roadmap.id, playTemplateId, isActive: true },
      update: {},
    });
  }
  console.log('  ✅ AccountPlayActivations: 4 plays active for GM roadmap');

  // Pre-seeded content for the 7-step New C-Suite Executive (matched by step name so order doesn't matter).
  // Step 0 = "Research contact" — keep in sync with DEMO_STEP_1_BODY in app/api/demo/run-play/route.ts (step 1 created pre-completed in demo).
  const PRE_SEEDED_CONTENT: Array<{ stepIndex: number; channel: string; subject?: string; body: string }> = [
    {
      stepIndex: 0,
      channel: 'internal',
      body: `Check contact database for Shelly Chaka. Enrich with verified email and LinkedIn.`,
    },
    {
      stepIndex: 1,
      channel: 'email',
      subject: 'Congrats on the expanded role, Shelly',
      body: `Shelly,

Congrats on taking the lead of GM's AV Engineering group. Given what you built at Cruise — especially the safety case framework and the validation infrastructure — this is the right move at the right time for GM.

I know the Cruise restructuring was a tough chapter, but the work your team did on simulation-based validation and regulatory compliance is exactly what GM needs as they push toward eyes-off driving for the 2028 Escalade IQ.

You may have seen that Jensen and Mary Barra announced an expanded NVIDIA-GM partnership at GTC last month — AI for manufacturing, enterprise, and in-car. On the AV side, DRIVE Thor at 2000 TOPS is where the safety-certified compute conversation is heading.

No pitch — just wanted to say congrats and connect. Frank Morrison on your IT side has been a great partner on the DGX infrastructure, happy to make that intro if helpful.

Best,
Sarah Kim
Strategic Account Director, Automotive
NVIDIA`,
    },
    {
      stepIndex: 2,
      channel: 'internal',
      body: `Executive Brief: Shelly Chaka / GM AV Engineering

Key points:
- Built Cruise's safety case from scratch. Thinks in safety frameworks, not feature specs. Lead with DRIVE's safety architecture and ASIL-D certification path.
- Cruise used custom silicon — that investment is gone. She needs production-ready, safety-certified compute.
- GM-NVIDIA expanded partnership at GTC March 2025. Not a cold intro.
- Qualcomm has 2027 ADAS L2+. Position Thor as L3+ safety-certified layer — her wheelhouse.
- GM eyes-off driving: 2028 Cadillac Escalade IQ. She owns the safety validation path.

Talk track: Cruise safety expertise → DRIVE Thor safety architecture → DRIVE Sim validation → GTC invite.`,
    },
    {
      stepIndex: 3,
      channel: 'linkedin',
      body: `Shelly — Congrats on the expanded AV role at GM. Your safety validation work at Cruise set the standard. I'm on the DRIVE platform side at NVIDIA — with the expanded GM partnership, I'd love to connect. — Sarah`,
    },
    {
      stepIndex: 4,
      channel: 'internal',
      subject: 'NVIDIA × GM AV: Safety-Certified Compute Discussion',
      body: `Meeting: NVIDIA × GM AV Safety & Compute Architecture
Duration: 45 min | 3 days out
Attendees: Shelly Chaka (GM), Sarah Kim (NVIDIA), Raj Patel (NVIDIA AV Solutions Architect)

Agenda:
1. Shelly's priorities for GM AV safety certification (15 min)
2. DRIVE Thor safety architecture — ASIL-D, lockstep cores (15 min)
3. DRIVE Sim for simulation-based validation (10 min)
4. GTC invite + next steps (5 min)

Notes: Lead with safety architecture, not TOPS. Have Mercedes L3 certification case study ready.`,
    },
    {
      stepIndex: 5,
      channel: 'email',
      subject: 'DRIVE Thor — safety certification ROI for GM AV',
      body: `Shelly,

Quick framework for GM's AV safety certification path:

Certification timeline: Mercedes achieved L3 across 5 markets with DRIVE + DRIVE Sim. 60% faster. Thor's enhanced safety architecture (ASIL-D, lockstep cores, safety island) supports GM's 2028 eyes-off timeline.

Simulation: DRIVE Sim does 1M+ simulated miles/day. For the safety case you're building, that's edge case validation at a pace physical testing can't match.

Consolidation: Thor handles ADAS + cockpit + safety monitoring on one SoC. Fewer interfaces, fewer failure modes, one validation target.

GTC Automotive AI Summit May 18 has a dedicated AV safety certification session. I'll send an invite.

Best,
Sarah`,
    },
    {
      stepIndex: 6,
      channel: 'email',
      subject: 'Quick wins for your first 90 days',
      body: `Shelly,

What gets you a concrete result in Q1:

Safety architecture review: Joint session — DRIVE Thor's ASIL-D architecture mapped against GM's SAFE-ADS framework. Half-day, your team and ours.

DRIVE Sim pilot: 30-day access. Run your existing safety scenarios, compare coverage and throughput. No commitment.

Your contact: Raj Patel (AV Solutions Architect). Worked with Mercedes on L3 certification, knows the regulatory path.

Also saving you a seat at the GTC executive dinner (May 18, San Jose). Small group, OEM safety leadership. Given your SAE Breed Award, you'd be among peers.

Best,
Sarah`,
    },
  ];

  const STEP_NAMES = [
    'Research contact',
    'Send congratulations email',
    'Research background & tech stack',
    'LinkedIn connection note',
    'Schedule executive welcome briefing',
    'Custom ROI assessment',
    'Position as early win partner',
  ];
  const STEP_NAME_TO_CONTENT: Record<string, { subject?: string; body: string }> = {};
  for (let i = 0; i < STEP_NAMES.length && i < PRE_SEEDED_CONTENT.length; i++) {
    STEP_NAME_TO_CONTENT[STEP_NAMES[i].toLowerCase()] = {
      subject: PRE_SEEDED_CONTENT[i].subject,
      body: PRE_SEEDED_CONTENT[i].body,
    };
  }

  /** Apply pre-seeded content to actions by matching action title to step name (e.g. "Research contact — Shelly Chaka"). */
  async function applyPreSeededContentToActions(playRunId: string): Promise<number> {
    const allActions = await prisma.playAction.findMany({
      where: { phaseRun: { playRunId } },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
    let seededCount = 0;
    for (const action of allActions) {
      const titleLower = (action.title ?? '').toLowerCase();
      const matched = Object.entries(STEP_NAME_TO_CONTENT).find(
        ([stepName]) => titleLower.startsWith(stepName) || titleLower.includes(stepName),
      );
      if (matched) {
        const [, content] = matched;
        await prisma.playAction.update({
          where: { id: action.id },
          data: {
            generatedSubject: content.subject ?? null,
            generatedContent: content.body,
            generatedAt: new Date(),
          },
        });
        seededCount++;
      }
    }
    return seededCount;
  }

  /** Mark as EXECUTED the first 3 steps (by step name order) for the mid-progress demo. */
  async function markFirstThreeStepsExecuted(playRunId: string): Promise<void> {
    const allActions = await prisma.playAction.findMany({
      where: { phaseRun: { playRunId } },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
    const firstThreePrefixes = STEP_NAMES.slice(0, 3).map((s) => s.toLowerCase());
    for (const action of allActions) {
      const titleLower = (action.title ?? '').toLowerCase();
      if (firstThreePrefixes.some((prefix) => titleLower.startsWith(prefix) || titleLower.includes(prefix))) {
        await prisma.playAction.update({
          where: { id: action.id },
          data: { status: 'EXECUTED' as const, executedAt: new Date() },
        });
      }
    }
  }

  // Mid-progress PlayRun for Act 2 My Day (one run at "Step 4 of 7" so action queue shows in-progress)
  const execIntroTemplateId = playTemplateIds[0];
  const existingMidProgressRun = await prisma.playRun.findFirst({
    where: { companyId: gmId, userId, playTemplateId: execIntroTemplateId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!existingMidProgressRun && avDeptId && roadmap?.id) {
    try {
      const avTargetForRun = await prisma.roadmapTarget.findFirst({
        where: { roadmapId: roadmap.id, companyDepartmentId: avDeptId },
        select: { id: true },
      });
      const shellyChakaForRun = await prisma.contact.findFirst({
        where: { companyId: gmId, firstName: 'Shelly', lastName: 'Chaka' },
        select: { id: true, firstName: true, lastName: true, email: true, title: true },
      });
      if (avTargetForRun && shellyChakaForRun) {
        const { createPlayRunFromTemplate } = await import('@/lib/plays/create-play-run');
        const targetContact = {
          name: `${shellyChakaForRun.firstName} ${shellyChakaForRun.lastName}`.trim(),
          email: shellyChakaForRun.email,
          title: shellyChakaForRun.title,
        };
        const midRun = await createPlayRunFromTemplate({
          userId,
          companyId: gmId,
          playTemplateId: execIntroTemplateId,
          targetContact,
          roadmapTargetId: avTargetForRun.id,
          triggerType: 'SIGNAL',
          triggerContext: { signalSummary: 'GM Promotes Shelly Chaka to VP AV Engineering (ex-Cruise CSO)' },
        });
        const seededCount = await applyPreSeededContentToActions(midRun.id);
        await markFirstThreeStepsExecuted(midRun.id);
        console.log(`  ✅ Mid-progress PlayRun created (3 steps executed) + pre-seeded content on ${seededCount}/7 actions (matched by name)`);
      }
    } catch (e) {
      console.warn('  ⚠️ Mid-progress PlayRun skipped (optional):', e instanceof Error ? e.message : e);
    }
  } else if (existingMidProgressRun) {
    try {
      const seededCount = await applyPreSeededContentToActions(existingMidProgressRun.id);
      console.log(`  ✅ Pre-seeded content applied to existing mid-progress run (${seededCount}/7 actions, matched by name)`);
    } catch (e) {
      console.warn('  ⚠️ Backfill pre-seeded content skipped:', e instanceof Error ? e.message : e);
    }
  }

  // ---------- Analytics: "months of usage" data for demo ----------
  try {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // 1. Backdate contact createdAt for ~25 contacts across 5 buying groups (12–16 weeks ago)
    const gmContacts = await prisma.contact.findMany({
      where: { companyId: gmId },
      select: { id: true, companyDepartmentId: true },
      orderBy: { createdAt: 'asc' },
    });
    const perDept = 5;
    const toBackdate: { id: string }[] = [];
    const byDept = new Map<string, typeof gmContacts>();
    for (const c of gmContacts) {
      const key = c.companyDepartmentId ?? 'none';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key)!.push(c);
    }
    for (const [, list] of byDept) {
      for (let i = 0; i < perDept && i < list.length; i++) toBackdate.push(list[i]);
    }
    for (let i = 0; i < toBackdate.length; i++) {
      const weeksAgo = 12 + (i % 5);
      const createdAt = new Date(now.getTime() - weeksAgo * 7 * oneDayMs);
      await prisma.contact.update({
        where: { id: toBackdate[i].id },
        data: { createdAt },
      });
    }
    console.log(`  ✅ Backdated createdAt for ${toBackdate.length} GM contacts (12–16 weeks)`);

    // 2. Seed Activity (email sent, opens, clicks) over last 3–4 months; link to contacts for engagement
    const contactsForActivity = await prisma.contact.findMany({
      where: { companyId: gmId },
      select: { id: true, email: true, companyDepartmentId: true },
      take: 20,
    });
    const activityContactIds = contactsForActivity.map((c) => c.id);
    const baseDate = new Date(now.getTime() - 90 * oneDayMs);
    const activities: Array<{
      companyId: string;
      userId: string;
      type: string;
      summary: string;
      contactId: string | null;
      companyDepartmentId: string | null;
      createdAt: Date;
    }> = [];
    for (let i = 0; i < 55; i++) {
      const contact = contactsForActivity[i % contactsForActivity.length];
      const daysOffset = Math.floor((i / 55) * 90) + Math.floor(Math.random() * 5);
      const createdAt = new Date(baseDate.getTime() + daysOffset * oneDayMs);
      activities.push({
        companyId: gmId,
        userId,
        type: 'EMAIL_SENT',
        summary: 'Outreach email',
        contactId: contact.id,
        companyDepartmentId: contact.companyDepartmentId,
        createdAt,
      });
    }
    for (let i = 0; i < 32; i++) {
      const contact = contactsForActivity[i % contactsForActivity.length];
      const daysOffset = Math.floor((i / 32) * 90) + Math.floor(Math.random() * 3);
      const createdAt = new Date(baseDate.getTime() + daysOffset * oneDayMs);
      activities.push({
        companyId: gmId,
        userId,
        type: 'EmailOpen',
        summary: 'Email opened',
        contactId: contact.id,
        companyDepartmentId: contact.companyDepartmentId,
        createdAt,
      });
    }
    for (let i = 0; i < 18; i++) {
      const contact = contactsForActivity[i % contactsForActivity.length];
      const daysOffset = Math.floor((i / 18) * 90) + Math.floor(Math.random() * 2);
      const createdAt = new Date(baseDate.getTime() + daysOffset * oneDayMs);
      activities.push({
        companyId: gmId,
        userId,
        type: 'EmailClick',
        summary: 'Link clicked',
        contactId: contact.id,
        companyDepartmentId: contact.companyDepartmentId,
        createdAt,
      });
    }
    for (const a of activities) {
      await prisma.activity.create({
        data: {
          companyId: a.companyId,
          userId: a.userId,
          type: a.type,
          summary: a.summary,
          contactId: a.contactId,
          companyDepartmentId: a.companyDepartmentId,
          createdAt: a.createdAt,
        },
      });
    }
    console.log(`  ✅ Seeded ${activities.length} Activity rows (email sent/opens/clicks) over last 90 days`);

    // 3. Update Contact engagement aggregates for contacts that received activity
    for (const c of contactsForActivity) {
      const sent = activities.filter((x) => x.contactId === c.id && x.type === 'EMAIL_SENT').length;
      const opened = activities.filter((x) => x.contactId === c.id && x.type === 'EmailOpen').length;
      const clicked = activities.filter((x) => x.contactId === c.id && x.type === 'EmailClick').length;
      const lastSent = activities
        .filter((x) => x.contactId === c.id && x.type === 'EMAIL_SENT')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const lastOpen = activities
        .filter((x) => x.contactId === c.id && x.type === 'EmailOpen')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      await prisma.contact.update({
        where: { id: c.id },
        data: {
          totalEmailsSent: sent,
          totalEmailsOpened: opened,
          totalEmailsClicked: clicked,
          lastContactedAt: lastSent?.createdAt ?? null,
          lastEmailOpenedAt: lastOpen?.createdAt ?? null,
        },
      });
    }
    console.log(`  ✅ Updated Contact engagement aggregates for ${contactsForActivity.length} contacts`);

    // 4. Create additional PlayRuns with past activatedAt (2 completed, 1 active) for analytics
    const { createPlayRunFromTemplate } = await import('@/lib/plays/create-play-run');
    const frankMorrison = await prisma.contact.findFirst({
      where: { companyId: gmId, firstName: 'Frank', lastName: 'Morrison' },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
    });
    const sarahWilliams = await prisma.contact.findFirst({
      where: { companyId: gmId, firstName: 'Sarah', lastName: 'Williams' },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
    });
    const katherineBrooks = await prisma.contact.findFirst({
      where: { companyId: gmId, firstName: 'Katherine', lastName: 'Brooks' },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
    });
    const avTargetForRuns = roadmap?.id
      ? await prisma.roadmapTarget.findFirst({
          where: { roadmapId: roadmap.id, companyDepartmentId: avDeptId! },
          select: { id: true },
        })
      : null;
    const runCandidates = [
      { contact: frankMorrison, weeksAgo: 10, complete: true },
      { contact: sarahWilliams, weeksAgo: 7, complete: true },
      { contact: katherineBrooks, weeksAgo: 4, complete: false },
    ].filter((r) => r.contact && avTargetForRuns);
    for (const { contact, weeksAgo, complete } of runCandidates) {
      if (!contact) continue;
      const targetContact = {
        name: [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(),
        email: contact.email,
        title: contact.title,
      };
      const run = await createPlayRunFromTemplate({
        userId,
        companyId: gmId,
        playTemplateId: execIntroTemplateId,
        targetContact,
        roadmapTargetId: avTargetForRuns!.id,
        triggerType: 'MANUAL',
        triggerContext: { reason: 'Analytics seed' },
      });
      const activatedAt = new Date(now.getTime() - weeksAgo * 7 * oneDayMs);
      const completedAt = complete ? new Date(activatedAt.getTime() + 5 * oneDayMs) : null;
      await prisma.playRun.update({
        where: { id: run.id },
        data: {
          activatedAt,
          createdAt: activatedAt,
          updatedAt: completedAt ?? activatedAt,
          ...(complete ? { status: 'COMPLETED' as const, completedAt } : {}),
        },
      });
      const actions = await prisma.playAction.findMany({
        where: { phaseRun: { playRunId: run.id } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      for (let j = 0; j < actions.length; j++) {
        const executedAt = new Date(activatedAt.getTime() + (j + 1) * oneDayMs);
        await prisma.playAction.update({
          where: { id: actions[j].id },
          data: { status: 'EXECUTED' as const, executedAt },
        });
      }
      if (complete) {
        const phaseRuns = await prisma.playPhaseRun.findMany({
          where: { playRunId: run.id },
          select: { id: true },
        });
        for (const pr of phaseRuns) {
          await prisma.playPhaseRun.update({
            where: { id: pr.id },
            data: { status: 'COMPLETED' as const, completedAt: activatedAt },
          });
        }
      }
    }
    console.log(`  ✅ Created ${runCandidates.length} historical PlayRuns (past 4–10 weeks)`);

    // 5. Optional: one SegmentCampaign + CampaignVisit for landing page performance
    const existingCampaign = await prisma.segmentCampaign.findFirst({
      where: { companyId: gmId, userId },
      select: { id: true },
    });
    if (!existingCampaign) {
      const slug = `gm-drive-thor-${Date.now().toString(36)}`;
      const campaign = await prisma.segmentCampaign.create({
        data: {
          userId,
          companyId: gmId,
          departmentId: avDeptId ?? undefined,
          slug,
          title: 'GM — DRIVE Thor Intro',
          description: 'Landing page for DRIVE Thor intro',
          url: `https://example.com/go/${slug}`,
          type: 'landing_page',
          pageType: 'sales_page',
          status: 'live',
        },
      });
      const visitEmails = contactsForActivity.slice(0, 10).map((c) => c.email).filter(Boolean) as string[];
      for (let i = 0; i < 35; i++) {
        const daysAgo = 80 - (i % 80);
        const visitedAt = new Date(now.getTime() - daysAgo * oneDayMs);
        await prisma.campaignVisit.create({
          data: {
            campaignId: campaign.id,
            departmentId: avDeptId ?? undefined,
            visitedAt,
            sessionId: `seed-session-${i}`,
            visitorEmail: visitEmails[i % visitEmails.length] ?? undefined,
            chatMessages: i % 3 === 0 ? 2 : 0,
            ctaClicked: i % 5 === 0,
          },
        });
      }
      console.log('  ✅ Created 1 SegmentCampaign + 35 CampaignVisits for landing page analytics');
    }
  } catch (e) {
    console.warn('  ⚠️ Analytics seed (months-of-usage data) skipped:', e instanceof Error ? e.message : e);
  }

  console.log('\n========================================');
  console.log('🎉 NVIDIA/GM Demo Seed Complete!');
  console.log('========================================');
  console.log(`User: ${DEMO_USER_EMAIL}`);
  console.log(`Products: ${Object.keys(productMap).length}`);
  console.log(`GM Company: ${gmId} (isDemoAccount: false)`);
  console.log(`Buying groups: 5`);
  console.log(`Contacts: ${contactCount} created`);
  console.log(`Signals: ${GM_SIGNALS.length}`);
  console.log(`Content Library: ${CONTENT_LIBRARY_ITEMS.length}`);
  console.log(`Messaging Frameworks: ${MESSAGING_FRAMEWORKS.length}`);
  console.log(`Industry Playbook: Automotive`);
  console.log(`PlayGovernance: ✅`);
  console.log(`DGX Renewal: T-85`);
  console.log('\nOptional next steps:');
  console.log('- Generate AI Product Profiles (My Company → Products → Generate with AI)');
  console.log('- Run Exa signal fetch and play-timeline-triggers crons if needed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

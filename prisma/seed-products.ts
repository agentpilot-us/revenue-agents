import { DepartmentType } from '@prisma/client';
import { prisma } from '../lib/db';

const products = [
  {
    name: 'NVIDIA DRIVE Platform',
    slug: 'drive-platform',
    description:
      'End-to-end platform for autonomous vehicle development, from data collection to deployment',
    priceMin: 300000,
    priceMax: 2000000,
    pricingModel: 'annual-license',
    targetDepartments: [DepartmentType.AUTONOMOUS_VEHICLES],
    targetPersonas: [
      'VP Autonomous Vehicles',
      'Director AV Engineering',
      'Chief Technology Officer',
      'Head of Self-Driving',
    ],
    useCases: [
      'autonomous-driving',
      'adas-development',
      'sensor-fusion',
      'av-simulation',
      'perception-ai',
    ],
    contentTags: [
      'autonomous-vehicles',
      'self-driving',
      'adas',
      'safety-validation',
      'level-4-autonomy',
    ],
  },

  {
    name: 'NVIDIA Jetson (Edge AI)',
    slug: 'jetson-edge-ai',
    description:
      'Edge AI computing platform for real-time inference on factory floors and production lines',
    priceMin: 50000,
    priceMax: 500000,
    pricingModel: 'hardware-software-bundle',
    targetDepartments: [
      DepartmentType.MANUFACTURING_OPERATIONS,
      DepartmentType.SUPPLY_CHAIN,
    ],
    targetPersonas: [
      'VP Manufacturing',
      'Director Quality Control',
      'SVP Operations',
      'Plant Manager',
      'Chief Operating Officer',
    ],
    useCases: [
      'quality-control',
      'defect-detection',
      'computer-vision',
      'predictive-maintenance',
      'assembly-line-automation',
    ],
    contentTags: [
      'manufacturing',
      'quality-control',
      'edge-ai',
      'computer-vision',
      'defect-detection',
      'industry-4.0',
    ],
  },

  {
    name: 'NVIDIA Omniverse',
    slug: 'omniverse',
    description:
      'Real-time 3D design collaboration platform for virtual prototyping and simulation',
    priceMin: 100000,
    priceMax: 800000,
    pricingModel: 'per-seat-annual',
    targetDepartments: [
      DepartmentType.INDUSTRIAL_DESIGN,
      DepartmentType.MANUFACTURING_OPERATIONS,
      DepartmentType.AUTONOMOUS_VEHICLES,
    ],
    targetPersonas: [
      'Chief Design Officer',
      'VP Industrial Design',
      'Design Manager',
      'VP Product Development',
      'Senior Designer',
    ],
    useCases: [
      'design-collaboration',
      'virtual-prototyping',
      'cad-integration',
      'factory-simulation',
      'digital-twin',
    ],
    contentTags: [
      'design',
      'collaboration',
      'omniverse',
      'virtual-prototyping',
      'cad',
      'digital-twin',
    ],
  },

  {
    name: 'DGX Cloud / AI Enterprise',
    slug: 'dgx-cloud',
    description:
      'AI infrastructure for training large models and accelerating compute workloads',
    priceMin: 200000,
    priceMax: 2000000,
    pricingModel: 'consumption-based',
    targetDepartments: [
      DepartmentType.IT_DATA_CENTER,
      DepartmentType.AUTONOMOUS_VEHICLES,
      DepartmentType.ENGINEERING,
    ],
    targetPersonas: [
      'Chief Technology Officer',
      'VP IT',
      'VP Engineering',
      'Director Cloud Infrastructure',
      'Head of AI/ML',
    ],
    useCases: [
      'model-training',
      'gpu-acceleration',
      'ai-workloads',
      'data-center-modernization',
      'inference-at-scale',
    ],
    contentTags: [
      'ai-infrastructure',
      'gpu',
      'model-training',
      'dgx',
      'data-center',
      'cloud',
    ],
  },

  {
    name: 'NVIDIA Metropolis',
    slug: 'metropolis',
    description:
      'AI-powered video analytics for security, safety, and operational intelligence',
    priceMin: 50000,
    priceMax: 300000,
    pricingModel: 'per-camera-annual',
    targetDepartments: [
      DepartmentType.MANUFACTURING_OPERATIONS,
      DepartmentType.SUPPLY_CHAIN,
    ],
    targetPersonas: [
      'Head of Security',
      'VP Operations',
      'Director Facilities',
      'Chief Security Officer',
    ],
    useCases: [
      'video-analytics',
      'worker-safety',
      'security-monitoring',
      'occupancy-tracking',
      'incident-detection',
    ],
    contentTags: [
      'security',
      'video-analytics',
      'safety',
      'monitoring',
      'metropolis',
    ],
  },
];

async function seedProducts() {
  console.log('Seeding products...');

  for (const product of products) {
    await prisma.catalogProduct.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
    console.log(`Seeded: ${product.name}`);
  }

  console.log('Product seeding complete.');
}

seedProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

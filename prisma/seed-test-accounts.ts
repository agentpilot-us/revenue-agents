import { PrismaClient, DepartmentType, DepartmentStatus, ProductOwnershipStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...')
  
  // Get your user (assuming you have one)
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'michelle@stradexai.com',
        name: 'Michelle',
      },
    })
  }
  
  // Get catalog products (these are global, not user-scoped)
  const driveProduct = await prisma.catalogProduct.findFirst({ where: { slug: 'drive-platform' } })
  const jetsonProduct = await prisma.catalogProduct.findFirst({ where: { slug: 'jetson-edge-ai' } })
  const omniverseProduct = await prisma.catalogProduct.findFirst({ where: { slug: 'omniverse' } })
  const dgxProduct = await prisma.catalogProduct.findFirst({ where: { slug: 'dgx-cloud' } })
  
  if (!driveProduct || !jetsonProduct || !omniverseProduct || !dgxProduct) {
    throw new Error('Catalog products not found. Please create them first (e.g., via API or manual seed).')
  }
  
  // Get personas (from Phase 3 seed or create if missing)
  const vpAvPersona = await prisma.persona.findFirst({ 
    where: { name: { contains: 'Autonomous Vehicles' } } 
  })
  const vpMfgPersona = await prisma.persona.findFirst({ 
    where: { name: { contains: 'Economic Buyer - Manufacturing' } } 
  })
  const cdoPersona = await prisma.persona.findFirst({ 
    where: { name: { contains: 'Industrial Design' } } 
  })
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACCOUNT 1: GENERAL MOTORS
  // Status: Existing customer (AV), expansion opportunity (Manufacturing, Design)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  console.log('Creating General Motors...')
  
  let gm = await prisma.company.findFirst({
    where: { domain: 'gm.com', userId: user.id },
  })
  
  if (!gm) {
    gm = await prisma.company.create({
      data: {
        name: 'General Motors',
        domain: 'gm.com',
        industry: 'Automotive',
        website: 'https://www.gm.com',
        size: '10000+',
        userId: user.id,
      },
    })
  }
  
  // Department 1: Autonomous Vehicles (EXISTING CUSTOMER)
  let gmAvDept = await prisma.companyDepartment.findUnique({
    where: {
      companyId_type: {
        companyId: gm.id,
        type: DepartmentType.AUTONOMOUS_VEHICLES,
      },
    },
  })
  
  if (!gmAvDept) {
    gmAvDept = await prisma.companyDepartment.create({
      data: {
        companyId: gm.id,
        type: DepartmentType.AUTONOMOUS_VEHICLES,
        customName: 'Cruise (GM\'s AV Division)',
        status: DepartmentStatus.ACTIVE_CUSTOMER,
        estimatedSize: 500,
        notes: 'Our champion team. Strong relationship, high usage of DRIVE Platform.',
      },
    })
  }
  
  // Contact 1: David Richardson (Champion in AV)
  let davidRichardson = await prisma.contact.findUnique({
    where: {
      email_companyId: {
        email: 'david.richardson@gm.com',
        companyId: gm.id,
      },
    },
  })
  
  if (!davidRichardson) {
    davidRichardson = await prisma.contact.create({
      data: {
        firstName: 'David',
        lastName: 'Richardson',
        email: 'david.richardson@gm.com',
        title: 'VP Autonomous Vehicle Engineering',
        companyId: gm.id,
        companyDepartmentId: gmAvDept.id,
        personaId: vpAvPersona?.id,
        linkedinUrl: 'https://www.linkedin.com/in/david-richardson-gm',
        engagementScore: 85,
        lastContactedAt: new Date('2026-01-15'),
        totalEmailsSent: 5,
        totalEmailsOpened: 4,
        totalEmailsReplied: 2,
        isResponsive: true,
      },
    })
  }
  
  // Product: DRIVE Platform (ACTIVE)
  await prisma.companyProduct.upsert({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId: gm.id,
        companyDepartmentId: gmAvDept.id,
        productId: driveProduct.id,
      },
    },
    update: {},
    create: {
      companyId: gm.id,
      companyDepartmentId: gmAvDept.id,
      productId: driveProduct.id,
      status: ProductOwnershipStatus.ACTIVE,
      arr: 500000,
      contractStart: new Date('2025-03-01'),
      contractEnd: new Date('2026-11-30'),
    },
  })
  
  // Department 2: Manufacturing Operations (EXPANSION TARGET)
  let gmMfgDept = await prisma.companyDepartment.findUnique({
    where: {
      companyId_type: {
        companyId: gm.id,
        type: DepartmentType.MANUFACTURING_OPERATIONS,
      },
    },
  })
  
  if (!gmMfgDept) {
    gmMfgDept = await prisma.companyDepartment.create({
      data: {
        companyId: gm.id,
        type: DepartmentType.MANUFACTURING_OPERATIONS,
        status: DepartmentStatus.EXPANSION_TARGET,
        estimatedSize: 5000,
        notes: 'Ultium 2.0 battery launch announced. Job posting for "Manufacturing Automation Engineer" posted 2 weeks ago. Q4 earnings: CFO mentioned "investing in quality control automation".',
      },
    })
  }
  
  // Contact 2: Michael Torres (VP Manufacturing - NEW CONTACT)
  let michaelTorres = await prisma.contact.findUnique({
    where: {
      email_companyId: {
        email: 'michael.torres@gm.com',
        companyId: gm.id,
      },
    },
  })
  
  if (!michaelTorres) {
    michaelTorres = await prisma.contact.create({
      data: {
        firstName: 'Michael',
        lastName: 'Torres',
        email: 'michael.torres@gm.com',
        title: 'VP Manufacturing Operations',
        companyId: gm.id,
        companyDepartmentId: gmMfgDept.id,
        personaId: vpMfgPersona?.id,
        linkedinUrl: 'https://www.linkedin.com/in/michael-torres-gm',
        engagementScore: 15, // Low - only 1 email opened
        lastContactedAt: new Date('2026-02-08'), // 3 days ago
        totalEmailsSent: 1,
        totalEmailsOpened: 1,
      },
    })
  }
  
  // Product: Jetson (OPPORTUNITY)
  await prisma.companyProduct.upsert({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId: gm.id,
        companyDepartmentId: gmMfgDept.id,
        productId: jetsonProduct.id,
      },
    },
    update: {},
    create: {
      companyId: gm.id,
      companyDepartmentId: gmMfgDept.id,
      productId: jetsonProduct.id,
      status: ProductOwnershipStatus.OPPORTUNITY,
      fitScore: 90,
      fitReasoning: 'GM announced Ultium 2.0 battery launch with $2B Ohio plant investment. Q4 earnings call: CFO mentioned "investing in quality control automation". Job posting for "Manufacturing Automation Engineer" indicates active investment in factory automation. Jetson edge AI for real-time quality control is perfect fit for high-volume battery production.',
      opportunitySize: 300000,
    },
  })
  
  // Department 3: Industrial Design (RESEARCH PHASE)
  let gmDesignDept = await prisma.companyDepartment.findUnique({
    where: {
      companyId_type: {
        companyId: gm.id,
        type: DepartmentType.INDUSTRIAL_DESIGN,
      },
    },
  })
  
  if (!gmDesignDept) {
    gmDesignDept = await prisma.companyDepartment.create({
      data: {
        companyId: gm.id,
        type: DepartmentType.INDUSTRIAL_DESIGN,
        status: DepartmentStatus.RESEARCH_PHASE,
        estimatedSize: 250,
        notes: 'CDO interview: "Accelerating EV design cycles is top priority." Job posting for "CAD Collaboration Engineer" suggests tools evaluation underway.',
      },
    })
  }
  
  // Contact 3: Jennifer Park (CDO - NEWLY IDENTIFIED)
  let jenniferPark = await prisma.contact.findUnique({
    where: {
      email_companyId: {
        email: 'jennifer.park@gm.com',
        companyId: gm.id,
      },
    },
  })
  
  if (!jenniferPark) {
    jenniferPark = await prisma.contact.create({
      data: {
        firstName: 'Jennifer',
        lastName: 'Park',
        email: 'jennifer.park@gm.com',
        title: 'Chief Design Officer',
        companyId: gm.id,
        companyDepartmentId: gmDesignDept.id,
        personaId: cdoPersona?.id,
        linkedinUrl: 'https://www.linkedin.com/in/jennifer-park-gm',
        engagementScore: 0, // Not contacted yet
      },
    })
  }
  
  // Product: Omniverse (OPPORTUNITY)
  await prisma.companyProduct.upsert({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId: gm.id,
        companyDepartmentId: gmDesignDept.id,
        productId: omniverseProduct.id,
      },
    },
    update: {},
    create: {
      companyId: gm.id,
      companyDepartmentId: gmDesignDept.id,
      productId: omniverseProduct.id,
      status: ProductOwnershipStatus.OPPORTUNITY,
      fitScore: 95,
      fitReasoning: 'CDO mentioned "accelerating EV design cycles" as top priority in recent Automotive News interview. Job posting for "CAD Collaboration Engineer" and "Design Systems Manager" indicates active search for global collaboration tools. GM has design studios in Detroit, Shanghai, and Germany—Omniverse enables real-time collaboration across all locations. With aggressive EV launch roadmap (10 new models by 2027), design velocity is critical.',
      opportunitySize: 400000,
    },
  })
  
  // Add some activities to show engagement history
  await prisma.activity.createMany({
    data: [
      {
        type: 'EMAIL_SENT',
        summary: 'Q1 Check-in: DRIVE Platform usage',
        subject: 'Q1 Check-in: DRIVE Platform usage',
        companyId: gm.id,
        companyDepartmentId: gmAvDept.id,
        contactId: davidRichardson.id,
        userId: user.id,
        createdAt: new Date('2026-01-15'),
      },
      {
        type: 'EMAIL_OPENED',
        summary: 'Email opened: Q1 Check-in',
        companyId: gm.id,
        companyDepartmentId: gmAvDept.id,
        contactId: davidRichardson.id,
        userId: user.id,
        createdAt: new Date('2026-01-15T14:30:00'),
      },
      {
        type: 'EMAIL_REPLIED',
        summary: 'Email replied: Q1 Check-in',
        body: 'Thanks for checking in! DRIVE is working great. Our team loves it.',
        companyId: gm.id,
        companyDepartmentId: gmAvDept.id,
        contactId: davidRichardson.id,
        userId: user.id,
        createdAt: new Date('2026-01-15T15:45:00'),
      },
      {
        type: 'EMAIL_SENT',
        summary: 'Congrats on Ultium 2.0 launch',
        subject: 'Congrats on Ultium 2.0 launch',
        companyId: gm.id,
        companyDepartmentId: gmMfgDept.id,
        contactId: michaelTorres.id,
        userId: user.id,
        createdAt: new Date('2026-02-08'),
      },
      {
        type: 'EMAIL_OPENED',
        summary: 'Email opened: Ultium 2.0 launch',
        companyId: gm.id,
        companyDepartmentId: gmMfgDept.id,
        contactId: michaelTorres.id,
        userId: user.id,
        createdAt: new Date('2026-02-08T10:20:00'),
      },
    ],
    skipDuplicates: true,
  })
  
  console.log('✅ General Motors created with 3 departments, 3 contacts, 3 product opportunities')
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACCOUNT 2: RIVIAN AUTOMOTIVE
  // Status: Smaller customer (AV only), high expansion potential
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  console.log('Creating Rivian Automotive...')
  
  let rivian = await prisma.company.findFirst({
    where: { domain: 'rivian.com', userId: user.id },
  })
  
  if (!rivian) {
    rivian = await prisma.company.create({
      data: {
        name: 'Rivian Automotive',
        domain: 'rivian.com',
        industry: 'Automotive',
        website: 'https://www.rivian.com',
        size: '1000-5000',
        userId: user.id,
      },
    })
  }
  
  // Department 1: Autonomous Vehicles (ACTIVE CUSTOMER)
  let rivianAvDept = await prisma.companyDepartment.findUnique({
    where: {
      companyId_type: {
        companyId: rivian.id,
        type: DepartmentType.AUTONOMOUS_VEHICLES,
      },
    },
  })
  
  if (!rivianAvDept) {
    rivianAvDept = await prisma.companyDepartment.create({
      data: {
        companyId: rivian.id,
        type: DepartmentType.AUTONOMOUS_VEHICLES,
        status: DepartmentStatus.ACTIVE_CUSTOMER,
        estimatedSize: 150,
        notes: 'Good relationship. Champion recently left (went to Lucid Motors). Need to establish continuity with replacement.',
      },
    })
  }
  
  // Contact: Sarah Chen (Director AV - NEW, replacing departed champion)
  let sarahChen = await prisma.contact.findUnique({
    where: {
      email_companyId: {
        email: 'sarah.chen@rivian.com',
        companyId: rivian.id,
      },
    },
  })
  
  if (!sarahChen) {
    sarahChen = await prisma.contact.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@rivian.com',
        title: 'Director, Autonomous Vehicle Engineering',
        companyId: rivian.id,
        companyDepartmentId: rivianAvDept.id,
        linkedinUrl: 'https://www.linkedin.com/in/sarah-chen-rivian',
        engagementScore: 0, // New contact
        bio: 'Started 3 weeks ago. Replaced Michael (who went to Lucid). Need to introduce ourselves.',
      },
    })
  }
  
  // Product: DRIVE Platform (ACTIVE - but champion departed, renewal risk)
  await prisma.companyProduct.upsert({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId: rivian.id,
        companyDepartmentId: rivianAvDept.id,
        productId: driveProduct.id,
      },
    },
    update: {},
    create: {
      companyId: rivian.id,
      companyDepartmentId: rivianAvDept.id,
      productId: driveProduct.id,
      status: ProductOwnershipStatus.ACTIVE,
      arr: 200000,
      contractStart: new Date('2025-06-01'),
      contractEnd: new Date('2026-05-31'), // Renews in ~3.5 months
    },
  })
  
  // Department 2: Manufacturing (EXPANSION TARGET)
  let rivianMfgDept = await prisma.companyDepartment.findUnique({
    where: {
      companyId_type: {
        companyId: rivian.id,
        type: DepartmentType.MANUFACTURING_OPERATIONS,
      },
    },
  })
  
  if (!rivianMfgDept) {
    rivianMfgDept = await prisma.companyDepartment.create({
      data: {
        companyId: rivian.id,
        type: DepartmentType.MANUFACTURING_OPERATIONS,
        status: DepartmentStatus.EXPANSION_TARGET,
        estimatedSize: 800,
        notes: '$1.5B funding round announced Feb 3. CEO quote: "Accelerate R2 platform launch and expand Georgia facility to 150K vehicles annually." Scaling production = quality control needs.',
      },
    })
  }
  
  // Product: Jetson (OPPORTUNITY)
  await prisma.companyProduct.upsert({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId: rivian.id,
        companyDepartmentId: rivianMfgDept.id,
        productId: jetsonProduct.id,
      },
    },
    update: {},
    create: {
      companyId: rivian.id,
      companyDepartmentId: rivianMfgDept.id,
      productId: jetsonProduct.id,
      status: ProductOwnershipStatus.OPPORTUNITY,
      fitScore: 88,
      fitReasoning: '$1.5B funding round (Feb 3) with explicit focus on "production scaling to 150K vehicles annually". R2 platform launch requires ramping manufacturing. Quality control at scale is critical for startup avoiding recalls. Budget available post-funding.',
      opportunitySize: 250000,
    },
  })
  
  console.log('✅ Rivian created with 2 departments, 1 contact, 2 product opportunities')
  
  console.log('\n🎉 Test accounts seeded successfully!\n')
  console.log('Summary:')
  console.log('• General Motors: 3 departments, 3 contacts, $500K ARR, $700K expansion opportunity')
  console.log('• Rivian: 2 departments, 1 contact, $200K ARR, $250K expansion opportunity')
  console.log('\nTotal: $700K current ARR, $950K expansion pipeline\n')
}

seedTestAccounts()
  .catch((error) => {
    console.error('Error seeding test accounts:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

/**
 * Seed AgentPilot "My Company" content for michelle@stradexai.com.
 *
 * Creates:
 *   - CatalogProduct + ProductProfile for AgentPilot
 *   - MessagingFramework for design partner outreach
 *   - ContentLibrary: 6 use cases, 3 success stories, 2 events, 3 feature releases
 *   - IndustryPlaybook for Enterprise Software Sales
 *
 * Idempotent: safe to re-run. Uses upsert / find-or-create throughout.
 *
 * Run:  npx dotenv -e .env.local -- tsx prisma/seed-agentpilot-content.ts
 */

import {
  PrismaClient,
  ContentType,
  DepartmentType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrisma() {
  const normalized = (process.env.DATABASE_URL ?? '')
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

const prisma = createPrisma();

const USER_EMAIL = 'michelle@stradexai.com';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getUser() {
  const user = await prisma.user.findFirst({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User ${USER_EMAIL} not found`);
  console.log(`Found user: ${user.name} (${user.id})`);
  return user;
}

// ── 1. Catalog Product + Product Profile ─────────────────────────────────────

async function seedProduct(userId: string) {
  console.log('\n── Seeding CatalogProduct: AgentPilot ──');

  const slug = 'agentpilot';

  let product = await prisma.catalogProduct.findFirst({
    where: { userId, slug },
  });

  if (!product) {
    product = await prisma.catalogProduct.create({
      data: {
        userId,
        name: 'AgentPilot',
        slug,
        description:
          'AI-powered strategic account management platform for enterprise AEs. Combines real-time account intelligence, signal detection, multi-channel play execution, and buying group mapping into a single workflow — turning account signals into personalised outreach in minutes.',
        targetDepartments: [DepartmentType.SALES, DepartmentType.MARKETING],
        targetPersonas: ['Enterprise AE', 'Strategic AE', 'VP Sales', 'CRO', 'RevOps Leader', 'Sales Enablement'],
        pricingModel: 'Per-seat SaaS',
      },
    });
    console.log(`  Created CatalogProduct: ${product.id}`);
  } else {
    console.log(`  CatalogProduct already exists: ${product.id}`);
  }

  const existingProfile = await prisma.productProfile.findFirst({
    where: { catalogProductId: product.id, userId },
  });

  if (!existingProfile) {
    await prisma.productProfile.create({
      data: {
        catalogProductId: product.id,
        userId,
        oneLiner: 'The AI operating system for enterprise AEs managing strategic accounts.',
        elevatorPitch:
          'AgentPilot monitors your strategic accounts 24/7 — detecting hiring signals, earnings calls, restructurings, and competitive moves. When something actionable hits, it matches the right play, drafts personalised multi-channel outreach, and queues it for your approval. Your AEs spend less time researching and more time selling.',
        valueProps: JSON.parse(JSON.stringify([
          'Turn account signals into personalised outreach in minutes, not days',
          'Map accounts by buying group — how the customer actually buys — not just org chart',
          'Every email, InMail, and talk track is grounded in real account context, product knowledge, and case studies',
          'Standardise play execution so every AE performs like your top 1%',
          'One platform for intelligence, planning, and execution — no tab-switching between 6 tools',
        ])),
        painPoints: JSON.parse(JSON.stringify([
          'AEs spend 70% of time on research and admin, only 30% actually selling',
          'Account signals get missed or acted on too late',
          'Outreach is generic because reps lack context on the specific division and persona',
          'No standardised playbook — every AE reinvents the wheel',
          'Buying groups are complex but tools force a single-threaded approach',
        ])),
        bestForDepartments: JSON.parse(JSON.stringify([
          'Sales — Enterprise / Strategic AEs',
          'Revenue Operations',
          'Sales Enablement',
        ])),
        bestForIndustries: JSON.parse(JSON.stringify([
          'Enterprise Software / SaaS',
          'Technology / Hardware',
          'Financial Services',
          'Manufacturing / Industrial',
        ])),
        technicalRequirements: JSON.parse(JSON.stringify([
          'Works alongside Salesforce, HubSpot, or any CRM',
          'Integrates with LinkedIn Sales Navigator, email, and calendar',
          'Supports local LLM deployment (LM Studio) for data-sensitive environments',
          'No special hardware required — runs in the browser',
        ])),
        objectionHandlers: JSON.parse(JSON.stringify([
          {
            objection: 'We already have Outreach / Salesloft',
            response: 'Those are transactional sequencing tools built for SDRs doing volume outbound. AgentPilot is for strategic AEs managing complex, multi-stakeholder deals where every touch needs to be contextual and personalised. Different category entirely.',
          },
          {
            objection: 'AI-generated emails sound generic',
            response: 'Generic AI tools write from nothing. AgentPilot writes from your content library, product profiles, account research, buying group context, and real signals. The output sounds like your best AE wrote it, because it has the same context your best AE would have.',
          },
          {
            objection: 'Our AEs already do this manually',
            response: 'Exactly — your best AEs do. The question is: can every AE on your team do it at that level? AgentPilot captures the workflow of your top performers and makes it repeatable across the team.',
          },
          {
            objection: 'We need to see ROI before committing',
            response: 'That is exactly why we run a design partner programme. Free access, no commitment, direct input into the roadmap. You see the value in your real accounts before any commercial conversation.',
          },
          {
            objection: 'Data privacy / AI concerns',
            response: 'AgentPilot supports local LLM deployment via LM Studio — your data never leaves your network. We also support Anthropic and Google models with enterprise data handling agreements.',
          },
        ])),
        competitivePositioning: JSON.parse(JSON.stringify([
          'vs. Outreach/Salesloft: We are strategic, they are transactional. We handle complex buying groups and account plans; they handle volume sequences.',
          'vs. 6sense/Demandbase: They surface intent signals; we surface signals AND execute the response with drafted, contextual outreach.',
          'vs. Gong/Clari: They analyse past conversations; we drive the next conversation with forward-looking intelligence and content generation.',
          'vs. ChatGPT/generic AI: We are grounded in your specific product knowledge, account research, and content library. Generic tools know nothing about your accounts.',
        ])),
      },
    });
    console.log('  Created ProductProfile');
  } else {
    console.log('  ProductProfile already exists');
  }

  return product.id;
}

// ── 2. Messaging Framework ──────────────────────────────────────────────────

async function seedMessagingFramework(userId: string) {
  console.log('\n── Seeding MessagingFramework ──');

  const name = 'AgentPilot — Design Partner Outreach';

  const existing = await prisma.messagingFramework.findFirst({
    where: { userId, name },
  });

  if (!existing) {
    await prisma.messagingFramework.create({
      data: {
        userId,
        name,
        content: `Voice & Tone:
Direct, knowledgeable, peer-to-peer. We are builders talking to practitioners, not vendors pitching buyers. Confident but never arrogant. We respect that enterprise AEs know their craft — we are offering a force multiplier, not a replacement.

Positioning:
AgentPilot is the AI-native strategic account platform. Not a CRM, not an outbound sequencer, not a data provider. It is the operating system for enterprise AEs who manage complex, multi-stakeholder deals at Fortune 500 accounts.

Key Messages:
1. Your best AEs already do this manually — we automate the intelligence and execution so every AE performs like your top 1%.
2. Signals without action are just noise. AgentPilot turns account signals into personalised, multi-channel plays in minutes.
3. Strategic accounts need strategy, not spray-and-pray. Every outreach is informed by account objectives, buying group context, and product fit.
4. One platform for intelligence, planning, and execution. Stop tab-switching between 6 tools.

What We Are NOT:
- Not an SDR tool. Not for cold outbound at scale.
- Not a CRM replacement. We sit alongside Salesforce/HubSpot.
- Not a generic AI writing tool. Every output is grounded in real account context.

Design Partner Ask:
We are looking for 5 enterprise AEs managing strategic accounts ($1M+ deals) to shape the product. Free access, direct input into the roadmap, white-glove onboarding. This is not a trial — it is a partnership.

Email Guidelines:
- Keep emails under 120 words. One idea per email.
- Always reference something specific to the recipient — their role, their account, a recent signal.
- Close with a low-pressure ask: "Would a 15-minute call work?" not "Let me show you a demo."
- Subject lines should feel personal, not like a marketing blast.
- Never open with "I hope this email finds you well" or any variant.

LinkedIn Guidelines:
- InMails under 100 words. Conversational, not formal.
- Connection requests under 200 characters. Reference one specific thing — their role, a shared interest, an industry trend.
- Never pitch in a connection request.`,
      },
    });
    console.log('  Created messaging framework');
  } else {
    console.log('  Messaging framework already exists');
  }
}

// ── 3. Content Library: Use Cases ───────────────────────────────────────────

async function seedUseCases(userId: string) {
  console.log('\n── Seeding Use Cases ──');

  const useCases = [
    {
      title: 'Signal-Driven Outreach',
      content: {
        headline: 'Turn Account Signals into Meetings in Hours, Not Weeks',
        body: `An enterprise AE managing 10+ strategic accounts gets real-time alerts when a target account hires a new VP, restructures a division, or announces a major investment. Instead of manually researching and drafting, AgentPilot recommends the right play, drafts personalised outreach across email and LinkedIn, and queues multi-channel follow-ups — all grounded in the account's actual context. The AE reviews, approves, and sends. A news event becomes a booked meeting in hours, not the typical 2-3 week cold outreach cycle.`,
        keyMetrics: 'Signal-to-meeting time reduced from 2-3 weeks to 24-48 hours',
      },
      department: 'SALES',
      persona: 'Enterprise AE',
    },
    {
      title: 'Buying Group Mapping & Multi-Threading',
      content: {
        headline: 'Engage Every Decision-Maker with the Right Message',
        body: `Instead of guessing who matters in a deal, the AE sees the account segmented by how the customer actually buys — Autonomous Driving Engineering, IT Infrastructure, Digital Manufacturing — with the right contacts, value propositions, and objection handlers per group. Each outreach is tailored to the recipient's specific division and role. No more sending the same generic email to 50 people and hoping someone bites. Multi-threaded engagement from day one.`,
        keyMetrics: '3x more stakeholders engaged per deal vs. single-threaded approach',
      },
      department: 'SALES',
      persona: 'Strategic AE',
    },
    {
      title: 'Multi-Channel Play Execution',
      content: {
        headline: 'From Signal to Send in Minutes, Not Hours',
        body: `When a play fires — whether triggered by a signal or started manually — the AE gets a step-by-step workflow: personalised email, LinkedIn InMail, connection request, follow-up email, call script. Each piece is drafted with full account context: research, product knowledge, case studies, and the specific signal that triggered the play. Each touch builds on the last. The AE approves and sends, rather than writing from scratch. What used to take 2 hours of research and drafting now takes 10 minutes of review.`,
        keyMetrics: 'Content creation time reduced from 2 hours to 10 minutes per play',
      },
      department: 'SALES',
      persona: 'Enterprise AE',
    },
    {
      title: 'Account Intelligence on Autopilot',
      content: {
        headline: 'Never Miss an Actionable Signal Again',
        body: `The platform continuously monitors target accounts for signals — earnings calls mentioning your product category, executive changes in key divisions, M&A activity, competitive wins and losses, product launches that create buying urgency. Signals are classified by type and scored by relevance. The AE's "My Day" page is a prioritised action queue — not an inbox full of noise. Only signals that matter surface, already matched to the right response play.`,
        keyMetrics: 'AEs act on 90%+ of relevant signals vs. industry average of 15-20%',
      },
      department: 'SALES',
      persona: 'VP Sales',
    },
    {
      title: 'Strategic Account Planning with AI',
      content: {
        headline: 'One Source of Truth for Account Strategy and Execution',
        body: `Approved plays, buying group configurations, account objectives, and engagement history live in one place — the Strategic Account Plan. The system uses this context to recommend the next-best-action and ensure every outreach aligns with the account strategy. No more disconnected spreadsheets, outdated battle cards, or tribal knowledge locked in one AE's head. When a new signal hits, the system already knows the objective, the buying groups, and the approved plays. It just executes.`,
        keyMetrics: 'Account plan adoption increased from 30% to 95% when embedded in daily workflow',
      },
      department: 'SALES',
      persona: 'CRO',
    },
    {
      title: 'Content-Aware Personalisation',
      content: {
        headline: 'AI That Sounds Like Your Best AE, Not a Chatbot',
        body: `Every generated email, InMail, and talk track references real product capabilities, real proof points, and real events from the company's content library. The content library feeds the AI through RAG (retrieval-augmented generation), so outreach is grounded in verified information — not hallucinated claims. AEs can add their own content (PDFs, URLs, case studies) and the system automatically indexes it for use in future content generation. The more content you add, the smarter the output gets.`,
        keyMetrics: 'Email reply rates 2.5x higher than template-based outreach',
      },
      department: 'SALES',
      persona: 'Sales Enablement',
    },
  ];

  for (const uc of useCases) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: uc.title, type: ContentType.UseCase },
    });
    if (!existing) {
      await prisma.contentLibrary.create({
        data: {
          userId,
          title: uc.title,
          type: ContentType.UseCase,
          content: uc.content,
          department: uc.department,
          persona: uc.persona,
          industry: 'Enterprise Software',
          isActive: true,
          userConfirmed: true,
        },
      });
      console.log(`  Created UseCase: ${uc.title}`);
    } else {
      console.log(`  UseCase already exists: ${uc.title}`);
    }
  }
}

// ── 4. Content Library: Success Stories (Anonymous) ──────────────────────────

async function seedSuccessStories(userId: string) {
  console.log('\n── Seeding Success Stories ──');

  const stories = [
    {
      title: 'Fortune 500 Automotive OEM — Signal-Driven Executive Engagement',
      content: {
        headline: 'New Hire Signal → Meeting Booked in 3 Days',
        oneLiner: 'AE used signal-driven outreach to engage a newly hired VP within 24 hours of the announcement, booking a meeting in 3 days vs. the typical 3-week cycle.',
        fullSummary: `A strategic AE managing a $50M automotive OEM account used AgentPilot's signal detection to identify a newly hired VP of Autonomous Driving within one hour of the LinkedIn announcement. The system automatically matched the "New Executive Introduction" play, drafted a congratulatory email referencing the executive's previous company and the division's current priorities, and queued a LinkedIn connection request with a personalised note. The AE reviewed both in under 5 minutes and sent. The VP responded to the email within 24 hours. A 30-minute intro call was booked for day 3. The AE later credited the speed and specificity of the outreach — "it read like I had spent an hour researching her background, but I spent 5 minutes reviewing what the system drafted."`,
        keyMetrics: ['Signal detected within 1 hour', 'Outreach sent within 2 hours', 'Meeting booked in 3 days', 'Previous cold outreach cycle: 3+ weeks'],
        whenToUse: 'When a target account announces a new executive hire in a relevant division. Speed and personalisation are critical — the first vendor to engage a new exec with relevant context wins.',
      },
      department: 'SALES',
      persona: 'Enterprise AE',
    },
    {
      title: 'Global SaaS Company — Buying Group Expansion Play',
      content: {
        headline: '4 Decision-Makers Engaged, Multi-Threaded Deal Opened in 2 Weeks',
        oneLiner: 'AE used buying group mapping to identify and engage 4 technical decision-makers across 2 teams with persona-tailored outreach, opening a multi-threaded deal in 2 weeks.',
        fullSummary: `An AE running expansion into a customer's AI/ML division used AgentPilot's buying group mapping to identify 4 key decision-makers across the ML Platform and Data Infrastructure teams. Instead of sending the same email to all 4, the system generated tailored outreach per persona: a technical deep-dive on inference performance for the VP Engineering, an ROI and operational efficiency story for the VP Operations, a security and compliance angle for the IT Director, and a strategic vision pitch for the GM. The AE reviewed and sent all 4 sequences within 30 minutes. 3 of 4 responded within a week. The deal was formally opened as a multi-threaded opportunity within 2 weeks — the AE's fastest expansion cycle that quarter.`,
        keyMetrics: ['4 personalised outreach sequences drafted in 30 minutes', '75% response rate (3 of 4)', 'Multi-threaded deal opened in 2 weeks', 'Fastest expansion cycle that quarter'],
        whenToUse: 'When expanding into a new division or use case within an existing customer. Buying group mapping ensures you engage all relevant stakeholders with tailored messaging from day one.',
      },
      department: 'SALES',
      persona: 'Strategic AE',
    },
    {
      title: 'Enterprise Tech — Event-Driven Pipeline Generation',
      content: {
        headline: '8 RSVPs, 5 Onsite Meetings from Personalised Event Invites',
        oneLiner: 'AE used AgentPilot to send personalised event invites with custom agendas to 12 contacts across 3 accounts, generating 8 RSVPs and 5 onsite meetings.',
        fullSummary: `Before a major industry conference, an AE managing 3 strategic accounts used AgentPilot to identify 12 contacts who should attend — selected based on their division priorities, product interests, and recent engagement signals. For each contact, the system generated a personalised event invite that included: a custom mini-agenda highlighting sessions relevant to their specific role, a reference to a recent signal in their account (e.g., "given your team's expansion into edge computing"), and a personal CTA to meet at the event. The AE sent all 12 invites in under 45 minutes. 8 contacts RSVP'd, 5 agreed to onsite meetings, and 2 of those converted to new pipeline opportunities within 30 days of the event.`,
        keyMetrics: ['12 personalised invites sent in 45 minutes', '67% RSVP rate', '5 onsite meetings booked', '2 new pipeline opportunities within 30 days'],
        whenToUse: 'Before any major industry conference or company-hosted event. Personalised invites with custom agendas dramatically outperform generic "come visit our booth" blasts.',
      },
      department: 'SALES',
      persona: 'Enterprise AE',
    },
  ];

  for (const story of stories) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: story.title, type: ContentType.SuccessStory },
    });
    if (!existing) {
      await prisma.contentLibrary.create({
        data: {
          userId,
          title: story.title,
          type: ContentType.SuccessStory,
          content: story.content,
          department: story.department,
          persona: story.persona,
          industry: 'Enterprise Software',
          isActive: true,
          userConfirmed: true,
        },
      });
      console.log(`  Created SuccessStory: ${story.title}`);
    } else {
      console.log(`  SuccessStory already exists: ${story.title}`);
    }
  }
}

// ── 5. Content Library: Events ──────────────────────────────────────────────

async function seedEvents(userId: string) {
  console.log('\n── Seeding Events ──');

  const events = [
    {
      title: 'AgentPilot Design Partner Programme Launch',
      content: {
        eventTitle: 'AgentPilot Design Partner Programme',
        description: 'We are inviting 5 enterprise AEs managing strategic accounts ($1M+ deals) to shape the future of AI-powered strategic account management. Free access to the full platform, direct input into the product roadmap, white-glove onboarding, and a dedicated Slack channel with the founding team. This is not a trial — it is a partnership.',
        date: '2026 Q2',
        location: 'Remote / Virtual',
        registrationUrl: 'https://stradexai.com/design-partner',
        topics: [
          'Signal-driven outreach',
          'Buying group mapping',
          'AI content generation for strategic accounts',
          'Multi-channel play execution',
          'Account intelligence automation',
        ],
      },
    },
    {
      title: 'SaaStr Annual 2026',
      content: {
        eventTitle: 'SaaStr Annual 2026',
        description: 'The world\'s largest SaaS community gathering. AgentPilot will be demonstrating AI-powered strategic account management for enterprise sales teams. Interested in a live demo at the event with your real accounts.',
        date: 'September 2026',
        location: 'San Mateo, CA',
        topics: [
          'AI in Enterprise Sales',
          'Account-Based Selling',
          'Revenue Intelligence',
          'Sales Automation',
        ],
      },
    },
  ];

  for (const ev of events) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: ev.title, type: ContentType.CompanyEvent },
    });
    if (!existing) {
      await prisma.contentLibrary.create({
        data: {
          userId,
          title: ev.title,
          type: ContentType.CompanyEvent,
          content: ev.content,
          industry: 'Enterprise Software',
          isActive: true,
          userConfirmed: true,
        },
      });
      console.log(`  Created Event: ${ev.title}`);
    } else {
      console.log(`  Event already exists: ${ev.title}`);
    }
  }
}

// ── 6. Content Library: Feature Releases ────────────────────────────────────

async function seedFeatureReleases(userId: string) {
  console.log('\n── Seeding Feature Releases ──');

  const releases = [
    {
      title: 'Signal-to-Play Automation',
      content: {
        headline: 'Account signals now auto-match to the right play',
        body: 'When a signal fires — executive hire, earnings call, restructuring — AgentPilot automatically identifies the best play from your approved playbook, resolves the target contact and division, and drafts multi-channel outreach. One click from signal to send.',
        releaseDate: 'March 2026',
      },
    },
    {
      title: 'Buying Group Intelligence',
      content: {
        headline: 'Map accounts by how the customer actually buys',
        body: 'Strategic Account Plans now include buying group mapping with per-division value propositions, objection handlers, proof points, and recommended contacts. Every play execution uses this context to tailor outreach to the specific buying group.',
        releaseDate: 'February 2026',
      },
    },
    {
      title: 'Local LLM Support via LM Studio',
      content: {
        headline: 'Run AgentPilot on your own infrastructure',
        body: 'AgentPilot now supports local LLM deployment through LM Studio integration. Run Qwen, Llama, or any GGUF model on your own hardware. Your account data and generated content never leave your network. Enterprise-grade AI without the data privacy concerns.',
        releaseDate: 'March 2026',
      },
    },
  ];

  for (const rel of releases) {
    const existing = await prisma.contentLibrary.findFirst({
      where: { userId, title: rel.title, type: ContentType.FeatureRelease },
    });
    if (!existing) {
      await prisma.contentLibrary.create({
        data: {
          userId,
          title: rel.title,
          type: ContentType.FeatureRelease,
          content: rel.content,
          industry: 'Enterprise Software',
          isActive: true,
          userConfirmed: true,
        },
      });
      console.log(`  Created FeatureRelease: ${rel.title}`);
    } else {
      console.log(`  FeatureRelease already exists: ${rel.title}`);
    }
  }
}

// ── 7. Industry Playbook ────────────────────────────────────────────────────

async function seedIndustryPlaybook(userId: string) {
  console.log('\n── Seeding Industry Playbook ──');

  const slug = 'enterprise-software-sales';

  const existing = await prisma.industryPlaybook.findFirst({
    where: { userId, slug },
  });

  if (!existing) {
    await prisma.industryPlaybook.create({
      data: {
        userId,
        name: 'Enterprise Software / SaaS Sales',
        slug,
        overview:
          'Enterprise AEs at B2B SaaS and technology companies managing strategic accounts with 6-18 month sales cycles, complex buying committees, and $500K-$50M deal sizes. These organisations typically have dedicated account teams, existing tech stacks, and well-defined procurement processes.',
        buyingCommittee:
          'CRO / VP Sales (economic buyer, cares about pipeline velocity and rep productivity), Strategic AE / Account Manager (end user, cares about daily workflow and account intelligence), Revenue Operations (technical buyer, cares about integration, data quality, and process standardisation), Sales Enablement (champion, cares about training, content, and playbook adoption), IT / Security (gate-keeper for data privacy, SSO, and compliance).',
        valuePropsByDepartment: {
          sales: {
            headline: 'Your AEs spend 70% of time researching — flip it to 70% selling',
            pitch: 'AgentPilot automates account intelligence, signal detection, and content creation so your AEs focus on relationships and closing. Every outreach is grounded in real account context.',
            bullets: [
              'Signal-to-meeting time reduced from weeks to hours',
              'Multi-channel plays drafted with full account context',
              'Buying group mapping for multi-threaded engagement',
            ],
            cta: 'See how it works with your real accounts in our Design Partner Programme',
          },
          revenue_operations: {
            headline: 'Standardise play execution without killing creativity',
            pitch: 'Define approved plays and account strategies centrally. AgentPilot ensures every AE follows the playbook while personalising for their specific accounts and contacts.',
            bullets: [
              'Approved plays enforced through the Strategic Account Plan',
              'Activity tracking and engagement analytics per account',
              'Consistent messaging across the team',
            ],
            cta: 'Let us show you the ops dashboard with your team structure',
          },
          sales_enablement: {
            headline: 'Give every AE the playbook of your top performer',
            pitch: 'AgentPilot captures the research, content, and workflow patterns of your best AEs and makes them available to the entire team through AI-powered play execution.',
            bullets: [
              'Content library feeds every generated email and talk track',
              'New reps ramp faster with pre-built account intelligence',
              'Playbooks are living, not static PDFs nobody reads',
            ],
            cta: 'Join the Design Partner Programme and shape the enablement features',
          },
        },
        landmines: JSON.parse(JSON.stringify([
          '"We already use Outreach/Salesloft" — Different category. Those are transactional sequencing tools for SDRs. AgentPilot is for strategic AEs managing complex, multi-stakeholder accounts. Complementary, not competitive.',
          '"AI emails will sound generic" — The opposite. Every output is grounded in your content library, account research, buying group context, and real signals. Generic AI tools write from nothing; AgentPilot writes from your actual knowledge.',
          '"Our CRM already does this" — CRMs are systems of record. AgentPilot is a system of action. We sit alongside Salesforce/HubSpot and turn the data into personalised outreach.',
          '"We need to involve IT/Security first" — AgentPilot supports local LLM deployment. Your data never has to leave your network. Design partners get dedicated support for security review.',
          '"We do not have budget right now" — Design partner programme is free. We are looking for input, not revenue. Commercial conversation happens only after you have seen value.',
        ])),
      },
    });
    console.log('  Created IndustryPlaybook: Enterprise Software / SaaS Sales');
  } else {
    console.log('  IndustryPlaybook already exists');
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding AgentPilot Content for michelle@stradexai.com ===\n');

  const user = await getUser();

  await seedProduct(user.id);
  await seedMessagingFramework(user.id);
  await seedUseCases(user.id);
  await seedSuccessStories(user.id);
  await seedEvents(user.id);
  await seedFeatureReleases(user.id);
  await seedIndustryPlaybook(user.id);

  console.log('\n=== Done! All content seeded. ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

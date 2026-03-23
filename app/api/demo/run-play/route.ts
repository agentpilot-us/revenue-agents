/**
 * POST /api/demo/run-play
 *
 * Demo-only bypass: creates a PlayRun with 7 pre-seeded actions directly.
 * No SignalPlayMapping, no AccountPlayActivation, no matching chain.
 * Step 1 is created as EXECUTED so the run page shows it already done —
 * enrichment is demoed separately in Target Accounts → GM → Contacts before
 * clicking "Work This" on My Day.
 *
 * Body: { signalId: string }
 * Returns: { playRunId: string, companyId: string, redirect: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';
import {
  type ActionType,
  PlayContentType,
  ContentChannel,
  ModelTier,
} from '@prisma/client';

type StepDef = {
  order: number;
  dayOffset: number;
  name: string;
  actionType: ActionType;
  subject?: string;
  body: string;
  /** When true, action is created as EXECUTED so the run page shows step 1 already done (enrichment demoed in Target Accounts → Contacts). */
  preCompleted?: boolean;
};

/** Canonical step 1 body for demo runs; also used when loading runs so existing runs show current copy. */
export const DEMO_STEP_1_BODY = `CONTACT LOOKUP: Shelly Chaka

□ Check if Shelly Chaka exists in GM contact database
□ Search Apollo for verified work email
□ Pull LinkedIn profile URL
□ Confirm current title: VP Autonomous Vehicle Engineering
□ Previous role: CSO, Cruise (GM subsidiary)
□ Education: MS Automotive Engineering, University of Michigan
□ Enrich with phone, reporting structure

CONTEXT FOR OUTREACH:
• Was CSO at Cruise — sat on the senior leadership team, reported to the Cruise BOD
• Deep expertise in AV safety cases, simulation-based validation, regulatory compliance
• Cruise restructured late 2024; she transitioned into GM's AV safety leadership
• GM just expanded NVIDIA partnership at GTC 2025 — she's a key stakeholder for DRIVE platform safety certification
• SAE J. Cordell Breed Award winner — respected in the safety engineering community

NEXT: Once enriched → proceed to congratulations email (Step 2)`;

const STEPS: StepDef[] = [
  {
    order: 0,
    dayOffset: 0,
    name: 'Find and enrich contact',
    actionType: 'REVIEW_BRIEF',
    body: DEMO_STEP_1_BODY,
    preCompleted: true,
  },
  {
    order: 1,
    dayOffset: 0,
    name: 'Send congratulations email',
    actionType: 'SEND_EMAIL',
    subject: 'Congrats on the expanded role, Shelly',
    body: `Shelly,

Congrats on taking the lead of GM's AV Engineering group. Given what you built at Cruise — especially the safety case framework and the validation infrastructure — this is the right move at the right time for GM.

I know the Cruise restructuring was a tough chapter, but the work your team did on simulation-based validation and regulatory compliance is exactly what GM needs as they push toward eyes-off driving for the 2028 Escalade IQ. The foundation you laid at Cruise doesn't go away — it accelerates what's next.

You may have seen that Jensen and Mary Barra announced an expanded NVIDIA-GM partnership at GTC last month — AI for manufacturing, enterprise, and in-car. On the AV side, DRIVE Thor at 2000 TOPS is where the safety-certified compute conversation is heading. Given your background in AV safety certification, there's a natural discussion about how DRIVE's safety architecture supports the kind of rigorous validation framework you've championed.

No pitch — just wanted to say congrats and connect. Frank Morrison on your IT side has been a great partner on the DGX infrastructure, happy to make that intro if helpful.

Best,
Sarah Kim
Strategic Account Director, Automotive
NVIDIA`,
  },
  {
    order: 2,
    dayOffset: 1,
    name: 'Research background & tech stack',
    actionType: 'REVIEW_BRIEF',
    body: `Executive Brief: Shelly Chaka / GM AV Engineering

What matters for our conversation:
- She built Cruise's safety case from scratch — AV safety metrics, validation thresholds, BOD-level reporting. She thinks in safety frameworks, not feature specs. Lead with DRIVE's safety architecture and ASIL-D certification path.
- Cruise used custom silicon. That investment is gone. She needs a production-ready, safety-certified compute platform — don't position DRIVE as a replacement for Cruise tech, position it as the foundation for GM's next chapter.
- GM-NVIDIA expanded partnership announced at GTC March 2025. She's aware of the relationship. Reference it — this isn't a cold intro, it's an extension of an existing partnership.
- Qualcomm has the 2027 ADAS L2+ win (Snapdragon Ride Flex). Don't fight that. Position Thor as the L3+ safety-certified layer. Different tier, different validation requirements — right in her wheelhouse.
- GM eyes-off driving target: 2028 Cadillac Escalade IQ. Sterling Anderson (ex-Tesla Autopilot) leads product. She owns the safety validation path that gets eyes-off to market.

Competitive watch: Mobileye EyeQ is not in the picture at GM for L3+. It's NVIDIA vs. in-house (which is 3-5 years out and lost momentum with Cruise restructuring).

Talk track: Cruise safety expertise → what DRIVE Thor offers for safety-certified L3+ compute → simulation validation (DRIVE Sim) → GTC Automotive AI Summit for deep technical dive.`,
  },
  {
    order: 3,
    dayOffset: 1,
    name: 'LinkedIn connection note',
    actionType: 'SEND_LINKEDIN',
    body: `Shelly — Congrats on the expanded AV role at GM. Your safety validation work at Cruise set the standard for the industry, and it's great to see that expertise driving GM's autonomy push. I'm on the DRIVE platform side at NVIDIA — with the expanded GM partnership, I'd love to connect. — Sarah`,
  },
  {
    order: 4,
    dayOffset: 3,
    name: 'Schedule executive welcome briefing',
    actionType: 'SCHEDULE_MEETING',
    subject: 'NVIDIA × GM AV: Safety-Certified Compute Discussion',
    body: `Meeting: NVIDIA × GM AV Safety & Compute Architecture
Duration: 45 min | Suggested: 3 days out
Attendees: Shelly Chaka (GM), Sarah Kim (NVIDIA), Dr. Raj Patel (NVIDIA AV Solutions Architect)

Agenda:
1. Shelly's priorities for GM AV safety certification in 2026 (15 min)
2. DRIVE Thor safety architecture — ASIL-D path, lockstep cores, safety island (15 min)
3. DRIVE Sim for simulation-based validation — how it supports the safety case she's building (10 min)
4. GTC Automotive AI Summit invite + next steps (5 min)

Prep notes:
- Her language is safety cases, validation thresholds, regulatory compliance — not TOPS and benchmarks. Lead with safety architecture, not raw performance.
- She'll want to know about DRIVE's functional safety certification path and how it maps to GM's existing SAFE-ADS framework.
- Have the Mercedes L3 certification case study ready — first L3-certified NVIDIA DRIVE vehicle across 5 markets, 60% faster certification. That's her proof point.
- Frank Morrison (CTO, DGX sponsor) offered to join if she wants an internal reference.
- Don't bring up Cruise negatively — she led that safety program and is proud of the work.`,
  },
  {
    order: 5,
    dayOffset: 7,
    name: 'Custom ROI assessment',
    actionType: 'SEND_EMAIL',
    subject: 'DRIVE Thor — safety certification ROI for GM AV',
    body: `Shelly,

Following up on our conversation. Put together a framework specific to GM's AV safety certification path:

Certification timeline: Mercedes achieved L3 certification across 5 markets using DRIVE Orin + DRIVE Sim. 60% faster than their previous generation. With Thor's enhanced safety architecture (ASIL-D, lockstep cores, dedicated safety island), GM's eyes-off timeline for the 2028 Escalade IQ has a clear compute foundation.

Simulation-based validation: DRIVE Sim does 1M+ simulated miles per day with physically accurate sensor models. For the safety case you're building, that means you can validate edge cases at a pace that physical testing can't match — critical for the regulatory path to eyes-off.

Compute consolidation: Thor handles ADAS + cockpit + safety monitoring on a single SoC. That simplifies the safety architecture — fewer interfaces, fewer failure modes, one validation target instead of three.

Happy to walk through the detailed safety architecture with your team. Also — GTC Automotive AI Summit is May 18 in San Jose. There's a dedicated session on AV safety certification with DRIVE. I'll send you an invite.

Best,
Sarah`,
  },
  {
    order: 6,
    dayOffset: 14,
    name: 'Position as early win partner',
    actionType: 'SEND_EMAIL',
    subject: 'Quick wins for your first 90 days',
    body: `Shelly,

Thinking about what gets you a concrete result in Q1:

Safety architecture review: We bring our AV safety team to do a joint review of DRIVE Thor's ASIL-D architecture against GM's SAFE-ADS framework. Half-day session, your team and ours. You walk away with a clear map of how Thor supports your safety case.

DRIVE Sim pilot: 30-day access to DRIVE Sim for your validation team. Run your existing safety scenarios on our simulation platform. Compare coverage and throughput against your current approach. No commitment — just data.

Your technical contact: Dr. Raj Patel, our AV Solutions Architect. He worked with Mercedes on their L3 certification and knows the regulatory path cold.

Also — saving you a seat at the GTC Automotive AI Summit executive dinner (May 18, San Jose). Small group, all OEM safety and AV leadership. Given your SAE Breed Award, you'd be among peers.

Let me know what's useful. Happy to start with whatever moves fastest for you.

Best,
Sarah`,
  },
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const { signalId } = body as { signalId?: string };

    let signal: { id: string; companyId: string; title: string; summary: string; type: string } | null = null;
    if (signalId) {
      signal = await prisma.accountSignal.findFirst({
        where: { id: signalId, userId },
        select: { id: true, companyId: true, title: true, summary: true, type: true },
      });
    }

    if (!signal) {
      signal = await prisma.accountSignal.findFirst({
        where: { userId, type: 'exec_hire' },
        select: { id: true, companyId: true, title: true, summary: true, type: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!signal) {
      return NextResponse.json(
        { error: 'No exec_hire signal found. Run the seed first.' },
        { status: 404 },
      );
    }

    const contact = await prisma.contact.findFirst({
      where: { companyId: signal.companyId, firstName: 'Shelly', lastName: 'Chaka' },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
    });

    const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Shelly Chaka';
    const contactEmail = contact?.email ?? 'shellychaka@gm-demo.agentpilot.us';
    const contactTitle = contact?.title ?? 'Director AV Software Platform';

    let template = await prisma.playTemplate.findFirst({
      where: { userId, slug: 'executive-intro' },
      select: { id: true },
    });

    if (!template) {
      const created = await prisma.playTemplate.create({
        data: {
          userId,
          name: 'New C-Suite Executive',
          slug: 'executive-intro',
          description: '7-step executive intro play (demo)',
          scope: 'ACCOUNT',
          category: 'PROSPECTING',
          status: 'ACTIVE',
          triggerType: 'SIGNAL',
          signalTypes: ['exec_hire'],
        },
        select: { id: true },
      });
      template = created;
    }

    const playRun = await prisma.playRun.create({
      data: {
        userId,
        companyId: signal.companyId,
        playTemplateId: template.id,
        status: 'ACTIVE',
        accountSignalId: signal.id,
        triggerType: 'SIGNAL',
        triggerContext: {
          signalTitle: signal.title,
          signalSummary: signal.summary,
          demoBypass: true,
        },
      },
    });

    let phaseTemplateId: string;
    const existingPhase = await prisma.playPhaseTemplate.findFirst({
      where: { playTemplateId: template.id },
      select: { id: true },
    });
    if (existingPhase) {
      phaseTemplateId = existingPhase.id;
    } else {
      const newPhase = await prisma.playPhaseTemplate.create({
        data: {
          playTemplateId: template.id,
          orderIndex: 0,
          name: 'Outreach',
          gateType: 'MANUAL',
        },
      });
      phaseTemplateId = newPhase.id;
    }

    const phaseRun = await prisma.playPhaseRun.create({
      data: {
        playRunId: playRun.id,
        phaseTemplateId,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    let contactResearchTemplate = await prisma.contentTemplate.findFirst({
      where: {
        phaseTemplateId,
        contentGenerationType: 'contact_research',
      },
      select: { id: true },
    });
    if (!contactResearchTemplate) {
      const createdCt = await prisma.contentTemplate.create({
        data: {
          userId,
          phaseTemplateId,
          name: 'Find and enrich contact',
          contentType: PlayContentType.INTERNAL_NOTE,
          channel: ContentChannel.INTERNAL,
          contentGenerationType: 'contact_research',
          modelTier: ModelTier.SONNET,
          orderIndex: 0,
          contextSources: ['crm_opportunity', 'governance'],
          promptTemplate:
            '{{account.name}} {{contact.name}} — enrich contact with verified email, LinkedIn, phone.',
        },
        select: { id: true },
      });
      contactResearchTemplate = createdCt;
    }

    const now = new Date();
    for (const step of STEPS) {
      const suggestedDate = new Date(now);
      suggestedDate.setDate(suggestedDate.getDate() + step.dayOffset);
      suggestedDate.setMinutes(suggestedDate.getMinutes() + step.order);

      const isFirstResearchStep = step.order === 0 && contactResearchTemplate;
      const preCompleted = step.preCompleted === true;

      await prisma.playAction.create({
        data: {
          phaseRunId: phaseRun.id,
          title: `${step.name} — ${contactName}`,
          actionType: step.actionType,
          priority: 'MEDIUM',
          contactName,
          contactEmail,
          contactTitle,
          contentTemplateId: isFirstResearchStep ? contactResearchTemplate.id : undefined,
          generatedSubject: step.subject ?? null,
          generatedContent: step.body,
          generatedAt: new Date(),
          suggestedDate,
          status: preCompleted ? 'EXECUTED' : 'PENDING',
          executedAt: preCompleted ? new Date() : null,
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await prisma.accountSignal
      .update({
        where: { id: signal.id },
        data: { status: 'acted' },
      })
      .catch(() => {});

    const redirect = myDayUrlAfterPlayStart(playRun.id, signal.companyId);

    return NextResponse.json({
      playRunId: playRun.id,
      companyId: signal.companyId,
      redirect,
      steps: STEPS.length,
      contact: contactName,
    });
  } catch (error) {
    console.error('Demo run-play error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create demo play run',
      },
      { status: 500 },
    );
  }
}

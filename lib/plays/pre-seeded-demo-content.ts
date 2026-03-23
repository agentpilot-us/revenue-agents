/**
 * Pre-seeded content for the 7-step "New C-Suite Executive" demo play.
 * Used by createPlayRunFromTemplate (applyPreSeededContent) so every new run
 * (Work This, Start from Catalog, manual) gets content without clicking Generate.
 * Keys are lowercase step name prefixes; matching is by title (e.g. "Research contact — Shelly Chaka").
 */

export const DEMO_PRE_SEEDED_CONTENT: Record<
  string,
  { subject?: string; body: string }
> = {
  'research contact': {
    body: `Check contact database for Shelly Chaka. Enrich with verified email and LinkedIn.`,
  },
  'send congratulations email': {
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
  'research background': {
    body: `Executive Brief: Shelly Chaka / GM AV Engineering

Key points:
- Built Cruise's safety case from scratch. Thinks in safety frameworks, not feature specs. Lead with DRIVE's safety architecture and ASIL-D certification path.
- Cruise used custom silicon — that investment is gone. She needs production-ready, safety-certified compute.
- GM-NVIDIA expanded partnership at GTC March 2025. Not a cold intro.
- Qualcomm has 2027 ADAS L2+. Position Thor as L3+ safety-certified layer — her wheelhouse.
- GM eyes-off driving: 2028 Cadillac Escalade IQ. She owns the safety validation path.

Talk track: Cruise safety expertise → DRIVE Thor safety architecture → DRIVE Sim validation → GTC invite.`,
  },
  'linkedin connection note': {
    body: `Shelly — Congrats on the expanded AV role at GM. Your safety validation work at Cruise set the standard. I'm on the DRIVE platform side at NVIDIA — with the expanded GM partnership, I'd love to connect. — Sarah`,
  },
  'schedule executive welcome briefing': {
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
  'custom roi assessment': {
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
  'position as early win partner': {
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
};

// Upsell play: "Expansion: DGX to DRIVE Thor" — keyed by step name prefix; used when playTemplate.slug === 'expansion-dgx-to-drive-thor'
export const UPSELL_DEMO_PRE_SEEDED_CONTENT: Record<
  string,
  { subject?: string; body: string }
> = {
  'contact sweep': {
    body: `CONTACT SWEEP: AV Engineering Buying Group — DRIVE Thor Expansion

OBJECTIVE: Identify and prioritize contacts in the AV Engineering group for the DGX → DRIVE Thor expansion conversation.

EXISTING CONTACTS (15 in AV Engineering):
■ Shelly Chaka — VP AV Engineering (CHAMPION CANDIDATE — just promoted, owns safety validation path, key decision maker for L3+ compute)
■ Sarah Williams — Director AV Software Platform (technical evaluator — owns the software stack that runs on compute)
■ Emily Nakamura — Head of Perception Systems (end user — her models run on DRIVE, cares about TOPS and inference latency)
■ David Park — Director Simulation & Validation (end user — DRIVE Sim buyer, validates against safety case)
■ Michael Rodriguez — Chief Engineer ADAS (technical evaluator — current Qualcomm L2+ owner, needs to understand Thor's L3+ positioning)

CROSS-SELL CHAMPION:
■ Frank Morrison — CTO, IT Infrastructure (EXISTING CHAMPION — sponsors the $8M DGX deployment, has budget authority, can make the internal intro to AV Engineering)

RECOMMENDED APPROACH:
1. Frank Morrison is the bridge — he sponsors DGX, knows our team, and can intro us to Shelly's group. Lead with him.
2. Shelly Chaka is the decision maker — safety certification path for L3+ is her call. Position DRIVE Thor's ASIL-D architecture.
3. Sarah Williams is the technical gatekeeper — she needs to validate that Thor's software stack works with GM's vehicle OS.
4. Multi-thread: Don't rely on one contact. Get Frank to intro us to both Shelly and Sarah.

NEXT: Send GTC event invite to the group (Step 2), then champion brief to Frank (Step 3).`,
  },
  'send webinar invite': {
    subject: 'GTC Automotive AI Summit — DRIVE Thor hands-on session',
    body: `Hi team,

I wanted to flag an event that's directly relevant to the work you're doing on GM's AV compute architecture.

NVIDIA GTC Automotive AI Summit
May 18, 2026 | San Jose Convention Center

What's on the agenda:
• DRIVE Thor production timeline and safety certification roadmap
• Hands-on workshop: centralized compute architecture for L3+ (ASIL-D path, lockstep cores, safety island)
• Omniverse factory digital twin deployments — relevant for the Orion plant build
• Executive networking dinner for OEM leadership (small group, invite-only)

Why this matters for GM right now:
You're targeting eyes-off driving for the 2028 Escalade IQ. This session covers how Mercedes achieved L3 certification across 5 markets with DRIVE — 60% faster than their previous generation. Shelly, given your safety validation background, the certification session would be particularly valuable.

I can reserve seats for your team. Let me know who should be on the list — happy to include anyone from AV Engineering or Vehicle Software Platform.

Best,
Sarah Kim
Strategic Account Director, Automotive
NVIDIA`,
  },
  'send drive thor spec': {
    subject: 'DRIVE Thor executive brief for your team',
    body: `Frank,

Thanks for being open to connecting us with Shelly's AV Engineering group. To make that conversation productive, I put together a brief your team can review ahead of time.

The attached executive brief covers:
• DRIVE Thor architecture: 2,000 TOPS unified compute for ADAS + cockpit + safety monitoring on a single SoC
• GM-specific ROI: $1,200/vehicle BOM savings through ECU consolidation, 30% faster development cycles with DRIVE OS
• Safety certification: ASIL-D path with lockstep cores — maps directly to the SAFE-ADS framework Shelly's team built
• Execution roadmap: phased deployment from current DGX training infrastructure through DRIVE Thor in-vehicle production
• Full-stack partnership: DGX (training) → DRIVE Sim (validation) → DRIVE Thor (deployment) → Omniverse (factory digital twin)

This builds on the DGX infrastructure your team already runs. The pitch to Shelly's group is straightforward: you train on DGX today, now deploy what you train on DRIVE Thor. One ecosystem, one software stack, continuous improvement.

The brief is designed for executive circulation — Shelly, Sterling Anderson, and Mary Barra's office should all be able to scan it in 5 minutes and understand the value.

Happy to walk through it together before you share, or I can join the intro meeting directly. Whatever works best for your team.

Best,
Sarah`,
  },
};

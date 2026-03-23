'use client';

import { useState, useEffect, useRef } from 'react';

const ACCENT = '#3B82F6';
const BG = '#0B1120';
const SURFACE = '#111827';
const SURFACE2 = '#1A2332';
const BORDER = '#1E293B';
const TEXT = '#E2E8F0';
const TEXT2 = '#94A3B8';
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const PURPLE = '#8B5CF6';
const TEAL = '#14B8A6';

const DEMO_SCENARIO = {
  signal: 'GM Promotes Shelly Chaka to VP AV Engineering (ex-Cruise CSO)',
  account: 'General Motors',
  division: 'AV Engineering',
  contact: 'Shelly Chaka',
  product: 'NVIDIA DRIVE Thor',
  play: 'New C-Suite Executive',
};

// Result data types for step cards
type ContactCardData = {
  name: string;
  title: string;
  company: string;
  previousRole: string;
  education: string;
  background: string;
  email: string;
  linkedin: string;
};

type EmailData = {
  to: string;
  subject: string;
  body: string;
};

type BriefingSection = { heading: string; content: string };
type BriefingData = {
  title: string;
  sections: BriefingSection[];
};

type LinkedInData = { note: string };

type MeetingData = {
  title: string;
  duration: string;
  suggestedDate: string;
  agenda: string;
  attendees: string;
};

type StepResult =
  | { type: 'contact_card'; data: ContactCardData }
  | { type: 'email'; data: EmailData }
  | { type: 'briefing'; data: BriefingData }
  | { type: 'linkedin'; data: LinkedInData }
  | { type: 'meeting'; data: MeetingData };

type DemoStep = {
  id: number;
  name: string;
  channel: string;
  icon: string;
  color: string;
  duration: number;
  thinkingMessages: string[];
  result: StepResult;
  completion: string;
};

const STEPS: DemoStep[] = [
  {
    id: 1,
    name: 'Research contact',
    channel: 'task',
    icon: '🔍',
    color: '#8B5CF6',
    duration: 3200,
    thinkingMessages: [
      'Searching LinkedIn for Shelly Chaka, VP AV Engineering at General Motors...',
      'Cross-referencing with Cruise leadership history...',
      'Pulling AV safety certification expertise and SAE award history...',
    ],
    result: {
      type: 'contact_card',
      data: {
        name: 'Shelly Chaka',
        title: 'VP, Autonomous Vehicle Engineering',
        company: 'General Motors',
        previousRole: 'Chief Safety Officer, Cruise',
        education: 'MS Automotive Engineering, University of Michigan',
        background:
          "Built Cruise's AV safety case from scratch — safety metrics, validation thresholds, BOD-level reporting. 30-year career spanning Cruise, Torc Robotics, Locomation, Ford, and Virginia Tech. SAE International 2021 J. Cordell Breed Award winner. Expert in simulation-based validation and regulatory compliance for automated driving systems.",
        email: 'shelly.chaka@gm.com',
        linkedin: 'linkedin.com/in/shelly-chaka-968723121',
      },
    },
    completion: 'Contact added to GM account database ✓',
  },
  {
    id: 2,
    name: 'Send congratulations email',
    channel: 'email',
    icon: '✉️',
    color: '#3B82F6',
    duration: 4000,
    thinkingMessages: [
      "Analyzing Chaka's career trajectory from Cruise to GM...",
      'Referencing GTC 2025 GM-NVIDIA partnership announcement...',
      'Crafting congratulations with safety-first positioning...',
    ],
    result: {
      type: 'email',
      data: {
        to: 'shelly.chaka@gm.com',
        subject: 'Congrats on the expanded role, Shelly',
        body: "Shelly,\n\nCongrats on taking the lead of GM's AV Engineering group. Given what you built at Cruise — especially the safety case framework and the validation infrastructure — this is the right move at the right time for GM.\n\nThe work your team did on simulation-based validation and regulatory compliance is exactly what GM needs as they push toward eyes-off driving for the 2028 Escalade IQ. You may have seen that Jensen and Mary Barra announced an expanded NVIDIA-GM partnership at GTC — on the AV side, DRIVE Thor at 2000 TOPS is where the safety-certified compute conversation is heading.\n\nNo pitch — just wanted to say congrats and connect. Frank Morrison on your IT side has been a great partner on the DGX infrastructure, happy to make that intro if helpful.\n\nBest,\nSarah Kim\nStrategic Account Director, Automotive\nNVIDIA",
      },
    },
    completion: 'Email sent to shelly.chaka@gm.com ✓',
  },
  {
    id: 3,
    name: 'Research background & tech stack',
    channel: 'internal',
    icon: '📋',
    color: '#14B8A6',
    duration: 3500,
    thinkingMessages: [
      'Compiling GM AV Engineering safety architecture...',
      'Analyzing Cruise-to-GM technology transfer...',
      'Mapping competitive landscape for L3+ compute...',
    ],
    result: {
      type: 'briefing',
      data: {
        title: 'Executive Briefing: Shelly Chaka, GM AV Engineering',
        sections: [
          {
            heading: 'Background',
            content:
              "Built Cruise's safety case from scratch — AV safety metrics, validation thresholds, BOD reporting. 30 years in safety engineering across Cruise, Torc, Locomation, Ford, Virginia Tech. SAE Breed Award 2021. MS Automotive Engineering, University of Michigan.",
          },
          {
            heading: 'GM AV context',
            content:
              "Cruise restructured late 2024. Custom silicon investment gone — she needs production-ready, safety-certified compute. GM targeting eyes-off driving for 2028 Cadillac Escalade IQ. Sterling Anderson (ex-Tesla Autopilot) leads product. She owns the safety validation path.",
          },
          {
            heading: 'NVIDIA relationship',
            content:
              "GM-NVIDIA expanded partnership announced at GTC March 2025 (Jensen + Barra). AI for manufacturing, enterprise, and in-car. This is not a cold intro — it's extending an existing partnership into AV safety certification.",
          },
          {
            heading: 'Key talking points',
            content:
              "1) Lead with safety architecture (ASIL-D, lockstep cores), not raw TOPS. 2) Position Thor as L3+ safety-certified layer above Qualcomm's L2+ ADAS. 3) DRIVE Sim for simulation-based validation — her specialty. 4) Mercedes L3 certification as proof point.",
          },
        ],
      },
    },
    completion: 'Briefing saved to GM account intelligence ✓',
  },
  {
    id: 4,
    name: 'LinkedIn connection note',
    channel: 'linkedin',
    icon: '💼',
    color: '#3B82F6',
    duration: 2500,
    thinkingMessages: [
      'Crafting connection note referencing Cruise safety work...',
      'Keeping under 300 characters for LinkedIn limit...',
    ],
    result: {
      type: 'linkedin',
      data: {
        note: "Shelly — Congrats on the expanded AV role at GM. Your safety validation work at Cruise set the standard. I'm on the DRIVE platform side at NVIDIA — with the expanded GM partnership, I'd love to connect. — Sarah",
      },
    },
    completion: 'LinkedIn connection request sent ✓',
  },
  {
    id: 5,
    name: 'Schedule executive welcome briefing',
    channel: 'meeting',
    icon: '📅',
    color: '#22C55E',
    duration: 2800,
    thinkingMessages: [
      'Generating meeting agenda focused on safety certification...',
      'Identifying optimal timing (Day 3 — settled but prioritizing)...',
    ],
    result: {
      type: 'meeting',
      data: {
        title: 'NVIDIA × GM: AV Safety & Compute Architecture',
        duration: '45 min',
        suggestedDate: '3 days from now',
        agenda:
          "1. Shelly's priorities for GM AV safety certification in 2026 (15 min)\n2. DRIVE Thor safety architecture — ASIL-D path, lockstep cores, safety island (15 min)\n3. DRIVE Sim for simulation-based validation (10 min)\n4. GTC Automotive AI Summit invite + next steps (5 min)",
        attendees:
          'Shelly Chaka (GM), Sarah Kim (NVIDIA), Dr. Raj Patel (NVIDIA AV Solutions Architect)',
      },
    },
    completion: 'Calendar invite drafted and queued for Day 3 ✓',
  },
  {
    id: 6,
    name: 'Custom ROI assessment',
    channel: 'email',
    icon: '📊',
    color: '#F59E0B',
    duration: 3000,
    thinkingMessages: [
      'Pulling Mercedes L3 certification timeline data...',
      'Modeling safety certification acceleration with DRIVE Sim...',
      'Comparing multi-chip vs centralized safety architecture...',
    ],
    result: {
      type: 'email',
      data: {
        to: 'shelly.chaka@gm.com',
        subject: 'DRIVE Thor — safety certification ROI for GM AV',
        body: "Shelly,\n\nQuick framework for GM's AV safety certification path:\n\nCertification timeline: Mercedes achieved L3 across 5 markets with DRIVE + DRIVE Sim. 60% faster than previous generation. Thor's enhanced safety architecture (ASIL-D, lockstep cores, safety island) supports GM's 2028 eyes-off timeline.\n\nSimulation: DRIVE Sim does 1M+ simulated miles/day with physically accurate sensor models. For the safety case you're building, that's edge case validation at a pace physical testing can't match.\n\nConsolidation: Thor handles ADAS + cockpit + safety monitoring on one SoC. Fewer interfaces, fewer failure modes, one validation target.\n\nGTC Automotive AI Summit May 18 has a dedicated AV safety certification session. I'll send an invite.\n\nBest,\nSarah",
      },
    },
    completion: 'ROI email queued for Day 7 ✓',
  },
  {
    id: 7,
    name: 'Position as early win partner',
    channel: 'email',
    icon: '🎯',
    color: '#22C55E',
    duration: 2500,
    thinkingMessages: [
      'Identifying quick-win pilot for AV safety team...',
      'Framing partnership for experienced safety executive...',
    ],
    result: {
      type: 'email',
      data: {
        to: 'shelly.chaka@gm.com',
        subject: 'Quick wins for your first 90 days',
        body: "Shelly,\n\nWhat gets you a concrete result in Q1:\n\nSafety architecture review: Joint session — DRIVE Thor's ASIL-D architecture mapped against GM's SAFE-ADS framework. Half-day, your team and ours. You walk away with a clear map.\n\nDRIVE Sim pilot: 30-day access for your validation team. Run your existing safety scenarios, compare coverage and throughput. No commitment, just data.\n\nYour contact: Raj Patel (AV Solutions Architect). Worked with Mercedes on L3 certification, knows the regulatory path cold.\n\nAlso saving you a seat at the GTC executive dinner (May 18, San Jose). Small group, OEM safety leadership. Given your SAE Breed Award, you'd be among peers.\n\nBest,\nSarah",
      },
    },
    completion: 'Partnership email queued for Day 14 ✓',
  },
];

// Scenario 1: New C-Suite Executive (same as above)
const EXEC_SCENARIO = DEMO_SCENARIO;
const EXEC_STEPS = STEPS;

// Scenario 2: Expansion DGX to DRIVE Thor (3 steps)
const UPSELL_SCENARIO = {
  signal: 'Strategic expansion: DGX infrastructure → DRIVE Thor AV compute',
  account: 'General Motors',
  division: 'AV Engineering',
  contact: 'Frank Morrison (Champion)',
  product: 'NVIDIA DRIVE Thor',
  play: 'Expansion: DGX to DRIVE Thor',
};

const UPSELL_STEPS: DemoStep[] = [
  {
    id: 1,
    name: 'Contact sweep: buying committee',
    channel: 'task',
    icon: '🔍',
    color: PURPLE,
    duration: 2800,
    thinkingMessages: [
      'Mapping AV Engineering buying committee...',
      'Identifying champion for cross-sell...',
      'Prioritizing by influence and access...',
    ],
    result: {
      type: 'briefing',
      data: {
        title: 'Buying Committee: AV Engineering → DRIVE Thor',
        sections: [
          { heading: 'Decision maker', content: 'Shelly Chaka — VP AV Engineering. Owns safety certification path for L3+ compute. Previously CSO at Cruise. Key decision: which compute platform gets safety-certified for eyes-off driving.' },
          { heading: 'Champion (cross-sell)', content: 'Frank Morrison — CTO, IT Infrastructure. Sponsors the $8M DGX deployment. Has budget authority and the relationship to introduce us to AV Engineering. The bridge from IT to AV.' },
          { heading: 'Technical evaluator', content: 'Sarah Williams — Director AV Software Platform. Owns the software stack that runs on compute. Needs to validate that Thor\'s software stack works with GM\'s vehicle OS.' },
          { heading: 'End users', content: 'Emily Nakamura (Head of Perception) — her models run on DRIVE, cares about TOPS and inference latency. David Park (Director Simulation) — DRIVE Sim buyer, validates against safety case.' },
          { heading: 'Approach', content: 'Multi-thread: Frank intros us to Shelly and Sarah. Lead with safety architecture for Shelly, software compatibility for Sarah. GTC event invite to the full group, then champion brief to Frank for internal distribution.' },
        ],
      },
    },
    completion: 'Buying committee mapped — 5 contacts prioritized ✓',
  },
  {
    id: 2,
    name: 'Send GTC event invite',
    channel: 'email',
    icon: '✉️',
    color: ACCENT,
    duration: 3200,
    thinkingMessages: [
      'Pulling GTC Automotive AI Summit from content library...',
      "Personalizing for GM's 2028 eyes-off timeline...",
      'Drafting multi-recipient invite...',
    ],
    result: {
      type: 'email',
      data: {
        to: 'AV Engineering team (5 contacts)',
        subject: 'GTC Automotive AI Summit — DRIVE Thor hands-on session',
        body: "Hi team,\n\nI wanted to flag an event directly relevant to GM's AV compute architecture.\n\nNVIDIA GTC Automotive AI Summit\nMay 18, 2026 | San Jose Convention Center\n\nWhat's on the agenda:\n• DRIVE Thor production timeline and safety certification roadmap\n• Hands-on workshop: centralized compute for L3+ (ASIL-D path, lockstep cores)\n• Omniverse factory digital twin deployments — relevant for Orion plant\n• Executive networking dinner (invite-only)\n\nWhy this matters now: You're targeting eyes-off driving for the 2028 Escalade IQ. This session covers how Mercedes achieved L3 certification across 5 markets with DRIVE — 60% faster than their previous generation.\n\nShelly, given your safety validation background, the certification session would be particularly valuable.\n\nI can reserve seats for your team. Let me know who should be on the list.\n\nBest,\nSarah Kim\nStrategic Account Director, Automotive\nNVIDIA",
      },
    },
    completion: 'Event invite sent to 5 contacts ✓',
  },
  {
    id: 3,
    name: 'Send champion brief to Frank Morrison',
    channel: 'email',
    icon: '🎯',
    color: GREEN,
    duration: 3500,
    thinkingMessages: [
      'Generating executive brief for champion distribution...',
      'Referencing DGX relationship and DRIVE Thor architecture...',
      'Packaging for internal forwarding...',
    ],
    result: {
      type: 'email',
      data: {
        to: 'frank.morrison@gm.com',
        subject: 'DRIVE Thor executive brief for your team',
        body: "Frank,\n\nThanks for being open to connecting us with Shelly's AV Engineering group. To make that conversation productive, I put together a brief your team can review ahead of time.\n\nThe executive brief covers:\n• DRIVE Thor: 2,000 TOPS unified compute for ADAS + cockpit + safety on one SoC\n• GM-specific ROI: $1,200/vehicle BOM savings, 30% faster dev cycles\n• Safety certification: ASIL-D path maps to Shelly's SAFE-ADS framework\n• Execution roadmap: DGX (training) → DRIVE Sim (validation) → DRIVE Thor (deployment)\n• Full-stack partnership: one ecosystem, one software stack, continuous improvement\n\nThis builds on the DGX infrastructure your team already runs. The pitch to Shelly's group: you train on DGX today, now deploy what you train on DRIVE Thor.\n\nThe brief is designed for executive circulation — Shelly, Sterling Anderson, and Mary Barra's office should all be able to scan it in 5 minutes.\n\nHappy to walk through it together before you share, or join the intro meeting directly.\n\nBest,\nSarah",
      },
    },
    completion: 'Champion brief sent to Frank Morrison ✓',
  },
];

const PRESETS: { label: string; scenario: 'exec' | 'upsell' | 'both' }[] = [
  { label: 'Run the New C-Suite Executive play for Shelly Chaka at GM AV Engineering', scenario: 'exec' },
  { label: 'Run the Expansion play: DGX to DRIVE Thor for GM AV Engineering', scenario: 'upsell' },
  { label: 'Work the exec hire signal for General Motors', scenario: 'exec' },
  { label: 'Run both plays for GM AV Engineering', scenario: 'both' },
];

function TypeWriter({
  text,
  speed = 12,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onComplete]);
  return <>{displayed}</>;
}

function ContactCard({ data }: { data: ContactCardData }) {
  return (
    <div
      style={{
        background: SURFACE2,
        borderRadius: 8,
        padding: 16,
        border: `1px solid ${BORDER}`,
        margin: '8px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${ACCENT}, ${PURPLE})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          {data.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: TEXT, fontSize: 15 }}>
            {data.name}
          </div>
          <div style={{ color: TEXT2, fontSize: 13 }}>{data.title}</div>
          <div style={{ color: ACCENT, fontSize: 12 }}>{data.company}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: TEXT, fontWeight: 500 }}>Previous:</span>{' '}
          {data.previousRole}
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: TEXT, fontWeight: 500 }}>Education:</span>{' '}
          {data.education}
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: TEXT, fontWeight: 500 }}>Background:</span>{' '}
          {data.background}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ color: ACCENT, fontSize: 12 }}>{data.email}</span>
          <span style={{ color: ACCENT, fontSize: 12 }}>{data.linkedin}</span>
        </div>
      </div>
    </div>
  );
}

function EmailCard({ data }: { data: EmailData }) {
  return (
    <div
      style={{
        background: SURFACE2,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        margin: '8px 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: SURFACE,
          padding: '10px 16px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          gap: 12,
          fontSize: 13,
        }}
      >
        <span style={{ color: TEXT2 }}>
          To: <span style={{ color: TEXT }}>{data.to}</span>
        </span>
      </div>
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 14,
          fontWeight: 500,
          color: TEXT,
        }}
      >
        {data.subject}
      </div>
      <div
        style={{
          padding: 16,
          fontSize: 13,
          color: TEXT2,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}
      >
        {data.body}
      </div>
    </div>
  );
}

function BriefingCard({ data }: { data: BriefingData }) {
  return (
    <div
      style={{
        background: SURFACE2,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        margin: '8px 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: SURFACE,
          padding: '10px 16px',
          borderBottom: `1px solid ${BORDER}`,
          fontWeight: 600,
          color: TEXT,
          fontSize: 14,
        }}
      >
        {data.title}
      </div>
      {data.sections.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '12px 16px',
            borderBottom:
              i < data.sections.length - 1 ? `1px solid ${BORDER}` : 'none',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: TEAL,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {s.heading}
          </div>
          <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>
            {s.content}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkedInCard({ data }: { data: LinkedInData }) {
  return (
    <div
      style={{
        background: SURFACE2,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        margin: '8px 0',
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: ACCENT,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        LinkedIn connection note
      </div>
      <div
        style={{
          fontSize: 13,
          color: TEXT2,
          lineHeight: 1.6,
          fontStyle: 'italic',
        }}
      >
        &quot;{data.note}&quot;
      </div>
    </div>
  );
}

function MeetingCard({ data }: { data: MeetingData }) {
  return (
    <div
      style={{
        background: SURFACE2,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        margin: '8px 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: SURFACE,
          padding: '10px 16px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, color: TEXT, fontSize: 14 }}>
          {data.title}
        </span>
        <span style={{ fontSize: 12, color: GREEN }}>
          {data.duration} · {data.suggestedDate}
        </span>
      </div>
      <div
        style={{
          padding: 16,
          fontSize: 13,
          color: TEXT2,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: TEXT, fontWeight: 500 }}>Attendees:</span>{' '}
          {data.attendees}
        </div>
        <div>
          <span style={{ color: TEXT, fontWeight: 500 }}>Agenda:</span>
        </div>
        <div style={{ marginTop: 4 }}>{data.agenda}</div>
      </div>
    </div>
  );
}

function ResultRenderer({ result }: { result: StepResult | null }) {
  if (!result) return null;
  switch (result.type) {
    case 'contact_card':
      return <ContactCard data={result.data} />;
    case 'email':
      return <EmailCard data={result.data} />;
    case 'briefing':
      return <BriefingCard data={result.data} />;
    case 'linkedin':
      return <LinkedInCard data={result.data} />;
    case 'meeting':
      return <MeetingCard data={result.data} />;
    default:
      return null;
  }
}

function PulsingDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        animation: 'pulse 1.2s ease-in-out infinite',
      }}
    />
  );
}

type ScenarioKey = 'exec' | 'upsell' | 'both';

export default function AutonomousPlayDemo() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepPhase, setStepPhase] = useState<'idle' | 'thinking' | 'result' | 'complete'>('idle');
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [showUserMsg, setShowUserMsg] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>(null);
  const [bothPhase, setBothPhase] = useState(0);
  const [bothExecDone, setBothExecDone] = useState(false);
  const [combinedStats, setCombinedStats] = useState<{
    totalSteps: number;
    emails: number;
    linkedin: number;
    meetings: number;
    briefings: number;
    championBriefs: number;
  } | null>(null);

  const getScenario = () => {
    if (activeScenario === 'upsell') return UPSELL_SCENARIO;
    if (activeScenario === 'both' && bothPhase === 1) return UPSELL_SCENARIO;
    return EXEC_SCENARIO;
  };

  const getSteps = () => {
    if (activeScenario === 'upsell') return UPSELL_STEPS;
    if (activeScenario === 'both' && bothPhase === 1) return UPSELL_STEPS;
    return EXEC_STEPS;
  };

  const currentSteps = getSteps();
  const currentScenario = getScenario();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStep, stepPhase, thinkingIdx, completedSteps, showUserMsg, allDone, bothPhase]);

  function startDemo(text: string, scenario: ScenarioKey) {
    setUserMessage(text);
    setShowUserMsg(true);
    setStarted(true);
    setActiveScenario(scenario);
    setCurrentStep(-1);
    setCompletedSteps([]);
    setAllDone(false);
    setBothPhase(0);
    setBothExecDone(false);
    setCombinedStats(null);
    const steps = scenario === 'both' ? EXEC_STEPS : scenario === 'upsell' ? UPSELL_STEPS : EXEC_STEPS;
    setTimeout(() => runStep(0, steps), 1500);
  }

  function runStep(idx: number, steps: DemoStep[]) {
    if (idx >= steps.length) {
      if (activeScenario === 'both' && !bothExecDone) {
        setBothExecDone(true);
        setBothPhase(1);
        setCurrentStep(-1);
        setCompletedSteps([]);
        setTimeout(() => runStep(0, UPSELL_STEPS), 2000);
        return;
      }
      setAllDone(true);
      if (activeScenario === 'both') {
        setCombinedStats({
          totalSteps: EXEC_STEPS.length + UPSELL_STEPS.length,
          emails: 5,
          linkedin: 1,
          meetings: 1,
          briefings: 1,
          championBriefs: 1,
        });
      }
      return;
    }
    const step = steps[idx];
    setCurrentStep(idx);
    setStepPhase('thinking');
    setThinkingIdx(0);
    let ti = 0;
    const thinkInterval = setInterval(() => {
      ti++;
      if (ti < step.thinkingMessages.length) {
        setThinkingIdx(ti);
      } else {
        clearInterval(thinkInterval);
        setStepPhase('result');
        setTimeout(() => {
          setStepPhase('complete');
          setCompletedSteps((prev) => [...prev, idx]);
          setTimeout(() => runStep(idx + 1, steps), 800);
        }, step.duration);
      }
    }, 1000);
  }

  function reset() {
    setStarted(false);
    setCurrentStep(-1);
    setStepPhase('idle');
    setThinkingIdx(0);
    setCompletedSteps([]);
    setShowUserMsg(false);
    setAllDone(false);
    setUserMessage('');
    setInputText('');
    setActiveScenario(null);
    setBothPhase(0);
    setBothExecDone(false);
    setCombinedStats(null);
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: BG,
        color: TEXT,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .slide-in { animation: slideIn 0.3s ease-out; }
        input::placeholder { color: ${TEXT2}; }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: SURFACE,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${ACCENT}, ${PURPLE})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            A
          </div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>AgentPilot</span>
          <span
            style={{
              fontSize: 12,
              color: TEXT2,
              background: SURFACE2,
              padding: '2px 8px',
              borderRadius: 4,
              marginLeft: 4,
            }}
          >
            Autonomous Mode
          </span>
        </div>
        {started && (
          <button
            onClick={reset}
            style={{
              background: 'none',
              border: `1px solid ${BORDER}`,
              color: TEXT2,
              padding: '4px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Reset demo
          </button>
        )}
      </div>

      {/* Signal context banner */}
      {started && (
        <div
          className="fade-in"
          style={{
            padding: '8px 20px',
            background: activeScenario === 'upsell' || (activeScenario === 'both' && bothPhase === 1) ? `${PURPLE}15` : `${RED}15`,
            borderBottom: `1px solid ${activeScenario === 'upsell' || (activeScenario === 'both' && bothPhase === 1) ? `${PURPLE}30` : `${RED}30`}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: activeScenario === 'upsell' || (activeScenario === 'both' && bothPhase === 1) ? PURPLE : RED, fontWeight: 600 }}>
            {activeScenario === 'upsell' || (activeScenario === 'both' && bothPhase === 1) ? 'EXPANSION' : 'SIGNAL'}
          </span>
          <span style={{ color: TEXT2 }}>{currentScenario.signal}</span>
          <span style={{ marginLeft: 'auto', color: TEXT2 }}>
            {currentScenario.play} · {currentScenario.account} / {currentScenario.division}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {started && (
        <div
          style={{
            padding: '8px 20px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {currentSteps.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 4,
                  borderRadius: 2,
                  background: completedSteps.includes(i)
                    ? GREEN
                    : i === currentStep
                      ? `${ACCENT}80`
                      : BORDER,
                  transition: 'background 0.5s ease',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: completedSteps.includes(i)
                    ? GREEN
                    : i === currentStep
                      ? ACCENT
                      : TEXT2,
                }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {!started && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 20,
              paddingTop: 60,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${ACCENT}, ${PURPLE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              A
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}
              >
                Autonomous play execution
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: TEXT2,
                  maxWidth: 520,
                  lineHeight: 1.6,
                }}
              >
                Tell the agent what to do and watch it execute complete
                multi-step sales plays autonomously. Run the exec intro, the
                expansion upsell, or both back-to-back.
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
                maxWidth: 600,
                marginTop: 12,
              }}
            >
              {PRESETS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => startDemo(cmd.label, cmd.scenario)}
                  style={{
                    background: SURFACE,
                    border: `1px solid ${cmd.scenario === 'both' ? PURPLE : BORDER}`,
                    color: TEXT,
                    padding: '12px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'border-color 0.2s',
                  }}
                >
                  {cmd.scenario === 'upsell' && (
                    <span style={{ fontSize: 10, color: PURPLE, background: `${PURPLE}20`, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>EXPANSION</span>
                  )}
                  {cmd.scenario === 'both' && (
                    <span style={{ fontSize: 10, color: PURPLE, background: `${PURPLE}20`, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>BOTH PLAYS</span>
                  )}
                  {cmd.scenario === 'exec' && (
                    <span style={{ fontSize: 10, color: RED, background: `${RED}20`, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>SIGNAL</span>
                  )}
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User message */}
        {showUserMsg && (
          <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                background: ACCENT,
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '16px 16px 4px 16px',
                maxWidth: '80%',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {userMessage}
            </div>
          </div>
        )}

        {/* Agent acknowledgment */}
        {started && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${ACCENT}, ${PURPLE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              A
            </div>
            <div style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>
              {activeScenario === 'both' && bothPhase === 0 && (
                <>
                  Running <span style={{ fontWeight: 600, color: RED }}>both plays</span> for <span style={{ fontWeight: 600 }}>{EXEC_SCENARIO.account}</span> / {EXEC_SCENARIO.division}. Starting with <span style={{ fontWeight: 600, color: ACCENT }}>{EXEC_SCENARIO.play}</span> ({EXEC_STEPS.length} steps), then <span style={{ fontWeight: 600, color: PURPLE }}>{UPSELL_SCENARIO.play}</span> ({UPSELL_STEPS.length} steps).
                </>
              )}
              {activeScenario === 'both' && bothPhase === 1 && !allDone && (
                <>
                  Play 1 complete. Starting <span style={{ fontWeight: 600, color: PURPLE }}>{UPSELL_SCENARIO.play}</span> — {UPSELL_STEPS.length} steps. Targeting <span style={{ fontWeight: 600, color: TEAL }}>{UPSELL_SCENARIO.product}</span>.
                </>
              )}
              {activeScenario !== 'both' && (
                <>
                  Starting <span style={{ fontWeight: 600, color: ACCENT }}>{currentScenario.play}</span> for <span style={{ fontWeight: 600 }}>{currentScenario.contact}</span> at <span style={{ fontWeight: 600 }}>{currentScenario.account}</span> / {currentScenario.division}. Targeting <span style={{ fontWeight: 600, color: TEAL }}>{currentScenario.product}</span>. Executing {currentSteps.length} steps autonomously.
                </>
              )}
            </div>
          </div>
        )}

        {/* Play 2 divider for "both" mode */}
        {activeScenario === 'both' && bothPhase === 1 && (
          <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{ flex: 1, height: 1, background: PURPLE }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: PURPLE, textTransform: 'uppercase', letterSpacing: 1 }}>Play 2: {UPSELL_SCENARIO.play}</span>
            <div style={{ flex: 1, height: 1, background: PURPLE }} />
          </div>
        )}

        {/* Step executions */}
        {currentSteps.map((step, idx) => {
          if (idx > currentStep && !completedSteps.includes(idx)) return null;
          const isActive = idx === currentStep;
          const isComplete = completedSteps.includes(idx);

          return (
            <div
              key={`${bothPhase}-${idx}`}
              className="slide-in"
              style={{
                borderLeft: `2px solid ${
                  isComplete ? GREEN : isActive ? step.color : BORDER
                }`,
                paddingLeft: 16,
                marginLeft: 14,
                transition: 'border-color 0.5s',
              }}
            >
              {/* Step header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>{step.icon}</span>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: isComplete ? GREEN : TEXT,
                  }}
                >
                  Step {step.id}: {step.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: TEXT2,
                    background: SURFACE2,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {step.channel}
                </span>
                {isComplete && (
                  <span
                    style={{
                      fontSize: 11,
                      color: GREEN,
                      fontWeight: 600,
                    }}
                  >
                    ✓ Complete
                  </span>
                )}
                {isActive && stepPhase === 'thinking' && (
                  <PulsingDot color={step.color} />
                )}
              </div>

              {/* Thinking messages */}
              {isActive &&
                (stepPhase === 'thinking' || stepPhase === 'result') && (
                  <div style={{ marginBottom: 8 }}>
                    {step.thinkingMessages
                      .slice(0, thinkingIdx + 1)
                      .map((msg, mi) => (
                        <div
                          key={mi}
                          className="fade-in"
                          style={{
                            fontSize: 12,
                            color: TEXT2,
                            padding: '2px 0',
                            fontStyle: 'italic',
                          }}
                        >
                          {msg}
                        </div>
                      ))}
                  </div>
                )}

              {/* Result */}
              {(isActive &&
                (stepPhase === 'result' || stepPhase === 'complete')) ||
              isComplete ? (
                <div className="fade-in">
                  <ResultRenderer result={step.result} />
                </div>
              ) : null}

              {/* Completion message */}
              {isComplete && (
                <div
                  className="fade-in"
                  style={{
                    fontSize: 12,
                    color: GREEN,
                    fontWeight: 500,
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  {step.completion}
                </div>
              )}
            </div>
          );
        })}

        {/* All done summary */}
        {allDone && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${GREEN}, ${TEAL})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ✓
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: GREEN,
                  marginBottom: 6,
                }}
              >
                {activeScenario === 'both' ? 'Both plays complete' : `Play complete: ${currentScenario.play}`}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: TEXT2,
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                {activeScenario === 'both'
                  ? `${EXEC_STEPS.length + UPSELL_STEPS.length} steps executed across 2 plays for ${EXEC_SCENARIO.account} / ${EXEC_SCENARIO.division}.`
                  : `All ${currentSteps.length} steps executed for ${currentScenario.contact} at ${currentScenario.account} / ${currentScenario.division}.`}
              </div>
              <div
                style={{
                  background: SURFACE2,
                  borderRadius: 8,
                  padding: 16,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Execution summary
                </div>
                {activeScenario === 'both' ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT }}>10</div>
                        <div style={{ fontSize: 11, color: TEXT2 }}>Steps completed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>5</div>
                        <div style={{ fontSize: 11, color: TEXT2 }}>Emails generated</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: PURPLE }}>2</div>
                        <div style={{ fontSize: 11, color: TEXT2 }}>Plays executed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: TEAL }}>14d</div>
                        <div style={{ fontSize: 11, color: TEXT2 }}>Engagement arc</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: TEXT2, marginBottom: 8 }}>
                      Play 1: New C-Suite Executive (7 steps) · Play 2: DGX to DRIVE Thor (3 steps)
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT }}>{currentSteps.length}</div>
                      <div style={{ fontSize: 11, color: TEXT2 }}>Steps completed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{currentSteps.filter((s) => s.channel === 'email').length}</div>
                      <div style={{ fontSize: 11, color: TEXT2 }}>Emails generated</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: PURPLE }}>{activeScenario === 'upsell' ? '3d' : '14d'}</div>
                      <div style={{ fontSize: 11, color: TEXT2 }}>Engagement arc</div>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    padding: '8px 12px',
                    background: `${GREEN}15`,
                    borderRadius: 6,
                    fontSize: 12,
                    color: GREEN,
                    textAlign: 'center',
                  }}
                >
                  {activeScenario === 'both'
                    ? 'Total autonomous execution time: ~40 seconds · Manual equivalent: ~6 hours'
                    : activeScenario === 'upsell'
                      ? 'Total autonomous execution time: ~15 seconds · Manual equivalent: ~2 hours'
                      : 'Total autonomous execution time: ~25 seconds · Manual equivalent: ~4 hours'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${BORDER}`,
          background: SURFACE,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputText.trim() && (!started || allDone)) {
                const lower = inputText.trim().toLowerCase();
                const scenario: ScenarioKey = lower.includes('expansion') || lower.includes('upsell') || lower.includes('dgx') ? 'upsell' : lower.includes('both') ? 'both' : 'exec';
                startDemo(inputText.trim(), scenario);
                setInputText('');
              }
            }}
            placeholder={started && !allDone ? 'Agent is executing...' : 'Tell the agent what to do...'}
            disabled={started && !allDone}
            style={{
              flex: 1,
              background: SURFACE2,
              border: `1px solid ${BORDER}`,
              color: TEXT,
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              opacity: started && !allDone ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => {
              if (!started || allDone) {
                if (inputText.trim()) {
                  const lower = inputText.trim().toLowerCase();
                  const scenario: ScenarioKey = lower.includes('expansion') || lower.includes('upsell') || lower.includes('dgx') ? 'upsell' : lower.includes('both') ? 'both' : 'exec';
                  startDemo(inputText.trim(), scenario);
                  setInputText('');
                }
              }
            }}
            disabled={started && !allDone}
            style={{
              background: ACCENT,
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: started && !allDone ? 'default' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: started && !allDone ? 0.5 : 1,
            }}
          >
            {started && !allDone ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import './landing.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-instrument' });

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <polyline points="21 3 21 12 12 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <path d="M2 12h20" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 10 5-10 5L2 7l10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </svg>
  );
}

function SearchUsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8" r="4" />
      <path d="M2 20a8 8 0 0 1 16 0" />
      <path d="m21 21-3.5-3.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 12 19 5" />
      <circle cx="19" cy="5" r="1" />
    </svg>
  );
}

type TabId = 'enterprise' | 'abm' | 'cs';

const problemCards = [
  {
    tag: 'Strategic AEs',
    title: 'You spend 10+ hours per account connecting your product to their world',
    body: 'Every target account needs different messaging, stakeholders, and proof points. Researching each one and translating your value into their language takes so long that by the time you are ready to reach out, the moment has already moved.'
  },
  {
    tag: 'ABM & Demand Gen',
    title: 'Personalized campaigns break when every asset needs a new request and review cycle',
    body: 'Your team needs different pages, briefs, and follow-up assets for different industries, buying groups, and accounts, but creative and production bottlenecks force you back to generic campaigns that do not feel personal.'
  },
  {
    tag: 'Customer Success',
    title: 'Expansion plays live in spreadsheets until a champion leaves and the account is already at risk',
    body: 'Signals that should trigger action get missed, renewal prep starts too late, and QBR content becomes a scramble. Your team stays reactive when it should be ahead of every stakeholder and every shift in the account.'
  },
  {
    tag: 'Revenue Leadership',
    title: 'Your playbooks live in decks, but execution is different account by account and rep by rep',
    body: 'You can define the motion, but not enforce it. There is no shared system for prioritizing accounts, guiding next-best-actions, or seeing which plays are creating pipeline versus getting ignored.'
  }
];

const howSteps = [
  {
    number: '01',
    title: 'AI Learns Your Company',
    body: 'Point AgentPilot at your company and it builds a living foundation for every team: products, positioning, proof points, competitive context, case studies, and the messaging your market should hear.',
    outcome: '→ Set your story once and keep every downstream asset aligned',
    details: ['Products', 'Messaging Frameworks', 'Competitive Intel', 'Case Studies', 'Industry Playbooks', 'Content Library']
  },
  {
    number: '02',
    title: '1-Click Account Research',
    body: 'Enter a target account and AgentPilot maps buying groups, surfaces live account developments, uncovers stakeholders, and connects your value to what each team cares about right now.',
    outcome: '→ Compress hours of manual account planning into minutes',
    details: ['Buying Groups', '50+ Signals', 'Contact Discovery', 'Stakeholder Mapping', 'Product Fit', 'Deal Context']
  },
  {
    number: '03',
    title: 'Personalized Pages & AI Chat',
    body: 'That intelligence turns into account pages built for each buying group. Embedded AI chat answers product, pricing, event, and fit questions while capturing what buyers care about in real time.',
    outcome: '→ Give every account a destination that feels built just for them',
    details: ['Personalized Pages', 'AI Chat', 'Event Agendas', 'Product Q&A', 'Pricing Answers']
  },
  {
    number: '04',
    title: 'Content Engine',
    body: 'Generate on-brand content across every major revenue motion: outreach, sales assets, executive summaries, and deal support. Create multiple angles fast, then refine with feedback instead of starting over.',
    outcome: '→ Move from idea to polished content without rebuilding context',
    details: ['Email', 'LinkedIn', 'Presentations', 'One-Pagers', 'Champion Kits', 'Talk Tracks', 'Demo Scripts', 'Ad Briefs', 'QBR Scripts', 'Video Scripts']
  },
  {
    number: '05',
    title: 'Playbooks & Workflows',
    body: 'Turn your best selling motions into repeatable execution. AgentPilot recommends plays, sequences next steps, and keeps momentum moving from trigger to outreach to follow-up to outcome.',
    outcome: '→ Encode your revenue motion once and execute it account after account',
    details: ['Tactical Plays', 'Playbook Templates', 'Multi-Step Sequences', 'Adaptive Roadmaps', 'Outcome Tracking']
  },
  {
    number: '06',
    title: 'Analytics & Smart Alerts',
    body: 'See who engaged, what they asked, how long they stayed, and what action should happen next. Buying signals and engagement triggers create follow-up momentum without waiting on a rep to notice.',
    outcome: '→ Follow up with timing and context, not guesswork',
    details: ['Visitor Tracking', 'Engagement Triggers', 'Campaign Analytics', 'Chat Insights', 'CRM Sync', 'Smart Alerts']
  }
];

const roleCards = [
  {
    icon: <UsersIcon />,
    label: 'Strategic AEs',
    title: 'Close with more context and less busywork',
    body: 'Get meeting prep in seconds, multi-angle outreach drafts, champion kits on demand, real-time engagement alerts, and sequences that keep the next move in front of the rep.',
    proof: ['→ Meeting prep in seconds', '→ Champion kits on demand']
  },
  {
    icon: <MessageSquareIcon />,
    label: 'ABM & Demand Gen',
    title: 'Launch personalized campaigns without a production bottleneck',
    body: 'Build pages, briefs, and follow-up assets for each segment or buying group while keeping the brand story, value props, and calls to action consistent across every touchpoint.',
    proof: ['→ Personalized campaigns at scale', '→ Brand consistency without manual review']
  },
  {
    icon: <UsersGroupIcon />,
    label: 'Customer Success',
    title: 'Run expansion and renewal motions before the account drifts',
    body: 'Stay ahead of stakeholder changes, generate QBR and renewal content fast, and trigger re-engagement plays the moment a meaningful signal appears inside a strategic account.',
    proof: ['→ Proactive expansion plays', '→ Renewal preparation with context']
  },
  {
    icon: <BriefcaseIcon />,
    label: 'Revenue Leadership',
    title: 'Turn playbooks into execution instead of shelfware',
    body: 'Standardize the motion across the team, track outcomes from trigger to pipeline, and understand which accounts, campaigns, and plays are actually creating revenue momentum.',
    proof: ['→ Consistent selling motions', '→ Outcome visibility across the team']
  }
];

const integrations = [
  {
    icon: <LayersIcon />,
    label: 'CRM',
    body: 'Import accounts, contacts, and opportunities, then push activities and engagement data back so teams work from a current system of record.'
  },
  {
    icon: <BriefcaseIcon />,
    label: 'Google Workspace',
    body: 'Turn generated content into documents, presentations, shared files, and ready-to-send drafts without moving between tools.'
  },
  {
    icon: <SearchUsersIcon />,
    label: 'Contact Intelligence',
    body: 'Discover and enrich stakeholders by department, seniority, and role, then tie each person to the right buying group and message.'
  },
  {
    icon: <RadarIcon />,
    label: 'Signal Monitoring',
    body: 'Track leadership changes, funding, hiring, strategic shifts, digital engagement, and other account developments that should change your next move.'
  }
];

export default function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('enterprise');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.landing-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const signInUrl = '/login';
  const demoUrl =
    process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ||
    process.env.NEXT_PUBLIC_CAL_BOOKING_URL ||
    'https://calendly.com/agentpilot/agentpilotdemo';

  return (
    <div
      ref={rootRef}
      className={`landing-root ${dmSans.variable} ${instrumentSerif.variable}`}
      style={
        {
          '--sans': 'var(--font-dm-sans), -apple-system, sans-serif',
          '--serif': 'var(--font-instrument), Georgia, serif',
        } as React.CSSProperties
      }
    >
      <nav id="nav" className={`landing-nav ${navScrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="landing-logo">
          <img src="/agentpilot-logo.png" alt="" className="landing-logo-img" />
          AgentPilot
        </Link>
        <div className="landing-nav-links">
          <Link href="#how">How It Works</Link>
          <Link href="#roles">Teams</Link>
          <Link href="#content">Content Engine</Link>
          <Link href="#use-cases">Use Cases</Link>
          <Link href="#integrations">Integrations</Link>
          <Link href={signInUrl} className="text-[#6b6b7b] hover:text-[#0a0a0f] transition-colors">
            Sign In
          </Link>
          <Link href={demoUrl} className="landing-btn-primary">
            Book a Demo
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-badge">For Sales, Marketing &amp; Customer Success Teams</div>
        <h1>The AI revenue workbench for account-based everything</h1>
        <p className="landing-hero-sub">
          AgentPilot keeps a live intelligence model of every account, maps buying groups and stakeholders, tracks
          account momentum, and helps your team create the right message, asset, and next move for every opportunity.
        </p>
        <p className="landing-hero-support">
          Replace fragmented research, scattered notes, and one-off content requests with a single system for account
          planning, personalized execution, and cross-functional follow-through.
        </p>
        <div className="landing-hero-actions">
          <Link href={demoUrl} className="landing-btn-primary">
            Book a 15-Min Demo →
          </Link>
          <Link href="#how" className="landing-btn-outline">
            See How It Works
          </Link>
        </div>
        <div className="landing-hero-visual" />
      </section>

      <div className="landing-value-strip">
        <div className="landing-value-strip-inner">
          <div className="landing-value-item">
            <div className="landing-value-number">10+ hrs</div>
            <div className="landing-value-label">Saved per account on research and content</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">5 min</div>
            <div className="landing-value-label">From new account to full buying-group campaign</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">50+</div>
            <div className="landing-value-label">Real-time signal types tracked per account</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">15+</div>
            <div className="landing-value-label">Content channels from email to executive briefings</div>
          </div>
        </div>
      </div>

      <section className="landing-problem landing-reveal">
        <div className="landing-section-label">The Problem</div>
        <h2>Your GTM stack has tools for everything except connecting the work.</h2>
        <div className="landing-problem-grid">
          {problemCards.map((card) => (
            <div className="landing-problem-card" key={card.tag}>
              <div className="landing-persona-tag">{card.tag}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-flywheel" id="how">
        <div className="landing-flywheel-inner">
          <div className="landing-section-label">How It Works</div>
          <h2>From account intelligence to action, content, and follow-through in one system</h2>
          <p className="landing-flywheel-sub">
            You bring the strategy. AgentPilot turns it into live research, personalized experiences, ready-to-use
            content, and workflow-driven execution across the revenue team.
          </p>

          <div className="landing-steps">
            {howSteps.map((step) => (
              <div className="landing-step landing-reveal" key={step.number}>
                <div className="landing-step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className="landing-step-outcome">{step.outcome}</span>
                <div className="landing-step-detail">
                  {step.details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="landing-flywheel-loop landing-reveal">
            <div className="landing-loop-icon">
              <ClockIcon />
            </div>
            <div>
              <h4>Always current. Never stale.</h4>
              <p>
                AgentPilot keeps monitoring your company story, your accounts, and the engagement happening across every
                page and asset. When priorities shift, your team sees the new story and the new next step, not last
                quarter&apos;s assumptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-outreach" id="content">
        <div className="landing-outreach-inner">
          <div className="landing-section-label">The Content Engine</div>
          <h2>15+ channels. Structured output. Multi-variant. Feedback-aware.</h2>
          <p className="landing-outreach-sub">
            Every piece of content inherits your messaging framework, your brand voice, and live account intelligence.
            Generate once, export anywhere, and keep every asset aligned to the account, the buying group, and the deal
            stage.
          </p>

          <div className="landing-channel-grid">
            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <MessageSquareIcon />
              </div>
              <h3>Direct Outreach</h3>
              <p>
                Create personalized emails, LinkedIn outreach, posts, SMS, and team-ready messaging with multiple
                angles to test and fast feedback loops to sharpen what works.
              </p>
            </div>

            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <LayersIcon />
              </div>
              <h3>Sales Assets</h3>
              <p>
                Build presentations, one-pagers, sales pages, ad briefs, demo scripts, and video scripts that carry
                the same story from first touch through evaluation.
              </p>
            </div>

            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <BriefcaseIcon />
              </div>
              <h3>Deal Acceleration</h3>
              <p>
                Package champion kits, talk tracks, mutual action plans, and executive review materials so every deal
                has the internal selling support it needs to keep moving.
              </p>
            </div>
          </div>

          <div className="landing-content-callout landing-reveal">
            Every asset is personalized to the account, the buying group, and the deal stage, while staying on-brand
            without a manual rewrite cycle.
          </div>
        </div>
      </section>

      <section className="landing-chat-callout landing-reveal">
        <div className="landing-chat-callout-inner">
          <div className="landing-chat-callout-copy">
            <div className="landing-section-label">AI Chat</div>
            <h2>An AI concierge on every account page</h2>
            <p>
              Every landing page includes an AI chat trained on your company story, the account&apos;s context, and the
              messaging your team wants to reinforce. It answers product and pricing questions, recommends the right
              proof points, builds personalized event agendas, and qualifies buyers around the clock.
            </p>
            <div className="landing-chat-proof-grid">
              <span>Answers product questions in real time</span>
              <span>Builds personalized conference agendas</span>
              <span>Qualifies and routes high-intent leads</span>
              <span>Escalates to the right rep with full context</span>
            </div>
          </div>

          <div className="landing-chat-callout-visual">
            <div className="landing-lp-chat-widget landing-chat-standalone">
              <div className="landing-lp-chat-header">
                <div className="landing-lp-chat-avatar">
                  <ChatIcon />
                </div>
                <div>
                  <div className="landing-lp-chat-title">Ask about fit, pricing, and next steps</div>
                  <div className="landing-lp-chat-status">● Online — powered by AgentPilot</div>
                </div>
              </div>
              <div className="landing-lp-chat-messages">
                <div className="landing-chat-bubble landing-chat-visitor">
                  We are evaluating vendors for our ops and finance teams. What should each group focus on first?
                </div>
                <div className="landing-chat-bubble landing-chat-ai">
                  For operations, I&apos;d focus on workflow visibility and automation speed. For finance, I&apos;d focus on
                  reporting accuracy, governance, and time-to-value. I can also pull together a side-by-side summary
                  your buying team can share internally.
                </div>
                <div className="landing-chat-bubble landing-chat-visitor">
                  Please send that and recommend a short next step for our VP.
                </div>
                <div className="landing-chat-bubble landing-chat-ai">
                  Done. I built a concise summary for the team and flagged a 30-minute executive review as the best next
                  move. Your rep has the full conversation context.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-platform" id="roles">
        <div className="landing-platform-inner">
          <div className="landing-section-label">Built for Every Revenue Role</div>
          <h2>One platform for the full ABX team</h2>
          <p className="landing-platform-sub">
            AgentPilot gives sales, marketing, customer success, and leadership a shared execution layer so strategy,
            messaging, and account momentum all live in the same place.
          </p>

          <div className="landing-platform-grid landing-platform-grid-four">
            {roleCards.map((card) => (
              <div className="landing-platform-card" key={card.label}>
                <div className="landing-platform-icon">{card.icon}</div>
                <div className="landing-platform-card-label">{card.label}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <div className="landing-platform-proof">
                  {card.proof.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="landing-platform-bottom landing-reveal">
            <h4>A shared system for account planning, personalized execution, and revenue follow-through.</h4>
          </div>
        </div>
      </section>

      <section className="landing-use-cases" id="use-cases">
        <div className="landing-section-label">In Practice</div>
        <h2>See what this looks like in the field</h2>

        <div className="landing-use-case-tabs">
          <button
            type="button"
            className={`landing-tab ${activeTab === 'enterprise' ? 'active' : ''}`}
            onClick={() => setActiveTab('enterprise')}
          >
            Enterprise AE
          </button>
          <button
            type="button"
            className={`landing-tab ${activeTab === 'abm' ? 'active' : ''}`}
            onClick={() => setActiveTab('abm')}
          >
            ABM Campaign
          </button>
          <button
            type="button"
            className={`landing-tab ${activeTab === 'cs' ? 'active' : ''}`}
            onClick={() => setActiveTab('cs')}
          >
            Customer Success
          </button>
        </div>

        {activeTab === 'enterprise' && (
          <div className="landing-use-case-content active">
            <div className="landing-use-case-narrative">
              <h3>From account research to champion-ready execution without losing the moment</h3>
              <p>
                An enterprise AE opens a strategic account and usually spends days stitching together stakeholder
                research, initiative tracking, custom messaging, and internal deal support before anything can go out.
              </p>
              <p>
                <strong>With AgentPilot:</strong> the account is mapped in minutes. Buying groups appear, recent account
                movement is surfaced, and the rep generates a tailored page, personalized outreach, and a champion kit
                that is ready to share with internal decision-makers.
              </p>
              <p>
                <strong>The result:</strong> when the VP of Engineering engages the page and asks about deployment
                timelines, the rep sees the full context immediately and already has a deck and forwarding draft ready
                for the next conversation.
              </p>
            </div>
            <div className="landing-use-case-preview landing-lp-preview">
              <div className="landing-browser-chrome">
                <div className="landing-browser-dots">
                  <span style={{ background: '#ff5f57' }} />
                  <span style={{ background: '#ffbd2e' }} />
                  <span style={{ background: '#28c840' }} />
                </div>
                <div className="landing-browser-url">strategicaccount.agentpilot.ai/engineering</div>
              </div>
              <div className="landing-lp-content">
                <div className="landing-lp-badge-row">
                  <span className="landing-lp-badge">Built for Engineering &amp; Platform Teams</span>
                </div>
                <h4 className="landing-lp-headline">
                  Your modernization initiative is accelerating. Here&apos;s how we help engineering leaders reduce
                  complexity without slowing down delivery.
                </h4>
                <p className="landing-lp-body">
                  AgentPilot turns live account context into a page that speaks directly to this team&apos;s priorities,
                  then captures the questions and buying signals that tell the rep what should happen next.
                </p>
                <div className="landing-lp-stats-label">What the rep sees ready to go:</div>
                <div className="landing-lp-stats">
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">Page</span>
                    <span className="landing-lp-stat-label">Personalized story</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">Deck</span>
                    <span className="landing-lp-stat-label">Champion ready</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">Draft</span>
                    <span className="landing-lp-stat-label">Forwardable follow-up</span>
                  </div>
                </div>
                <div className="landing-lp-chat-widget">
                  <div className="landing-lp-chat-header">
                    <div className="landing-lp-chat-avatar">
                      <ChatIcon />
                    </div>
                    <div>
                      <div className="landing-lp-chat-title">Ask about product fit, rollout, and next steps</div>
                      <div className="landing-lp-chat-status">● Online — powered by AgentPilot</div>
                    </div>
                  </div>
                  <div className="landing-lp-chat-messages">
                    <div className="landing-chat-bubble landing-chat-visitor">
                      We are trying to streamline rollout across multiple teams. What should our VP focus on first?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      I would start with the shared rollout motion across engineering and security, then give your VP a
                      short briefing deck that aligns the decision criteria before technical review.
                    </div>
                    <div className="landing-chat-bubble landing-chat-visitor">
                      Great. Can you package that for internal sharing?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      Yes. I prepared the internal talking points and flagged a champion-ready deck for your rep to send.
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-preview-alert" style={{ margin: '16px 0 0', borderRadius: '0 0 16px 16px' }}>
                <AlertIcon />
                VP Engineering engaged with the page, asked about rollout planning, and signaled interest in an
                internal review. Suggested next move: send champion kit today.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'abm' && (
          <div className="landing-use-case-content active">
            <div className="landing-use-case-narrative">
              <h3>Run a coordinated ABM motion without spinning up a fresh production queue</h3>
              <p>
                Marketing wants to activate a high-value event campaign across hundreds of accounts, but every segment
                needs its own page, creative angle, and follow-up path. That usually means a bottleneck before launch.
              </p>
              <p>
                <strong>With AgentPilot:</strong> the team generates event pages, outreach drafts, campaign briefs, and
                follow-up sequences from the same account intelligence. Sales gets assets they can use immediately while
                marketing keeps the messaging and call to action aligned.
              </p>
              <p>
                <strong>The result:</strong> the campaign launches with a consistent story across channels, every QR code
                lands on a personalized destination, and the team sees which accounts are engaging in time to act.
              </p>
            </div>
            <div className="landing-use-case-preview landing-workflow-preview">
              <div className="landing-preview-panel">
                <div className="landing-preview-panel-header">
                  <span>Event Campaign Workspace</span>
                  <span>200 target accounts</span>
                </div>
                <div className="landing-preview-stack">
                  <div className="landing-preview-stack-card">
                    <strong>Buying Group Pages</strong>
                    <span>Built for ops, finance, product, and IT teams</span>
                  </div>
                  <div className="landing-preview-stack-card">
                    <strong>Channel Assets</strong>
                    <span>Email, LinkedIn, event invites, one-pagers, and booth QR paths</span>
                  </div>
                  <div className="landing-preview-stack-card">
                    <strong>Campaign Guidance</strong>
                    <span>Suggested sequence timing and next-best-actions as engagement appears</span>
                  </div>
                </div>
                <div className="landing-preview-alert">
                  <AlertIcon />
                  19 high-intent accounts engaged event pages in the last 24 hours. Recommended action: launch the
                  executive follow-up sequence today.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cs' && (
          <div className="landing-use-case-content active">
            <div className="landing-use-case-narrative">
              <h3>Catch renewal and expansion moments before they become fire drills</h3>
              <p>
                A key champion leaves an account, a new stakeholder shows up, and the renewal motion suddenly changes.
                Without a live system, the customer success team often finds out too late.
              </p>
              <p>
                <strong>With AgentPilot:</strong> account movement triggers the right play, the team gets a fresh prep
                brief for the next conversation, and renewal or expansion content is generated with the latest context
                already woven in.
              </p>
              <p>
                <strong>The result:</strong> customer success reaches out with a plan, not a scramble, and the account
                team can re-open momentum with the right executive narrative and next step already prepared.
              </p>
            </div>
            <div className="landing-use-case-preview landing-workflow-preview">
              <div className="landing-preview-panel">
                <div className="landing-preview-panel-header">
                  <span>Renewal &amp; Expansion Watchlist</span>
                  <span>Account health updated</span>
                </div>
                <div className="landing-preview-signal">
                  <div className="landing-preview-signal-badge">Signal</div>
                  <h4>Primary champion changed roles</h4>
                  <p>Suggested play: stakeholder re-engagement plus executive review prep</p>
                </div>
                <div className="landing-preview-brief">
                  <strong>Prep brief ready</strong>
                  <span>Opening narrative, risk summary, proof points, objections, and executive next step</span>
                </div>
                <div className="landing-preview-alert">
                  <AlertIcon />
                  Renewal motion updated automatically. Suggested action: send executive briefing and schedule a
                  re-alignment call this week.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="landing-integrations landing-reveal" id="integrations">
        <div className="landing-integrations-inner">
          <div className="landing-section-label">Integrations</div>
          <h2>Works with the tools your revenue team already depends on</h2>
          <div className="landing-integrations-grid">
            {integrations.map((item) => (
              <div className="landing-integration-card" key={item.label}>
                <div className="landing-integration-icon">{item.icon}</div>
                <h3>{item.label}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-testimonials landing-reveal">
        <div className="landing-section-label">What GTM Teams Say</div>
        <h2>Built for revenue teams that move fast</h2>
        <div className="landing-testimonial-grid">
          <div className="landing-testimonial-card">
            <div className="landing-testimonial-stars">★★★★★</div>
            <blockquote>
              &quot;We replaced four tools: the research tool, the content writer, the sequencing engine, and the landing
              page builder. Our team finally has one place to plan and execute.&quot;
            </blockquote>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" />
              <div>
                <div className="landing-testimonial-name">VP of Sales</div>
                <div className="landing-testimonial-role">Enterprise SaaS Company</div>
              </div>
            </div>
          </div>
          <div className="landing-testimonial-card">
            <div className="landing-testimonial-stars">★★★★★</div>
            <blockquote>
              &quot;The champion enablement kit changed our deal cycles. One click gives the rep the story, the internal
              talking points, and the deck they can share immediately.&quot;
            </blockquote>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" />
              <div>
                <div className="landing-testimonial-name">Director of Sales Enablement</div>
                <div className="landing-testimonial-role">Mid-Market Technology Company</div>
              </div>
            </div>
          </div>
          <div className="landing-testimonial-card">
            <div className="landing-testimonial-stars">★★★★★</div>
            <blockquote>
              &quot;We track hundreds of accounts, and now each one has a personalized page, a live signal feed, and an
              active playbook. That was impossible before without adding a lot more people.&quot;
            </blockquote>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" />
              <div>
                <div className="landing-testimonial-name">Head of ABM</div>
                <div className="landing-testimonial-role">Fortune 500 Technology Company</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="cta">
        <h2>Your accounts deserve more than a spreadsheet and a prayer.</h2>
        <p>
          See how AgentPilot helps revenue teams plan, personalize, and execute across every buying group, every
          channel, and every stage of the customer lifecycle.
        </p>
        <div className="landing-cta-actions">
          <Link href={demoUrl} className="landing-btn-primary">
            Book a 15-Min Demo →
          </Link>
          <Link href={signInUrl} className="landing-btn-outline">
            Sign In
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 AgentPilot. All rights reserved.</p>
        <div className="landing-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="mailto:info@agentpilot.us">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

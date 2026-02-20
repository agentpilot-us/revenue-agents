'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import './landing.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-instrument' });

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

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

export default function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'enterprise' | 'midmarket'>('enterprise');
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
  // Demo: Calendly (or override via NEXT_PUBLIC_DEMO_BOOKING_URL / NEXT_PUBLIC_CAL_BOOKING_URL)
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
          <img
            src="/agentpilot-logo.png"
            alt=""
            className="landing-logo-img"
          />
          AgentPilot
        </Link>
        <div className="landing-nav-links">
          <Link href="#how">How It Works</Link>
          <Link href="#use-cases">Use Cases</Link>
          <Link href="#platform">Platform</Link>
          <Link href="#outreach">Channels</Link>
          <Link href={signInUrl} className="text-[#6b6b7b] hover:text-[#0a0a0f] transition-colors">
            Sign In
          </Link>
          <Link href={demoUrl} className="landing-btn-primary">
            Book a Demo
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-badge">For Strategic AEs & Revenue Teams</div>
        <h1>
          The AI workbench for expanding your biggest accounts
        </h1>
        <p className="landing-hero-sub">
          AgentPilot keeps a live model of each account by buying group, pulls in website and engagement signals, and recommends concrete moves — the people, message, and page for every opportunity — so reps stop guessing and start expanding.
        </p>
        <p className="landing-hero-support">
          Stop spending 10+ hours per account on manual research, fragmented notes, and generic outreach. Get a live, guided expansion plan in minutes.
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

      {/* Company logos — uncomment when we have customers */}
      {/* <div className="landing-trust-bar">
        <p className="landing-trust-label">Trusted by GTM teams at</p>
        <div className="landing-trust-logos">
          <span>Company</span>
          <span>Company</span>
          <span>Company</span>
          <span>Company</span>
          <span>Company</span>
        </div>
      </div> */}

      <div className="landing-value-strip">
        <div className="landing-value-strip-inner">
          <div className="landing-value-item">
            <div className="landing-value-number">10+ hrs</div>
            <div className="landing-value-label">Saved per account on research & personalization</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">5 min</div>
            <div className="landing-value-label">To generate personalized campaigns per buying group</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">Real‑time</div>
            <div className="landing-value-label">Alerts when executives visit your pages</div>
          </div>
          <div className="landing-value-item">
            <div className="landing-value-number">Auto‑sync</div>
            <div className="landing-value-label">Pages update as your accounts evolve</div>
          </div>
        </div>
      </div>

      <section className="landing-problem landing-reveal">
        <div className="landing-section-label">The Problem</div>
        <h2>You know your product. You know your accounts. Connecting the two takes forever.</h2>
        <div className="landing-problem-grid">
          <div className="landing-problem-card">
            <div className="landing-persona-tag">Enterprise & Mid-Market AEs</div>
            <h3>You spend 10+ hours per account just trying to connect your product to their world</h3>
            <p>
              Every target account needs different messaging — their industry, their buying groups, their initiatives.
              But researching each one (LinkedIn, earnings calls, job boards, org charts) and then translating your
              product into their language takes so long that by the time you&apos;re ready to reach out, half your
              intel is already outdated. You end up sending generic pitches because you don&apos;t have time to
              personalize 40 accounts.
            </p>
          </div>
          <div className="landing-problem-card">
            <div className="landing-persona-tag">ABM & Demand Gen Teams</div>
            <h3>Building personalized landing pages for every segment requires dev resources you don&apos;t have</h3>
            <p>
              Your campaigns need different pages for different industries, buying groups, and accounts — but creating
              custom landing pages for each segment means waiting on design, dev, and approvals. By the time the page
              is live, the campaign window has closed. You&apos;re forced to send everyone to the same generic page and
              hope the right message resonates with the right person. It doesn&apos;t.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-flywheel" id="how">
        <div className="landing-flywheel-inner">
          <div className="landing-section-label">How It Works</div>
          <h2>From account research to personalized page — in 5 minutes, not 5 days</h2>
          <p className="landing-flywheel-sub">
            You bring the strategy. AgentPilot does the research, writes the messaging, builds the pages, and tells
            you when to act.
          </p>

          <div className="landing-steps">
            <div className="landing-step landing-reveal">
              <div className="landing-step-number">01</div>
              <h3>AI Learns Your Product</h3>
              <p>
                Point AgentPilot at your company and it instantly builds a complete picture of your products, value
                props, and differentiators. When your messaging evolves, your campaigns update automatically.
              </p>
              <span className="landing-step-outcome">→ Never manually write product positioning again</span>
              <div className="landing-step-detail">
                <span>Products & Features</span>
                <span>Value Props</span>
                <span>Differentiators</span>
                <span>Auto-Updated</span>
              </div>
            </div>

            <div className="landing-step landing-reveal">
              <div className="landing-step-number">02</div>
              <h3>1-Click Account Research</h3>
              <p>
                Enter a target account and AgentPilot identifies buying groups, surfaces recent news, open roles, and
                strategic initiatives. AI then maps your product value to each buying group&apos;s priorities.
              </p>
              <span className="landing-step-outcome">→ 10 hours of research compressed into 5 minutes</span>
              <div className="landing-step-detail">
                <span>Buying Groups</span>
                <span>Company News</span>
                <span>Job Listings</span>
                <span>Initiatives</span>
                <span>Mapped Value Props</span>
              </div>
            </div>

            <div className="landing-step landing-reveal">
              <div className="landing-step-number">03</div>
              <h3>Personalized Pages & AI Chat</h3>
              <p>
                That intelligence becomes a live landing page — each buying group sees exactly why your product matters
                to them. Built-in AI chat answers questions about pricing, product fit, and events — even building
                personalized conference agendas.
              </p>
              <span className="landing-step-outcome">→ A custom destination for every buying group, no dev needed</span>
              <div className="landing-step-detail">
                <span>Personalized Pages</span>
                <span>AI Chat</span>
                <span>Event Agendas</span>
                <span>Product Q&A</span>
                <span>Pricing Info</span>
              </div>
            </div>

            <div className="landing-step landing-reveal">
              <div className="landing-step-number">04</div>
              <h3>Analytics & Smart Alerts</h3>
              <p>
                See exactly who&apos;s visiting, how long they stay, and what they&apos;re asking. AgentPilot identifies
                high-value prospects and notifies you when it&apos;s time to reach out — with full context on what they
                engaged with.
              </p>
              <span className="landing-step-outcome">→ Follow up with context, not guesswork</span>
              <div className="landing-step-detail">
                <span>Visitor Tracking</span>
                <span>Time on Page</span>
                <span>Chat Insights</span>
                <span>Smart Notifications</span>
                <span>Follow-Up Triggers</span>
              </div>
            </div>
          </div>

          <div className="landing-flywheel-loop landing-reveal">
            <div className="landing-loop-icon">
              <ClockIcon />
            </div>
            <div>
              <h4>Always current. Never stale.</h4>
              <p>
                AgentPilot continuously monitors your product and target accounts. When they announce a new initiative,
                hire for a new role, or shift priorities — your landing pages, messaging, and value props update
                automatically. Your accounts always see the latest story, not last quarter&apos;s pitch.
              </p>
            </div>
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
            className={`landing-tab ${activeTab === 'midmarket' ? 'active' : ''}`}
            onClick={() => setActiveTab('midmarket')}
          >
            Mid-Market AE
          </button>
        </div>

        {activeTab === 'enterprise' && (
          <div className="landing-use-case-content active">
            <div className="landing-use-case-narrative">
              <h3>From 10 hours of research to 5 minutes of personalization — without sacrificing quality</h3>
              <p>
                Joe has one strategic account. His old process: two weeks of research — earnings calls, LinkedIn,
                Glassdoor, industry reports — then manual stakeholder mapping, then building custom decks for each
                buying group. By the time he&apos;s ready to reach out, someone else has already engaged the account.
              </p>
              <p>
                <strong>With AgentPilot:</strong> Joe enters his account. Within 5 minutes, the platform identifies 5
                buying groups, surfaces their latest hiring signals and initiatives, and generates personalized value
                props for each — all mapped to his product.
              </p>
              <p>
                <strong>The result:</strong> Joe sends a landing page link where each buying group sees tailored
                messaging in their language. When the VP of Engineering spends 8 minutes on the page and asks about
                deployment timelines, Joe gets an alert with full context. His follow-up isn&apos;t a cold call — it&apos;s a
                continuation of a conversation already in progress.
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
                  <span className="landing-lp-badge">Built for Your Engineering & R&D Team</span>
                </div>
                <h4 className="landing-lp-headline">
                  Your cloud migration is underway and you&apos;re scaling your ML team — here&apos;s how we accelerate both
                  without rearchitecting your stack
                </h4>
                <p className="landing-lp-body">
                  With 3 ML engineering roles open and a cloud migration in progress, your team is building for speed
                  while managing complexity. Enterprise engineering orgs in your industry that deploy our platform see
                  60% faster release cycles and cut infrastructure overhead by a third — typically within the first
                  quarter.
                </p>
                <div className="landing-lp-stats-label">Companies in your industry at your scale see:</div>
                <div className="landing-lp-stats">
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">60%</span>
                    <span className="landing-lp-stat-label">Faster releases</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">33%</span>
                    <span className="landing-lp-stat-label">Less infra overhead</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">&lt; 90 days</span>
                    <span className="landing-lp-stat-label">To full ROI</span>
                  </div>
                </div>
                <div className="landing-lp-chat-widget">
                  <div className="landing-lp-chat-header">
                    <div className="landing-lp-chat-avatar">
                      <ChatIcon />
                    </div>
                    <div>
                      <div className="landing-lp-chat-title">Ask about product, pricing & events</div>
                      <div className="landing-lp-chat-status">● Online — powered by AgentPilot</div>
                    </div>
                  </div>
                  <div className="landing-lp-chat-messages">
                    <div className="landing-chat-bubble landing-chat-visitor">
                      Our team is attending the Global Infrastructure Summit in March — which sessions should we
                      prioritize for cloud migration?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      Great question. Based on your team&apos;s cloud migration and ML hiring, here&apos;s what I&apos;d prioritize:
                      <br />
                      <br />
                      <strong>Day 1:</strong> &quot;Hybrid Cloud at Scale&quot; keynote (9am) — covers the exact migration
                      pattern your team is running.
                      <br />
                      <br />
                      <strong>Day 2:</strong> &quot;ML Infrastructure Without the Rearchitecture&quot; workshop (1pm) —
                      directly relevant to your new ML hires.
                      <br />
                      <br />
                      <strong>Day 3:</strong> Customer panel with a similar-scale engineering org that migrated in 6 weeks.
                      <br />
                      <br />
                      Want me to build a full 3-day agenda for your team and include calendar invites?
                    </div>
                    <div className="landing-chat-bubble landing-chat-visitor">
                      Yes — build it for a group of 4 engineers. And can you flag any sessions on deployment automation?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      Done — I&apos;ve added 2 deployment automation sessions on Day 2 (the &quot;Zero-Downtime Deploys&quot;
                      lab at 3pm is a must). Sending the full 3-day agenda for 4 attendees now. Your AE Joe can also set
                      up a private demo at the summit — want me to reserve a 30-minute slot?
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-preview-alert" style={{ margin: '16px 0 0', borderRadius: '0 0 16px 16px' }}>
                <AlertIcon />
                VP Engineering + 3 team members engaged — requested custom summit agenda & private demo slot. High
                intent — confirm demo before Friday.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'midmarket' && (
          <div className="landing-use-case-content active">
            <div className="landing-use-case-narrative">
              <h3>40 accounts personalized before lunch — each one speaking the prospect&apos;s language</h3>
              <p>
                Chris manages a book of 40+ accounts. His emails have a 4% open rate. Building custom decks for each
                account isn&apos;t realistic, and marketing is focused on campaigns, not his pipeline.
              </p>
              <p>
                <strong>With AgentPilot:</strong> Chris loads his product once. For each target account, one click
                triggers the research — buying groups identified, news surfaced, initiatives mapped, and personalized
                value props generated that connect his product to what each company cares about right now.
              </p>
              <p>
                <strong>The result:</strong> Instead of cold emails with generic decks, Chris sends links to pages that
                speak each prospect&apos;s language. When an ops leader at one of his accounts visits the page and asks the
                AI chat about integrations, Chris gets an alert in real time — not a CRM note a week later. His pipeline
                is built on relevance, not volume.
              </p>
            </div>
            <div className="landing-use-case-preview landing-lp-preview">
              <div className="landing-browser-chrome">
                <div className="landing-browser-dots">
                  <span style={{ background: '#ff5f57' }} />
                  <span style={{ background: '#ffbd2e' }} />
                  <span style={{ background: '#28c840' }} />
                </div>
                <div className="landing-browser-url">acmecorp.agentpilot.ai/operations</div>
              </div>
              <div className="landing-lp-content">
                <div className="landing-lp-badge-row">
                  <span className="landing-lp-badge">Built for Acme Corp — Operations Team</span>
                </div>
                <h4 className="landing-lp-headline">
                  Your new COO is focused on operational efficiency — here&apos;s how ops teams at your size eliminate 12+
                  hours of manual reporting per week
                </h4>
                <p className="landing-lp-body">
                  With new leadership driving a mandate to streamline operations, your team needs fast wins that prove
                  ROI — not a 6-month implementation. Mid-market operations teams in your industry that deploy our
                  platform see measurable time savings in the first 30 days and full payback within a quarter.
                </p>
                <div className="landing-lp-stats-label">Mid-market ops teams in your industry see:</div>
                <div className="landing-lp-stats">
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">12+ hrs</span>
                    <span className="landing-lp-stat-label">Saved weekly</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">30 days</span>
                    <span className="landing-lp-stat-label">To first results</span>
                  </div>
                  <div className="landing-lp-stat">
                    <span className="landing-lp-stat-number">3.2x</span>
                    <span className="landing-lp-stat-label">ROI in year one</span>
                  </div>
                </div>
                <div className="landing-lp-chat-widget">
                  <div className="landing-lp-chat-header">
                    <div className="landing-lp-chat-avatar">
                      <ChatIcon />
                    </div>
                    <div>
                      <div className="landing-lp-chat-title">Ask anything about pricing & fit</div>
                      <div className="landing-lp-chat-status">● Online — powered by AgentPilot</div>
                    </div>
                  </div>
                  <div className="landing-lp-chat-messages">
                    <div className="landing-chat-bubble landing-chat-visitor">
                      What does pricing look like for a 200-person ops team?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      For a team of 200, you&apos;d be on our Growth plan at $18/user/month — that includes automated
                      reporting, real-time dashboards, and integrations with your existing tools. Based on Acme&apos;s
                      current stack, setup takes about 2 weeks with zero migration. Want me to send a detailed quote to
                      your COO?
                    </div>
                    <div className="landing-chat-bubble landing-chat-visitor">
                      Yes — and can you include the ROI breakdown?
                    </div>
                    <div className="landing-chat-bubble landing-chat-ai">
                      Absolutely. I&apos;ll include a custom ROI model based on your team size and the manual reporting hours
                      you&apos;d eliminate. Sending to Sarah Chen now — she&apos;ll have it within the hour. Is there anything
                      else I can help with?
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-preview-alert" style={{ margin: '16px 0 0', borderRadius: '0 0 16px 16px' }}>
                <AlertIcon />
                Acme Corp COO visited 3x this week — asked about pricing for 200 users. High intent — reach out today.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ONE PLATFORM, EVERY TEAM */}
      <section className="landing-platform" id="platform">
        <div className="landing-platform-inner">
          <div className="landing-section-label">Beyond Prospecting</div>
          <h2>One platform. Every revenue team. Zero burden on rev ops.</h2>
          <p className="landing-platform-sub">
            AgentPilot isn&apos;t a sales tool bolted onto your stack. It&apos;s the personalized engagement layer across
            your entire customer lifecycle — with messaging that stays on-brand, always current, and consistent across
            every account.
          </p>

          <div className="landing-platform-grid">
            <div className="landing-platform-card">
              <div className="landing-platform-icon">
                <UsersIcon />
              </div>
              <div className="landing-platform-card-label">Sales</div>
              <h3>Close faster with context, not cold calls</h3>
              <p>
                AEs get hyper-personalized landing pages, AI chat that qualifies and educates buyers, and real-time
                alerts when high-value prospects engage. Every follow-up is a continuation of a conversation — not a shot
                in the dark.
              </p>
              <div className="landing-platform-proof">
                <span>→ 10+ hrs saved per account</span>
                <span>→ Real-time buying signals</span>
              </div>
            </div>

            <div className="landing-platform-card">
              <div className="landing-platform-icon">
                <UsersGroupIcon />
              </div>
              <div className="landing-platform-card-label">Customer Success</div>
              <h3>Give every account a dedicated AI concierge</h3>
              <p>
                Existing customers get a personalized page with AI chat that answers product questions, surfaces relevant
                updates, and helps them get more value. When questions need a human, the chat escalates to their CSM
                with full context — no repeat conversations.
              </p>
              <div className="landing-platform-proof">
                <span>→ Reduce support tickets</span>
                <span>→ Smart escalation to CSMs</span>
              </div>
            </div>

            <div className="landing-platform-card">
              <div className="landing-platform-icon">
                <MessageSquareIcon />
              </div>
              <div className="landing-platform-card-label">Marketing</div>
              <h3>On-brand messaging across every account — automatically</h3>
              <p>
                Marketing controls the product positioning, value props, and brand voice once. AgentPilot ensures every
                landing page, every chat response, and every outreach asset stays on-message — across hundreds of
                accounts. When positioning evolves, every page updates automatically.
              </p>
              <div className="landing-platform-proof">
                <span>→ Brand consistency at scale</span>
                <span>→ Zero manual page updates</span>
              </div>
            </div>
          </div>

          <div className="landing-platform-bottom landing-reveal">
            <h4>
              A custom experience for every account across the entire customer lifecycle — with no additional burden on
              your rev ops team.
            </h4>
          </div>
        </div>
      </section>

      <section className="landing-outreach" id="outreach">
        <div className="landing-outreach-inner">
          <div className="landing-section-label">Drive Traffic</div>
          <h2>Every channel. Same personalized intelligence. Zero manual work.</h2>
          <p className="landing-outreach-sub">
            Every outreach asset is generated from the same account research — your product mapped to their
            priorities, their language, their moment. Send them somewhere worth going.
          </p>

          <div className="landing-channel-grid">
            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3>Personalized Email</h3>
              <p>
                AI writes emails using real account intel — their recent news, their initiatives, their language. Every
                email links to a landing page built for that buying group. No more &quot;I hope this finds you well.&quot;
              </p>
            </div>

            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </div>
              <h3>LinkedIn Posts & InMail</h3>
              <p>
                Generate thought leadership and direct messages grounded in real account context — not buzzwords.
                Position your landing page as a resource built for them, not a pitch aimed at everyone.
              </p>
            </div>

            <div className="landing-channel-card landing-reveal">
              <div className="landing-channel-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 7h.01" />
                  <path d="M7 12h.01" />
                  <path d="M7 17h.01" />
                  <path d="M12 7h.01" />
                  <path d="M12 12h.01" />
                  <path d="M12 17h.01" />
                  <path d="M17 7h.01" />
                  <path d="M17 12h.01" />
                  <path d="M17 17h.01" />
                </svg>
              </div>
              <h3>Events & QR Codes</h3>
              <p>
                At a conference or on-site? Share a QR code that drops your contact into a page built for their team —
                with AI chat ready to build a personalized event agenda on the spot.
              </p>
            </div>
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
              &quot;We cut account research time from 8 hours to under 10 minutes. Our AEs are actually using it because it
              makes them look smarter — not because we forced them to.&quot;
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
              &quot;Our landing page conversion rate doubled because every visitor sees messaging built for their team —
              not a generic product page. The AI chat alone has sourced 3 qualified meetings this quarter.&quot;
            </blockquote>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" />
              <div>
                <div className="landing-testimonial-name">Director of Demand Gen</div>
                <div className="landing-testimonial-role">Mid-Market Technology Company</div>
              </div>
            </div>
          </div>
          <div className="landing-testimonial-card">
            <div className="landing-testimonial-stars">★★★★★</div>
            <blockquote>
              &quot;The real-time alerts changed how I work. I know exactly when a prospect is engaged and what they
              care about — my follow-ups close faster because they feel like a conversation, not a cold call.&quot;
            </blockquote>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" />
              <div>
                <div className="landing-testimonial-name">Strategic Account Executive</div>
                <div className="landing-testimonial-role">Fortune 500 Technology Company</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="cta">
        <h2>
          Ready to spend less time researching
          <br />
          and more time <em>closing?</em>
        </h2>
        <p>
          See how AgentPilot helps revenue teams personalize at scale — without adding headcount or waiting on
          marketing.
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
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="#">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

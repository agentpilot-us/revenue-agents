'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import '../landing.css';
import './stradexai.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument',
});

function StradexFlywheelLoopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 12 19 5" />
      <circle cx="19" cy="5" r="1" fill="white" />
    </svg>
  );
}

const speedStrip = [
  { stat: '< 48hrs', label: 'Signal to sent outreach' },
  { stat: 'Zero', label: 'New tools for your team to learn' },
  { stat: '10+ hrs', label: 'Reclaimed per rep per week' },
  { stat: 'Week 5', label: 'Time to full program value' },
];

const workloadProblemStats = [
  { value: '70%', label: 'of AE time spent on research, not selling', color: '#e85d4c' },
  { value: '3–14d', label: 'to respond to a high-value buying moment', color: '#d97706' },
  { value: '3 of 15', label: 'named accounts actively worked each week', color: '#7c3aed' },
  { value: '$0', label: 'pipeline from the accounts nobody has time to touch', color: '#ef4444' },
];

const whoWeServe = [
  {
    title: 'Sales',
    body: 'Weekly briefings covering every division in the account. Proven GTM plays — exec intro, competitive response, renewal, expansion — triggered automatically on hires, earnings calls, and competitive moves. Outreach that references the contact\'s background, their division\'s priorities, and your product\'s exact fit. Every named account worked every week — not just the top three.',
  },
  {
    title: 'Marketing',
    body: 'ABM programs that actually execute at scale. Product launches across 50 accounts in a single day. Event follow-ups the next business day. Competitive responses with approved positioning. Plays that execute in days, not quarters — with brand and compliance governance built in.',
  },
  {
    title: 'Customer Success',
    body: 'Renewal plays that start 90 days early with health scorecards and EBR materials. Expansion motions with champion enablement kits your advocates can forward internally. Value check-ins that reference actual product usage, not last quarter\'s notes. Protect and grow the base — proactively.',
  },
  {
    title: 'Revenue Operations',
    body: 'Zero integration risk to start — no CRM connection required, no data migration, no IT project. Connect Salesforce or HubSpot when ready, at the depth you choose: read-only account import, activity sync, or full bi-directional governance. Play libraries that enforce your selling motion. Signal-to-outcome tracking that shows which plays generate pipeline. You control the scope and the pace.',
  },
];

const flowSteps = [
  {
    n: '01',
    title: 'Buying moment captured',
    body: 'Exec hire, earnings beat, competitive move, product launch, contract renewal approaching',
  },
  {
    n: '02',
    title: 'Proven play triggered',
    body: 'A governed GTM play — not a one-off — chosen for the trigger, account tier, and buyer stage, then executed with AI-generated steps and content',
  },
  {
    n: '03',
    title: 'Contacts found',
    body: 'Buying group mapped, contacts discovered and enriched, roles assigned per step',
  },
  {
    n: '04',
    title: 'Content created',
    body: 'Division-specific, contact-aware, trigger-matched. Not templates.',
  },
  {
    n: '05',
    title: 'Reviewed & sent',
    body: 'Your team reviews, edits, and sends. Every touchpoint governed for cadence and brand.',
  },
];

const outputItems: { strong: string; rest: string }[] = [
  {
    strong: 'Monday briefing',
    rest: ' — Priority-ranked actions across the entire portfolio with per-division summaries for mega-accounts',
  },
  {
    strong: 'Account alerts',
    rest: ' — When something meaningful shifts at a target account, you get the alert with the right governed GTM play already started and first-draft content ready',
  },
  {
    strong: 'Account-specific content',
    rest: ' — Emails, LinkedIn messages, executive briefings, meeting talking points — each referencing the specific division, contact, and buying context',
  },
  {
    strong: 'Executive event prep',
    rest: ' — Briefings for executive lunches, conference meetings, and QBRs with the contact\'s background, talking points, and relationship history. Show up prepared without the three hours of prep.',
  },
  {
    strong: 'Contact intelligence',
    rest: ' — Buying groups mapped, new contacts enriched, org changes tracked across the portfolio',
  },
  {
    strong: 'Governed cadence',
    rest: ' — No over-contacting. Cooldowns enforced. Alternate contacts suggested. Competitive claim rules respected.',
  },
  {
    strong: 'Monthly strategy review',
    rest: ' — Play metrics, content quality scores, trigger-to-outcome response rates. We optimize.',
  },
];

const outcomeStatements = [
  'More pipeline from accounts that used to sit untouched — strategic coverage without adding headcount.',
  'Faster revenue from accounts already in motion — plays trigger in hours, not weeks.',
  'Stronger relationships through consistent, relevant touchpoints across the buying committee.',
  'More executive engagement — lunches, conferences, and QBRs — without the coordination and prep overhead.',
  'Higher customer satisfaction and retention from proactive customer success motions that start early.',
];

const advantageItems = [
  '**New model ships?** We route to it. Your proposals and executive briefings improve overnight — no action required.',
  '**AI video emerges?** We add personalized video pitches to your Executive Intro play. Your cold email becomes a 60-second video.',
  '**Costs drop 40%?** Your per-play economics improve automatically — same quality, better margins, or broader coverage.',
  '**RevOps overwhelmed?** They never touch this. We own the model stack, the routing logic, the prompt engineering, and the data pipeline.',
];

const engagementLayers = [
  {
    tag: 'LAYER 1',
    title: 'Foundation',
    body: 'Your product profiles, messaging frameworks, proven GTM play catalog, content library, competitive intelligence, play governance, and brand voice. Built once. Shared across every account, industry, and rep. Never rebuilt.',
    foot: 'One-time build, 2 weeks',
  },
  {
    tag: 'LAYER 2',
    title: 'Industry / motion',
    body: 'Industry playbook, buying committee patterns, department-to-product mapping, vertical play templates, trigger rules. Built once per vertical. Reused for every account in that industry.',
    foot: 'One-time per vertical, 1 week',
  },
  {
    tag: 'LAYER 3',
    title: 'Target accounts',
    body: 'Per-account intelligence: division mapping, buying groups, contact enrichment, existing product mapping, trigger activation. Each account is cheaper than the last within an industry.',
    foot: 'Per account, decreasing cost',
  },
  {
    tag: 'ONGOING',
    title: 'Managed execution',
    body: 'Weekly briefings, trigger triage, play execution, content generation, contact intelligence maintenance, monthly strategy reviews. Your AEs receive the work — we operate the engine.',
    foot: 'Monthly retainer by account complexity',
  },
];

function AdvantageText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return (
    <p className="stradex-ai-item-text">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export default function StradexAILandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [leadSubmit, setLeadSubmit] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [leadCompanyId, setLeadCompanyId] = useState<string | null>(null);
  const [leadSubmitterEmail, setLeadSubmitterEmail] = useState<string | null>(null);
  const [leadWasDuplicate, setLeadWasDuplicate] = useState(false);
  const [supplementStatus, setSupplementStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [supplementMessage, setSupplementMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const contactEmail =
    process.env.NEXT_PUBLIC_STRADEXAI_CONTACT_EMAIL || 'hello@stradexai.com';
  const linkedinUrl = 'https://www.linkedin.com/in/michellebastelier/';
  const playbookHref = process.env.NEXT_PUBLIC_STRADEXAI_PLAYBOOK_URL || '#';

  async function handleLeadBriefSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if ((fd.get('website') as string)?.trim()) return;
    setLeadSubmit('loading');
    setLeadMessage(null);
    const submitterEmail = String(fd.get('email') ?? '').trim();
    const body = {
      name: String(fd.get('name') ?? '').trim(),
      email: submitterEmail,
      company: String(fd.get('company') ?? '').trim(),
      target_account: String(fd.get('target_account') ?? '').trim(),
      target_domain: String(fd.get('target_domain') ?? '').trim(),
      target_industry: String(fd.get('target_industry') ?? '').trim() || undefined,
      challenge: String(fd.get('challenge') ?? '').trim() || undefined,
    };
    try {
      const res = await fetch('/api/stradex/lead-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        companyId?: string;
        duplicate?: boolean;
      };
      if (!res.ok) {
        setLeadSubmit('error');
        setLeadMessage(data.error || 'Something went wrong. Please try again or email us.');
        return;
      }
      setLeadSubmit('success');
      setLeadMessage(
        data.message ??
          'Thanks — we received your request. Check your inbox for a confirmation email in the next few minutes.',
      );
      const dup = Boolean(data.duplicate);
      setLeadWasDuplicate(dup);
      if (!dup && data.companyId) {
        setLeadCompanyId(data.companyId);
        setLeadSubmitterEmail(submitterEmail);
      } else {
        setLeadCompanyId(null);
        setLeadSubmitterEmail(null);
      }
      setSupplementStatus('idle');
      setSupplementMessage(null);
      form.reset();
    } catch {
      setLeadSubmit('error');
      setLeadMessage('Network error. Check your connection or email us directly.');
    }
  }

  async function handleLeadSupplementSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadCompanyId || !leadSubmitterEmail) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    if ((fd.get('website') as string)?.trim()) return;
    setSupplementStatus('loading');
    setSupplementMessage(null);
    try {
      const res = await fetch('/api/stradex/lead-brief/supplement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: leadCompanyId,
          email: leadSubmitterEmail,
          product_focus: String(fd.get('product_focus') ?? '').trim() || undefined,
          priority_buyer: String(fd.get('priority_buyer') ?? '').trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setSupplementStatus('error');
        setSupplementMessage(data.error || 'Could not save details.');
        return;
      }
      setSupplementStatus('success');
      setSupplementMessage(data.message ?? 'Saved. You can close this section.');
      form.reset();
    } catch {
      setSupplementStatus('error');
      setSupplementMessage('Network error.');
    }
  }

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
      { threshold: 0.12 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fontVars = {
    '--sans': 'var(--font-dm-sans), -apple-system, sans-serif',
    '--serif': 'var(--font-instrument), Georgia, serif',
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`landing-root stradex-page ${dmSans.variable} ${instrumentSerif.variable}`}
      style={fontVars}
    >
      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`}>
        <Link href="#stradex-hero" className="landing-logo stradex-nav-brand" onClick={() => setNavOpen(false)}>
          <Image
            src="/stradex-stacked-logo.png"
            alt="Stradex AI"
            width={140}
            height={52}
            className="stradex-stacked-logo-img"
            priority
          />
        </Link>
        <button
          type="button"
          className="stradex-nav-toggle"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? '✕' : '☰'}
        </button>
        <div className={`landing-nav-links ${navOpen ? 'stradex-nav-open' : ''}`}>
          <Link href="#advantage" onClick={() => setNavOpen(false)}>
            AI advantage
          </Link>
          <Link href="#teams" onClick={() => setNavOpen(false)}>
            Who we serve
          </Link>
          <Link href="#how" onClick={() => setNavOpen(false)}>
            How it works
          </Link>
          <Link href="#proof" onClick={() => setNavOpen(false)}>
            Results
          </Link>
          <Link href="#outcomes" onClick={() => setNavOpen(false)}>
            What changes
          </Link>
          <Link href="#cta" className="landing-btn-primary" onClick={() => setNavOpen(false)}>
            Free account brief
          </Link>
        </div>
      </nav>

      <section id="stradex-hero" className="landing-hero">
        <div className="landing-hero-badge">The AI-powered growth agency</div>
        <h1>
          <span className="stradex-hero-line">
            Your CEO said <em>use AI.</em>
          </span>
          <span className="stradex-hero-line stradex-hero-line--second">
            We <em className="stradex-hero-em-are">are</em>
            <span>your AI.</span>
          </span>
        </h1>
        <p className="landing-hero-sub">
          Enterprise revenue teams don&apos;t need another AI platform. They need an agency that runs proven GTM plays
          for them — with AI handling research, drafting, and sequence execution at scale. Sales closes accounts that used
          to sit untouched. ABM executes programs at a scale no team can staff. Customer success catches renewals before
          they become risks. Monday briefings, every trigger acted on, outreach ready to send — zero implementation
          required.
        </p>
        <p className="landing-hero-support">
          Serving strategic account teams at <strong>Fortune 500 technology companies</strong>
        </p>
        <div className="landing-hero-actions">
          <a href="#cta" className="landing-btn-primary">
            Get a free account brief →
          </a>
          <a href="#how" className="landing-btn-outline">
            See how it works
          </a>
        </div>
        <div className="landing-hero-visual" />
      </section>

      <div className="landing-value-strip landing-reveal">
        <div className="landing-value-strip-inner">
          {speedStrip.map((s) => (
            <div className="landing-value-item" key={s.label}>
              <div className="landing-value-number">{s.stat}</div>
              <div className="landing-value-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section id="problem" className="landing-problem landing-reveal">
        <div className="landing-section-label">The problem</div>
        <h2 className="stradex-heading-tight">
          Your revenue team can&apos;t cover every account with the depth enterprise deals demand. And the AI tools you
          bought to fix it added complexity without adding capacity.
        </h2>
        <p className="stradex-lead stradex-problem-lead-workload">
          The average B2B deal involves 13 stakeholders across multiple departments. Your AEs manage 15 named accounts.
          There aren&apos;t enough hours to research every division, respond to every buying signal, personalize every
          touchpoint, prep every executive meeting, and maintain every relationship. So they default to the 3 accounts they
          know best — and the other 12 get generic templates or silence.
        </p>
        <div className="stradex-stat-grid stradex-stat-grid--workload">
          {workloadProblemStats.map((p, i) => (
            <div
              className="stradex-stat-card landing-reveal"
              key={p.label}
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="stradex-stat-value" style={{ color: p.color }}>
                {p.value}
              </div>
              <div className="stradex-stat-label">{p.label}</div>
            </div>
          ))}
        </div>
        <div className="stradex-problem-callout landing-reveal">
          <p>
            Your CEO said use AI to fix it. Your RevOps team evaluated 15 tools, implemented 3, and spent 6 months on
            rollout and training. The result? Your AEs now toggle between more tabs, your content sounds like every other
            AI-generated email, and the original problem hasn&apos;t moved. The tools created dashboards, not capacity. They
            generated content, not intelligence. They added workflow steps, not selling time.
          </p>
        </div>
        <p className="stradex-problem-bridge">
          What&apos;s missing isn&apos;t another platform. It&apos;s the execution layer that connects signals to plays to
          contacts to personalized content to governed outreach — without asking your team to learn anything new, change
          their workflow, or manage another vendor.
        </p>
        <a href="#how" className="stradex-problem-how-link">
          See how it works →
        </a>
      </section>

      <section id="advantage" className="landing-problem landing-reveal">
        <div className="landing-section-label">The AI advantage</div>
        <h2 className="stradex-heading-tight">
          We absorb the complexity. You capture the innovation curve — automatically.
        </h2>
        <p className="stradex-lead">
          Every major AI provider ships meaningful improvements quarterly: better reasoning, new content formats, lower
          inference costs. Organizations that built in-house 12 months ago are locked to the model they chose then. With
          StradexAI, every improvement flows through to your outreach automatically — no sprint, no evaluation cycle, no
          decision required.
        </p>
        <div className="stradex-ai-box landing-reveal">
          <div className="stradex-ai-grid">
            {advantageItems.map((text) => (
              <div className="stradex-ai-item" key={text.slice(0, 48)}>
                <AdvantageText text={text} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="teams" className="landing-platform landing-reveal">
        <div className="landing-platform-inner">
          <div className="landing-section-label">Who we serve</div>
          <h2>One intelligence layer for your entire revenue team</h2>
          <p className="landing-platform-sub">
            We work across the teams that drive growth — not just sales. The same account intelligence,{' '}
            <strong>proven GTM play library</strong>, and governed execution power every motion — with AI scaling what used
            to sit in decks and spreadsheets.
          </p>
          <div className="landing-platform-grid landing-platform-grid-four">
            {whoWeServe.map((w, i) => (
              <div className="landing-platform-card landing-reveal" key={w.title} style={{ transitionDelay: `${i * 0.05}s` }}>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="landing-flywheel">
        <div className="landing-flywheel-inner">
          <div className="landing-section-label">How it works</div>
          <h2>From signal to sent outreach in under 48 hours</h2>
          <p className="landing-flywheel-sub">
            We monitor the full portfolio continuously — detecting buying signals, selecting the{' '}
            <strong>right governed play</strong> for each moment, mapping contacts, generating relevant, context-aware
            content, and delivering it to your team ready to review and send. The engine runs whether your AE is in a QBR
            or on vacation.
          </p>
          <div className="landing-steps">
            {flowSteps.map((f, i) => (
              <div className="landing-step landing-reveal" key={f.n} style={{ transitionDelay: `${i * 0.05}s` }}>
                <div className="landing-step-number">{f.n}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>

          <div className="landing-flywheel-loop landing-reveal">
            <div className="landing-loop-icon">
              <StradexFlywheelLoopIcon />
            </div>
            <div>
              <h4>Always watching. Always current.</h4>
              <p>
                Your portfolio doesn&apos;t sit still. Leadership changes, earnings beats, competitive moves, and renewal
                windows surface every week. Every account stays under active coverage so triggered plays and drafted
                outreach reflect what&apos;s happening now — not last quarter&apos;s snapshot.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="output" className="landing-chat-callout landing-reveal">
        <div className="landing-chat-callout-inner">
          <div className="landing-chat-callout-copy">
            <div className="landing-section-label">The output</div>
            <h2>What your team actually receives</h2>
            <p>
              No login. No dashboard. No training. Your team gets briefings, play execution, and drafts delivered through
              email, Slack, or Salesforce — proven GTM motions, accelerated by AI.
            </p>
            <ul className="stradex-feature-list">
              {outputItems.map((item) => (
                <li key={item.strong}>
                  <strong>{item.strong}</strong>
                  {item.rest}
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-chat-callout-visual">
            <div className="stradex-sample-card landing-reveal">
              <div className="stradex-sample-label">Sample output</div>
              <div className="stradex-sample-signal">
                <strong>Signal:</strong>{' '}
                <span className="stradex-sample-accent">New VP Engineering hired at GM</span>
              </div>
              <div className="stradex-sample-play">
                Play triggered: <em>New C-Suite Executive (7 steps)</em>
              </div>
              <div className="stradex-sample-email">
                <div className="stradex-sample-email-lbl">Generated email</div>
                <p>
                  <strong>Subject:</strong> Congrats on the expanded role, Shelly
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                  <em>
                    &quot;Congrats on taking the lead of GM&apos;s AV Engineering group. Given what you built at Cruise
                    — especially the safety case framework and the validation infrastructure — this is the right move at
                    the right time for GM...&quot;
                  </em>
                </p>
              </div>
              <div className="stradex-sample-refs">
                References: contact background, division context, DRIVE Thor product fit, Cruise experience, ASIL-D
                certification path
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="landing-problem landing-reveal">
        <div className="landing-section-label">Results</div>
        <h2>Enterprise proof point</h2>
        <div className="stradex-proof-card landing-reveal">
          <div className="stradex-proof-header">
            <div className="stradex-proof-title">
              Fortune 500 semiconductor company
              <span>
                Strategic account expansion across automotive OEMs
              </span>
            </div>
            <div className="stradex-proof-badge">Active engagement</div>
          </div>
          <p className="stradex-proof-body">
            Multi-billion dollar account with 15+ divisions, 200K+ employees. Single AE covering the portfolio needed
            intelligence support to expand beyond 2 active divisions into the full buying landscape.
          </p>
          <div className="stradex-proof-metrics">
            <div>
              <div className="stradex-proof-metric-num">&lt; 48hr</div>
              <div className="stradex-proof-metric-lbl">Trigger-to-outreach response time</div>
            </div>
            <div>
              <div className="stradex-proof-metric-num">15 of 15</div>
              <div className="stradex-proof-metric-lbl">Divisions with active coverage</div>
            </div>
            <div>
              <div className="stradex-proof-metric-num">100+</div>
              <div className="stradex-proof-metric-lbl">Contacts enriched across buying groups</div>
            </div>
            <div>
              <div className="stradex-proof-metric-num">7-step</div>
              <div className="stradex-proof-metric-lbl">Plays with division-specific content</div>
            </div>
            <div>
              <div className="stradex-proof-metric-num">2+</div>
              <div className="stradex-proof-metric-lbl">
                New divisions engaged in first 90 days — pipeline expansion in previously inactive areas
              </div>
            </div>
          </div>
          <div className="stradex-proof-quote">
            &quot;The content referenced the contact&apos;s background at their previous company, the specific safety
            frameworks they built, and how our product maps to their new division&apos;s priorities. That&apos;s not a
            template — that&apos;s intelligence.&quot;
          </div>
        </div>
      </section>

      <section id="outcomes" className="landing-platform landing-reveal">
        <div className="landing-platform-inner stradex-outcomes-inner">
          <div className="landing-section-label">What changes</div>
          <h2>The outcomes</h2>
          <p className="landing-platform-sub">
            Beyond coverage metrics — here&apos;s what shifts when governed plays, intelligence, and execution run as one
            layer across your revenue team.
          </p>
          <ul className="stradex-feature-list stradex-outcomes-list">
            {outcomeStatements.map((line) => (
              <li key={line.slice(0, 48)}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-outreach landing-reveal" id="engagement">
        <div className="landing-outreach-inner">
          <div className="landing-section-label">Engagement model</div>
          <h2>Built in layers. Priced by the value we build.</h2>
          <p className="landing-outreach-sub">
            Foundation is built once and shared. Industry intelligence amortizes across accounts. Each account within a
            vertical costs less than the last.
          </p>
          <div className="landing-channel-grid">
            {engagementLayers.map((layer) => (
              <div className="landing-channel-card landing-reveal" key={layer.tag}>
                <div className="stradex-model-tag">{layer.tag}</div>
                <h3>{layer.title}</h3>
                <p>{layer.body}</p>
                <div className="stradex-model-foot">{layer.foot}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="landing-cta landing-reveal">
        <h2>
          See the quality on your accounts.
          <br />
          <span className="stradex-cta-highlight">Free.</span>
        </h2>
        <p>
          Pick one of your strategic accounts. We&apos;ll deliver an account intelligence report, buying group map, and
          two account-specific outreach drafts within 48 hours. No cost. No commitment.
        </p>
        <div className="stradex-cta-form-card">
          <h3>Get a free account brief</h3>
          <p>
            Tell us about one strategic account and we&apos;ll show you how <strong>governed GTM plays</strong>, account
            intelligence, and outreach come together — delivered in days, not quarters. We&apos;ll deliver your brief
            within 48 hours.
          </p>
          {leadSubmit === 'success' ? (
            <div className="stradex-lead-success-wrap">
              <p className="stradex-lead-success" role="status">
                {leadMessage}
              </p>
              {!leadWasDuplicate && leadCompanyId && leadSubmitterEmail && supplementStatus !== 'success' && (
                <div className="stradex-lead-followup">
                  <p className="stradex-lead-followup-intro">
                    Optional — tell us what to emphasize (about 10 seconds). Skip if you prefer.
                  </p>
                  <form onSubmit={handleLeadSupplementSubmit} className="stradex-lead-followup-form">
                    <input
                      type="text"
                      name="website"
                      autoComplete="off"
                      tabIndex={-1}
                      className="stradex-form-honeypot"
                      aria-hidden="true"
                    />
                    <div className="stradex-form-row">
                      <label htmlFor="sx-sup-product">Product or motion to emphasize</label>
                      <input
                        id="sx-sup-product"
                        type="text"
                        name="product_focus"
                        placeholder="e.g. Data platform renewal, new division expansion"
                      />
                    </div>
                    <div className="stradex-form-row">
                      <label htmlFor="sx-sup-buyer">Priority division or buyer</label>
                      <input
                        id="sx-sup-buyer"
                        type="text"
                        name="priority_buyer"
                        placeholder="e.g. VP Engineering, IT Operations"
                      />
                    </div>
                    {supplementStatus === 'error' && supplementMessage && (
                      <p className="stradex-lead-error" role="alert">
                        {supplementMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="landing-btn-outline stradex-form-submit stradex-followup-submit"
                      disabled={supplementStatus === 'loading'}
                    >
                      {supplementStatus === 'loading' ? 'Saving…' : 'Add details (optional) →'}
                    </button>
                  </form>
                </div>
              )}
              {!leadWasDuplicate && supplementStatus === 'success' && supplementMessage && (
                <p className="stradex-lead-supplement-done" role="status">
                  {supplementMessage}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleLeadBriefSubmit} noValidate>
              <input
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                className="stradex-form-honeypot"
                aria-hidden="true"
              />
              <div className="stradex-form-row">
                <label htmlFor="sx-name">Your name</label>
                <input id="sx-name" type="text" name="name" required placeholder="Jane Smith" />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-email">Work email</label>
                <input id="sx-email" type="email" name="email" required placeholder="jane@company.com" />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-company">Your company (seller)</label>
                <input id="sx-company" type="text" name="company" required placeholder="ServiceNow" />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-account">Which strategic account should we brief?</label>
                <input
                  id="sx-account"
                  type="text"
                  name="target_account"
                  required
                  placeholder="e.g. General Motors, Ford, Boeing"
                />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-domain">Target account website or domain</label>
                <input
                  id="sx-domain"
                  type="text"
                  name="target_domain"
                  required
                  placeholder="e.g. gm.com or https://www.gm.com"
                />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-industry">Target account industry (optional)</label>
                <input
                  id="sx-industry"
                  type="text"
                  name="target_industry"
                  placeholder="e.g. Automotive, Semiconductor"
                />
              </div>
              <div className="stradex-form-row">
                <label htmlFor="sx-challenge">What&apos;s your biggest challenge with this account? (optional)</label>
                <textarea
                  id="sx-challenge"
                  name="challenge"
                  placeholder="e.g. Can't get past the CTO's EA, don't know the buying committee, renewal coming up"
                />
              </div>
              {leadSubmit === 'error' && leadMessage && (
                <p className="stradex-lead-error" role="alert">
                  {leadMessage}
                </p>
              )}
              <button
                type="submit"
                className="landing-btn-primary stradex-form-submit"
                disabled={leadSubmit === 'loading'}
              >
                {leadSubmit === 'loading' ? 'Sending…' : 'Send my free brief →'}
              </button>
            </form>
          )}
        </div>
        <div className="stradex-alt-ctas">
          <div className="stradex-alt-cta">
            <a href={playbookHref}>Read the playbook ↓</a>
            <p>How enterprise sales captures AI value without the implementation tax (PDF)</p>
          </div>
          <div className="stradex-alt-cta">
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
              Follow the thinking →
            </a>
            <p>LinkedIn + Revenue Agents newsletter</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 StradexAI LLC. The AI-powered growth agency for enterprise sales.</p>
        <div className="landing-footer-links">
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href={`mailto:${contactEmail}`}>Contact</a>
          <a href="https://agentpilot.us" target="_blank" rel="noopener noreferrer">
            AgentPilot
          </a>
        </div>
      </footer>
    </div>
  );
}

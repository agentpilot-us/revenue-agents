'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                AP
              </div>
              <span className="text-2xl font-bold text-gray-900">Agent Pilot</span>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-2 text-blue-600 font-semibold hover:text-blue-700 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <div className="inline-block bg-white/20 px-4 py-2 rounded-full text-sm mb-6">
            ✓ Built by GTM experts with 20+ years experience
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-5xl mx-auto">
            Expand Your Biggest Accounts with AI—Without the Grunt Work
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-4xl mx-auto opacity-95">
            Strategic AEs at leading enterprises trust AgentPilot to identify expansion
            opportunities, personalize outreach, and close 6-figure deals in target accounts.
            Start with one rep, scale to your entire team.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="#demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Watch 3-Min Demo →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white/10 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Feature bullets */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center text-sm opacity-90">
            <span>✓ Deploy in days, not months</span>
            <span>✓ Syncs to your CRM</span>
            <span>✓ Always on-brand messaging</span>
            <span>✓ No credit card required</span>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600 uppercase tracking-wider mb-6">
            Trusted by strategic account teams in technology and automotive
          </p>
          <div className="flex flex-wrap gap-8 sm:gap-12 justify-center items-center">
            <div className="w-36 h-10 bg-gray-100 rounded flex items-center justify-center font-semibold text-gray-600">
              Technology
            </div>
            <div className="w-36 h-10 bg-gray-100 rounded flex items-center justify-center font-semibold text-gray-600">
              SaaS
            </div>
            <div className="w-36 h-10 bg-gray-100 rounded flex items-center justify-center font-semibold text-gray-600">
              Automotive
            </div>
            <div className="w-36 h-10 bg-gray-100 rounded flex items-center justify-center font-semibold text-gray-600">
              Manufacturing
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-6 text-gray-900">
            The Grunt Work Is Killing Your GTM Productivity
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed">
            Your team spends 60-70% of their time on manual research, list building, and
            repetitive outreach. That&apos;s time they should spend on strategy and building relationships.
          </p>

          {/* Pain points grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl mb-6">
                🔍
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Endless LinkedIn Searches</h3>
              <p className="text-gray-600 leading-relaxed">
                Hours spent hunting for buying group contacts, switching between LinkedIn,
                Apollo, and spreadsheets
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl mb-6">
                📋
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Manual Research & Enrichment</h3>
              <p className="text-gray-600 leading-relaxed">
                Copy-pasting contact info, researching company news, funding rounds, and
                tech stacks across multiple sites
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl mb-6">
                ✉️
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Repetitive Outreach</h3>
              <p className="text-gray-600 leading-relaxed">
                Writing the same personalized emails over and over, constantly checking
                your messaging guide
              </p>
            </div>
          </div>

          {/* Callout */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl max-w-2xl mx-auto flex items-center gap-4 shadow-sm">
            <div className="text-4xl">⏱️</div>
            <p className="text-lg font-bold text-red-900">
              Result: 10-15 hours per account just to start expansion
            </p>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-6 text-gray-900">
            Let AI Handle The Grunt Work
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed">
            Our agents do the manual research, data enrichment, and outreach prep—so your
            team can focus on closing deals and building relationships.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  Discovers buying groups with smart segmentation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Maps decision-makers by role, seniority, vertical—Enterprise AEs vs SMB,
                  whatever segments matter for your GTM motion
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  Auto-enriches contacts with emails & LinkedIn profiles
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  No more toggling between Apollo, RocketReach, and LinkedIn—agents find and
                  enrich all contacts in one workflow
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  Runs deep account research
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Funding rounds, tech stack, recent news, hiring signals, competitive intel—
                  everything you need to craft relevant outreach
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                ✉️
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  Drafts personalized outreach
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Multi-channel outreach that stays on-brand by following your messaging
                  framework—agents never go rogue
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                🔄
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  Syncs everything to your CRM
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Contacts, activities, engagement—all logged automatically so your data
                  stays clean
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIME SAVED SECTION */}
      <section className="bg-white py-20 lg:py-28 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-12 text-gray-900">
            95% Time Savings Per Account
          </h2>

          {/* Badge */}
          <div className="text-center mb-16">
            <span className="inline-block bg-gradient-to-r from-green-500 to-green-400 text-white px-6 py-3 rounded-full text-xl font-bold">
              That&apos;s 95% time savings
            </span>
          </div>

          {/* Before/After Comparison */}
          <div className="grid md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto mb-12">
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wider mb-4">Before AgentPilot</p>
              <p className="text-5xl font-extrabold text-red-600 mb-2">10-15 hours</p>
              <p className="text-gray-600">per account manually</p>
            </div>

            <div className="text-center text-5xl text-blue-600">→</div>

            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wider mb-4">With AgentPilot</p>
              <p className="text-5xl font-extrabold text-green-600 mb-2">15 minutes</p>
              <p className="text-gray-600">per account (AI-assisted)</p>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="max-w-4xl mx-auto bg-gray-50 rounded-xl overflow-hidden mb-12">
            <div className="grid grid-cols-3 bg-blue-600 text-white p-4 font-bold">
              <div>Task</div>
              <div className="text-center">Manual</div>
              <div className="text-center">With AI</div>
            </div>
            {[
              { task: 'Buying group discovery', manual: '3-4 hours', ai: '5 min' },
              { task: 'Data enrichment', manual: '2-3 hours', ai: '3 min' },
              { task: 'Account research', manual: '3-4 hours', ai: '4 min' },
              { task: 'Outreach drafts', manual: '2-4 hours', ai: '3 min' },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 p-4 border-b border-gray-200 last:border-0">
                <div className="text-gray-900">{row.task}</div>
                <div className="text-center text-gray-600">{row.manual}</div>
                <div className="text-center text-green-600 font-bold">{row.ai}</div>
              </div>
            ))}
          </div>

          {/* Focus box */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-xl max-w-4xl mx-auto mb-8">
            <h3 className="text-xl font-bold mb-4 text-blue-900">Your team focuses on:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-900">
                <span className="text-green-600 font-bold">✓</span>
                Strategic account planning
              </div>
              <div className="flex items-center gap-2 text-gray-900">
                <span className="text-green-600 font-bold">✓</span>
                Building relationships
              </div>
              <div className="flex items-center gap-2 text-gray-900">
                <span className="text-green-600 font-bold">✓</span>
                Closing deals
              </div>
            </div>
          </div>

          <p className="text-xl text-center text-gray-700">
            Your Strategic AEs can now manage <strong className="text-blue-600">8-10 target accounts</strong> instead of 2-3
          </p>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-16 text-gray-900">
            What Strategic AEs Say
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "AgentPilot gives me back 10 hours per week. I'm managing 8 target accounts instead of 3, and my Q1 pipeline is up 47%.",
                author: 'Marcus Chen',
                title: 'Enterprise AE, Automotive',
                initials: 'MC',
              },
              {
                quote: "The AI understands our value prop better than most new hires. Messaging is spot-on for each microsegment, and the approval queue gives me full control.",
                author: 'Sarah Martinez',
                title: 'Strategic Account Director, Mercedes IT',
                initials: 'SM',
              },
              {
                quote: "We closed a $340K expansion deal in manufacturing that we would've missed without AgentPilot. The agent found stakeholders we didn't know existed.",
                author: 'James Park',
                title: 'VP Sales, Automotive AI Platform',
                initials: 'JP',
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white p-8 rounded-xl shadow-sm">
                <div className="text-4xl text-blue-600 mb-4">&quot;</div>
                <p className="text-lg text-gray-700 italic mb-6 leading-relaxed">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-6 text-gray-900">
            Transparent Pricing. No Hidden Fees.
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-4xl mx-auto">
            Start with one rep, scale your team. Volume discounts apply automatically.
          </p>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            {/* Starter */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Starter</h3>
              <div className="mb-4">
                <span className="text-5xl font-extrabold text-blue-600">$997</span>
                <span className="text-gray-600">/month</span>
              </div>
              <div className="flex-grow space-y-3 mb-8">
                {[
                  '1 Strategic AE',
                  '5 active target accounts',
                  '500 contact enrichments/month',
                  'Email + Chat support',
                  'Standard integrations',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="block w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition text-center"
              >
                Get Started Free
              </Link>
            </div>

            {/* Growth - Featured */}
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 flex flex-col relative transform md:scale-105 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Growth</h3>
              <div className="mb-4">
                <span className="text-5xl font-extrabold text-blue-600">$897</span>
                <span className="text-gray-600">/rep/month</span>
              </div>
              <div className="flex-grow space-y-3 mb-8">
                {[
                  '3-10 Strategic AEs',
                  'Unlimited accounts',
                  '1,000 enrichments/rep/month',
                  'Priority support',
                  'Advanced integrations',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center"
              >
                Book Demo
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Enterprise</h3>
              <div className="mb-4">
                <span className="text-5xl font-extrabold text-blue-600">Custom</span>
              </div>
              <div className="flex-grow space-y-3 mb-8">
                {[
                  '11+ Strategic AEs',
                  'Unlimited accounts',
                  'Custom enrichment volume',
                  'Dedicated CSM + Slack',
                  'Custom integrations + API',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="block w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition text-center"
              >
                Contact Sales
              </Link>
            </div>
          </div>

          {/* Add-ons */}
          <div className="bg-gray-50 rounded-xl p-8 max-w-4xl mx-auto mb-12">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Add-Ons:</h3>
            <div className="space-y-2 text-gray-700">
              <p>• Additional accounts: $199/account/month</p>
              <p>• Extra enrichments: $0.50/contact</p>
              <p>• LinkedIn Sales Navigator integration: $299/month</p>
            </div>
          </div>

          {/* ROI Callout */}
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-8 rounded-xl max-w-4xl mx-auto text-center">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-lg text-gray-800 leading-relaxed">
              <strong className="text-orange-700">ROI Calculator:</strong> If your AE expands
              one $500K account by 20%, you&apos;ve created $100K in new ARR. AgentPilot pays for
              itself in <strong className="text-orange-700">12 days</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="demo" className="bg-gray-50 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-16 text-gray-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Will the AI send emails without my approval?',
                a: 'No. AgentPilot always requires approval. Every email, calendar invite, and Salesforce update goes to your approval queue. You review, edit, and approve before anything is sent. You maintain full control.',
              },
              {
                q: 'How is this different from AI SDR tools like Artisan?',
                a: 'AI SDRs focus on top-of-funnel lead generation at scale. AgentPilot is built for strategic AEs doing account expansion—helping them go deep into 5-10 high-value accounts with hyperpersonalized, microsegmented outreach. Think account-based, not lead-based.',
              },
              {
                q: 'Do I need special CRM setup to use the agents?',
                a: 'No special setup required. AgentPilot works with standard Salesforce objects (Accounts, Contacts, Opportunities, Activities). You manually trigger syncs on-demand during MVP. No complex integration or admin overhead.',
              },
              {
                q: 'How long does it take to deploy?',
                a: '30 minutes. Upload your company messaging, connect your tools (Salesforce, email, calendar), invite team members, and create your first target account. Your agent is ready to research immediately.',
              },
              {
                q: 'Can multiple reps collaborate on the same account?',
                a: 'Yes. Multiple users from your team can work on the same target account. Activity feed shows what teammates did (contacts added, emails sent, meetings booked). @mention colleagues in agent chat for handoffs.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(i)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition"
                >
                  <span className="text-lg font-semibold text-gray-900">{faq.q}</span>
                  <span className="text-2xl text-gray-400">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
            Ready To Let AI Handle The Grunt Work?
          </h2>
          <p className="text-xl mb-10 opacity-95 leading-relaxed">
            Give your strategic AEs an AI agent that researches accounts, finds contacts, and
            personalizes outreach—so they can focus on relationships and closing deals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="#demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Watch 3-Min Demo →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white/10 transition"
            >
              Get Started Free
            </Link>
          </div>

          <p className="text-sm opacity-90">
            See AgentPilot expand a real account in your tech stack<br />
            No credit card required • Deploy in days • Cancel anytime
          </p>

          <div className="mt-12 pt-8 border-t border-white/20">
            <p className="text-sm mb-4">Trusted by strategic account teams in technology, automotive, and manufacturing</p>
            <div className="flex flex-wrap gap-6 justify-center items-center opacity-90">
              <span className="font-semibold">Technology</span>
              <span>•</span>
              <span className="font-semibold">SaaS</span>
              <span>•</span>
              <span className="font-semibold">Automotive</span>
              <span>•</span>
              <span className="font-semibold">Manufacturing</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition">How It Works</Link></li>
                <li><Link href="#" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Use Cases</Link></li>
                <li><Link href="#" className="hover:text-white transition">Integrations</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Case Studies</Link></li>
                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition">API Docs</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact Sales</Link></li>
                <li><Link href="#" className="hover:text-white transition">Partner Program</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="mailto:support@agentpilot.us" className="hover:text-white transition">support@agentpilot.us</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition">Book a Demo</Link></li>
                <li><Link href="#" className="hover:text-white transition">Community Slack</Link></li>
                <li><Link href="#" className="hover:text-white transition">GitHub</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">🔒</span>
              <span>Secure Payment Powered by Stripe</span>
            </div>
            <div className="text-sm">
              © 2026 AgentPilot. All rights reserved.
              <Link href="#" className="ml-4 hover:text-white transition">Privacy Policy</Link>
              <Link href="#" className="ml-4 hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

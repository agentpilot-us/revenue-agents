'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Revenue Engine
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Production-ready Salesforce Agentforce programs. Deploy demos in 30 minutes, 
            production in 2-3 weeks. All plans include quarterly updates and Slack support.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-16">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <div className="relative">
            <button
              onClick={() => setBillingCycle(billingCycle === 'annual' ? 'monthly' : 'annual')}
              className={`w-14 h-7 rounded-full transition-colors ${
                billingCycle === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-7' : ''
                }`}
              />
            </button>
          </div>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual <span className="text-green-600 text-sm ml-1">(Save 17%)</span>
          </button>
        </div>

        {/* Individual Libraries */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Individual Libraries</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <LibraryCard
              name="New Logo Acquisition"
              description="Generate qualified pipeline with ABM targeting, intent signals, and multi-threading"
              features={[
                "5 strategic blueprints",
                "15 Apex classes, 8 LWCs",
                "12 Agentforce agents",
                "CLI-deployable demo",
                "NVIDIA: $400K pipeline in 30 days"
              ]}
              annualPrice="4,950"
              monthlyPrice="499"
              annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_ANNUAL!}
              monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_MONTHLY!}
              billingCycle={billingCycle}
            />
            
            <LibraryCard
              name="Customer Expansion"
              description="Orchestrate upsell and cross-sell across multiple buying groups"
              features={[
                "5 strategic blueprints",
                "12 Apex classes, 6 LWCs",
                "10 Agentforce agents",
                "Whitespace analysis",
                "Track 20+ buying groups"
              ]}
              annualPrice="4,950"
              monthlyPrice="499"
              annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_ANNUAL!}
              monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_MONTHLY!}
              billingCycle={billingCycle}
            />
            
            <LibraryCard
              name="Partner & Channel"
              description="Manage partner ecosystem with co-selling workflows and performance tracking"
              features={[
                "5 strategic blueprints",
                "10 Apex classes, 7 LWCs",
                "8 Agentforce agents",
                "Deal registration automation",
                "Manage 100+ partners"
              ]}
              annualPrice="4,950"
              monthlyPrice="499"
              annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_ANNUAL!}
              monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_MONTHLY!}
              billingCycle={billingCycle}
            />
            
            <LibraryCard
              name="Sales Velocity"
              description="Accelerate deals with risk scoring, automated nudges, and velocity tracking"
              features={[
                "5 strategic blueprints",
                "14 Apex classes, 9 LWCs",
                "11 Agentforce agents",
                "AI-powered deal risk scoring",
                "Reduce cycles 20-30%"
              ]}
              annualPrice="4,950"
              monthlyPrice="499"
              annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_ANNUAL!}
              monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_MONTHLY!}
              billingCycle={billingCycle}
            />
          </div>
        </div>

        {/* Complete Suite - Highlighted */}
        <div className="mt-24">
          <CompleteSuiteCard
            annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SUITE_ANNUAL!}
            monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SUITE_MONTHLY!}
            billingCycle={billingCycle}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <FAQSection />
        </div>
      </div>
    </div>
  );
}

// Library Card Component
interface LibraryCardProps {
  name: string;
  description: string;
  features: string[];
  annualPrice: string;
  monthlyPrice: string;
  annualPriceId: string;
  monthlyPriceId: string;
  billingCycle: 'annual' | 'monthly';
}

function LibraryCard({ 
  name, 
  description, 
  features, 
  annualPrice, 
  monthlyPrice,
  annualPriceId, 
  monthlyPriceId,
  billingCycle 
}: LibraryCardProps) {
  const currentPriceId = billingCycle === 'annual' ? annualPriceId : monthlyPriceId;
  const displayPrice = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const displayPeriod = billingCycle === 'annual' ? '/year' : '/month';

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{name}</h3>
      <p className="text-gray-600 mb-6 min-h-[60px]">{description}</p>
      
      <div className="mb-6">
        <div className="text-4xl font-bold text-gray-900">
          ${displayPrice}<span className="text-lg text-gray-600">{displayPeriod}</span>
        </div>
        {billingCycle === 'annual' && (
          <div className="text-sm text-gray-500 mt-1">or $499/month</div>
        )}
      </div>

      <Link
        href={`/checkout/${currentPriceId}`}
        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors mb-4"
      >
        Get Started
      </Link>

      <div className="space-y-3 mb-6">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {billingCycle === 'annual' && '✓ Fallback license after 12 months\n'}
          ✓ Quarterly updates<br />
          ✓ Private Slack support
        </p>
      </div>
    </div>
  );
}

// Complete Suite Card Component
interface CompleteSuiteCardProps {
  annualPriceId: string;
  monthlyPriceId: string;
  billingCycle: 'annual' | 'monthly';
}

function CompleteSuiteCard({ annualPriceId, monthlyPriceId, billingCycle }: CompleteSuiteCardProps) {
  const currentPriceId = billingCycle === 'annual' ? annualPriceId : monthlyPriceId;
  const displayPrice = billingCycle === 'annual' ? '14,950' : '1,499';
  const displayPeriod = billingCycle === 'annual' ? '/year' : '/month';

  return (
    <div className="relative">
      {/* "Best Value" Badge */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
          BEST VALUE - Save $4,850
        </span>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-12 text-white">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3">Complete GTM Suite</h2>
          <p className="text-xl text-blue-100">All 4 Libraries Included</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">What's Included:</h3>
            <ul className="space-y-2 text-blue-100">
              <li>✓ New Logo Acquisition Library</li>
              <li>✓ Customer Expansion Library</li>
              <li>✓ Partner & Channel Library</li>
              <li>✓ Sales Velocity Library</li>
              <li className="pt-2 border-t border-blue-400">
                <span className="text-white font-semibold">20 strategic blueprints</span>
              </li>
              <li><span className="text-white font-semibold">50+ Apex classes, 30+ LWCs</span></li>
              <li><span className="text-white font-semibold">41 Agentforce agents</span></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Perfect For:</h3>
            <ul className="space-y-2 text-blue-100">
              <li>✓ RevOps transforming full GTM motion</li>
              <li>✓ Consulting firms building practice</li>
              <li>✓ Enterprises with multiple revenue motions</li>
              <li>✓ Organizations deploying comprehensive AI revenue engine</li>
              <li className="pt-2 border-t border-blue-400">
                <span className="text-white font-semibold">SI partners: 120+ agents deployed across 50+ clients</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
            <div className="text-5xl font-bold mb-2">
              ${displayPrice}<span className="text-2xl text-blue-200">{displayPeriod}</span>
            </div>
            {billingCycle === 'annual' && (
              <div className="text-blue-200">or $1,499/month</div>
            )}
            <div className="text-sm text-blue-100 mt-3">
              <span className="line-through">$19,800/year</span> if purchased separately
            </div>
          </div>

          <Link
            href={`/checkout/${currentPriceId}`}
            className="inline-block bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-12 rounded-lg text-lg transition-colors shadow-lg"
          >
            Get Complete Suite
          </Link>
        </div>

        <div className="text-center text-blue-100 text-sm">
          {billingCycle === 'annual' && (
            <p>✓ Fallback license after 12 months (all 4 libraries)</p>
          )}
          <p>✓ Quarterly updates across all programs</p>
          <p>✓ Comprehensive Slack support</p>
        </div>
      </div>
    </div>
  );
}

// FAQ Section Component
function FAQSection() {
  const faqs = [
    {
      question: "What's included with the annual subscription?",
      answer: "Complete access to all blueprints, production-ready code, CLI-deployable demos, implementation guides, quarterly updates, and private Slack support. After 12 consecutive months, you receive a fallback license - you own that version forever even if you cancel."
    },
    {
      question: "What does 'fallback license' mean?",
      answer: "After paying for 12 consecutive months, you receive perpetual rights to use that version of the library forever. You can cancel and keep using it, or continue your subscription for ongoing updates and support."
    },
    {
      question: "What's the difference between annual and monthly?",
      answer: "Annual saves 17% and includes a fallback license after 12 months. Monthly offers flexibility to cancel anytime but doesn't include the fallback license. Both include full access, updates, and support while active."
    },
    {
      question: "What support is included?",
      answer: "Private Slack workspace access for demo setup, architecture guidance, implementation questions, and technical support. Support helps you understand and deploy the code, but does NOT include production implementation services (available separately)."
    },
    {
      question: "Can you deploy this to our production org?",
      answer: "The subscription includes the blueprints and code - you deploy it yourself or work with your team/SI partner. We offer Quick Start Deployment ($15K) and Full Implementation ($35K-75K) services separately if you need hands-on deployment assistance."
    },
    {
      question: "How do updates work?",
      answer: "Quarterly updates include new features, Salesforce release compatibility (3x/year), security patches, bug fixes, and new blueprints. Updates are automatic for active subscriptions."
    }
  ];

  return (
    <div className="space-y-6">
      {faqs.map((faq, idx) => (
        <details key={idx} className="bg-white rounded-lg shadow-md p-6 group">
          <summary className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 list-none flex items-center justify-between">
            <span>{faq.question}</span>
            <svg 
              className="w-5 h-5 text-gray-500 transform group-open:rotate-180 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <p className="mt-3 text-gray-600 leading-relaxed">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

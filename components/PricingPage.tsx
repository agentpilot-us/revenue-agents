'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your GTM Program
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI agents for product marketers, SDRs, AEs, partner and customer success. Get started in minutes; sync contacts and activities to your Salesforce CRM. All plans include quarterly updates and Slack support.
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

        {/* Account Expansion - only buyable product */}
        <div className="max-w-xl mx-auto">
          <LibraryCard
            name="Account Expansion"
            description="Agents that map buying groups, research accounts, and run expansion outreach. Orchestrate upsell and cross-sell across multiple buying groups."
            features={[
              "Agents that discover buying groups and run research",
              "Track 20+ buying groups per account",
              "Sync to Salesforce so your CRM stays the source of truth",
              "Strategic playbooks and persona templates",
              "Quarterly updates and Slack support"
            ]}
            annualPrice="4,950"
            monthlyPrice="499"
            annualPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_ANNUAL ?? ''}
            monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_MONTHLY ?? ''}
            billingCycle={billingCycle}
          />
        </div>

        {/* Coming soon */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-500">More agents coming soon</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="font-medium text-gray-700">Referral marketing</p>
              <p className="text-sm text-gray-500 mt-1">Agents to scale referral programs</p>
              <span className="inline-block mt-2 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded">Coming soon</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="font-medium text-gray-700">PLG</p>
              <p className="text-sm text-gray-500 mt-1">Product-led growth agents</p>
              <span className="inline-block mt-2 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded">Coming soon</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="font-medium text-gray-700">Partner expansion</p>
              <p className="text-sm text-gray-500 mt-1">Agents for partner pipeline and co-sell</p>
              <span className="inline-block mt-2 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded">Coming soon</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Frequently Asked Questions</h2>
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

  // Determine color theme based on library name
  const getColorTheme = () => {
    if (name.includes('New Logo')) return {
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-600',
      checkColor: 'text-blue-600'
    };
    if (name.includes('Expansion')) return {
      gradient: 'from-green-50 to-white',
      border: 'border-green-100',
      button: 'bg-green-600 hover:bg-green-700',
      iconBg: 'bg-green-600',
      checkColor: 'text-green-600'
    };
    if (name.includes('Partner')) return {
      gradient: 'from-purple-50 to-white',
      border: 'border-purple-100',
      button: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-600',
      checkColor: 'text-purple-600'
    };
    if (name.includes('Velocity')) return {
      gradient: 'from-orange-50 to-white',
      border: 'border-orange-100',
      button: 'bg-orange-600 hover:bg-orange-700',
      iconBg: 'bg-orange-600',
      checkColor: 'text-orange-600'
    };
    return {
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-600',
      checkColor: 'text-blue-600'
    };
  };

  const colors = getColorTheme();

  return (
    <div className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-8 hover:shadow-xl transition-shadow border ${colors.border}`}>
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

      {currentPriceId ? (
        <Link
          href={`/checkout/${currentPriceId}`}
          className={`block w-full ${colors.button} text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors mb-4`}
        >
          Get Started
        </Link>
      ) : (
        <div className="block w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg text-center mb-4 cursor-not-allowed">
          Coming soon
        </div>
      )}

      <div className="space-y-3 mb-6">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <svg className={`w-5 h-5 ${colors.checkColor} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
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

// FAQ Section Component
function FAQSection() {
  const faqs = [
    {
      question: "What's included with the annual subscription?",
      answer: "Full access to the Account Expansion agent: discover and track buying groups, research accounts, run outreach, and sync contacts and activities to your Salesforce CRM. You get strategic playbooks, persona templates, quarterly updates, and private Slack support. After 12 consecutive months, you receive a fallback license—you own that version forever even if you cancel."
    },
    {
      question: "What does 'fallback license' mean?",
      answer: "After paying for 12 consecutive months, you receive perpetual rights to use that version of the program forever. You can cancel and keep using it, or continue your subscription for ongoing updates and support."
    },
    {
      question: "What's the difference between annual and monthly?",
      answer: "Annual saves 17% and includes a fallback license after 12 months. Monthly offers flexibility to cancel anytime but doesn't include the fallback license. Both include full access, updates, and support while active."
    },
    {
      question: "What support is included?",
      answer: "Private Slack workspace access for setup, architecture guidance, and technical support. Support helps you get the most out of the agents and sync to your CRM; it does not include custom implementation or integration services (available separately)."
    },
    {
      question: "How does syncing to Salesforce work?",
      answer: "Agent-discovered contacts, buying groups, and activities can be synced to your Salesforce org so your CRM stays the source of truth. You connect your org once; we handle the sync. Custom integration or deployment services are available separately if needed."
    },
    {
      question: "How do updates work?",
      answer: "Quarterly updates include new agent capabilities, connector improvements, security patches, and bug fixes. Updates are automatic for active subscriptions."
    }
  ];

  return (
    <div className="space-y-6">
      {faqs.map((faq, idx) => (
        <details key={idx} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 group">
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

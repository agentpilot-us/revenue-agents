'use client';

import { useState } from 'react';
import {
  Check,
  X,
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Package,
  Code,
  BookOpen,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ email: '', githubUsername: '' });

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleCheckout = async (priceId: string) => {
    if (!checkoutData.email) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          email: checkoutData.email,
          githubUsername: checkoutData.githubUsername || '',
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: 'Is this just templates, or do I get actual working code?',
      a: 'You get production-ready, tested Apex code, LWC components, and complete Salesforce metadata. Deploy directly to your org. Every blueprint includes 80%+ test coverage.',
    },
    {
      q: 'Do I need a developer to use this?',
      a: 'Professional tier is designed for Salesforce admins with basic Apex knowledge. Enterprise tier includes developer support. Community edition is fully DIY.',
    },
    {
      q: 'Can I customize the blueprints?',
      a: 'Absolutely. All code is fully documented and designed for customization. Professional tier includes customization guides. Enterprise tier includes hands-on customization support.',
    },
    {
      q: 'How often are blueprints updated?',
      a: 'Quarterly releases with new blueprints and improvements. Professional & Enterprise tiers get automatic updates with migration guides.',
    },
    {
      q: 'What if I need help implementing?',
      a: 'Professional tier includes Slack support and monthly Q&A sessions. Enterprise tier includes dedicated CSM. Both tiers can add Quick Start deployment services ($15K).',
    },
    {
      q: 'Can I use these for client projects?',
      a: 'Professional tier: Yes, for your internal use and consulting projects. Enterprise tier: Yes, including white-label options for partner/consulting firms.',
    },
  ];

  const testimonials = [
    {
      quote:
        'We deployed the ABM Account Expansion blueprint for our enterprise accounts. Within 30 days, we had $400K in qualified pipeline with 34% response rates. This blueprint paid for itself 100x over.',
      author: 'Enterprise Account Team',
      company: 'NVIDIA',
      metric: '$400K Pipeline in 30 Days',
    },
    {
      quote:
        'We estimated 6 months to build our sales enablement agent. Using the Revenue Agents blueprint, we deployed in 2 weeks. The strategic playbook alone saved us months of planning.',
      author: 'Chris Taylor',
      title: 'RevOps Director',
      company: 'SaaS Unicorn',
      metric: 'From 6 Months to 2 Weeks',
    },
    {
      quote:
        "We're a Salesforce SI with 50+ clients. Revenue Agents blueprints have become our standard delivery methodology. We've deployed 120+ agents in the last year.",
      author: 'Sarah Martinez',
      title: 'VP Solutions',
      company: 'Salesforce Partner',
      metric: '120+ Agents Deployed',
    },
  ];

  const monthlyPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || 'price_monthly_placeholder';
  const annualPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL || 'price_annual_placeholder';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            <span>Trusted by Salesforce AgentBlazers</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Launch AI-Native Revenue Programs in{' '}
            <span className="text-blue-600">Days, Not Months</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Pre-built Agentforce blueprints, working code, and proven playbooks. Everything you
            need to deploy enterprise-grade revenue agents—strategy and implementation included.
          </p>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600 mb-12">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>Full access to all blueprints</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>Deploy in 2-3 weeks</span>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">$400K</div>
              <div className="text-slate-600">Pipeline in 30 Days</div>
              <div className="text-xs text-slate-500 mt-1">NVIDIA Result</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">2 Weeks</div>
              <div className="text-slate-600">Average Deploy Time</div>
              <div className="text-xs text-slate-500 mt-1">vs. 6 months custom</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">15+</div>
              <div className="text-slate-600">Production Blueprints</div>
              <div className="text-xs text-slate-500 mt-1">New releases quarterly</div>
            </div>
          </div>
        </div>
      </div>

      {/* The Problem/Solution */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="text-red-400 font-semibold mb-3 flex items-center space-x-2">
                <X className="w-5 h-5" />
                <span>Traditional Approach</span>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <X className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">4-6 months to launch one program</span>
                </li>
                <li className="flex items-start space-x-3">
                  <X className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">$200K+ in consulting fees</span>
                </li>
                <li className="flex items-start space-x-3">
                  <X className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">Custom code that becomes technical debt</span>
                </li>
                <li className="flex items-start space-x-3">
                  <X className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">No documentation for future teams</span>
                </li>
                <li className="flex items-start space-x-3">
                  <X className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">Starts from scratch every time</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-green-400 font-semibold mb-3 flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>Revenue Agents Approach</span>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-100 font-medium">
                    2-4 weeks to launch multiple programs
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-100 font-medium">$499/month for unlimited access</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-100 font-medium">
                    Production-tested, maintained code
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-100 font-medium">
                    Complete documentation included
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-slate-100 font-medium">
                    Reusable across your organization
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h2>
          <p className="text-xl text-slate-600 mb-8">
            Programs in a box. Strategy + Technical. Deploy in days.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Annual <span className="text-green-600 text-sm ml-1">(Save 17%)</span>
            </button>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="max-w-md mx-auto mb-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Get Started</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={checkoutData.email}
                onChange={(e) =>
                  setCheckoutData({ ...checkoutData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                GitHub Username (optional)
              </label>
              <input
                type="text"
                value={checkoutData.githubUsername}
                onChange={(e) =>
                  setCheckoutData({ ...checkoutData, githubUsername: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-github-username"
              />
              <p className="text-xs text-slate-500 mt-1">
                We'll send you a GitHub invitation after payment
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Community Edition */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-slate-300 transition-all">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Community Edition</h3>
              <p className="text-slate-600">For Learning & Exploration</p>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold text-slate-900">Free</div>
              <div className="text-slate-600 text-sm">Forever</div>
            </div>
            <a
              href="https://github.com/agentpilot-pro"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:border-slate-400 transition-all font-semibold mb-6 text-center"
            >
              Access GitHub
            </a>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">5 Core Agent Blueprints</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Community Documentation</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Public GitHub Access</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Community Slack Channel</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Monthly Office Hours</span>
              </div>
            </div>
          </div>

          {/* Professional Edition - POPULAR */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-700 rounded-2xl p-8 transform scale-105 shadow-2xl relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Professional Edition</h3>
              <p className="text-blue-100">Complete Programs in a Box</p>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold text-white">
                {billingCycle === 'monthly' ? '$499' : '$415'}
              </div>
              <div className="text-blue-100 text-sm">
                {billingCycle === 'monthly' ? 'per month' : 'per month, billed annually'}
              </div>
            </div>
            <button
              onClick={() =>
                handleCheckout(billingCycle === 'monthly' ? monthlyPriceId : annualPriceId)
              }
              disabled={loading || !checkoutData.email}
              className="w-full py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold mb-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Start 14-Day Free Trial'}
            </button>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white font-medium">
                  Everything in Community, PLUS:
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">15+ Advanced Blueprints</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Production-Ready Code</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Strategic Playbooks</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Private Slack Support</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Video Walkthroughs</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Quarterly Updates</span>
              </div>
            </div>
          </div>

          {/* Enterprise Platform */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-slate-300 transition-all">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise Platform</h3>
              <p className="text-slate-600">Complete Deployment Suite</p>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold text-slate-900">Custom</div>
              <div className="text-slate-600 text-sm">Starting at $5K/mo</div>
            </div>
            <button className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold mb-6">
              Schedule Demo
            </button>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700 font-medium">
                  Everything in Pro, PLUS:
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">SaaS Deployment Console</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Dedicated CSM</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">White-Label Options</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Custom Development</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Team Certification</span>
              </div>
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Quick Start Included ($25K value)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What's Included - Program in a Box */}
      <div id="blueprints" className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              The "Program in a Box" Difference
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Not just code. Not just strategy. <span className="font-bold text-slate-900">Both.</span>{' '}
              Everything you need to deploy enterprise-grade revenue programs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Strategic Framework</h3>
              <p className="text-slate-600 text-sm mb-4">
                Know WHAT to build and WHY it matters
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Business case templates</li>
                <li>• Stakeholder playbooks</li>
                <li>• Success metrics & OKRs</li>
                <li>• Change management</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Technical Blueprint</h3>
              <p className="text-slate-600 text-sm mb-4">
                Know HOW to build with proven architecture
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Architecture diagrams</li>
                <li>• Data model specs</li>
                <li>• Integration patterns</li>
                <li>• Security frameworks</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Working Code</h3>
              <p className="text-slate-600 text-sm mb-4">
                DEPLOY in days, fully tested and ready
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Production Apex code</li>
                <li>• LWC components</li>
                <li>• 80%+ test coverage</li>
                <li>• Deployment scripts</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Launch Playbooks</h3>
              <p className="text-slate-600 text-sm mb-4">
                LAUNCH & IMPROVE with clear guidance
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Go-live checklists</li>
                <li>• Training materials</li>
                <li>• Adoption tracking</li>
                <li>• Optimization guides</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-8">
            <div className="text-center">
              <p className="text-lg text-slate-700 mb-4">
                <span className="font-bold text-slate-900">It's like having:</span> A VP of Strategy
                + Solutions Architect + Development Team + Change Management Consultant
              </p>
              <p className="text-2xl font-bold text-blue-600">
                For the price of a Netflix subscription.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Blueprints */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Sample Blueprints</h2>
          <p className="text-xl text-slate-600">Deploy proven revenue programs in your org</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: 'ABM Account Expansion',
              desc: 'Multi-buying-group orchestration with intent signals',
              tier: 'Pro',
            },
            {
              name: 'Event Intelligence Agent',
              desc: 'Attendee follow-up & engagement scoring',
              tier: 'Community',
            },
            {
              name: 'Deal Velocity Optimizer',
              desc: 'Pipeline acceleration with automated nudges',
              tier: 'Pro',
            },
            {
              name: 'Territory Rebalancing',
              desc: 'Data-driven territory optimization',
              tier: 'Pro',
            },
            {
              name: 'Competitive Intelligence',
              desc: 'Real-time competitive tracking & alerts',
              tier: 'Pro',
            },
            {
              name: 'Executive Engagement',
              desc: 'C-suite relationship mapping & sequencing',
              tier: 'Pro',
            },
          ].map((blueprint, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-900">{blueprint.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    blueprint.tier === 'Pro'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {blueprint.tier}
                </span>
              </div>
              <p className="text-sm text-slate-600">{blueprint.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Real Results from Real Teams</h2>
            <p className="text-xl text-slate-300">
              See what customers are achieving with Revenue Agents
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="text-2xl font-bold text-blue-400 mb-4">{testimonial.metric}</div>
                <p className="text-slate-300 mb-6 italic">"{testimonial.quote}"</p>
                <div className="border-t border-slate-700 pt-4">
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  {testimonial.title && (
                    <div className="text-sm text-slate-400">{testimonial.title}</div>
                  )}
                  <div className="text-sm text-slate-500">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900">{faq.q}</span>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-slate-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600 flex-shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="px-6 pb-4 text-slate-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ship Revenue Programs This Quarter, Not Next Year
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Every month you delay is pipeline left on the table. Your competitors are deploying
            AI-native revenue engines right now.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() =>
                handleCheckout(billingCycle === 'monthly' ? monthlyPriceId : annualPriceId)
              }
              disabled={loading || !checkoutData.email}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Start Your 14-Day Free Trial'}
            </button>
            <button className="px-8 py-4 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-all font-semibold text-lg">
              Schedule a Demo
            </button>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            ✓ No credit card required • ✓ Full access to all blueprints • ✓ 30-day money-back
            guarantee
          </p>
        </div>
      </div>
    </div>
  );
}


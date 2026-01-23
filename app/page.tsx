import Link from 'next/link';
import { Check, X, Star, ArrowRight, Play } from 'lucide-react';

export default function HomePage() {
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

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-lg font-semibold"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-all flex items-center justify-center space-x-2 text-lg font-semibold">
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600">
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

      {/* Problem/Solution Section */}
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
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
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
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg shadow-xl"
            >
              Start Your 14-Day Free Trial
            </Link>
            <button className="px-8 py-4 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-all font-semibold text-lg">
              Schedule a Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <img
              src="/agentpilot-logo.png"
              alt=""
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold text-slate-900">AgentPilot</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <Link href="/#blueprints" className="text-slate-600 hover:text-slate-900">
              Blueprints
            </Link>
            <Link href="/#faq" className="text-slate-600 hover:text-slate-900">
              FAQ
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
          </div>
          <div className="md:hidden flex items-center space-x-4">
            <Link
              href="/login"
              className="px-3 py-2 text-slate-700 hover:text-slate-900 text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}


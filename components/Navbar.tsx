'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Revenue Agents</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/#blueprints" className="text-slate-600 hover:text-slate-900">
              Blueprints
            </Link>
            <Link href="/#faq" className="text-slate-600 hover:text-slate-900">
              FAQ
            </Link>
            <Link
              href="/portal"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Portal
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}


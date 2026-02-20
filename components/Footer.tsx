import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="font-semibold">Secure Payment</span>
            </div>
            <p className="text-sm text-slate-400">Powered by Stripe</p>
          </div>
          <div>
            <div className="font-semibold mb-2">Product</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/#blueprints" className="hover:text-white">
                  Blueprints
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Company</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Support</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Community Slack
                </a>
              </li>
              <li>
                <a href="https://github.com/agentpilot-pro" className="hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <p>
            © 2025 AgentPilot. Built by{' '}
            <span className="text-blue-400">AgentPilot</span>.
          </p>
          <p className="mt-2">
            Salesforce AgentBlazer Legend • Data Cloud Consultant • Agentforce Specialist
          </p>
        </div>
      </div>
    </footer>
  );
}


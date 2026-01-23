import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function PortalPage() {
  // In production, get user from session/auth
  // For now, this is a basic implementation
  // TODO: Add authentication and fetch actual user data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Customer Portal</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Current Plan</p>
              <p className="text-2xl font-bold text-blue-600">Professional</p>
            </div>
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Access Your Blueprints</h2>
          <a
            href="https://github.com/agentpilot-pro/blueprints"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
          >
            Open GitHub Repository →
          </a>
          <p className="text-sm text-gray-600 mt-4">
            Clone the repository:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              git clone git@github.com:agentpilot-pro/blueprints.git
            </code>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-2 text-gray-600">
            <p>
              <span className="font-medium">Email:</span> user@example.com
            </p>
            <p>
              <span className="font-medium">GitHub Username:</span> your-username
            </p>
            <p>
              <span className="font-medium">Member Since:</span> January 2025
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/pricing"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}


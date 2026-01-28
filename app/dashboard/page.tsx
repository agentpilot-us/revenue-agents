import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          {searchParams.success === 'true' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-900 mb-2">
                    🎉 Payment Successful!
                  </h2>
                  <p className="text-green-800 mb-4">
                    Thank you for your purchase! Here&apos;s what happens next:
                  </p>
                  <ol className="space-y-2 text-green-800 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">1.</span>
                      <span>You&apos;ll receive a GitHub invitation via email within the next few minutes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Accept the invitation to access your purchased libraries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Clone the repositories and start deploying!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">4.</span>
                      <span>Join our private Slack workspace for support (link in welcome email)</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Canceled Message */}
          {searchParams.canceled === 'true' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-yellow-900 mb-2">
                Payment Canceled
              </h2>
              <p className="text-yellow-800 mb-4">
                Your payment was canceled. No charges were made.
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Return to Pricing
              </Link>
            </div>
          )}

          {/* Main Dashboard */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Customer Portal
                </h1>
                <p className="text-gray-600">
                  Welcome back, {session.user.name || session.user.email}!
                </p>
              </div>
              <Link
                href="/pricing"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All Plans →
              </Link>
            </div>

            {/* Subscription Status */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>Subscription Status</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </h2>
              
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Current Plan</h3>
                <p className="text-2xl font-bold text-blue-600">Professional</p>
                <p className="text-sm text-gray-600 mt-1">All features included</p>
              </div>
            </div>

            {/* Access Your Blueprints */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Access Your Blueprints</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">GitHub Repository Access</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Your purchased libraries will appear here once you accept the GitHub invitation.
                      Check your email for the invitation link.
                    </p>
                    
                    <a 
                      href="https://github.com/agentpilot-pro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      Open GitHub Organization
                    </a>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Clone command example:</strong>
                  </p>
                  <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
                    git clone git@github.com:agentpilot-pro/blueprints.git
                  </code>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">📚 Documentation</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Implementation guides, architecture docs, and video walkthroughs
                  </p>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Docs →
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">💬 Slack Support</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Get help with demo setup and architecture questions
                  </p>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Join Slack →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

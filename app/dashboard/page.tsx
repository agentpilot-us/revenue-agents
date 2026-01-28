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
                  Welcome back, {session.user?.name || session.user?.email}!
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
                      Your GitHub invitation will be sent within 24 hours along with:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700 mb-4">
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Private Slack workspace invite</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Deployment guide and video walkthrough</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Optional kickoff call booking link</span>
                      </li>
                    </ul>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        ⚡ Want to deploy faster?
                      </p>
                      <p className="text-sm text-blue-800">
                        Our Quick Start package ($15K) includes hands-on deployment, customization, and training. Most teams are live in production within 2 weeks.
                      </p>
                    </div>

                    <p className="text-sm text-gray-600">
                      <strong>Questions?</strong> Check your email for your welcome message or reach out to michelle@stradexai.com
                    </p>
                  </div>
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

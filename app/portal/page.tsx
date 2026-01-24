import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function PortalPage() {
  const session = await auth();

  // Layout handles redirect, but keeping this as a safety check
  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const userEmail = user.email || 'No email';
  const userName = user.name || 'User';
  const userImage = user.image;

  // Get user from database to fetch additional info like createdAt
  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { createdAt: true },
  });

  const memberSince = dbUser?.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'Recently';

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
          <div className="flex items-start space-x-4 mb-4">
            {userImage && (
              <img
                src={userImage}
                alt={userName}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div className="space-y-2 text-gray-600 flex-1">
              <p>
                <span className="font-medium">Name:</span> {userName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {userEmail}
              </p>
              <p>
                <span className="font-medium">Member Since:</span> {memberSince}
              </p>
            </div>
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


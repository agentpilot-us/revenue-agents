import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // Get user's stats
  const activities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    select: { type: true },
  });
  const contactsDiscovered = activities.filter((a) => a.type === 'ContactDiscovered').length;
  const emailsSent = activities.filter((a) => a.type === 'Email').length;
  const repliesReceived = activities.filter((a) => a.type === 'EmailReply').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-600 mt-2">
            Your AI agents are ready to work
          </p>
        </div>

        {/* Play Selector */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Choose Your Play</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Expansion Play */}
            <Link href="/chat?play=expansion">
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border-2 border-blue-200 hover:shadow-xl transition-shadow cursor-pointer">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-2xl font-bold mb-2">Account Expansion</h3>
                <p className="text-gray-600 mb-4">
                  Discover buying groups, run multi-threaded outreach
                </p>
                <span className="text-sm text-gray-600">For Strategic AEs</span>
              </div>
            </Link>

            {/* Partner Play */}
            <Link href="/chat?play=partner">
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border-2 border-purple-200 hover:shadow-xl transition-shadow cursor-pointer">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-2xl font-bold mb-2">Partner Enablement</h3>
                <p className="text-gray-600 mb-4">
                  Onboard and activate co-sell with partners
                </p>
                <span className="text-sm text-gray-600">For Partner Managers</span>
              </div>
            </Link>

            {/* Referral Play */}
            <Link href="/chat?play=referral">
              <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border-2 border-green-200 hover:shadow-xl transition-shadow cursor-pointer">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-2xl font-bold mb-2">Referral Program</h3>
                <p className="text-gray-600 mb-4">
                  Generate referrals from happy customers
                </p>
                <span className="text-sm text-gray-600">For Customer Success</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">This Week</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-700 mb-2">Contacts Discovered</p>
              <p className="text-4xl font-bold text-gray-900">{contactsDiscovered}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-700 mb-2">Emails Sent</p>
              <p className="text-4xl font-bold text-gray-900">{emailsSent}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-700 mb-2">Replies Received</p>
              <p className="text-4xl font-bold text-gray-900">{repliesReceived}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/activities" className="text-blue-600 hover:text-blue-700">
              View All →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow divide-y">
            <div className="p-4 text-gray-600 text-center">
              No recent activity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

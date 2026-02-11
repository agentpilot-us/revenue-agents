import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';

export default async function PlaysPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const plays = [
    {
      id: 'expansion',
      icon: '📈',
      name: 'Account Expansion',
      description: 'Discover buying groups and run multi-threaded outreach',
      role: 'Strategic AEs',
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-200 hover:shadow-xl',
    },
    {
      id: 'partner',
      icon: '🤝',
      name: 'Partner Enablement',
      description: 'Onboard partners and activate co-sell motions',
      role: 'Partner Managers',
      gradient: 'from-purple-50 to-white',
      border: 'border-purple-200 hover:shadow-xl',
    },
    {
      id: 'referral',
      icon: '⭐',
      name: 'Referral Program',
      description: 'Generate referrals from happy customers',
      role: 'Customer Success',
      gradient: 'from-green-50 to-white',
      border: 'border-green-200 hover:shadow-xl',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Play</h1>
        <p className="text-gray-600 mb-8">
          Select the AI agent workflow for your role
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {plays.map((play) => (
            <Link
              key={play.id}
              href={`/chat?play=${play.id}`}
              className={`bg-gradient-to-br ${play.gradient} p-6 rounded-2xl border-2 ${play.border} transition-shadow block`}
            >
              <div className="text-4xl mb-4">{play.icon}</div>
              <h2 className="text-2xl font-bold mb-2">{play.name}</h2>
              <p className="text-gray-600 mb-4">{play.description}</p>
              <span className="text-sm text-gray-500">For {play.role}</span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

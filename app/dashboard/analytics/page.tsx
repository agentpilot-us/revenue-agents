import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from '@/app/components/analytics/AnalyticsDashboard';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-400">
            Engagement intelligence across all accounts
          </p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

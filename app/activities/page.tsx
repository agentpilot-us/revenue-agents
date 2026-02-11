import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Activities</h1>
      <p className="text-gray-600 mb-8">
        Activity feed and history. View recent activity from the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}

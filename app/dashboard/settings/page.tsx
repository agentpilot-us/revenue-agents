import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900">{session.user?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{session.user?.email ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

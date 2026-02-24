import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAllowUserAdmin, getWaitlistEntries, getWaitlistUsers } from './actions';
import { UsersListClient } from './UsersListClient';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const allow = await getAllowUserAdmin();
  if (!allow) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>User management is not enabled. Set ALLOW_DEMO_SETUP=true to use this page.</p>
      </div>
    );
  }

  const [entries, waitlistUsers] = await Promise.all([
    getWaitlistEntries(),
    getWaitlistUsers(),
  ]);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-2">Waitlist</h1>
      <p className="text-slate-400 text-sm mb-6">
        Approve form submissions to send an invite email, or activate accounts that already signed in.
      </p>
      <UsersListClient entries={entries} waitlistUsers={waitlistUsers} />
    </div>
  );
}

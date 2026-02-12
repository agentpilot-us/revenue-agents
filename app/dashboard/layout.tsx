import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/app/dashboard/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <aside className="fixed left-0 top-0 z-40 h-full w-56 border-r border-slate-700 bg-zinc-900">
        <div className="flex h-full flex-col px-4 py-6">
          <h2 className="mb-6 px-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Dashboard
          </h2>
          <DashboardNav />
        </div>
      </aside>
      <main className="pl-56">{children}</main>
    </div>
  );
}

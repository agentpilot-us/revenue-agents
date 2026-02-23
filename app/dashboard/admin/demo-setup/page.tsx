import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAllowDemoSetup, getCompaniesForDemo, getVerticals } from '@/app/dashboard/admin/demo-setup/actions';
import { DemoSetupClient } from '@/app/dashboard/admin/demo-setup/DemoSetupClient';

export default async function DemoSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const allow = await getAllowDemoSetup();
  if (!allow) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Demo setup is not enabled. Set ALLOW_DEMO_SETUP=true to use this page.</p>
      </div>
    );
  }

  const [companies, verticals] = await Promise.all([
    getCompaniesForDemo(session.user.id),
    Promise.resolve(getVerticals()),
  ]);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-2">Demo setup</h1>
      <p className="text-slate-400 text-sm mb-6">
        Build a demo account once (costs tokens), then lock it. After lock, all views use pre-built data and no API/LLM calls.
      </p>
      <DemoSetupClient
        companies={companies}
        verticals={verticals}
        userId={session.user.id}
      />
    </div>
  );
}

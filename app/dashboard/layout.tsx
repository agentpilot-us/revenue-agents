import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/app/dashboard/DashboardNav';
import { dash } from '@/app/dashboard/dashboard-classes';
import { isDemoUser } from '@/lib/demo/context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login?callbackUrl=/dashboard');
  }

  const status = (session.user as { accountStatus?: string }).accountStatus ?? 'waitlist';
  if (status === 'waitlist') {
    redirect('/waitlist-pending');
  }
  if (status === 'invited') {
    redirect('/onboarding');
  }
  if (status === 'suspended') {
    redirect('/suspended');
  }

  // Hide Demo setup and Waitlist for official demo accounts (e.g. demo-techinfra@agentpilot.us)
  const allowDemoSetup =
    process.env.ALLOW_DEMO_SETUP === 'true' && !isDemoUser(session.user as { email?: string | null });

  return (
    <div className={dash.page}>
      <aside className={dash.sidebar}>
        <div className={dash.sidebarInner}>
          {/* Brand */}
          <div className={dash.sidebarBrand}>
            <div className={dash.sidebarBrandIcon}>A</div>
            <span className={dash.sidebarBrandText}>AgentPilot</span>
          </div>

          {/* Nav */}
          <DashboardNav allowDemoSetup={allowDemoSetup} />
        </div>
      </aside>
      <main className={dash.main}>{children}</main>
    </div>
  );
}

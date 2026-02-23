import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import { activateAndGoToDashboard } from './actions';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) {
    redirect('/login?callbackUrl=/onboarding');
  }

  const status = (session.user as { accountStatus?: string }).accountStatus;
  if (status === 'active') redirect('/dashboard');
  if (status === 'waitlist') redirect('/waitlist-pending');

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-[#faf9f7] ${dmSans.variable}`}
      style={{ fontFamily: 'var(--font-dm-sans), -apple-system, sans-serif' } as React.CSSProperties}
    >
      <div className="w-full max-w-md px-6 text-center">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3 text-[#0a0a0f] hover:opacity-80 transition-opacity">
            <img src="/agentpilot-logo.png" alt="" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold">AgentPilot</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e1df] p-8">
          <h1 className="text-2xl font-semibold text-[#0a0a0f] mb-2">You&apos;re invited</h1>
          <p className="text-[#6b6b7b] mb-6">
            Your account is ready. Click below to go to your dashboard.
          </p>
          <form action={activateAndGoToDashboard}>
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors"
            >
              Go to Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export default async function WaitlistPendingPage() {
  const session = await auth();
  if (!session) {
    redirect('/login?callbackUrl=/waitlist-pending');
  }

  const status = (session.user as { accountStatus?: string }).accountStatus;
  if (status !== 'waitlist') {
    if (status === 'active') redirect('/dashboard');
    if (status === 'invited') redirect('/onboarding');
  }

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
          <h1 className="text-2xl font-semibold text-[#0a0a0f] mb-2">You&apos;re on the list</h1>
          <p className="text-[#6b6b7b] mb-6">
            Thanks for your interest in AgentPilot. We&apos;ll review your request and be in touch soon. You&apos;ll receive an email when your account is approved.
          </p>
          <p className="text-sm text-[#6b6b7b]">
            Questions? Contact us at{' '}
            <a href="mailto:info@agentpilot.us" className="text-[#0066FF] hover:underline">
              info@agentpilot.us
            </a>
          </p>
          <div className="mt-8 pt-6 border-t border-[#e2e1df]">
            <Link
              href="/api/auth/signout"
              className="text-sm text-[#6b6b7b] hover:text-[#0a0a0f] transition-colors"
            >
              Sign out
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

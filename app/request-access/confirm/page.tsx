import Link from 'next/link';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export default function RequestAccessConfirmPage() {
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
          <h1 className="text-2xl font-semibold text-[#0a0a0f] mb-2">You&apos;re on the waitlist</h1>
          <p className="text-[#6b6b7b] mb-6">
            We&apos;ll review your request and email you when your account is approved. You can sign in with Google or email once you receive your invite.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-[#0066FF] hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

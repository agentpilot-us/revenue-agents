import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import { RequestAccessForm } from './RequestAccessForm';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export default function RequestAccessPage() {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-[#faf9f7] ${dmSans.variable}`}
      style={{ fontFamily: 'var(--font-dm-sans), -apple-system, sans-serif' } as React.CSSProperties}
    >
      <div className="w-full max-w-md px-6">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3 text-[#0a0a0f] hover:opacity-80 transition-opacity">
            <img src="/agentpilot-logo.png" alt="" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold">AgentPilot</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e1df] p-8">
          <h1 className="text-2xl font-semibold text-[#0a0a0f] mb-2 text-center">Request access</h1>
          <p className="text-sm text-[#6b6b7b] text-center mb-8">
            Get early access to AgentPilot. We&apos;ll review your request and send you an invite.
          </p>
          <RequestAccessForm />
          <div className="mt-8 pt-6 border-t border-[#e2e1df] text-center">
            <Link href="/login" className="text-sm text-[#6b6b7b] hover:text-[#0a0a0f] transition-colors">
              Already have an invite? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

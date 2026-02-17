import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signInAction } from '@/lib/actions';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // If already authenticated, redirect to dashboard or callbackUrl
  if (session) {
    redirect(params.callbackUrl || '/dashboard');
  }

  const callbackUrl = params.callbackUrl || '/dashboard';

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-[#faf9f7] ${dmSans.variable}`}
      style={{ fontFamily: 'var(--font-dm-sans), -apple-system, sans-serif' } as React.CSSProperties}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 text-[#0a0a0f] hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0066FF] via-[#00c2ff] to-[#7c3aed] rounded-lg flex items-center justify-center">
              <LogoIcon />
            </div>
            <span className="text-xl font-bold">AgentPilot</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e1df] p-8">
          <h1 className="text-2xl font-semibold text-[#0a0a0f] mb-2 text-center">Sign in to AgentPilot</h1>
          <p className="text-sm text-[#6b6b7b] text-center mb-8">
            Continue with your Google account to access your dashboard
          </p>

          {/* Error Message */}
          {params.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                {params.error === 'OAuthSignin' && 'Error initiating sign in. Please try again.'}
                {params.error === 'OAuthCallback' && 'Error during authentication. Please try again.'}
                {params.error === 'OAuthCreateAccount' && 'Could not create account. Please try again.'}
                {params.error === 'EmailCreateAccount' && 'Could not create account. Please try again.'}
                {params.error === 'Callback' && 'Error during authentication. Please try again.'}
                {params.error === 'OAuthAccountNotLinked' &&
                  'An account with this email already exists. Please sign in with the original provider.'}
                {params.error === 'EmailSignin' && 'Check your email for the sign in link.'}
                {params.error === 'CredentialsSignin' && 'Invalid credentials. Please try again.'}
                {params.error === 'SessionRequired' && 'Please sign in to access this page.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired'].includes(
                  params.error
                ) && 'An error occurred during sign in. Please try again.'}
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <form action={signInAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-[#e2e1df] rounded-lg text-[#0a0a0f] font-medium hover:border-[#0066FF] hover:bg-[#faf9f7] transition-all duration-200 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-[#e2e1df]">
            <div className="flex flex-col items-center gap-4 text-sm">
              <Link href="/" className="text-[#6b6b7b] hover:text-[#0a0a0f] transition-colors">
                ← Back to Home
              </Link>
              <p className="text-[#6b6b7b] text-center">
                New to AgentPilot?{' '}
                <Link href="/#cta" className="text-[#0066FF] hover:underline font-medium">
                  Book a demo
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <p className="mt-6 text-xs text-center text-[#6b6b7b]">
          By continuing, you agree to AgentPilot&apos;s Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import { GoogleSignInButton } from './GoogleSignInButton';

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
                {params.error === 'Configuration' && 'Server auth is misconfigured. Ensure AUTH_SECRET is set and the server was restarted.'}
                {params.error === 'InvalidCheck' && 'Sign-in link expired or invalid. Please try again.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired', 'Configuration', 'InvalidCheck'].includes(
                  params.error
                ) && 'An error occurred during sign in. Please try again.'}
              </p>
            </div>
          )}

          {/* Google Sign In - POST required by Auth.js for OAuth (GET with provider throws Unsupported action) */}
          <GoogleSignInButton callbackUrl={callbackUrl} />

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

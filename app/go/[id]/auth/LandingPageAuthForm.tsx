'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  campaignId: string;
  companyName: string;
  companyDomain: string | null;
};

export function LandingPageAuthForm({ campaignId, companyName, companyDomain }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/go/${campaignId}/auth/request-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send verification email. Please try again.',
        });
        setLoading(false);
        return;
      }

      setMessage({
        type: 'success',
        text: data.message || 'Verification link sent! Please check your email.',
      });
      setEmail('');
    } catch (error) {
      console.error('Request magic link error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Business Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={companyDomain ? `your.name@${companyDomain}` : 'your.email@company.com'}
          required
          disabled={loading}
          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {companyDomain && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Your email domain must match <span className="font-medium">@{companyDomain}</span>
          </p>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Verification Link'}
      </button>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
        We'll send you a secure link to verify your email address. The link expires in 15 minutes.
      </p>
    </form>
  );
}

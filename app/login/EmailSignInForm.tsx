'use client';

import { useState } from 'react';

const buttonClass =
  'w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-[#e2e1df] rounded-lg text-[#0a0a0f] font-medium hover:border-[#0066FF] hover:bg-[#faf9f7] transition-all duration-200 shadow-sm';

export function EmailSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const form = new FormData();
      form.set('email', email.trim());
      form.set('callbackUrl', callbackUrl);
      form.set('csrfToken', csrfToken);
      const res = await fetch('/api/auth/signin/resend', {
        method: 'POST',
        body: form,
      });
      if (res.ok) setSent(true);
      else {
        const data = (await res.json()) as { url?: string };
        if (data?.url) window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-[#6b6b7b] text-center py-2">
        Check your email for the sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full px-4 py-3 rounded-lg border-2 border-[#e2e1df] bg-white text-[#0a0a0f] placeholder:text-[#9ca3af] focus:outline-none focus:ring-0 focus:border-[#0066FF]"
      />
      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? 'Sending link…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf');
  const d = await res.json();
  return d.csrfToken ?? d.token ?? '';
}

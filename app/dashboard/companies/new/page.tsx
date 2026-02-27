'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResearchCompleteScreen, type EnrichmentResult } from '@/app/components/company/ResearchCompleteScreen';

type Status = 'form' | 'researching' | 'complete';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90000;

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState<Status>('form');
  const [error, setError] = useState('');
  const [researchResults, setResearchResults] = useState<EnrichmentResult | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('researching');
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || undefined,
          industry: industry.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create company');
        setStatus('form');
        return;
      }

      const companyId = data.company?.id;
      if (!companyId) {
        setError('Invalid response from server');
        setStatus('form');
        return;
      }

      // If no background research (e.g. no EXA_API_KEY), redirect to intelligence
      if (data.status !== 'researching') {
        router.push(`/dashboard/companies/${companyId}/intelligence`);
        router.refresh();
        return;
      }

      // Poll enrichment-status until complete or timeout
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      const poll = async () => {
        try {
          const check = await fetch(`/api/companies/${companyId}/enrichment-status`);
          const payload = await check.json();
          if (!check.ok) return;

          if (payload.complete) {
            setResearchResults({
              companyId: payload.companyId,
              companyName: payload.companyName,
              signalsFound: payload.signalsFound ?? 0,
              contactsFound: payload.contactsFound ?? 0,
              employeeCount: payload.employeeCount ?? null,
              signals: payload.signals ?? [],
              topContacts: payload.topContacts ?? [],
            });
            setStatus('complete');
            if (pollTimeoutRef.current) {
              clearTimeout(pollTimeoutRef.current);
              pollTimeoutRef.current = null;
            }
            router.refresh();
            return;
          }
        } catch {
          // ignore fetch errors, keep polling
        }

        if (Date.now() < deadline) {
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          // Timeout: still show account, redirect to intelligence
          setStatus('form');
          router.push(`/dashboard/companies/${companyId}/intelligence`);
          router.refresh();
        }
      };

      pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch {
      setError('Something went wrong');
      setStatus('form');
    }
  }

  if (status === 'researching') {
    return (
      <div className="max-w-lg mx-auto py-8 px-6 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="animate-pulse text-4xl mb-4">🔄</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Setting up {name || 'your company'}…
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Company added to your pipeline
          </p>
          <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 max-w-sm mx-auto">
            <li className="flex items-center gap-2">
              <span className="text-amber-500">⏳</span>
              AI researching (news, signals, decision makers)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500">⏳</span>
              Finding key contacts
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-6">
            This usually takes 30–45 seconds…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'complete' && researchResults) {
    return <ResearchCompleteScreen results={researchResults} />;
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-6 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link href="/dashboard/companies" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 inline-block">
        ← Back to Target companies
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Add target company</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Company name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="e.g. Acme Inc."
          />
        </div>
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Domain (optional)
          </label>
          <input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="e.g. acme.com"
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Industry (optional)
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="e.g. Healthcare, SaaS"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={status === 'researching'}
            className="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {status === 'researching' ? 'Creating…' : 'Create company'}
          </button>
          <Link
            href="/dashboard/companies"
            className="rounded-lg border border-gray-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

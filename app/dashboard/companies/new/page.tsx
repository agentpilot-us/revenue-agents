'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [accountType, setAccountType] = useState('new_logo');
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
          accountType,
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
        router.push(`/dashboard/companies/${companyId}?tab=overview`);
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
          router.push(`/dashboard/companies/${companyId}?tab=overview`);
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
    return <ResearchingScreen companyName={name} />;
  }

  if (status === 'complete' && researchResults) {
    return <ResearchCompleteScreen results={researchResults} />;
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-6 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link href="/dashboard/companies" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 inline-block">
        ← Back to Target Accounts
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
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Account type
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'new_logo', label: 'New Logo' },
              { value: 'customer', label: 'Existing Customer' },
              { value: 'partner', label: 'Partner' },
              { value: 'prospect', label: 'Prospect' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccountType(opt.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  accountType === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                    : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-zinc-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            Create company
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

/* ─── Researching loading screen ─────────────────────────────────────────── */

const RESEARCH_STEPS = [
  { label: 'Scanning news & press releases', icon: 'newspaper' },
  { label: 'Analyzing market signals', icon: 'signal' },
  { label: 'Identifying decision makers', icon: 'users' },
  { label: 'Finding key contacts', icon: 'contact' },
  { label: 'Building account intelligence', icon: 'brain' },
] as const;

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const cls = `w-4 h-4 ${active ? 'text-blue-400' : 'text-zinc-500'}`;
  switch (type) {
    case 'newspaper':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>;
    case 'signal':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 20 .73-2.2A9.96 9.96 0 0 1 2 14C2 8.48 6.48 4 12 4s10 4.48 10 10-4.48 10-10 10a9.96 9.96 0 0 1-3.8-.73L2 20Z"/><path d="M12 12v.01"/></svg>;
    case 'users':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'contact':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'brain':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.11 6.25 5.08 7.39A3 3 0 0 0 12 20a3 3 0 0 0 2.92-2.61C17.89 16.25 20 13.37 20 10a8 8 0 0 0-8-8Z"/><path d="M12 2v8"/><path d="m4.93 10.93 5.66-2.83"/><path d="m19.07 10.93-5.66-2.83"/></svg>;
    default:
      return null;
  }
}

function ResearchingScreen({ companyName }: { companyName: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) =>
        prev < RESEARCH_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, 6000);
    const tickInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const displayName = companyName || 'your company';

  const progressPct = useMemo(
    () => Math.min(((activeStep + 1) / RESEARCH_STEPS.length) * 100, 95),
    [activeStep],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* Outer card */}
        <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-blue-500/5 overflow-hidden">
          {/* Top gradient accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

          <div className="px-8 pt-10 pb-8">
            {/* Animated logo / spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-400 animate-spin"
                    style={{ animationDuration: '3s' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="m4.93 4.93 2.83 2.83" />
                    <path d="m16.24 16.24 2.83 2.83" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                    <path d="m4.93 19.07 2.83-2.83" />
                    <path d="m16.24 4.93 2.83 2.83" />
                  </svg>
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 animate-pulse" style={{ animationDuration: '2s' }} />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-foreground tracking-tight">
                Setting up {displayName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Building your account intelligence profile
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1">
              {RESEARCH_STEPS.map((step, i) => {
                const isDone = i < activeStep;
                const isActive = i === activeStep;
                const isPending = i > activeStep;

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-500 ${
                      isActive
                        ? 'bg-blue-500/8 border border-blue-500/15'
                        : isDone
                          ? 'opacity-60'
                          : 'opacity-30'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isDone ? (
                        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : isActive ? (
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      )}
                    </div>

                    {/* Icon */}
                    <StepIcon type={step.icon} active={isActive || isDone} />

                    {/* Label */}
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        isActive
                          ? 'text-foreground font-medium'
                          : isDone
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60'
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Active spinner */}
                    {isActive && (
                      <div className="ml-auto">
                        <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-8 py-4 bg-card/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Typically completes in 30–45 seconds
              </p>
              <span className="text-xs tabular-nums text-muted-foreground/60">
                {elapsed}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

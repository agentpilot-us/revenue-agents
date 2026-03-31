'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MY_COMPANY_SETUP_PROGRESS_INVALIDATE } from '@/lib/my-company/setup-progress-events';

type ValidateCheck = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail?: string;
  fixHref?: string;
};

type StepStatus = 'complete' | 'partial' | 'empty';

type SetupStep = {
  id: string;
  label: string;
  status: StepStatus;
  href: string;
  detail?: string;
  count?: number;
};

const STATUS_STYLES: Record<
  StepStatus,
  { dot: string; label: string }
> = {
  complete: {
    dot: 'bg-emerald-500',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  partial: {
    dot: 'bg-amber-500',
    label: 'text-amber-600 dark:text-amber-400',
  },
  empty: {
    dot: 'bg-muted-foreground/30',
    label: 'text-muted-foreground',
  },
};

export function SetupProgressCard() {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [summary, setSummary] = useState<{
    complete: number;
    partial: number;
    empty: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [validateOpen, setValidateOpen] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateChecks, setValidateChecks] = useState<ValidateCheck[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-company/setup-status');
      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onInvalidate = () => {
      void load();
    };
    window.addEventListener(MY_COMPANY_SETUP_PROGRESS_INVALIDATE, onInvalidate);
    return () => window.removeEventListener(MY_COMPANY_SETUP_PROGRESS_INVALIDATE, onInvalidate);
  }, [load]);

  const runValidate = async () => {
    setValidateLoading(true);
    setValidateOpen(true);
    try {
      const res = await fetch('/api/my-company/validate-setup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setValidateChecks(data.checks ?? []);
      } else {
        setValidateChecks([]);
      }
    } finally {
      setValidateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
        Loading setup progress…
      </div>
    );
  }

  if (!summary || steps.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Setup progress</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.complete}/{summary.total} complete
            {summary.partial > 0 ? ` · ${summary.partial} in progress` : ''}
            {summary.empty > 0 ? ` · ${summary.empty} not started` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runValidate()}
          className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20 hover:bg-primary/15 shrink-0"
        >
          Validate setup
        </button>
      </div>

      {validateOpen && (
        <div className="mb-4 rounded-lg border border-border bg-background/80 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Automated checks</p>
          {validateLoading ? (
            <p className="text-xs text-muted-foreground">Running…</p>
          ) : validateChecks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No results.</p>
          ) : (
            <ul className="space-y-2">
              {validateChecks.map((c) => (
                <li key={c.id} className="text-xs flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
                  <span
                    className={
                      c.status === 'pass' ? 'text-emerald-600 dark:text-emerald-400'
                      : c.status === 'fail' ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    [{c.status}]
                  </span>
                  <span className="font-medium text-foreground">{c.label}</span>
                  {c.detail && (
                    <span className="text-muted-foreground w-full sm:w-auto">{c.detail}</span>
                  )}
                  {c.fixHref && (
                    <Link href={c.fixHref} className="text-primary hover:underline">
                      Fix →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setValidateOpen(false)}
          >
            Dismiss
          </button>
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {steps.map((s) => {
          const st = STATUS_STYLES[s.status];
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                className="flex items-start gap-2 rounded-lg border border-border/80 bg-background/50 px-2.5 py-2 text-left hover:border-primary/30 transition-colors"
              >
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${st.dot}`}
                  title={s.status}
                />
                <span className="min-w-0">
                  <span className={`text-xs font-medium block ${st.label}`}>{s.label}</span>
                  {s.count !== undefined && (
                    <span className="text-[10px] text-muted-foreground">Count: {s.count}</span>
                  )}
                  {s.detail && (
                    <span className="text-[10px] text-muted-foreground block line-clamp-2">
                      {s.detail}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

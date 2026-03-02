'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { HotSignal } from '@/lib/dashboard';
import { dash } from '@/app/dashboard/dashboard-classes';

type HotSignalsProps = { signals: HotSignal[] };

const signalAccentColor: Record<string, string> = {
  red: 'var(--ap-red)',
  amber: 'var(--ap-amber)',
  green: 'var(--ap-green)',
};

export function HotSignals({ signals }: HotSignalsProps) {
  const router = useRouter();
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleDismiss = async (signalId: string) => {
    setDismissingId(signalId);
    try {
      const res = await fetch(`/api/signals/${signalId}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' }),
      });
      if (res.ok) router.refresh();
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <section className={dash.card}>
      <div className={dash.sectionHeader}>
        <h2 className={dash.sectionTitle}>Hot Signals</h2>
        {signals.length > 0 && (
          <span className={dash.sectionBadge}>{signals.length}</span>
        )}
      </div>

      {signals.length === 0 ? (
        <p className={dash.emptyStateText}>No signals in the last 48 hours.</p>
      ) : (
        <div className="space-y-2.5">
          {signals.slice(0, 5).map((s) => (
            <div
              key={s.signalId ?? `${s.companyId}-${s.date}-${s.headline}`}
              className={dash.signalCard}
              style={{ borderLeftColor: signalAccentColor[s.color] ?? 'var(--ap-blue)' }}
            >
              <div className="flex items-start gap-2.5">
                {/* Color dot */}
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: signalAccentColor[s.color] ?? 'var(--ap-blue)' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  {/* Headline */}
                  <p className="text-[13px] font-semibold text-[var(--ap-text-primary)] leading-snug">
                    {s.headline}
                  </p>

                  {/* Description */}
                  {s.description && (
                    <p className="text-[11px] text-[var(--ap-text-faint)] mt-1 leading-relaxed">
                      {s.description}
                    </p>
                  )}

                  {/* Division / Company name */}
                  {(s.divisionName || s.companyName) && (
                    <p className="text-[11px] text-[var(--ap-text-muted)] mt-1 flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: signalAccentColor[s.color] ?? 'var(--ap-blue)' }}
                      />
                      {s.divisionName ?? s.companyName}
                    </p>
                  )}

                  {/* CTAs */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Link href={s.ctaHref} className={dash.btnPrimary}>
                      {s.ctaLabel}
                    </Link>

                    {s.secondaryCtaLabel && s.secondaryCtaHref && (
                      <Link href={s.secondaryCtaHref} className={dash.btnSecondary}>
                        {s.secondaryCtaLabel}
                      </Link>
                    )}

                    {s.signalId && (
                      <button
                        type="button"
                        onClick={() => handleDismiss(s.signalId!)}
                        disabled={dismissingId === s.signalId}
                        className={`${dash.btnGhost} ml-auto`}
                      >
                        {dismissingId === s.signalId ? '…' : 'Dismiss'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NextBestActionItem } from '@/lib/dashboard';
import { dash } from '@/app/dashboard/dashboard-classes';

type NextBestActionProps = { actions: NextBestActionItem[] };

const stageColorMap: Record<string, string> = {
  'Active Program': 'var(--ap-stage-active)',
  'Expansion Target': 'var(--ap-stage-expansion)',
  'Strategic Platform': 'var(--ap-stage-strategic)',
  'Emerging': 'var(--ap-stage-emerging)',
  'POC': 'var(--ap-stage-poc)',
};

function CreatePlaceholderButton({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/roadmap/targets/${targetId}/sales-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_with_content' }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${dash.btnPrimary} disabled:opacity-50`}
    >
      {loading ? 'Creating…' : label}
    </button>
  );
}

function NBACardFull({ action }: { action: NextBestActionItem }) {
  const accentColor = stageColorMap[action.stage ?? ''] ?? 'var(--ap-blue)';

  return (
    <div
      className={dash.nbaCard}
      style={{ borderLeftColor: accentColor }}
    >
      {/* Stage + urgency header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={dash.stageBadge}
          style={{ color: accentColor }}
        >
          {action.stage}
        </span>
        <span className="ml-auto text-[10px] font-medium text-[var(--ap-text-faint)]">
          {action.urgency ?? ''}
        </span>
      </div>

      {/* Division name */}
      <p className="text-[13px] font-bold text-[var(--ap-text-primary)] mb-1">
        {action.departmentName}
      </p>

      {/* Situation / recommendation */}
      {action.situationSummary && (
        <p className="text-[12px] text-[var(--ap-text-secondary)] leading-relaxed mb-1">
          {action.situationSummary}
        </p>
      )}
      {action.recommendation && (
        <p className="text-[11px] text-[var(--ap-text-muted)] leading-relaxed mb-1">
          {action.recommendation}
        </p>
      )}

      {/* Objective line */}
      {action.objectiveLine && (
        <p className="text-[10px] text-[var(--ap-amber)] font-medium mt-1 mb-2">
          ↗ {action.objectiveLine}
        </p>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-2 mt-2">
        {action.ctaLabel === 'Create Sales Page Placeholder' && action.divisionTargetId ? (
          <CreatePlaceholderButton
            targetId={action.divisionTargetId}
            label={action.ctaLabel}
          />
        ) : (
          <Link href={action.ctaHref} className={dash.btnPrimary}>
            {action.ctaLabel}
          </Link>
        )}
        {action.secondaryCtaLabel && action.secondaryCtaHref && (
          <Link href={action.secondaryCtaHref} className={dash.btnSecondary}>
            {action.secondaryCtaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function NBACardCompact({ action }: { action: NextBestActionItem }) {
  const accentColor = stageColorMap[action.stage ?? ''] ?? 'var(--ap-blue)';
  const isRoadmap = action.stage != null;

  return (
    <div
      className={dash.nbaCard}
      style={{ borderLeftColor: accentColor }}
    >
      {isRoadmap ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-[var(--ap-text-muted)]" style={{ color: accentColor }}>
              {action.stage}
            </span>
            <span className="text-[10px] text-[var(--ap-text-faint)]">·</span>
            <span className="text-[11px] font-medium text-[var(--ap-text-secondary)]">
              {action.departmentName}
            </span>
          </div>
          <p className="text-[11px] text-[var(--ap-text-muted)] leading-relaxed">
            {action.situationSummary ?? action.label}
          </p>
        </>
      ) : (
        <p className="text-[12px] text-[var(--ap-text-secondary)]">{action.label}</p>
      )}

      <div className="mt-2 flex gap-2">
        {action.ctaLabel === 'Create Sales Page Placeholder' && action.divisionTargetId ? (
          <CreatePlaceholderButton
            targetId={action.divisionTargetId}
            label={action.ctaLabel}
          />
        ) : (
          <Link href={action.ctaHref} className={dash.btnSecondary}>
            {action.ctaLabel}
          </Link>
        )}
        {action.secondaryCtaHref && (
          <Link
            href={action.secondaryCtaHref}
            className={dash.btnGhost}
          >
            {action.secondaryCtaLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function NextBestAction({ actions }: NextBestActionProps) {
  const top = actions[0];
  const rest = actions.slice(1, 4);

  return (
    <section className={dash.card}>
      <div className={dash.sectionHeader}>
        <h2 className={dash.sectionTitle}>Recommended Plans</h2>
        <span className={dash.sectionSubtitle}>Prioritized by objective</span>
      </div>

      {!top ? (
        <p className={dash.emptyStateText}>No recommendations right now.</p>
      ) : (
        <div className="space-y-0">
          <NBACardFull action={top} />
          {rest.map((a) => (
            <NBACardCompact
              key={`${a.companyId}-${a.departmentId}-${a.ctaLabel}-${a.divisionTargetId ?? ''}`}
              action={a}
            />
          ))}
        </div>
      )}
    </section>
  );
}

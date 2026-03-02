'use client';

import Link from 'next/link';
import type { DivisionCard } from '@/lib/dashboard/division-radar';
import { buildContentUrl } from '@/lib/urls/content';
import { dash } from '@/app/dashboard/dashboard-classes';

function formatLastSignal(date: Date | null): string {
  if (!date) return 'None';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
  return d.toLocaleDateString();
}

const stageMap: Record<string, { icon: string; color: string }> = {
  'Active Program': { icon: '●', color: 'var(--ap-stage-active)' },
  'Expansion Target': { icon: '◎', color: 'var(--ap-stage-expansion)' },
  'Strategic Platform': { icon: '★', color: 'var(--ap-stage-strategic)' },
  'Emerging': { icon: '◦', color: 'var(--ap-stage-emerging)' },
};

type Props = { division: DivisionCard };

export function DivisionRadarCard({ division }: Props) {
  const stage = stageMap[division.stage] ?? { icon: '·', color: 'var(--ap-text-muted)' };
  const coverageColor =
    division.coveragePct >= 60
      ? 'var(--ap-coverage-good)'
      : division.coveragePct >= 30
        ? 'var(--ap-coverage-warning)'
        : 'var(--ap-coverage-critical)';

  const salesPageLabel =
    division.salesPageStatus === 'live'
      ? 'LIVE'
      : division.salesPageStatus === 'placeholder'
        ? 'PLACEHOLDER'
        : 'Not started';

  const salesPageColor =
    division.salesPageStatus === 'live'
      ? 'var(--ap-green)'
      : division.salesPageStatus === 'placeholder'
        ? 'var(--ap-amber)'
        : 'var(--ap-text-faint)';

  const isExpansion = division.stage === 'Expansion Target';

  return (
    <div className={dash.divisionCard}>
      {/* Expansion ribbon */}
      {isExpansion && (
        <div className={dash.expansionRibbon}>EXPANSION</div>
      )}

      {/* Stage badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={dash.stageBadge} style={{ color: stage.color }}>
          <span className="text-[11px]">{stage.icon}</span> {division.stage}
        </span>
      </div>

      {/* Division name */}
      <p className="text-[14px] font-bold text-[var(--ap-text-primary)] leading-tight mb-3 min-h-[38px]">
        {division.name}
      </p>

      {/* Contacts + coverage bar */}
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[var(--ap-text-secondary)]">
          Contacts: {division.contactCount} identified
        </span>
        <span className="font-semibold" style={{ color: coverageColor }}>
          {division.coveragePct}%
        </span>
      </div>
      <div className={dash.progressTrack}>
        <div
          className={dash.progressFill}
          style={{ width: `${division.coveragePct}%`, background: coverageColor }}
        />
      </div>

      {/* Sales page + Last signal */}
      <div className="mt-2.5 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--ap-text-muted)]">Sales page</span>
          <span
            className="font-semibold text-[10px] tracking-[0.04em]"
            style={{ color: salesPageColor }}
          >
            {salesPageLabel}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--ap-text-muted)]">Last signal</span>
          <span className="text-[var(--ap-text-secondary)]">
            {formatLastSignal(division.lastSignalAt)}
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={
            division.companyDepartmentId
              ? `/dashboard/companies/${division.companyId}?tab=overview&division=${division.companyDepartmentId}`
              : `/dashboard/companies/${division.companyId}?tab=overview`
          }
          className={dash.btnSecondary}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {division.contactCount === 0 ? 'Research Division' : 'View Division →'}
        </Link>

        {division.salesPageStatus === 'none' && division.contactCount > 0 && (
          <Link
            href={buildContentUrl({
              companyId: division.companyId,
              divisionId: division.companyDepartmentId ?? undefined,
              channel: 'sales_page',
            })}
            className={dash.btnGhost}
          >
            Create Page
          </Link>
        )}

        {division.salesPageStatus === 'none' && division.contactCount === 0 && (
          <Link
            href={
              division.companyDepartmentId
                ? `/dashboard/companies/${division.companyId}?tab=contacts&division=${division.companyDepartmentId}&action=find`
                : `/dashboard/companies/${division.companyId}?tab=contacts&action=find`
            }
            className={dash.btnGhost}
          >
            Research →
          </Link>
        )}

        {division.salesPageStatus === 'placeholder' && division.salesPageSlug && (
          <Link href={`/go/${division.salesPageSlug}`} className={dash.btnGhost}>
            View Placeholder →
          </Link>
        )}

        {division.salesPageStatus === 'live' && division.salesPageSlug && (
          <Link href={`/go/${division.salesPageSlug}`} className={dash.btnGhost}>
            View Page →
          </Link>
        )}
      </div>
    </div>
  );
}

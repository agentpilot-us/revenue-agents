import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

type NextBestActionItem = {
  companyId: string;
  departmentId?: string | null;
  departmentName?: string;
  playId?: string | null;
  label: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  situationSummary?: string;
  recommendation?: string;
  objectiveLine?: string;
  urgency?: string;
  stage?: string | null;
  divisionTargetId?: string | null;
};

type LaunchPlaysProps = { actions: NextBestActionItem[] };

export function LaunchPlays({ actions }: LaunchPlaysProps) {
  const top = actions.filter((a) => a.playId).slice(0, 2);

  return (
    <section className={dash.cardGradient}>
      <h2 className={`${dash.sectionTitle} mb-1`} style={{ color: 'var(--ap-blue-light)' }}>
        Launch
      </h2>
      <p className="text-[11px] text-[var(--ap-text-faint)] mb-3">
        Recommended for right now
      </p>

      {top.length === 0 ? (
        <Link
          href="/chat?play=expansion"
          className={dash.btnSecondary}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Account Expansion
        </Link>
      ) : (
        <div className="space-y-2.5">
          {top.map((a) => (
            <div key={`${a.companyId}-${a.departmentId}-${a.playId}`}>
              <p className="text-[12px] text-[var(--ap-text-primary)] font-medium mb-1.5">
                {a.label}
              </p>
              <Link href={a.ctaHref} className={dash.btnPrimary}>
                {a.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

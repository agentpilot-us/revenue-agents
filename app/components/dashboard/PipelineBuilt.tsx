import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

function formatRange(min: number, max: number): string {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(0)}M` : `$${(n / 1000).toFixed(0)}K`;
  return `${fmt(min)} – ${fmt(max)} potential`;
}

type CompanyPipeline = {
  id: string;
  name: string;
  pipeline: number;
  potential?: { min: number; max: number } | null;
};

type PipelineBuiltProps = { companies: CompanyPipeline[] };

export function PipelineBuilt({ companies }: PipelineBuiltProps) {
  const totalPipeline = companies.reduce((s, c) => s + c.pipeline, 0);
  const totalPotential = companies.reduce(
    (acc, c) => {
      if (c.potential) {
        acc.min += c.potential.min;
        acc.max += c.potential.max;
      }
      return acc;
    },
    { min: 0, max: 0 }
  );

  return (
    <section className={dash.cardTight}>
      <h2 className={`${dash.sectionTitle} mb-3`}>Pipeline Built</h2>

      {companies.length === 0 ? (
        <p className={dash.emptyStateText}>No accounts yet.</p>
      ) : (
        <>
          {/* Total headline */}
          {(totalPipeline > 0 || totalPotential.max > 0) && (
            <div className="mb-3">
              <div className="text-xl font-bold text-[var(--ap-text-primary)]">
                {totalPipeline > 0
                  ? `$${(totalPipeline / 1_000_000).toFixed(0)}M`
                  : formatRange(totalPotential.min, totalPotential.max)}
              </div>
              <div className="text-[10px] text-[var(--ap-text-faint)] mt-0.5">
                across {companies.length} account{companies.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Company list */}
          <div className="space-y-0">
            {companies.map((c) => (
              <div key={c.id} className={dash.momentumRow}>
                <Link
                  href={`/dashboard/companies/${c.id}`}
                  className="text-[12px] text-[var(--ap-text-secondary)] hover:text-[var(--ap-blue)] transition-colors truncate flex-1"
                >
                  {c.name}
                </Link>
                <span className="text-[12px] tabular-nums font-medium text-[var(--ap-text-muted)] shrink-0 ml-2">
                  {c.pipeline > 0
                    ? `$${(c.pipeline / 1000).toFixed(0)}K`
                    : c.potential
                      ? formatRange(c.potential.min, c.potential.max)
                      : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

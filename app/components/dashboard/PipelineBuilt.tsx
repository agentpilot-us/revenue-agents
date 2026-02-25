import Link from 'next/link';

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
  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Pipeline built
      </h2>
      {companies.length === 0 ? (
        <p className="text-sm text-slate-500">No accounts yet.</p>
      ) : (
        <ul className="space-y-2">
          {companies.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
              <Link
                href={`/dashboard/companies/${c.id}`}
                className="text-sm text-slate-200 hover:text-amber-400"
              >
                {c.name}
              </Link>
              {c.pipeline > 0 ? (
                <span className="text-sm tabular-nums text-slate-400">
                  ${(c.pipeline / 1000).toFixed(0)}K
                </span>
              ) : c.potential ? (
                <span className="text-sm tabular-nums text-slate-400">
                  {formatRange(c.potential.min, c.potential.max)}
                </span>
              ) : (
                <Link
                  href={`/dashboard/companies/${c.id}`}
                  className="text-sm text-amber-400/90 hover:text-amber-400"
                >
                  Research complete — calculate →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

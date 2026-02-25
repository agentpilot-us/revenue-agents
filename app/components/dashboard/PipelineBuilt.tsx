import Link from 'next/link';

type CompanyPipeline = { id: string; name: string; pipeline: number };

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
            <li key={c.id}>
              <Link
                href={`/dashboard/companies/${c.id}`}
                className="text-sm text-slate-200 hover:text-amber-400"
              >
                {c.name}
              </Link>
              <span className="ml-2 text-sm tabular-nums text-slate-400">
                {c.pipeline > 0
                  ? `$${(c.pipeline / 1000).toFixed(0)}K`
                  : 'Calculating…'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

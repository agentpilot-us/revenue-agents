'use client';

type ComparisonRow = {
  label: string;
  without: string;
  with: string;
};

type Props = {
  title?: string;
  withoutProduct: string;
  withProduct: string;
  rows?: ComparisonRow[];
};

export function ComparisonTable({ title, withoutProduct, withProduct, rows }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <section className="py-2">
        {title && (
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-5 text-center">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/60 p-5">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Without
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {withoutProduct}
            </p>
          </div>
          <div className="rounded-xl border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-900/10 p-5">
            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
              With
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {withProduct}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2">
      {title && (
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-5 text-center">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-800">
              <th className="text-left p-3 font-medium text-zinc-600 dark:text-zinc-400" />
              <th className="text-left p-3 font-semibold text-zinc-500 dark:text-zinc-400">
                {withoutProduct}
              </th>
              <th className="text-left p-3 font-semibold text-amber-600 dark:text-amber-400">
                {withProduct}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {rows.map((row, i) => (
              <tr key={i} className="bg-white dark:bg-zinc-900">
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {row.label}
                </td>
                <td className="p-3 text-zinc-500 dark:text-zinc-400">
                  {row.without}
                </td>
                <td className="p-3 text-zinc-800 dark:text-zinc-200 font-medium">
                  {row.with}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

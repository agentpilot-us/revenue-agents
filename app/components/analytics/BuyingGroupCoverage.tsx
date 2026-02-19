'use client';

interface BuyingGroupCoverageData {
  type: string;
  typeLabel: string;
  accountsWithContacts: number;
  totalAccounts: number;
  coverage: number;
}

interface Props {
  data: BuyingGroupCoverageData[];
}

export function BuyingGroupCoverage({ data }: Props) {
  return (
    <Card className="p-6 bg-zinc-800/50 border-slate-700">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Buying Group Coverage</h2>
        <p className="text-sm text-slate-400">
          Percentage of accounts with contacts in each buying group type
        </p>
      </div>

      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.type}
              className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-200">{item.typeLabel}</div>
                <div className="text-lg font-semibold text-amber-400">
                  {item.coverage.toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${item.coverage}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {item.accountsWithContacts} / {item.totalAccounts} accounts
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No buying group coverage data available</p>
      )}
    </div>
  );
}

'use client';

import { dash } from '@/app/dashboard/dashboard-classes';

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
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Buying Group Coverage</h2>
        <p className="text-sm text-muted-foreground">
          Percentage of accounts with contacts in each buying group type
        </p>
      </div>

      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.type}
              className={dash.cardTight}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-foreground">{item.typeLabel}</div>
                <div className="text-lg font-semibold text-primary">
                  {item.coverage.toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${item.coverage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.accountsWithContacts} / {item.totalAccounts} accounts
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No buying group coverage data available</p>
      )}
    </div>
  );
}

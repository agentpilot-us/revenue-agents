'use client';

import Link from 'next/link';

interface NewContactsData {
  total: number;
  byWeek: Array<{
    week: string;
    count: number;
    contacts: Array<{
      id: string;
      name: string;
      accountId: string;
      accountName: string;
      buyingGroupId: string | null;
      buyingGroupName: string | null;
    }>;
  }>;
  byAccount: Array<{
    accountId: string;
    accountName: string;
    count: number;
  }>;
  byBuyingGroup: Array<{
    buyingGroupId: string | null;
    buyingGroupName: string;
    count: number;
  }>;
}

interface Props {
  data: NewContactsData;
}

export function NewContactsMetric({ data }: Props) {
  return (
    <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">New Contacts Added</h2>
        <p className="text-sm text-slate-400">
          Total: <span className="font-medium text-amber-400">{data.total}</span> contacts
        </p>
      </div>

      <div className="space-y-6">
        {/* By Week */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">By Week</h3>
          {data.byWeek.length > 0 ? (
            <div className="space-y-2">
              {data.byWeek.map((week) => (
                <div
                  key={week.week}
                  className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-slate-700"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-200">{week.week}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {week.contacts.length} contact{week.contacts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-amber-400">{week.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No contacts added in this period</p>
          )}
        </div>

        {/* By Account */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">By Account</h3>
          {data.byAccount.length > 0 ? (
            <div className="space-y-2">
              {data.byAccount.map((account) => (
                <Link
                  key={account.accountId}
                  href={`/dashboard/companies/${account.accountId}`}
                  className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-200">{account.accountName}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {account.count} contact{account.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-amber-400">{account.count}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No contacts by account</p>
          )}
        </div>

        {/* By Buying Group */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">By Buying Group</h3>
          {data.byBuyingGroup.length > 0 ? (
            <div className="space-y-2">
              {data.byBuyingGroup.map((group, idx) => (
                <div
                  key={group.buyingGroupId || `unassigned-${idx}`}
                  className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-slate-700"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-200">
                      {group.buyingGroupName}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {group.count} contact{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-amber-400">{group.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No contacts by buying group</p>
          )}
        </div>
      </div>
    </div>
  );
}

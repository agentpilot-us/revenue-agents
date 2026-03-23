'use client';

import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

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
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>New Contacts Added</h2>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-primary">{data.total}</span> contacts
        </p>
      </div>

      <div className="space-y-6">
        {/* By Week */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">By Week</h3>
          {data.byWeek.length > 0 ? (
            <div className="space-y-2">
              {data.byWeek.map((week) => (
                <div
                  key={week.week}
                  className={`flex items-center justify-between p-3 ${dash.cardTight}`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{week.week}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {week.contacts.length} contact{week.contacts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-primary">{week.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts added in this period</p>
          )}
        </div>

        {/* By Account */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">By Account</h3>
          {data.byAccount.length > 0 ? (
            <div className="space-y-2">
              {data.byAccount.map((account) => (
                <Link
                  key={account.accountId}
                  href={`/dashboard/companies/${account.accountId}`}
                  className={`flex items-center justify-between p-3 ${dash.cardTight} hover:bg-muted/50 transition-colors`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{account.accountName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {account.count} contact{account.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-primary">{account.count}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts by account</p>
          )}
        </div>

        {/* By Buying Group */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">By Buying Group</h3>
          {data.byBuyingGroup.length > 0 ? (
            <div className="space-y-2">
              {data.byBuyingGroup.map((group, idx) => (
                <div
                  key={group.buyingGroupId || `unassigned-${idx}`}
                  className={`flex items-center justify-between p-3 ${dash.cardTight}`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {group.buyingGroupName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {group.count} contact{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-primary">{group.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts by buying group</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { dash } from '@/app/dashboard/dashboard-classes';

interface ContactRow {
  contactId: string;
  contactName: string;
  title: string | null;
  companyId: string;
  companyName: string;
  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  isResponsive: boolean;
  isDormant: boolean;
  flags: string[];
}

interface Props {
  data: ContactRow[];
}

type SortField = 'daysSinceLastTouch' | 'emailsSent' | 'emailsOpened' | 'emailsReplied';

const FLAG_STYLES: Record<string, { label: string; color: string }> = {
  over_emailed: { label: 'Over-emailed', color: 'text-destructive' },
  awaiting_reply: { label: 'Awaiting reply', color: 'text-amber-600 dark:text-amber-400' },
  follow_up_due: { label: 'Follow up', color: 'text-orange-600 dark:text-orange-400' },
  gone_cold: { label: 'Gone cold', color: 'text-muted-foreground' },
  hot_lead: { label: 'Hot', color: 'text-emerald-600 dark:text-emerald-400' },
};

export function ContactEngagementTable({ data }: Props) {
  const [sortBy, setSortBy] = useState<SortField>('daysSinceLastTouch');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortBy] ?? 999;
    const bVal = b[sortBy] ?? 999;
    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const arrow = (field: SortField) =>
    sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (data.length === 0) {
    return (
      <div className={dash.card}>
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Contact Engagement</h2>
        <p className="text-sm text-muted-foreground mt-2">No contacts with email activity in this period.</p>
      </div>
    );
  }

  return (
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Contact Engagement</h2>
        <p className="text-sm text-muted-foreground">
          {data.length} contacts with recent email activity, sorted by attention priority
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('daysSinceLastTouch')}
              >
                Last Touch{arrow('daysSinceLastTouch')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('emailsSent')}
              >
                Sent{arrow('emailsSent')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('emailsOpened')}
              >
                Opened{arrow('emailsOpened')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('emailsReplied')}
              >
                Replied{arrow('emailsReplied')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.contactId}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="py-2.5 px-3">
                  <div className="text-foreground font-medium">{row.contactName}</div>
                  {row.title && (
                    <div className="text-xs text-muted-foreground">{row.title}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground">{row.companyName}</td>
                <td className="py-2.5 px-3 text-right">
                  {row.daysSinceLastTouch != null ? (
                    <span
                      className={
                        row.daysSinceLastTouch >= 14
                          ? 'text-destructive'
                          : row.daysSinceLastTouch >= 7
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-foreground'
                      }
                    >
                      {row.daysSinceLastTouch}d ago
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-muted-foreground">{row.emailsSent}</td>
                <td className="py-2.5 px-3 text-right text-muted-foreground">{row.emailsOpened}</td>
                <td className="py-2.5 px-3 text-right text-muted-foreground">{row.emailsReplied}</td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {row.flags.map((flag) => {
                      const style = FLAG_STYLES[flag];
                      if (!style) return null;
                      return (
                        <span
                          key={flag}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.color} bg-muted`}
                        >
                          {style.label}
                        </span>
                      );
                    })}
                    {row.flags.length === 0 && row.isResponsive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 bg-muted">
                        Responsive
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

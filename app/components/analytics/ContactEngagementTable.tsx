'use client';

import { useState } from 'react';

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
  over_emailed: { label: 'Over-emailed', color: 'text-red-400' },
  awaiting_reply: { label: 'Awaiting reply', color: 'text-amber-400' },
  follow_up_due: { label: 'Follow up', color: 'text-orange-400' },
  gone_cold: { label: 'Gone cold', color: 'text-slate-500' },
  hot_lead: { label: 'Hot', color: 'text-green-400' },
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
      <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Contact Engagement</h2>
        <p className="text-sm text-slate-400 mt-2">No contacts with email activity in this period.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Contact Engagement</h2>
        <p className="text-sm text-slate-400">
          {data.length} contacts with recent email activity, sorted by attention priority
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Account
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => toggleSort('daysSinceLastTouch')}
              >
                Last Touch{arrow('daysSinceLastTouch')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => toggleSort('emailsSent')}
              >
                Sent{arrow('emailsSent')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => toggleSort('emailsOpened')}
              >
                Opened{arrow('emailsOpened')}
              </th>
              <th
                className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => toggleSort('emailsReplied')}
              >
                Replied{arrow('emailsReplied')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.contactId}
                className="border-b border-slate-700/50 hover:bg-zinc-700/30"
              >
                <td className="py-2.5 px-3">
                  <div className="text-slate-200 font-medium">{row.contactName}</div>
                  {row.title && (
                    <div className="text-xs text-slate-500">{row.title}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-400">{row.companyName}</td>
                <td className="py-2.5 px-3 text-right">
                  {row.daysSinceLastTouch != null ? (
                    <span
                      className={
                        row.daysSinceLastTouch >= 14
                          ? 'text-red-400'
                          : row.daysSinceLastTouch >= 7
                            ? 'text-amber-400'
                            : 'text-slate-300'
                      }
                    >
                      {row.daysSinceLastTouch}d ago
                    </span>
                  ) : (
                    <span className="text-slate-600">Never</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">{row.emailsSent}</td>
                <td className="py-2.5 px-3 text-right text-slate-300">{row.emailsOpened}</td>
                <td className="py-2.5 px-3 text-right text-slate-300">{row.emailsReplied}</td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {row.flags.map((flag) => {
                      const style = FLAG_STYLES[flag];
                      if (!style) return null;
                      return (
                        <span
                          key={flag}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.color} bg-zinc-900/50`}
                        >
                          {style.label}
                        </span>
                      );
                    })}
                    {row.flags.length === 0 && row.isResponsive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-green-400 bg-zinc-900/50">
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

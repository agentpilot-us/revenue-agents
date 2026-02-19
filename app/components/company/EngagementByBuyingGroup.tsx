'use client';

import Link from 'next/link';

export type EngagementRow = {
  id: string;
  name: string;
  contactCount: number;
  newContactCount: number;
  emailsSent: number;
  meetings: number;
  replies: number;
  invitesAccepted: number;
};

type Props = {
  companyId: string;
  companyName: string;
  rows: EngagementRow[];
};

export function EngagementByBuyingGroup({ companyId, companyName, rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No buying groups yet.</p>
        <Link
          href={`/dashboard/companies/${companyId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
        >
          Run Account Intelligence
        </Link>
        {' '}to create buying groups, then add contacts to see engagement.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 p-4 pb-2">
          Engagement by buying group
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-4">
          New contacts and engagement metrics per group. Focus on increasing reach and activity in each segment.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-t border-b border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/80">
                <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Buying group</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Contacts</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">New (30d)</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Emails sent</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Meetings</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Replies</th>
                <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Invites accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-zinc-700/80 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50"
                >
                  <td className="p-3">
                    <Link
                      href={`/dashboard/companies/${companyId}/departments/${row.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {row.contactCount}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {row.newContactCount}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {row.emailsSent}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {row.meetings}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {row.replies}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {row.invitesAccepted > 0 ? row.invitesAccepted : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Invites accepted will appear when event/campaign invite tracking is recorded.
      </p>
    </div>
  );
}

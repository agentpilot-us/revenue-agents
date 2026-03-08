'use client';

import { useEffect, useState } from 'react';

type EventRow = {
  eventName: string;
  eventDate: string;
  registered: number;
  invited: number;
  attended: number;
  totalContacts: number;
};

type Props = {
  companyId: string;
};

export function EventCoverageCard({ companyId }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/event-coverage`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setEvents(data.events ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
        <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 p-4 pb-2">
        Event coverage
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-4">
        RSVP status across company events. Identify gaps to increase attendance.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-t border-b border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/80">
              <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Event</th>
              <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Attended</th>
              <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Registered</th>
              <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Invited</th>
              <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Not yet</th>
              <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const touched = ev.attended + ev.registered + ev.invited;
              const notYet = ev.totalContacts - touched;
              const pct = ev.totalContacts > 0 ? Math.round((touched / ev.totalContacts) * 100) : 0;
              return (
                <tr
                  key={ev.eventName}
                  className="border-b border-gray-100 dark:border-zinc-700/80 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50"
                >
                  <td className="p-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{ev.eventName}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(ev.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {ev.attended > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{ev.attended}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {ev.registered > 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">{ev.registered}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {ev.invited > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{ev.invited}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {notYet > 0 ? notYet : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ShareEventModal } from './ShareEventModal';

type EventItem = { id: string; title: string };

export function RecentEventsWithShare({ events }: { events: EventItem[] }) {
  const [shareEvent, setShareEvent] = useState<EventItem | null>(null);

  if (events.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent events</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Share an event to a campaign landing page (single department or all departments).
        </p>
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-zinc-700 last:border-0"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1" title={ev.title}>
                {ev.title}
              </span>
              <button
                type="button"
                onClick={() => setShareEvent(ev)}
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 border border-amber-400 dark:border-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                Share
              </button>
            </li>
          ))}
        </ul>
      </div>
      {shareEvent && (
        <ShareEventModal
          eventId={shareEvent.id}
          eventTitle={shareEvent.title}
          open={true}
          onClose={() => setShareEvent(null)}
        />
      )}
    </>
  );
}

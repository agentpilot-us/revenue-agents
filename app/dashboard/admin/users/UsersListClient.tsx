'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveWaitlistEntry } from './actions';
import { Loader2 } from 'lucide-react';

type Entry = {
  id: string;
  email: string;
  companyName: string | null;
  requestedAt: Date;
};

export function UsersListClient({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setApprovingId(id);
    setError(null);
    try {
      const res = await approveWaitlistEntry(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    } finally {
      setApprovingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-slate-400 text-sm">No waitlist requests yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-zinc-800/50 px-4 py-3"
          >
            <div>
              <p className="text-white font-medium">{e.email}</p>
              {e.companyName && (
                <p className="text-slate-400 text-sm">{e.companyName}</p>
              )}
              <p className="text-slate-500 text-xs mt-0.5">
                {new Date(e.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleApprove(e.id)}
              disabled={!!approvingId}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-50"
            >
              {approvingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Approve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

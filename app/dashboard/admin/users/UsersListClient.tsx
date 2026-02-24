'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveWaitlistEntry, activateUser } from './actions';
import { Loader2 } from 'lucide-react';

type Entry = {
  id: string;
  email: string;
  companyName: string | null;
  requestedAt: Date;
};

type WaitlistUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export function UsersListClient({
  entries,
  waitlistUsers,
}: {
  entries: Entry[];
  waitlistUsers: WaitlistUser[];
}) {
  const router = useRouter();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
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

  async function handleActivate(userId: string) {
    setActivatingId(userId);
    setError(null);
    try {
      const res = await activateUser(userId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    } finally {
      setActivatingId(null);
    }
  }

  const hasEntries = entries.length > 0;
  const hasUsers = waitlistUsers.length > 0;

  if (!hasEntries && !hasUsers) {
    return (
      <p className="text-slate-400 text-sm">No waitlist requests or accounts awaiting activation.</p>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {hasUsers && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Accounts awaiting activation
          </h2>
          <p className="text-slate-500 text-xs mb-2">
            Users who signed in; activate to grant dashboard access.
          </p>
          <ul className="space-y-2">
            {waitlistUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-zinc-800/50 px-4 py-3"
              >
                <div>
                  <p className="text-white font-medium">{u.email}</p>
                  {u.name && (
                    <p className="text-slate-400 text-sm">{u.name}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-0.5">
                    Signed up {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleActivate(u.id)}
                  disabled={!!activatingId}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {activatingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Activate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Request access form
          </h2>
          <p className="text-slate-500 text-xs mb-2">
            Approve to send an invite email; they sign in to activate.
          </p>
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
      )}
    </div>
  );
}

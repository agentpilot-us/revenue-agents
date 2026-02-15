'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Payload = Record<string, unknown>;
type PendingItem = {
  id: string;
  type: string;
  status: string;
  payload: Payload;
  comment: string | null;
  createdAt: string;
  company: { id: string; name: string };
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
};

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  content: string | null;
  subject: string | null;
  companyId: string;
  contactId: string | null;
  createdAt: string;
  company: { id: string; name: string };
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  agentUsed: string | null;
};

export function ApprovalQueueClient({
  initialPendingItems,
  initialActivityItems,
  filterStatus,
}: {
  initialPendingItems: PendingItem[];
  initialActivityItems: ActivityItem[];
  filterStatus?: string;
}) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(initialPendingItems);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(initialActivityItems);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<Payload | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/approvals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPendingItems(data.pendingItems ?? []);
        setActivityItems(data.activityItems ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filterStatus) fetchItems();
  }, [filterStatus]);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/approvals/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      await fetchItems();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to approve');
    }
  };

  const handleReject = async (id: string, comment?: string) => {
    const res = await fetch(`/api/approvals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment ? { comment } : {}),
    });
    if (res.ok) {
      await fetchItems();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to reject');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (editPayload === null) return;
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: editPayload }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditPayload(null);
      await fetchItems();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to update');
    }
  };

  return (
    <div className="space-y-8">
      {pendingItems.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Pending ({pendingItems.length})</h2>
          <p className="text-sm text-slate-400 mb-3">
            Items from other flows (e.g. bulk drafts). Approve or reject below.
          </p>
          <ul className="space-y-4">
            {pendingItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-700 bg-zinc-800/50 p-4 text-slate-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {item.type === 'email'
                          ? `Email: ${(item.payload.subject as string) ?? 'No subject'}`
                          : item.type === 'email_to_segment'
                            ? `Send to segment: ${(item.payload.segmentName as string) ?? 'Segment'} (${Array.isArray(item.payload.contactIds) ? item.payload.contactIds.length : 0} contacts)`
                            : item.type === 'calendar_invite'
                              ? `Calendar: ${(item.payload.title as string) ?? 'Meeting'}`
                              : item.type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.company.name}
                        {item.contact && item.type !== 'email_to_segment'
                          ? ` · ${[item.contact.firstName, item.contact.lastName].filter(Boolean).join(' ') || item.contact.email}`
                          : ''}
                      </span>
                    </div>
                    {item.type === 'email' && (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                        To: {(item.payload.to as string) ?? item.contact?.email ?? '—'}
                      </p>
                    )}
                    {item.type === 'email_to_segment' && (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                        Subject: {(item.payload.subject as string) ?? '—'}
                      </p>
                    )}
                    {item.type === 'calendar_invite' && (
                      <p className="mt-1 text-sm text-slate-400">
                        {(item.payload.attendeeEmail as string) ?? '—'} ·{' '}
                        {(item.payload.start as string) ?? '—'}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm hover:bg-amber-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditPayload(null);
                          }}
                          className="px-3 py-1.5 rounded border border-slate-600 text-slate-300 text-sm hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditPayload({ ...item.payload });
                          }}
                          className="px-3 py-1.5 rounded border border-slate-600 text-slate-300 text-sm hover:bg-zinc-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="px-3 py-1.5 rounded bg-red-600/80 text-white text-sm hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === item.id && editPayload && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                    {(item.type === 'email' || item.type === 'email_to_segment') && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-500">Subject</label>
                          <input
                            value={(editPayload.subject as string) ?? ''}
                            onChange={(e) =>
                              setEditPayload((p) => (p ? { ...p, subject: e.target.value } : null))
                            }
                            className="mt-1 w-full rounded border border-slate-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500">Body</label>
                          <textarea
                            value={(editPayload.body as string) ?? ''}
                            onChange={(e) =>
                              setEditPayload((p) => (p ? { ...p, body: e.target.value } : null))
                            }
                            rows={4}
                            className="mt-1 w-full rounded border border-slate-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                      </>
                    )}
                    {item.type === 'calendar_invite' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-500">Title</label>
                          <input
                            value={(editPayload.title as string) ?? ''}
                            onChange={(e) =>
                              setEditPayload((p) => (p ? { ...p, title: e.target.value } : null))
                            }
                            className="mt-1 w-full rounded border border-slate-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500">Attendee email</label>
                          <input
                            value={(editPayload.attendeeEmail as string) ?? ''}
                            onChange={(e) =>
                              setEditPayload((p) =>
                                p ? { ...p, attendeeEmail: e.target.value } : null
                              )
                            }
                            className="mt-1 w-full rounded border border-slate-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingItems.length === 0 && !filterStatus && (
        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 text-center text-slate-400">
          <p className="font-medium text-slate-300 mb-1">All clear!</p>
          <p className="mb-2">No pending actions. Want to draft more outreach?</p>
          <Link href="/dashboard/companies" className="inline-block text-amber-400 hover:underline">
            Open a company to chat with the agent
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Recent activity</h2>
        <p className="text-sm text-slate-400 mb-3">
          Emails sent and meetings scheduled by the agent (approved in chat).
        </p>
        {activityItems.length === 0 ? (
          <div className="rounded-lg border border-slate-700/50 bg-zinc-800/30 p-6 text-center text-slate-500">
            No activity yet. Send an email or schedule a meeting via chat to see it here.
          </div>
        ) : (
          <ul className="space-y-2">
            {activityItems.map((item) => (
              <li
                key={item.id}
                className="rounded border border-slate-700/50 bg-zinc-800/30 px-4 py-3 text-sm text-slate-200 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-white">
                    {item.type === 'Email' ? '📧 ' : '📅 '}
                    {item.summary}
                  </span>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {item.company.name}
                    {item.contact
                      ? ` · ${[item.contact.firstName, item.contact.lastName].filter(Boolean).join(' ') || item.contact.email}`
                      : ''}
                    {item.agentUsed ? ` · ${item.agentUsed}` : ''}
                  </p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loading && (
        <div className="text-center text-slate-500 py-4">Loading…</div>
      )}
    </div>
  );
}

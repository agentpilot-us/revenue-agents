'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dash } from '@/app/dashboard/dashboard-classes';

export type ActiveObjection = {
  id: string;
  objection: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'addressed' | 'resolved';
  response: string | null;
  divisionId: string | null;
  lastRaisedDate: string;
  source: string;
};

type DivisionOption = { id: string; name: string };

type Props = {
  companyId: string;
  divisions?: DivisionOption[];
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'var(--ap-red)',
  medium: 'var(--ap-amber)',
  low: 'var(--ap-text-muted)',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export function ActiveObjectionsPanel({ companyId, divisions = [] }: Props) {
  const router = useRouter();
  const [objections, setObjections] = useState<ActiveObjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState('');
  const [addObjection, setAddObjection] = useState('');
  const [addSeverity, setAddSeverity] = useState<'high' | 'medium' | 'low'>('medium');
  const [addDivisionId, setAddDivisionId] = useState<string>('');
  const [addResponse, setAddResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchObjections = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/objections`);
      const data = await res.json();
      if (data.objections) setObjections(data.objections);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchObjections();
  }, [fetchObjections]);

  const handleAdd = async () => {
    if (!addObjection.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/objections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objection: addObjection.trim(),
          severity: addSeverity,
          divisionId: addDivisionId || null,
          response: addResponse.trim() || null,
          source: 'ae_manual',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setObjections((prev) => [...prev, data.objection]);
        setAddObjection('');
        setAddSeverity('medium');
        setAddDivisionId('');
        setAddResponse('');
        setShowAddForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'addressed' | 'resolved') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/objections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setObjections((prev) => prev.map((o) => (o.id === id ? data.objection : o)));
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResponse = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/objections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, response: editResponse.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setObjections((prev) => prev.map((o) => (o.id === id ? data.objection : o)));
        setEditingId(null);
        setEditResponse('');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const activeList = objections.filter((o) => o.status === 'active');
  const resolvedList = objections.filter((o) => o.status !== 'active');

  return (
    <div className={`${dash.card} rounded-lg border border-[var(--ap-border-default)] overflow-hidden`}>
      <div className={dash.sectionHeader}>
        <h2 className={dash.sectionTitle}>Active Objections</h2>
        <span className={dash.sectionSubtitle}>
          Customer concerns to address in every piece of content
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ap-text-muted)] py-4">Loading…</p>
      ) : (
        <div className="space-y-4">
          {activeList.length === 0 && resolvedList.length === 0 && !showAddForm && (
            <p className={dash.emptyStateText}>
              No objections recorded. Add one when the customer raises a concern (e.g. pricing, timeline).
            </p>
          )}

          {activeList.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-[var(--ap-border-default)] p-3 bg-[var(--ap-bg-surface)]"
              style={{ borderLeftWidth: '4px', borderLeftColor: SEVERITY_COLORS[o.severity] ?? 'var(--ap-border-default)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span
                    className="text-[10px] font-semibold tracking-wide mr-2"
                    style={{ color: SEVERITY_COLORS[o.severity] }}
                  >
                    {SEVERITY_LABELS[o.severity]}
                  </span>
                  <p className="text-[13px] font-medium text-[var(--ap-text-primary)] mt-0.5">
                    {o.objection}
                  </p>
                  {editingId === o.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editResponse}
                        onChange={(e) => setEditResponse(e.target.value)}
                        placeholder="Counter-narrative…"
                        className="w-full text-[12px] p-2 rounded border border-[var(--ap-border-default)] bg-background text-foreground min-h-[60px]"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateResponse(o.id)}
                          disabled={saving}
                          className="text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingId(null); setEditResponse(''); }}
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {o.response ? (
                        <p className="text-[12px] text-[var(--ap-text-secondary)] mt-1">
                          Counter: {o.response}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--ap-text-muted)] mt-1">No counter-narrative yet</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => { setEditingId(o.id); setEditResponse(o.response ?? ''); }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit response
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7"
                          onClick={() => handleUpdateStatus(o.id, 'addressed')}
                          disabled={saving}
                        >
                          Mark addressed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7"
                          onClick={() => handleUpdateStatus(o.id, 'resolved')}
                          disabled={saving}
                        >
                          Mark resolved
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {resolvedList.length > 0 && (
            <details className="group">
              <summary className="text-[12px] font-medium text-[var(--ap-text-muted)] cursor-pointer list-none flex items-center gap-1">
                <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                {resolvedList.length} addressed/resolved
              </summary>
              <ul className="mt-2 space-y-2 pl-4 border-l-2 border-[var(--ap-border-default)]">
                {resolvedList.map((o) => (
                  <li key={o.id} className="text-[12px] text-[var(--ap-text-secondary)]">
                    <span className="line-through">{o.objection}</span>
                    <span className="ml-2 text-[var(--ap-text-faint)]">— {o.status}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {showAddForm ? (
            <div className="rounded-lg border border-[var(--ap-border-default)] p-3 bg-[var(--ap-bg-surface)] space-y-2">
              <input
                type="text"
                value={addObjection}
                onChange={(e) => setAddObjection(e.target.value)}
                placeholder="Objection (e.g. Data Cloud costs)"
                className="w-full text-[13px] p-2 rounded border border-[var(--ap-border-default)] bg-background text-foreground"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={addSeverity}
                  onChange={(e) => setAddSeverity(e.target.value as 'high' | 'medium' | 'low')}
                  className="text-[12px] p-1.5 rounded border border-[var(--ap-border-default)] bg-background text-foreground"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {divisions.length > 0 && (
                  <select
                    value={addDivisionId}
                    onChange={(e) => setAddDivisionId(e.target.value)}
                    className="text-[12px] p-1.5 rounded border border-[var(--ap-border-default)] bg-background text-foreground"
                  >
                    <option value="">All divisions</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={addResponse}
                onChange={(e) => setAddResponse(e.target.value)}
                placeholder="Counter-narrative (optional)"
                className="w-full text-[12px] p-2 rounded border border-[var(--ap-border-default)] bg-background text-foreground min-h-[50px]"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={saving || !addObjection.trim()} className={dash.btnPrimary}>
                  Add objection
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="border-[var(--ap-border-default)] text-[var(--ap-text-secondary)]"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add objection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

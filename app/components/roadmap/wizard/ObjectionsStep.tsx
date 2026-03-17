'use client';

import { useState, useEffect } from 'react';

type Objection = {
  id: string;
  objection: string;
  severity: string;
  status: string;
  response?: string;
};

type Props = {
  companyId: string;
  onComplete: () => void;
};

export function ObjectionsStep({ companyId, onComplete }: Props) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newObjection, setNewObjection] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');

  const fetchObjections = () => {
    fetch(`/api/companies/${companyId}/objections`)
      .then((r) => r.json())
      .then((d) => setObjections(d.objections ?? d ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchObjections(); }, [companyId]);

  const handleAdd = async () => {
    if (!newObjection.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/companies/${companyId}/objections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: newObjection, severity: newSeverity }),
      });
      setNewObjection('');
      fetchObjections();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>;

  return (
    <div className="space-y-4">
      {objections.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {objections.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-2.5">
              <div className="min-w-0">
                <span className="text-xs">{o.objection}</span>
              </div>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                o.severity === 'high' ? 'text-red-400 bg-red-500/10' :
                o.severity === 'medium' ? 'text-amber-400 bg-amber-500/10' :
                'text-blue-400 bg-blue-500/10'
              }`}>
                {o.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
        <input
          type="text"
          value={newObjection}
          onChange={(e) => setNewObjection(e.target.value)}
          placeholder="e.g. Data Cloud total cost of ownership concerns"
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <select
            value={newSeverity}
            onChange={(e) => setNewSeverity(e.target.value)}
            className="text-xs rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newObjection.trim()}
            className="text-xs font-medium bg-card text-foreground border border-border px-3 py-1.5 rounded-md hover:bg-accent disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Objection'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  );
}

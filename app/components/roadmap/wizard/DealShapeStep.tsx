'use client';

import { useState, useEffect } from 'react';

type Props = {
  companyId: string;
  roadmapId: string | null;
  onComplete: () => void;
};

const ROADMAP_TYPES = [
  { value: 'enterprise_expansion', label: 'Enterprise Expansion' },
  { value: 'new_logo', label: 'New Logo Pursuit' },
  { value: 'renewal_retention', label: 'Renewal & Retention' },
  { value: 'channel_influence', label: 'Channel Influence' },
  { value: 'value_of_data', label: 'Value of Data' },
  { value: 'upsell_cross_sell', label: 'Upsell / Cross-sell' },
  { value: 'customer_success', label: 'Customer Success' },
];

export function DealShapeStep({ companyId, roadmapId, onComplete }: Props) {
  const [roadmapType, setRoadmapType] = useState('enterprise_expansion');
  const [goalText, setGoalText] = useState('');
  const [metric, setMetric] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('90_days');
  const [primaryMotion, setPrimaryMotion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roadmapId) { setLoading(false); return; }
    fetch(`/api/roadmap/config?companyId=${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        const rm = d.roadmap ?? d;
        setRoadmapType(rm.roadmapType || 'enterprise_expansion');
        const obj = (rm.objective ?? {}) as Record<string, string>;
        setGoalText(obj.goalText || '');
        setMetric(obj.metric || '');
        setTimeHorizon(obj.timeHorizon || '90_days');
      })
      .finally(() => setLoading(false));

    fetch(`/api/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.company ?? d;
        setPrimaryMotion(c.primaryMotion || '');
      });
  }, [companyId, roadmapId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/roadmap/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          roadmapType,
          objective: { goalText, metric, timeHorizon },
        }),
      });
      if (primaryMotion) {
        await fetch(`/api/companies/${companyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primaryMotion }),
        });
      }
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Deal Type</label>
        <select
          value={roadmapType}
          onChange={(e) => setRoadmapType(e.target.value)}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ROADMAP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Primary Motion</label>
        <select
          value={primaryMotion}
          onChange={(e) => setPrimaryMotion(e.target.value)}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          <option value="new_logo">New Logo</option>
          <option value="upsell">Upsell</option>
          <option value="cross_sell">Cross-sell</option>
          <option value="renewal">Renewal</option>
          <option value="customer_success">Customer Success</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Deal Objective</label>
        <textarea
          rows={2}
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          placeholder="e.g. Expand into new divisions and upsell MC Next"
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Success Metric</label>
          <input
            type="text"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="e.g. $500K ARR expansion"
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Time Horizon</label>
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="30_days">30 Days</option>
            <option value="60_days">60 Days</option>
            <option value="90_days">90 Days</option>
            <option value="180_days">6 Months</option>
            <option value="1_year">1 Year</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}

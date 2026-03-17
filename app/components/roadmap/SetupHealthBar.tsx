'use client';

import { useState, useEffect } from 'react';

type Props = {
  companyId: string;
  roadmapId: string;
};

type HealthData = {
  intelligence: boolean;
  productCount: number;
  objectionCount: number;
  signalRuleCount: number;
  playCount: number;
  contactsAssigned: number;
  contactsTotal: number;
};

const ITEMS = [
  { key: 'intelligence', label: 'Account Intelligence' },
  { key: 'products', label: 'Existing Products' },
  { key: 'objections', label: 'Active Objections' },
  { key: 'signalRules', label: 'Signal Rules' },
  { key: 'plays', label: 'Plays Activated' },
  { key: 'contacts', label: 'Contact Coverage' },
] as const;

export function SetupHealthBar({ companyId, roadmapId }: Props) {
  const [data, setData] = useState<HealthData | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/companies/${companyId}`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/existing-products`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/objections`).then((r) => r.json()),
      fetch(`/api/roadmap/action-mappings?roadmapId=${roadmapId}`).then((r) => r.json()),
      fetch(`/api/roadmap/account-play-activations?roadmapId=${roadmapId}`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/contacts?limit=1`).then((r) => r.json()),
    ]).then(([companyData, productsData, objectionsData, mappingsData, activationsData, contactsData]) => {
      const c = (companyData as Record<string, unknown>).company ?? companyData;
      const co = c as Record<string, unknown>;
      setData({
        intelligence: !!co.researchData,
        productCount: ((productsData as Record<string, unknown[]>).products ?? []).length,
        objectionCount: ((objectionsData as Record<string, unknown[]>).objections ?? []).length,
        signalRuleCount: ((mappingsData as Record<string, unknown[]>).mappings ?? []).length,
        playCount: ((activationsData as Record<string, unknown[]>).activations ?? []).length,
        contactsAssigned: (contactsData as Record<string, number>).assignedCount ?? 0,
        contactsTotal: (contactsData as Record<string, number>).total ?? 0,
      });
    }).catch(() => {});
  }, [companyId, roadmapId]);

  if (!data) return null;

  const checks = [
    { done: data.intelligence, value: data.intelligence ? 'Complete' : 'Not run' },
    { done: data.productCount > 0, value: `${data.productCount} added` },
    { done: data.objectionCount > 0, value: `${data.objectionCount} added` },
    { done: data.signalRuleCount > 0, value: `${data.signalRuleCount} configured` },
    { done: data.playCount > 0, value: `${data.playCount} active` },
    { done: data.contactsTotal > 0, value: `${data.contactsTotal} contacts` },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <div className="mb-4 rounded-lg border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 flex items-center gap-3">
          <div className="w-24 h-1.5 bg-card/80 rounded-full overflow-hidden border border-border/50">
            <div
              className={`h-full rounded-full transition-all ${
                pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            Setup: {pct}% ({doneCount}/{checks.length})
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {ITEMS.map((item, i) => {
            const check = checks[i];
            return (
              <div
                key={item.key}
                className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-[10px] border ${
                  check.done
                    ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-400'
                    : 'border-amber-500/15 bg-amber-500/5 text-amber-400'
                }`}
              >
                <span>{check.done ? '✓' : '○'}</span>
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto text-muted-foreground">{check.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

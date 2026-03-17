'use client';

import { useState, useEffect } from 'react';

type Props = {
  companyId: string;
  roadmapId: string | null;
  onComplete: () => void;
};

type Summary = {
  companyName: string;
  industry: string;
  accountType: string;
  productCount: number;
  objectionCount: number;
  signalRuleCount: number;
  playCount: number;
  contactCount: number;
};

export function ReviewStep({ companyId, roadmapId, onComplete }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises: Promise<Record<string, unknown>>[] = [
      fetch(`/api/companies/${companyId}`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/existing-products`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/objections`).then((r) => r.json()),
      fetch(`/api/companies/${companyId}/contacts?limit=1`).then((r) => r.json()),
    ];

    if (roadmapId) {
      promises.push(
        fetch(`/api/roadmap/action-mappings?roadmapId=${roadmapId}`).then((r) => r.json()),
        fetch(`/api/roadmap/account-play-activations?roadmapId=${roadmapId}`).then((r) => r.json()),
      );
    }

    Promise.all(promises)
      .then(([companyData, productsData, objectionsData, contactsData, mappingsData, activationsData]) => {
        const c = (companyData as Record<string, unknown>).company ?? companyData;
        const co = c as Record<string, unknown>;
        setSummary({
          companyName: (co.name as string) || '',
          industry: (co.industry as string) || '',
          accountType: (co.accountType as string) || '',
          productCount: ((productsData as Record<string, unknown[]>).products ?? []).length,
          objectionCount: ((objectionsData as Record<string, unknown[]>).objections ?? []).length,
          signalRuleCount: mappingsData ? ((mappingsData as Record<string, unknown[]>).mappings ?? []).length : 0,
          playCount: activationsData ? ((activationsData as Record<string, unknown[]>).activations ?? []).length : 0,
          contactCount: (contactsData as Record<string, number>).total ?? 0,
        });
      })
      .finally(() => setLoading(false));
  }, [companyId, roadmapId]);

  if (loading || !summary) {
    return <p className="text-sm text-muted-foreground animate-pulse">Generating summary...</p>;
  }

  const items = [
    { label: 'Company', value: summary.companyName, sub: `${summary.industry || 'No industry'} / ${summary.accountType || 'No type'}`, done: !!summary.companyName },
    { label: 'Existing Products', value: `${summary.productCount} product${summary.productCount !== 1 ? 's' : ''}`, done: summary.productCount > 0 },
    { label: 'Known Objections', value: `${summary.objectionCount} objection${summary.objectionCount !== 1 ? 's' : ''}`, done: summary.objectionCount > 0 },
    { label: 'Signal Rules', value: `${summary.signalRuleCount} rule${summary.signalRuleCount !== 1 ? 's' : ''}`, done: summary.signalRuleCount > 0 },
    { label: 'Plays Activated', value: `${summary.playCount} play${summary.playCount !== 1 ? 's' : ''}`, done: summary.playCount > 0 },
    { label: 'Contacts', value: `${summary.contactCount} contact${summary.contactCount !== 1 ? 's' : ''}`, done: summary.contactCount > 0 },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-card/60 rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-emerald-400">{pct}%</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              item.done
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs ${item.done ? 'text-emerald-400' : 'text-amber-400'}`}>
                {item.done ? '✓' : '○'}
              </span>
              <div>
                <span className="text-xs font-medium">{item.label}</span>
                {item.sub && <span className="text-[10px] text-muted-foreground ml-2">{item.sub}</span>}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full text-sm font-medium bg-emerald-600 text-white px-4 py-2.5 rounded-md hover:bg-emerald-700 transition-colors"
      >
        Complete Setup
      </button>
    </div>
  );
}

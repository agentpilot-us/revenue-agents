'use client';

import { useState, useEffect } from 'react';

type CatalogProduct = { id: string; name: string; category: string | null };
type ExistingProduct = { productId: string; status: string };

type Props = {
  companyId: string;
  onComplete: () => void;
};

const STATUSES = ['ACTIVE', 'TRIAL', 'CHURNED'] as const;

export function ExistingProductsStep({ companyId, onComplete }: Props) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch(`/api/companies/${companyId}/existing-products`).then((r) => r.json()),
    ]).then(([catData, existingData]) => {
      setCatalog(catData.products ?? catData ?? []);
      const existing = existingData.products ?? existingData ?? [];
      const map = new Map<string, string>();
      existing.forEach((p: ExistingProduct) => map.set(p.productId, p.status));
      setSelected(map);
    }).finally(() => setLoading(false));
  }, [companyId]);

  const toggle = (productId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.set(productId, 'ACTIVE');
      }
      return next;
    });
  };

  const setStatus = (productId: string, status: string) => {
    setSelected((prev) => new Map(prev).set(productId, status));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const products = Array.from(selected.entries()).map(([productId, status]) => ({
        productId,
        status,
      }));
      await fetch(`/api/companies/${companyId}/existing-products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>;

  return (
    <div className="space-y-4">
      {catalog.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No products in your catalog yet. Add products on My Company first.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {catalog.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                  isSelected
                    ? 'border-blue-500/30 bg-blue-500/5'
                    : 'border-border bg-card/40 hover:border-border/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-border'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">{p.name}</span>
                  {p.category && (
                    <span className="text-[9px] text-muted-foreground">{p.category}</span>
                  )}
                </button>
                {isSelected && (
                  <select
                    value={selected.get(p.id) || 'ACTIVE'}
                    onChange={(e) => setStatus(p.id, e.target.value)}
                    className="text-[10px] rounded border border-border bg-background px-1.5 py-0.5 focus:outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : `Save ${selected.size} Product${selected.size !== 1 ? 's' : ''} & Continue`}
      </button>
    </div>
  );
}

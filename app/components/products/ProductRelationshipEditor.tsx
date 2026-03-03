'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Relationship = {
  productId: string;
  productName: string;
  relationship: 'upgrade_path' | 'complementary' | 'prerequisite' | 'replacement';
};

type CatalogProductOption = {
  id: string;
  name: string;
};

type Props = {
  productId: string;
  productName: string;
  initialRelationships: Relationship[];
  catalogProducts: CatalogProductOption[];
};

const RELATIONSHIP_LABELS: Record<Relationship['relationship'], string> = {
  upgrade_path: 'Upgrade Path',
  complementary: 'Complementary',
  prerequisite: 'Prerequisite',
  replacement: 'Replacement',
};

const RELATIONSHIP_COLORS: Record<Relationship['relationship'], string> = {
  upgrade_path: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  complementary: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  prerequisite: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  replacement: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function ProductRelationshipEditor({
  productId,
  productName,
  initialRelationships,
  catalogProducts,
}: Props) {
  const router = useRouter();
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRelProductId, setNewRelProductId] = useState('');
  const [newRelType, setNewRelType] = useState<Relationship['relationship']>('complementary');

  const availableProducts = catalogProducts.filter(
    (cp) => cp.id !== productId && !relationships.some((r) => r.productId === cp.id)
  );

  const saveRelationships = async (updated: Relationship[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/relationships`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationships: updated }),
      });
      if (res.ok) {
        setRelationships(updated);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!newRelProductId) return;
    const targetProduct = catalogProducts.find((cp) => cp.id === newRelProductId);
    if (!targetProduct) return;

    const updated = [
      ...relationships,
      { productId: newRelProductId, productName: targetProduct.name, relationship: newRelType },
    ];
    saveRelationships(updated);
    setNewRelProductId('');
    setNewRelType('complementary');
    setIsAdding(false);
  };

  const handleRemove = (relProductId: string) => {
    const updated = relationships.filter((r) => r.productId !== relProductId);
    saveRelationships(updated);
  };

  return (
    <div className="mt-2">
      {relationships.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {relationships.map((r) => (
            <span
              key={r.productId}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                RELATIONSHIP_COLORS[r.relationship]
              }`}
            >
              {RELATIONSHIP_LABELS[r.relationship]}: {r.productName}
              <button
                type="button"
                onClick={() => handleRemove(r.productId)}
                disabled={saving}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${r.productName} relationship`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={newRelProductId}
            onChange={(e) => setNewRelProductId(e.target.value)}
            className="text-[11px] rounded border border-border bg-background px-2 py-1 text-foreground"
          >
            <option value="">Select product...</option>
            {availableProducts.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
              </option>
            ))}
          </select>
          <select
            value={newRelType}
            onChange={(e) => setNewRelType(e.target.value as Relationship['relationship'])}
            className="text-[11px] rounded border border-border bg-background px-2 py-1 text-foreground"
          >
            {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newRelProductId || saving}
            className="text-[11px] font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="text-[11px] font-medium text-primary hover:text-primary/80"
        >
          + Add Relationship
        </button>
      )}
    </div>
  );
}

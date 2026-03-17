'use client';

import { useState, useMemo, useEffect } from 'react';
import PlayDetailDrawer from './PlayDetailDrawer';

/** New play system (PlayTemplate) catalog item from GET /api/play-templates */
export type PlayTemplateCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category: string;
  triggerType: string;
  scope?: string;
  phaseCount: number;
};

type TriggerCategory = 'all' | 'signal' | 'event' | 'expansion' | 'renewal' | 'new_logo' | 'manual' | 'competitive' | 'other';

const CATEGORIES: { id: TriggerCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'signal', label: 'Signal Response' },
  { id: 'event', label: 'Event' },
  { id: 'expansion', label: 'Expansion' },
  { id: 'renewal', label: 'Renewal' },
  { id: 'new_logo', label: 'New Logo' },
  { id: 'competitive', label: 'Competitive' },
  { id: 'manual', label: 'Manual' },
  { id: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  signal:      { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  event:       { color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  expansion:   { color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  renewal:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  new_logo:    { color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  competitive: { color: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  manual:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  other:       { color: '#f472b6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
};

const CHANNEL_ICONS: Record<string, string> = {
  email: '\u2709', linkedin: 'in', phone: '\u{1F4DE}', call: '\u{1F4DE}',
  meeting: '\u{1F91D}', sales_page: '\u{1F310}', ad_brief: '\u{1F4E2}',
  video: '\u{1F3AC}', event: '\u{1F4C5}', demo: '\u{1F4BB}',
  proposal: '\u{1F4DD}', case_study: '\u{1F4CA}', internal: '\u{1F512}',
  task: '\u2705', crm: '\u{1F4CB}', in_product: '\u{1F527}',
};

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
};

function resolveCategory(triggerType: string | null): TriggerCategory {
  if (!triggerType) return 'manual';
  const known: TriggerCategory[] = ['signal', 'event', 'expansion', 'renewal', 'new_logo', 'manual', 'competitive'];
  if (known.includes(triggerType as TriggerCategory)) return triggerType as TriggerCategory;
  if (['competitive_displacement', 'competitor_detected'].includes(triggerType)) return 'competitive';
  if (['new_exec_intro', 'feature_release', 're_engagement', 'champion_development'].includes(triggerType)) return 'signal';
  return 'other';
}

type Props = {
  companyId?: string;
  companyName?: string;
  compact?: boolean;
};

export default function PlayCatalog({ companyId, companyName, compact = false }: Props) {
  const [templates, setTemplates] = useState<PlayTemplateCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TriggerCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PlayTemplateCatalogItem | null>(null);

  useEffect(() => {
    fetch('/api/play-templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCategory !== 'all') {
      list = list.filter((t) => resolveCategory(t.triggerType) === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.triggerType ?? '').toLowerCase().includes(q) ||
          (t.category ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, activeCategory, searchQuery]);

  if (loading) {
    return <p style={{ fontSize: 13, color: t.text3, padding: 20 }}>Loading plays...</p>;
  }

  return (
    <div>
      {!compact && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text1, margin: 0 }}>
            Play Catalog
          </h1>
          <p style={{ fontSize: 13, color: t.text3, margin: '4px 0 0' }}>
            {templates.length} plays. Browse and start plays for your target accounts.
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, minWidth: 0 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const catColor = cat.id !== 'all' ? CATEGORY_COLORS[cat.id] : null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: isActive ? (catColor?.bg || t.blueBg) : 'transparent',
                  border: `1px solid ${isActive ? (catColor?.border || t.blueBorder) : 'transparent'}`,
                  color: isActive ? (catColor?.color || t.blue) : t.text3,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Search plays..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${t.borderMed}`,
            color: t.text1,
            fontSize: 12,
            width: 180,
            outline: 'none',
            flexShrink: 0,
          }}
        />
      </div>

      <p style={{ fontSize: 11, color: t.text4, marginBottom: 12 }}>
        {filtered.length} play{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((tpl) => {
          const cat = resolveCategory(tpl.triggerType);
          const catColor = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTemplate(tpl)}
              style={{
                padding: 16,
                borderRadius: 12,
                background: t.surface,
                border: `1px solid ${t.border}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = catColor.border;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: catColor.bg,
                    color: catColor.color,
                  }}
                >
                  {tpl.triggerType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Manual'}
                </span>
                <span style={{ fontSize: 10, color: t.text4 }}>
                  {tpl.phaseCount} phase{tpl.phaseCount !== 1 ? 's' : ''}
                </span>
              </div>

              <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: 0 }}>
                {tpl.name}
              </p>

              <p
                style={{
                  fontSize: 12,
                  color: t.text3,
                  margin: 0,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {tpl.description ?? ''}
              </p>

            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 14, color: t.text3 }}>No plays match your filters</p>
        </div>
      )}

      {selectedTemplate && (
        <PlayDetailDrawer
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          companyId={companyId}
          companyName={companyName}
        />
      )}
    </div>
  );
}

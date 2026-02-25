'use client';

import { useState } from 'react';
import type { SalesPageSection, SalesPageSections } from '@/types/sales-page';

type Props = {
  headline: string;
  subheadline: string;
  sections: SalesPageSections;
  ctaLabel: string;
  ctaUrl: string;
  onChange: (data: {
    headline: string;
    subheadline: string;
    sections: SalesPageSections;
    ctaLabel: string;
    ctaUrl: string;
  }) => void;
};

export function SalesPageBuilder({
  headline,
  subheadline,
  sections,
  ctaLabel,
  ctaUrl,
  onChange,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const update = (patch: Partial<Props>) => {
    onChange({
      headline: patch.headline ?? headline,
      subheadline: patch.subheadline ?? subheadline,
      sections: patch.sections ?? sections,
      ctaLabel: patch.ctaLabel ?? ctaLabel,
      ctaUrl: patch.ctaUrl ?? ctaUrl,
    });
  };

  const setSection = (index: number, section: SalesPageSection) => {
    const next = [...sections];
    next[index] = section;
    update({ sections: next });
    setEditingIndex(null);
  };

  const removeSection = (index: number) => {
    const next = sections.filter((_, i) => i !== index);
    update({ sections: next });
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex != null && editingIndex > index) setEditingIndex(editingIndex - 1);
  };

  const moveSection = (index: number, dir: 'up' | 'down') => {
    const next = [...sections];
    const j = dir === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    update({ sections: next });
    setEditingIndex(editingIndex === index ? j : editingIndex === j ? index : editingIndex);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => update({ headline: e.target.value })}
          className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
          placeholder="Main headline"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Subheadline (optional)
        </label>
        <input
          type="text"
          value={subheadline}
          onChange={(e) => update({ subheadline: e.target.value })}
          className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
          placeholder="Optional subheadline"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sections
          </label>
        </div>
        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li
              key={index}
              className="flex items-center gap-2 p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
            >
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-24 shrink-0">
                {section.type}
              </span>
              <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                {sectionSummary(section)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-zinc-500 hover:text-zinc-700 disabled:opacity-40"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-1 text-zinc-500 hover:text-zinc-700 disabled:opacity-40"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            CTA button label
          </label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => update({ ctaLabel: e.target.value })}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
            placeholder="e.g. Register Now"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            CTA URL
          </label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => update({ ctaUrl: e.target.value })}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
}

function sectionSummary(section: SalesPageSection): string {
  switch (section.type) {
    case 'hero':
      return section.headline;
    case 'value_props':
      return `${section.items.length} value prop(s)`;
    case 'feature':
      return section.title;
    case 'event':
      return section.name;
    case 'case_study':
      return section.company;
    case 'social_proof':
      return `${section.quotes.length} quote(s)`;
    case 'cta':
      return section.headline;
    default:
      return String((section as { type: string }).type);
  }
}

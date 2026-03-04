'use client';

import { useState } from 'react';

type Props = {
  initial: {
    companyName: string | null;
    companyWebsite: string | null;
    companyIndustry: string | null;
    primaryIndustrySellTo: string | null;
    keyInitiatives: string[];
  };
};

export function MyCompanyEditor({ initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState(initial.companyName ?? '');
  const [companyWebsite, setCompanyWebsite] = useState(initial.companyWebsite ?? '');
  const [companyIndustry, setCompanyIndustry] = useState(
    initial.companyIndustry ?? ''
  );
  const [primaryIndustrySellTo, setPrimaryIndustrySellTo] = useState(
    initial.primaryIndustrySellTo ?? ''
  );
  const [keyInitiativesRaw, setKeyInitiativesRaw] = useState(
    initial.keyInitiatives.join('\n')
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const keyInitiatives = keyInitiativesRaw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/my-company/intelligence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName || null,
          companyWebsite: companyWebsite || null,
          companyIndustry: companyIndustry || null,
          primaryIndustrySellTo: primaryIndustrySellTo || null,
          keyInitiatives,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to save company profile.');
        return;
      }
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        Edit profile
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Company name
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Website</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Industry</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={companyIndustry}
            onChange={(e) => setCompanyIndustry(e.target.value)}
            placeholder="Software, Automotive, Healthcare…"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Primary industry you sell to
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={primaryIndustrySellTo}
            onChange={(e) => setPrimaryIndustrySellTo(e.target.value)}
            placeholder="e.g. Automotive manufacturers"
          />
        </label>
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          Key initiatives (one per line)
        </span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs min-h-[90px]"
          value={keyInitiativesRaw}
          onChange={(e) => setKeyInitiativesRaw(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        {error && (
          <span className="text-[11px] text-amber-500 truncate max-w-[220px]">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

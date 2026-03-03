'use client';

import { useCallback, useEffect, useState } from 'react';

type ObjectionHandler = { objection: string; response: string };

type ProfileData = {
  oneLiner: string;
  elevatorPitch: string;
  valueProps: string[];
  painPoints: string[];
  objectionHandlers: ObjectionHandler[];
  competitivePositioning: string[];
  priceRangeText: string;
  salesCycle: string;
};

const EMPTY_PROFILE: ProfileData = {
  oneLiner: '',
  elevatorPitch: '',
  valueProps: [],
  painPoints: [],
  objectionHandlers: [],
  competitivePositioning: [],
  priceRangeText: '',
  salesCycle: '',
};

type Props = {
  catalogProductId: string;
  productName: string;
};

export function ProductProfileEditor({ catalogProductId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog-products/${catalogProductId}/profile`);
      if (res.status === 204) {
        setProfile(EMPTY_PROFILE);
      } else if (res.ok) {
        const data = await res.json();
        setProfile({
          oneLiner: data.oneLiner ?? '',
          elevatorPitch: data.elevatorPitch ?? '',
          valueProps: data.valueProps ?? [],
          painPoints: data.painPoints ?? [],
          objectionHandlers: data.objectionHandlers ?? [],
          competitivePositioning: data.competitivePositioning ?? [],
          priceRangeText: data.priceRangeText ?? '',
          salesCycle: data.salesCycle ?? '',
        });
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to load profile');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [catalogProductId]);

  useEffect(() => {
    if (open && !loaded) {
      fetchProfile();
    }
  }, [open, loaded, fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/catalog-products/${catalogProductId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Save failed');
      } else {
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2000);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  /* ---- field updaters ---- */
  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const addToList = (key: 'valueProps' | 'painPoints' | 'competitivePositioning') =>
    set(key, [...profile[key], '']);

  const updateListItem = (
    key: 'valueProps' | 'painPoints' | 'competitivePositioning',
    idx: number,
    value: string,
  ) => {
    const next = [...profile[key]];
    next[idx] = value;
    set(key, next);
  };

  const removeListItem = (
    key: 'valueProps' | 'painPoints' | 'competitivePositioning',
    idx: number,
  ) => set(key, profile[key].filter((_, i) => i !== idx));

  const addObjection = () =>
    set('objectionHandlers', [...profile.objectionHandlers, { objection: '', response: '' }]);

  const updateObjection = (idx: number, field: keyof ObjectionHandler, value: string) => {
    const next = [...profile.objectionHandlers];
    next[idx] = { ...next[idx], [field]: value };
    set('objectionHandlers', next);
  };

  const removeObjection = (idx: number) =>
    set('objectionHandlers', profile.objectionHandlers.filter((_, i) => i !== idx));

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80"
      >
        <span className="inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        {open ? 'Hide' : 'Edit'} Product Profile
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-lg border border-border bg-zinc-950/40 p-4">
          {loading && (
            <p className="text-xs text-muted-foreground animate-pulse">Loading profile…</p>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {!loading && loaded && (
            <>
              {/* One-liner */}
              <Field label="One-liner">
                <input
                  type="text"
                  value={profile.oneLiner}
                  onChange={(e) => set('oneLiner', e.target.value)}
                  placeholder={`Short tagline for ${productName}`}
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Elevator pitch */}
              <Field label="Elevator pitch">
                <textarea
                  value={profile.elevatorPitch}
                  onChange={(e) => set('elevatorPitch', e.target.value)}
                  placeholder="2-3 sentence pitch"
                  rows={3}
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 resize-y"
                />
              </Field>

              {/* Value props */}
              <ListField
                label="Value propositions"
                items={profile.valueProps}
                placeholder="e.g. Reduces onboarding time by 40%"
                onAdd={() => addToList('valueProps')}
                onChange={(i, v) => updateListItem('valueProps', i, v)}
                onRemove={(i) => removeListItem('valueProps', i)}
              />

              {/* Pain points */}
              <ListField
                label="Pain points addressed"
                items={profile.painPoints}
                placeholder="e.g. Manual data entry across multiple tools"
                onAdd={() => addToList('painPoints')}
                onChange={(i, v) => updateListItem('painPoints', i, v)}
                onRemove={(i) => removeListItem('painPoints', i)}
              />

              {/* Objection handlers */}
              <Field label="Objection handlers">
                <div className="space-y-2">
                  {profile.objectionHandlers.map((oh, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={oh.objection}
                          onChange={(e) => updateObjection(i, 'objection', e.target.value)}
                          placeholder="Objection…"
                          className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                        />
                        <input
                          type="text"
                          value={oh.response}
                          onChange={(e) => updateObjection(i, 'response', e.target.value)}
                          placeholder="Response…"
                          className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeObjection(i)}
                        className="mt-1 text-[11px] text-muted-foreground hover:text-red-400"
                        aria-label="Remove objection"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addObjection}
                    className="text-[11px] font-medium text-primary hover:text-primary/80"
                  >
                    + Add objection
                  </button>
                </div>
              </Field>

              {/* Competitive positioning */}
              <ListField
                label="Competitive positioning"
                items={profile.competitivePositioning}
                placeholder="e.g. Only solution with native CRM sync"
                onAdd={() => addToList('competitivePositioning')}
                onChange={(i, v) => updateListItem('competitivePositioning', i, v)}
                onRemove={(i) => removeListItem('competitivePositioning', i)}
              />

              {/* Price range */}
              <Field label="Price range">
                <input
                  type="text"
                  value={profile.priceRangeText}
                  onChange={(e) => set('priceRangeText', e.target.value)}
                  placeholder="e.g. $500-$2,000/mo"
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Sales cycle */}
              <Field label="Sales cycle">
                <input
                  type="text"
                  value={profile.salesCycle}
                  onChange={(e) => set('salesCycle', e.target.value)}
                  placeholder="e.g. 30-60 days"
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Save */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
                {saveOk && (
                  <span className="text-xs text-emerald-400">Saved!</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- tiny sub-components ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ListField({
  label,
  items,
  placeholder,
  onAdd,
  onChange,
  onRemove,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onAdd: () => void;
  onChange: (i: number, v: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-[11px] text-muted-foreground hover:text-red-400"
              aria-label={`Remove item ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="text-[11px] font-medium text-primary hover:text-primary/80"
        >
          + Add item
        </button>
      </div>
    </Field>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

/** Prisma @default values for PlayGovernance (used when GET returns 404). */
const DEFAULTS = {
  maxDiscountPct: 15,
  multiYearDiscountPct: 5,
  earlyRenewalDiscountPct: 5,
  earlyRenewalWindowDays: 60,
  defaultCooldownDays: 7,
  maxWeeklyTouchesPerContact: 2,
  maxWeeklyTouchesPerAccount: 5,
  valueNarrative: '',
  renewalMessaging: '',
  expansionMessaging: '',
  companyBoilerplate: '',
  brandVoice: '',
  emailSignatureTemplate: '',
  competitiveRulesJson: 'null',
  expansionSkusJson: 'null',
};

type FormState = typeof DEFAULTS;

function jsonToString(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return 'null';
  }
}

export function GovernanceTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/play-governance');
      if (res.status === 404) {
        setExists(false);
        setForm(DEFAULTS);
        return;
      }
      if (!res.ok) {
        setMessage({ type: 'err', text: 'Failed to load governance settings.' });
        return;
      }
      const g = await res.json();
      setExists(true);
      setForm({
        maxDiscountPct: g.maxDiscountPct ?? DEFAULTS.maxDiscountPct,
        multiYearDiscountPct: g.multiYearDiscountPct ?? DEFAULTS.multiYearDiscountPct,
        earlyRenewalDiscountPct: g.earlyRenewalDiscountPct ?? DEFAULTS.earlyRenewalDiscountPct,
        earlyRenewalWindowDays: g.earlyRenewalWindowDays ?? DEFAULTS.earlyRenewalWindowDays,
        defaultCooldownDays: g.defaultCooldownDays ?? DEFAULTS.defaultCooldownDays,
        maxWeeklyTouchesPerContact:
          g.maxWeeklyTouchesPerContact ?? DEFAULTS.maxWeeklyTouchesPerContact,
        maxWeeklyTouchesPerAccount:
          g.maxWeeklyTouchesPerAccount ?? DEFAULTS.maxWeeklyTouchesPerAccount,
        valueNarrative: g.valueNarrative ?? '',
        renewalMessaging: g.renewalMessaging ?? '',
        expansionMessaging: g.expansionMessaging ?? '',
        companyBoilerplate: g.companyBoilerplate ?? '',
        brandVoice: g.brandVoice ?? '',
        emailSignatureTemplate: g.emailSignatureTemplate ?? '',
        competitiveRulesJson: jsonToString(g.competitiveRules),
        expansionSkusJson: jsonToString(g.expansionSkus),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      if (
        key === 'maxDiscountPct' ||
        key === 'multiYearDiscountPct' ||
        key === 'earlyRenewalDiscountPct' ||
        key === 'earlyRenewalWindowDays' ||
        key === 'defaultCooldownDays' ||
        key === 'maxWeeklyTouchesPerContact' ||
        key === 'maxWeeklyTouchesPerAccount'
      ) {
        const n = parseFloat(v);
        setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : 0 }));
      } else {
        setForm((f) => ({ ...f, [key]: v }));
      }
    };

  const save = async () => {
    setMessage(null);
    let competitiveRules: unknown;
    let expansionSkus: unknown;
    try {
      competitiveRules = JSON.parse(form.competitiveRulesJson || 'null');
    } catch {
      setMessage({ type: 'err', text: 'Competitive rules: invalid JSON.' });
      return;
    }
    try {
      expansionSkus = JSON.parse(form.expansionSkusJson || 'null');
    } catch {
      setMessage({ type: 'err', text: 'Expansion SKUs: invalid JSON.' });
      return;
    }

    const body = {
      maxDiscountPct: form.maxDiscountPct,
      multiYearDiscountPct: form.multiYearDiscountPct,
      earlyRenewalDiscountPct: form.earlyRenewalDiscountPct,
      earlyRenewalWindowDays: Math.round(form.earlyRenewalWindowDays),
      defaultCooldownDays: Math.round(form.defaultCooldownDays),
      maxWeeklyTouchesPerContact: Math.round(form.maxWeeklyTouchesPerContact),
      maxWeeklyTouchesPerAccount: Math.round(form.maxWeeklyTouchesPerAccount),
      competitiveRules,
      expansionSkus,
      valueNarrative: form.valueNarrative || null,
      renewalMessaging: form.renewalMessaging || null,
      expansionMessaging: form.expansionMessaging || null,
      companyBoilerplate: form.companyBoilerplate || null,
      brandVoice: form.brandVoice || null,
      emailSignatureTemplate: form.emailSignatureTemplate || null,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/play-governance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: 'err',
          text: (data.error as string) || 'Save failed.',
        });
        return;
      }
      setExists(true);
      setMessage({ type: 'ok', text: 'Play governance saved.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading governance…</p>;
  }

  const inputCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Play governance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Discount caps, contact touch limits, cooldown defaults, and brand guardrails used when
          generating and sending play content. For full positioning and tone, use{' '}
          <span className="text-foreground/90">Messaging</span> frameworks — governance{' '}
          <strong>constrains</strong>; messaging <strong>informs</strong>.
        </p>
        {!exists && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            No settings saved yet — defaults are shown. Click Save to create your governance record.
          </p>
        )}
      </div>

      {message && (
        <p
          className={
            message.type === 'ok'
              ? 'text-sm text-green-600 dark:text-green-400'
              : 'text-sm text-red-600 dark:text-red-400'
          }
        >
          {message.text}
        </p>
      )}

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Discount caps (%)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Max discount</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={inputCls}
              value={form.maxDiscountPct}
              onChange={set('maxDiscountPct')}
            />
          </div>
          <div>
            <label className={labelCls}>Multi-year discount</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={inputCls}
              value={form.multiYearDiscountPct}
              onChange={set('multiYearDiscountPct')}
            />
          </div>
          <div>
            <label className={labelCls}>Early renewal discount</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={inputCls}
              value={form.earlyRenewalDiscountPct}
              onChange={set('earlyRenewalDiscountPct')}
            />
          </div>
          <div>
            <label className={labelCls}>Early renewal window (days)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.earlyRenewalWindowDays}
              onChange={set('earlyRenewalWindowDays')}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Touches & cooldown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Default cooldown (days)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.defaultCooldownDays}
              onChange={set('defaultCooldownDays')}
            />
          </div>
          <div>
            <label className={labelCls}>Max weekly touches / contact</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.maxWeeklyTouchesPerContact}
              onChange={set('maxWeeklyTouchesPerContact')}
            />
          </div>
          <div>
            <label className={labelCls}>Max weekly touches / account</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.maxWeeklyTouchesPerAccount}
              onChange={set('maxWeeklyTouchesPerAccount')}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Narratives & boilerplate</h3>
        <div>
          <label className={labelCls}>Value narrative</label>
          <textarea
            className={`${inputCls} min-h-[88px]`}
            value={form.valueNarrative}
            onChange={set('valueNarrative')}
            placeholder="Approved value story the AI should lean on…"
          />
        </div>
        <div>
          <label className={labelCls}>Renewal messaging</label>
          <textarea
            className={`${inputCls} min-h-[72px]`}
            value={form.renewalMessaging}
            onChange={set('renewalMessaging')}
          />
        </div>
        <div>
          <label className={labelCls}>Expansion messaging</label>
          <textarea
            className={`${inputCls} min-h-[72px]`}
            value={form.expansionMessaging}
            onChange={set('expansionMessaging')}
          />
        </div>
        <div>
          <label className={labelCls}>Company boilerplate</label>
          <textarea
            className={`${inputCls} min-h-[72px]`}
            value={form.companyBoilerplate}
            onChange={set('companyBoilerplate')}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Brand & signature</h3>
        <div>
          <label className={labelCls}>Brand voice (short guardrails)</label>
          <textarea
            className={`${inputCls} min-h-[64px]`}
            value={form.brandVoice}
            onChange={set('brandVoice')}
            placeholder="e.g. Professional, consultative; never aggressive or slang."
          />
        </div>
        <div>
          <label className={labelCls}>Email signature template</label>
          <textarea
            className={`${inputCls} min-h-[64px]`}
            value={form.emailSignatureTemplate}
            onChange={set('emailSignatureTemplate')}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Advanced (JSON)</h3>
        <p className="text-xs text-muted-foreground">
          Use valid JSON. Empty object <code className="text-foreground">{'{}'}</code> or{' '}
          <code className="text-foreground">null</code> if unused.
        </p>
        <div>
          <label className={labelCls}>Competitive rules</label>
          <textarea
            className={`${inputCls} font-mono text-xs min-h-[120px]`}
            value={form.competitiveRulesJson}
            onChange={set('competitiveRulesJson')}
            spellCheck={false}
          />
        </div>
        <div>
          <label className={labelCls}>Expansion SKUs</label>
          <textarea
            className={`${inputCls} font-mono text-xs min-h-[120px]`}
            value={form.expansionSkusJson}
            onChange={set('expansionSkusJson')}
            spellCheck={false}
          />
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save governance'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={saving}
          className="text-sm font-medium border border-border px-4 py-2 rounded-md hover:bg-muted/50"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

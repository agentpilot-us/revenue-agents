'use client';

import { useState, useEffect, useCallback } from 'react';

type Limits = {
  maxEmailsPerDay: number;
  maxEmailsPerWeek: number;
  maxLinkedInPerDay: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const DEFAULTS: Limits = {
  maxEmailsPerDay: 10,
  maxEmailsPerWeek: 40,
  maxLinkedInPerDay: 5,
  quietHoursEnabled: false,
  quietHoursStart: '18:00',
  quietHoursEnd: '08:00',
};

type Props = {
  companyId: string;
};

export function OperationalLimitsEditor({ companyId }: Props) {
  const [limits, setLimits] = useState<Limits>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch(`/api/roadmap/config?companyId=${companyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.roadmap?.operationalLimits) {
          setLimits({ ...DEFAULTS, ...(data.roadmap.operationalLimits as Partial<Limits>) });
        }
      })
      .catch(() => {});
  }, [companyId]);

  const update = useCallback((patch: Partial<Limits>) => {
    setLimits((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/roadmap/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, operationalLimits: limits }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberField
          label="Max Emails / Day"
          value={limits.maxEmailsPerDay}
          onChange={(v) => update({ maxEmailsPerDay: v })}
        />
        <NumberField
          label="Max Emails / Week"
          value={limits.maxEmailsPerWeek}
          onChange={(v) => update({ maxEmailsPerWeek: v })}
        />
        <NumberField
          label="Max LinkedIn / Day"
          value={limits.maxLinkedInPerDay}
          onChange={(v) => update({ maxLinkedInPerDay: v })}
        />
      </div>

      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={limits.quietHoursEnabled}
            onChange={(e) => update({ quietHoursEnabled: e.target.checked })}
            className="rounded border-border accent-primary"
          />
          <span className="text-xs font-medium">Enable Quiet Hours</span>
        </label>
        {limits.quietHoursEnabled && (
          <div className="flex items-center gap-3 ml-6">
            <TimeField
              label="Start"
              value={limits.quietHoursStart}
              onChange={(v) => update({ quietHoursStart: v })}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <TimeField
              label="End"
              value={limits.quietHoursEnd}
              onChange={(v) => update({ quietHoursEnd: v })}
            />
          </div>
        )}
      </div>

      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs font-medium rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Limits'}
        </button>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
      />
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
      />
    </div>
  );
}

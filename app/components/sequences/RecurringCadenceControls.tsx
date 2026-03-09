'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  sequenceId: string;
  isRecurring: boolean;
  repeatCycleDays: number | null;
  maxCycles: number | null;
};

const CYCLE_PRESETS = [
  { label: 'Weekly', days: 7 },
  { label: 'Bi-weekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
];

export function RecurringCadenceControls({
  sequenceId,
  isRecurring: initialIsRecurring,
  repeatCycleDays: initialRepeatDays,
  maxCycles: initialMaxCycles,
}: Props) {
  const router = useRouter();
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring);
  const [repeatCycleDays, setRepeatCycleDays] = useState(initialRepeatDays ?? 30);
  const [maxCycles, setMaxCycles] = useState<number | null>(initialMaxCycles);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const save = useCallback(async (updates: {
    isRecurring: boolean;
    repeatCycleDays: number | null;
    maxCycles: number | null;
  }) => {
    setSaving(true);
    try {
      await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [sequenceId, router]);

  const handleToggle = (checked: boolean) => {
    setIsRecurring(checked);
    setDirty(true);
  };

  const handleCycleDaysChange = (days: number) => {
    setRepeatCycleDays(days);
    setDirty(true);
  };

  const handleMaxCyclesChange = (val: string) => {
    const n = parseInt(val, 10);
    setMaxCycles(isNaN(n) || n <= 0 ? null : n);
    setDirty(true);
  };

  const handleSave = () => {
    save({
      isRecurring,
      repeatCycleDays: isRecurring ? repeatCycleDays : null,
      maxCycles: isRecurring ? maxCycles : null,
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recurring Cadence</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically restart this sequence after the last step completes
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isRecurring}
          onClick={() => handleToggle(!isRecurring)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRecurring ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              isRecurring ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isRecurring && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Restart after
            </label>
            <div className="flex flex-wrap gap-2">
              {CYCLE_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handleCycleDaysChange(preset.days)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    repeatCycleDays === preset.days
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                      : 'border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={repeatCycleDays}
                  onChange={(e) => handleCycleDaysChange(parseInt(e.target.value, 10) || 30)}
                  className="w-16 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs text-foreground"
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Max cycles
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={maxCycles ?? ''}
                placeholder="Unlimited"
                onChange={(e) => handleMaxCyclesChange(e.target.value)}
                className="w-24 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs text-foreground placeholder:text-gray-400"
              />
              <span className="text-xs text-muted-foreground">
                {maxCycles ? `(${maxCycles} total runs)` : '(runs until manually stopped)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {dirty && (
        <div className="mt-3 pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

type SheetsConfig = {
  spreadsheetId: string | null;
  sheetName: string | null;
};

export function MyCompanySheetsConfig() {
  const [config, setConfig] = useState<SheetsConfig>({
    spreadsheetId: null,
    sheetName: null,
  });
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/my-company/sheets');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          setSpreadsheetId(data.spreadsheetId ?? '');
          setSheetName(data.sheetName ?? '');
        }
      } catch (e) {
        // ignore initial load errors; user can still enter values
        console.error('Failed to load Sheets config', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!spreadsheetId.trim() || !sheetName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/my-company/sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: spreadsheetId.trim(),
          sheetName: sheetName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to save Sheets config.');
        return;
      }
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save Sheets config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground mb-2">
        Google Sheets integration
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        Configure a spreadsheet to sync My Company campaigns and health metrics. Future
        jobs can push updates into this sheet for proactive reporting.
      </p>
      <div className="space-y-2 text-xs">
        <label className="space-y-1 block">
          <span className="font-medium text-muted-foreground">Spreadsheet ID</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="e.g. 1AbCDeFgHiJkLmNoPqRsTuVwXyZ1234567890"
          />
        </label>
        <label className="space-y-1 block">
          <span className="font-medium text-muted-foreground">Sheet name</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="e.g. My Company Intelligence"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !spreadsheetId.trim() || !sheetName.trim()}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : loading ? 'Save config' : 'Update config'}
        </button>
        {config.spreadsheetId && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
            Connected to sheet "{config.sheetName}".
          </span>
        )}
        {error && (
          <span className="text-[11px] text-amber-500 truncate max-w-[220px]">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}


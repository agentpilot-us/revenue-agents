'use client';

import { useState } from 'react';

type ExportResponse = {
  spreadsheetId: string | null;
  sheetName: string | null;
  rows: (string | number)[][];
};

export function MyCompanySheetsExportPreview() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/my-company/sheets/export');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Failed to load export preview.');
        return;
      }
      const body = (await res.json()) as ExportResponse;
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load export preview.');
    } finally {
      setLoading(false);
    }
  };

  const header = data?.rows?.[0] ?? [];
  const row = data?.rows?.[1] ?? [];

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Preview export payload'}
        </button>
        {data?.spreadsheetId && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
            Target: {data.sheetName ?? 'Sheet'} in {data.spreadsheetId}
          </span>
        )}
        {error && (
          <span className="text-[11px] text-amber-500 truncate max-w-[220px]">
            {error}
          </span>
        )}
      </div>
      {header.length > 0 && row.length > 0 && (
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                {header.map((h, idx) => (
                  <th key={idx} className="px-1 py-1 text-left font-medium">
                    {String(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-foreground">
                {row.map((cell, idx) => (
                  <td key={idx} className="px-1 py-1">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


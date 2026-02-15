'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type CrmStatus = { salesforce: boolean; hubspot: boolean };

type Props = {
  companyId: string;
  companyName: string;
  companyCrm: { source: 'salesforce' | 'hubspot'; accountId: string } | null;
};

export function CrmImportPushCard({ companyId, companyName, companyCrm }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [importSource, setImportSource] = useState<'salesforce' | 'hubspot'>('salesforce');
  const [importAccountId, setImportAccountId] = useState(companyCrm?.accountId ?? '');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [pushSource, setPushSource] = useState<'salesforce' | 'hubspot'>('salesforce');
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ pushed: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/crm/status')
      .then((r) => r.ok ? r.json() : null)
      .then((data: CrmStatus | null) => data && setStatus(data));
  }, []);

  useEffect(() => {
    if (companyCrm?.accountId) setImportAccountId(companyCrm.accountId);
  }, [companyCrm?.accountId]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crmSource: importSource,
          companyId,
          ...(importAccountId.trim() && { accountId: importAccountId.trim() }),
          limit: 100,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ created: data.created, updated: data.updated, errors: data.errors ?? [] });
        router.refresh();
      } else {
        setImportResult({ created: 0, updated: 0, errors: [data.error ?? 'Import failed'] });
      }
    } catch (e) {
      setImportResult({ created: 0, updated: 0, errors: [e instanceof Error ? e.message : 'Request failed'] });
    } finally {
      setImporting(false);
    }
  }, [companyId, importSource, importAccountId, router]);

  const handlePush = useCallback(async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/crm/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crmSource: pushSource,
          companyId,
          scope: 'activities',
          sinceDays: 30,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushResult({ pushed: data.pushed, errors: data.errors ?? [] });
      } else {
        setPushResult({ pushed: 0, errors: [data.error ?? 'Push failed'] });
      }
    } catch (e) {
      setPushResult({ pushed: 0, errors: [e instanceof Error ? e.message : 'Request failed'] });
    } finally {
      setPushing(false);
    }
  }, [companyId, pushSource]);

  if (!status || (!status.salesforce && !status.hubspot)) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4 bg-gray-50 dark:bg-zinc-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">CRM sync</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure HubSpot or Salesforce in environment variables to import contacts and push activities.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4 bg-gray-50 dark:bg-zinc-800/50 space-y-4">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Import from CRM</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Pull contacts into {companyName}. Link this company to a CRM account by entering the Account ID (Salesforce) or Company ID (HubSpot).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={importSource}
          onChange={(e) => setImportSource(e.target.value as 'salesforce' | 'hubspot')}
          className="rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
        >
          {status.salesforce && <option value="salesforce">Salesforce</option>}
          {status.hubspot && <option value="hubspot">HubSpot</option>}
        </select>
        <input
          type="text"
          placeholder={importSource === 'salesforce' ? 'Salesforce Account Id' : 'HubSpot Company Id'}
          value={importAccountId}
          onChange={(e) => setImportAccountId(e.target.value)}
          className="rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm w-56 bg-white dark:bg-zinc-800 placeholder:text-gray-500"
        />
        <Button size="sm" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing…' : 'Import contacts'}
        </Button>
      </div>
      {importResult && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Created {importResult.created}, updated {importResult.updated}.
          {importResult.errors.length > 0 && ` ${importResult.errors.length} error(s).`}
        </p>
      )}

      <div className="pt-3 border-t border-gray-200 dark:border-zinc-600">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Push to CRM</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Sync recent emails and meetings (last 30 days) for contacts that have a CRM link.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <select
            value={pushSource}
            onChange={(e) => setPushSource(e.target.value as 'salesforce' | 'hubspot')}
            className="rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
          >
            {status.salesforce && <option value="salesforce">Salesforce</option>}
            {status.hubspot && <option value="hubspot">HubSpot</option>}
          </select>
          <Button size="sm" variant="outline" onClick={handlePush} disabled={pushing}>
            {pushing ? 'Pushing…' : 'Push activities'}
          </Button>
        </div>
        {pushResult && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pushed {pushResult.pushed} activities.
            {pushResult.errors.length > 0 && ` ${pushResult.errors.length} error(s).`}
          </p>
        )}
      </div>
    </div>
  );
}

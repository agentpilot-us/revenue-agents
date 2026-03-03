'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type SfAccount = {
  salesforceId: string;
  name: string;
  website: string | null;
  industry: string | null;
};

type Props = {
  onImported?: (companyId: string, companyName: string) => void;
};

export function SalesforceAccountPicker({ onImported }: Props) {
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<SfAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchAccounts = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = term.trim() ? `?search=${encodeURIComponent(term.trim())}` : '';
      const res = await fetch(`/api/crm/accounts${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAccounts(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchAccounts]);

  const handleImport = async (account: SfAccount) => {
    setImportingId(account.salesforceId);
    setError(null);
    try {
      const res = await fetch('/api/crm/accounts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesforceAccountId: account.salesforceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      onImported?.(data.id, data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search Salesforce accounts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 placeholder:text-gray-500"
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>
      )}

      {!loading && accounts.length === 0 && search.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No accounts found.</p>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-zinc-600 border border-gray-200 dark:border-zinc-600 rounded-lg max-h-64 overflow-y-auto">
          {accounts.map((account) => (
            <li key={account.salesforceId} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {account.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[account.industry, account.website].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-2 shrink-0"
                disabled={importingId !== null}
                onClick={() => handleImport(account)}
              >
                {importingId === account.salesforceId ? 'Importing…' : 'Import'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

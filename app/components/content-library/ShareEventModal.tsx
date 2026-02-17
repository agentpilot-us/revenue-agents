'use client';

import { useState, useEffect } from 'react';

type Company = { id: string; name: string };
type Campaign = {
  id: string;
  slug: string;
  title: string;
  departmentId: string | null;
  department: { id: string; customName: string | null; type: string } | null;
  isMultiDepartment?: boolean;
  departmentConfig?: { departments?: Array<{ id: string; name: string; slug?: string }> } | null;
};

type Props = {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ShareEventModal({ eventId, eventTitle, open, onClose, onSuccess }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [addToAll, setAddToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
    setCompanyId('');
    setCampaignId('');
    setDepartmentId('');
    setAddToAll(false);
    setCampaigns([]);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!companyId) {
      setCampaigns([]);
      setCampaignId('');
      return;
    }
    fetch(`/api/companies/${companyId}/campaigns`)
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => setCampaigns([]));
    setCampaignId('');
    setDepartmentId('');
  }, [companyId]);

  const campaign = campaigns.find((c) => c.id === campaignId);
  const isMulti = campaign?.isMultiDepartment && campaign?.departmentConfig?.departments?.length;
  const departments = campaign?.departmentConfig?.departments ?? [];

  const handleSubmit = async () => {
    if (!companyId || !campaignId) {
      setError('Select a company and campaign.');
      return;
    }
    if (isMulti && !addToAll && !departmentId) {
      setError('Select a department or "Add to all departments".');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isMulti && addToAll && departments.length > 0) {
        const res = await fetch(
          `/api/companies/${companyId}/campaigns/${campaignId}/events/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: departments.map((d) => ({ contentLibraryId: eventId, departmentId: d.id })),
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? 'Failed to add event');
        }
      } else {
        const res = await fetch(
          `/api/companies/${companyId}/campaigns/${campaignId}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentLibraryId: eventId,
              ...(isMulti && departmentId ? { departmentId } : {}),
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? 'Failed to add event');
        }
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share event');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-6 shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Share event</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 truncate" title={eventTitle}>
          {eventTitle}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm"
            >
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          {isMulti && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={addToAll}
                  onChange={(e) => {
                    setAddToAll(e.target.checked);
                    if (e.target.checked) setDepartmentId('');
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                Add to all departments
              </label>
              {!addToAll && (
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium rounded-lg disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add to campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

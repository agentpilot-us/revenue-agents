'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  YOUR_INDUSTRY_OPTIONS,
  PRIMARY_INDUSTRY_SELL_TO_OPTIONS,
  REFRESH_FREQUENCY_OPTIONS,
} from '@/lib/constants/industries';
import {
  saveCompanyBasicInfo,
  startSmartImport,
  type GetCompanySetupStateUser,
} from '@/app/actions/content-library-setup';

type Props = {
  existingData: GetCompanySetupStateUser | null;
  message?: string;
  skipToImport?: boolean;
};

export function CompanyBasicInfoForm({ existingData, message, skipToImport }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(existingData?.companyName ?? '');
  const [companyWebsite, setCompanyWebsite] = useState(existingData?.companyWebsite ?? '');
  const [companyIndustry, setCompanyIndustry] = useState(existingData?.companyIndustry ?? '');
  const [primaryIndustrySellTo, setPrimaryIndustrySellTo] = useState(
    existingData?.primaryIndustrySellTo ?? ''
  );
  const [contentRefreshFrequency, setContentRefreshFrequency] = useState(
    existingData?.contentRefreshFrequency ?? 'weekly'
  );

  const hasRequired =
    Boolean(companyWebsite?.trim()) && Boolean(primaryIndustrySellTo?.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const saveRes = await saveCompanyBasicInfo({
        companyName: companyName.trim() || null,
        companyWebsite: companyWebsite.trim() || null,
        companyIndustry: companyIndustry.trim() || null,
        primaryIndustrySellTo: primaryIndustrySellTo.trim() || null,
        contentRefreshFrequency: contentRefreshFrequency.trim() || null,
      });
      if (!saveRes.ok) {
        setError(saveRes.error);
        return;
      }
      const importRes = await startSmartImport();
      if (!importRes.ok) {
        setError(importRes.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Your company data setup
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Add your company info and we’ll discover and categorize content from your website.
        </p>
        {message && (
          <p className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Company name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
              placeholder="Acme Inc"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Company website <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
              placeholder="https://acme.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Your industry
            </label>
            <select
              value={companyIndustry}
              onChange={(e) => setCompanyIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select industry</option>
              {YOUR_INDUSTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Primary industry you sell to <span className="text-red-500">*</span>
            </label>
            <select
              value={primaryIndustrySellTo}
              onChange={(e) => setPrimaryIndustrySellTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select industry</option>
              {PRIMARY_INDUSTRY_SELL_TO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Content refresh schedule
            </label>
            <select
              value={contentRefreshFrequency}
              onChange={(e) => setContentRefreshFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            >
              {REFRESH_FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {skipToImport
                ? 'Start a smart import to discover and categorize pages from your website.'
                : 'After saving we’ll start a smart import to discover and categorize pages from your website.'}
            </p>
            <button
              type="submit"
              disabled={!hasRequired || saving}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving ? 'Saving…' : skipToImport ? 'Start Smart Import' : 'Save & Start Smart Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  YOUR_INDUSTRY_OPTIONS,
  PRIMARY_INDUSTRY_SELL_TO_OPTIONS,
  ADDITIONAL_INDUSTRIES,
  REFRESH_FREQUENCY_OPTIONS,
} from '@/lib/constants/industries';

export type CompanySetupData = {
  companyName: string;
  companyWebsite: string;
  companyIndustry: string;
  primaryIndustrySellTo: string;
  contentRefreshFrequency: string;
  contentRefreshNextAt: string | null;
  notifyOnNewContent: boolean;
  notifyOnUpdatedContent: boolean;
  notifyOnRemovedContent: boolean;
  additionalIndustries: string[];
};

type Step = 'form' | 'import-progress' | 'review' | 'success';

export type ImportResultItem = {
  url: string;
  title: string;
  description?: string;
  suggestedType: string;
  industry?: string;
  department?: string;
};

type Props = {
  initialData: Partial<CompanySetupData> & { email?: string };
  onSaveProfile?: (data: CompanySetupData) => Promise<void>;
};

function parseUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const MAX_SPECIFIC_URLS = 30;

function parseValidUrls(text: string): string[] {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const urls: string[] = [];
  for (const line of lines) {
    try {
      const u = new URL(line.startsWith('http') ? line : `https://${line}`);
      if (u.protocol === 'http:' || u.protocol === 'https:') urls.push(u.toString());
    } catch {
      // skip invalid
    }
    if (urls.length >= MAX_SPECIFIC_URLS) break;
  }
  return urls;
}

export function CompanySetupWizard({ initialData, onSaveProfile: onSaveProfileProp }: Props) {
  const router = useRouter();
  const onSaveProfile = useCallback(
    async (data: CompanySetupData) => {
      if (onSaveProfileProp) {
        await onSaveProfileProp(data);
        return;
      }
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName.trim() || null,
          companyWebsite: data.companyWebsite.trim() || null,
          companyIndustry: data.companyIndustry || null,
          primaryIndustrySellTo: data.primaryIndustrySellTo || null,
          contentRefreshFrequency: data.contentRefreshFrequency || null,
          contentRefreshNextAt: data.contentRefreshNextAt || null,
          notifyOnNewContent: data.notifyOnNewContent,
          notifyOnUpdatedContent: data.notifyOnUpdatedContent,
          notifyOnRemovedContent: data.notifyOnRemovedContent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to save');
      }
    },
    [onSaveProfileProp]
  );
  const [step, setStep] = useState<Step>('form');
  const [importMode, setImportMode] = useState<'full_website' | 'specific_urls' | null>(null);
  const [specificUrlsText, setSpecificUrlsText] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number } | null>(null);
  const [importSource, setImportSource] = useState<'full_website' | 'specific_urls'>('full_website');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importProgress, setImportProgress] = useState<Array<{ step: number; message: string }>>([]);
  const [importResults, setImportResults] = useState<ImportResultItem[]>([]);
  const [selectedReviewIndices, setSelectedReviewIndices] = useState<number[]>([]);
  const [successStats, setSuccessStats] = useState<{ created: number } | null>(null);
  const [data, setData] = useState<CompanySetupData>({
    companyName: initialData.companyName ?? '',
    companyWebsite: initialData.companyWebsite ?? '',
    companyIndustry: initialData.companyIndustry ?? '',
    primaryIndustrySellTo: initialData.primaryIndustrySellTo ?? '',
    contentRefreshFrequency: initialData.contentRefreshFrequency ?? 'weekly',
    contentRefreshNextAt: initialData.contentRefreshNextAt ?? null,
    notifyOnNewContent: initialData.notifyOnNewContent ?? true,
    notifyOnUpdatedContent: initialData.notifyOnUpdatedContent ?? true,
    notifyOnRemovedContent: initialData.notifyOnRemovedContent ?? false,
    additionalIndustries: initialData.additionalIndustries ?? [],
  });

  const update = useCallback((partial: Partial<CompanySetupData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const isValid =
    data.companyName.trim() !== '' &&
    data.companyWebsite.trim() !== '' &&
    data.companyIndustry !== '' &&
    data.primaryIndustrySellTo !== '';

  const domain = data.companyWebsite.trim() ? parseUrl(data.companyWebsite) : 'your website';
  const primaryLabel =
    PRIMARY_INDUSTRY_SELL_TO_OPTIONS.find((o) => o.value === data.primaryIndustrySellTo)?.label ??
    data.primaryIndustrySellTo;

  const handleContinueToImport = async () => {
    if (!isValid) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSaveProfile(data);
      setImportSource('full_website');
      setStep('import-progress');
      setImporting(true);
      setImportProgress([{ step: 1, message: 'Starting crawl...' }]);
      const website = data.companyWebsite.trim().startsWith('http') ? data.companyWebsite.trim() : `https://${data.companyWebsite.trim()}`;
      const res = await fetch('/api/company-setup/smart-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          primaryIndustry: data.primaryIndustrySellTo,
          additionalIndustries: data.additionalIndustries,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Import failed');
      setImportProgress(Array.isArray(json.progress) ? json.progress : []);
      setImportResults(Array.isArray(json.results) ? json.results : []);
      setSelectedReviewIndices((Array.isArray(json.results) ? json.results : []).map((_: unknown, i: number) => i));
      setStep('review');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Import failed' });
      setStep('form');
    } finally {
      setSaving(false);
      setImporting(false);
    }
  };

  const handleSkipAndAddContentLater = async () => {
    if (!isValid) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSaveProfile(data);
      router.push('/dashboard/content-library');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateToContentLibrary = async () => {
    if (!isValid) {
      router.push('/dashboard/content-library');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSaveProfile(data);
      router.push('/dashboard/content-library');
    } catch {
      setMessage({ type: 'error', text: 'Failed to save company info' });
    } finally {
      setSaving(false);
    }
  };

  const handleImportSpecificUrls = async () => {
    const validUrls = parseValidUrls(specificUrlsText);
    if (!isValid || validUrls.length === 0) {
      setMessage({ type: 'error', text: 'Fill company basics and add at least one valid URL (one per line).' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSaveProfile(data);
      setImportSource('specific_urls');
      setStep('import-progress');
      setBatchProgress({ total: validUrls.length, done: 0 });
      const res = await fetch('/api/content-library/batch-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Batch import failed');
      }
      if (!res.body) {
        throw new Error('No response stream');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              total?: number;
              index?: number;
              saved?: number;
              failed?: number;
              message?: string;
            };
            if (event.type === 'started' && typeof event.total === 'number') {
              setBatchProgress({ total: event.total, done: 0 });
            } else if (event.type === 'page' && typeof event.index === 'number') {
              setBatchProgress((prev) => (prev ? { ...prev, done: event.index! } : null));
            } else if (event.type === 'complete') {
              setBatchProgress(null);
              setSuccessStats({ created: event.saved ?? 0 });
              setStep('success');
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Import error');
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message === 'Import error') throw parseErr;
          }
        }
      }
      setBatchProgress(null);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Import failed' });
      setStep('form');
      setBatchProgress(null);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const toApprove = selectedReviewIndices.map((i) => importResults[i]).filter(Boolean);
    if (toApprove.length === 0) return;
    setApproving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/company-setup/smart-import/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toApprove }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Approve failed');
      setSuccessStats({ created: json.created ?? toApprove.length });
      setStep('success');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Approve failed' });
    } finally {
      setApproving(false);
    }
  };

  if (step === 'import-progress') {
    const isSpecificUrls = importSource === 'specific_urls';
    const progressTotal = isSpecificUrls ? batchProgress?.total ?? 0 : 0;
    const progressDone = isSpecificUrls ? batchProgress?.done ?? 0 : 0;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isSpecificUrls
            ? `Importing URLs (${progressDone} of ${progressTotal})`
            : `Importing Content from ${domain}`}
        </h1>
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          {isSpecificUrls ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Scraping and extracting content from your URLs…
              </p>
              <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: progressTotal > 0 ? `${Math.round((progressDone / progressTotal) * 100)}%` : '50%',
                  }}
                />
              </div>
            </>
          ) : importing ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Analyzing {domain}...</p>
              <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded overflow-hidden">
                <div className="h-full bg-amber-500 animate-pulse w-3/4" />
              </div>
            </>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {importProgress.map((p, i) => (
                <li key={i}>Step {p.step}: {p.message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (step === 'review') {
    const byType = importResults.reduce<Record<string, ImportResultItem[]>>((acc, item) => {
      const t = item.suggestedType || 'Other';
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Imported Content</h1>
        <p className="text-gray-600 dark:text-gray-400">
          We found {importResults.length} {primaryLabel.toLowerCase()}-related pages.
        </p>
        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {message.text}
          </div>
        )}
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setSelectedReviewIndices(importResults.map((_, i) => i))}>Select All</Button>
          <Button variant="outline" onClick={() => setSelectedReviewIndices([])}>Deselect All</Button>
          <Button onClick={handleApprove} disabled={approving || selectedReviewIndices.length === 0}>
            {approving ? 'Approving…' : `Approve & Continue (${selectedReviewIndices.length})`}
          </Button>
        </div>
        <div className="space-y-4">
          {Object.entries(byType).map(([type, items]) => (
            <section key={type} className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{type} ({items.length})</h2>
              <ul className="space-y-2">
                {items.map((item, idx) => {
                  const globalIdx = importResults.indexOf(item);
                  const checked = selectedReviewIndices.includes(globalIdx);
                  return (
                    <li key={globalIdx} className="flex items-start gap-3 p-2 rounded border border-gray-100 dark:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedReviewIndices((prev) => checked ? prev.filter((i) => i !== globalIdx) : [...prev, globalIdx])}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                        <div className="text-xs text-gray-500 truncate">{item.url}</div>
                        {item.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
          <Button onClick={handleApprove} disabled={approving || selectedReviewIndices.length === 0}>
            {approving ? 'Approving…' : `Approve & Continue (${selectedReviewIndices.length})`}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Setup complete!</h1>
        <p className="text-gray-600 dark:text-gray-400">Your content library is ready to use.</p>
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 text-left">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Your company data</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{successStats?.created ?? 0} items added.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Auto-refresh: {data.contentRefreshFrequency || 'Weekly'}. Notifications: {data.notifyOnNewContent ? 'Enabled' : 'Off'} ({initialData.email ?? 'your email'}).</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 text-left">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">What&apos;s next?</h2>
          <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
            <li>Add your first target company (the account you want to engage)</li>
            <li>AI will research the account and create personalized content using your library</li>
            <li>Generate landing pages in minutes</li>
          </ol>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/dashboard/companies/new"><Button>Add your first target company</Button></Link>
            <Link href="/dashboard"><Button variant="outline">Go to Dashboard</Button></Link>
            <Link href="/dashboard/content-library"><Button variant="outline">View your company data</Button></Link>
            <Link href="/dashboard/content-library"><Button variant="outline">Add more content</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Set up your company</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Tell us about your company so AI can personalize campaigns for your target companies.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go to Dashboard
        </Link>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Step 1 of 3: Your company basics */}
      <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Step 1 of 3: Your company basics
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name *
            </label>
            <Input
              id="companyName"
              value={data.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              placeholder="Your company name"
              className="max-w-md bg-white dark:bg-zinc-700 dark:border-zinc-600"
            />
          </div>
          <div>
            <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Website *
            </label>
            <Input
              id="companyWebsite"
              type="url"
              value={data.companyWebsite}
              onChange={(e) => update({ companyWebsite: e.target.value })}
              placeholder="https://example.com"
              className="max-w-md bg-white dark:bg-zinc-700 dark:border-zinc-600"
            />
          </div>
          <div>
            <label htmlFor="companyIndustry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Industry *
            </label>
            <select
              id="companyIndustry"
              value={data.companyIndustry}
              onChange={(e) => update({ companyIndustry: e.target.value })}
              className="w-full max-w-md rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100"
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
            <label htmlFor="primaryIndustry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Primary Industry You Sell To *
            </label>
            <select
              id="primaryIndustry"
              value={data.primaryIndustrySellTo}
              onChange={(e) => update({ primaryIndustrySellTo: e.target.value })}
              className="w-full max-w-md rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select target industry</option>
              {PRIMARY_INDUSTRY_SELL_TO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {data.primaryIndustrySellTo && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                We&apos;ll focus on importing your {primaryLabel.toLowerCase()}-related content. You can add other industries later.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Step 2 of 3: Import Your Content */}
      <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Step 2 of 3: Import your content
        </h2>
        {importMode === 'specific_urls' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paste URLs below, one per line. We&apos;ll scrape and add them to your library (max {MAX_SPECIFIC_URLS}).
            </p>
            <textarea
              value={specificUrlsText}
              onChange={(e) => setSpecificUrlsText(e.target.value)}
              placeholder="https://example.com/page1
https://example.com/page2"
              rows={6}
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {parseValidUrls(specificUrlsText).length} valid URL{parseValidUrls(specificUrlsText).length !== 1 ? 's' : ''} (max {MAX_SPECIFIC_URLS})
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setImportMode(null)}>
                Back
              </Button>
              <Button
                onClick={handleImportSpecificUrls}
                disabled={!isValid || saving || parseValidUrls(specificUrlsText).length === 0}
              >
                {saving ? 'Importing…' : 'Import these URLs'}
              </Button>
            </div>
          </div>
        ) : (
          <>
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Quick Start: Smart Website Import (Recommended)
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            We&apos;ll automatically scrape {domain} for {primaryLabel.toLowerCase()}-related content and organize it into your library.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>Product descriptions and features</li>
            <li>Pricing information (if publicly available)</li>
            <li>Case studies and customer success stories</li>
            <li>Events and webinars</li>
            <li>Industry playbooks and messaging</li>
            <li>Use cases and solution guides</li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estimated time: 2–3 minutes · Expected pages: 50–100
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">————— OR —————</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleNavigateToContentLibrary}>
            Upload Files
          </Button>
          <Button variant="outline" onClick={() => setImportMode('specific_urls')}>
            Add Specific URLs
          </Button>
          <Button variant="outline" onClick={handleNavigateToContentLibrary}>
            Enter Text
          </Button>
        </div>
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            Advanced: Import Multiple Industries
          </summary>
          <div className="mt-3 space-y-2 pl-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you sell to multiple industries, select additional ones:
            </p>
            <div className="flex flex-wrap gap-4">
              {ADDITIONAL_INDUSTRIES.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.additionalIndustries.includes(o.value)}
                    onChange={(e) => {
                      update({
                        additionalIndustries: e.target.checked
                          ? [...data.additionalIndustries, o.value]
                          : data.additionalIndustries.filter((i) => i !== o.value),
                      });
                    }}
                    className="rounded border-gray-300 dark:border-zinc-600"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Note: Each additional industry adds ~50–100 pages and increases import time by ~2 minutes.
            </p>
          </div>
        </details>
          </>
        )}
      </section>

      {/* Step 3 of 3: Keep Content Fresh */}
      <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Step 3 of 3: Keep content fresh
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Auto-refresh your content library to keep it current.
        </p>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            How often should we check for updates?
          </label>
          <div className="space-y-2">
            {REFRESH_FREQUENCY_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  value={o.value}
                  checked={data.contentRefreshFrequency === o.value}
                  onChange={() => update({ contentRefreshFrequency: o.value })}
                  className="mt-1"
                />
                <div>
                  <span className="text-gray-900 dark:text-gray-100">{o.label}</span>
                  {o.hint && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">({o.hint})</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">We&apos;ll notify you when:</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.notifyOnNewContent}
              onChange={(e) => update({ notifyOnNewContent: e.target.checked })}
              className="rounded border-gray-300 dark:border-zinc-600"
            />
            New content is found (products, case studies, events)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.notifyOnUpdatedContent}
              onChange={(e) => update({ notifyOnUpdatedContent: e.target.checked })}
              className="rounded border-gray-300 dark:border-zinc-600"
            />
            Existing content is updated (pricing, descriptions)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.notifyOnRemovedContent}
              onChange={(e) => update({ notifyOnRemovedContent: e.target.checked })}
              className="rounded border-gray-300 dark:border-zinc-600"
            />
            Content is removed from your website
          </label>
        </div>
        {initialData.email && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Email notifications to: {initialData.email}
          </p>
        )}
      </section>

      {/* What happens after setup */}
      <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">What happens after setup?</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>We&apos;ll import your {primaryLabel.toLowerCase()} content from your website</li>
          <li>AI will organize it into categories (products, case studies, events, messaging, etc.)</li>
          <li>You&apos;ll review and approve the imported content</li>
          <li>When you create campaigns for target accounts, AI will use this content to generate personalized landing pages and messaging</li>
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline">Cancel</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkipAndAddContentLater} disabled={!isValid || saving}>
            Skip and add content later
          </Button>
          <Button onClick={handleContinueToImport} disabled={!isValid || saving}>
            {saving ? 'Saving…' : 'Continue to Import →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

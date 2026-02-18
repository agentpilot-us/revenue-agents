'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CampaignPagePreview, type PageSections } from '@/app/components/company/CampaignPagePreview';

export type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  departmentId: string | null;
  department: { id: string; customName: string | null; type: string } | null;
  headline: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Draft from generate-draft API (optimistic preview, not saved). */
type LandingPageDraft = {
  departmentId: string | null;
  segmentName: string;
  headline: string;
  body: string;
  pageSections: PageSections | null;
};

/** Result item from approve-draft API. */
export type ApprovedCampaignItem = { id: string; slug: string; url: string; segmentName: string; departmentId: string | null };

export type DepartmentOption = { id: string; customName: string | null; type: string };

type Props = {
  companyId: string;
  companyName: string;
  initialCampaigns: CampaignItem[];
  departments: DepartmentOption[];
};

const TYPES = [
  { value: 'landing_page', label: 'Landing page' },
  { value: 'event_invite', label: 'Event invite' },
  { value: 'demo', label: 'Demo' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'other', label: 'Other' },
];

function deptLabel(d: { customName: string | null; type: string }) {
  return d.customName || d.type.replace(/_/g, ' ');
}

export function CampaignsTab({
  companyId,
  companyName,
  initialCampaigns,
  departments,
}: Props) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create landing page (AI-generated) flow
  const [showCreateLanding, setShowCreateLanding] = useState(false);
  const [landingScope, setLandingScope] = useState<'company' | 'segments'>('company');
  const [landingDepartmentIds, setLandingDepartmentIds] = useState<string[]>([]);
  const [landingOptions, setLandingOptions] = useState({
    includeFutureEvents: false,
    addCaseStudy: false,
    showSuccessStory: false,
  });
  const [landingDrafts, setLandingDrafts] = useState<LandingPageDraft[]>([]);
  const [landingGenerating, setLandingGenerating] = useState(false);
  const [landingApproving, setLandingApproving] = useState(false);
  const [landingApproved, setLandingApproved] = useState<ApprovedCampaignItem[] | null>(null);
  const [selectedDraftIndexes, setSelectedDraftIndexes] = useState<number[]>([]);
  const [landingActiveTab, setLandingActiveTab] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Delete this campaign link?')) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns/${campaignId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      await fetchCampaigns();
      setMessage({ type: 'success', text: 'Campaign deleted.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Delete failed' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            AI Powered Custom Sales Pages + Chat
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setShowCreateLanding((v) => !v);
                if (showAdd) setShowAdd(false);
              }}
              variant={showCreateLanding ? 'outline' : 'default'}
            >
              {showCreateLanding ? 'Cancel' : 'Create landing page'}
            </Button>
            <Button
              onClick={() => {
                setShowAdd((v) => !v);
                if (showCreateLanding) setShowCreateLanding(false);
              }}
              variant={showAdd ? 'outline' : 'default'}
            >
              {showAdd ? 'Cancel' : 'Add sales page'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create a custom sales page with chat. Configure headline, body, and CTA, then launch to get a shareable URL. New leads are tracked and pushed to your CRM nightly.
        </p>

        {message && (
          <div
            className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}
          >
            {message.text}
          </div>
        )}

        {showCreateLanding && !landingApproved && (
          <CreateLandingPageFlow
            companyId={companyId}
            companyName={companyName}
            departments={departments}
            scope={landingScope}
            setScope={setLandingScope}
            departmentIds={landingDepartmentIds}
            setDepartmentIds={setLandingDepartmentIds}
            options={landingOptions}
            setOptions={setLandingOptions}
            drafts={landingDrafts}
            setDrafts={setLandingDrafts}
            generating={landingGenerating}
            setGenerating={setLandingGenerating}
            approving={landingApproving}
            setApproving={setLandingApproving}
            onApproved={(campaigns) => {
              setLandingApproved(campaigns);
              fetchCampaigns();
            }}
            onError={(err) => setMessage({ type: 'error', text: err })}
            selectedDraftIndexes={selectedDraftIndexes}
            setSelectedDraftIndexes={setSelectedDraftIndexes}
            activeTab={landingActiveTab}
            setActiveTab={setLandingActiveTab}
            deptLabel={deptLabel}
          />
        )}

        {showCreateLanding && landingApproved && landingApproved.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Landing pages live</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">Share these URLs:</p>
            <ul className="space-y-2 mb-3">
              {landingApproved.map((c) => (
                <li key={c.id} className="flex items-center gap-2 flex-wrap">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-md">
                    {c.url}
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(c.url)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Copy
                  </button>
                  {c.segmentName && <span className="text-xs text-gray-500 dark:text-gray-400">({c.segmentName})</span>}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const all = landingApproved!.map((c) => c.url).join('\n');
                  navigator.clipboard.writeText(all);
                  setMessage({ type: 'success', text: 'All URLs copied.' });
                }}
              >
                Copy all URLs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLandingApproved(null);
                  setLandingDrafts([]);
                  setShowCreateLanding(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {showAdd && (
          <AddCampaignForm
            companyId={companyId}
            departments={departments}
            onSuccess={() => {
              setShowAdd(false);
              fetchCampaigns();
              setMessage({ type: 'success', text: 'Campaign added.' });
            }}
            onError={(err) => setMessage({ type: 'error', text: err })}
          />
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No sales pages yet. Add one to get a shareable URL with landing page and chat. Leads are captured and pushed to your CRM nightly.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-zinc-600">
            {campaigns.map((c) => (
              <li key={c.id} className="py-3 first:pt-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{c.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {c.department ? deptLabel(c.department) : 'Account'} · {c.type.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-md"
                    >
                      {c.url}
                    </a>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(c.url)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    href={`/dashboard/companies/${companyId}/campaigns/${c.id}/qr-codes`}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:underline"
                  >
                    QR Codes
                  </Link>
                  <Link
                    href={`/go/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Launch / Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddCampaignForm({
  companyId,
  departments,
  onSuccess,
  onError,
}: {
  companyId: string;
  departments: DepartmentOption[];
  onSuccess: () => void;
  onError: (err: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('landing_page');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [hostOnVercel, setHostOnVercel] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onError('Title is required');
      return;
    }
    if (!hostOnVercel && !externalUrl.trim()) {
      onError('Enter an external URL or choose Host on Vercel');
      return;
    }
    setSubmitting(true);
    onError('');
    try {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'campaign';
      const res = await fetch(`/api/companies/${companyId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug,
          type,
          description: description.trim() || undefined,
          hostOnVercel: hostOnVercel || undefined,
          url: !hostOnVercel && externalUrl.trim() ? externalUrl.trim() : undefined,
          departmentId: departmentId || null,
          headline: headline.trim() || null,
          body: body.trim() || null,
          ctaLabel: ctaLabel.trim() || null,
          ctaUrl: ctaUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg border border-gray-200 dark:border-zinc-600">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          placeholder="e.g. GTC Session Invite"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Segment (optional)</label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
        >
          <option value="">Account (all segments)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{deptLabel(d)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          placeholder="Short description"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={hostOnVercel}
              onChange={() => { setHostOnVercel(true); setExternalUrl(''); }}
            />
            <span>Host on this app (Vercel)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!hostOnVercel}
              onChange={() => setHostOnVercel(false)}
            />
            <span>External URL</span>
          </label>
          {!hostOnVercel && (
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              placeholder="https://..."
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headline (optional)</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CTA label (optional)</label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body (optional)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CTA URL (optional)</label>
        <input
          type="url"
          value={ctaUrl}
          onChange={(e) => setCtaUrl(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Add campaign'}
      </Button>
    </form>
  );
}

export function CreateLandingPageFlow({
  companyId,
  companyName,
  departments,
  scope,
  setScope,
  departmentIds,
  setDepartmentIds,
  options,
  setOptions,
  drafts,
  setDrafts,
  generating,
  setGenerating,
  approving,
  setApproving,
  onApproved,
  onError,
  selectedDraftIndexes,
  setSelectedDraftIndexes,
  activeTab,
  setActiveTab,
  deptLabel,
}: {
  companyId: string;
  companyName: string;
  departments: DepartmentOption[];
  scope: 'company' | 'segments';
  setScope: (v: 'company' | 'segments') => void;
  departmentIds: string[];
  setDepartmentIds: (v: string[]) => void;
  options: { includeFutureEvents: boolean; addCaseStudy: boolean; showSuccessStory: boolean };
  setOptions: (v: typeof options) => void;
  drafts: LandingPageDraft[];
  setDrafts: (v: LandingPageDraft[]) => void;
  generating: boolean;
  setGenerating: (v: boolean) => void;
  approving: boolean;
  setApproving: (v: boolean) => void;
  onApproved: (campaigns: ApprovedCampaignItem[]) => void;
  onError: (err: string) => void;
  selectedDraftIndexes: number[];
  setSelectedDraftIndexes: (v: number[]) => void;
  activeTab: number;
  setActiveTab: (v: number) => void;
  deptLabel: (d: { customName: string | null; type: string }) => string;
}) {
  const handleGenerate = async () => {
    if (scope === 'segments' && (departmentIds.length < 1 || departmentIds.length > 5)) {
      onError('Select 1–5 segments when creating by segment.');
      return;
    }
    setGenerating(true);
    onError('');
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          departmentIds: scope === 'segments' ? departmentIds : undefined,
          options,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate drafts');
      if (!Array.isArray(data.drafts)) throw new Error('Invalid response');
      setDrafts(data.drafts);
      setSelectedDraftIndexes(data.drafts.map((_: unknown, i: number) => i));
      setActiveTab(0);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to generate drafts');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (indexesToApprove: number[]) => {
    if (indexesToApprove.length === 0) return;
    const toApprove = indexesToApprove.map((i) => drafts[i]).filter(Boolean);
    if (toApprove.length === 0) return;
    setApproving(true);
    onError('');
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns/approve-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drafts: toApprove.map((d) => ({
            departmentId: d.departmentId,
            segmentName: d.segmentName,
            headline: d.headline,
            body: d.body,
            pageSections: d.pageSections ?? undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      if (!Array.isArray(data.campaigns)) throw new Error('Invalid response');
      onApproved(data.campaigns);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const toggleDraftSelection = (index: number) => {
    setSelectedDraftIndexes(
      selectedDraftIndexes.includes(index)
        ? selectedDraftIndexes.filter((i) => i !== index)
        : [...selectedDraftIndexes, index]
    );
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg border border-gray-200 dark:border-zinc-600">
      <h3 className="font-medium text-gray-900 dark:text-gray-100">Create landing page</h3>

      {drafts.length === 0 ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scope</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scope === 'company'}
                  onChange={() => setScope('company')}
                />
                By company (one page for the whole account)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scope === 'segments'}
                  onChange={() => setScope('segments')}
                />
                By segment (1–5 pages)
              </label>
            </div>
          </div>
          {scope === 'segments' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Segments (select 1–5)</label>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => {
                  const checked = departmentIds.includes(d.id);
                  const canAdd = departmentIds.length < 5 || checked;
                  return (
                    <label key={d.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) setDepartmentIds(departmentIds.filter((id) => id !== d.id));
                          else if (canAdd) setDepartmentIds([...departmentIds, d.id].slice(0, 5));
                        }}
                        disabled={!canAdd && !checked}
                      />
                      <span>{deptLabel(d)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.includeFutureEvents}
                  onChange={(e) => setOptions({ ...options, includeFutureEvents: e.target.checked })}
                />
                Include future events
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.addCaseStudy}
                  onChange={(e) => setOptions({ ...options, addCaseStudy: e.target.checked })}
                />
                Add a case study
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.showSuccessStory}
                  onChange={(e) => setOptions({ ...options, showSuccessStory: e.target.checked })}
                />
                Show a success story
              </label>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating || (scope === 'segments' && departmentIds.length === 0)}>
            {generating ? 'Generating…' : scope === 'company' ? 'Make page' : 'Generate pages'}
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-600 overflow-x-auto">
              {drafts.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
                    activeTab === i
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {d.segmentName}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove(selectedDraftIndexes)}
                disabled={approving || selectedDraftIndexes.length === 0}
              >
                {approving ? 'Approving…' : `Approve selected (${selectedDraftIndexes.length})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove(drafts.map((_, i) => i))}
                disabled={approving}
              >
                Approve all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDrafts([])}
                disabled={approving}
              >
                Regenerate all
              </Button>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
            {drafts.map((draft, i) => (
              <div
                key={i}
                className={activeTab === i ? 'block' : 'hidden'}
                style={{ minHeight: 320 }}
              >
                <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-700/50">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDraftIndexes.includes(i)}
                      onChange={() => toggleDraftSelection(i)}
                    />
                    Select for approval
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove([i])}
                      disabled={approving}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDrafts(drafts.filter((_, j) => j !== i));
                        setSelectedDraftIndexes(selectedDraftIndexes.filter((j) => j !== i).map((j) => (j > i ? j - 1 : j)));
                        if (activeTab >= drafts.length - 1 && activeTab > 0) setActiveTab(activeTab - 1);
                        else if (activeTab === i && drafts.length > 1) setActiveTab(Math.max(0, i - 1));
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <CampaignPagePreview
                    companyName={companyName}
                    segmentName={draft.segmentName || null}
                    headline={draft.headline}
                    body={draft.body}
                    pageSections={draft.pageSections}
                    isPreview
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

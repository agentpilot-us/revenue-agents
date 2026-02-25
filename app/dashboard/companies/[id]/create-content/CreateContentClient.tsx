'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateLandingPageFlow, type ApprovedCampaignItem, type DepartmentOption, type LandingPageDraft } from '@/app/components/company/CampaignsTab';

// RESTORED: talking_points added back alongside email, linkedin, custom_url
type ContentType = 'email' | 'linkedin' | 'custom_url' | 'talking_points';

function deptLabel(d: { customName: string | null; type: string }) {
  return d.customName || d.type.replace(/_/g, ' ');
}

type Props = {
  companyId: string;
  companyName: string;
  hasIntelligence: boolean;
  hasResearch: boolean;
  departments: DepartmentOption[];
};

const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: 'email', label: 'Email', description: 'Cold outreach or follow-up email' },
  { value: 'linkedin', label: 'LinkedIn', description: 'Connection request or InMail' },
  { value: 'talking_points', label: 'Talking Points', description: 'Pre-meeting prep for reps' },
  { value: 'custom_url', label: 'Custom URL / landing page', description: 'Landing page copy' },
];

export function CreateContentClient({
  companyId,
  companyName,
  hasIntelligence,
  hasResearch,
  departments,
}: Props) {
  const searchParams = useSearchParams();

  const [contentType, setContentType] = useState<ContentType>('email');
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-fill from signal context when arriving from "Run play" CTA on dashboard
  // URL params: signalTitle, signalSummary, playId, segmentName
  useEffect(() => {
    const signalTitle = searchParams.get('signalTitle');
    const signalSummary = searchParams.get('signalSummary');
    const playId = searchParams.get('playId');
    const segmentName = searchParams.get('segmentName');

    if (!signalTitle) return;

    // Pick the best default content type for the play
    if (playId === 're_engagement' || playId === 'feature_release') {
      setContentType('email');
    } else if (playId === 'champion_enablement') {
      setContentType('talking_points');
    }

    // Build a pre-filled prompt that carries the signal context
    const parts: string[] = [];
    if (segmentName) parts.push(`For the ${segmentName} buying group.`);
    parts.push(`Signal: ${signalTitle}.`);
    if (signalSummary) parts.push(signalSummary);
    if (playId === 're_engagement') {
      parts.push('Use this signal as the reason to re-engage — not a generic check-in.');
    } else if (playId === 'feature_release') {
      parts.push('Connect this signal to why the new feature matters for this team right now.');
    } else if (playId === 'event_invite') {
      parts.push('Use this signal as context for why this event is timely for this account.');
    } else if (playId === 'champion_enablement') {
      parts.push('Generate talking points for a pre-meeting prep sheet — help the rep prepare to run this meeting.');
    }

    setPrompt(parts.join(' '));
  }, [searchParams]);

  // Create landing page flow state
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
  const [landingError, setLandingError] = useState('');

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Enter a prompt (e.g. initial outreach, event invite).');
      return;
    }
    setError(null);
    setContent(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/create-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? `${data.error ?? 'Error'}: ${data.details}`
          : (data.error ?? 'Failed to generate content');
        setError(msg);
        return;
      }
      setContent(data.content ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed');
    }
  };

  // Show signal context banner when arriving from a play CTA
  const signalTitle = searchParams.get('signalTitle');
  const segmentName = searchParams.get('segmentName');
  const playId = searchParams.get('playId');

  return (
    <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-white mb-2">Create content</h1>
      <p className="text-slate-400 text-sm mb-6">
        Generate copy for {companyName} using your company setup and this account&apos;s
        intelligence. Choose a content type and describe what you need.
      </p>

      {/* Signal context banner — shown when arriving from a play CTA */}
      {signalTitle && (
        <div className="mb-6 p-4 rounded-lg bg-blue-900/30 border border-blue-700 text-blue-200 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">⚡</span>
            <div>
              <p className="font-medium text-blue-100">
                {playId ? `Running ${playId.replace(/_/g, ' ')} play` : 'Signal context loaded'}
                {segmentName ? ` for ${segmentName}` : ''}
              </p>
              <p className="mt-0.5 text-blue-300">Signal: {signalTitle}</p>
              <p className="mt-1 text-blue-400 text-xs">
                Prompt pre-filled below — edit or generate directly.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasIntelligence && (
        <div className="mb-6 p-4 rounded-lg bg-amber-900/30 border border-amber-700 text-amber-200 text-sm">
          Complete Account Intelligence first so the agent can use research and account messaging.{' '}
          <Link
            href={`/dashboard/companies/${companyId}/intelligence`}
            className="underline font-medium"
          >
            Set up Account Intelligence
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Content type</label>
          <div className="flex flex-wrap gap-3">
            {CONTENT_TYPES.map(({ value, label, description }) => (
              <label
                key={value}
                className={`flex items-start gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                  contentType === value
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="contentType"
                  value={value}
                  checked={contentType === value}
                  onChange={() => setContentType(value)}
                  className="mt-0.5 rounded border-slate-500 bg-zinc-700 text-blue-500"
                />
                <div>
                  <span className="text-slate-200 text-sm font-medium">{label}</span>
                  <p className="text-slate-400 text-xs mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Agent prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              contentType === 'talking_points'
                ? 'e.g. pre-meeting prep for VP of RevOps, objection handling for budget conversation'
                : 'e.g. initial outreach, event invite, product intro for autonomous vehicles team'
            }
            rows={3}
            className="w-full rounded-lg border border-slate-600 bg-zinc-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!hasIntelligence}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!hasIntelligence || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Generating…' : 'Generate content'}
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {content && (
          <div className="mt-6 pt-6 border-t border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Generated content</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-slate-600 text-slate-200 hover:bg-zinc-700"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </Button>
            </div>
            <pre className="p-4 rounded-lg bg-zinc-900 border border-slate-600 text-slate-200 text-sm whitespace-pre-wrap font-sans overflow-x-auto max-h-[400px] overflow-y-auto">
              {content}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-2">Create landing page + chat</h2>
        <p className="text-slate-400 text-sm mb-4">
          Generate a custom sales page with AI chat. Configure headline and body, then launch to get
          a shareable URL. New leads are pushed to your CRM nightly.
        </p>
        {!hasResearch ? (
          <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-700 text-amber-200 text-sm">
            Research this company first so we can personalize the landing page.{' '}
            <Link
              href={`/dashboard/companies/${companyId}/intelligence`}
              className="underline font-medium"
            >
              Research target company
            </Link>
          </div>
        ) : (
          <>
            {landingError && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">
                {landingError}
              </div>
            )}
            {landingApproved && landingApproved.length > 0 ? (
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Landing pages live
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  Share these URLs:
                </p>
                <ul className="space-y-2 mb-3">
                  {landingApproved.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 flex-wrap">
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
                        className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Copy
                      </button>
                      {c.segmentName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({c.segmentName})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link href={`/dashboard/companies/${companyId}?tab=campaigns`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-200"
                  >
                    View campaigns
                  </Button>
                </Link>
              </div>
            ) : (
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
                onApproved={setLandingApproved}
                onError={setLandingError}
                selectedDraftIndexes={selectedDraftIndexes}
                setSelectedDraftIndexes={setSelectedDraftIndexes}
                activeTab={landingActiveTab}
                setActiveTab={setLandingActiveTab}
                deptLabel={deptLabel}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-600 flex gap-3">
        <Link href={`/dashboard/companies/${companyId}`}>
          <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-zinc-700">
            Back to company
          </Button>
        </Link>
        <Link href={`/dashboard/companies/${companyId}/contacts`}>
          <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-zinc-700">
            Step 3: Find Contacts
          </Button>
        </Link>
      </div>
    </div>
  );
}

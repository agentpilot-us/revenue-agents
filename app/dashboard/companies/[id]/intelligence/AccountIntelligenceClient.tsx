'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResearchButton } from '@/app/components/company/ResearchButton';
import { ProgressSteps } from '@/app/components/company/ProgressSteps';
import { Button } from '@/components/ui/button';

type Props = {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasMessaging: boolean;
};

export function AccountIntelligenceClient({
  companyId,
  companyName,
  hasResearch,
  hasDepartments,
  hasMessaging,
}: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [oneClickError, setOneClickError] = useState<string | null>(null);

  const handleOneClickResearchAndApply = async () => {
    setOneClickLoading(true);
    setOneClickError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/research`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Research failed');
      if (!data.data) throw new Error('No research data returned');
      const applyRes = await fetch(`/api/companies/${companyId}/apply-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.data),
      });
      const applyData = await applyRes.json();
      if (!applyRes.ok) throw new Error(applyData.error || 'Apply failed');
      router.refresh();
    } catch (e) {
      setOneClickError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setOneClickLoading(false);
    }
  };

  const handleGenerateMessaging = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/account-messaging/generate`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? 'Failed to generate messaging');
      }
      router.refresh();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <ProgressSteps companyId={companyId} companyName={companyName} currentStep={1} />
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/companies/${companyId}`}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Back to {companyName}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Account Intelligence</h1>
        <p className="text-slate-400 mt-1">
          Research the account, create buying segments, and generate messaging in one flow.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 space-y-6">
        {/* Step 1: Research target company */}
        <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">1. Research target company</h2>
              {hasResearch && (
                <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                  Done
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              AI researches the account: basics, initiatives, and product fit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ResearchButton companyId={companyId} companyName={companyName} />
            <Button
              onClick={handleOneClickResearchAndApply}
              disabled={oneClickLoading || hasResearch}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {oneClickLoading ? 'Researching & saving…' : 'Research and set up account intelligence'}
            </Button>
          </div>
          {oneClickError && <p className="text-sm text-red-400 mt-2">{oneClickError}</p>}
        </section>

        {/* Step 2: Create buying segments */}
        <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">2. Create buying segments</h2>
              {hasDepartments && (
                <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                  Done
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Review and approve segments (function or division) and contact titles per segment. These drive LinkedIn research and analytics.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {hasResearch
              ? 'Review in the modal when you run research, or run research again to edit.'
              : 'Run research above first.'}
          </p>
        </section>

        {/* Step 3: Create messaging */}
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">3. Create messaging</h2>
              {hasMessaging && (
                <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                  Done
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Generate messaging for your approved buying segments. Rerun if you add or change segments.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={handleGenerateMessaging}
              disabled={generating || !hasResearch}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
            >
              {generating ? 'Generating…' : hasMessaging ? 'Regenerate messaging' : 'Create messaging'}
            </Button>
            {hasMessaging && (
              <Link href={`/dashboard/companies/${companyId}?tab=messaging`}>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                  View / edit messaging
                </Button>
              </Link>
            )}
            {generateError && (
              <p className="text-sm text-red-400">{generateError}</p>
            )}
          </div>
        </section>
      </div>

      {/* Next Step: Build Contact List (when Step 1 complete) */}
      {hasResearch && hasDepartments && hasMessaging && (
        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 mt-8 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-4 text-green-500 font-semibold">
            <span className="text-green-500" aria-hidden>✓</span>
            <span>Step 1: Account Intelligence — Complete</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Step 2: Build Contact List</h3>
            <p className="text-slate-400 text-sm mb-4">
              Find stakeholders in each department. Import from LinkedIn, paste from a list, or let AI discover them.
            </p>
            <Link href={`/dashboard/companies/${companyId}/contacts`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Build Contact List →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

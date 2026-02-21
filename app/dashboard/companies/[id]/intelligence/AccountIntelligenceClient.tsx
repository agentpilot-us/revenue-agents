'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, X } from 'lucide-react';
import { ResearchButton } from '@/app/components/company/ResearchButton';
import { InlineResearchReviewPanel } from '@/app/components/company/InlineResearchReviewPanel';
import { Button } from '@/components/ui/button';
import type { CompanyResearchData } from '@/lib/research/company-research-schema';

type Props = {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasMessaging: boolean;
  departmentCount: number;
  researchDone?: boolean;
};

export function AccountIntelligenceClient({
  companyId,
  companyName,
  hasResearch,
  hasDepartments,
  hasMessaging,
  departmentCount,
  researchDone = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const step2Ref = useRef<HTMLElement>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pendingResearchData, setPendingResearchData] = useState<CompanyResearchData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const showBanner = researchDone && hasResearch && !bannerDismissed;

  // Scroll to step 2 when landing with ?researchDone=1; clear URL so banner doesn't reappear on refresh.
  // bannerDismissed intentionally omitted from deps — we only want to run once when researchDone is true.
  useEffect(() => {
    if (!researchDone || !hasResearch) return;
    step2Ref.current?.scrollIntoView({ behavior: 'smooth' });
    router.replace(pathname ?? `/dashboard/companies/${companyId}/intelligence`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on researchDone; banner stays until user dismisses or URL replace hides it
  }, [researchDone, hasResearch, pathname, companyId, router]);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    router.replace(pathname ?? `/dashboard/companies/${companyId}/intelligence`);
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

  // Step 1 incomplete: single hero card, one CTA
  if (!hasResearch) {
    return (
      <div className="space-y-8">
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

        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-8">
          <p className="text-lg text-white">
            In about 2 minutes, you&apos;ll have buying segments, personalized messaging for each
            group, and a product fit score — ready to use for outreach.
          </p>
          <ul className="mt-4 space-y-2 text-slate-300 text-sm">
            <li>• Buying segments (departments / divisions)</li>
            <li>• Messaging tailored to each segment</li>
            <li>• Product fit analysis</li>
            <li>• Ready-to-use copy for outreach</li>
          </ul>
          <div className="mt-6">
            <ResearchButton
              companyId={companyId}
              companyName={companyName}
              onComplete={(data) => {
                const parsed = data as CompanyResearchData;
                if (parsed && Array.isArray(parsed.microSegments) && parsed.microSegments.length > 0) {
                  setPendingResearchData(parsed);
                }
              }}
            />
          </div>
          {pendingResearchData && (
            <InlineResearchReviewPanel
              companyId={companyId}
              companyName={companyName}
              researchData={pendingResearchData}
              onSaved={() =>
                router.push(`/dashboard/companies/${companyId}/intelligence?researchDone=1`)
              }
            />
          )}
        </div>
      </div>
    );
  }

  // Step 1 complete: show steps 2 and 3 (step 3 locked until hasDepartments)
  const step1Summary =
    departmentCount > 0
      ? `Research complete — found ${departmentCount} potential buying segment${departmentCount === 1 ? '' : 's'}.`
      : 'Research complete. Review your buying segments below.';

  return (
    <div className="space-y-8">
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
        {/* Step 1 done */}
        <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">1. Research target company</h2>
              <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                Done
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{step1Summary}</p>
          </div>
        </section>

        {/* Research just completed banner */}
        {showBanner && (
          <div
            className="flex items-center justify-between gap-4 rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 text-sm text-slate-200"
            role="status"
          >
            <span>Here&apos;s what we found — review your buying segments below.</span>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="shrink-0 p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Create buying segments */}
        <section ref={step2Ref} className="flex flex-col gap-4 border-b border-slate-700 pb-6">
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
              Review and approve segments (function or division) and contact titles per segment.
              These drive LinkedIn research and analytics.
            </p>
          </div>
          {hasResearch && !hasDepartments && (
            <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              No segments approved yet — review the suggested segments above and approve at least
              one to continue.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ResearchButton
              companyId={companyId}
              companyName={companyName}
              label={hasResearch ? 'Re-run research' : undefined}
              onComplete={(data) => {
                const parsed = data as CompanyResearchData;
                if (parsed && Array.isArray(parsed.microSegments) && parsed.microSegments.length > 0) {
                  setPendingResearchData(parsed);
                }
              }}
            />
            {hasResearch && (
              <span className="text-sm text-slate-500">Update segments.</span>
            )}
          </div>
          {pendingResearchData && (
            <InlineResearchReviewPanel
              companyId={companyId}
              companyName={companyName}
              researchData={pendingResearchData}
              onSaved={() => {
                setPendingResearchData(null);
                router.refresh();
              }}
            />
          )}
        </section>

        {/* Step 3: Create messaging — locked until hasDepartments */}
        <section className="flex flex-wrap items-start justify-between gap-4">
          {!hasDepartments ? (
            <div className="flex items-center gap-3 opacity-70 text-slate-500">
              <Lock className="h-4 w-4 shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-white">3. Create messaging</h2>
                <p className="text-sm mt-0.5">Review segments in step 2 first.</p>
              </div>
            </div>
          ) : (
            <>
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
                  Generate messaging for your approved buying segments. Rerun if you add or change
                  segments.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={handleGenerateMessaging}
                  disabled={generating}
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
            </>
          )}
        </section>
      </div>

      {/* Next Step: Build Contact List */}
      {hasResearch && hasDepartments && hasMessaging && (
        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 mt-8 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-4 text-green-500 font-semibold">
            <span className="text-green-500" aria-hidden>✓</span>
            <span>Step 1: Account Intelligence — Complete</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Step 2: Build Contact List</h3>
            <p className="text-slate-400 text-sm mb-4">
              Find stakeholders in each department. Import from LinkedIn, paste from a list, or let
              AI discover them.
            </p>
            <Link href={`/dashboard/companies/${companyId}?tab=contacts`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Continue →</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

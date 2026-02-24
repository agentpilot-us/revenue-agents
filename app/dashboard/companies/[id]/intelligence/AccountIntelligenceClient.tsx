'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, X, Plus, Trash2 } from 'lucide-react';
import { ResearchButton } from '@/app/components/company/ResearchButton';
import { InlineResearchReviewPanel } from '@/app/components/company/InlineResearchReviewPanel';
import { Button } from '@/components/ui/button';
import type {
  BuyingGroupDetail,
  BuyingGroupSeed,
  CompanyResearchData,
  DiscoverGroupsResult,
} from '@/lib/research/company-research-schema';

type Props = {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasMessaging: boolean;
  departmentCount: number;
  researchDone?: boolean;
  /** Stored goal from last research run; shown in step 1 done state. */
  researchGoal?: string | null;
};

type Step1State = {
  data: DiscoverGroupsResult;
  seeds: BuyingGroupSeed[];
};

export function AccountIntelligenceClient({
  companyId,
  companyName,
  hasResearch,
  hasDepartments,
  hasMessaging,
  departmentCount,
  researchDone = false,
  researchGoal,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const step2Ref = useRef<HTMLElement>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pendingResearchData, setPendingResearchData] = useState<CompanyResearchData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [userGoal, setUserGoal] = useState('');

  // 4-step flow state (when !hasResearch)
  const [step1, setStep1] = useState<Step1State | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [enrichedGroups, setEnrichedGroups] = useState<BuyingGroupDetail[] | null>(null);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [groupsWithProductFit, setGroupsWithProductFit] = useState<BuyingGroupDetail[] | null>(null);

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

  // 4-step flow: no research yet
  if (!hasResearch) {
    const handleDiscover = async () => {
      setStep1Loading(true);
      setStep1Error(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/research/buying-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userGoal: userGoal.trim() || undefined }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Discovery failed');
        if (!json.data?.basics || !Array.isArray(json.data?.groups) || json.data.groups.length === 0) {
          throw new Error('No buying groups returned');
        }
        setStep1({ data: json.data, seeds: json.data.groups });
      } catch (e) {
        setStep1Error(e instanceof Error ? e.message : 'Discovery failed');
      } finally {
        setStep1Loading(false);
      }
    };

    const updateSeed = (id: string, patch: Partial<BuyingGroupSeed>) => {
      if (!step1) return;
      setStep1({
        ...step1,
        seeds: step1.seeds.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      });
    };
    const removeSeed = (id: string) => {
      if (!step1 || step1.seeds.length <= 1) return;
      setStep1({ ...step1, seeds: step1.seeds.filter((s) => s.id !== id) });
    };
    const addSeed = () => {
      if (!step1) return;
      const newId = `seed-${Date.now()}`;
      setStep1({
        ...step1,
        seeds: [
          ...step1.seeds,
          {
            id: newId,
            name: 'New group',
            rationale: '',
            segmentType: 'FUNCTIONAL',
            orgFunction: '',
            divisionOrProduct: null,
          },
        ],
      });
    };

    const handleEnrich = async () => {
      if (!step1?.seeds?.length) return;
      setStep2Loading(true);
      setStep2Error(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/research/group-enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groups: step1.seeds,
            userGoal: userGoal.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Enrichment failed');
        const results = json.results ?? [];
        const okDetails = results
          .filter((r: { ok: boolean; data?: BuyingGroupDetail }) => r.ok && r.data)
          .map((r: { data: BuyingGroupDetail }) => r.data);
        if (okDetails.length === 0) {
          const firstErr = results.find((r: { ok: boolean; error?: string }) => !r.ok);
          throw new Error(firstErr?.error ?? 'No groups enriched');
        }
        setEnrichedGroups(okDetails);
      } catch (e) {
        setStep2Error(e instanceof Error ? e.message : 'Enrichment failed');
      } finally {
        setStep2Loading(false);
      }
    };

    const handleProductFit = async () => {
      if (!enrichedGroups?.length) return;
      setStep3Loading(true);
      setStep3Error(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/research/product-fit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrichedGroups }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Product fit failed');
        setGroupsWithProductFit(json.groups ?? []);
      } catch (e) {
        setStep3Error(e instanceof Error ? e.message : 'Product fit failed');
      } finally {
        setStep3Loading(false);
      }
    };

    const handleSaveAndMessaging = async () => {
      if (!step1?.data?.basics || !groupsWithProductFit?.length) return;
      setGenerating(true);
      setGenerateError(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/apply-research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyBasics: step1.data.basics,
            enrichedGroups: groupsWithProductFit,
            researchGoal: userGoal.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Save failed');
        router.push(`/dashboard/companies/${companyId}/contacts?onboarding=1`);
        router.refresh();
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setGenerating(false);
      }
    };

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
            Discover buying groups, enrich with roles and messaging, then save and generate outreach.
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-8 space-y-6">
          <label className="text-sm text-slate-300 font-medium">
            What are you trying to accomplish?{' '}
            <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={userGoal}
            onChange={(e) => setUserGoal(e.target.value)}
            placeholder="e.g. Target enterprise AEs at Salesforce across Financial Services, Healthcare, and Tech verticals"
            rows={2}
            className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-600 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {!step1 ? (
            <>
              <p className="text-slate-300">
                Step 1: Discover 4–6 buying groups from web research. You can add, remove, or rename
                groups before enriching.
              </p>
              <Button
                onClick={handleDiscover}
                disabled={step1Loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {step1Loading ? 'Discovering…' : 'Discover buying groups'}
              </Button>
              {step1Error && (
                <p className="text-sm text-red-400">{step1Error}</p>
              )}
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 1: Buying groups</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Edit names or rationale, add/remove groups, then continue.
                </p>
                <div className="space-y-2">
                  {step1.seeds.map((seed) => (
                    <div
                      key={seed.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-600 bg-zinc-900/50 p-3"
                    >
                      <input
                        type="text"
                        value={seed.name}
                        onChange={(e) => updateSeed(seed.id, { name: e.target.value })}
                        className="flex-1 min-w-[120px] rounded border border-slate-600 bg-zinc-800 text-slate-200 text-sm px-2 py-1"
                        placeholder="Group name"
                      />
                      <input
                        type="text"
                        value={seed.rationale}
                        onChange={(e) => updateSeed(seed.id, { rationale: e.target.value })}
                        className="flex-1 min-w-[160px] rounded border border-slate-600 bg-zinc-800 text-slate-200 text-sm px-2 py-1"
                        placeholder="Why this group matters"
                      />
                      <button
                        type="button"
                        onClick={() => removeSeed(seed.id)}
                        className="p-1 rounded hover:bg-slate-600 text-slate-400"
                        aria-label="Remove group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addSeed}
                  className="mt-2 text-sm text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add group
                </button>
              </div>

              {!enrichedGroups ? (
                <>
                  <Button
                    onClick={handleEnrich}
                    disabled={step2Loading || step1.seeds.length === 0}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
                  >
                    {step2Loading ? 'Enriching groups…' : 'Looks good — enrich groups'}
                  </Button>
                  {step2Error && <p className="text-sm text-red-400">{step2Error}</p>}
                </>
              ) : !groupsWithProductFit ? (
                <>
                  <p className="text-sm text-green-500">
                    Enriched {enrichedGroups.length} group(s). Value props, roles, and keywords
                    are ready.
                  </p>
                  <Button
                    onClick={handleProductFit}
                    disabled={step3Loading}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
                  >
                    {step3Loading ? 'Scoring product fit…' : 'Continue to product fit'}
                  </Button>
                  {step3Error && <p className="text-sm text-red-400">{step3Error}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm text-green-500">
                    Product fit done. Save segments and generate messaging to finish.
                  </p>
                  <Button
                    onClick={handleSaveAndMessaging}
                    disabled={generating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {generating ? 'Saving…' : 'Save & generate messaging'}
                  </Button>
                  {generateError && <p className="text-sm text-red-400">{generateError}</p>}
                </>
              )}
            </>
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
            {researchGoal?.trim() && (
              <p className="text-sm text-slate-500 mt-1.5">
                Goal: {researchGoal.trim()}
              </p>
            )}
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
              userGoal={researchGoal?.trim() || undefined}
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
              researchGoal={researchGoal?.trim() || undefined}
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

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, X, Plus, Trash2, ChevronLeft, Sparkles, Check, ArrowRight, Users, ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from 'lucide-react';
import { ResearchButton } from '@/app/components/company/ResearchButton';
import { InlineResearchReviewPanel } from '@/app/components/company/InlineResearchReviewPanel';
import type {
  BuyingGroupDetail,
  BuyingGroupSeed,
  CompanyResearchData,
  DiscoverGroupsResult,
} from '@/lib/research/company-research-schema';
import type { DealContext } from '@/lib/types/deal-context';

type CatalogProductOption = { id: string; name: string; slug: string };

type Props = {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasMessaging: boolean;
  departmentCount: number;
  researchDone?: boolean;
  researchGoal?: string | null;
  dealContext?: DealContext;
  catalogProducts: CatalogProductOption[];
  /** When catalog is empty, products from Content Library (Product model) to show as checkboxes. */
  fallbackProducts?: CatalogProductOption[];
};

type Step1State = {
  data: DiscoverGroupsResult;
  seeds: BuyingGroupSeed[];
  perplexitySummary?: string;
};

const INITIAL_DEAL_FORM = (dc?: DealContext) => ({
  productIds: dc?.productIds?.length ? [...dc.productIds] : [] as string[],
  productNames: dc?.productNames?.length ? [...dc.productNames] : [] as string[],
  accountStatus: (dc?.accountStatus ?? 'new') as DealContext['accountStatus'],
  deployedLocation: dc?.deployedLocation ?? '',
  deployedUseCase: dc?.deployedUseCase ?? '',
  hasProvenOutcomes: dc?.hasProvenOutcomes,
  relationshipLocation: dc?.relationshipLocation ?? '',
  dealShape: (dc?.dealShape ?? 'unknown') as DealContext['dealShape'],
  targetDivisions: dc?.targetDivisions?.length ? dc.targetDivisions.slice(0, 6) : [] as string[],
  buyingMotion: (dc?.buyingMotion ?? 'unknown') as DealContext['buyingMotion'],
  committeeName: dc?.committeeName ?? '',
  dealGoal: dc?.dealGoal ?? '',
});

export function AccountIntelligenceClient({
  companyId,
  companyName,
  hasResearch,
  hasDepartments,
  hasMessaging,
  departmentCount,
  researchDone = false,
  researchGoal,
  dealContext: initialDealContext,
  catalogProducts = [],
  fallbackProducts = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const step2Ref = useRef<HTMLElement>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pendingResearchData, setPendingResearchData] = useState<CompanyResearchData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [dealForm, setDealForm] = useState(() => INITIAL_DEAL_FORM(initialDealContext));

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

  // Review step state (between product fit and save)
  const [excludedGroups, setExcludedGroups] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  // Progress messaging for pipeline steps
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const showBanner = researchDone && hasResearch && !bannerDismissed;

  const dealGoal = dealForm.dealGoal.trim() || undefined;
  const usingCatalog = catalogProducts.length > 0;
  const usingFallback = !usingCatalog && fallbackProducts.length > 0;
  const hasProductSelection = usingCatalog ? dealForm.productIds.length > 0 : dealForm.productNames.length > 0;
  const canDiscover =
    hasProductSelection &&
    !!dealForm.accountStatus &&
    !!dealForm.dealShape &&
    !!dealForm.buyingMotion &&
    (usingCatalog || usingFallback);

  // Scroll to step 2 when landing with ?researchDone=1; clear URL so banner doesn't reappear on refresh.
  // bannerDismissed intentionally omitted from deps — we only want to run once when researchDone is true.
  useEffect(() => {
    if (!researchDone || !hasResearch) return;
    step2Ref.current?.scrollIntoView({ behavior: 'smooth' });
    router.replace(pathname ?? `/dashboard/companies/${companyId}?tab=contacts`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on researchDone; banner stays until user dismisses or URL replace hides it
  }, [researchDone, hasResearch, pathname, companyId, router]);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    router.replace(pathname ?? `/dashboard/companies/${companyId}?tab=contacts`);
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
    const buildDealContextPayload = (): DealContext => ({
      productIds: usingCatalog && dealForm.productIds.length ? dealForm.productIds : undefined,
      productNames: usingFallback && dealForm.productNames.length ? dealForm.productNames.filter(Boolean) : undefined,
      accountStatus: dealForm.accountStatus,
      deployedLocation: dealForm.deployedLocation.trim() || undefined,
      deployedUseCase: dealForm.deployedUseCase.trim() || undefined,
      hasProvenOutcomes: dealForm.hasProvenOutcomes,
      relationshipLocation: dealForm.relationshipLocation.trim() || undefined,
      dealShape: dealForm.dealShape,
      targetDivisions:
        dealForm.dealShape === 'multi_division' && dealForm.targetDivisions.length
          ? dealForm.targetDivisions.filter(Boolean).slice(0, 6)
          : undefined,
      buyingMotion: dealForm.buyingMotion,
      committeeName: dealForm.committeeName.trim() || undefined,
      dealGoal: dealGoal || undefined,
    });

    const handleDiscover = async () => {
      if (!canDiscover) return;
      setStep1Loading(true);
      setStep1Error(null);
      setProgressMsg(`Researching ${companyName} via web search...`);
      try {
        const dealContextPayload = buildDealContextPayload();
        setTimeout(() => setProgressMsg(`Analyzing ${companyName}'s org structure for buying groups...`), 8000);
        setTimeout(() => setProgressMsg('Identifying key teams and decision-makers...'), 16000);
        const res = await fetch(`/api/companies/${companyId}/research/buying-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealContext: dealContextPayload,
            dealGoal: dealGoal || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Discovery failed');
        if (!json.data?.basics || !Array.isArray(json.data?.groups) || json.data.groups.length === 0) {
          throw new Error('No buying groups returned');
        }
        const aiSeeds: BuyingGroupSeed[] = json.data.groups;
        const userDivisions = dealForm.dealShape === 'multi_division'
          ? dealForm.targetDivisions.filter(Boolean)
          : [];
        const aiNames = new Set(aiSeeds.map((s) => s.name.toLowerCase()));
        const userSeeds: BuyingGroupSeed[] = userDivisions
          .filter((d) => !aiNames.has(d.toLowerCase()))
          .map((d) => ({
            id: `user-${Date.now()}-${d.replace(/\s/g, '-').toLowerCase()}`,
            name: d,
            rationale: 'User-specified target division',
            segmentType: 'DIVISIONAL' as const,
            orgFunction: '',
            divisionOrProduct: d,
          }));
        setStep1({ data: json.data, seeds: [...userSeeds, ...aiSeeds], perplexitySummary: json.perplexitySummary });
      } catch (e) {
        setStep1Error(e instanceof Error ? e.message : 'Discovery failed');
      } finally {
        setStep1Loading(false);
        setProgressMsg(null);
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
      const name = window.prompt('Enter buying group / team name:');
      if (!name?.trim()) return;
      const newId = `seed-${Date.now()}`;
      setStep1({
        ...step1,
        seeds: [
          ...step1.seeds,
          {
            id: newId,
            name: name.trim(),
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
      setProgressMsg('Enriching groups with roles, value propositions, and search keywords...');
      try {
        const res = await fetch(`/api/companies/${companyId}/research/group-enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groups: step1.seeds,
            userGoal: dealGoal,
            perplexitySummary: step1.perplexitySummary,
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
        setProgressMsg(null);
      }
    };

    const handleProductFit = async () => {
      if (!enrichedGroups?.length) return;
      setStep3Loading(true);
      setStep3Error(null);
      setProgressMsg('Scoring product relevance for each buying group...');
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
        setProgressMsg(null);
      }
    };

    const handleSaveAndMessaging = async () => {
      if (!step1?.data?.basics || !groupsWithProductFit?.length) return;
      setGenerating(true);
      setGenerateError(null);
      setProgressMsg('Saving buying groups and creating your Strategic Account Plan...');
      try {
        const finalGroups = groupsWithProductFit.filter((_, i) => !excludedGroups.has(i));
        if (finalGroups.length === 0) {
          setGenerateError('At least one group must be included');
          setGenerating(false);
          return;
        }
        const res = await fetch(`/api/companies/${companyId}/apply-research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyBasics: step1.data.basics,
            enrichedGroups: finalGroups,
            researchGoal: dealGoal,
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
        setProgressMsg(null);
      }
    };

    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/companies/${companyId}`}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to {companyName}
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 p-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-blue-500/20">
              <Sparkles className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Account Intelligence</h1>
              <p className="text-slate-400 mt-1 text-sm leading-relaxed">
                Map <span className="text-white font-medium">{companyName}</span>&apos;s buying landscape — discover groups, enrich with roles, and generate outreach.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-zinc-800/30 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-amber-500" />
          <div className="p-8 space-y-10">
          {!step1 ? (
            <>
              {/* Section 1 — Products */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold ring-1 ring-blue-500/20">1</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">What are you selling?</h3>
                    <p className="text-xs text-slate-500">Select products to include in this deal</p>
                  </div>
                </div>
                <div className="ml-11">
                  {usingCatalog ? (
                    <div className="flex flex-wrap gap-2">
                      {catalogProducts.map((p) => {
                        const selected = dealForm.productIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setDealForm((prev) => ({
                                ...prev,
                                productIds: prev.productIds.includes(p.id)
                                  ? prev.productIds.filter((id) => id !== p.id)
                                  : [...prev.productIds, p.id],
                              }));
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                              selected
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                                : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {selected && <Check className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : usingFallback ? (
                    <div className="flex flex-wrap gap-2">
                      {fallbackProducts.map((p) => {
                        const selected = dealForm.productNames.includes(p.name);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setDealForm((prev) => ({
                                ...prev,
                                productNames: prev.productNames.includes(p.name)
                                  ? prev.productNames.filter((n) => n !== p.name)
                                  : [...prev.productNames, p.name],
                              }));
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                              selected
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                                : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {selected && <Check className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      Add products in{' '}
                      <Link href="/dashboard/content-library" className="text-blue-400 hover:text-blue-300 underline">
                        Content Library
                      </Link>{' '}
                      — they&apos;ll appear here as selectable options.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700/30" />

              {/* Section 2 — Account Status */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold ring-1 ring-blue-500/20">2</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Are you already in this account?</h3>
                    <p className="text-xs text-slate-500">Your current relationship status</p>
                  </div>
                </div>
                <div className="ml-11 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'new' as const, label: 'New' },
                      { value: 'existing_deployed' as const, label: 'Existing Deployed' },
                      { value: 'existing_relationship' as const, label: 'Existing Relationship' },
                      { value: 'stalled' as const, label: 'Stalled' },
                      { value: 'champion_in' as const, label: 'Champion In' },
                    ]).map(({ value, label }) => {
                      const isSelected = dealForm.accountStatus === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDealForm((prev) => ({ ...prev, accountStatus: value }))}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                              : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {dealForm.accountStatus === 'existing_deployed' && (
                    <div className="mt-1 space-y-3 border-l-2 border-blue-500/30 pl-4 ml-1">
                      <input
                        type="text"
                        placeholder="Deployed location (e.g. AV Software team)"
                        value={dealForm.deployedLocation}
                        onChange={(e) => setDealForm((prev) => ({ ...prev, deployedLocation: e.target.value }))}
                        className="w-full rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      />
                      <textarea
                        placeholder="Use case at this team"
                        value={dealForm.deployedUseCase}
                        onChange={(e) => setDealForm((prev) => ({ ...prev, deployedUseCase: e.target.value }))}
                        rows={2}
                        className="w-full rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      />
                      <div className="flex gap-3">
                        {([
                          { val: true, label: 'Yes, proven outcomes' },
                          { val: false, label: 'No' },
                        ] as const).map(({ val, label }) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setDealForm((prev) => ({ ...prev, hasProvenOutcomes: val }))}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                              dealForm.hasProvenOutcomes === val
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                                : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {dealForm.accountStatus === 'existing_relationship' && (
                    <div className="mt-1 border-l-2 border-blue-500/30 pl-4 ml-1">
                      <input
                        type="text"
                        placeholder="Where is the relationship (e.g. Product, Engineering)"
                        value={dealForm.relationshipLocation}
                        onChange={(e) => setDealForm((prev) => ({ ...prev, relationshipLocation: e.target.value }))}
                        className="w-full rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700/30" />

              {/* Section 3 — Deal Shape */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold ring-1 ring-blue-500/20">3</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">How does your product land here?</h3>
                    <p className="text-xs text-slate-500">Organizational scope of the deal</p>
                  </div>
                </div>
                <div className="ml-11 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'single_team' as const, label: 'Single Team' },
                      { value: 'multi_department' as const, label: 'Multi Department' },
                      { value: 'multi_division' as const, label: 'Multi Division' },
                      { value: 'unknown' as const, label: 'Unknown' },
                    ]).map(({ value, label }) => {
                      const isSelected = dealForm.dealShape === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDealForm((prev) => ({ ...prev, dealShape: value }))}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                              : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {dealForm.dealShape === 'multi_division' && (
                    <div className="mt-1 space-y-3 border-l-2 border-blue-500/30 pl-4 ml-1">
                      <p className="text-xs text-slate-500">Add target divisions (optional, max 6). Leave empty to discover from research.</p>
                      {dealForm.targetDivisions.map((val, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Division name"
                            value={val}
                            onChange={(e) => {
                              const next = [...dealForm.targetDivisions];
                              next[i] = e.target.value;
                              setDealForm((prev) => ({ ...prev, targetDivisions: next }));
                            }}
                            className="flex-1 rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDealForm((prev) => ({
                                ...prev,
                                targetDivisions: prev.targetDivisions.filter((_, j) => j !== i),
                              }))
                            }
                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {dealForm.targetDivisions.length < 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDealForm((prev) => ({
                              ...prev,
                              targetDivisions: [...prev.targetDivisions, ''],
                            }))
                          }
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="h-4 w-4" /> Add division
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700/30" />

              {/* Section 4 — Buying Motion */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold ring-1 ring-blue-500/20">4</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">How does buying work here?</h3>
                    <p className="text-xs text-slate-500">Procurement process at this account</p>
                  </div>
                </div>
                <div className="ml-11 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'standard' as const, label: 'Standard' },
                      { value: 'committee' as const, label: 'Committee' },
                      { value: 'regulated' as const, label: 'Regulated' },
                      { value: 'unknown' as const, label: 'Unknown' },
                    ]).map(({ value, label }) => {
                      const isSelected = dealForm.buyingMotion === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDealForm((prev) => ({ ...prev, buyingMotion: value }))}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                              : 'bg-zinc-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {dealForm.buyingMotion === 'committee' && (
                    <div className="mt-1 border-l-2 border-blue-500/30 pl-4 ml-1">
                      <input
                        type="text"
                        placeholder="Committee name (optional)"
                        value={dealForm.committeeName}
                        onChange={(e) => setDealForm((prev) => ({ ...prev, committeeName: e.target.value }))}
                        className="w-full rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700/30" />

              {/* Section 5 — Goal */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold ring-1 ring-violet-500/20">5</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Goal <span className="text-slate-500 font-normal">(optional)</span></h3>
                    <p className="text-xs text-slate-500">What are you trying to achieve in this account?</p>
                  </div>
                </div>
                <div className="ml-11">
                  <textarea
                    value={dealForm.dealGoal}
                    onChange={(e) => setDealForm((prev) => ({ ...prev, dealGoal: e.target.value }))}
                    placeholder="e.g. Expand into the Autonomous Driving division, land a pilot with the VP of Engineering"
                    rows={2}
                    className="w-full rounded-xl border border-slate-700/50 bg-zinc-900/60 text-slate-200 placeholder:text-slate-500 text-sm px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleDiscover}
                    disabled={step1Loading || !canDiscover}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                  >
                    {step1Loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Mapping account…
                      </>
                    ) : (
                      <>
                        Map this account
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-500">~30 seconds · You&apos;ll review before anything saves</span>
                </div>
                {step1Loading && progressMsg && (
                  <p className="text-sm text-blue-300/80 mt-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {progressMsg}
                  </p>
                )}
                {step1Error && (
                  <div className="text-sm text-red-400 space-y-1 mt-3">
                    <p>{step1Error}</p>
                    {(step1Error.includes('company setup') ||
                      step1Error.includes('Content Library') ||
                      step1Error.includes('No products found') ||
                      step1Error.includes('Your company data')) && (
                      <Link
                        href="/dashboard/content-library"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Complete setup in Content Library →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Pipeline progress */}
              <div className="flex items-center gap-1 px-1 mb-2">
                {[
                  { label: 'Review Groups', done: true },
                  { label: 'Enrich', done: !!enrichedGroups },
                  { label: 'Product Fit', done: !!groupsWithProductFit },
                  { label: 'Review & Edit', done: reviewConfirmed },
                  { label: 'Save', done: false },
                ].map((s, i, arr) => {
                  const isActive = !s.done && (i === 0 || arr[i - 1].done);
                  return (
                    <div key={s.label} className="flex items-center gap-1 flex-1">
                      {i > 0 && <div className={`flex-1 h-px ${s.done || isActive ? 'bg-blue-500/40' : 'bg-slate-700/50'}`} />}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          s.done ? 'bg-green-500/20 text-green-400' : isActive ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : 'bg-zinc-800 text-slate-600 ring-1 ring-slate-700/50'
                        }`}>
                          {s.done ? <Check className="h-3 w-3" /> : i + 1}
                        </div>
                        <span className={`text-[11px] font-medium hidden sm:block ${s.done ? 'text-green-400/80' : isActive ? 'text-blue-300' : 'text-slate-600'}`}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buying groups editor */}
              <div className="rounded-xl border border-slate-700/50 bg-zinc-900/30 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <h3 className="text-base font-semibold text-white">Buying Groups</h3>
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">{step1.seeds.length} found</span>
                </div>
                <p className="text-sm text-slate-400">Edit names or rationale, add or remove groups, then continue.</p>
                <div className="space-y-2">
                  {step1.seeds.map((seed) => (
                    <div
                      key={seed.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/50 bg-zinc-800/40 p-3 transition-colors hover:border-slate-600/50"
                    >
                      <input
                        type="text"
                        value={seed.name}
                        onChange={(e) => updateSeed(seed.id, { name: e.target.value })}
                        className="flex-1 min-w-[120px] rounded-lg border border-slate-700/50 bg-zinc-900/60 text-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                        placeholder="Group name"
                      />
                      <input
                        type="text"
                        value={seed.rationale}
                        onChange={(e) => updateSeed(seed.id, { rationale: e.target.value })}
                        className="flex-1 min-w-[160px] rounded-lg border border-slate-700/50 bg-zinc-900/60 text-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                        placeholder="Why this group matters"
                      />
                      <button
                        type="button"
                        onClick={() => removeSeed(seed.id)}
                        disabled={step1.seeds.length <= 1}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
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
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add group
                </button>
              </div>

              {/* Action card for current pipeline step */}
              <div className="rounded-xl border border-slate-700/50 bg-zinc-900/30 p-6">
                {!enrichedGroups ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">Enrich with Roles & Value Props</h3>
                      <p className="text-sm text-slate-400 mt-1">AI adds value propositions, target roles, and keywords to each group.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={handleEnrich}
                        disabled={step2Loading || step1.seeds.length === 0}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-900 shadow-lg shadow-amber-500/20"
                      >
                        {step2Loading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                            Enriching…
                          </>
                        ) : (
                          <>Enrich Groups <ArrowRight className="h-4 w-4" /></>
                        )}
                      </button>
                      {step2Loading && progressMsg && (
                        <p className="text-xs text-blue-300/80 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />{progressMsg}
                        </p>
                      )}
                      {step2Error && <p className="text-sm text-red-400">{step2Error}</p>}
                    </div>
                  </div>
                ) : !groupsWithProductFit ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Enriched {enrichedGroups.length} group{enrichedGroups.length !== 1 ? 's' : ''}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white">Score Product Fit</h3>
                      <p className="text-sm text-slate-400 mt-1">Evaluate how well your products map to each buying group.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={handleProductFit}
                        disabled={step3Loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-900 shadow-lg shadow-amber-500/20"
                      >
                        {step3Loading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                            Scoring…
                          </>
                        ) : (
                          <>Product Fit <ArrowRight className="h-4 w-4" /></>
                        )}
                      </button>
                      {step3Loading && progressMsg && (
                        <p className="text-xs text-blue-300/80 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />{progressMsg}
                        </p>
                      )}
                      {step3Error && <p className="text-sm text-red-400">{step3Error}</p>}
                    </div>
                  </div>
                ) : !reviewConfirmed ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Product fit complete</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">Review & Edit Buying Groups</h3>
                    <p className="text-sm text-slate-400">Review enriched groups before saving. Toggle groups off, edit roles, or adjust keywords.</p>

                    <div className="space-y-3">
                      {groupsWithProductFit.map((group, idx) => {
                        const isExcluded = excludedGroups.has(idx);
                        const isExpanded = expandedGroups.has(idx);
                        const topProduct = group.products?.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))[0];
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border transition-all ${
                              isExcluded
                                ? 'border-slate-700/30 bg-zinc-900/20 opacity-50'
                                : 'border-slate-700/50 bg-zinc-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 p-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(excludedGroups);
                                  if (next.has(idx)) next.delete(idx);
                                  else next.add(idx);
                                  setExcludedGroups(next);
                                }}
                                title={isExcluded ? 'Include this group' : 'Exclude this group'}
                                className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                                  isExcluded ? 'text-slate-600 hover:text-slate-400' : 'text-green-400 hover:text-green-300'
                                }`}
                              >
                                {isExcluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-sm truncate">{group.name}</span>
                                  <span className="text-[10px] font-medium text-slate-500 bg-zinc-900/60 px-2 py-0.5 rounded-full shrink-0">
                                    {group.segmentType}
                                  </span>
                                  {topProduct && (
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                      topProduct.relevance >= 70 ? 'bg-green-500/10 text-green-400' :
                                      topProduct.relevance >= 40 ? 'bg-amber-500/10 text-amber-400' :
                                      'bg-slate-700/50 text-slate-500'
                                    }`}>
                                      {topProduct.relevance}% fit
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{group.valueProp}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(expandedGroups);
                                  if (next.has(idx)) next.delete(idx);
                                  else next.add(idx);
                                  setExpandedGroups(next);
                                }}
                                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>

                            {isExpanded && !isExcluded && (
                              <div className="border-t border-slate-700/30 p-4 space-y-4">
                                {/* Value Prop */}
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Value Proposition</label>
                                  <p className="text-sm text-slate-300 mt-1">{group.valueProp}</p>
                                </div>

                                {/* Use Cases */}
                                {group.useCasesAtThisCompany?.length > 0 && (
                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Use Cases</label>
                                    <ul className="mt-1 space-y-1">
                                      {group.useCasesAtThisCompany.map((uc, i) => (
                                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                          <span className="text-blue-400 mt-0.5">•</span>
                                          {uc}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Target Roles */}
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Target Roles</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(['economicBuyer', 'technicalEvaluator', 'champion', 'influencer'] as const).map((roleType) => {
                                      const roles = group.roles?.[roleType] ?? [];
                                      if (roles.length === 0) return null;
                                      const roleLabel = {
                                        economicBuyer: 'Economic Buyer',
                                        technicalEvaluator: 'Technical Evaluator',
                                        champion: 'Champion',
                                        influencer: 'Influencer',
                                      }[roleType];
                                      return (
                                        <div key={roleType} className="bg-zinc-900/40 rounded-lg p-3 border border-slate-700/30">
                                          <div className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-wider mb-1.5">{roleLabel}</div>
                                          <div className="space-y-1">
                                            {roles.map((role, ri) => (
                                              <div key={ri} className="flex items-center gap-2 group/role">
                                                <input
                                                  type="text"
                                                  value={role}
                                                  onChange={(e) => {
                                                    const updated = [...groupsWithProductFit];
                                                    const newRoles = { ...updated[idx].roles };
                                                    const arr = [...(newRoles[roleType] ?? [])];
                                                    arr[ri] = e.target.value;
                                                    newRoles[roleType] = arr;
                                                    updated[idx] = { ...updated[idx], roles: newRoles };
                                                    setGroupsWithProductFit(updated);
                                                  }}
                                                  className="flex-1 text-xs text-slate-300 bg-transparent border-b border-transparent focus:border-blue-500/50 outline-none py-0.5 transition-colors"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updated = [...groupsWithProductFit];
                                                    const newRoles = { ...updated[idx].roles };
                                                    const arr = (newRoles[roleType] ?? []).filter((_, j) => j !== ri);
                                                    newRoles[roleType] = arr;
                                                    updated[idx] = { ...updated[idx], roles: newRoles };
                                                    setGroupsWithProductFit(updated);
                                                  }}
                                                  className="opacity-0 group-hover/role:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = [...groupsWithProductFit];
                                                const newRoles = { ...updated[idx].roles };
                                                newRoles[roleType] = [...(newRoles[roleType] ?? []), ''];
                                                updated[idx] = { ...updated[idx], roles: newRoles };
                                                setGroupsWithProductFit(updated);
                                              }}
                                              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 transition-colors"
                                            >
                                              <Plus className="h-2.5 w-2.5" /> Add role
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Search Keywords */}
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Search Keywords</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(group.searchKeywords ?? []).map((kw, ki) => (
                                      <span key={ki} className="inline-flex items-center gap-1 bg-zinc-900/60 text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700/40">
                                        <input
                                          type="text"
                                          value={kw}
                                          onChange={(e) => {
                                            const updated = [...groupsWithProductFit];
                                            const kws = [...(updated[idx].searchKeywords ?? [])];
                                            kws[ki] = e.target.value;
                                            updated[idx] = { ...updated[idx], searchKeywords: kws };
                                            setGroupsWithProductFit(updated);
                                          }}
                                          className="bg-transparent border-none outline-none text-xs text-slate-300 w-auto min-w-[40px]"
                                          style={{ width: `${Math.max(kw.length, 4)}ch` }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...groupsWithProductFit];
                                            const kws = (updated[idx].searchKeywords ?? []).filter((_, j) => j !== ki);
                                            updated[idx] = { ...updated[idx], searchKeywords: kws };
                                            setGroupsWithProductFit(updated);
                                          }}
                                          className="text-slate-600 hover:text-red-400 transition-colors"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...groupsWithProductFit];
                                        updated[idx] = {
                                          ...updated[idx],
                                          searchKeywords: [...(updated[idx].searchKeywords ?? []), ''],
                                        };
                                        setGroupsWithProductFit(updated);
                                      }}
                                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 transition-colors"
                                    >
                                      <Plus className="h-2.5 w-2.5" /> Add
                                    </button>
                                  </div>
                                </div>

                                {/* Product Fit Scores */}
                                {group.products?.length > 0 && (
                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Product Fit</label>
                                    <div className="space-y-2">
                                      {group.products.map((pf, pi) => (
                                        <div key={pi} className="flex items-center gap-3 bg-zinc-900/40 rounded-lg p-2.5 border border-slate-700/30">
                                          <span className="text-sm text-slate-300 font-medium min-w-[100px]">{pf.productName}</span>
                                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                pf.relevance >= 70 ? 'bg-green-500' :
                                                pf.relevance >= 40 ? 'bg-amber-500' :
                                                'bg-slate-600'
                                              }`}
                                              style={{ width: `${pf.relevance}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs font-semibold tabular-nums min-w-[36px] text-right ${
                                            pf.relevance >= 70 ? 'text-green-400' :
                                            pf.relevance >= 40 ? 'text-amber-400' :
                                            'text-slate-500'
                                          }`}>
                                            {pf.relevance}%
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-500">
                        {groupsWithProductFit.length - excludedGroups.size} of {groupsWithProductFit.length} groups included
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewConfirmed(true)}
                        disabled={groupsWithProductFit.length - excludedGroups.size === 0}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20"
                      >
                        Confirm & Continue <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Review complete — {groupsWithProductFit.length - excludedGroups.size} groups selected</span>
                      </div>
                      <h3 className="text-base font-semibold text-white">Save & Generate Outreach</h3>
                      <p className="text-sm text-slate-400 mt-1">Save buying groups and generate account messaging to finish setup.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewConfirmed(false)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-slate-400 hover:text-slate-300 ring-1 ring-slate-700/50 hover:ring-slate-600/50 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAndMessaging}
                          disabled={generating}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20"
                        >
                          {generating ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>Save & Generate <ArrowRight className="h-4 w-4" /></>
                          )}
                        </button>
                      </div>
                      {generating && progressMsg && (
                        <p className="text-xs text-blue-300/80 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />{progressMsg}
                        </p>
                      )}
                      {generateError && <p className="text-sm text-red-400">{generateError}</p>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
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
    <div className="space-y-6">
      <Link
        href={`/dashboard/companies/${companyId}`}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to {companyName}
      </Link>

      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-blue-500/20">
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Account Intelligence</h1>
            <p className="text-slate-400 mt-1 text-sm leading-relaxed">
              Research the account, create buying segments, and generate messaging.
            </p>
          </div>
        </div>
      </div>

      {showBanner && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl bg-blue-500/10 border border-blue-500/20 px-5 py-3.5 text-sm text-blue-200"
          role="status"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Research complete — review your buying segments below.</span>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            className="shrink-0 p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-300 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700/50 bg-zinc-800/30 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-amber-500" />
        <div className="divide-y divide-slate-700/30">
          {/* Step 1: Research */}
          <section className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center mt-0.5">
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">Research target company</h2>
                  <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Done</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{step1Summary}</p>
                {researchGoal?.trim() && (
                  <p className="text-xs text-slate-500 mt-1.5">Goal: {researchGoal.trim()}</p>
                )}
              </div>
            </div>
          </section>

          {/* Step 2: Buying Segments */}
          <section ref={step2Ref} className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                hasDepartments ? 'bg-green-500/15' : 'bg-blue-500/15 ring-2 ring-blue-500/20'
              }`}>
                {hasDepartments ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <span className="text-xs font-bold text-blue-400">2</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">Create buying segments</h2>
                  {hasDepartments && (
                    <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Done</span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Review and approve segments and contact titles. These drive LinkedIn research and analytics.
                </p>
              </div>
            </div>
            {hasResearch && !hasDepartments && (
              <div className="ml-11 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                No segments approved yet — review the suggested segments and approve at least one to continue.
              </div>
            )}
            <div className="ml-11 flex flex-wrap items-center gap-3">
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
                <span className="text-xs text-slate-500">Update segments with new research data</span>
              )}
            </div>
            {pendingResearchData && (
              <div className="ml-11">
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
              </div>
            )}
          </section>

          {/* Step 3: Messaging */}
          <section className="p-6">
            {!hasDepartments ? (
              <div className="flex items-start gap-3 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mt-0.5 ring-1 ring-slate-700/50">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Create messaging</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Complete step 2 first</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                    hasMessaging ? 'bg-green-500/15' : 'bg-blue-500/15 ring-2 ring-blue-500/20'
                  }`}>
                    {hasMessaging ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <span className="text-xs font-bold text-blue-400">3</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">Create messaging</h2>
                      {hasMessaging && (
                        <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Done</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Generate tailored messaging for each buying segment.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateMessaging}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      hasMessaging
                        ? 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 ring-1 ring-slate-700/50'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-900 shadow-lg shadow-amber-500/20'
                    }`}
                  >
                    {generating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : hasMessaging ? (
                      'Regenerate'
                    ) : (
                      <>Create messaging <ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </button>
                  {hasMessaging && (
                    <Link href={`/dashboard/companies/${companyId}?tab=content`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      View / edit messaging →
                    </Link>
                  )}
                  {generateError && <p className="text-sm text-red-400">{generateError}</p>}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Next step CTA */}
      {hasResearch && hasDepartments && hasMessaging && (
        <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-green-400" />
              </div>
              <span className="text-sm font-semibold text-green-400">Account Intelligence Complete</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Build Your Contact List</h3>
            <p className="text-slate-400 text-sm mb-4">
              Find stakeholders in each buying segment. Import from LinkedIn, paste from a list, or let AI discover them.
            </p>
            <Link href={`/dashboard/companies/${companyId}?tab=contacts`}>
              <button type="button" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 transition-all">
                Find Contacts <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

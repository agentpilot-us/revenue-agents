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
      try {
        const dealContextPayload = buildDealContextPayload();
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
            userGoal: dealGoal,
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

        <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-8 space-y-8">
          {!step1 ? (
            <>
              {/* Section 1 — What are you selling? */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">1. What are you selling?</h3>
                {usingCatalog ? (
                  <>
                    <p className="text-slate-500 text-xs">Select one or more products to include in this deal.</p>
                    <div className="flex flex-wrap gap-3">
                      {catalogProducts.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dealForm.productIds.includes(p.id)}
                            onChange={() => {
                              setDealForm((prev) => ({
                                ...prev,
                                productIds: prev.productIds.includes(p.id)
                                  ? prev.productIds.filter((id) => id !== p.id)
                                  : [...prev.productIds, p.id],
                              }));
                            }}
                            className="rounded border-slate-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-300">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : usingFallback ? (
                  <>
                    <p className="text-slate-500 text-xs">Select one or more products from your Content Library.</p>
                    <div className="flex flex-wrap gap-3">
                      {fallbackProducts.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dealForm.productNames.includes(p.name)}
                            onChange={() => {
                              setDealForm((prev) => ({
                                ...prev,
                                productNames: prev.productNames.includes(p.name)
                                  ? prev.productNames.filter((n) => n !== p.name)
                                  : [...prev.productNames, p.name],
                              }));
                            }}
                            className="rounded border-slate-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-300">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Add products in{' '}
                    <Link href="/dashboard/content-library" className="text-blue-400 hover:text-blue-300 underline">
                      Content Library
                    </Link>{' '}
                    — they&apos;ll appear here as checkboxes so you can select which to include in this deal.
                  </p>
                )}
              </div>

              {/* Section 2 — Are you already in this account? */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">2. Are you already in this account?</h3>
                <div className="flex flex-wrap gap-4">
                  {(['new', 'existing_deployed', 'existing_relationship', 'stalled', 'champion_in'] as const).map(
                    (v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="accountStatus"
                          checked={dealForm.accountStatus === v}
                          onChange={() => setDealForm((prev) => ({ ...prev, accountStatus: v }))}
                          className="border-slate-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300 capitalize">
                          {v.replace(/_/g, ' ')}
                        </span>
                      </label>
                    )
                  )}
                </div>
                {dealForm.accountStatus === 'existing_deployed' && (
                  <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-600 pl-4">
                    <input
                      type="text"
                      placeholder="Deployed location (e.g. AV Software team)"
                      value={dealForm.deployedLocation}
                      onChange={(e) => setDealForm((prev) => ({ ...prev, deployedLocation: e.target.value }))}
                      className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-500 text-sm px-3 py-2"
                    />
                    <textarea
                      placeholder="Use case at this team"
                      value={dealForm.deployedUseCase}
                      onChange={(e) => setDealForm((prev) => ({ ...prev, deployedUseCase: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-500 text-sm px-3 py-2 resize-none"
                    />
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasProvenOutcomes"
                          checked={dealForm.hasProvenOutcomes === true}
                          onChange={() => setDealForm((prev) => ({ ...prev, hasProvenOutcomes: true }))}
                          className="border-slate-600 bg-zinc-900 text-blue-600"
                        />
                        <span className="text-sm text-slate-300">Yes, proven outcomes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasProvenOutcomes"
                          checked={dealForm.hasProvenOutcomes === false}
                          onChange={() => setDealForm((prev) => ({ ...prev, hasProvenOutcomes: false }))}
                          className="border-slate-600 bg-zinc-900 text-blue-600"
                        />
                        <span className="text-sm text-slate-300">No</span>
                      </label>
                    </div>
                  </div>
                )}
                {dealForm.accountStatus === 'existing_relationship' && (
                  <div className="ml-4 mt-3">
                    <input
                      type="text"
                      placeholder="Where is the relationship (e.g. Product, Engineering)"
                      value={dealForm.relationshipLocation}
                      onChange={(e) => setDealForm((prev) => ({ ...prev, relationshipLocation: e.target.value }))}
                      className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-500 text-sm px-3 py-2"
                    />
                  </div>
                )}
              </div>

              {/* Section 3 — How does your product land here? */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">3. How does your product land here?</h3>
                <div className="flex flex-wrap gap-4">
                  {(['single_team', 'multi_department', 'multi_division', 'unknown'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dealShape"
                        checked={dealForm.dealShape === v}
                        onChange={() => setDealForm((prev) => ({ ...prev, dealShape: v }))}
                        className="border-slate-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300 capitalize">{v.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
                {dealForm.dealShape === 'multi_division' && (
                  <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-600 pl-4">
                    <p className="text-xs text-slate-500">Add divisions (optional, max 6). Leave empty to discover from research.</p>
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
                          className="flex-1 rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-500 text-sm px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDealForm((prev) => ({
                              ...prev,
                              targetDivisions: prev.targetDivisions.filter((_, j) => j !== i),
                            }))
                          }
                          className="p-2 rounded hover:bg-slate-600 text-slate-400"
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
                        className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add another
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4 — How does buying work here? */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-200">4. How does buying work here?</h3>
                <div className="flex flex-wrap gap-4">
                  {(['standard', 'committee', 'regulated', 'unknown'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="buyingMotion"
                        checked={dealForm.buyingMotion === v}
                        onChange={() => setDealForm((prev) => ({ ...prev, buyingMotion: v }))}
                        className="border-slate-600 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300 capitalize">{v}</span>
                    </label>
                  ))}
                </div>
                {dealForm.buyingMotion === 'committee' && (
                  <div className="ml-4 mt-3">
                    <input
                      type="text"
                      placeholder="Committee name (optional)"
                      value={dealForm.committeeName}
                      onChange={(e) => setDealForm((prev) => ({ ...prev, committeeName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-500 text-sm px-3 py-2"
                    />
                  </div>
                )}
              </div>

              {/* Section 5 — Goal (optional) */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-200">
                  5. Goal <span className="text-slate-500 font-normal">(optional)</span>
                </h3>
                <textarea
                  value={dealForm.dealGoal}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, dealGoal: e.target.value }))}
                  placeholder="e.g. Target enterprise AEs across Financial Services, Healthcare"
                  rows={2}
                  className="w-full rounded-lg border border-slate-600 bg-zinc-900 text-slate-200 placeholder:text-slate-600 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-2">~30 seconds. You&apos;ll review before anything saves.</p>
                <Button
                  onClick={handleDiscover}
                  disabled={step1Loading || !canDiscover}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {step1Loading ? 'Mapping account…' : 'Map this account →'}
                </Button>
                {step1Error && (
                  <div className="text-sm text-red-400 space-y-1 mt-2">
                    <p>{step1Error}</p>
                    {(step1Error.includes('company setup') ||
                      step1Error.includes('Content Library') ||
                      step1Error.includes('No products found') ||
                      step1Error.includes('Your company data')) && (
                      <Link
                        href="/dashboard/content-library"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Complete setup in Your company data →
                      </Link>
                    )}
                  </div>
                )}
              </div>
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

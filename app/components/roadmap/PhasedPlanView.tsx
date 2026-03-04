'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

type AEStep = {
  order: number;
  label: string;
  description: string;
  channel?: string;
};

type PlanRow = {
  id: string;
  status: string;
  phaseIndex: number | null;
  phaseName: string | null;
  urgencyScore: number | null;
  previewPayload: {
    title?: string;
    description?: string;
    contentType?: string;
    weekRange?: string;
    targetDivisionName?: string;
    targetContactRole?: string;
    productFraming?: string;
    existingProductReference?: string;
  } | null;
  target?: {
    id: string;
    name: string;
    companyDepartmentId?: string | null;
  } | null;
  roadmap?: {
    companyId: string;
  } | null;
};

type Props = {
  plans: PlanRow[];
  companyId: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  executed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  email: 'Draft Email',
  event_invite: 'Create Event Invite',
  presentation: 'Draft Presentation',
  one_pager: 'Create One-Pager',
  case_study: 'Draft Case Study',
  talking_points: 'Draft Talking Points',
  roi_deck: 'Create ROI Deck',
};

const CONTENT_TYPE_TO_PLAY: Record<string, string> = {
  email: 're_engagement',
  event_invite: 'event_invite',
  presentation: 'feature_release',
  one_pager: 'new_buying_group',
  case_study: 'champion_enablement',
  talking_points: 're_engagement',
  roi_deck: 'feature_release',
};

function buildPlayRunUrl(plan: PlanRow, companyId: string) {
  const pp = plan.previewPayload;
  const contentType = pp?.contentType ?? 'email';
  const playId = CONTENT_TYPE_TO_PLAY[contentType] ?? 're_engagement';
  const params = new URLSearchParams({ playId });
  const divisionId = plan.target?.companyDepartmentId;
  if (divisionId) {
    params.set('segmentId', divisionId);
  }
  if (pp?.targetDivisionName) {
    params.set('segmentName', pp.targetDivisionName);
  }
  return `/dashboard/companies/${companyId}/plays/run?${params.toString()}`;
}

function PlayStepsPreview({ playId }: { playId: string }) {
  const [steps, setSteps] = useState<AEStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/plays/${playId}/steps`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.steps)) setSteps(data.steps.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playId]);

  if (loading || steps.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {steps.map((step) => (
        <div key={step.order} className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400 flex-shrink-0">
            {step.order}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PhasedPlanView({ plans, companyId }: Props) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const phaseMap = new Map<number, { name: string; weekRange: string | null; plans: PlanRow[] }>();
  for (const plan of plans) {
    const idx = plan.phaseIndex ?? 0;
    const existing = phaseMap.get(idx);
    if (existing) {
      existing.plans.push(plan);
    } else {
      phaseMap.set(idx, {
        name: plan.phaseName ?? `Phase ${idx}`,
        weekRange: (plan.previewPayload as { weekRange?: string })?.weekRange ?? null,
        plans: [plan],
      });
    }
  }

  const sortedPhases = [...phaseMap.entries()].sort(([a], [b]) => a - b);

  const updateStatus = async (planId: string, newStatus: string) => {
    setUpdatingId(planId);
    try {
      await fetch(`/api/roadmap/plans/${planId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSteps = (planId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-1">
          No plays in the queue yet.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Select a template above to generate phased plays for your target accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sortedPhases.map(([phaseIdx, phase]) => (
        <div key={phaseIdx}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Phase {phaseIdx}: {phase.name}
              </h3>
              {phase.weekRange && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {phase.weekRange}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {phase.plans.length} play{phase.plans.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {phase.plans
              .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
              .map((plan) => {
                const pp = plan.previewPayload;
                const title = pp?.title ?? 'Untitled Play';
                const description = pp?.description ?? '';
                const contentType = pp?.contentType ?? 'email';
                const effectiveStatus = plan.status;
                const stepsExpanded = expandedSteps.has(plan.id);
                const playId = CONTENT_TYPE_TO_PLAY[contentType] ?? 're_engagement';

                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-gray-200 dark:border-zinc-600 p-3 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {title}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                              STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.pending
                            }`}
                          >
                            {effectiveStatus}
                          </span>
                          {plan.urgencyScore != null && (
                            <span className="text-[10px] text-gray-400" title="Urgency score">
                              {Math.round(plan.urgencyScore)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {pp?.targetDivisionName && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-300">
                              {pp.targetDivisionName}
                            </span>
                          )}
                          {pp?.productFraming && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                              {pp.productFraming.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {/* Steps toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSteps(plan.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-300 mt-2 flex items-center gap-1"
                        >
                          <svg
                            className={`w-3 h-3 transition-transform ${stepsExpanded ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {stepsExpanded ? 'Hide steps' : 'View steps'}
                        </button>

                        {stepsExpanded && (
                          <PlayStepsPreview playId={playId} />
                        )}
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        {effectiveStatus === 'executed' && (
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                        )}
                        {effectiveStatus === 'pending' && (
                          <>
                            <Link
                              href={buildPlayRunUrl(plan, companyId)}
                              className="text-[11px] font-medium text-violet-400 hover:text-violet-300"
                            >
                              Run Play
                            </Link>
                            <Link
                              href={buildPlayRunUrl(plan, companyId)}
                              className="text-[11px] font-medium text-blue-400 hover:text-blue-300"
                            >
                              {CONTENT_TYPE_LABELS[contentType] ?? 'Draft Content'}
                            </Link>
                            <button
                              type="button"
                              onClick={() => updateStatus(plan.id, 'approved')}
                              disabled={updatingId === plan.id}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(plan.id, 'dismissed')}
                              disabled={updatingId === plan.id}
                              className="text-[11px] text-gray-400 hover:text-gray-300 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {effectiveStatus === 'approved' && (
                          <>
                            <Link
                              href={buildPlayRunUrl(plan, companyId)}
                              className="text-[11px] font-medium text-violet-400 hover:text-violet-300"
                            >
                              Run Play
                            </Link>
                            <Link
                              href={buildPlayRunUrl(plan, companyId)}
                              className="text-[11px] font-medium text-blue-400 hover:text-blue-300"
                            >
                              {CONTENT_TYPE_LABELS[contentType] ?? 'Draft Content'}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

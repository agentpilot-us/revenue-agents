'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Plan = {
  title: string;
  description: string;
  phaseOrder: number;
  phaseName: string;
  weekRange: string | null;
  contentType: string;
  targetDivisionName?: string;
  targetContactRole?: string;
  triggerSignalType?: string;
  productFraming?: string;
  existingProductReference?: string;
  objectionAddressed?: string;
};

type Phase = {
  phaseOrder: number;
  phaseName: string;
  weekRange: string | null;
  plans: Plan[];
};

type Props = {
  preview: { phases: Phase[] };
  roadmapId: string;
  targetId: string;
  templateId: string;
  onClose: () => void;
  onRegenerate: () => void;
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  event_invite: 'Event Invite',
  presentation: 'Presentation',
  one_pager: 'One-Pager',
  case_study: 'Case Study',
  talking_points: 'Talking Points',
  roi_deck: 'ROI Deck',
};

const FRAMING_BADGES: Record<string, { label: string; color: string }> = {
  expansion: { label: 'Expansion', color: 'bg-emerald-500/20 text-emerald-300' },
  upgrade: { label: 'Upgrade', color: 'bg-blue-500/20 text-blue-300' },
  prerequisite_met: { label: 'Prerequisite Met', color: 'bg-amber-500/20 text-amber-300' },
  net_new: { label: 'Net New', color: 'bg-gray-500/20 text-gray-300' },
};

export function PlanPreviewModal({
  preview,
  roadmapId,
  targetId,
  templateId,
  onClose,
  onRegenerate,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [phases, setPhases] = useState<Phase[]>(preview.phases);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const totalPlans = phases.reduce((sum, p) => sum + p.plans.length, 0);

  const removePlan = (phaseOrder: number, planIndex: number) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.phaseOrder === phaseOrder
          ? { ...phase, plans: phase.plans.filter((_, i) => i !== planIndex) }
          : phase
      )
    );
  };

  const updateTitle = (phaseOrder: number, planIndex: number, newTitle: string) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.phaseOrder === phaseOrder
          ? {
              ...phase,
              plans: phase.plans.map((p, i) =>
                i === planIndex ? { ...p, title: newTitle } : p
              ),
            }
          : phase
      )
    );
    setEditingTitle(null);
  };

  const toggleCollapse = (phaseOrder: number) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseOrder)) next.delete(phaseOrder);
      else next.add(phaseOrder);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allPlans = phases.flatMap((phase) => phase.plans);
      const res = await fetch(
        `/api/roadmap/targets/${targetId}/generate-plans/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roadmapId,
            templateId,
            plans: allPlans,
          }),
        }
      );
      if (res.ok) {
        router.refresh();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Play Preview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalPlans} play{totalPlans !== 1 ? 's' : ''} across{' '}
              {phases.length} phase{phases.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {phases.map((phase) => (
            <div key={phase.phaseOrder}>
              <button
                type="button"
                onClick={() => toggleCollapse(phase.phaseOrder)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700"
              >
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Phase {phase.phaseOrder}: {phase.phaseName}
                  </span>
                  {phase.weekRange && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {phase.weekRange}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {phase.plans.length} play{phase.plans.length !== 1 ? 's' : ''}
                  {collapsedPhases.has(phase.phaseOrder) ? ' ▸' : ' ▾'}
                </span>
              </button>

              {!collapsedPhases.has(phase.phaseOrder) && (
                <div className="mt-2 space-y-2 pl-2">
                  {phase.plans.map((plan, idx) => {
                    const editKey = `${phase.phaseOrder}-${idx}`;
                    const isEditing = editingTitle === editKey;
                    const framingBadge = plan.productFraming
                      ? FRAMING_BADGES[plan.productFraming]
                      : null;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 dark:border-zinc-600 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={plan.title}
                                autoFocus
                                onBlur={(e) =>
                                  updateTitle(
                                    phase.phaseOrder,
                                    idx,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateTitle(
                                      phase.phaseOrder,
                                      idx,
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                }}
                                className="w-full text-sm font-medium rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-zinc-700 px-2 py-1 text-gray-900 dark:text-gray-100"
                              />
                            ) : (
                              <p
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => setEditingTitle(editKey)}
                                title="Click to edit title"
                              >
                                {plan.title}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {plan.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                {CONTENT_TYPE_LABELS[plan.contentType] ??
                                  plan.contentType}
                              </span>
                              {plan.targetDivisionName && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-300">
                                  {plan.targetDivisionName}
                                </span>
                              )}
                              {framingBadge && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${framingBadge.color}`}
                                >
                                  {framingBadge.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePlan(phase.phaseOrder, idx)}
                            className="text-red-400 hover:text-red-300 text-sm shrink-0"
                            title="Remove play"
                          >
                            x
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {phase.plans.length === 0 && (
                    <p className="text-xs text-gray-400 italic pl-2">
                      No plays for this phase.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={onRegenerate}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Regenerate
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || totalPlans === 0}
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save ${totalPlans} Plays to Sales Map`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

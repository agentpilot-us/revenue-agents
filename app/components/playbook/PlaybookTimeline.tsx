'use client';

/**
 * PlaybookTimeline.tsx
 *
 * Shows all active playbook runs for a company as a visual timeline.
 * Each step shows: due date, status, play type, channel, assigned role.
 * Due steps have a "Run play →" CTA that goes to the run page.
 *
 * Usage:
 *   <PlaybookTimeline companyId={company.id} companyName={company.name} />
 *
 * Place on the company detail page as a tab or section.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildNextBestActionHref } from '@/lib/dashboard/signal-play-href';

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus = 'upcoming' | 'due' | 'in_progress' | 'completed' | 'skipped';

type PlaybookStepRun = {
  id: string;
  order: number;
  dueAt: string; // ISO
  status: StepStatus;
  name: string;
  description?: string | null;
  playId: string;
  assetTypes: string[];
  channel: string;
  assignedRole?: string | null;
  requiresApproval: boolean;
  promptHint?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  generatedEmail?: string | null;
  generatedLinkedin?: string | null;
  generatedTalkingPoints?: string | null;
};

type PlaybookRun = {
  id: string;
  templateName: string;
  triggerLabel?: string | null;
  triggerDate: string;
  status: string;
  currentStepOrder: number;
  steps: PlaybookStepRun[];
};

// ── API → UI mapping (our API returns Prisma shape) ────────────────────────────

type ApiRunStep = { id: string; stepOrder: number; completedAt: string | null; outcome: Record<string, unknown> | null };
type ApiTemplateStep = { order: number; label: string; promptHint: string | null; channel: string | null };
type ApiRun = {
  id: string;
  template: { name: string; steps: ApiTemplateStep[] };
  triggerContext: { triggerDate?: string; triggerLabel?: string } | null;
  startedAt: string;
  status: string;
  currentStep: number;
  steps: ApiRunStep[];
};

function mapRunsToUI(runs: ApiRun[]): PlaybookRun[] {
  return runs.map((run) => {
    const triggerDate = run.triggerContext?.triggerDate ?? run.startedAt;
    const triggerLabel = run.triggerContext?.triggerLabel ?? null;
    const templateSteps = run.template.steps;
    const runStepsByOrder = new Map(run.steps.map((s) => [s.stepOrder, s]));

    const steps: PlaybookStepRun[] = templateSteps.map((ts, idx) => {
      const runStep = runStepsByOrder.get(ts.order);
      const completedAt = runStep?.completedAt ?? null;
      const outcome = (runStep?.outcome as Record<string, unknown> | null) ?? null;
      const isSkipped = outcome?.skipped === true;
      const stepNumber = idx + 1;
      const isCurrent = run.currentStep === stepNumber;
      const isPast = run.currentStep > stepNumber;

      let status: StepStatus = 'upcoming';
      if (completedAt) status = isSkipped ? 'skipped' : 'completed';
      else if (isCurrent) status = 'due';
      else if (isPast) status = 'completed';

      const dueDate = new Date(triggerDate);
      dueDate.setDate(dueDate.getDate() + (stepNumber - 1) * 7);

      return {
        id: runStep?.id ?? `placeholder-${run.id}-${ts.order}`,
        order: ts.order,
        dueAt: dueDate.toISOString(),
        status,
        name: ts.label,
        description: null,
        playId: 're_engagement',
        assetTypes: ['email', 'linkedin', 'talking_points'],
        channel: ts.channel ?? 'email',
        assignedRole: null,
        requiresApproval: false,
        promptHint: ts.promptHint ?? null,
        completedAt: completedAt ?? null,
        notes: (outcome?.notes as string) ?? null,
        generatedEmail: (outcome?.generatedEmail as string) ?? null,
        generatedLinkedin: (outcome?.generatedLinkedin as string) ?? null,
        generatedTalkingPoints: (outcome?.generatedTalkingPoints as string) ?? null,
      };
    });

    return {
      id: run.id,
      templateName: run.template.name,
      triggerLabel,
      triggerDate,
      status: run.status,
      currentStepOrder: run.currentStep,
      steps,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, string> = {
  email: '📧',
  linkedin: '💼',
  call: '📞',
  in_person: '🤝',
  internal: '📋',
  meeting: '🤝',
  task: '📋',
};

const ROLE_COLORS: Record<string, string> = {
  ae: 'bg-blue-900/40 text-blue-300 border-blue-700',
  csm: 'bg-green-900/40 text-green-300 border-green-700',
  se: 'bg-purple-900/40 text-purple-300 border-purple-700',
  manager: 'bg-orange-900/40 text-orange-300 border-orange-700',
};

const STATUS_CONFIG: Record<StepStatus, { label: string; dot: string; bg: string; text: string }> = {
  upcoming: { label: 'Upcoming', dot: 'bg-slate-500', bg: 'bg-zinc-800', text: 'text-slate-400' },
  due: { label: 'Due now', dot: 'bg-yellow-400 animate-pulse', bg: 'bg-yellow-900/20 border-yellow-700/50', text: 'text-yellow-300' },
  in_progress: { label: 'In progress', dot: 'bg-blue-400 animate-pulse', bg: 'bg-blue-900/20 border-blue-700/50', text: 'text-blue-300' },
  completed: { label: 'Completed', dot: 'bg-green-500', bg: 'bg-zinc-900', text: 'text-green-400' },
  skipped: { label: 'Skipped', dot: 'bg-slate-600', bg: 'bg-zinc-900', text: 'text-slate-500' },
};

function formatDueDate(isoDate: string): { label: string; urgent: boolean } {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return { label: `${overdue}d overdue`, urgent: true };
  }
  if (diffDays === 0) return { label: 'Today', urgent: true };
  if (diffDays === 1) return { label: 'Tomorrow', urgent: true };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, urgent: true };
  if (diffDays <= 30) return { label: `In ${diffDays} days`, urgent: false };
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgent: false,
  };
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  companyId,
  runId,
  triggerLabel,
  onMarkComplete,
  onSkip,
}: {
  step: PlaybookStepRun;
  companyId: string;
  runId: string;
  triggerLabel?: string | null;
  onMarkComplete: (stepId: string, notes: string) => Promise<void>;
  onSkip: (stepId: string, reason: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(step.status === 'due' || step.status === 'in_progress');
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const cfg = STATUS_CONFIG[step.status];
  const dueInfo = formatDueDate(step.dueAt);
  const isActionable = step.status === 'due' || step.status === 'in_progress';
  const isDone = step.status === 'completed' || step.status === 'skipped';

  const runPlayHref = buildNextBestActionHref({
    companyId,
    playId: step.playId,
    segmentName: undefined,
    triggerText: step.promptHint ?? `${step.name} — ${triggerLabel ?? ''}`,
  });

  const handleMarkComplete = async () => {
    setSavingNotes(true);
    await onMarkComplete(step.id, notes);
    setSavingNotes(false);
    setCompleting(false);
  };

  return (
    <div className={`rounded-xl border ${isDone ? 'border-slate-700/40 opacity-60' : 'border-slate-700'} ${cfg.bg} transition-all`}>
      {/* Header row */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex flex-col items-center gap-1 mt-1.5 flex-shrink-0">
          <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 ${cfg.dot}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base leading-none">{CHANNEL_ICONS[step.channel] ?? '▶'}</span>
            <span className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
              {step.name}
            </span>
            {step.assignedRole && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${ROLE_COLORS[step.assignedRole] ?? 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                {step.assignedRole.toUpperCase()}
              </span>
            )}
            {step.requiresApproval && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-300 border border-orange-700/50">
                Needs approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-medium ${dueInfo.urgent && !isDone ? 'text-yellow-400' : 'text-slate-500'}`}>
              {isDone && step.completedAt
                ? `Completed ${new Date(step.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : dueInfo.label}
            </span>
            <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
            <span className="text-xs text-slate-600">
              {step.assetTypes.join(' · ')}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isActionable && step.channel !== 'internal' && (
            <Link
              href={runPlayHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Run play →
            </Link>
          )}
          {isActionable && (
            <button
              onClick={() => setCompleting(!completing)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-600 text-slate-300 hover:text-white hover:bg-zinc-700 text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Mark done
            </button>
          )}
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-3">
          {step.description && (
            <p className="text-sm text-slate-400">{step.description}</p>
          )}

          {step.generatedEmail && (
            <div className="rounded-lg bg-zinc-900 border border-slate-700 p-3">
              <p className="text-xs font-medium text-slate-400 mb-1.5">📧 Email draft saved</p>
              <p className="text-xs text-slate-300 line-clamp-3 whitespace-pre-wrap">
                {step.generatedEmail.split('\n').slice(0, 3).join('\n')}
              </p>
              <Link href={runPlayHref} className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">
                View full email →
              </Link>
            </div>
          )}

          {step.notes && !completing && (
            <div className="text-xs text-slate-400 italic">
              Notes: {step.notes}
            </div>
          )}

          {completing && (
            <div className="space-y-2 pt-1">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes (outcome, next steps, anything to remember)"
                rows={2}
                className="w-full text-sm bg-zinc-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMarkComplete}
                  disabled={savingNotes}
                  className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-60"
                >
                  {savingNotes ? 'Saving…' : 'Mark complete'}
                </button>
                <button
                  onClick={() => onSkip(step.id, '')}
                  className="px-3 py-1.5 border border-slate-600 text-slate-400 hover:text-white text-xs font-medium rounded-lg"
                >
                  Skip
                </button>
                <button
                  onClick={() => setCompleting(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Playbook run card ─────────────────────────────────────────────────────────

function PlaybookRunCard({
  run,
  companyId,
  onRefresh,
}: {
  run: PlaybookRun;
  companyId: string;
  onRefresh: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const dueSteps = run.steps.filter((s) => s.status === 'due');
  const completedCount = run.steps.filter((s) => s.status === 'completed').length;
  const progress = Math.round((completedCount / run.steps.length) * 100);

  const handleMarkComplete = async (stepId: string, notes: string) => {
    await fetch(`/api/companies/${companyId}/playbooks/steps/${stepId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: notes ? { notes } : undefined }),
    });
    onRefresh();
  };

  const handleSkip = async (stepId: string, _reason: string) => {
    await fetch(`/api/companies/${companyId}/playbooks/steps/${stepId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    onRefresh();
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-zinc-800/30 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-800/50"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-lg">
              {run.triggerLabel?.toLowerCase().includes('renewal') ? '🔄'
                : run.triggerLabel?.toLowerCase().includes('event') ? '📅'
                : '🎯'}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{run.templateName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{run.triggerLabel ?? `Trigger: ${new Date(run.triggerDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {dueSteps.length > 0 && (
            <span className="text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 px-2 py-1 rounded-full">
              {dueSteps.length} due
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}%</span>
          </div>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-slate-500">
              {completedCount} of {run.steps.length} steps complete
            </span>
            <span className="text-xs text-slate-500">
              Step {run.currentStepOrder} of {run.steps.length} active
            </span>
          </div>

          <div className="space-y-2">
            {run.steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                companyId={companyId}
                runId={run.id}
                triggerLabel={run.triggerLabel}
                onMarkComplete={handleMarkComplete}
                onSkip={handleSkip}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlaybookTimeline({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewRunModal, setShowNewRunModal] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/playbooks/runs`);
      if (!res.ok) throw new Error('Failed to load playbooks');
      const data = await res.json();
      setRuns(mapRunsToUI(data.runs ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading playbooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [companyId]);

  const dueCount = runs.flatMap((r) => r.steps).filter((s) => s.status === 'due').length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-700 bg-zinc-800/30 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-300 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Playbooks</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {runs.length === 0
              ? `No active playbooks for ${companyName}`
              : `${runs.length} active playbook${runs.length !== 1 ? 's' : ''}${dueCount > 0 ? ` · ${dueCount} step${dueCount !== 1 ? 's' : ''} due` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowNewRunModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start playbook
        </button>
      </div>

      {runs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-600 bg-zinc-900/30 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-white font-semibold mb-1">No active playbooks</p>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Start a playbook to guide your team through a structured sequence — renewal, new logo pursuit, or event acceleration.
          </p>
          <button
            onClick={() => setShowNewRunModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Start a playbook →
          </button>
        </div>
      )}

      {runs.map((run) => (
        <PlaybookRunCard
          key={run.id}
          run={run}
          companyId={companyId}
          onRefresh={fetchRuns}
        />
      ))}

      {showNewRunModal && (
        <StartPlaybookModal
          companyId={companyId}
          companyName={companyName}
          onClose={() => setShowNewRunModal(false)}
          onStarted={() => {
            setShowNewRunModal(false);
            fetchRuns();
          }}
        />
      )}
    </div>
  );
}

// ── Start playbook modal ──────────────────────────────────────────────────────

function StartPlaybookModal({
  companyId,
  companyName,
  onClose,
  onStarted,
}: {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; triggerType: string; stepCount: number }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerLabel, setTriggerLabel] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/playbooks/templates')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.templates ?? []).map((t: { id: string; name: string; description: string | null; triggerType?: string; stepCount?: number; steps?: unknown[] }) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? '',
          triggerType: t.triggerType ?? (t.name.toLowerCase().includes('renewal') ? 'renewal' : t.name.toLowerCase().includes('event') ? 'event' : t.name.toLowerCase().includes('logo') ? 'new_logo' : 'manual'),
          stepCount: t.stepCount ?? t.steps?.length ?? 0,
        }));
        setTemplates(list);
      });
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selected);

  const handleStart = async () => {
    if (!selected || !triggerDate) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/playbooks/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selected,
          triggerContext: {
            triggerDate,
            triggerLabel: triggerLabel || selectedTemplate?.name ?? undefined,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to start');
      }
      onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error starting playbook');
    } finally {
      setStarting(false);
    }
  };

  const TRIGGER_LABELS: Record<string, string> = {
    renewal: 'Renewal date',
    new_logo: 'Campaign start date',
    event: 'Event date',
    expansion: 'Target close date',
    manual: 'Anchor date',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Start a playbook for {companyName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Choose playbook</label>
            <div className="space-y-2">
              {templates.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selected === t.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 hover:border-slate-500 bg-zinc-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={selected === t.id}
                    onChange={() => setSelected(t.id)}
                    className="mt-1 text-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{t.stepCount} steps · {t.triggerType}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selected && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {TRIGGER_LABELS[selectedTemplate?.triggerType ?? 'manual'] ?? 'Anchor date'}
              </label>
              <input
                type="date"
                value={triggerDate}
                onChange={(e) => setTriggerDate(e.target.value)}
                className="w-full bg-zinc-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                All step due dates are calculated relative to this date.
              </p>
            </div>
          )}

          {selected && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Label <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={triggerLabel}
                onChange={(e) => setTriggerLabel(e.target.value)}
                placeholder={`e.g. "Renewal: March 15, 2026" or "Event: Celigo CONNECT 2026"`}
                className="w-full bg-zinc-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-600 text-slate-300 text-sm font-medium rounded-xl hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selected || !triggerDate || starting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {starting ? 'Starting…' : 'Start playbook →'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';

type PlayRun = {
  id: string;
  companyId: string;
  status: string;
  createdAt?: string;
  company: { id: string; name: string };
  playTemplate: { id: string; name: string; slug: string };
  phaseRuns: Array<{
    id: string;
    status: string;
    phaseTemplate: { id: string; name: string; orderIndex: number; gateType?: string };
    actions: Array<{
      id: string;
      title: string;
      status: string;
      actionType: string;
      suggestedDate: string | null;
      contactName: string | null;
      contactEmail: string | null;
      contactTitle: string | null;
      generatedContent: string | null;
      generatedSubject: string | null;
      editedContent: string | null;
      editedSubject: string | null;
      cooldownWarning: string | null;
      alternateContact: string | null;
      contentTemplate: {
        id: string;
        name: string;
        contentType: string;
        channel?: string | null;
        contentGenerationType?: string | null;
      } | null;
    }>;
  }>;
};

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
};

type Props = {
  companyId: string;
  companyName: string;
  runId: string;
};

/** Primary CTA label for Generate button based on content generation type or channel. */
function getGenerateButtonLabel(action: PlayRun['phaseRuns'][0]['actions'][0]): string {
  const ct = action.contentTemplate;
  if (!ct) return 'Generate';
  const type = (ct as { contentGenerationType?: string | null }).contentGenerationType;
  const channel = (ct as { channel?: string | null }).channel?.toUpperCase();
  if (type) {
    if (type === 'contact_research') return 'Research Contacts';
    if (type === 'meeting_talking_points' || type === 'meeting_agenda') return 'Prep Meeting';
    if (type === 'executive_briefing' || type === 'account_research_brief') return 'Generate Brief';
    if (type.startsWith('linkedin_')) return 'Generate LinkedIn';
    if (type === 'phone_call_script') return 'Generate Call Script';
  }
  if (channel === 'EMAIL' || ct.contentType === 'EMAIL') return 'Generate Email';
  if (channel === 'LINKEDIN') return 'Generate LinkedIn';
  return 'Generate';
}

/** Local edit state per action: subject and body shown in the form (edited or generated). */
function getActionContent(action: PlayRun['phaseRuns'][0]['actions'][0]) {
  const subject = action.editedSubject ?? action.generatedSubject ?? '';
  const body = action.editedContent ?? action.generatedContent ?? '';
  return { subject: typeof subject === 'string' ? subject : '', body: typeof body === 'string' ? body : '' };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Compute "Day N" (0-based) for an action from suggestedDate. Reference = earliest suggestedDate in run, or run createdAt. */
function getDayLabel(
  actionSuggestedDate: string | null,
  referenceDateMs: number
): string | null {
  if (!actionSuggestedDate) return null;
  const actionMs = new Date(actionSuggestedDate).getTime();
  const dayOffset = Math.round((actionMs - referenceDateMs) / ONE_DAY_MS);
  return dayOffset >= 0 ? `Day ${dayOffset}` : null;
}

/** Get reference timestamp for "Day 0" (earliest action suggestedDate, or run createdAt). */
function getRunReferenceDateMs(run: PlayRun): number {
  let earliest: number | null = null;
  const runCreated = run.createdAt ? new Date(run.createdAt).getTime() : null;
  for (const pr of run.phaseRuns) {
    for (const a of pr.actions) {
      if (a.suggestedDate) {
        const ms = new Date(a.suggestedDate).getTime();
        if (earliest == null || ms < earliest) earliest = ms;
      }
    }
  }
  return earliest ?? runCreated ?? Date.now();
}

type PhaseActionSectionProps = {
  phase: PlayRun['phaseRuns'][number];
  run: PlayRun;
  busyActionId: string | null;
  busyPhaseRunId: string | null;
  actionEdits: Record<string, { subject: string; body: string }>;
  setActionEdits: Dispatch<SetStateAction<Record<string, { subject: string; body: string }>>>;
  onGenerate: (actionId: string) => void;
  onExecute: (actionId: string) => void;
  onSkip: (actionId: string) => void;
  onSaveEdit: (actionId: string) => void;
  onCompletePhase: (phaseRunId: string) => void;
};

/** One phase card: phase header, collapsible completed steps, expanded active steps. */
function PhaseActionSection({
  phase,
  run,
  busyActionId,
  busyPhaseRunId,
  actionEdits,
  setActionEdits,
  onGenerate,
  onExecute,
  onSkip,
  onSaveEdit,
  onCompletePhase,
}: PhaseActionSectionProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const completedActions = phase.actions.filter(
    (a) => a.status === 'EXECUTED' || a.status === 'SKIPPED',
  );
  const activeActions = phase.actions.filter(
    (a) => a.status !== 'EXECUTED' && a.status !== 'SKIPPED',
  );

  const renderActionCard = (action: (typeof phase.actions)[number]) => {
    const isBusy = busyActionId === action.id;
    const canGenerate =
      (action.status === 'PENDING' || action.status === 'REVIEWED') && action.contentTemplate;
    const canExecute =
      (action.status === 'PENDING' || action.status === 'REVIEWED' || action.status === 'EDITED') &&
      !!(action.generatedContent || action.editedContent);
    const canSkip = action.status !== 'EXECUTED' && action.status !== 'SKIPPED';
    const referenceDateMs = run ? getRunReferenceDateMs(run) : 0;
    const dayLabel = run ? getDayLabel(action.suggestedDate ?? null, referenceDateMs) : null;
    const isChampionSpecStep =
      run?.playTemplate?.slug === 'expansion-dgx-to-drive-thor' &&
      (action.title?.toLowerCase().includes('send drive thor spec') ?? false);

    return (
      <div
        key={action.id}
        style={{
          padding: 12,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${t.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {dayLabel && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: t.text3,
                    padding: '3px 6px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 4,
                  }}
                >
                  {dayLabel}
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>{action.title}</span>
            </div>
            {action.contactName && (
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                → {action.contactName}
                {action.contactTitle && ` · ${action.contactTitle}`}
              </div>
            )}
            {action.cooldownWarning && (
              <div
                style={{
                  fontSize: 11,
                  color: t.amber,
                  marginTop: 4,
                  padding: 6,
                  background: t.amberBg,
                  borderRadius: 6,
                }}
              >
                {action.cooldownWarning}
                {action.alternateContact && (
                  <div style={{ marginTop: 4 }}>Alternate: {action.alternateContact}</div>
                )}
              </div>
            )}
            {(action.generatedContent || action.editedContent) &&
              (() => {
                const edit = actionEdits[action.id] ?? getActionContent(action);
                return (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: t.text3,
                        marginBottom: 6,
                        letterSpacing: '0.05em',
                      }}
                    >
                      Review
                    </div>
                    {action.actionType === 'SEND_LINKEDIN' && (
                      <p style={{ fontSize: 11, color: t.text3, margin: '0 0 8px' }}>
                        LinkedIn connection request (no subject line)
                      </p>
                    )}
                    {action.actionType === 'SEND_EMAIL' ? (
                      <>
                        <label
                          style={{
                            display: 'block',
                            fontSize: 11,
                            fontWeight: 600,
                            color: t.text2,
                            marginBottom: 4,
                          }}
                        >
                          Subject
                        </label>
                        <input
                          type="text"
                          value={edit.subject}
                          onChange={(e) =>
                            setActionEdits((prev) => ({
                              ...prev,
                              [action.id]: { ...(prev[action.id] ?? edit), subject: e.target.value },
                            }))
                          }
                          placeholder="Subject line"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: `1px solid ${t.border}`,
                            background: 'rgba(0,0,0,0.2)',
                            color: t.text1,
                            fontSize: 12,
                            marginBottom: 8,
                            boxSizing: 'border-box',
                          }}
                        />
                      </>
                    ) : null}
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 600,
                        color: t.text2,
                        marginBottom: 4,
                      }}
                    >
                      Body
                    </label>
                    <textarea
                      value={edit.body}
                      onChange={(e) =>
                        setActionEdits((prev) => ({
                          ...prev,
                          [action.id]: { ...(prev[action.id] ?? edit), body: e.target.value },
                        }))
                      }
                      placeholder="Email body"
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: `1px solid ${t.border}`,
                        background: 'rgba(0,0,0,0.2)',
                        color: t.text1,
                        fontSize: 12,
                        resize: 'vertical',
                        whiteSpace: 'pre-wrap',
                        boxSizing: 'border-box',
                      }}
                    />
                    {canExecute && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSaveEdit(action.id)}
                        style={{
                          marginTop: 6,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: `1px solid ${t.border}`,
                          background: 'transparent',
                          color: t.text2,
                          fontSize: 11,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Save edits
                      </button>
                    )}
                  </div>
                );
              })()}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {action.status === 'EXECUTED' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.green,
                  padding: '4px 8px',
                  background: t.greenBg,
                  borderRadius: 6,
                }}
              >
                {action.actionType === 'SEND_EMAIL' || action.actionType === 'SEND_LINKEDIN'
                  ? 'Sent'
                  : 'Complete'}
              </span>
            )}
            {action.status === 'SKIPPED' && (
              <span style={{ fontSize: 10, color: t.text3 }}>Skipped</span>
            )}
            {canGenerate && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onGenerate(action.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: t.blueBg,
                  color: t.blue,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {isBusy ? '…' : getGenerateButtonLabel(action)}
              </button>
            )}
            {isChampionSpecStep && (
              <a
                href="/demo/nvidia-gm-executive-brief.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.text2,
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Generate Executive Brief
              </a>
            )}
            {canExecute && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onExecute(action.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {isBusy
                  ? '…'
                  : action.actionType === 'SEND_EMAIL'
                    ? 'Send'
                    : action.actionType === 'SEND_LINKEDIN'
                      ? 'Send'
                      : action.actionType === 'REVIEW_BRIEF'
                        ? 'Task Done'
                        : 'Complete'}
              </button>
            )}
            {canSkip && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onSkip(action.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.text3,
                  fontSize: 11,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: t.surface,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>
          {phase.phaseTemplate.name}
          <span style={{ fontSize: 11, color: t.text3, fontWeight: 400, marginLeft: 8 }}>
            {phase.status}
          </span>
        </div>
        {phase.status === 'ACTIVE' &&
          phase.phaseTemplate.gateType === 'MANUAL' &&
          phase.actions.every((a) => a.status === 'EXECUTED' || a.status === 'SKIPPED') && (
            <button
              type="button"
              disabled={busyPhaseRunId === phase.id}
              onClick={() => onCompletePhase(phase.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: t.greenBg,
                color: t.green,
                fontSize: 11,
                fontWeight: 600,
                cursor: busyPhaseRunId === phase.id ? 'not-allowed' : 'pointer',
              }}
            >
              {busyPhaseRunId === phase.id ? '…' : 'Complete Phase'}
            </button>
          )}
      </div>
      <div style={{ padding: 12 }}>
        {completedActions.length > 0 && (
          <div style={{ marginBottom: activeActions.length > 0 ? 16 : 0 }}>
            <button
              type="button"
              onClick={() => setCompletedExpanded((e) => !e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: t.text2,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span aria-hidden style={{ fontSize: 10, width: 14 }}>
                {completedExpanded ? '▼' : '▶'}
              </span>
              <span>
                {completedActions.length} step{completedActions.length === 1 ? '' : 's'} completed
              </span>
            </button>
            {completedExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {completedActions.map((action) => renderActionCard(action))}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeActions.map((action) => renderActionCard(action))}
        </div>
      </div>
    </div>
  );
}

export default function PlayRunExecuteClient({
  companyId,
  companyName,
  runId,
}: Props) {
  const [run, setRun] = useState<PlayRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [busyPhaseRunId, setBusyPhaseRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Error from last Generate click (shown as banner; does not replace page). */
  const [generateError, setGenerateError] = useState<string | null>(null);
  /** Per-action subject/body for editing. Key = action.id. Synced from run when run loads/updates. */
  const [actionEdits, setActionEdits] = useState<Record<string, { subject: string; body: string }>>({});

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/play-runs/${runId}`);
      if (!res.ok) throw new Error('Failed to load run');
      const data = await res.json();
      setRun(data.playRun);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  // Sync local edit state from run when run loads or updates
  useEffect(() => {
    if (!run) {
      setActionEdits({});
      return;
    }
    const next: Record<string, { subject: string; body: string }> = {};
    for (const phase of run.phaseRuns) {
      for (const action of phase.actions) {
        if (action.generatedContent || action.editedContent) {
          next[action.id] = getActionContent(action);
        }
      }
    }
    setActionEdits(next);
  }, [run]);

  const handleCompletePhase = async (phaseRunId: string) => {
    setBusyPhaseRunId(phaseRunId);
    try {
      const res = await fetch(
        `/api/play-runs/${runId}/phases/${phaseRunId}/complete`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Complete phase failed');
      await fetchRun();
    } catch (err) {
      console.error('Complete phase error:', err);
    } finally {
      setBusyPhaseRunId(null);
    }
  };

  const handleSaveEdit = async (actionId: string) => {
    const edit = actionEdits[actionId];
    if (edit == null) return;
    setBusyActionId(actionId);
    try {
      const res = await fetch(
        `/api/play-runs/${runId}/actions/${actionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editedSubject: edit.subject, editedContent: edit.body }),
        },
      );
      if (!res.ok) throw new Error('Save failed');
      await fetchRun();
    } catch (err) {
      console.error('Save edit error:', err);
    } finally {
      setBusyActionId(null);
    }
  };

  const handleGenerate = async (actionId: string) => {
    setGenerateError(null);
    setBusyActionId(actionId);
    try {
      const res = await fetch(
        `/api/play-runs/${runId}/actions/${actionId}/generate`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = typeof body?.error === 'string' ? body.error : 'Generate failed';
        throw new Error(message);
      }
      await fetchRun();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generate failed';
      setGenerateError(message);
      console.error('Generate error:', err);
    } finally {
      setBusyActionId(null);
    }
  };

  const handleExecute = async (actionId: string) => {
    const edit = actionEdits[actionId];
    setBusyActionId(actionId);
    try {
      // Persist current subject/body so Send sends what the user sees
      if (edit) {
        await fetch(
          `/api/play-runs/${runId}/actions/${actionId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ editedSubject: edit.subject, editedContent: edit.body }),
          },
        );
      }
      const res = await fetch(
        `/api/play-runs/${runId}/actions/${actionId}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edit ? { subject: edit.subject, body: edit.body } : {}),
        },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Execute failed');
      }
      await fetchRun();
    } catch (err) {
      console.error('Execute error:', err);
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSkip = async (actionId: string) => {
    setBusyActionId(actionId);
    try {
      const res = await fetch(
        `/api/play-runs/${runId}/actions/${actionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SKIPPED' }),
        },
      );
      if (!res.ok) throw new Error('Skip failed');
      await fetchRun();
    } catch (err) {
      console.error('Skip error:', err);
    } finally {
      setBusyActionId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', background: t.bg, padding: 48, textAlign: 'center' }}>
        <p style={{ color: t.text2 }}>Loading run...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div style={{ minHeight: '60vh', background: t.bg, padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#f87171' }}>{error ?? 'Run not found'}</p>
        <Link
          href={`/dashboard/companies/${companyId}`}
          style={{ color: t.blue, marginTop: 12, display: 'inline-block' }}
        >
          ← Back to {companyName}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', background: t.bg, minHeight: '60vh' }}>
      {generateError && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 8,
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>{generateError}</span>
          <button
            type="button"
            onClick={() => setGenerateError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.text2,
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 12,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link
            href={`/dashboard/companies/${companyId}`}
            style={{ fontSize: 12, color: t.text3, textDecoration: 'none', marginBottom: 4, display: 'block' }}
          >
            ← {companyName}
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text1, margin: 0 }}>
            {run.playTemplate.name}
          </h1>
          <p style={{ fontSize: 12, color: t.text3, margin: '4px 0 0' }}>
            Run on {run.company.name} · {run.status}
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: t.blueBg,
            border: `1px solid rgba(59,130,246,0.25)`,
            color: t.blue,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          My Day
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {run.phaseRuns.map((phase) => (
          <PhaseActionSection
            key={phase.id}
            phase={phase}
            run={run}
            busyActionId={busyActionId}
            busyPhaseRunId={busyPhaseRunId}
            actionEdits={actionEdits}
            setActionEdits={setActionEdits}
            onGenerate={handleGenerate}
            onExecute={handleExecute}
            onSkip={handleSkip}
            onSaveEdit={handleSaveEdit}
            onCompletePhase={handleCompletePhase}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';

type PlayRun = {
  id: string;
  companyId: string;
  status: string;
  createdAt?: string;
  targetCompanyDepartmentId?: string | null;
  company: { id: string; name: string };
  playTemplate: {
    id: string;
    name: string;
    slug: string;
    templateRoles?: Array<{
      id: string;
      key: string;
      label: string;
      isRequired: boolean;
      apolloTitleTerms?: string | null;
    }>;
  };
  roadmapTarget?: { id: string; name: string; companyDepartmentId?: string | null } | null;
  runContacts?: Array<{
    id: string;
    playTemplateRoleId: string;
    contactId: string | null;
    status: string;
    playTemplateRole: {
      id: string;
      key: string;
      label: string;
      isRequired: boolean;
      apolloTitleTerms?: string | null;
    };
    contact: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      title: string | null;
      enrichmentStatus: string | null;
    } | null;
  }>;
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
      contactId: string | null;
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
        requiresContact?: boolean;
        playTemplateRoleId?: string | null;
        playTemplateRole?: {
          id: string;
          key: string;
          label: string;
          isRequired: boolean;
        } | null;
      } | null;
      playTemplateRoleId?: string | null;
      targetRoleKey?: string | null;
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
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  amberBorder: 'rgba(245,158,11,0.35)',
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

type PickerContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  enrichmentStatus: string | null;
  engagementStatus: string;
  lastContactedAt: string | null;
};

type ContactDepartmentGroup = {
  department: { id: string | null; name: string };
  contacts: PickerContact[];
};

function pickerDisplayName(c: PickerContact): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function formatLastTouch(iso: string | null): string {
  if (!iso) return 'no touch';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function enrichmentLabel(status: string | null): string {
  if (!status) return '—';
  if (status === 'complete') return 'enriched';
  return status;
}

function actionNeedsContactAssignment(
  action: PlayRun['phaseRuns'][0]['actions'][0],
): boolean {
  const ct = action.contentTemplate;
  if (!ct) return false;
  if (action.status === 'BLOCKED') return true;
  if (action.contactId) return false;
  if (ct.requiresContact) return true;
  return ct.contentType === 'EMAIL' || ct.contentType === 'LINKEDIN_MSG';
}

type PhaseActionSectionProps = {
  phase: PlayRun['phaseRuns'][number];
  run: PlayRun;
  busyActionId: string | null;
  busyPhaseRunId: string | null;
  actionEdits: Record<string, { subject: string; body: string }>;
  setActionEdits: Dispatch<SetStateAction<Record<string, { subject: string; body: string }>>>;
  contactGroups: ContactDepartmentGroup[] | null;
  contactsError: string | null;
  useRosterAssign: boolean;
  onOpenRosterAssign: (playTemplateRoleId: string) => void;
  onAssignContact: (actionId: string, contactId: string | null) => void;
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
  contactGroups,
  contactsError,
  useRosterAssign,
  onOpenRosterAssign,
  onAssignContact,
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
    const roleLabel = action.contentTemplate?.playTemplateRole?.label;
    const assignNeeded = actionNeedsContactAssignment(action);
    const canGenerate =
      (action.status === 'PENDING' || action.status === 'REVIEWED') &&
      action.contentTemplate &&
      !assignNeeded;
    const canExecute =
      (action.status === 'PENDING' || action.status === 'REVIEWED' || action.status === 'EDITED') &&
      !!(action.generatedContent || action.editedContent);
    const canSkip = action.status !== 'EXECUTED' && action.status !== 'SKIPPED';
    const referenceDateMs = run ? getRunReferenceDateMs(run) : 0;
    const dayLabel = run ? getDayLabel(action.suggestedDate ?? null, referenceDateMs) : null;
    const isChampionSpecStep =
      run?.playTemplate?.slug === 'expansion-dgx-to-drive-thor' &&
      (action.title?.toLowerCase().includes('send drive thor spec') ?? false);

    const stepLocked = action.status === 'EXECUTED' || action.status === 'SKIPPED';
    const selectDisabled =
      isBusy || stepLocked || !!contactsError || contactGroups === null;

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
              {roleLabel && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: t.text3,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  → {roleLabel}
                </span>
              )}
            </div>
            {useRosterAssign && assignNeeded && action.playTemplateRoleId && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onOpenRosterAssign(action.playTemplateRoleId!)}
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${t.amberBorder}`,
                  background: t.amberBg,
                  color: t.amber,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }}
              >
                Assign contact{roleLabel ? ` to ${roleLabel}` : ''}
              </button>
            )}
            {contactGroups === null && action.contactName && (
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                → {action.contactName}
                {action.contactTitle && ` · ${action.contactTitle}`}
              </div>
            )}
            {!useRosterAssign && contactGroups !== null && (
              <div style={{ marginTop: 8, maxWidth: '100%' }}>
                {contactsError && (
                  <div style={{ fontSize: 10, color: t.amber, marginBottom: 4 }}>{contactsError}</div>
                )}
                <label
                  htmlFor={`step-contact-${action.id}`}
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 600,
                    color: t.text3,
                    marginBottom: 4,
                    letterSpacing: '0.04em',
                  }}
                >
                  Step contact
                </label>
                <select
                  id={`step-contact-${action.id}`}
                  value={action.contactId ?? ''}
                  disabled={selectDisabled}
                  onChange={(e) => {
                    const v = e.target.value;
                    onAssignContact(action.id, v === '' ? null : v);
                  }}
                  style={{
                    width: '100%',
                    maxWidth: 420,
                    fontSize: 12,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    background: t.surface,
                    color: t.text1,
                    cursor: selectDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">No CRM contact</option>
                  {contactGroups.map((g) => (
                    <optgroup key={g.department.id ?? `unassigned-${g.department.name}`} label={g.department.name}>
                      {g.contacts.map((c) => {
                        const name = pickerDisplayName(c);
                        const titlePart = c.title ? c.title : 'No title';
                        const meta = `${enrichmentLabel(c.enrichmentStatus)} · last ${formatLastTouch(c.lastContactedAt)}`;
                        return (
                          <option key={c.id} value={c.id}>
                            {name} · {titlePart} · {meta}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                {action.contactName && !action.contactId && (
                  <div style={{ fontSize: 10, color: t.text3, marginTop: 4 }}>
                    Text-only name on step (link a CRM contact above to personalize generation): {action.contactName}
                    {action.contactTitle && ` · ${action.contactTitle}`}
                  </div>
                )}
              </div>
            )}
            {contactGroups === null && (
              <div style={{ fontSize: 10, color: t.text3, marginTop: 4 }}>Loading contacts…</div>
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
  /** null = loading; array = loaded (may be empty). */
  const [contactGroups, setContactGroups] = useState<ContactDepartmentGroup[] | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [rosterModalRoleId, setRosterModalRoleId] = useState<string | null>(null);
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [discoverCandidates, setDiscoverCandidates] = useState<
    Array<{
      firstName: string;
      lastName: string;
      title: string;
      email?: string;
      linkedinUrl?: string;
    }>
  >([]);
  const [rosterModalBusy, setRosterModalBusy] = useState(false);
  /** Discover / roster UX messages (domain, Apollo, no results) shown near roster. */
  const [rosterSurfaceError, setRosterSurfaceError] = useState<string | null>(null);

  const useRosterAssign = (run?.runContacts?.length ?? 0) > 0;

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

  useEffect(() => {
    let cancelled = false;
    setContactGroups(null);
    setContactsError(null);
    fetch(`/api/companies/${companyId}/contacts/by-department`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error && typeof data.error === 'string') {
          setContactsError(data.error);
          setContactGroups([]);
          return;
        }
        const raw = data.groups;
        if (!Array.isArray(raw)) {
          setContactGroups([]);
          return;
        }
        const mapped: ContactDepartmentGroup[] = raw.map(
          (g: {
            department: { id: string | null; name: string };
            contacts: Array<{
              id: string;
              firstName: string | null;
              lastName: string | null;
              title: string | null;
              email: string | null;
              enrichmentStatus: string | null;
              engagementStatus?: string;
              lastContactedAt?: string | null;
            }>;
          }) => ({
            department: { id: g.department.id, name: g.department.name },
            contacts: g.contacts.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              title: c.title,
              email: c.email,
              enrichmentStatus: c.enrichmentStatus,
              engagementStatus: c.engagementStatus ?? '—',
              lastContactedAt: c.lastContactedAt ?? null,
            })),
          }),
        );
        setContactGroups(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          setContactsError('Could not load contacts');
          setContactGroups([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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

  const departmentIdForNewContacts =
    run?.roadmapTarget?.companyDepartmentId ?? run?.targetCompanyDepartmentId ?? undefined;

  const handleRosterPatch = async (playTemplateRoleId: string, contactId: string | null) => {
    setRosterModalBusy(true);
    setGenerateError(null);
    setRosterSurfaceError(null);
    try {
      const res = await fetch(`/api/play-runs/${runId}/roster`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playTemplateRoleId, contactId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Roster update failed');
      }
      setRosterModalRoleId(null);
      setDiscoverCandidates([]);
      await fetchRun();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Roster update failed');
    } finally {
      setRosterModalBusy(false);
    }
  };

  const discoverMessageForCode = (
    code: string | undefined,
    fallback: string,
    serverMessage?: string,
  ): string => {
    switch (code) {
      case 'MISSING_DOMAIN':
        return 'This account needs a company domain (set it on the company profile or via research) before Apollo search can run.';
      case 'APOLLO_UNAVAILABLE':
        return (
          serverMessage ||
          'Contact discovery is temporarily unavailable. Check APOLLO_API_KEY in your environment or try again later.'
        );
      case 'NO_RESULTS':
        return (
          serverMessage ||
          'No matches from Apollo. Broaden role hints on the play template, verify the domain, or pick someone from CRM below.'
        );
      default:
        return fallback;
    }
  };

  const handleDiscoverApollo = async (playTemplateRoleId: string) => {
    setDiscoverBusy(true);
    setDiscoverCandidates([]);
    setGenerateError(null);
    setRosterSurfaceError(null);
    try {
      const res = await fetch(
        `/api/play-runs/${runId}/roster/${playTemplateRoleId}/discover`,
        { method: 'POST' },
      );
      const data = await res.json().catch(() => ({}));
      const code = typeof data?.code === 'string' ? data.code : undefined;
      if (!res.ok) {
        const msg = discoverMessageForCode(
          code,
          typeof data?.error === 'string' ? data.error : 'Discovery failed',
          typeof data?.message === 'string' ? data.message : undefined,
        );
        setRosterSurfaceError(msg);
        return;
      }
      const candidates = Array.isArray(data.candidates) ? data.candidates : [];
      if (candidates.length === 0) {
        setRosterSurfaceError(
          discoverMessageForCode(
            code === 'NO_RESULTS' ? 'NO_RESULTS' : undefined,
            'No people returned for this search.',
            typeof data?.message === 'string' ? data.message : undefined,
          ),
        );
        setDiscoverCandidates([]);
        return;
      }
      setDiscoverCandidates(candidates);
    } catch (e) {
      setRosterSurfaceError(e instanceof Error ? e.message : 'Discovery failed');
    } finally {
      setDiscoverBusy(false);
    }
  };

  const handleAddCandidateToRoster = async (
    playTemplateRoleId: string,
    c: { firstName: string; lastName: string; title: string; email?: string; linkedinUrl?: string },
  ) => {
    setRosterModalBusy(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: departmentIdForNewContacts,
          contacts: [
            {
              firstName: c.firstName || undefined,
              lastName: c.lastName || undefined,
              title: c.title || undefined,
              email: c.email || undefined,
              linkedinUrl: c.linkedinUrl || undefined,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Could not add contact');
      }
      const newId = data.contactIds?.[0] as string | undefined;
      if (!newId) throw new Error('No contact id returned');
      await handleRosterPatch(playTemplateRoleId, newId);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Could not add contact');
    } finally {
      setRosterModalBusy(false);
    }
  };

  const handleAssignContact = async (actionId: string, contactId: string | null) => {
    setBusyActionId(actionId);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/play-runs/${runId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = typeof body?.error === 'string' ? body.error : 'Could not update contact';
        throw new Error(message);
      }
      await fetchRun();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update contact';
      setGenerateError(message);
      console.error('Assign contact error:', err);
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
          href={myDayUrlAfterPlayStart(runId, companyId)}
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

      {useRosterAssign && run.runContacts && run.runContacts.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.surface,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: t.text1, margin: '0 0 12px' }}>
            Contact roster
          </h2>
          {rosterSurfaceError && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#fcd34d',
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span>{rosterSurfaceError}</span>
              <button
                type="button"
                onClick={() => setRosterSurfaceError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: t.text3,
                  cursor: 'pointer',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          {run.roadmapTarget?.name && (
            <p style={{ fontSize: 12, color: t.text3, margin: '0 0 12px' }}>
              Division: {run.roadmapTarget.name}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {run.runContacts.map((rc) => {
              const name = rc.contact
                ? [rc.contact.firstName, rc.contact.lastName].filter(Boolean).join(' ') || 'Unknown'
                : null;
              return (
                <div
                  key={rc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text1 }}>
                      {rc.playTemplateRole.label}
                    </div>
                    <div style={{ fontSize: 11, color: t.text3 }}>
                      {name ?? 'Unassigned'} · {rc.status}
                      {rc.contact?.enrichmentStatus && ` · ${enrichmentLabel(rc.contact.enrichmentStatus)}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscoverCandidates([]);
                      setRosterSurfaceError(null);
                      setRosterModalRoleId(rc.playTemplateRole.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: `1px solid ${t.border}`,
                      background: 'transparent',
                      color: t.blue,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Find / assign
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            contactGroups={contactGroups}
            contactsError={contactsError}
            useRosterAssign={useRosterAssign}
            onOpenRosterAssign={(roleId) => {
              setDiscoverCandidates([]);
              setRosterSurfaceError(null);
              setRosterModalRoleId(roleId);
            }}
            onAssignContact={handleAssignContact}
            onGenerate={handleGenerate}
            onExecute={handleExecute}
            onSkip={handleSkip}
            onSaveEdit={handleSaveEdit}
            onCompletePhase={handleCompletePhase}
          />
        ))}
      </div>

      {rosterModalRoleId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !rosterModalBusy && setRosterModalRoleId(null)}
          onKeyDown={(e) => e.key === 'Escape' && !rosterModalBusy && setRosterModalRoleId(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '85vh',
              overflow: 'auto',
              borderRadius: 12,
              border: `1px solid ${t.border}`,
              background: t.surface,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text1, margin: '0 0 12px' }}>
              Assign contact
            </h3>
            <p style={{ fontSize: 12, color: t.text3, margin: '0 0 16px' }}>
              Choose someone already in CRM (by department), or search Apollo below if you need net-new people.
            </p>
            {contactGroups === null && (
              <p style={{ fontSize: 12, color: t.text3, marginBottom: 16 }}>Loading contacts…</p>
            )}
            {contactGroups !== null && contactsError && (
              <p style={{ fontSize: 12, color: '#f87171', marginBottom: 16 }}>{contactsError}</p>
            )}
            {contactGroups !== null && !contactsError && contactGroups.length === 0 && (
              <p style={{ fontSize: 12, color: t.text3, marginBottom: 16 }}>No CRM contacts on this account yet.</p>
            )}
            {contactGroups !== null && contactGroups.length > 0 && (
              <div style={{ marginBottom: 20, maxHeight: 220, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 8 }}>
                  In CRM (by department)
                </div>
                {contactGroups.map((g) => (
                  <div key={g.department.id ?? `dept-${g.department.name}`} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.text4, textTransform: 'uppercase', marginBottom: 6 }}>
                      {g.department.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {g.contacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={rosterModalBusy}
                          onClick={() => void handleRosterPatch(rosterModalRoleId, c.id)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: `1px solid ${t.border}`,
                            background: 'rgba(0,0,0,0.15)',
                            color: t.text1,
                            fontSize: 12,
                            cursor: rosterModalBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {pickerDisplayName(c)}
                            {c.title ? ` · ${c.title}` : ''}
                          </div>
                          <div style={{ fontSize: 10, color: t.text3, marginTop: 2 }}>
                            {c.engagementStatus} · enrich: {enrichmentLabel(c.enrichmentStatus)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                borderTop: `1px solid ${t.border}`,
                paddingTop: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 8 }}>
                Search Apollo (adds to this account)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={discoverBusy || rosterModalBusy}
                  onClick={() => void handleDiscoverApollo(rosterModalRoleId)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: t.blueBg,
                    color: t.blue,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: discoverBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {discoverBusy ? 'Searching…' : 'Search Apollo'}
                </button>
                <button
                  type="button"
                  disabled={rosterModalBusy}
                  onClick={() => {
                    setRosterModalRoleId(null);
                    setDiscoverCandidates([]);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1px solid ${t.border}`,
                    background: 'transparent',
                    color: t.text3,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
            {discoverCandidates.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text3 }}>Apollo results</div>
                {discoverCandidates.map((c, i) => (
                  <div
                    key={`${c.firstName}-${c.lastName}-${i}`}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ fontSize: 12, color: t.text1 }}>
                      <strong>
                        {c.firstName} {c.lastName}
                      </strong>
                      <div style={{ fontSize: 11, color: t.text3 }}>{c.title}</div>
                    </div>
                    <button
                      type="button"
                      disabled={rosterModalBusy}
                      onClick={() => void handleAddCandidateToRoster(rosterModalRoleId, c)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: t.greenBg,
                        color: t.green,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: rosterModalBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Add & assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

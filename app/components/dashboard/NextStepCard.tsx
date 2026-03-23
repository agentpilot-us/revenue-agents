'use client';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.06)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.06)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
};

export type NextStepItem = {
  stepId: string;
  stepOrder: number;
  stepType: string;
  contentType: string | null;
  channel: string | null;
  promptHint: string | null;
  dueAt: string | null;
  status: string;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
  } | null;
  division: {
    id: string;
    customName: string | null;
    type: string;
  } | null;
  workflowId: string;
  workflowTitle: string;
  companyId: string;
  companyName: string;
  templateName: string | null;
  signalTitle: string | null;
  totalSteps: number;
  completedSteps: number;
  runId?: string;
  source?: 'workflow' | 'play_run' | 'sequence';
  whyNow?: string | null;
  contentGenerationType?: string | null;
  runStatus?: string;
  divisionName?: string | null;
  dayLabel?: string | null;
  urgencyTier?: 'Overdue' | 'Today' | 'This Week' | 'Upcoming' | null;
};

export type HighlightPlayRunTarget = { runId: string; companyId?: string };

type Props = {
  item: NextStepItem;
  variant: 'continue' | 'followup';
  onDoThis: (companyId: string, workflowOrRunId: string, source?: 'workflow' | 'play_run' | 'sequence') => void;
  onSkip?: (stepId: string, workflowId: string) => void;
  source?: 'workflow' | 'play_run' | 'sequence';
  runId?: string;
  /** Post-start from catalog: scroll target + brief highlight on My Day */
  highlightPlayRun?: HighlightPlayRunTarget | null;
};

function actionVerb(
  stepType: string,
  contentType: string | null,
  channel: string | null,
  contentGenerationType?: string | null,
): string {
  if (contentGenerationType === 'contact_research') return 'Research contacts';
  if (contentGenerationType === 'meeting_talking_points' || contentGenerationType === 'meeting_agenda') return 'Prep meeting';
  if (contentGenerationType === 'executive_briefing' || contentGenerationType === 'account_research_brief') return 'Generate brief';
  if (contentGenerationType?.startsWith('linkedin_')) return 'Generate LinkedIn';
  if (contentGenerationType === 'phone_call_script') return 'Generate call script';
  if (contentGenerationType?.endsWith('_email')) return 'Generate email';
  if (stepType === 'generate_content') {
    if (contentType === 'email' || channel === 'email') return 'Draft email';
    if (contentType === 'linkedin_inmail' || channel === 'linkedin') return 'Draft LinkedIn message';
    if (contentType === 'talking_points' || channel === 'phone') return 'Prepare talking points';
    if (contentType === 'presentation') return 'Create presentation';
    if (contentType === 'sales_page' || channel === 'sales_page') return 'Build sales page';
    return 'Generate content';
  }
  if (stepType === 'send_content' || stepType === 'send') {
    if (contentType === 'email' || channel === 'email') return 'Send email';
    if (contentType === 'linkedin_inmail' || channel === 'linkedin') return 'Send LinkedIn message';
    return 'Send outreach';
  }
  if (stepType === 'create_meeting' || channel === 'meeting') return 'Schedule meeting';
  if (stepType === 'manual_task') {
    if (channel === 'phone') return 'Make call';
    if (channel === 'linkedin') return 'Connect on LinkedIn';
    return 'Complete task';
  }
  return 'Next step';
}

function shortPromptLabel(hint: string | null): string | null {
  if (!hint) return null;
  const label = hint.split(':')[0].trim();
  if (label.length > 50) return label.slice(0, 47) + '...';
  return label;
}

function dueLabel(dueAt: string | null): { text: string; color: string; bg: string } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return { text: `${Math.abs(diffDays)}d overdue`, color: t.red, bg: t.redBg };
  if (diffDays < 0) return { text: 'Overdue', color: t.red, bg: t.redBg };
  if (diffDays === 0) return { text: 'Due today', color: t.amber, bg: t.amberBg };
  if (diffDays === 1) return { text: 'Due tomorrow', color: t.amber, bg: t.amberBg };
  return { text: `Due in ${diffDays}d`, color: t.text3, bg: 'rgba(255,255,255,0.04)' };
}

function contactLine(contact: NextStepItem['contact']): string | null {
  if (!contact) return null;
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  if (!name) return null;
  return contact.title ? `${name}, ${contact.title}` : name;
}

export default function NextStepCard({
  item,
  variant,
  onDoThis,
  onSkip,
  source,
  runId,
  highlightPlayRun,
}: Props) {
  const isPlayRun = runId ?? item.runId;
  const targetId = isPlayRun ?? item.workflowId;
  const doThisSource = item.source ?? (isPlayRun ? ('play_run' as const) : ('workflow' as const));
  const isProposed = item.runStatus === 'PROPOSED';
  const verb = isProposed
    ? 'Review plan'
    : actionVerb(item.stepType, item.contentType, item.channel, item.contentGenerationType);
  const prompt = shortPromptLabel(item.promptHint);
  const due = variant === 'followup' ? dueLabel(item.dueAt) : null;
  const contact = contactLine(item.contact);
  const progress = item.totalSteps > 0
    ? `${item.completedSteps}/${item.totalSteps}`
    : null;

  const isFollowUp = variant === 'followup';
  const runFocusId =
    item.runId && (item.source === 'play_run' || doThisSource === 'play_run') ? item.runId : undefined;
  const isHighlighted =
    !!highlightPlayRun &&
    !!runFocusId &&
    runFocusId === highlightPlayRun.runId &&
    (!highlightPlayRun.companyId || item.companyId === highlightPlayRun.companyId);

  return (
    <div
      data-myd-focus-run={runFocusId}
      style={{
        background: t.surface,
        borderRadius: 12,
        border: `1px solid ${
          isHighlighted ? 'rgba(59,130,246,0.85)' : isProposed ? t.amber : t.border
        }`,
        boxShadow: isHighlighted ? '0 0 0 2px rgba(59,130,246,0.35), 0 8px 24px rgba(37,99,235,0.15)' : undefined,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Left: action icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isFollowUp ? t.amberBg : t.blueBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {channelIcon(item.channel, item.contentType)}
      </div>

      {/* Center: details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Action line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {item.dayLabel && (
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
              {item.dayLabel}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>
            {prompt ?? verb}
          </span>
          {contact && (
            <span style={{ fontSize: 12, color: t.text2 }}>
              → {contact}
            </span>
          )}
          {due && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                background: due.bg,
                color: due.color,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {due.text}
            </span>
          )}
        </div>

        {/* Account / division */}
        <div
          style={{
            fontSize: 11,
            color: t.text3,
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            {item.companyName}
          </span>
          {item.templateName && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 3,
                background: t.purpleBg,
                color: t.purple,
                flexShrink: 0,
              }}
            >
              {item.templateName}
            </span>
          )}
          {item.divisionName && (
            <span style={{ fontSize: 10, color: t.text4, flexShrink: 0 }}>
              · {item.divisionName}
            </span>
          )}
          {progress && (
            <span style={{ color: t.text4, flexShrink: 0 }}>
              Step {item.stepOrder} of {item.totalSteps}
            </span>
          )}
        </div>
        {item.whyNow && (
          <div
            style={{
              fontSize: 11,
              color: t.text4,
              marginTop: 4,
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={item.whyNow}
          >
            Why now: {item.whyNow}
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onDoThis(item.companyId, targetId, doThisSource)}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            background: isFollowUp
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Work This
        </button>
        {onSkip && !isPlayRun && (
          <button
            type="button"
            onClick={() => onSkip(item.stepId, item.workflowId)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function channelIcon(channel: string | null, contentType: string | null): string {
  if (channel === 'email' || contentType === 'email') return '✉️';
  if (channel === 'linkedin' || contentType === 'linkedin_inmail') return '💼';
  if (channel === 'phone' || contentType === 'talking_points') return '📞';
  if (channel === 'meeting') return '📅';
  if (channel === 'sales_page' || contentType === 'sales_page') return '🌐';
  if (contentType === 'presentation') return '📊';
  return '📋';
}

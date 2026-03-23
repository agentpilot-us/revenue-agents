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
  greenBg: 'rgba(34,197,94,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
};

export type PlayRunCardRun = {
  id: string;
  companyId: string;
  status: string;
  company: { id: string; name: string; industry: string | null };
  playTemplate: { id: string; name: string; slug: string };
  phaseRuns: Array<{
    id: string;
    phaseTemplate: { id: string; name: string; orderIndex: number };
    actions: Array<{
      id: string;
      title: string;
      status: string;
      actionType: string;
      suggestedDate?: string | null;
      contactName: string | null;
      cooldownWarning: string | null;
      alternateContact: string | null;
      contentTemplate: { id: string; name: string; contentType: string } | null;
    }>;
  }>;
};

type Props = {
  run: PlayRunCardRun;
  onWorkThis: (companyId: string, runId: string) => void;
};

function actionLabel(actionType: string): string {
  const map: Record<string, string> = {
    SEND_EMAIL: 'Email',
    SEND_LINKEDIN: 'LinkedIn',
    REVIEW_BRIEF: 'Review brief',
    REVIEW_DECK: 'Review deck',
    SCHEDULE_MEETING: 'Meeting',
    MAKE_CALL: 'Call',
  };
  return map[actionType] ?? actionType.replace(/_/g, ' ');
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function runRefMs(actions: Array<{ suggestedDate?: string | null }>): number | null {
  let earliest: number | null = null;
  for (const a of actions) {
    const sd = a.suggestedDate;
    if (sd) {
      const ms = new Date(sd).getTime();
      if (earliest == null || ms < earliest) earliest = ms;
    }
  }
  return earliest;
}

function dayLabelFor(suggestedDate: string | null | undefined, referenceMs: number | null): string | null {
  if (!suggestedDate || referenceMs == null) return null;
  const actionMs = new Date(suggestedDate).getTime();
  const dayOffset = Math.round((actionMs - referenceMs) / ONE_DAY_MS);
  return dayOffset >= 0 ? `Day ${dayOffset}` : null;
}

export default function PlayRunCard({ run, onWorkThis }: Props) {
  const allActions = run.phaseRuns.flatMap((pr) => pr.actions);
  const completed = allActions.filter(
    (a) => a.status === 'EXECUTED' || a.status === 'SKIPPED',
  ).length;
  const total = allActions.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const nextAction = allActions.find(
    (a) => a.status === 'PENDING' || a.status === 'REVIEWED' || a.status === 'EDITED',
  );
  const refMs = runRefMs(allActions);
  const nextDayLabel = nextAction ? dayLabelFor(nextAction.suggestedDate, refMs) : null;
  const hasCooldown = allActions.some((a) => a.cooldownWarning);
  const stepsSummary = allActions.slice(0, 4).map((a) => actionLabel(a.actionType));

  return (
    <div
      style={{
        background: t.surface,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: t.blue,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(239,68,68,0.08)',
            color: '#f87171',
            textTransform: 'uppercase',
          }}
        >
          {run.company.name}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            background: t.purpleBg,
            color: t.purple,
          }}
        >
          {run.playTemplate.name}
        </span>
        {hasCooldown && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: t.amberBg,
              color: t.amber,
            }}
          >
            Cooldown
          </span>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, lineHeight: 1.4 }}>
        {run.playTemplate.name} — {run.company.name}
      </div>

      {nextAction && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {nextDayLabel && (
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
              {nextDayLabel}
            </span>
          )}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: nextAction.cooldownWarning ? t.amberBg : t.blueBg,
              color: nextAction.cooldownWarning ? t.amber : t.blue,
              display: 'inline-block',
            }}
          >
            Next: {nextAction.title}
            {nextAction.cooldownWarning && ' (check cooldown)'}
          </div>
        </div>
      )}

      {stepsSummary.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {stepsSummary.map((label, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: t.text3,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${t.border}`,
              }}
            >
              {i + 1}. {label}
            </span>
          ))}
          {total > 4 && (
            <span style={{ fontSize: 10, color: t.text4, padding: '2px 4px' }}>
              +{total - 4} more
            </span>
          )}
        </div>
      )}

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: t.text4 }}>
            {completed}/{total}
          </span>
          <div
            style={{
              flex: 1,
              height: 3,
              background: t.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: progress > 0 ? t.green : 'transparent',
                borderRadius: 2,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: t.text4 }}>{Math.round(progress)}%</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => onWorkThis(run.companyId, run.id)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Work This
        </button>
        <a
          href={`/dashboard/companies/${run.companyId}`}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.text3,
            fontSize: 11,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Account →
        </a>
      </div>
    </div>
  );
}

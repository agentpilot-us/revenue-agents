'use client';

type Props = {
  objectiveText: string | null;
  accountType?: string | null;
  healthScore: number;
  currentPhaseIndex: number;
  currentPhaseName: string | null;
  totalPhases: number;
  contactsEngaged: number;
  contactsTotal: number;
  actionsCompleted: number;
  actionsTotal: number;
  daysSinceLastTouch: number | null;
};

function healthColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function healthBg(score: number): string {
  if (score >= 70) return 'rgba(34,197,94,0.10)';
  if (score >= 40) return 'rgba(245,158,11,0.10)';
  return 'rgba(239,68,68,0.10)';
}

const t = {
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
};

const ACCOUNT_TYPE_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  partner: { bg: 'rgba(168,85,247,0.10)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', label: 'Partner' },
  customer: { bg: 'rgba(34,197,94,0.10)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', label: 'Customer' },
  new_logo: { bg: 'rgba(59,130,246,0.10)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)', label: 'New Logo' },
  prospect: { bg: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)', label: 'Prospect' },
};

export default function AccountStoryBar({
  objectiveText,
  accountType,
  healthScore,
  currentPhaseIndex,
  currentPhaseName,
  totalPhases,
  contactsEngaged,
  contactsTotal,
  actionsCompleted,
  actionsTotal,
  daysSinceLastTouch,
}: Props) {
  const progressPct = totalPhases > 0 ? Math.round((currentPhaseIndex / totalPhases) * 100) : 0;
  const phaseLabel = currentPhaseName
    ? `Phase ${currentPhaseIndex} of ${totalPhases}: ${currentPhaseName}`
    : `Phase ${currentPhaseIndex} of ${totalPhases}`;

  const touchLabel =
    daysSinceLastTouch === null
      ? 'No activity'
      : daysSinceLastTouch === 0
        ? 'Today'
        : `${daysSinceLastTouch}d ago`;

  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: 12,
        background: t.surface,
        border: `1px solid ${t.borderMed}`,
        marginBottom: 24,
      }}
    >
      {/* Top row: objective + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: t.text3 }}>
              The Story
            </div>
            {accountType && ACCOUNT_TYPE_STYLES[accountType] && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: ACCOUNT_TYPE_STYLES[accountType].bg,
                color: ACCOUNT_TYPE_STYLES[accountType].color,
                border: `1px solid ${ACCOUNT_TYPE_STYLES[accountType].border}`,
              }}>
                {ACCOUNT_TYPE_STYLES[accountType].label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: t.text1, lineHeight: 1.5, margin: 0 }}>
            {objectiveText || 'No objective configured yet.'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: 10,
            background: healthBg(healthScore),
            border: `1px solid ${healthColor(healthScore)}33`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: healthColor(healthScore), lineHeight: 1 }}>
            {healthScore}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: healthColor(healthScore), textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 2 }}>
            Health
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text2 }}>
            {phaseLabel}
          </span>
          <span style={{ fontSize: 11, color: t.text3 }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 3,
              background: `linear-gradient(90deg, ${t.blue}, #818cf8)`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Key metrics row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
        <MetricPill label="Contacts engaged" value={`${contactsEngaged} / ${contactsTotal}`} />
        <MetricPill label="Actions completed" value={`${actionsCompleted} / ${actionsTotal}`} />
        <MetricPill label="Last touch" value={touchLabel} />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 8,
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.12)',
      }}
    >
      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

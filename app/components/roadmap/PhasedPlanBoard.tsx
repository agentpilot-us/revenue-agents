'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  violet: '#8b5cf6',
  violetBg: 'rgba(139,92,246,0.08)',
};

type Plan = {
  id: string;
  status: string;
  urgencyScore: number | null;
  phaseIndex: number | null;
  phaseName: string | null;
  signalId: string | null;
  previewPayload: Record<string, unknown> | null;
  target: {
    name: string;
    companyDepartmentId: string | null;
  } | null;
};

type Props = {
  companyId: string;
  roadmapId: string;
  plans: Plan[];
};

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Immediate',
  2: 'Phase 2: Short-Term',
  3: 'Phase 3: Medium-Term',
  4: 'Phase 4: Long-Term',
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  email: '\u2709',
  event_invite: '\uD83C\uDFAB',
  presentation: '\uD83D\uDCCA',
  one_pager: '\uD83D\uDCC4',
  case_study: '\uD83D\uDCD6',
  talking_points: '\uD83D\uDCAC',
  roi_deck: '\uD83D\uDCB0',
  linkedin_dm: '\uD83D\uDD17',
};

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  pending: { color: t.amber, bg: t.amberBg, border: 'rgba(245,158,11,0.25)' },
  approved: { color: t.blue, bg: t.blueBg, border: t.blueBorder },
  in_progress: { color: t.blue, bg: t.blueBg, border: t.blueBorder },
  executed: { color: t.green, bg: t.greenBg, border: 'rgba(34,197,94,0.25)' },
  completed: { color: t.green, bg: t.greenBg, border: 'rgba(34,197,94,0.25)' },
  dismissed: { color: t.text4, bg: 'rgba(71,85,105,0.08)', border: 'rgba(71,85,105,0.20)' },
};

export default function PhasedPlanBoard({ companyId, roadmapId, plans }: Props) {
  const router = useRouter();
  const [workingId, setWorkingId] = useState<string | null>(null);

  // Derive phases from actual plan data, falling back to defaults 1-4
  const phaseSet = new Set(plans.map((p) => p.phaseIndex ?? 1));
  if (phaseSet.size === 0) [1, 2, 3, 4].forEach((i) => phaseSet.add(i));
  const phases = [...phaseSet].sort((a, b) => a - b);

  const phaseNames: Record<number, string> = {};
  for (const p of plans) {
    const idx = p.phaseIndex ?? 1;
    if (p.phaseName && !phaseNames[idx]) {
      phaseNames[idx] = p.phaseName;
    }
  }

  const plansByPhase = phases.map((phase) =>
    plans
      .filter((p) => (p.phaseIndex ?? 1) === phase)
      .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0)),
  );

  const handleWorkThis = async (plan: Plan) => {
    setWorkingId(plan.id);
    try {
      const pp = plan.previewPayload;
      const playId = (pp?.playId as string) || (pp?.triggerSignalType as string) || undefined;
      const title = (pp?.title as string) || plan.target?.name || 'New Action';

      // Resolve playTemplateId: fetch templates and match by playId (triggerType/slug/name), or use first
      const templatesRes = await fetch('/api/play-templates');
      const templatesData = await templatesRes.json();
      const templates = templatesData.templates || [];
      const match = playId
        ? templates.find(
            (t: { triggerType?: string | null; slug?: string | null; name?: string }) =>
              t.triggerType === playId || t.slug === playId || (t.name && t.name.toLowerCase().includes(playId.toLowerCase())),
          )
        : templates[0];
      const playTemplateId = match?.id;
      if (!playTemplateId) {
        setWorkingId(null);
        return;
      }

      const res = await fetch('/api/play-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          playTemplateId,
          title,
          accountSignalId: plan.signalId || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const runId = data.playRunId ?? data.playRun?.id;
        if (runId) {
          router.push(myDayUrlAfterPlayStart(runId, companyId));
        }
      }
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: t.text3,
          marginBottom: 12,
        }}
      >
        Plan Board
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {phases.map((phase, idx) => (
          <div key={phase}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.text2,
                marginBottom: 8,
                padding: '4px 0',
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              {phaseNames[phase] ? `Phase ${phase}: ${phaseNames[phase]}` : PHASE_LABELS[phase] ?? `Phase ${phase}`}
              <span style={{ color: t.text4, marginLeft: 6 }}>
                ({plansByPhase[idx].length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
              {plansByPhase[idx].map((plan) => {
                const pp = plan.previewPayload;
                const title = (pp?.title as string) || plan.target?.name || 'Untitled';
                const divisionName = (pp?.targetDivisionName as string) || plan.target?.name || null;
                const contentType = (pp?.contentType as string) || null;
                const statusStyle = STATUS_STYLES[plan.status] ?? STATUS_STYLES.pending;
                const icon = contentType ? CONTENT_TYPE_ICONS[contentType] || '\uD83D\uDCCB' : null;
                const isTerminal = plan.status === 'executed' || plan.status === 'completed' || plan.status === 'dismissed';

                return (
                  <div
                    key={plan.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.blueBorder; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                  >
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {icon && (
                        <span style={{ fontSize: 13 }} title={contentType ?? undefined}>{icon}</span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </span>
                      {plan.urgencyScore != null && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: 3,
                            background: plan.urgencyScore > 120 ? 'rgba(239,68,68,0.08)' : t.blueBg,
                            color: plan.urgencyScore > 120 ? '#ef4444' : t.blue,
                            flexShrink: 0,
                          }}
                        >
                          {Math.round(plan.urgencyScore)}
                        </span>
                      )}
                    </div>

                    {/* Division */}
                    {divisionName && (
                      <div style={{ fontSize: 10, color: t.text3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {divisionName}
                      </div>
                    )}

                    {/* Status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: statusStyle.color,
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {plan.status.replace(/_/g, ' ')}
                      </span>

                      {!isTerminal && (
                        <button
                          type="button"
                          onClick={() => handleWorkThis(plan)}
                          disabled={workingId === plan.id}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 6,
                            border: 'none',
                            cursor: workingId === plan.id ? 'wait' : 'pointer',
                            color: '#fff',
                            background: `linear-gradient(135deg, ${t.violet}, ${t.blue})`,
                            opacity: workingId === plan.id ? 0.6 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {workingId === plan.id ? 'Creating\u2026' : 'Work This'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {plansByPhase[idx].length === 0 && (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    fontSize: 11,
                    color: t.text4,
                  }}
                >
                  No plans
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

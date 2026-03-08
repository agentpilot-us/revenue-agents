'use client';

import { useState } from 'react';

const t = {
  surface: 'rgba(15,23,42,0.55)',
  surfaceHover: 'rgba(15,23,42,0.7)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.06)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.06)',
  purpleBorder: 'rgba(167,139,250,0.2)',
};

const MOTION_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  acquisition: { label: 'Acquisition', color: t.blue, bg: t.blueBg, border: t.blueBorder },
  expansion: { label: 'Expansion', color: t.green, bg: t.greenBg, border: t.greenBorder },
  retention: { label: 'Retention', color: t.amber, bg: t.amberBg, border: 'rgba(245,158,11,0.2)' },
  event: { label: 'Event', color: t.purple, bg: t.purpleBg, border: t.purpleBorder },
};

const PHASE_ORDER = ['prep', 'activate', 'engage', 'convert', 'advocacy'] as const;

export type CampaignThread = {
  id: string;
  title: string;
  status: string;
  outcome: string | null;
  targetDivision: { id: string; customName: string | null; type: string } | null;
  targetContact: { id: string; firstName: string | null; lastName: string | null; title: string | null } | null;
  template: { id: string; name: string; triggerType: string | null } | null;
  steps: Array<{ id: string; status: string; channel: string | null; dueAt: string | null }>;
};

export type CampaignCardData = {
  id: string;
  name: string;
  motion: string;
  status: string;
  phase: string;
  companyId: string;
  companyName: string;
  threads: CampaignThread[];
};

type Props = {
  campaign: CampaignCardData;
  onWorkThread: (companyId: string, workflowId: string) => void;
};

function ThreadRow({ thread, companyId, onWork }: { thread: CampaignThread; companyId: string; onWork: (cid: string, wid: string) => void }) {
  const totalSteps = thread.steps.length;
  const doneSteps = thread.steps.filter((s) => s.status === 'sent' || s.status === 'skipped').length;
  const nextStep = thread.steps.find((s) => s.status !== 'sent' && s.status !== 'skipped');
  const divName = thread.targetDivision?.customName ?? thread.targetDivision?.type?.replace(/_/g, ' ') ?? '';
  const contactName = thread.targetContact
    ? `${thread.targetContact.firstName ?? ''} ${thread.targetContact.lastName ?? ''}`.trim()
    : '';

  const isComplete = thread.status === 'completed';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        background: isComplete ? t.greenBg : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isComplete ? t.greenBorder : t.border}`,
      }}
    >
      {/* Thread persona */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {divName && (
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text1 }}>{divName}</span>
          )}
          {contactName && (
            <span style={{ fontSize: 10, color: t.text3 }}>{contactName}</span>
          )}
          {thread.template && (
            <span style={{ fontSize: 9, fontWeight: 600, color: t.purple, background: t.purpleBg, border: `1px solid ${t.purpleBorder}`, padding: '1px 6px', borderRadius: 4 }}>
              {thread.template.name.length > 25 ? thread.template.name.slice(0, 23) + '...' : thread.template.name}
            </span>
          )}
        </div>

        {/* Progress + next step */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ width: 60, height: 3, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
            <div style={{ width: `${totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0}%`, height: '100%', borderRadius: 2, background: isComplete ? t.green : t.blue }} />
          </div>
          <span style={{ fontSize: 10, color: t.text3 }}>{doneSteps}/{totalSteps}</span>
          {nextStep && !isComplete && (
            <span style={{ fontSize: 10, color: t.text2 }}>
              Next: {nextStep.channel ?? 'step'}
              {nextStep.dueAt && (() => {
                const d = new Date(nextStep.dueAt);
                const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return diff > 0 ? ` in ${diff}d` : ' due now';
              })()}
            </span>
          )}
          {thread.outcome && (
            <span style={{ fontSize: 10, fontWeight: 600, color: thread.outcome === 'meeting_booked' || thread.outcome === 'pipeline_created' ? t.green : thread.outcome === 'not_interested' ? '#ef4444' : t.amber }}>
              {thread.outcome.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      {!isComplete && nextStep && (
        <button
          type="button"
          onClick={() => onWork(companyId, thread.id)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 6,
            background: t.blueBg,
            border: `1px solid ${t.blueBorder}`,
            color: t.blue,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Work This
        </button>
      )}
    </div>
  );
}

export default function CampaignCard({ campaign, onWorkThread }: Props) {
  const [expanded, setExpanded] = useState(true);

  const motionMeta = MOTION_LABELS[campaign.motion] ?? MOTION_LABELS.acquisition;
  const totalThreads = campaign.threads.length;
  const completedThreads = campaign.threads.filter((th) => th.status === 'completed').length;
  const totalSteps = campaign.threads.reduce((s, th) => s + th.steps.length, 0);
  const doneSteps = campaign.threads.reduce(
    (s, th) => s + th.steps.filter((st) => st.status === 'sent' || st.status === 'skipped').length,
    0,
  );
  const phaseIdx = PHASE_ORDER.indexOf(campaign.phase as typeof PHASE_ORDER[number]);

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${motionMeta.border}`,
        background: t.surface,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: t.text3 }}>▶</span>

        <span style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '2px 8px',
          borderRadius: 4,
          background: motionMeta.bg,
          border: `1px solid ${motionMeta.border}`,
          color: motionMeta.color,
        }}>
          {motionMeta.label}
        </span>

        <span style={{ fontSize: 14, fontWeight: 700, color: t.text1, flex: 1 }}>
          {campaign.name}
        </span>

        <span style={{ fontSize: 11, color: t.text2 }}>{campaign.companyName}</span>

        {/* Phase indicators */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
          {PHASE_ORDER.map((ph, i) => (
            <div
              key={ph}
              title={ph}
              style={{
                width: 18,
                height: 4,
                borderRadius: 2,
                background: i <= phaseIdx ? motionMeta.color : t.border,
                opacity: i <= phaseIdx ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        <span style={{ fontSize: 10, color: t.text3, marginLeft: 6 }}>
          {completedThreads}/{totalThreads} threads &middot; {doneSteps}/{totalSteps} steps
        </span>
      </button>

      {/* Threads */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {campaign.threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              companyId={campaign.companyId}
              onWork={onWorkThread}
            />
          ))}
        </div>
      )}
    </div>
  );
}

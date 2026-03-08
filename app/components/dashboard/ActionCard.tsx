'use client';

import { useState } from 'react';
import SuggestedActionsStrip from './SuggestedActionsStrip';
import OutcomeSelector from '../workflow/OutcomeSelector';

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
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.08)',
  redDot: '#ef4444',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
};

type Step = {
  id: string;
  status: string;
  stepType: string;
  promptHint?: string | null;
  contentType?: string | null;
  channel?: string | null;
  dueAt?: string | null;
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
  } | null;
};

export type ActionCardWorkflow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  urgencyScore: number | null;
  company: { id: string; name: string; industry: string | null };
  template?: { id: string; name: string; triggerType?: string | null } | null;
  accountSignal: { id: string; title: string; type: string } | null;
  targetDivision: { id: string; customName: string | null; type: string } | null;
  targetContact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
  } | null;
  steps: Step[];
};

type Props = {
  workflow: ActionCardWorkflow;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onWorkThis: (companyId: string, workflowId: string) => void;
};

function stepLabel(step: Step): string {
  if (step.promptHint) {
    const first = step.promptHint.split('\n')[0].split(':')[0].trim();
    return first.length > 40 ? first.slice(0, 37) + '...' : first;
  }
  const typeMap: Record<string, string> = {
    generate_content: step.contentType === 'email' ? 'Draft email' :
      step.contentType === 'linkedin_inmail' ? 'LinkedIn message' :
      step.contentType === 'talking_points' ? 'Talking points' :
      step.contentType === 'presentation' ? 'Presentation' : 'Generate content',
    manual_task: 'Manual task',
    create_meeting: 'Schedule meeting',
    send: 'Send',
    research: 'Research',
  };
  return typeMap[step.stepType] ?? step.stepType.replace(/_/g, ' ');
}

function formatDivisionName(div: { customName: string | null; type: string }): string {
  return div.customName || div.type.replace(/_/g, ' ');
}

export default function ActionCard({
  workflow,
  onDismiss,
  onSnooze,
  onWorkThis,
}: Props) {
  const [showOutcome, setShowOutcome] = useState(false);
  const completedSteps = workflow.steps.filter(
    (s) => s.status === 'sent' || s.status === 'skipped',
  ).length;
  const totalSteps = workflow.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const urgency = workflow.urgencyScore ?? 0;
  const urgencyColor =
    urgency > 120 ? t.red : urgency > 80 ? t.amber : t.blue;
  const urgencyBg =
    urgency > 120 ? t.redBg : urgency > 80 ? t.amberBg : t.blueBg;

  const playName = workflow.template?.name ?? null;
  const stepsSummary = workflow.steps.slice(0, 3).map((s) => stepLabel(s));
  const targetDiv = workflow.targetDivision ? formatDivisionName(workflow.targetDivision) : null;
  const contactName = workflow.targetContact
    ? `${workflow.targetContact.firstName ?? ''} ${workflow.targetContact.lastName ?? ''}`.trim()
    : null;

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
      {/* Top row: account badge + play badge + urgency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: urgencyColor,
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
            color: t.red,
            textTransform: 'uppercase',
          }}
        >
          {workflow.company.name}
        </span>

        {playName && (
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
            {playName}
          </span>
        )}

        {urgency > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              background: urgencyBg,
              color: urgencyColor,
            }}
          >
            {urgency}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, lineHeight: 1.4 }}>
        {workflow.title}
      </div>

      {/* Targeting line: division + contact */}
      {(targetDiv || contactName) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: t.text3 }}>
          {targetDiv && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ opacity: 0.6 }}>◎</span> {targetDiv}
            </span>
          )}
          {contactName && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ opacity: 0.6 }}>→</span> {contactName}
              {workflow.targetContact?.title && (
                <span style={{ color: t.text4 }}>({workflow.targetContact.title})</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Why-now from signal */}
      {workflow.accountSignal && (
        <div
          style={{
            fontSize: 11,
            color: t.text2,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(59,130,246,0.04)',
            borderLeft: `2px solid ${t.blue}`,
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontWeight: 600, color: t.blue, marginRight: 4 }}>Why now:</span>
          {workflow.accountSignal.title}
        </div>
      )}

      {/* Quick step summary (compact — not the full strip) */}
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
          {totalSteps > 3 && (
            <span style={{ fontSize: 10, color: t.text4, padding: '2px 4px' }}>
              +{totalSteps - 3} more
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: t.text4 }}>
            {completedSteps}/{totalSteps}
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

      {/* Outcome selector (replaces actions when dismissing) */}
      {showOutcome ? (
        <OutcomeSelector
          workflowId={workflow.id}
          onSaved={() => onDismiss(workflow.id)}
          compact
        />
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={() => onWorkThis(workflow.company.id, workflow.id)}
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
          <button
            type="button"
            onClick={() => onSnooze(workflow.id)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text3,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Snooze
          </button>
          <button
            type="button"
            onClick={() => setShowOutcome(true)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

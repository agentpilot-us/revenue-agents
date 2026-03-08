'use client';

import StepContentGenerator from './StepContentGenerator';
import StepSendAction from './StepSendAction';
import ContactPulsePopover from './ContactPulsePopover';
import OutcomeSelector from './OutcomeSelector';

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  surfaceSolid: '#0f172a',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.25)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.08)',
};

export type WorkflowStep = {
  id: string;
  stepOrder: number;
  stepType: string;
  contentType: string | null;
  channel: string | null;
  status: string;
  promptHint: string | null;
  generatedContent: Record<string, string> | null;
  editedContent: Record<string, string> | null;
  completedAt: string | null;
  failureReason: string | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string | null;
    linkedinUrl?: string | null;
  } | null;
  division: {
    id: string;
    customName: string | null;
    type: string;
  } | null;
  activity: {
    id: string;
    type: string;
    createdAt: string;
  } | null;
};

export type Workflow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  urgencyScore: number | null;
  outcome?: string | null;
  signalContext: Record<string, unknown> | null;
  company: { id: string; name: string; industry: string | null };
  targetContact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string | null;
  } | null;
  targetDivision: {
    id: string;
    customName: string | null;
    type: string;
  } | null;
  steps: WorkflowStep[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: t.text3, bg: 'rgba(100,116,139,0.08)' },
  generating: { label: 'Generating...', color: t.amber, bg: t.amberBg },
  ready: { label: 'Ready to send', color: t.blue, bg: t.blueBg },
  sent: { label: 'Sent', color: t.green, bg: t.greenBg },
  skipped: { label: 'Skipped', color: t.text4, bg: 'rgba(71,85,105,0.08)' },
  failed: { label: 'Failed', color: t.red, bg: t.redBg },
};

const CHANNEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  email: { label: 'Email', color: '#60a5fa', bg: 'rgba(59,130,246,0.08)' },
  linkedin: { label: 'LinkedIn', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  phone: { label: 'Phone', color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
  meeting: { label: 'Meeting', color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
  sales_page: { label: 'Sales Page', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
  briefing: { label: 'Briefing', color: '#fb7185', bg: 'rgba(244,63,94,0.08)' },
  video: { label: 'Video', color: '#f472b6', bg: 'rgba(236,72,153,0.08)' },
  gift: { label: 'Gift', color: '#fb923c', bg: 'rgba(249,115,22,0.08)' },
  event: { label: 'Event', color: '#818cf8', bg: 'rgba(99,102,241,0.08)' },
  content: { label: 'Content', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  ad_brief: { label: 'Ad Brief', color: '#c084fc', bg: 'rgba(192,132,252,0.08)' },
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  email: '✉',
  linkedin_inmail: 'in',
  linkedin_post: 'in',
  talking_points: '📋',
  presentation: '📊',
  sms: '📱',
  sales_page: '🌐',
};

type Props = {
  workflow: Workflow;
  onRefresh: () => void;
  onStartNextPlay?: (templateId: string, divisionId?: string) => void;
};

export default function WorkflowStepper({ workflow, onRefresh, onStartNextPlay }: Props) {
  const completedCount = workflow.steps.filter(
    (s) => s.status === 'sent' || s.status === 'skipped',
  ).length;
  const totalSteps = workflow.steps.length;
  const allStepsDone = totalSteps > 0 && completedCount === totalSteps;
  const needsOutcome = allStepsDone && workflow.status !== 'completed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div
        style={{
          background: t.surface,
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text1, margin: 0 }}>
              {workflow.title}
            </h2>
            {workflow.description && (
              <p style={{ fontSize: 13, color: t.text3, margin: '4px 0 0' }}>
                {workflow.description}
              </p>
            )}
          </div>
          {workflow.urgencyScore && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: workflow.urgencyScore > 120 ? t.redBg : workflow.urgencyScore > 80 ? t.amberBg : t.blueBg,
                color: workflow.urgencyScore > 120 ? t.red : workflow.urgencyScore > 80 ? t.amber : t.blue,
              }}
            >
              Urgency: {workflow.urgencyScore}
            </div>
          )}
        </div>

        {workflow.signalContext && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 8,
              background: t.blueBg,
              border: `1px solid ${t.blueBorder}`,
              fontSize: 12,
              color: t.blueLight,
            }}
          >
            <strong>Signal:</strong>{' '}
            {(workflow.signalContext as Record<string, string>).title || 'Unknown signal'}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: 11,
              color: t.text3,
            }}
          >
            <span>Progress</span>
            <span>
              {completedCount}/{totalSteps} steps
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: t.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`,
                background: t.green,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Steps — always-visible timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {workflow.steps.map((step, idx) => {
          const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
          const isCompleted = step.status === 'sent' || step.status === 'skipped';
          const isContentStep = step.stepType === 'generate_content' || step.stepType === 'send_content';
          const isLast = idx === workflow.steps.length - 1;

          return (
            <div key={step.id} style={{ display: 'flex', gap: 0 }}>
              {/* Timeline rail */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 40,
                  flexShrink: 0,
                  paddingTop: 18,
                }}
              >
                {/* Step number circle */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: isCompleted ? t.greenBg : step.status === 'ready' ? t.blueBg : 'rgba(100,116,139,0.06)',
                    color: isCompleted ? t.green : step.status === 'ready' ? t.blue : t.text3,
                    border: `2px solid ${isCompleted ? t.greenBorder : step.status === 'ready' ? t.blueBorder : t.borderMed}`,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                {/* Connecting line */}
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      background: isCompleted ? t.greenBorder : t.borderMed,
                      minHeight: 16,
                    }}
                  />
                )}
              </div>

              {/* Step card */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  marginBottom: isLast ? 0 : 8,
                  borderRadius: 12,
                  background: t.surface,
                  border: `1px solid ${isCompleted ? t.greenBorder : step.status === 'ready' ? t.blueBorder : t.border}`,
                  overflow: 'hidden',
                }}
              >
                {/* Step header */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>
                        {step.promptHint?.split(':')[0] || step.stepType.replace(/_/g, ' ')}
                      </span>
                      {step.channel && CHANNEL_LABELS[step.channel] && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: CHANNEL_LABELS[step.channel].bg,
                            color: CHANNEL_LABELS[step.channel].color,
                          }}
                        >
                          {CHANNEL_LABELS[step.channel].label}
                        </span>
                      )}
                      {step.contentType && (
                        <span style={{ fontSize: 11, color: t.text4 }}>
                          {CONTENT_TYPE_ICONS[step.contentType] || ''}{' '}
                          {step.contentType.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: statusCfg.bg,
                        color: statusCfg.color,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusCfg.label}
                    </div>
                  </div>
                  {step.promptHint && step.promptHint.includes(':') && (
                    <p style={{ fontSize: 12, color: t.text3, margin: '4px 0 0' }}>
                      {step.promptHint.split(':').slice(1).join(':').trim()}
                    </p>
                  )}
                  {step.contact && (
                    <p style={{ fontSize: 11, color: t.text4, margin: '4px 0 0' }}>
                      To:{' '}
                      <ContactPulsePopover contactId={step.contact.id}>
                        {step.contact.firstName} {step.contact.lastName}
                      </ContactPulsePopover>
                      {step.contact.title ? ` · ${step.contact.title}` : ''}
                      {step.contact.email ? ` · ${step.contact.email}` : ''}
                    </p>
                  )}
                </div>

                {/* Content zone — always visible */}
                <div style={{ padding: '0 16px 16px' }}>
                  {isContentStep ? (
                    <>
                      <StepContentGenerator
                        workflowId={workflow.id}
                        step={step}
                        onGenerated={onRefresh}
                      />
                      {(step.status === 'ready' || step.status === 'sent') && (
                        <div style={{ marginTop: 12 }}>
                          <StepSendAction
                            workflowId={workflow.id}
                            step={step}
                            onSent={onRefresh}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      {step.status !== 'sent' && step.status !== 'skipped' && (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(15,23,42,0.3)',
                            border: `1px dashed ${t.borderMed}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontSize: 12, color: t.text4 }}>
                            Complete this task manually
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(
                                `/api/action-workflows/${workflow.id}/steps/${step.id}`,
                                {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'skipped' }),
                                },
                              );
                              onRefresh();
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              background: t.blueBg,
                              border: `1px solid ${t.blueBorder}`,
                              color: t.blue,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Complete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {step.failureReason && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: t.redBg,
                        color: t.red,
                        fontSize: 12,
                      }}
                    >
                      Error: {step.failureReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome selector — appears when all steps are done */}
      {needsOutcome && (
        <OutcomeSelector
          workflowId={workflow.id}
          companyId={workflow.company.id}
          onSaved={onRefresh}
          onStartNextPlay={onStartNextPlay}
        />
      )}

      {workflow.outcome && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: t.greenBg,
            border: `1px solid ${t.greenBorder}`,
            fontSize: 13,
            color: t.green,
            fontWeight: 600,
          }}
        >
          Outcome: {workflow.outcome.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
}

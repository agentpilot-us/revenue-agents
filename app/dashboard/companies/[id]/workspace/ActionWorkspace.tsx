'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowStepper, { type Workflow } from '@/app/components/workflow/WorkflowStepper';

const t = {
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  amber: '#f59e0b',
};

type WorkflowSummary = {
  id: string;
  title: string;
  status: string;
  urgencyScore: number | null;
  template: { name: string } | null;
  accountSignal: { title: string } | null;
  targetContact: { firstName: string | null; lastName: string | null; title: string | null } | null;
  steps: Array<{ id: string; status: string; stepType: string; contentType: string | null }>;
};

type PlayRunSummary = {
  id: string;
  activatedAt: string;
  playTemplate: { name: string };
  _count: { phaseRuns: number };
};

type Props = {
  companyId: string;
  activeWorkflowId: string | null;
  workflows: WorkflowSummary[];
  playRuns?: PlayRunSummary[];
  onRefresh: () => void;
};

export default function ActionWorkspace({
  companyId,
  activeWorkflowId,
  workflows,
  playRuns = [],
  onRefresh,
}: Props) {
  const router = useRouter();
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWorkflow = useCallback(
    async (wfId: string) => {
      setLoading(true);
      try {
        const runRes = await fetch(`/api/play-runs/${wfId}`);
        if (runRes.ok) {
          router.push(`/dashboard/companies/${companyId}/plays/run/${wfId}`);
          return;
        }
        const res = await fetch(`/api/action-workflows/${wfId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveWorkflow(data.workflow);
        }
      } finally {
        setLoading(false);
      }
    },
    [companyId, router],
  );

  useEffect(() => {
    if (activeWorkflowId) {
      loadWorkflow(activeWorkflowId);
    }
  }, [activeWorkflowId, loadWorkflow]);

  if (activeWorkflow) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setActiveWorkflow(null)}
          style={{
            background: 'none',
            border: 'none',
            color: t.text3,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 12,
          }}
        >
          &larr; Back to actions
        </button>
        <WorkflowStepper
          workflow={activeWorkflow}
          onRefresh={() => {
            loadWorkflow(activeWorkflow.id);
            onRefresh();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 20, color: t.text3, fontSize: 13 }}>
        Loading workflow...
      </div>
    );
  }

  const hasItems = playRuns.length > 0 || workflows.length > 0;

  return (
    <div>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: t.text1,
          marginBottom: 12,
        }}
      >
        Next Best Actions
      </h2>
      {!hasItems ? (
        <div
          style={{
            padding: 30,
            textAlign: 'center',
            color: t.text3,
            fontSize: 13,
            background: t.surface,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
          }}
        >
          No pending actions for this account.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {playRuns.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => loadWorkflow(run.id)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>
                {run.playTemplate.name}
              </div>
              <div style={{ fontSize: 10, color: t.text4, marginTop: 6 }}>
                Play run · {run._count.phaseRuns} phase(s)
              </div>
            </button>
          ))}
          {workflows.map((wf) => {
            const completed = wf.steps.filter(
              (s) => s.status === 'sent' || s.status === 'skipped',
            ).length;
            const total = wf.steps.length;
            const urgency = wf.urgencyScore ?? 0;

            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => loadWorkflow(wf.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>
                    {wf.title}
                  </div>
                  {urgency > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          urgency > 120
                            ? 'rgba(239,68,68,0.08)'
                            : urgency > 80
                              ? 'rgba(245,158,11,0.08)'
                              : t.blueBg,
                        color:
                          urgency > 120
                            ? '#ef4444'
                            : urgency > 80
                              ? t.amber
                              : t.blue,
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {urgency}
                    </span>
                  )}
                </div>
                {wf.accountSignal && (
                  <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>
                    Signal: {wf.accountSignal.title}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 10,
                    color: t.text4,
                    marginTop: 6,
                  }}
                >
                  {completed}/{total} steps complete
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

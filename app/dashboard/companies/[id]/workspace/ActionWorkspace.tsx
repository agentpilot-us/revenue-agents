'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type PlayRunSummary = {
  id: string;
  activatedAt: string;
  playTemplate: { name: string };
  _count: { phaseRuns: number };
};

type Props = {
  companyId: string;
  activeWorkflowId: string | null;
  /** @deprecated Legacy ActionWorkflow list — always empty; use playRuns only. */
  workflows?: unknown[];
  playRuns?: PlayRunSummary[];
  onRefresh: () => void;
};

export default function ActionWorkspace({
  companyId,
  activeWorkflowId,
  playRuns = [],
  onRefresh: _onRefresh,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const openPlayRun = useCallback(
    async (runId: string) => {
      setLoading(true);
      try {
        const runRes = await fetch(`/api/play-runs/${runId}`);
        if (runRes.ok) {
          router.push(`/dashboard/companies/${companyId}/plays/run/${runId}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [companyId, router],
  );

  useEffect(() => {
    if (activeWorkflowId) {
      void openPlayRun(activeWorkflowId);
    }
  }, [activeWorkflowId, openPlayRun]);

  if (loading) {
    return (
      <div style={{ padding: 20, color: t.text3, fontSize: 13 }}>
        Opening play run...
      </div>
    );
  }

  const hasItems = playRuns.length > 0;

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
          No active play runs for this account.{' '}
          <a href={`/dashboard/plays?companyId=${companyId}`} style={{ color: t.blue }}>
            Start a play
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {playRuns.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => openPlayRun(run.id)}
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
        </div>
      )}
    </div>
  );
}

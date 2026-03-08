'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WorkflowStepper, { type Workflow } from '@/app/components/workflow/WorkflowStepper';

const t = {
  bg: '#0b1120',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  border: 'rgba(255,255,255,0.06)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.08)',
};

export default function WorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/action-workflows/${workflowId}`);
      if (!res.ok) throw new Error('Failed to load workflow');
      const data = await res.json();
      setWorkflow(data.workflow);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const handleDismiss = async () => {
    await fetch(`/api/action-workflows/${workflowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: t.text3, fontSize: 14 }}>
        Loading workflow...
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div style={{ padding: 40 }}>
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: t.redBg,
            color: t.red,
            fontSize: 14,
          }}
        >
          {error || 'Workflow not found'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back + Account link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: t.text3,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          &larr; Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/companies/${workflow.company.id}`)
            }
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: t.blueBg,
              border: `1px solid ${t.blueBorder}`,
              color: t.blue,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View {workflow.company.name}
          </button>
          {workflow.status !== 'dismissed' && workflow.status !== 'completed' && (
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${t.border}`,
                color: t.text3,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <WorkflowStepper workflow={workflow} onRefresh={fetchWorkflow} />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ActionWorkspace from './ActionWorkspace';
import IntelligencePanel from './IntelligencePanel';
import ChatDrawer from '@/app/components/shared/ChatDrawer';

const t = {
  text1: '#e2e8f0',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
};

type Props = {
  companyId: string;
};

export default function AccountWorkspacePage({ companyId }: Props) {
  const searchParams = useSearchParams();
  const workflowParam = searchParams.get('workflow');

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/workspace`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: t.text3, fontSize: 14 }}>
        Loading workspace...
      </div>
    );
  }

  if (!data || !data.company) {
    return (
      <div style={{ padding: 40, color: t.text3 }}>
        Failed to load workspace data.
      </div>
    );
  }

  const company = data.company as {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    businessOverview: string | null;
    dealObjective: string | null;
    keyInitiatives: unknown;
    activeObjections: unknown;
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: t.text1,
            margin: 0,
          }}
        >
          {company.name}
        </h1>
        {company.domain && (
          <span style={{ fontSize: 12, color: t.text4 }}>{company.domain}</span>
        )}
        {company.industry && (
          <span style={{ fontSize: 12, color: t.text4, marginLeft: 12 }}>
            {company.industry}
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: ActionWorkspace */}
        <ActionWorkspace
          companyId={companyId}
          activeWorkflowId={workflowParam}
          workflows={(data.workflows as never[]) || []}
          onRefresh={fetchData}
        />

        {/* Right: IntelligencePanel */}
        <IntelligencePanel
          company={company}
          departments={(data.departments as never[]) || []}
          contacts={(data.contacts as never[]) || []}
          signals={(data.signals as never[]) || []}
          recentActivities={(data.recentActivities as never[]) || []}
        />
      </div>

      {/* Floating Chat */}
      <ChatDrawer accountId={companyId} companyName={company.name} />
    </div>
  );
}

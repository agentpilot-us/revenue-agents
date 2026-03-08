'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PlayCatalog from './PlayCatalog';
import CustomPlayBuilder from './CustomPlayBuilder';

type WorkflowSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { steps: number };
  completedSteps: number;
};

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
  yellow: '#eab308',
  yellowBg: 'rgba(234,179,8,0.08)',
};

type SubTab = 'active' | 'catalog' | 'custom';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'active', label: 'Active Plays' },
  { id: 'catalog', label: 'Start from Catalog' },
  { id: 'custom', label: 'Custom Play' },
];

type Props = {
  companyId: string;
  companyName: string;
};

export default function AccountPlaysTab({ companyId, companyName }: Props) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>('active');
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/companies/${companyId}/action-workflows`)
      .then((r) => (r.ok ? r.json() : { workflows: [] }))
      .then((data) => setWorkflows(data.workflows || []))
      .finally(() => setLoading(false));
  }, [companyId]);

  const activeWorkflows = useMemo(
    () => workflows.filter((w) => w.status !== 'completed' && w.status !== 'cancelled'),
    [workflows],
  );
  const completedWorkflows = useMemo(
    () => workflows.filter((w) => w.status === 'completed'),
    [workflows],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4 }}>
        {SUB_TABS.map((st) => {
          const isActive = subTab === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setSubTab(st.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: isActive ? t.blueBg : 'transparent',
                border: `1px solid ${isActive ? t.blueBorder : 'transparent'}`,
                color: isActive ? t.blue : t.text3,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {st.label}
              {st.id === 'active' && !loading && activeWorkflows.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: t.blueBg,
                    color: t.blue,
                  }}
                >
                  {activeWorkflows.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Plays */}
      {subTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: t.text3, padding: 24 }}>Loading plays...</p>
          ) : activeWorkflows.length === 0 && completedWorkflows.length === 0 ? (
            <div
              style={{
                padding: 40,
                borderRadius: 12,
                background: t.surface,
                border: `1px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 14, color: t.text2, margin: '0 0 8px' }}>
                No plays running for {companyName}
              </p>
              <p style={{ fontSize: 12, color: t.text4, margin: '0 0 16px' }}>
                Start a play from the catalog or build a custom one.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('catalog')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: t.blue,
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <>
              {activeWorkflows.length > 0 && (
                <WorkflowSection
                  title="In Progress"
                  workflows={activeWorkflows}
                  companyId={companyId}
                  router={router}
                />
              )}
              {completedWorkflows.length > 0 && (
                <WorkflowSection
                  title="Completed"
                  workflows={completedWorkflows}
                  companyId={companyId}
                  router={router}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Catalog quick-start */}
      {subTab === 'catalog' && (
        <PlayCatalog companyId={companyId} companyName={companyName} compact />
      )}

      {/* Custom Play Builder */}
      {subTab === 'custom' && (
        <CustomPlayBuilder companyId={companyId} companyName={companyName} />
      )}
    </div>
  );
}

function WorkflowSection({
  title,
  workflows,
  companyId,
  router,
}: {
  title: string;
  workflows: WorkflowSummary[];
  companyId: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: t.text4,
          marginBottom: 8,
        }}
      >
        {title} ({workflows.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {workflows.map((w) => {
          const statusColor =
            w.status === 'completed'
              ? t.green
              : w.status === 'pending'
                ? t.yellow
                : t.blue;
          const statusBg =
            w.status === 'completed'
              ? t.greenBg
              : w.status === 'pending'
                ? t.yellowBg
                : t.blueBg;

          return (
            <button
              key={w.id}
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/companies/${companyId}/plays/execute/${w.id}`,
                )
              }
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.borderMed;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: t.text1, margin: 0 }}>
                  {w.title}
                </p>
                {w.description && (
                  <p
                    style={{
                      fontSize: 11,
                      color: t.text3,
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 10,
                    color: t.text4,
                  }}
                >
                  {w.completedSteps}/{w._count.steps} steps
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: statusBg,
                    color: statusColor,
                    textTransform: 'capitalize',
                  }}
                >
                  {w.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

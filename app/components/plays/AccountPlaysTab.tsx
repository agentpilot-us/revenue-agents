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
  outcome: string | null;
  outcomeNote: string | null;
  completedAt: string | null;
  templateId: string | null;
  targetDivision: { id: string; customName: string | null; type: string } | null;
  _count: { steps: number };
  completedSteps: number;
};

type TemplateStats = Record<string, { total: number; outcomes: Record<string, number> }>;

type SavedTemplate = {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
  stats: { total: number; outcomes: Record<string, number> } | null;
};

const OUTCOME_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  meeting_booked: { label: 'Meeting Booked', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  pipeline_created: { label: 'Pipeline Created', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  reply_received: { label: 'Got a Reply', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  deferred: { label: 'Deferred', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  no_response: { label: 'No Response', color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  not_interested: { label: 'Not Interested', color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
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
  purple: '#a855f7',
  purpleBg: 'rgba(168,85,247,0.08)',
  purpleBorder: 'rgba(168,85,247,0.25)',
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
  initialSubTab?: SubTab;
  initialDivisionId?: string;
};

export default function AccountPlaysTab({ companyId, companyName, initialSubTab, initialDivisionId }: Props) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? 'active');
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [templateStats, setTemplateStats] = useState<TemplateStats>({});
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/companies/${companyId}/action-workflows`)
        .then((r) => (r.ok ? r.json() : { workflows: [], templateStats: {} })),
      fetch('/api/playbooks/templates')
        .then((r) => (r.ok ? r.json() : { templates: [] })),
    ]).then(([wfData, tmplData]) => {
      setWorkflows(wfData.workflows || []);
      setTemplateStats(wfData.templateStats || {});
      const templates: SavedTemplate[] = (tmplData.templates || [])
        .filter((tmpl: { isBuiltIn: boolean }) => !tmpl.isBuiltIn)
        .map((tmpl: { id: string; name: string; description: string | null; stepCount: number }) => ({
          id: tmpl.id,
          name: tmpl.name,
          description: tmpl.description,
          stepCount: tmpl.stepCount,
          stats: wfData.templateStats?.[tmpl.id] ?? null,
        }));
      setSavedTemplates(templates);
    }).finally(() => setLoading(false));
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
          ) : activeWorkflows.length === 0 && completedWorkflows.length === 0 && savedTemplates.length === 0 ? (
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

              {/* Saved Templates */}
              {savedTemplates.length > 0 && (
                <SavedTemplatesSection
                  templates={savedTemplates}
                  companyId={companyId}
                  companyName={companyName}
                />
              )}

              {completedWorkflows.length > 0 && (
                <CompletedWorkflowSection
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
        <CustomPlayBuilder companyId={companyId} companyName={companyName} initialDivisionId={initialDivisionId} />
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
          const divName = w.targetDivision
            ? (w.targetDivision.customName || w.targetDivision.type.replace(/_/g, ' '))
            : null;

          return (
            <button
              key={w.id}
              type="button"
              onClick={() =>
                router.push(`/dashboard/companies/${companyId}/plays/execute/${w.id}`)
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  {divName && (
                    <span style={{ fontSize: 10, color: t.text4 }}>
                      {divName}
                    </span>
                  )}
                  {w.description && (
                    <span
                      style={{
                        fontSize: 11,
                        color: t.text3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {divName ? '· ' : ''}{w.description}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: t.text4 }}>
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

function CompletedWorkflowSection({
  workflows,
  companyId,
  router,
}: {
  workflows: WorkflowSummary[];
  companyId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSaveAsTemplate = async (w: WorkflowSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingId(w.id);
    try {
      const res = await fetch('/api/playbooks/templates/from-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: w.id }),
      });
      if (!res.ok) throw new Error('Failed');
      setSavedIds((prev) => new Set(prev).add(w.id));
    } catch {
      // silently fail
    } finally {
      setSavingId(null);
    }
  };

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
        Play History ({workflows.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {workflows.map((w) => {
          const outcomeConf = w.outcome ? OUTCOME_CONFIG[w.outcome] : null;
          const divName = w.targetDivision
            ? (w.targetDivision.customName || w.targetDivision.type.replace(/_/g, ' '))
            : null;
          const completedDate = w.completedAt
            ? new Date(w.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : null;

          return (
            <div
              key={w.id}
              style={{
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/companies/${companyId}/plays/execute/${w.id}`)
                }
                style={{
                  padding: '12px 16px',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.text1, margin: 0 }}>
                    {w.title}
                  </p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                    {divName && (
                      <span style={{ fontSize: 10, color: t.text4 }}>{divName}</span>
                    )}
                    {completedDate && (
                      <span style={{ fontSize: 10, color: t.text4 }}>
                        {divName ? '·' : ''} Completed {completedDate}
                      </span>
                    )}
                    {outcomeConf && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: 4,
                          background: outcomeConf.bg,
                          color: outcomeConf.color,
                        }}
                      >
                        {outcomeConf.label}
                      </span>
                    )}
                  </div>
                  {w.outcomeNote && (
                    <p
                      style={{
                        fontSize: 11,
                        color: t.text3,
                        margin: '4px 0 0',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      &ldquo;{w.outcomeNote}&rdquo;
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: t.text4 }}>
                    {w.completedSteps}/{w._count.steps} steps
                  </span>
                </div>
              </button>

              <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                {savedIds.has(w.id) ? (
                  <span style={{ fontSize: 11, color: t.green, fontWeight: 500 }}>
                    Saved to Play Library
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSaveAsTemplate(w, e)}
                    disabled={savingId === w.id}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.25)',
                      color: t.green,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: savingId === w.id ? 'not-allowed' : 'pointer',
                      opacity: savingId === w.id ? 0.6 : 1,
                    }}
                  >
                    {savingId === w.id ? 'Saving...' : 'Save as Play Template'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavedTemplatesSection({
  templates,
  companyId,
  companyName,
}: {
  templates: SavedTemplate[];
  companyId: string;
  companyName: string;
}) {
  const [startingId, setStartingId] = useState<string | null>(null);
  const router = useRouter();

  const handleRunAgain = async (templateId: string) => {
    setStartingId(templateId);
    try {
      const res = await fetch('/api/action-workflows/from-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, templateId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      router.push(`/dashboard/companies/${companyId}/plays/execute/${data.workflowId}`);
    } catch {
      setStartingId(null);
    }
  };

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
        Saved Templates ({templates.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map((tmpl) => {
          const outcomeEntries = tmpl.stats
            ? Object.entries(tmpl.stats.outcomes)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => {
                  const conf = OUTCOME_CONFIG[key];
                  return conf ? `${count} ${conf.label.toLowerCase()}` : `${count} ${key}`;
                })
            : [];

          return (
            <div
              key={tmpl.id}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.purpleBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: t.text1, margin: 0 }}>
                  {tmpl.name}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: t.purple, fontWeight: 600 }}>
                    {tmpl.stepCount} steps
                  </span>
                  {tmpl.stats && (
                    <span style={{ fontSize: 10, color: t.text4 }}>
                      · Run {tmpl.stats.total} time{tmpl.stats.total !== 1 ? 's' : ''}
                    </span>
                  )}
                  {outcomeEntries.length > 0 && (
                    <span style={{ fontSize: 10, color: t.text3 }}>
                      · {outcomeEntries.join(', ')}
                    </span>
                  )}
                </div>
                {tmpl.description && (
                  <p
                    style={{
                      fontSize: 11,
                      color: t.text3,
                      margin: '3px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tmpl.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleRunAgain(tmpl.id)}
                disabled={startingId === tmpl.id}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  background: startingId === tmpl.id ? t.purpleBg : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: startingId === tmpl.id ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  opacity: startingId === tmpl.id ? 0.6 : 1,
                  boxShadow: startingId === tmpl.id ? 'none' : '0 2px 10px rgba(168,85,247,0.3)',
                }}
              >
                {startingId === tmpl.id ? 'Starting...' : `Run for ${companyName}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

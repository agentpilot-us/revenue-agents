'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PlayCatalog from './PlayCatalog';
import CustomPlayBuilder from './CustomPlayBuilder';

type PlayRunSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  templateName: string;
  phaseCount: number;
};

type SavedTemplate = {
  id: string;
  name: string;
  description: string | null;
  phaseCount: number;
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
  const [playRuns, setPlayRuns] = useState<PlayRunSummary[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/companies/${companyId}/play-runs`).then((r) =>
        r.ok ? r.json() : { playRuns: [] },
      ),
      fetch('/api/play-templates').then((r) =>
        r.ok ? r.json() : { templates: [] },
      ),
    ]).then(([runData, tmplData]) => {
      setPlayRuns(runData.playRuns || []);
      const templates: SavedTemplate[] = (tmplData.templates || []).map(
        (tmpl: { id: string; name: string; description: string | null; phaseCount: number }) => ({
          id: tmpl.id,
          name: tmpl.name,
          description: tmpl.description,
          phaseCount: tmpl.phaseCount ?? 0,
        }),
      );
      setSavedTemplates(templates);
    }).finally(() => setLoading(false));
  }, [companyId]);

  const activePlayRuns = useMemo(
    () => playRuns.filter((r) => r.status === 'ACTIVE'),
    [playRuns],
  );
  const completedPlayRuns = useMemo(
    () => playRuns.filter((r) => r.status === 'COMPLETED'),
    [playRuns],
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
              {st.id === 'active' && !loading && activePlayRuns.length > 0 && (
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
                  {activePlayRuns.length}
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
          ) : activePlayRuns.length === 0 && completedPlayRuns.length === 0 && savedTemplates.length === 0 ? (
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
              {activePlayRuns.length > 0 && (
                <PlayRunSection
                  title="In Progress"
                  playRuns={activePlayRuns}
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

              {completedPlayRuns.length > 0 && (
                <CompletedPlayRunSection
                  playRuns={completedPlayRuns}
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

function PlayRunSection({
  title,
  playRuns,
  companyId,
  router,
}: {
  title: string;
  playRuns: PlayRunSummary[];
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
        {title} ({playRuns.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {playRuns.map((r) => {
          const statusColor = r.status === 'COMPLETED' ? t.green : t.blue;
          const statusBg = r.status === 'COMPLETED' ? t.greenBg : t.blueBg;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() =>
                router.push(`/dashboard/companies/${companyId}/plays/run/${r.id}`)
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
                  {r.title}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: t.text4 }}>
                    {r.templateName} · {r.phaseCount} phases
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
                  {r.status.toLowerCase()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompletedPlayRunSection({
  playRuns,
  companyId,
  router,
}: {
  playRuns: PlayRunSummary[];
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
        Play History ({playRuns.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {playRuns.map((r) => {
          const completedDate = r.updatedAt
            ? new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : null;

          return (
            <div
              key={r.id}
              style={{
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/companies/${companyId}/plays/run/${r.id}`)
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
                    {r.title}
                  </p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                    {completedDate && (
                      <span style={{ fontSize: 10, color: t.text4 }}>
                        Completed {completedDate}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: t.text4 }}>{r.templateName}</span>
                  </div>
                </div>
              </button>
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

  const handleRunAgain = async (playTemplateId: string) => {
    setStartingId(playTemplateId);
    try {
      const res = await fetch('/api/play-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, playTemplateId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const runId = data.playRunId ?? data.playRun?.id;
      if (runId) {
        router.push(`/dashboard/companies/${companyId}/plays/run/${runId}`);
      }
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
        {templates.map((tmpl) => (
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
                    {tmpl.phaseCount} phases
                  </span>
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
        ))}
      </div>
    </div>
  );
}

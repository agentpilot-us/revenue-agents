'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';
import HotSignalCard, {
  type HotSignalItem,
  type CompanyTriggerItem,
  type MatchingAccount,
  type MatchedTemplatePreview,
} from './HotSignalCard';

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
  bg: '#0b1120',
};

type Props = {
  hotSignals: HotSignalItem[];
  companyTriggers: CompanyTriggerItem[];
  dismissedTriggerIds: Set<string>;
  onRefresh: () => void;
  onDismissTrigger: (triggerId: string) => void;
};

type FeedItem =
  | { kind: 'signal'; data: HotSignalItem; score: number }
  | { kind: 'trigger'; data: CompanyTriggerItem; score: number };

function computeSignalScore(s: HotSignalItem): number {
  const daysSincePublished = Math.max(
    0,
    (Date.now() - new Date(s.publishedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const recency = Math.max(0.3, 1 - daysSincePublished * 0.1);
  return s.relevanceScore * recency * 10;
}

function computeTriggerScore(trig: CompanyTriggerItem): number {
  const daysUntil = trig.daysUntil ?? 30;
  const closeness = (30 - Math.min(daysUntil, 30)) / 30;
  const accountBoost = trig.matchingAccounts.length * 10;
  return closeness * accountBoost + 5;
}

export default function HotSignalsFeed({
  hotSignals,
  companyTriggers,
  dismissedTriggerIds,
  onRefresh,
  onDismissTrigger,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [dismissedSignalIds, setDismissedSignalIds] = useState<Set<string>>(new Set());
  const [actedSignalIds, setActedSignalIds] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<string | null>(null);

  // Template preview cache: signalId → preview data
  const [templatePreviews, setTemplatePreviews] = useState<
    Record<string, MatchedTemplatePreview>
  >({});

  useEffect(() => {
    if (hotSignals.length === 0) return;
    let cancelled = false;

    const fetchPreviews = async () => {
      const results = await Promise.allSettled(
        hotSignals.map(async (s) => {
          const res = await fetch(`/api/signals/${s.id}/preview-play`);
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.matched || !data.template) return null;
          return {
            signalId: s.id,
            preview: {
              name: data.template.name,
              priority: data.template.priority,
              timingWindow: data.template.timingWindow,
              steps: data.template.steps,
            } as MatchedTemplatePreview,
          };
        }),
      );

      if (cancelled) return;
      const map: Record<string, MatchedTemplatePreview> = {};
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.signalId] = r.value.preview;
        }
      }
      setTemplatePreviews(map);
    };

    fetchPreviews();
    return () => { cancelled = true; };
  }, [hotSignals]);

  // Template preview cache for triggers: triggerKind → preview data
  const [triggerTemplatePreviews, setTriggerTemplatePreviews] = useState<
    Record<string, MatchedTemplatePreview>
  >({});

  useEffect(() => {
    if (companyTriggers.length === 0) return;
    let cancelled = false;

    const kinds = [...new Set(companyTriggers.map((tr) => tr.kind))];
    const fetchTriggerPreviews = async () => {
      const results = await Promise.allSettled(
        kinds.map(async (kind) => {
          const res = await fetch(
            `/api/triggers/preview-play?triggerType=${kind === 'event' ? 'event' : 'feature_release'}`,
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.matched || !data.template) return null;
          return {
            kind,
            preview: {
              name: data.template.name,
              priority: data.template.priority,
              timingWindow: data.template.timingWindow,
              steps: data.template.steps,
            } as MatchedTemplatePreview,
          };
        }),
      );

      if (cancelled) return;
      const map: Record<string, MatchedTemplatePreview> = {};
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.kind] = r.value.preview;
        }
      }
      setTriggerTemplatePreviews(map);
    };

    fetchTriggerPreviews();
    return () => { cancelled = true; };
  }, [companyTriggers]);

  // Trigger bulk-invite state
  const [bulkTrigger, setBulkTrigger] = useState<CompanyTriggerItem | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bulkCreating, setBulkCreating] = useState(false);

  const filteredSignals = useMemo(() => {
    const minScore = showAll ? 4 : 7;
    return hotSignals.filter(
      (s) =>
        s.relevanceScore >= minScore &&
        !dismissedSignalIds.has(s.id) &&
        !actedSignalIds.has(s.id),
    );
  }, [hotSignals, showAll, dismissedSignalIds, actedSignalIds]);

  const filteredTriggers = useMemo(
    () => companyTriggers.filter((trig) => !dismissedTriggerIds.has(trig.id)),
    [companyTriggers, dismissedTriggerIds],
  );

  const feed = useMemo(() => {
    const items: FeedItem[] = [
      ...filteredSignals.map((s) => ({
        kind: 'signal' as const,
        data: {
          ...s,
          matchedTemplate: templatePreviews[s.id],
        },
        score: computeSignalScore(s),
      })),
      ...filteredTriggers.map((trig) => ({
        kind: 'trigger' as const,
        data: {
          ...trig,
          matchedTemplate: triggerTemplatePreviews[trig.kind],
        },
        score: computeTriggerScore(trig),
      })),
    ];
    items.sort((a, b) => b.score - a.score);
    return items;
  }, [filteredSignals, filteredTriggers, templatePreviews, triggerTemplatePreviews]);

  // Demo bypass uses /api/demo/run-play. Off by default so "Work This" uses real signal → play matching.
  // Set NEXT_PUBLIC_HOT_SIGNALS_DEMO_BYPASS=true to force demo path in dev.
  const DEMO_RUN_PLAY_BYPASS =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_HOT_SIGNALS_DEMO_BYPASS === 'true';

  const handleWorkSignal = useCallback(
    async (signalId: string, companyId: string) => {
      setWorking(signalId);
      try {
        const url = DEMO_RUN_PLAY_BYPASS
          ? '/api/demo/run-play'
          : `/api/signals/${signalId}/start-play`;
        const fetchOpts: RequestInit = DEMO_RUN_PLAY_BYPASS
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signalId }),
            }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' } };

        const res = await fetch(url, fetchOpts);
        const data = await res.json();

        if (res.ok) {
          const playRunId = data.playRunId;
          if (playRunId) {
            setActedSignalIds((prev) => new Set(prev).add(signalId));
            onRefresh();
            const redirect =
              typeof data.redirect === 'string'
                ? data.redirect
                : myDayUrlAfterPlayStart(playRunId, companyId);
            window.location.href = redirect;
            return;
          }
        }
        if (!DEMO_RUN_PLAY_BYPASS && res.status === 404) {
          const catalogUrl = `/dashboard/plays?companyId=${encodeURIComponent(companyId)}`;
          const configUrl = `/dashboard/roadmap?companyId=${encodeURIComponent(companyId)}`;
          toast.warning('No play template matched this signal', {
            description:
              'Start a play manually from the catalog, or add a signal → play mapping in Strategic Account Plan → Play Rules.',
            action: {
              label: 'Play Catalog',
              onClick: () => {
                window.location.href = catalogUrl;
              },
            },
            cancel: {
              label: 'Play Rules',
              onClick: () => {
                window.location.href = configUrl;
              },
            },
          });
        }
        if (!res.ok && (DEMO_RUN_PLAY_BYPASS || res.status !== 404)) {
          console.error('Work This failed:', res.status, data);
          const msg =
            typeof data?.error === 'string'
              ? data.error
              : `Could not start play (${res.status}). Try again or start from the Play Catalog.`;
          if (DEMO_RUN_PLAY_BYPASS && data?.error) {
            toast.error(data.error);
          } else if (!DEMO_RUN_PLAY_BYPASS) {
            toast.error(msg);
          }
        }
      } catch (err) {
        console.error('Failed to start play from signal:', err);
        toast.error('Network error starting play. Check your connection and try again.');
      } finally {
        setWorking(null);
      }
    },
    [onRefresh],
  );

  const handleDismissSignal = useCallback(async (signalId: string) => {
    setDismissedSignalIds((prev) => new Set(prev).add(signalId));
    try {
      await fetch(`/api/signals/${signalId}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' }),
      });
    } catch (err) {
      console.error('Failed to dismiss signal:', err);
    }
  }, []);

  const handleWorkTrigger = useCallback((trigger: CompanyTriggerItem) => {
    setBulkTrigger(trigger);
    setSelectedAccounts(new Set(trigger.matchingAccounts.map((a) => a.companyId)));
  }, []);

  const handleDismissTriggerLocal = useCallback(
    (triggerId: string) => {
      onDismissTrigger(triggerId);
    },
    [onDismissTrigger],
  );

  const toggleAccountSelection = (companyId: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const handleBulkSend = async () => {
    if (!bulkTrigger || selectedAccounts.size === 0) return;
    setBulkCreating(true);
    try {
      const tmplRes = await fetch('/api/play-templates');
      const tmplData = await tmplRes.json();
      const templates = tmplData.templates || tmplData || [];

      const triggerKind = bulkTrigger.kind;
      const templateMatch = templates.find(
        (tmpl: { name: string }) =>
          triggerKind === 'event'
            ? tmpl.name.toLowerCase().includes('event') || tmpl.name.toLowerCase().includes('invite')
            : tmpl.name.toLowerCase().includes('feature') || tmpl.name.toLowerCase().includes('product'),
      );
      if (!templateMatch) {
        console.error('No matching play template found for trigger kind:', triggerKind);
        toast.error('No play template matched this trigger', {
          description: 'Pick a template in Start Campaign or add a template whose name includes event or feature.',
        });
        return;
      }

      let lastRunId: string | null = null;
      let lastCompanyId: string | null = null;

      for (const companyId of selectedAccounts) {
        const acct = bulkTrigger.matchingAccounts.find(
          (a) => a.companyId === companyId,
        );
        if (!acct) continue;

        const res = await fetch('/api/play-runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            playTemplateId: templateMatch.id,
            title: `${bulkTrigger.title}: ${acct.companyName}`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          lastRunId = data.playRunId ?? data.playRun?.id;
          lastCompanyId = companyId;
        }
      }

      setBulkTrigger(null);
      setSelectedAccounts(new Set());

      if (lastRunId && lastCompanyId) {
        window.location.href = myDayUrlAfterPlayStart(lastRunId, lastCompanyId);
      } else {
        onRefresh();
      }
    } catch (err) {
      console.error('Trigger play creation failed:', err);
    } finally {
      setBulkCreating(false);
    }
  };

  const lowScoreCount = hotSignals.filter(
    (s) =>
      s.relevanceScore >= 4 &&
      s.relevanceScore < 7 &&
      !dismissedSignalIds.has(s.id) &&
      !actedSignalIds.has(s.id),
  ).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: t.text1,
            margin: 0,
          }}
        >
          Hot Signals &amp; Triggers
          {feed.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                color: t.text3,
              }}
            >
              ({feed.length})
            </span>
          )}
        </h2>
      </div>

      {feed.length === 0 && (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: t.text4,
            fontSize: 13,
            background: t.surface,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
          }}
        >
          No hot signals or triggers right now. Check back later.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 520,
          overflowY: 'auto',
        }}
      >
        {feed.map((item) => {
          if (item.kind === 'signal') {
            return (
              <div
                key={`s-${item.data.id}`}
                style={{
                  opacity: working === item.data.id ? 0.5 : 1,
                  pointerEvents: working === item.data.id ? 'none' : 'auto',
                  transition: 'opacity 0.2s',
                }}
              >
                <HotSignalCard
                  kind="signal"
                  signal={item.data}
                  onWorkThis={handleWorkSignal}
                  onDismiss={handleDismissSignal}
                />
              </div>
            );
          }
          return (
            <HotSignalCard
              key={`t-${item.data.id}`}
              kind="trigger"
              trigger={item.data}
              onWorkTrigger={handleWorkTrigger}
              onDismiss={handleDismissTriggerLocal}
            />
          );
        })}
      </div>

      {/* Show all toggle */}
      {!showAll && lowScoreCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 10,
            padding: '8px 0',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.text3,
            fontSize: 11,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Show {lowScoreCount} more signal{lowScoreCount !== 1 ? 's' : ''} (score 4-6)
        </button>
      )}
      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 10,
            padding: '8px 0',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.text3,
            fontSize: 11,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Show hot signals only (score 7+)
        </button>
      )}

      {/* Bulk trigger modal */}
      {bulkTrigger && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setBulkTrigger(null);
              setSelectedAccounts(new Set());
            }
          }}
        >
          <div
            style={{
              width: 440,
              maxHeight: '80vh',
              overflow: 'auto',
              background: 'rgba(15,23,42,0.95)',
              borderRadius: 14,
              border: `1px solid ${t.borderMed}`,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: t.text1,
                marginTop: 0,
                marginBottom: 4,
              }}
            >
              {bulkTrigger.title}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: t.text3,
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Select accounts to send event invites to:
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginBottom: 20,
              }}
            >
              {bulkTrigger.matchingAccounts.map((acct: MatchingAccount) => (
                <button
                  key={acct.companyId}
                  type="button"
                  onClick={() => toggleAccountSelection(acct.companyId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedAccounts.has(acct.companyId)
                      ? t.blueBg
                      : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: `1px solid ${selectedAccounts.has(acct.companyId) ? t.blue : 'rgba(255,255,255,0.15)'}`,
                      background: selectedAccounts.has(acct.companyId)
                        ? t.blue
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {selectedAccounts.has(acct.companyId) ? '✓' : ''}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: t.text1,
                      }}
                    >
                      {acct.companyName}
                    </div>
                    <div style={{ fontSize: 11, color: t.text3 }}>
                      {acct.divisions
                        .map((d) => `${d.name} (${d.contactCount})`)
                        .join(', ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
            >
              <button
                type="button"
                onClick={() => {
                  setBulkTrigger(null);
                  setSelectedAccounts(new Set());
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${t.border}`,
                  color: t.text2,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSend}
                disabled={bulkCreating || selectedAccounts.size === 0}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background:
                    bulkCreating || selectedAccounts.size === 0
                      ? 'rgba(59,130,246,0.15)'
                      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor:
                    bulkCreating || selectedAccounts.size === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {bulkCreating
                  ? 'Creating...'
                  : `Send to ${selectedAccounts.size} Account${selectedAccounts.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.06)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.06)',
  purpleBorder: 'rgba(167,139,250,0.2)',
};

export type OutcomeValue =
  | 'meeting_booked'
  | 'reply_received'
  | 'pipeline_created'
  | 'no_response'
  | 'not_interested'
  | 'deferred';

const OUTCOMES: { value: OutcomeValue; label: string; color: string; bg: string; border: string }[] = [
  { value: 'meeting_booked', label: 'Meeting Booked', color: t.green, bg: t.greenBg, border: t.greenBorder },
  { value: 'reply_received', label: 'Got a Reply', color: t.blue, bg: t.blueBg, border: t.blueBorder },
  { value: 'pipeline_created', label: 'Pipeline Created', color: t.green, bg: t.greenBg, border: t.greenBorder },
  { value: 'no_response', label: 'No Response', color: t.amber, bg: t.amberBg, border: 'rgba(245,158,11,0.2)' },
  { value: 'not_interested', label: 'Not Interested', color: t.red, bg: t.redBg, border: 'rgba(239,68,68,0.2)' },
  { value: 'deferred', label: 'Deferred', color: t.text3, bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)' },
];

type NextPlayRec = {
  templateId: string;
  templateName: string;
  expectedOutcome: string | null;
  reasons: string[];
  targetDivision: { id: string; name: string } | null;
  stepPreview: string[];
};

type Props = {
  workflowId: string;
  companyId?: string;
  onSaved: () => void;
  onStartNextPlay?: (templateId: string, divisionId?: string) => void;
  compact?: boolean;
};

export default function OutcomeSelector({ workflowId, companyId, onSaved, onStartNextPlay, compact }: Props) {
  const [selected, setSelected] = useState<OutcomeValue | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextPlay, setNextPlay] = useState<NextPlayRec | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [startingNext, setStartingNext] = useState(false);

  const fetchNextPlay = useCallback(async () => {
    if (!companyId || compact) return;
    setLoadingNext(true);
    try {
      const res = await fetch(`/api/account-campaigns/next-play?companyId=${companyId}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.plays?.length > 0) setNextPlay(data.plays[0]);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingNext(false);
    }
  }, [companyId, compact]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/action-workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: selected,
          outcomeNote: note || undefined,
          status: 'completed',
        }),
      });
      setSaved(true);
      fetchNextPlay();
      if (!companyId) setTimeout(onSaved, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleStartNext = async () => {
    if (!nextPlay || !onStartNextPlay) return;
    setStartingNext(true);
    try {
      onStartNextPlay(nextPlay.templateId, nextPlay.targetDivision?.id);
    } finally {
      setStartingNext(false);
    }
  };

  useEffect(() => {
    if (saved && !companyId) return;
    if (saved && nextPlay === null && !loadingNext) {
      setTimeout(onSaved, 800);
    }
  }, [saved, nextPlay, loadingNext, companyId, onSaved]);

  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          padding: compact ? '10px 14px' : '16px 20px',
          borderRadius: 10,
          background: t.greenBg,
          border: `1px solid ${t.greenBorder}`,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: t.green,
        }}>
          Outcome saved
        </div>

        {/* Next play recommendation */}
        {loadingNext && (
          <div style={{ fontSize: 12, color: t.text3, textAlign: 'center', padding: 8 }}>
            Finding recommended next play...
          </div>
        )}
        {nextPlay && onStartNextPlay && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: t.purpleBg,
            border: `1px solid ${t.purpleBorder}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.purple, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Recommended Next Play
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text1, marginBottom: 4 }}>
              {nextPlay.templateName}
            </div>
            {nextPlay.targetDivision && (
              <div style={{ fontSize: 11, color: t.text2, marginBottom: 6 }}>
                → {nextPlay.targetDivision.name}
              </div>
            )}
            {nextPlay.reasons.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {nextPlay.reasons.slice(0, 2).map((r, i) => (
                  <span key={i} style={{ fontSize: 10, color: t.text3, background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: 4 }}>
                    {r}
                  </span>
                ))}
              </div>
            )}
            {nextPlay.expectedOutcome && (
              <div style={{ fontSize: 11, color: t.green, marginBottom: 10 }}>
                Expected: {nextPlay.expectedOutcome.length > 80 ? nextPlay.expectedOutcome.slice(0, 78) + '...' : nextPlay.expectedOutcome}
              </div>
            )}
            {nextPlay.stepPreview.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {nextPlay.stepPreview.map((s, i) => (
                  <span key={i} style={{ fontSize: 10, color: t.text2, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4 }}>
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleStartNext}
                disabled={startingNext}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: startingNext ? 'rgba(167,139,250,0.15)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: startingNext ? 'not-allowed' : 'pointer',
                }}
              >
                {startingNext ? 'Starting...' : 'Start This Play'}
              </button>
              <button
                type="button"
                onClick={onSaved}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${t.border}`,
                  color: t.text3,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: compact ? '12px 14px' : '16px 20px',
        borderRadius: 10,
        background: t.surface,
        border: `1px solid ${t.borderMed}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text1, marginBottom: 10 }}>
        How did this play go?
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {OUTCOMES.map((o) => {
          const isActive = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setSelected(isActive ? null : o.value)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 6,
                border: `1px solid ${isActive ? o.border : t.border}`,
                background: isActive ? o.bg : 'transparent',
                color: isActive ? o.color : t.text3,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {selected && !compact && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note..."
          rows={2}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 6,
            border: `1px solid ${t.border}`,
            background: 'rgba(15,23,42,0.4)',
            color: t.text1,
            fontSize: 12,
            resize: 'vertical',
            marginBottom: 10,
          }}
        />
      )}

      {selected && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: 8,
            background: saving ? 'rgba(59,130,246,0.15)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Outcome'}
        </button>
      )}
    </div>
  );
}

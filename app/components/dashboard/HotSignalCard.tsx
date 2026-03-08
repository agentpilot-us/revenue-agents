'use client';

import { useState } from 'react';
import SuggestedActionsStrip from './SuggestedActionsStrip';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  blueLight: '#93c5fd',
  green: '#22c55e',
  red: '#ef4444',
  redDot: '#ef4444',
  blueDot: '#3b82f6',
  amber: '#f59e0b',
};

export type MatchedTemplatePreview = {
  name: string;
  priority: number;
  timingWindow?: string;
  steps: { order: number; name: string; channel: string }[];
};

export type HotSignalItem = {
  id: string;
  companyId: string;
  companyName: string;
  type: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  relevanceScore: number;
  suggestedPlay: string | null;
  matchedTemplate?: MatchedTemplatePreview;
};

export type MatchingDivision = {
  id: string;
  name: string;
  contactCount: number;
};

export type MatchingAccount = {
  companyId: string;
  companyName: string;
  divisions: MatchingDivision[];
};

export type CompanyTriggerItem = {
  id: string;
  kind: 'event' | 'product';
  title: string;
  description: string | null;
  eventDate: string | null;
  daysUntil: number | null;
  departmentTags: string[];
  industryTag: string | null;
  matchingAccounts: MatchingAccount[];
  matchedTemplate?: MatchedTemplatePreview;
};

type SignalCardProps = {
  kind: 'signal';
  signal: HotSignalItem;
  onWorkThis: (signalId: string, companyId: string) => void;
  onDismiss: (signalId: string) => void;
};

type TriggerCardProps = {
  kind: 'trigger';
  trigger: CompanyTriggerItem;
  onWorkTrigger: (trigger: CompanyTriggerItem) => void;
  onDismiss: (triggerId: string) => void;
};

type Props = SignalCardProps | TriggerCardProps;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HotSignalCard(props: Props) {
  const [expanded, setExpanded] = useState(false);

  if (props.kind === 'signal') {
    const { signal, onWorkThis, onDismiss } = props;
    return (
      <div
        style={{
          background: t.surface,
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Header: dot + badge + timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: t.redDot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(239,68,68,0.08)',
              color: t.red,
              textTransform: 'uppercase',
            }}
          >
            {signal.companyName}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: t.text4 }}>
            {timeAgo(signal.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, lineHeight: 1.4 }}>
          {signal.title}
        </div>

        {/* Summary */}
        {signal.summary && (
          <div
            style={{
              fontSize: 12,
              color: t.text3,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {signal.summary}
          </div>
        )}

        {/* Score badge + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: signal.relevanceScore >= 8 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              color: signal.relevanceScore >= 8 ? t.red : t.amber,
            }}
          >
            Score {signal.relevanceScore}
          </span>
          <span style={{ fontSize: 10, color: t.text4 }}>
            {signal.type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Matched template preview — suggested actions strip */}
        {signal.matchedTemplate && signal.matchedTemplate.steps.length > 0 && (
          <SuggestedActionsStrip template={signal.matchedTemplate} />
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => onWorkThis(signal.id, signal.companyId)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Work This
          </button>
          <button
            type="button"
            onClick={() => onDismiss(signal.id)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Trigger card
  const { trigger, onWorkTrigger, onDismiss } = props;
  const totalContacts = trigger.matchingAccounts.reduce(
    (sum, a) => sum + a.divisions.reduce((s, d) => s + d.contactCount, 0),
    0,
  );

  return (
    <div
      style={{
        background: t.surface,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header: dot + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: t.blueDot,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 4,
            background: t.blueBg,
            color: t.blue,
            textTransform: 'uppercase',
          }}
        >
          YOUR COMPANY
        </span>
        {trigger.kind === 'event' && trigger.daysUntil != null && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: t.text4 }}>
            in {trigger.daysUntil} days
          </span>
        )}
      </div>

      {/* Headline */}
      <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, lineHeight: 1.4 }}>
        {trigger.title}
        {trigger.kind === 'event' && trigger.daysUntil != null && (
          <span style={{ fontWeight: 400, color: t.text3, fontSize: 12 }}>
            {' '}— {trigger.daysUntil} days away
          </span>
        )}
      </div>

      {/* Description */}
      {trigger.description && (
        <div
          style={{
            fontSize: 12,
            color: t.text3,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {trigger.description}
        </div>
      )}

      {/* Matched template preview — suggested actions strip */}
      {trigger.matchedTemplate && trigger.matchedTemplate.steps.length > 0 && (
        <SuggestedActionsStrip template={trigger.matchedTemplate} />
      )}

      {/* Matching accounts summary */}
      {trigger.matchingAccounts.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: t.blue,
              fontSize: 11,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {trigger.matchingAccounts.length} account{trigger.matchingAccounts.length !== 1 ? 's' : ''} with matching divisions ({totalContacts} contact{totalContacts !== 1 ? 's' : ''})
            {' '}{expanded ? '▾' : '▸'}
          </button>
          {expanded && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trigger.matchingAccounts.map((acct) => (
                <div
                  key={acct.companyId}
                  style={{
                    fontSize: 11,
                    color: t.text2,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: t.text1 }}>{acct.companyName}</span>
                  {' — '}
                  {acct.divisions.map((d) => `${d.name} (${d.contactCount})`).join(', ')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => onWorkTrigger(trigger)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Work This
        </button>
        <button
          type="button"
          onClick={() => onDismiss(trigger.id)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.text4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

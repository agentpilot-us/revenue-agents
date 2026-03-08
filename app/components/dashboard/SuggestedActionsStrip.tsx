'use client';

import { useState } from 'react';

const t = {
  border: 'rgba(255,255,255,0.06)',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  blueLight: '#93c5fd',
  red: '#ef4444',
  amber: '#f59e0b',
};

export type StripTemplate = {
  name: string;
  priority: number;
  timingWindow?: string;
  steps: { order: number; name: string; channel?: string }[];
};

function priorityLabel(p: number): { text: string; color: string; bg: string } {
  if (p >= 8) return { text: 'HIGH', color: t.red, bg: 'rgba(239,68,68,0.1)' };
  if (p >= 5) return { text: 'MEDIUM', color: t.amber, bg: 'rgba(245,158,11,0.1)' };
  return { text: 'LOW', color: t.text3, bg: 'rgba(100,116,139,0.1)' };
}

export default function SuggestedActionsStrip({ template }: { template: StripTemplate }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const pri = priorityLabel(template.priority);

  return (
    <div
      style={{
        background: 'rgba(30,41,59,0.7)',
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: t.blue, fontWeight: 600 }}>
          ⚡ {template.name}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 6px',
            borderRadius: 3,
            background: pri.bg,
            color: pri.color,
            textTransform: 'uppercase',
          }}
        >
          {pri.text}
        </span>
        {template.timingWindow && (
          <span style={{ fontSize: 9, color: t.text4, marginLeft: 'auto' }}>
            Window: {template.timingWindow}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5, overflowX: 'auto' }}>
        {template.steps.map((step, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              style={{
                flex: '0 0 auto',
                minWidth: 130,
                maxWidth: 180,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${isActive ? t.blueBorder : t.border}`,
                background: isActive ? t.blueBg : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isActive ? t.blueLight : t.text2,
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {i + 1}. {step.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

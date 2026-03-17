'use client';

import { useState, type ReactNode } from 'react';
import { SalesMapEditor } from '@/app/dashboard/roadmap/SalesMapEditor';
import { SignalConfigPanel } from '@/app/components/roadmap/SignalConfigPanel';
import { OperationalLimitsEditor } from '@/app/components/roadmap/OperationalLimitsEditor';
import { PlayRulesPanel } from '@/app/components/roadmap/PlayRulesPanel';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
};

type Condition = {
  id: string;
  type: string;
  config: unknown;
  isActive: boolean;
};

type Props = {
  roadmapId?: string;
  roadmapType: string;
  objective: Record<string, unknown> | null;
  contentStrategy: Record<string, unknown> | null;
  companyId: string;
  companyName: string;
  conditions: Condition[];
};

function AccordionSection({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: t.text2,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <svg
          style={{ width: 12, height: 12, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{title}</span>
        {count != null && (
          <span style={{ fontSize: 10, color: t.text3 }}>({count})</span>
        )}
      </button>
      {open && (
        <div style={{ paddingBottom: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ConfigurationPanel({
  roadmapId,
  roadmapType,
  objective,
  contentStrategy,
  companyId,
  companyName,
  conditions,
}: Props) {
  return (
    <div
      style={{
        padding: '4px 20px',
        borderRadius: 12,
        background: t.surface,
        border: `1px solid ${t.borderMed}`,
      }}
    >
      <AccordionSection title="Objective &amp; Content Strategy" defaultOpen>
        <SalesMapEditor
          roadmapType={roadmapType}
          objective={objective}
          contentStrategy={contentStrategy}
          companyId={companyId}
          companyName={companyName}
        />
      </AccordionSection>

      <AccordionSection title="Operational Limits">
        <OperationalLimitsEditor companyId={companyId} />
      </AccordionSection>

      <AccordionSection title="Signal Configuration">
        <SignalConfigPanel companyId={companyId} />
      </AccordionSection>

      {roadmapId && (
        <AccordionSection title="Play Rules">
          <PlayRulesPanel roadmapId={roadmapId} />
        </AccordionSection>
      )}

      <AccordionSection title="Conditions &amp; Modifiers" count={conditions.length}>
        {conditions.length === 0 ? (
          <p style={{ fontSize: 13, color: t.text3 }}>No conditions defined yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conditions.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${t.border}`,
                  fontSize: 12,
                }}
              >
                <span style={{ color: t.text1, fontWeight: 500 }}>
                  {c.type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 10, color: c.isActive ? '#22c55e' : t.text3 }}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </AccordionSection>
    </div>
  );
}

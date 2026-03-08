'use client';

import { useEffect, useState } from 'react';
import type { DivisionCoverage } from '@/app/api/roadmap/coverage/route';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.06)',
  amberBorder: 'rgba(245,158,11,0.2)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.06)',
  redBorder: 'rgba(239,68,68,0.2)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.06)',
  blueBorder: 'rgba(59,130,246,0.2)',
};

const HEALTH_CONFIG: Record<DivisionCoverage['health'], { color: string; bg: string; border: string; label: string }> = {
  strong: { color: t.green, bg: t.greenBg, border: t.greenBorder, label: 'Strong' },
  warming: { color: t.amber, bg: t.amberBg, border: t.amberBorder, label: 'Warming' },
  cold: { color: t.red, bg: t.redBg, border: t.redBorder, label: 'Cold' },
  untouched: { color: t.text4, bg: 'rgba(71,85,105,0.06)', border: 'rgba(71,85,105,0.15)', label: 'Untouched' },
};

type Props = {
  companyId: string;
};

export default function CoverageDashboard({ companyId }: Props) {
  const [divisions, setDivisions] = useState<DivisionCoverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/roadmap/coverage?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => setDivisions(data.divisions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: t.text4 }}>
        Loading coverage...
      </div>
    );
  }

  if (divisions.length === 0) return null;

  const strongCount = divisions.filter((d) => d.health === 'strong').length;
  const coldCount = divisions.filter((d) => d.health === 'cold' || d.health === 'untouched').length;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Summary strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text1 }}>
          Buying Group Coverage
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: t.text3 }}>
          <span>
            <span style={{ color: t.green, fontWeight: 700 }}>{strongCount}</span> strong
          </span>
          {coldCount > 0 && (
            <span>
              <span style={{ color: t.red, fontWeight: 700 }}>{coldCount}</span> need attention
            </span>
          )}
          <span>{divisions.length} total</span>
        </div>
      </div>

      {/* Division grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        {divisions.map((div) => {
          const hc = HEALTH_CONFIG[div.health];
          return (
            <div
              key={div.departmentId}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${hc.border}`,
                transition: 'border-color 0.2s',
              }}
            >
              {/* Header: name + health dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: hc.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {div.name}
                </span>
                {div.stage && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 3,
                      background: hc.bg,
                      color: hc.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {div.stage.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: 11 }}>
                <StatRow label="Contacts" value={String(div.contacts)} />
                <StatRow label="Active plays" value={String(div.activePlays)} />
                <StatRow
                  label="Last touch"
                  value={div.lastTouchDaysAgo !== null ? `${div.lastTouchDaysAgo}d ago` : 'Never'}
                  color={div.lastTouchDaysAgo !== null && div.lastTouchDaysAgo <= 7 ? t.green : div.lastTouchDaysAgo !== null && div.lastTouchDaysAgo <= 14 ? t.amber : t.red}
                />
                <StatRow label="Health" value={hc.label} color={hc.color} />
              </div>

              {/* 30d activity */}
              <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 10, color: t.text4 }}>
                <span>{div.thirtyDayActivity.emailsSent} emails</span>
                <span>{div.thirtyDayActivity.meetings} meetings</span>
                <span>{div.thirtyDayActivity.replies} replies</span>
              </div>

              {/* Estimated opportunity */}
              {div.estimatedOpportunity && (
                <div style={{ marginTop: 4, fontSize: 10, color: t.blue, fontWeight: 600 }}>
                  {div.estimatedOpportunity}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: t.text4 }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? t.text2 }}>{value}</span>
    </div>
  );
}

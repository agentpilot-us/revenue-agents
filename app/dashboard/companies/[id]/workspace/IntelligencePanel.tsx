'use client';

import { useState } from 'react';

const t = {
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
};

type Company = {
  id: string;
  name: string;
  industry: string | null;
  businessOverview: string | null;
  dealObjective: string | null;
  keyInitiatives: unknown;
  activeObjections: unknown;
};

type Department = {
  id: string;
  type: string;
  customName: string | null;
  status: string;
  useCase: string | null;
  valueProp: string | null;
  _count: { contacts: number };
};

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  title: string | null;
  engagementScore: number | null;
  companyDepartment: { customName: string | null; type: string } | null;
};

type Signal = {
  id: string;
  type: string;
  title: string;
  summary: string;
  publishedAt: string;
  relevanceScore: number;
  status: string;
};

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  contact: { firstName: string | null; lastName: string | null } | null;
};

type Props = {
  company: Company;
  departments: Department[];
  contacts: Contact[];
  signals: Signal[];
  recentActivities: ActivityItem[];
};

function CollapsibleSection({
  title,
  defaultOpen,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div
      style={{
        background: t.surface,
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: t.text3,
          }}
        >
          {title}
          {count !== undefined && (
            <span style={{ color: t.text4, fontWeight: 400, marginLeft: 6 }}>
              ({count})
            </span>
          )}
        </span>
        <span style={{ color: t.text4, fontSize: 12 }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

export default function IntelligencePanel({
  company,
  departments,
  contacts,
  signals,
  recentActivities,
}: Props) {
  const initiatives = Array.isArray(company.keyInitiatives)
    ? (company.keyInitiatives as string[])
    : [];
  const objections = Array.isArray(company.activeObjections)
    ? (company.activeObjections as Array<{
        objection: string;
        severity: string;
        status: string;
      }>)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Account Overview */}
      <CollapsibleSection title="Account Overview" defaultOpen>
        <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6 }}>
          {company.businessOverview || 'No overview available.'}
        </div>
        {company.dealObjective && (
          <div style={{ marginTop: 8, fontSize: 12, color: t.text3 }}>
            <strong style={{ color: t.text2 }}>Objective:</strong>{' '}
            {company.dealObjective}
          </div>
        )}
        {initiatives.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: t.text3,
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              KEY INITIATIVES
            </div>
            {initiatives.slice(0, 5).map((i, idx) => (
              <div
                key={idx}
                style={{ fontSize: 12, color: t.text2, padding: '2px 0' }}
              >
                {i}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Divisions */}
      <CollapsibleSection
        title="Divisions"
        count={departments.length}
        defaultOpen
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {departments.map((dept) => (
            <div
              key={dept.id}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(15,23,42,0.3)',
                border: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text1 }}>
                  {dept.customName || dept.type.replace(/_/g, ' ')}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background:
                      dept.status === 'ACTIVE_CUSTOMER'
                        ? t.greenBg
                        : dept.status === 'EXPANSION_TARGET'
                          ? t.amberBg
                          : t.blueBg,
                    color:
                      dept.status === 'ACTIVE_CUSTOMER'
                        ? t.green
                        : dept.status === 'EXPANSION_TARGET'
                          ? t.amber
                          : t.blue,
                    letterSpacing: '0.04em',
                  }}
                >
                  {dept.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: 11, color: t.text4, marginTop: 2 }}>
                {dept._count.contacts} contacts
              </div>
              {dept.useCase && (
                <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>
                  {dept.useCase}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Contacts */}
      <CollapsibleSection
        title="Top Contacts"
        count={contacts.length}
        defaultOpen={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {contacts.slice(0, 15).map((c) => (
            <div
              key={c.id}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(15,23,42,0.3)',
                border: `1px solid ${t.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text1 }}>
                  {c.firstName} {c.lastName}
                </div>
                <div style={{ fontSize: 10, color: t.text4 }}>
                  {c.title}
                  {c.companyDepartment &&
                    ` - ${c.companyDepartment.customName || c.companyDepartment.type.replace(/_/g, ' ')}`}
                </div>
              </div>
              {c.engagementScore != null && c.engagementScore > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: t.green,
                  }}
                >
                  {c.engagementScore.toFixed(0)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Signals */}
      <CollapsibleSection
        title="Signals (30 days)"
        count={signals.length}
        defaultOpen={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {signals.map((s) => (
            <div
              key={s.id}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(15,23,42,0.3)',
                border: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.text1,
                    flex: 1,
                  }}
                >
                  {s.title}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      s.relevanceScore >= 8
                        ? '#ef4444'
                        : s.relevanceScore >= 6
                          ? t.amber
                          : t.text3,
                    marginLeft: 8,
                    flexShrink: 0,
                  }}
                >
                  {s.relevanceScore}/10
                </span>
              </div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                {s.type.replace(/_/g, ' ')} &middot;{' '}
                {new Date(s.publishedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Active Objections */}
      {objections.length > 0 && (
        <CollapsibleSection
          title="Active Objections"
          count={objections.filter((o) => o.status === 'active').length}
          defaultOpen={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {objections
              .filter((o) => o.status === 'active')
              .map((o, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.1)',
                    fontSize: 12,
                    color: t.text2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      marginRight: 6,
                    }}
                  >
                    {o.severity.toUpperCase()}
                  </span>
                  {o.objection}
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Content History */}
      {recentActivities.length > 0 && (
        <CollapsibleSection
          title="Content History"
          count={recentActivities.length}
          defaultOpen={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {recentActivities.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  color: t.text2,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{a.summary}</span>
                <span style={{ color: t.text4, flexShrink: 0, marginLeft: 8 }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

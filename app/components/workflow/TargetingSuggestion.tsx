'use client';

import { useState } from 'react';

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
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
  purple: '#a855f7',
  purpleBg: 'rgba(168,85,247,0.06)',
  purpleBorder: 'rgba(168,85,247,0.2)',
  amber: '#f59e0b',
};

export type SuggestedContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  seniorityLevel: number | null;
  engagementStatus: string;
  departmentName: string;
  reason: string;
  activePlay?: { workflowId: string; playName: string; channel: string | null; dueAt: string | null } | null;
  lastTouch?: { channel: string; daysAgo: number } | null;
};

export type SuggestedDepartment = {
  departmentId: string;
  departmentName: string;
  departmentType: string;
  stage: string | null;
  whyThisTeam: string;
  whatToSay: string;
  expectedOutcome: string;
  contacts: SuggestedContact[];
};

export type TargetingSuggestionData = {
  departments: SuggestedDepartment[];
  reasoning: string;
};

type Props = {
  suggestion: TargetingSuggestionData;
  onApply: (contactIds: string[], departmentIds: string[]) => void;
  onSkip: () => void;
};

const STAGE_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  active: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', color: '#22c55e' },
  expansion: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
  research: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', color: '#3b82f6' },
};

function getStageBadge(stage: string | null) {
  if (!stage) return null;
  const lower = stage.toLowerCase();
  const style =
    lower.includes('active') ? STAGE_BADGE.active :
    lower.includes('expansion') ? STAGE_BADGE.expansion :
    STAGE_BADGE.research;
  return { style, label: stage.replace(/_/g, ' ') };
}

const ENGAGEMENT_DOT: Record<string, { color: string; icon: string }> = {
  Engaged: { color: '#22c55e', icon: '●' },
  Contacted: { color: '#3b82f6', icon: '◐' },
  Enriched: { color: '#94a3b8', icon: '○' },
  'Not enriched': { color: '#475569', icon: '·' },
};

export default function TargetingSuggestion({ suggestion, onApply, onSkip }: Props) {
  const [acceptedDepts, setAcceptedDepts] = useState<Set<string>>(
    () => new Set(suggestion.departments.map((d) => d.departmentId)),
  );

  const toggleDept = (deptId: string) => {
    setAcceptedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const handleApply = () => {
    const selectedDepts = suggestion.departments.filter((d) => acceptedDepts.has(d.departmentId));
    const contactIds = selectedDepts.flatMap((d) => d.contacts.map((c) => c.id));
    const departmentIds = selectedDepts.map((d) => d.departmentId);
    onApply(contactIds, departmentIds);
  };

  const totalContacts = suggestion.departments
    .filter((d) => acceptedDepts.has(d.departmentId))
    .reduce((sum, d) => sum + d.contacts.length, 0);

  return (
    <div
      style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(168,85,247,0.04))',
        border: `1px solid ${t.purpleBorder}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>⚡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>
              AI Recommendation
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: t.purpleBg,
                border: `1px solid ${t.purpleBorder}`,
                color: t.purple,
              }}
            >
              {suggestion.departments.length} buying group{suggestion.departments.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: 12, color: t.text3, margin: 0, lineHeight: 1.5 }}>
            {suggestion.reasoning}
          </p>
        </div>
      </div>

      {/* Department cards */}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {suggestion.departments.map((dept) => {
          const accepted = acceptedDepts.has(dept.departmentId);
          const stageBadge = getStageBadge(dept.stage);

          return (
            <div
              key={dept.departmentId}
              style={{
                borderBottom: `1px solid ${t.border}`,
                background: accepted ? 'rgba(168,85,247,0.03)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {/* Department header */}
              <div style={{ padding: '12px 18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.text1 }}>
                    {dept.departmentName}
                  </span>
                  {stageBadge && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: stageBadge.style.bg,
                        border: `1px solid ${stageBadge.style.border}`,
                        color: stageBadge.style.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {stageBadge.label}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: t.text4 }}>
                    {dept.contacts.length} contact{dept.contacts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Brief sections */}
                <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                  <BriefBlock label="Why this team" text={dept.whyThisTeam} color={t.blue} />
                  <BriefBlock label="What to say" text={dept.whatToSay} color={t.green} />
                  <BriefBlock label="Expected outcome" text={dept.expectedOutcome} color={t.amber} />
                </div>
              </div>

              {/* Contact list (compact) */}
              <div style={{ padding: '0 18px 6px' }}>
                {dept.contacts.map((c) => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
                  const eng = ENGAGEMENT_DOT[c.engagementStatus] ?? ENGAGEMENT_DOT['Not enriched'];
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 0',
                        borderTop: `1px solid ${t.border}`,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.text1, minWidth: 0, flex: 1 }}>
                        {name}
                        {c.title && (
                          <span style={{ fontWeight: 400, color: t.text3, marginLeft: 6, fontSize: 11 }}>
                            {c.title}
                          </span>
                        )}
                      </span>
                      {c.seniority && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: t.purpleBg,
                            color: t.purple,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {c.seniority}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: eng.color, flexShrink: 0 }}>
                        {eng.icon}
                      </span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        {c.email && (
                          <span style={{ fontSize: 8, padding: '1px 3px', borderRadius: 2, background: t.greenBg, color: t.green, border: `1px solid ${t.greenBorder}` }}>
                            email
                          </span>
                        )}
                        {c.linkedinUrl && (
                          <span style={{ fontSize: 8, padding: '1px 3px', borderRadius: 2, background: t.blueBg, color: t.blue, border: `1px solid ${t.blueBorder}` }}>
                            LI
                          </span>
                        )}
                        {c.activePlay && (
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: 'rgba(245,158,11,0.1)', color: t.amber, border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap' }}>
                            In: {c.activePlay.playName.length > 20 ? c.activePlay.playName.slice(0, 18) + '...' : c.activePlay.playName}
                          </span>
                        )}
                        {!c.activePlay && c.lastTouch && c.lastTouch.daysAgo <= 7 && (
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.15)', whiteSpace: 'nowrap' }}>
                            {c.lastTouch.channel} {c.lastTouch.daysAgo}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Worth it / Skip */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '8px 18px 12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => { if (!accepted) toggleDept(dept.departmentId); }}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '5px 14px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: accepted ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : t.purpleBg,
                    color: accepted ? '#fff' : t.purple,
                    transition: 'all 0.15s',
                  }}
                >
                  {accepted ? '✓ Worth it' : 'Worth it'}
                </button>
                <button
                  type="button"
                  onClick={() => { if (accepted) toggleDept(dept.departmentId); }}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '5px 14px',
                    borderRadius: 6,
                    border: `1px solid ${!accepted ? 'rgba(239,68,68,0.3)' : t.borderMed}`,
                    cursor: 'pointer',
                    background: !accepted ? 'rgba(239,68,68,0.06)' : 'transparent',
                    color: !accepted ? '#ef4444' : t.text4,
                    transition: 'all 0.15s',
                  }}
                >
                  {!accepted ? '✕ Skipped' : 'Skip this team'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={handleApply}
          disabled={acceptedDepts.size === 0}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 8,
            background:
              acceptedDepts.size === 0
                ? 'rgba(168,85,247,0.1)'
                : 'linear-gradient(135deg, #a855f7, #7c3aed)',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: acceptedDepts.size === 0 ? 'not-allowed' : 'pointer',
            opacity: acceptedDepts.size === 0 ? 0.5 : 1,
            boxShadow: acceptedDepts.size > 0 ? '0 2px 12px rgba(168,85,247,0.2)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Apply {acceptedDepts.size} team{acceptedDepts.size !== 1 ? 's' : ''} ({totalContacts} contact{totalContacts !== 1 ? 's' : ''})
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.borderMed}`,
            color: t.text3,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Pick manually
        </button>
      </div>
    </div>
  );
}

function BriefBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

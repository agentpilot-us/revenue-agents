'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  seniorityLevel: number | null;
  personaName: string | null;
  engagementStatus: string;
  buyingRole: string | null;
};

type DepartmentGroup = {
  department: {
    id: string | null;
    name: string;
    type: string | null;
    targetRoles: unknown;
  };
  contacts: ContactRow[];
};

type Props = {
  companyId: string;
  selectedContactIds: string[];
  selectedDivisionId: string | null;
  onSelectionChange: (contactIds: string[], divisionId: string | null) => void;
  disabled?: boolean;
};

// ── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_FILTERS = [
  { id: 'all', label: 'All levels', minLevel: 0 },
  { id: 'c-suite', label: 'C-Suite', minLevel: 6 },
  { id: 'vp', label: 'VP+', minLevel: 4 },
  { id: 'director', label: 'Director+', minLevel: 3 },
  { id: 'manager', label: 'Manager+', minLevel: 2 },
] as const;

type SeniorityFilterId = (typeof SENIORITY_FILTERS)[number]['id'];

const ENGAGEMENT_ICON: Record<string, string> = {
  Engaged: '●',
  Contacted: '◐',
  Enriched: '○',
  'Not enriched': '·',
};

const ENGAGEMENT_COLOR: Record<string, string> = {
  Engaged: '#22c55e',
  Contacted: '#3b82f6',
  Enriched: '#94a3b8',
  'Not enriched': '#475569',
};

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  surfaceHover: 'rgba(15,23,42,0.85)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  borderActive: 'rgba(59,130,246,0.4)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.25)',
  purple: '#a855f7',
  purpleBg: 'rgba(168,85,247,0.08)',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ContactSelector({
  companyId,
  selectedContactIds,
  selectedDivisionId,
  onSelectionChange,
  disabled = false,
}: Props) {
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeptId, setActiveDeptId] = useState<string | null | 'all'>('all');
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/companies/${companyId}/contacts/by-department`,
        );
        if (!res.ok) throw new Error('Failed to load contacts');
        const data = await res.json();
        setGroups(data.groups ?? []);
        if (selectedDivisionId) {
          setActiveDeptId(selectedDivisionId);
        }
      } catch (err) {
        console.error('ContactSelector: fetch error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, selectedDivisionId]);

  const filteredContacts = useMemo(() => {
    let contacts: ContactRow[] = [];

    if (activeDeptId === 'all') {
      contacts = groups.flatMap((g) => g.contacts);
    } else {
      const group = groups.find((g) => g.department.id === activeDeptId);
      contacts = group?.contacts ?? [];
    }

    const seniorityDef = SENIORITY_FILTERS.find((s) => s.id === seniorityFilter);
    if (seniorityDef && seniorityDef.minLevel > 0) {
      contacts = contacts.filter(
        (c) => (c.seniorityLevel ?? 0) >= seniorityDef.minLevel,
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q) ||
          (c.title ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q),
      );
    }

    return contacts;
  }, [groups, activeDeptId, seniorityFilter, searchQuery]);

  const toggleContact = useCallback(
    (contactId: string) => {
      if (disabled) return;
      const next = selectedContactIds.includes(contactId)
        ? selectedContactIds.filter((id) => id !== contactId)
        : [...selectedContactIds, contactId];
      const divId =
        activeDeptId && activeDeptId !== 'all' ? activeDeptId : selectedDivisionId;
      onSelectionChange(next, divId);
    },
    [selectedContactIds, activeDeptId, selectedDivisionId, onSelectionChange, disabled],
  );

  const selectAll = useCallback(() => {
    if (disabled) return;
    const allIds = filteredContacts.map((c) => c.id);
    const divId =
      activeDeptId && activeDeptId !== 'all' ? activeDeptId : selectedDivisionId;
    onSelectionChange(allIds, divId);
  }, [filteredContacts, activeDeptId, selectedDivisionId, onSelectionChange, disabled]);

  const clearAll = useCallback(() => {
    if (disabled) return;
    onSelectionChange([], selectedDivisionId);
  }, [selectedDivisionId, onSelectionChange, disabled]);

  const departmentsWithCounts = useMemo(() => {
    const totalContacts = groups.reduce((acc, g) => acc + g.contacts.length, 0);
    return [
      { id: 'all' as const, name: 'All departments', count: totalContacts },
      ...groups.map((g) => ({
        id: g.department.id,
        name: g.department.name,
        count: g.contacts.length,
      })),
    ];
  }, [groups]);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: t.surface,
          border: `1px solid ${t.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ color: t.text3, fontSize: 13 }}>Loading contacts...</p>
      </div>
    );
  }

  if (groups.length === 0 || groups.every((g) => g.contacts.length === 0)) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: t.surface,
          border: `1px solid ${t.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ color: t.text2, fontSize: 14, fontWeight: 600, margin: 0 }}>
          No contacts found
        </p>
        <p style={{ color: t.text3, fontSize: 12, margin: '4px 0 0' }}>
          Add contacts to this account to target your outreach.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        background: t.surface,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: 0 }}>
            Target Contacts
          </p>
          <p style={{ fontSize: 11, color: t.text3, margin: '2px 0 0' }}>
            Select by division and seniority to specialize content
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: t.blue, fontWeight: 600 }}>
            {selectedContactIds.length} selected
          </span>
          {selectedContactIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'transparent',
                border: `1px solid ${t.borderMed}`,
                color: t.text3,
                fontSize: 11,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Division tabs */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {departmentsWithCounts.map((dept) => {
          const isActive = activeDeptId === dept.id;
          return (
            <button
              key={dept.id ?? 'all'}
              type="button"
              onClick={() => {
                setActiveDeptId(dept.id);
                if (dept.id !== 'all' && dept.id) {
                  onSelectionChange(selectedContactIds, dept.id);
                }
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: isActive ? t.blueBg : 'transparent',
                border: `1px solid ${isActive ? t.blueBorder : 'transparent'}`,
                color: isActive ? t.blue : t.text3,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {dept.name}
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  opacity: 0.7,
                }}
              >
                {dept.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Seniority filters + search */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {SENIORITY_FILTERS.map((s) => {
            const isActive = seniorityFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeniorityFilter(s.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: isActive ? t.purpleBg : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(168,85,247,0.25)' : 'transparent'}`,
                  color: isActive ? t.purple : t.text3,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Search name, title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${t.borderMed}`,
            color: t.text1,
            fontSize: 12,
            width: 160,
            outline: 'none',
          }}
        />
      </div>

      {/* Bulk actions */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled || filteredContacts.length === 0}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            background: 'transparent',
            border: `1px solid ${t.borderMed}`,
            color: t.text3,
            fontSize: 11,
            cursor:
              disabled || filteredContacts.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Select all {filteredContacts.length}
        </button>
        <span style={{ fontSize: 11, color: t.text4 }}>
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* Contact list */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ color: t.text4, fontSize: 12 }}>
              No contacts match these filters
            </p>
          </div>
        ) : (
          filteredContacts.map((c) => {
            const isSelected = selectedContactIds.includes(c.id);
            const name =
              [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleContact(c.id)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: isSelected
                    ? 'rgba(59,130,246,0.06)'
                    : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${t.border}`,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${isSelected ? t.blue : t.borderMed}`,
                    background: isSelected ? t.blue : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {isSelected && (
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Contact info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: t.text1,
                      }}
                    >
                      {name}
                    </span>
                    {c.seniority && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: t.purpleBg,
                          color: t.purple,
                          fontWeight: 600,
                        }}
                      >
                        {c.seniority}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          ENGAGEMENT_COLOR[c.engagementStatus] ?? t.text4,
                      }}
                    >
                      {ENGAGEMENT_ICON[c.engagementStatus] ?? '·'}{' '}
                      {c.engagementStatus}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: t.text3,
                      margin: '1px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.title ?? ''}
                    {c.email ? ` · ${c.email}` : ''}
                  </p>
                </div>

                {/* Channel availability indicators */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {c.email && (
                    <span
                      title="Email available"
                      style={{
                        fontSize: 10,
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: t.greenBg,
                        color: t.green,
                        border: `1px solid ${t.greenBorder}`,
                      }}
                    >
                      email
                    </span>
                  )}
                  {c.linkedinUrl && (
                    <span
                      title="LinkedIn available"
                      style={{
                        fontSize: 10,
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: t.blueBg,
                        color: t.blue,
                        border: `1px solid ${t.blueBorder}`,
                      }}
                    >
                      LI
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

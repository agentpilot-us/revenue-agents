'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AttentionContact = {
  contactId: string;
  contactName: string;
  title: string | null;
  email: string | null;
  companyId: string;
  companyName: string;
  flags: string[];
  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;
  pendingSteps: number;
};

const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string; priority: number }> = {
  hot_lead: { label: 'Hot lead', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', priority: 0 },
  awaiting_reply: { label: 'Awaiting reply', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', priority: 1 },
  follow_up_due: { label: 'Follow up', color: '#fb923c', bg: 'rgba(249,115,22,0.1)', priority: 2 },
  over_emailed: { label: 'Over-emailed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', priority: 3 },
  gone_cold: { label: 'Gone cold', color: '#64748b', bg: 'rgba(100,116,139,0.1)', priority: 4 },
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
};

export default function NeedsAttentionCard() {
  const router = useRouter();
  const [contacts, setContacts] = useState<AttentionContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/needs-attention')
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((d) => setContacts(d.contacts || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (contacts.length === 0) return null;

  const sorted = [...contacts].sort((a, b) => {
    const aPri = Math.min(...a.flags.map((f) => FLAG_CONFIG[f]?.priority ?? 99));
    const bPri = Math.min(...b.flags.map((f) => FLAG_CONFIG[f]?.priority ?? 99));
    return aPri - bPri;
  });

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: t.surface,
        border: `1px solid ${t.border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.text1, margin: 0 }}>
            Needs Attention
          </h3>
          <p style={{ fontSize: 11, color: t.text4, margin: '2px 0 0' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} need follow-up
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.slice(0, 8).map((c) => {
          const primaryFlag = c.flags
            .map((f) => FLAG_CONFIG[f])
            .filter(Boolean)
            .sort((a, b) => a.priority - b.priority)[0];

          return (
            <button
              key={c.contactId}
              type="button"
              onClick={() =>
                router.push(`/dashboard/companies/${c.companyId}?tab=contacts`)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.15)',
                border: `1px solid ${t.border}`,
                cursor: 'pointer',
                textAlign: 'left',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text1 }}>
                    {c.contactName}
                  </span>
                  <span style={{ fontSize: 10, color: t.text4 }}>
                    {c.companyName}
                  </span>
                </div>
                {c.title && (
                  <p
                    style={{
                      fontSize: 10,
                      color: t.text4,
                      margin: '1px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.title}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {c.daysSinceLastTouch != null && (
                  <span
                    style={{
                      fontSize: 10,
                      color:
                        c.daysSinceLastTouch >= 14
                          ? '#ef4444'
                          : c.daysSinceLastTouch >= 7
                            ? '#f59e0b'
                            : t.text4,
                    }}
                  >
                    {c.daysSinceLastTouch}d ago
                  </span>
                )}
                {c.flags.slice(0, 2).map((flag) => {
                  const cfg = FLAG_CONFIG[flag];
                  if (!cfg) return null;
                  return (
                    <span
                      key={flag}
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 5px',
                        borderRadius: 3,
                        color: cfg.color,
                        background: cfg.bg,
                      }}
                    >
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {contacts.length > 8 && (
        <p style={{ fontSize: 10, color: t.text4, margin: '8px 0 0', textAlign: 'center' }}>
          + {contacts.length - 8} more
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type PulseData = {
  contactName: string;
  title: string | null;
  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;
  totalEmails: number;
  emailsThisWeek: number;
  lastEmailOpenedAt: string | null;
  lastEmailClickedAt: string | null;
  hasReplied: boolean;
  lastReplyDate: string | null;
  pendingFollowUps: number;
  eventsInvited: Array<{ eventName: string; rsvpStatus: string | null }>;
  flags: string[];
  recentActivity: Array<{
    type: string;
    summary: string;
    date: string;
    opened: boolean;
    clicked: boolean;
  }>;
};

const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  over_emailed: { label: 'Over-emailed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  awaiting_reply: { label: 'Awaiting reply', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  follow_up_due: { label: 'Follow up due', color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  gone_cold: { label: 'Gone cold', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  hot_lead: { label: 'Hot lead', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

const t = {
  surface: 'rgba(15,23,42,0.98)',
  border: 'rgba(255,255,255,0.08)',
  borderMed: 'rgba(255,255,255,0.12)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  green: '#22c55e',
};

type Props = {
  contactId: string;
  children: React.ReactNode;
};

export default function ContactPulsePopover({ contactId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPulse = useCallback(async () => {
    if (pulse) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/pulse`);
      if (res.ok) {
        const data = await res.json();
        setPulse(data);
      }
    } finally {
      setLoading(false);
    }
  }, [contactId, pulse]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setOpen(true);
      fetchPulse();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'inline' }}
    >
      <span
        style={{
          cursor: 'pointer',
          borderBottom: `1px dotted ${t.text4}`,
        }}
      >
        {children}
      </span>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 8,
            width: 320,
            padding: 14,
            borderRadius: 12,
            background: t.surface,
            border: `1px solid ${t.borderMed}`,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          {loading && !pulse && (
            <p style={{ fontSize: 12, color: t.text3 }}>Loading pulse...</p>
          )}

          {pulse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Flags */}
              {pulse.flags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {pulse.flags.map((flag) => {
                    const cfg = FLAG_CONFIG[flag];
                    if (!cfg) return null;
                    return (
                      <span
                        key={flag}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          color: cfg.color,
                          background: cfg.bg,
                        }}
                      >
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Stats grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 6,
                }}
              >
                <Stat label="Last touch" value={
                  pulse.daysSinceLastTouch != null
                    ? `${pulse.daysSinceLastTouch}d ago`
                    : 'Never'
                } />
                <Stat label="Emails sent" value={String(pulse.totalEmails)} />
                <Stat label="This week" value={String(pulse.emailsThisWeek)} />
                <Stat
                  label="Opened"
                  value={pulse.lastEmailOpenedAt ? 'Yes' : 'No'}
                  highlight={!!pulse.lastEmailOpenedAt}
                />
                <Stat
                  label="Clicked"
                  value={pulse.lastEmailClickedAt ? 'Yes' : 'No'}
                  highlight={!!pulse.lastEmailClickedAt}
                />
                <Stat
                  label="Replied"
                  value={pulse.hasReplied ? 'Yes' : 'No'}
                  highlight={pulse.hasReplied}
                />
              </div>

              {/* Pending follow-ups */}
              {pulse.pendingFollowUps > 0 && (
                <p style={{ fontSize: 11, color: '#fb923c', margin: 0 }}>
                  {pulse.pendingFollowUps} pending follow-up{pulse.pendingFollowUps !== 1 ? 's' : ''}
                </p>
              )}

              {/* Events */}
              {pulse.eventsInvited.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: t.text4, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                    Events
                  </p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {pulse.eventsInvited.slice(0, 4).map((ev) => (
                      <span
                        key={ev.eventName}
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(99,102,241,0.08)',
                          color: '#818cf8',
                        }}
                      >
                        {ev.eventName}
                        {ev.rsvpStatus ? ` (${ev.rsvpStatus})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {pulse.recentActivity.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: t.text4, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                    Recent
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {pulse.recentActivity.slice(0, 3).map((act, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: t.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {act.summary}
                        </span>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {act.opened && (
                            <span style={{ fontSize: 9, color: t.blue }}>opened</span>
                          )}
                          {act.clicked && (
                            <span style={{ fontSize: 9, color: t.green }}>clicked</span>
                          )}
                          <span style={{ fontSize: 9, color: t.text4 }}>
                            {formatRelativeDate(act.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '4px 6px',
        borderRadius: 6,
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ fontSize: 9, color: '#475569' }}>{label}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: highlight ? '#22c55e' : '#e2e8f0',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

'use client';

import type { MomentumWeekComparison } from '@/lib/dashboard/momentum';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text3: '#64748b',
  text4: '#475569',
  green: '#22c55e',
  red: '#ef4444',
};

type Props = {
  momentum: MomentumWeekComparison;
};

function StatCell({
  label,
  thisWeek,
  lastWeek,
}: {
  label: string;
  thisWeek: number;
  lastWeek: number;
}) {
  const diff = thisWeek - lastWeek;
  const diffColor = diff > 0 ? t.green : diff < 0 ? t.red : t.text4;
  const diffSign = diff > 0 ? '+' : '';

  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: t.text1,
          lineHeight: 1,
        }}
      >
        {thisWeek}
      </div>
      <div
        style={{
          fontSize: 10,
          color: t.text3,
          marginTop: 2,
        }}
      >
        {label}
      </div>
      {diff !== 0 && (
        <div style={{ fontSize: 10, color: diffColor, marginTop: 2 }}>
          {diffSign}
          {diff} vs last week
        </div>
      )}
    </div>
  );
}

export default function WeeklyStatsBar({ momentum }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        background: t.surface,
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        padding: '14px 8px',
        gap: 4,
      }}
    >
      <StatCell
        label="Emails Sent"
        thisWeek={momentum.thisWeek.emailsSent}
        lastWeek={momentum.lastWeek.emailsSent}
      />
      <StatCell
        label="Replies"
        thisWeek={momentum.thisWeek.replies}
        lastWeek={momentum.lastWeek.replies}
      />
      <StatCell
        label="Contacts Found"
        thisWeek={momentum.thisWeek.contactsFound}
        lastWeek={momentum.lastWeek.contactsFound}
      />
      <StatCell
        label="Page Views"
        thisWeek={momentum.thisWeek.pageViews}
        lastWeek={momentum.lastWeek.pageViews}
      />
      <StatCell
        label="Meetings"
        thisWeek={momentum.thisWeek.meetingsBooked}
        lastWeek={momentum.lastWeek.meetingsBooked}
      />
      <StatCell
        label="Signals"
        thisWeek={momentum.thisWeek.signalsThisWeek}
        lastWeek={momentum.lastWeek.signalsThisWeek}
      />
    </div>
  );
}

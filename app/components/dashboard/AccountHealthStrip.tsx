'use client';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

const HEALTH_COLORS: Record<string, string> = {
  green: t.green,
  yellow: t.amber,
  red: t.red,
};

export type AccountHealthItem = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  contactCount: number;
  departmentCount: number;
  openActions: number;
  health: string;
};

type Props = {
  accounts: AccountHealthItem[];
  onAccountClick: (id: string) => void;
};

export default function AccountHealthStrip({ accounts, onAccountClick }: Props) {
  if (accounts.length === 0) return null;

  return (
    <div>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: t.text3,
          marginBottom: 10,
        }}
      >
        Accounts
      </h3>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {accounts.map((acct) => (
          <button
            key={acct.id}
            type="button"
            onClick={() => onAccountClick(acct.id)}
            style={{
              minWidth: 160,
              padding: '12px 14px',
              borderRadius: 10,
              background: t.surface,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
              textAlign: 'left',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: HEALTH_COLORS[acct.health] || t.text4,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.text1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {acct.name}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 10,
                color: t.text4,
              }}
            >
              <span>{acct.contactCount} contacts</span>
              <span>{acct.openActions} actions</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

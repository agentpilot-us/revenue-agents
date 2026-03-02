import { dash } from '@/app/dashboard/dashboard-classes';

type StatusBarProps = {
  accountsTracked: number;
  buyingGroupsMapped: number;
  contactsFound: number;
  pagesLive: number;
  engagedThisWeek: number;
  signalsThisWeek?: number;
  contactsLabel?: string;
};

export function StatusBar({
  accountsTracked,
  buyingGroupsMapped,
  contactsFound,
  pagesLive,
  engagedThisWeek,
  signalsThisWeek,
  contactsLabel,
}: StatusBarProps) {
  const items: Array<{ label: string; value: string | number; accent?: boolean }> = [
    { label: 'Accounts tracked', value: accountsTracked },
    { label: 'Buying groups mapped', value: buyingGroupsMapped },
    { label: 'Contacts found', value: contactsLabel ?? contactsFound },
    { label: 'Pages live', value: pagesLive },
    { label: 'Engaged this week', value: engagedThisWeek, accent: true },
  ];

  if (signalsThisWeek != null) {
    items.push({ label: 'Signals this week', value: signalsThisWeek });
  }

  return (
    <div className={dash.statusBar}>
      {items.map((item, i) => (
        <div key={item.label} className="contents">
          {i > 0 && (
            <span className={dash.statusBarSep} aria-hidden>
              |
            </span>
          )}
          <div className={dash.statusBarItem}>
            <span className={dash.statusBarLabel}>{item.label}</span>
            <span className={item.accent ? dash.statusBarValueAccent : dash.statusBarValue}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

type StatusBarProps = {
  accountsTracked: number;
  buyingGroupsMapped: number;
  contactsFound: number;
  pagesLive: number;
  engagedThisWeek: number;
};

export function StatusBar({
  accountsTracked,
  buyingGroupsMapped,
  contactsFound,
  pagesLive,
  engagedThisWeek,
}: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-slate-700 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Accounts tracked
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-100">
          {accountsTracked}
        </span>
      </div>
      <span className="text-slate-600" aria-hidden>
        |
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Buying groups mapped
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-100">
          {buyingGroupsMapped}
        </span>
      </div>
      <span className="text-slate-600" aria-hidden>
        |
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Contacts found
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-100">
          {contactsFound}
        </span>
      </div>
      <span className="text-slate-600" aria-hidden>
        |
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Pages live
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-100">
          {pagesLive}
        </span>
      </div>
      <span className="text-slate-600" aria-hidden>
        |
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Engaged this week
        </span>
        <span className="text-sm font-bold tabular-nums text-emerald-400">
          {engagedThisWeek}
        </span>
      </div>
    </div>
  );
}

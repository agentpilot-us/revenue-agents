import { AccountRadarCard } from './AccountRadarCard';

type Account = {
  id: string;
  name: string;
  pagesLive: number;
  lastActivity: Date | string;
  coveragePct: number;
  borderColor: 'green' | 'amber' | 'gray' | 'red';
  departments: Array<{
    id: string;
    name: string;
    contactCount: number;
    hasCampaign: boolean;
  }>;
};

type AccountRadarGridProps = { accounts: Account[] };

export function AccountRadarGrid({ accounts }: AccountRadarGridProps) {
  return (
    <section className="rounded-lg">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Account radar
      </h2>
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-6 text-center">
          <p className="text-slate-400 text-sm">No accounts yet.</p>
          <a
            href="/dashboard/companies/new"
            className="mt-2 inline-block text-sm text-amber-400 hover:text-amber-300"
          >
            Add your first target company →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((a) => (
            <AccountRadarCard
              key={a.id}
              id={a.id}
              name={a.name}
              pagesLive={a.pagesLive}
              lastActivity={a.lastActivity}
              coveragePct={a.coveragePct}
              borderColor={a.borderColor}
              departments={a.departments}
            />
          ))}
        </div>
      )}
    </section>
  );
}

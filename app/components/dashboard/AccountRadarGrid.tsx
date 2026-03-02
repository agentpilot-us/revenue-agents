import Link from 'next/link';
import { AccountRadarCard } from './AccountRadarCard';
import { DivisionRadarCard } from './DivisionRadarCard';
import { dash } from '@/app/dashboard/dashboard-classes';
import type { DivisionCard } from '@/lib/dashboard/division-radar';

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

type DivisionRadar = {
  divisions: DivisionCard[];
  companyName: string;
  objectiveSummary: string;
  expansionTargetCount: number;
};

type AccountRadarGridProps = {
  accounts: Account[];
  divisionRadar?: DivisionRadar | null;
};

export function AccountRadarGrid({ accounts, divisionRadar }: AccountRadarGridProps) {
  if (divisionRadar && divisionRadar.divisions.length > 0) {
    return (
      <section>
        <div className={dash.sectionHeader}>
          <h2 className={dash.sectionTitle}>
            Account Radar — {divisionRadar.companyName}
          </h2>
          <span className={dash.sectionSubtitle}>
            {divisionRadar.divisions.length} divisions
            {divisionRadar.expansionTargetCount > 0 &&
              ` · ${divisionRadar.expansionTargetCount} expansion targets`}
          </span>
        </div>

        <div className={dash.divisionCardGrid}>
          {divisionRadar.divisions.map((d) => (
            <DivisionRadarCard key={d.targetId} division={d} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className={dash.sectionHeader}>
        <h2 className={dash.sectionTitle}>Account Radar</h2>
      </div>

      {accounts.length === 0 ? (
        <div className={`${dash.card} text-center py-8`}>
          <p className={dash.emptyStateText}>No accounts yet.</p>
          <Link
            href="/dashboard/companies/new"
            className={`${dash.btnPrimary} mt-3`}
          >
            Add your first target company →
          </Link>
        </div>
      ) : (
        <div className={dash.divisionCardGrid}>
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

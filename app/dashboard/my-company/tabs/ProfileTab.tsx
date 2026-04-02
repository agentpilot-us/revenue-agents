'use client';

import { MyCompanyEditor } from '@/app/dashboard/my-company/MyCompanyEditor';
import type { ProfileData, HealthData } from '@/app/dashboard/my-company/MyCompanyClient';
import {
  YOUR_INDUSTRY_OPTIONS,
  PRIMARY_INDUSTRY_SELL_TO_OPTIONS,
  labelForIndustryOption,
} from '@/lib/constants/industries';

type Props = {
  profile: ProfileData;
  health: HealthData;
};

export function ProfileTab({ profile, health }: Props) {
  const yourIndustryLabel = labelForIndustryOption(
    YOUR_INDUSTRY_OPTIONS,
    profile.companyIndustry
  );
  const primaryIndustryLabel = labelForIndustryOption(
    PRIMARY_INDUSTRY_SELL_TO_OPTIONS,
    profile.primaryIndustrySellTo
  );

  return (
    <div className="space-y-6 max-w-3xl">
        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Company profile
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Company name</dt>
              <dd className="text-foreground font-medium">
                {profile.companyName ?? 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your industry</dt>
              <dd className="text-foreground">
                {yourIndustryLabel ?? 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd className="text-foreground">
                {profile.companyWebsite ?? 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Primary industry you sell to</dt>
              <dd className="text-foreground">
                {primaryIndustryLabel ?? 'Not set'}
              </dd>
            </div>
          </dl>
          {profile.keyInitiatives.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Key initiatives
              </h3>
              <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
                {profile.keyInitiatives.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          <MyCompanyEditor initial={profile} />
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Account health
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries({
              Accounts: health.companyCount,
              Contacts: health.contactCount,
              Roadmaps: health.roadmapCount,
              Products: health.productCount,
              Signals: health.signalCount,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
    </div>
  );
}

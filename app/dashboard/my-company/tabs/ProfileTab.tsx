'use client';

import { MyCompanyEditor } from '@/app/dashboard/my-company/MyCompanyEditor';
import { MyCompanyDocumentsEditor } from '@/app/dashboard/my-company/MyCompanyDocumentsEditor';
import type { ProfileData, DocRow, HealthData } from '@/app/dashboard/my-company/MyCompanyClient';

type Props = {
  profile: ProfileData;
  documents: DocRow[];
  health: HealthData;
};

export function ProfileTab({ profile, documents, health }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
      <div className="space-y-6">
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
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="text-foreground">
                {profile.companyIndustry ?? 'Not set'}
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
                {profile.primaryIndustrySellTo ?? 'Not set'}
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

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Internal documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No internal documents added yet. Register decks, briefs,
              and playbooks that should inform content and triggers.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {documents.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{d.title}</p>
                    {d.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {d.description}
                      </p>
                    )}
                  </div>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Open
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <MyCompanyDocumentsEditor />
        </section>
      </div>
    </div>
  );
}

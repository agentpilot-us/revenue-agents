'use client';

import { MyCompanySignalsRefresh } from '@/app/dashboard/my-company/MyCompanySignalsRefresh';
import { ProductActivateButton } from '@/app/dashboard/my-company/ProductActivateButton';
import { EventActivateButton } from '@/app/dashboard/my-company/EventActivateButton';
import { SignalConfigPanel } from '@/app/components/roadmap/SignalConfigPanel';
import type { Signal, CompanyProduct, EventSummary } from '@/app/dashboard/my-company/MyCompanyClient';

type Props = {
  signals: Signal[];
  companyProducts: CompanyProduct[];
  eventSummaries: EventSummary[];
};

export function IntelligenceTab({ signals, companyProducts, eventSummaries }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Company signals
          </h2>
          {signals.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No signals detected yet. Use the button below to pull in Exa-based
              activity for your company.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {signals.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {s.summary}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(s.publishedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <MyCompanySignalsRefresh />
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Default Monitoring Rules
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            These EXA searches apply across all target accounts unless supplemented with account-specific rules.
          </p>
          <SignalConfigPanel />
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Products &amp; Events
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Products linked to accounts
              </h3>
              {companyProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No products linked to accounts yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {companyProducts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate">
                          {p.productName} &middot; {p.companyName}
                        </p>
                        <p className="text-[11px] text-muted-foreground uppercase">
                          {p.status}
                        </p>
                      </div>
                      <ProductActivateButton productId={p.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Recent events
              </h3>
              {eventSummaries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No recent events recorded for your contacts.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {eventSummaries.map((e, i) => (
                    <li key={`${e.name}-${i}`} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate">{e.name}</p>
                        <p className="text-[11px] text-muted-foreground">{e.date}</p>
                      </div>
                      <EventActivateButton eventName={e.name} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

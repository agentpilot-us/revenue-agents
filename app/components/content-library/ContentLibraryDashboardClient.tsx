'use client';

import Link from 'next/link';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';
import { ContentLibraryActions } from '@/app/components/content-library/ContentLibraryActions';
import { ContentLibraryHealthPanel } from '@/app/components/content-library/ContentLibraryHealthPanel';
import { ContentLibraryTab } from '@/app/dashboard/my-company/tabs/ContentLibraryTab';
import { ProductRowActions } from '@/app/components/content-library/ProductRowActions';
import { IndustryPlaybookRowActions } from '@/app/components/content-library/IndustryPlaybookRowActions';

export type ContentLibraryDashboardProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};

export type ContentLibraryDashboardPlaybook = {
  id: string;
  name: string;
  slug: string;
  overview: string | null;
};

type Props = {
  showFirecrawlSetup: boolean;
  company: { companyName: string | null; companyWebsite: string | null };
  products: ContentLibraryDashboardProduct[];
  playbooks: ContentLibraryDashboardPlaybook[];
};

export function ContentLibraryDashboardClient({
  showFirecrawlSetup,
  company,
  products,
  playbooks,
}: Props) {
  const website = company.companyWebsite?.trim();
  const websiteHref =
    website && (website.startsWith('http') ? website : `https://${website}`);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Your company data</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            The AI uses this content to personalize outreach and value propositions. Manage library
            items below; use imports and health checks to keep data fresh.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <Link href="/dashboard?skip_content_prompt=1" className="text-primary hover:underline">
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/my-company?tab=Content%20Library"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              My Company hub
            </Link>
          </div>
        </div>
      </header>

      {showFirecrawlSetup && <FirecrawlSetupCard />}

      <ContentLibraryActions />

      <ContentLibraryHealthPanel />

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">Company info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Company</dt>
            <dd className="text-foreground font-medium">{company.companyName?.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Website</dt>
            <dd className="text-foreground">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {website}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground mt-3">
          Edit profile details under{' '}
          <Link href="/dashboard/my-company?tab=Profile" className="text-primary hover:underline">
            My Company → Profile
          </Link>
          .
        </p>
      </section>

      <ContentLibraryTab />

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Products</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/dashboard/content-library/products/new"
              className="text-primary font-medium hover:underline"
            >
              + Create new
            </Link>
            <Link
              href="/dashboard/my-company?tab=Products"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Manage in My Company
            </Link>
          </div>
        </div>
        {products.length > 0 ? (
          <ul className="space-y-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-2 text-sm p-2 rounded-md border border-border/80 bg-background/50 hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{product.name}</span>
                  {product.category && (
                    <span className="ml-2 text-xs text-muted-foreground">({product.category})</span>
                  )}
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
                <ProductRowActions productId={product.id} productName={product.name} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No products yet.{' '}
            <Link href="/dashboard/content-library/products/new" className="text-primary hover:underline">
              Create one
            </Link>
            .
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Industry playbooks</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/dashboard/content-library/industry-playbooks/new"
              className="text-primary font-medium hover:underline"
            >
              + Create new
            </Link>
            <Link
              href="/dashboard/my-company?tab=Playbooks"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Manage in My Company
            </Link>
          </div>
        </div>
        {playbooks.length > 0 ? (
          <ul className="space-y-2">
            {playbooks.map((playbook) => (
              <li
                key={playbook.id}
                className="flex items-center justify-between gap-2 text-sm p-2 rounded-md border border-border/80 bg-background/50 hover:bg-accent/30"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{playbook.name}</span>
                  {playbook.overview && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {playbook.overview}
                    </p>
                  )}
                </div>
                <IndustryPlaybookRowActions playbookId={playbook.id} playbookName={playbook.name} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No industry playbooks yet.{' '}
            <Link
              href="/dashboard/content-library/industry-playbooks/new"
              className="text-primary hover:underline"
            >
              Create one
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}

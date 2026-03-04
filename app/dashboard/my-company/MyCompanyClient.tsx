'use client';

import { MyCompanyTabs } from '@/app/dashboard/my-company/MyCompanyTabs';
import { ProfileTab } from '@/app/dashboard/my-company/tabs/ProfileTab';
import { ProductsTab } from '@/app/dashboard/my-company/tabs/ProductsTab';
import { IntelligenceTab } from '@/app/dashboard/my-company/tabs/IntelligenceTab';

export type ProfileData = {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  primaryIndustrySellTo: string | null;
  keyInitiatives: string[];
};

export type DocRow = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
};

export type HealthData = {
  companyCount: number;
  contactCount: number;
  roadmapCount: number;
  productCount: number;
  signalCount: number;
};

export type CompanyProduct = {
  id: string;
  status: string;
  companyName: string;
  productName: string;
};

export type EventSummary = {
  name: string;
  date: string;
  source: string;
};

export type Signal = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  relevanceScore: number | null;
};

export type Relationship = {
  productId: string;
  productName: string;
  relationship: 'upgrade_path' | 'complementary' | 'prerequisite' | 'replacement';
};

export type CatalogProductItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  relationships: Relationship[];
};

type Props = {
  profile: ProfileData;
  documents: DocRow[];
  health: HealthData;
  companyProducts: CompanyProduct[];
  eventSummaries: EventSummary[];
  signals: Signal[];
  catalogProducts: CatalogProductItem[];
  hasContentLibrary: boolean;
};

export function MyCompanyClient({
  profile,
  documents,
  health,
  companyProducts,
  eventSummaries,
  signals,
  catalogProducts,
  hasContentLibrary,
}: Props) {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          My Company
        </h1>
        <p className="text-sm text-muted-foreground">
          Your company profile, product catalog, and intelligence hub.
        </p>
      </header>

      <MyCompanyTabs>
        {(activeTab) => (
          <>
            {activeTab === 'Profile' && (
              <ProfileTab
                profile={profile}
                documents={documents}
                health={health}
              />
            )}
            {activeTab === 'Products' && (
              <ProductsTab
                catalogProducts={catalogProducts}
                hasContentLibrary={hasContentLibrary}
              />
            )}
            {activeTab === 'Intelligence' && (
              <IntelligenceTab
                signals={signals}
                companyProducts={companyProducts}
                eventSummaries={eventSummaries}
              />
            )}
          </>
        )}
      </MyCompanyTabs>
    </div>
  );
}

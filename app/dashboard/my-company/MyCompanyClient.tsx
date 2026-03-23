'use client';

import { MyCompanyTabs, type TabId } from '@/app/dashboard/my-company/MyCompanyTabs';
import { ProfileTab } from '@/app/dashboard/my-company/tabs/ProfileTab';
import { ProductsTab } from '@/app/dashboard/my-company/tabs/ProductsTab';
import { ContentLibraryTab } from '@/app/dashboard/my-company/tabs/ContentLibraryTab';
import { PlaybooksTab } from '@/app/dashboard/my-company/tabs/PlaybooksTab';
import { MessagingTab } from '@/app/dashboard/my-company/tabs/MessagingTab';
import { IntelligenceTab } from '@/app/dashboard/my-company/tabs/IntelligenceTab';
import { GovernanceTab } from '@/app/dashboard/my-company/tabs/GovernanceTab';
import { SetupProgressCard } from '@/app/dashboard/my-company/SetupProgressCard';

export type ProfileData = {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  primaryIndustrySellTo: string | null;
  keyInitiatives: string[];
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
  initialTab?: TabId;
  profile: ProfileData;
  health: HealthData;
  companyProducts: CompanyProduct[];
  eventSummaries: EventSummary[];
  signals: Signal[];
  catalogProducts: CatalogProductItem[];
  hasContentLibrary: boolean;
};

export function MyCompanyClient({
  initialTab,
  profile,
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

      <SetupProgressCard />

      <MyCompanyTabs defaultTab={initialTab ?? 'Profile'}>
        {(activeTab) => (
          <>
            {activeTab === 'Profile' && (
              <ProfileTab
                profile={profile}
                health={health}
              />
            )}
            {activeTab === 'Products' && (
              <ProductsTab
                catalogProducts={catalogProducts}
                hasContentLibrary={hasContentLibrary}
              />
            )}
            {activeTab === 'Content Library' && (
              <ContentLibraryTab />
            )}
            {activeTab === 'Playbooks' && (
              <PlaybooksTab catalogProducts={catalogProducts} />
            )}
            {activeTab === 'Messaging' && (
              <MessagingTab />
            )}
            {activeTab === 'Governance' && (
              <GovernanceTab />
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

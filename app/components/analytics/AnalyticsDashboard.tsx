'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { dash } from '@/app/dashboard/dashboard-classes';
import { NewContactsMetric } from './NewContactsMetric';
import { LandingPagePerformance } from './LandingPagePerformance';
import { EmailEngagement } from './EmailEngagement';
import { BuyingGroupCoverage } from './BuyingGroupCoverage';
import { WarmContacts } from './WarmContacts';
import { PlayActivitySummary } from './PlayActivitySummary';
import { ContactEngagementTable } from './ContactEngagementTable';

interface Company {
  id: string;
  name: string;
}

interface AnalyticsData {
  newContacts: {
    total: number;
    byWeek: Array<{
      week: string;
      count: number;
      contacts: Array<{
        id: string;
        name: string;
        accountId: string;
        accountName: string;
        buyingGroupId: string | null;
        buyingGroupName: string | null;
      }>;
    }>;
    byAccount: Array<{
      accountId: string;
      accountName: string;
      count: number;
    }>;
    byBuyingGroup: Array<{
      buyingGroupId: string | null;
      buyingGroupName: string;
      count: number;
    }>;
  };
  landingPagePerformance: Array<{
    campaignId: string;
    campaignTitle: string;
    campaignSlug: string;
    accountId: string;
    accountName: string;
    visits: number;
    uniqueVisitors: number;
    chatMessages: number;
    ctaClicks: number;
  }>;
  emailEngagement: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  buyingGroupCoverage: Array<{
    type: string;
    typeLabel: string;
    accountsWithContacts: number;
    totalAccounts: number;
    coverage: number;
  }>;
  warmContacts: {
    total: number;
    contacts: Array<{
      id: string;
      name: string;
      email: string;
      accountId: string;
      accountName: string;
    }>;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface ActivitySummaryData {
  playSummary: {
    playsStarted: number;
    playsInProgress: number;
    playsCompleted: number;
    totalSteps: number;
    completedSteps: number;
    completionRate: number;
    byChannel: Array<{ channel: string; count: number }>;
  };
  contactEngagement: Array<{
    contactId: string;
    contactName: string;
    title: string | null;
    companyId: string;
    companyName: string;
    lastTouchDate: string | null;
    daysSinceLastTouch: number | null;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsReplied: number;
    isResponsive: boolean;
    isDormant: boolean;
    flags: string[];
  }>;
}

export function AnalyticsDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activityData, setActivityData] = useState<ActivitySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch companies list
  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((result) => {
        setCompanies(result.companies || []);
      })
      .catch((err) => {
        console.error('Failed to fetch companies:', err);
      });
  }, []);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (selectedCompanyId && selectedCompanyId !== 'all') {
        params.append('companyId', selectedCompanyId);
      }

      const [engagementRes, activityRes] = await Promise.all([
        fetch(`/api/analytics/engagement?${params.toString()}`),
        fetch(`/api/analytics/activity-summary?${params.toString()}`),
      ]);

      if (!engagementRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const result = await engagementRes.json();
      setData(result);

      if (activityRes.ok) {
        const actResult = await activityRes.json();
        setActivityData(actResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, startDate, endDate]);

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for real-time updates (every 5 minutes for landing page data)
  useEffect(() => {
    if (!startDate || !endDate) return;

    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchData, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className={`flex flex-wrap items-center gap-4 p-4 ${dash.card}`}>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Account:</label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Start date:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">End date:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="ml-auto"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Metrics */}
      <div className="space-y-6">
        {activityData && (
          <PlayActivitySummary data={activityData.playSummary} />
        )}
        <NewContactsMetric data={data.newContacts} />
        <LandingPagePerformance data={data.landingPagePerformance} />
        <EmailEngagement data={data.emailEngagement} />
        <BuyingGroupCoverage data={data.buyingGroupCoverage} />
        <WarmContacts data={data.warmContacts} />
        {activityData && activityData.contactEngagement.length > 0 && (
          <ContactEngagementTable data={activityData.contactEngagement} />
        )}
      </div>
    </div>
  );
}

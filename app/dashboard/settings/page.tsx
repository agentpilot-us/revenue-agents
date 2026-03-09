import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isServiceConfigured, type ServiceId } from '@/lib/service-config';
import { UserProfileSettings } from '@/app/components/settings/UserProfileSettings';
import { SalesforceSettingsBlock } from '@/app/components/settings/SalesforceSettingsBlock';
import { TestConnectionButton } from '@/app/components/settings/TestConnectionButton';
import { NightlyCrawlSettings } from '@/app/components/settings/NightlyCrawlSettings';
import { DeleteYourCompanyDataButton } from '@/app/components/settings/DeleteYourCompanyDataButton';

function serviceStatus(id: ServiceId, optional = false) {
  const connected = isServiceConfigured(id);
  return {
    status: connected ? ('connected' as const) : ('not_configured' as const),
    stats: connected
      ? 'Configured via environment variables'
      : optional
        ? 'Optional - Not configured'
        : 'Not configured',
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      companyWebsite: true,
      companyLogoUrl: true,
      salesforceAccessToken: true,
      contentRefreshFrequency: true,
      contentRefreshNextAt: true,
      nightlyCrawlPreferredHour: true,
      crawlPaused: true,
    },
  });

  // Get Salesforce last sync status (most recent sync across user's companies)
  const lastSalesforceSync = await prisma.company.findFirst({
    where: {
      userId: session.user.id,
      salesforceLastSyncedAt: { not: null },
    },
    select: {
      salesforceLastSyncedAt: true,
    },
    orderBy: {
      salesforceLastSyncedAt: 'desc',
    },
  });

  const isSalesforceConnected = !!user?.salesforceAccessToken;

  const services = [
    {
      category: 'Email & Communication',
      items: [
        {
          name: 'Resend',
          icon: '📧',
          description: 'Send and track emails',
          ...serviceStatus('resend'),
        },
        {
          name: 'Cal.com',
          icon: '📅',
          description: 'Schedule meetings and track RSVPs',
          ...serviceStatus('cal'),
        },
      ],
    },
    {
      category: 'Contact Data',
      items: [
        {
          name: 'Apollo',
          icon: '🔍',
          description: 'Discover and enrich contacts with emails, phones, and titles',
          ...serviceStatus('apollo'),
        },
      ],
    },
    {
      category: 'Research & Intelligence',
      items: [
        {
          name: 'Perplexity',
          icon: '🧠',
          description: 'Research companies and industries',
          ...serviceStatus('perplexity'),
        },
        {
          name: 'Firecrawl',
          icon: '🌐',
          description: 'Scrape web pages and capture screenshots',
          ...serviceStatus('firecrawl', true),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2 text-card-foreground">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Manage your connected services and preferences. Agent Configuration applies to all accounts.
        </p>

        {/* Tabs */}
        <div className="mb-8 border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/dashboard/settings"
              className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              Services
            </Link>
            <Link
              href="/dashboard/my-company"
              className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              My Company
            </Link>
            <Link
              href="/dashboard/settings#your-company-data"
              className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              Your company data
            </Link>
            <Link
              href="/dashboard/settings#profile"
              className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>

        {/* Agent Configuration / Connected tools */}
        <div id="services" className="space-y-8">
          <h2 className="text-xl font-semibold text-card-foreground">Integrations</h2>

          {/* Salesforce */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">CRM</h3>
            <SalesforceSettingsBlock
              isConnected={isSalesforceConnected}
              lastSyncedAt={lastSalesforceSync?.salesforceLastSyncedAt ?? null}
            />
          </div>

          <h2 className="text-xl font-semibold text-card-foreground mt-8">Agent Configuration</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            These connected tools are used by the expansion agent across all your accounts. They are configured once per workspace via environment variables (by your administrator). There is no per-account tool configuration.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Connected tools:</strong> Resend (email), Cal.com (meetings), Apollo (contacts), Perplexity (research), Firecrawl (scraping). Configure via environment variables — no setup required on your part if already set.
            </p>
          </div>

          {services.map((category) => (
            <div key={category.category}>
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">{category.category}</h2>

              <div className="space-y-4">
                {category.items.map((service) => (
                  <div
                    key={service.name}
                    className="bg-card border border-border rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">{service.icon}</div>
                        <div>
                          <h3 className="font-semibold text-lg text-card-foreground">{service.name}</h3>
                          <p className="text-muted-foreground text-sm">{service.description}</p>
                          <p className="text-muted-foreground text-sm mt-2">{service.stats}</p>
                        </div>
                      </div>
                      <div>
                        {service.status === 'connected' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✓ Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted text-card-foreground">
                            Not Configured
                          </span>
                        )}
                      </div>
                    </div>
                    {(service.name === 'Resend' ||
                      service.name === 'Cal.com') && (
                      <TestConnectionButton
                        serviceName={service.name}
                        testEndpoint={`/api/integrations/${service.name.toLowerCase().replace('.', '')}/test`}
                        isConfigured={service.status === 'connected'}
                      />
                    )}
                    {service.name === 'Firecrawl' && service.status === 'not_configured' && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-2">
                          Get an API key at firecrawl.dev, add <code className="text-xs bg-muted px-1 rounded">FIRECRAWL_API_KEY</code> to <code className="text-xs bg-muted px-1 rounded">.env.local</code>, then restart the dev server.
                        </p>
                        <Link
                          href="/dashboard/content-library"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          See step-by-step setup on Your company data →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Onboarding checklist */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2 text-card-foreground">Onboarding checklist</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Complete these once to get the most from the agent:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Set your company name (Profile below) for your company data matching</li>
              <li>• Upload content: products, industry playbooks, case studies (Your company data)</li>
              <li>• Connect tools above (Resend, Cal.com, etc.) — via env vars</li>
              <li>• Add your first target account (Target Accounts → Add target account), then run Account Intelligence</li>
            </ul>
          </div>

          {/* Enterprise Add-ons */}
          <div className="bg-muted border border-border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2 text-card-foreground">🔒 Enterprise Add-Ons</h3>
            <p className="text-muted-foreground mb-4">
              Want to use your own Gmail, Salesforce, or custom integrations?
            </p>
            <a
              href="mailto:sales@example.com"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Nightly Crawl Settings */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <NightlyCrawlSettings
            initialPreferredHour={user?.nightlyCrawlPreferredHour ?? null}
            initialCrawlPaused={user?.crawlPaused ?? false}
          />
        </div>

        {/* Your company data (content library) */}
        <div id="your-company-data" className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">Your company data</h2>
          <p className="text-muted-foreground mb-4">
            Content library, products, catalog, industry playbooks, and messaging frameworks. Stored under Your company data / Content Library.
          </p>
          <div className="bg-card border border-border rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
            <p className="text-muted-foreground mb-4">
              Permanently remove all your company data to start fresh. Your profile and target companies are not affected.
            </p>
            <DeleteYourCompanyDataButton />
          </div>
        </div>

        {/* Profile section */}
        <div id="profile" className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">Profile</h2>
          <UserProfileSettings 
            userId={user?.id ?? session.user.id}
            initialName={user?.name ?? (typeof session.user?.name === 'string' ? session.user.name : '')}
            initialEmail={user?.email ?? (typeof session.user?.email === 'string' ? session.user.email : '')}
            initialCompanyName={user?.companyName ?? ''}
            initialCompanyWebsite={user?.companyWebsite ?? ''}
            initialCompanyLogoUrl={user?.companyLogoUrl ?? undefined}
          />
        </div>

        {/* Billing section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">Billing</h2>
          <div className="bg-card border border-border rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
            <p className="text-muted-foreground mb-4">
              Manage your subscription, view usage, and upgrade your plan.
            </p>
            <Link
              href="/billing"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Go to Billing →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

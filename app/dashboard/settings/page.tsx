import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { isServiceConfigured, type ServiceId } from '@/lib/service-config';

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
          name: 'Clay',
          icon: '🔍',
          description: 'Enrich contacts with emails, phones, and data',
          ...serviceStatus('clay'),
        },
        {
          name: 'PhantomBuster',
          icon: '💼',
          description: 'Search and discover contacts on LinkedIn',
          ...serviceStatus('phantombuster'),
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Settings</h1>
        <p className="text-gray-600 mb-8">
          Manage your connected services and preferences
        </p>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/dashboard/settings"
              className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              Services
            </Link>
            <Link
              href="/dashboard/settings#profile"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>

        {/* Services */}
        <div id="services" className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All services are configured via environment variables
              by your administrator. No setup required on your part.
            </p>
          </div>

          {services.map((category) => (
            <div key={category.category}>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">{category.category}</h2>

              <div className="space-y-4">
                {category.items.map((service) => (
                  <div
                    key={service.name}
                    className="bg-white border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">{service.icon}</div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{service.name}</h3>
                          <p className="text-gray-600 text-sm">{service.description}</p>
                          <p className="text-gray-500 text-sm mt-2">{service.stats}</p>
                        </div>
                      </div>
                      <div>
                        {service.status === 'connected' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✓ Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            Not Configured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Enterprise Add-ons */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-900">🔒 Enterprise Add-Ons</h3>
            <p className="text-gray-600 mb-4">
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

        {/* Profile section */}
        <div id="profile" className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Profile</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-900">{session.user?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{session.user?.email ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

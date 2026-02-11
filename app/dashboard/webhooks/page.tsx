import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

const WEBHOOK_ACTIVITY_TYPES = [
  'Email',
  'EmailOpen',
  'EmailClick',
  'EmailBounce',
  'EmailComplaint',
  'CalendarAccepted',
  'CalendarCancelled',
  'CalendarRescheduled',
] as const;

export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const recentActivities = await prisma.activity.findMany({
    where: {
      userId: session.user.id,
      type: { in: [...WEBHOOK_ACTIVITY_TYPES] },
    },
    include: {
      contact: { select: { id: true, email: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  function getIcon(type: string) {
    switch (type) {
      case 'Email':
        return '📧';
      case 'EmailOpen':
        return '👁️';
      case 'EmailClick':
        return '👆';
      case 'EmailBounce':
      case 'EmailComplaint':
        return '❌';
      case 'CalendarAccepted':
        return '✅';
      case 'CalendarCancelled':
        return '🚫';
      case 'CalendarRescheduled':
        return '📅';
      default:
        return '📝';
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Webhook Events</h1>
      <p className="text-gray-600 mb-6">
        Recent email and calendar events from Resend and Cal.com webhooks. Refresh to see new events.
      </p>

      <div className="space-y-2">
        {recentActivities.length === 0 ? (
          <div className="p-8 bg-white border border-gray-200 rounded-lg text-center text-gray-500">
            No webhook events yet. Send an email or receive a calendar RSVP to see events here.
          </div>
        ) : (
          recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{activity.summary}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {activity.contact?.email ?? 'Unknown contact'}
                    {activity.company?.name ? ` • ${activity.company.name}` : ''}
                  </p>
                </div>
                <span className="text-sm text-gray-500 shrink-0">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

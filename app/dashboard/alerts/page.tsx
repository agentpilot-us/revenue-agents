import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { AlertsList } from './AlertsList';

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const [alerts, unreadCount] = await Promise.all([
    prisma.alert.findMany({
      where: { userId: session.user.id },
      include: {
        campaign: { select: { title: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.alert.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alerts</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/settings/alerts"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Alert settings
        </Link>
      </div>
      <AlertsList alerts={alerts} />
    </div>
  );
}

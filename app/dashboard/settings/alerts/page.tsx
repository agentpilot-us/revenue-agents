import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { AlertSettingsForm } from './AlertSettingsForm';

export default async function AlertSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      alertSettings: true,
      slackWebhookUrl: true,
    },
  });
  if (!user) redirect('/api/auth/signin');

  const alertSettings = (user.alertSettings as Record<string, unknown> | null) || {};

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link href="/dashboard/settings" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
        ← Settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Alert Settings</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Choose how you want to be notified when high-value visitors engage with your landing pages.
      </p>
      <AlertSettingsForm
        userEmail={user.email}
        initialSettings={{
          ...alertSettings,
          slackWebhookUrl: user.slackWebhookUrl ?? (alertSettings.slackWebhookUrl as string),
        }}
      />
    </div>
  );
}

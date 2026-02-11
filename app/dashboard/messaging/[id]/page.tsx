import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { MessagingFrameworkForm } from './MessagingFrameworkForm';

export default async function MessagingFrameworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const framework = await prisma.messagingFramework.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!framework) notFound();

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <Link href="/dashboard/messaging" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
        ← Messaging frameworks
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{framework.name}</h1>
      <MessagingFrameworkForm framework={framework} />
    </div>
  );
}

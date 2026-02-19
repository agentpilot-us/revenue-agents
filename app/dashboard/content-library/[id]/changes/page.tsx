import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ContentDiffView } from '@/app/components/content-library/ContentDiffView';

export default async function ContentChangesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const item = await prisma.contentLibrary.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      content: true,
      previousContent: true,
      version: true,
      updatedAt: true,
    },
  });

  if (!item) notFound();

  if (!item.previousContent || !item.version || parseFloat(item.version) <= 1.0) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/content-library"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Your company data
          </Link>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Content Changes</h1>
          <p className="text-gray-600 dark:text-gray-300">
            No previous version available for this content. Changes are only tracked after the first update.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Your company data
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Changes: {item.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Version {item.version} • Updated {item.updatedAt.toLocaleDateString()}
        </p>
        <ContentDiffView
          currentContent={item.content as Record<string, unknown>}
          previousContent={item.previousContent as Record<string, unknown>}
        />
      </div>
    </div>
  );
}

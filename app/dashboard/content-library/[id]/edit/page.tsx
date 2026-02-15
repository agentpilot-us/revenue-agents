import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { SuccessStoryEditForm } from '@/app/dashboard/content-library/SuccessStoryEditForm';

type SuccessStoryContent = {
  headline?: string;
  oneLiner?: string;
  fullSummary?: string;
  keyMetrics?: string[];
  whenToUse?: string;
  valueProp?: string;
  benefits?: string[];
  proofPoints?: string[];
  successStories?: unknown[];
};

export default async function ContentLibraryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const item = await prisma.contentLibrary.findFirst({
    where: { id, userId: session.user.id },
    include: { product: { select: { name: true } } },
  });
  if (!item) notFound();

  if (item.type !== 'SuccessStory') {
    return (
      <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <Link href="/dashboard/content-library?tab=SuccessStory" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block">
          ← Back to Case Studies
        </Link>
        <p className="text-gray-600 dark:text-gray-300">
          Enhanced editing is available for Case Studies (Success Stories). This item is type: {item.type}.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Title: {item.title}. Use the API or a generic editor to update other types.
        </p>
      </div>
    );
  }

  const content = (item.content as SuccessStoryContent) ?? {};
  const initialData = {
    title: item.title,
    headline: content.headline ?? item.title,
    oneLiner: content.oneLiner ?? content.valueProp ?? '',
    fullSummary: content.fullSummary ?? '',
    keyMetrics: Array.isArray(content.keyMetrics) ? content.keyMetrics : [],
    whenToUse: content.whenToUse ?? '',
    department: item.department ?? '',
    industry: item.industry ?? '',
    company: item.company ?? '',
    sourceUrl: item.sourceUrl ?? '',
  };

  return (
    <div className="p-8 max-w-4xl bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link
        href="/dashboard/content-library?tab=SuccessStory"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
      >
        ← Back to Case Studies
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Edit case study</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Product: {item.product.name}</p>
      <SuccessStoryEditForm
        contentLibraryId={id}
        initialData={initialData}
      />
    </div>
  );
}

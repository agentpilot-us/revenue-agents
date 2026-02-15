import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IndustryPlaybookForm } from '@/app/dashboard/content-library/IndustryPlaybookForm';

export default async function NewIndustryPlaybookPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const catalogProducts = await prisma.catalogProduct.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="p-8 max-w-4xl bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link
        href="/dashboard/content-library?tab=industries"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
      >
        ← Back to Industries
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Add industry playbook</h1>
      <IndustryPlaybookForm catalogProducts={catalogProducts} initialData={null} />
    </div>
  );
}

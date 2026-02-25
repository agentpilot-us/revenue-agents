import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { EditIndustryPlaybookForm } from './EditIndustryPlaybookForm';

export default async function EditIndustryPlaybookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const playbook = await prisma.industryPlaybook.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      overview: true,
      buyingCommittee: true,
      landmines: true,
      departmentProductMapping: true,
      valuePropsByDepartment: true,
      relevantCaseStudyIds: true,
    },
  });
  if (!playbook) notFound();

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Your company data
        </Link>
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Edit industry playbook
        </h1>
        <EditIndustryPlaybookForm
          playbookId={playbook.id}
          initialName={playbook.name}
          initialOverview={playbook.overview ?? ''}
        />
      </div>
    </div>
  );
}

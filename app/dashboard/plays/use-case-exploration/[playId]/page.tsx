import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { UseCaseExplorationExecution } from './UseCaseExplorationExecution';

export default async function UseCaseExplorationPlayPage({
  params,
}: {
  params: Promise<{ playId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { playId } = await params;

  const play = await prisma.useCaseExplorationPlay.findFirst({
    where: { id: playId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          userId: true,
          industry: true,
        },
      },
      companyDepartment: {
        select: {
          id: true,
          type: true,
          customName: true,
        },
        include: {
          contacts: {
            orderBy: { lastContactedAt: 'desc' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
          companyProducts: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  if (!play || play.company.userId !== session.user.id) notFound();

  const deptName =
    play.companyDepartment.customName ?? play.companyDepartment.type.replace(/_/g, ' ');
  const targetContactIds = (play.targetContactIds as Array<{ contactId: string }>) ?? [];
  const drafts = (play.drafts as Array<{ contactId: string; subject?: string; body?: string }>) ?? [];

  const contentLibrary = await prisma.contentLibrary.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      userConfirmed: true,
      AND: [
        { OR: [{ company: play.company.name }, { company: null }, { company: '' }] },
        { OR: [{ department: deptName }, { department: null }, { department: '' }] },
      ],
    },
    take: 10,
    select: { id: true, title: true, type: true, department: true },
  });

  const products = play.companyDepartment.companyProducts.map((cp) => ({
    id: cp.product.id,
    name: cp.product.name,
    slug: cp.product.slug,
  }));

  const stepState = (play.stepState as Record<string, string>) ?? null;
  const stepCompletedAt = (play.stepCompletedAt as Record<string, string>) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UseCaseExplorationExecution
          playId={play.id}
          companyId={play.company.id}
          companyName={play.company.name}
          departmentId={play.companyDepartment.id}
          departmentName={deptName}
          currentStep={play.currentStep}
          playState={play.playState ?? 'waiting_for_user'}
          stepState={stepState}
          stepCompletedAt={stepCompletedAt}
          contentLibraryTitles={contentLibrary.map((c) => c.title)}
          productNames={products.map((p) => p.name)}
          departmentContacts={play.companyDepartment.contacts}
          targetContactIds={targetContactIds.map((t) => t.contactId)}
          drafts={drafts}
        />
      </div>
    </div>
  );
}

import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StakeholderPlayExecution } from './StakeholderPlayExecution';

export default async function StakeholderPlayRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { runId } = await params;

  const play = await prisma.stakeholderEngagementPlay.findFirst({
    where: { id: runId },
    include: {
      company: { select: { id: true, name: true, userId: true } },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          email: true,
          linkedinUrl: true,
        },
      },
    },
  });

  if (!play || play.company.userId !== session.user.id) notFound();

  const contactName = [play.contact.firstName, play.contact.lastName].filter(Boolean).join(' ') || 'Unknown';
  const researchData = (play.researchData as Record<string, unknown>) ?? null;
  const draftEmail = (play.draftEmail as { subject?: string; body?: string } | null) ?? null;
  const stepCompletedAt = (play.stepCompletedAt as Record<string, string> | null) ?? null;
  const stepState = (play.stepState as Record<string, string> | null) ?? null;
  const messages = (play.messages as Array<{ role: string; content: string; createdAt?: string }> | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StakeholderPlayExecution
          playId={play.id}
          companyId={play.company.id}
          companyName={play.company.name}
          contactName={contactName}
          contactTitle={play.contact.title}
          contactEmail={play.contact.email}
          contactLinkedInUrl={play.contact.linkedinUrl}
          currentStep={play.currentStep}
          status={play.status}
          playState={play.playState ?? 'waiting_for_user'}
          stepState={stepState}
          researchData={researchData}
          draftEmail={draftEmail}
          draftEmailApproved={play.draftEmailApproved}
          draftAttachment={play.draftAttachment}
          stepCompletedAt={stepCompletedAt}
          championHint="Sarah Chen"
          createdAt={play.createdAt.toISOString()}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}

import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { SequenceStepsClient } from '@/app/components/sequences/SequenceStepsClient';

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const sequence = await prisma.outreachSequence.findFirst({
    where: { id, userId: session.user.id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!sequence) notFound();

  const steps = sequence.steps.map((s) => ({
    id: s.id,
    order: s.order,
    dayOffset: s.dayOffset,
    channel: s.channel,
    role: s.role,
    promptTemplate: s.promptTemplate ?? null,
    ctaType: s.ctaType ?? null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/settings/sequences" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Sequences
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{sequence.name}</h1>
        {sequence.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">{sequence.description}</p>
        )}
        <SequenceStepsClient
          sequenceId={sequence.id}
          sequenceName={sequence.name}
          initialSteps={steps}
        />
      </div>
    </div>
  );
}

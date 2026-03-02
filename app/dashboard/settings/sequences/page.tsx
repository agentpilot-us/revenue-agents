import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { SequencesListClient } from '@/app/components/sequences/SequencesListClient';

export default async function SequencesSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const sequences = await prisma.outreachSequence.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const serialized = sequences.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    isDefault: s.isDefault,
    stepCount: s._count.steps,
    enrollmentCount: s._count.enrollments,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/settings" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold text-card-foreground mb-2">Outreach sequences</h1>
        <p className="text-muted-foreground mb-2">
          A sequence is a <strong>timed series of touches</strong>. Example: Day 0 — send email (e.g. with link to landing page); Day 2 — send LinkedIn InMail; Day 5 — send another email. Each step has a day offset (when it’s due after the previous touch) and a channel (Email, LinkedIn, Call task).
        </p>
        <p className="text-muted-foreground mb-6">
          Enroll contacts from the contact list after enrichment; draft and send next touches in chat or from the approval queue.
        </p>
        <SequencesListClient initialSequences={serialized} />
      </div>
    </div>
  );
}

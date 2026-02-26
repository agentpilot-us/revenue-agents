// app/dashboard/companies/[id]/plays/run/page.tsx

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PlayRunClient } from './PlayRunClient';

type SearchParams = {
  playId?: string;
  signalId?: string;
  signalTitle?: string;
  signalSummary?: string;
  segmentId?: string;
  segmentName?: string;
};

export default async function PlayRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId } = await params;
  const sp = await searchParams;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) redirect('/dashboard');

  // If signalId provided, resolve signal server-side so client gets clean params
  let resolvedParams = {
    playId: sp.playId,
    signalId: sp.signalId,
    signalTitle: sp.signalTitle,
    signalSummary: sp.signalSummary,
    segmentId: sp.segmentId,
    segmentName: sp.segmentName,
  };

  if (sp.signalId && !sp.signalTitle) {
    const signal = await prisma.accountSignal.findFirst({
      where: { id: sp.signalId, companyId, userId: session.user.id },
      select: { title: true, summary: true, suggestedPlay: true },
    });
    if (signal) {
      resolvedParams = {
        ...resolvedParams,
        playId: signal.suggestedPlay ?? 're_engagement',
        signalTitle: signal.title,
        signalSummary: signal.summary ?? undefined,
      };
    }
  }

  return (
    <PlayRunClient
      companyId={companyId}
      companyName={company.name}
      runParams={resolvedParams}
    />
  );
}

'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

export async function activateAndGoToDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/onboarding');

  const status = (session.user as { accountStatus?: string }).accountStatus;
  if (status !== 'invited') {
    if (status === 'active') redirect('/dashboard');
    redirect('/waitlist-pending');
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      accountStatus: 'active',
      activatedAt: new Date(),
      inviteToken: null,
    },
  });

  redirect('/dashboard');
}

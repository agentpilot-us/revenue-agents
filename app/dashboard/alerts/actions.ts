'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function markAlertAsRead(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.alert.updateMany({
    where: { id: alertId, userId: session.user.id },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath('/dashboard/alerts');
}

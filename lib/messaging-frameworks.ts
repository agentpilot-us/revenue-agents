import { prisma } from '@/lib/db';

/**
 * Get the default messaging framework for a user (for use by the Expansion agent when drafting outreach).
 * Returns null if none is set.
 */
export async function getDefaultMessagingFramework(userId: string) {
  const framework = await prisma.messagingFramework.findFirst({
    where: { createdById: userId, isDefault: true },
  });
  return framework;
}

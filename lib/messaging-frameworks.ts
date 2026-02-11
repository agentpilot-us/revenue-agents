import { prisma } from '@/lib/db';

/**
 * Get the default messaging framework for a user (for use by the Expansion agent when drafting outreach).
 */
export async function getDefaultMessagingFramework(userId: string) {
  return prisma.messagingFramework.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get messaging context for the expansion agent.
 */
export async function getMessagingContextForAgent(
  userId: string,
  _query?: string,
  _companyId?: string | null
): Promise<{ content: string; fromRag: boolean } | null> {
  const framework = await getDefaultMessagingFramework(userId);
  if (!framework) return null;
  return {
    content: framework.content,
    fromRag: false,
  };
}

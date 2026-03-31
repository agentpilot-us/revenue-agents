import type { Prisma } from '@prisma/client';

/**
 * Ensures a PlayTemplate has at least a `primary` role and every ContentTemplate
 * under it has playTemplateRoleId set (defaults to primary).
 */
export async function ensureTemplateRolesForPlayTemplate(
  tx: Prisma.TransactionClient,
  playTemplateId: string,
): Promise<void> {
  const roles = await tx.playTemplateRole.findMany({
    where: { playTemplateId },
    orderBy: { orderIndex: 'asc' },
  });

  let primaryId: string;
  if (roles.length === 0) {
    const primary = await tx.playTemplateRole.create({
      data: {
        playTemplateId,
        key: 'primary',
        label: 'Primary contact',
        description: 'Main outreach target for this play',
        isRequired: true,
        orderIndex: 0,
      },
    });
    primaryId = primary.id;
  } else {
    primaryId = roles.find((r) => r.key === 'primary')?.id ?? roles[0]!.id;
  }

  await tx.contentTemplate.updateMany({
    where: {
      playTemplateRoleId: null,
      phaseTemplate: { playTemplateId },
    },
    data: { playTemplateRoleId: primaryId },
  });
}

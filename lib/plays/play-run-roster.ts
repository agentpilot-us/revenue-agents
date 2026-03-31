import type { ContentTemplate, PlayTemplateRole } from '@prisma/client';
import { prisma } from '@/lib/db';

/** Outbound or explicit contact-required steps need a roster assignment when role is required. */
export function contentStepNeedsAssignableContact(ct: {
  requiresContact: boolean;
  contentType: string;
}): boolean {
  if (ct.requiresContact) return true;
  const t = ct.contentType;
  return t === 'EMAIL' || t === 'LINKEDIN_MSG';
}

export async function autoPopulatePlayRunContacts(playRunId: string): Promise<void> {
  const run = await prisma.playRun.findUnique({
    where: { id: playRunId },
    include: {
      runContacts: { include: { playTemplateRole: true } },
      roadmapTarget: {
        select: {
          id: true,
          companyDepartmentId: true,
        },
      },
    },
  });
  if (!run) return;

  const deptId =
    run.roadmapTarget?.companyDepartmentId ?? run.targetCompanyDepartmentId ?? null;

  for (const rc of run.runContacts) {
    if (rc.contactId) continue;
    const role = rc.playTemplateRole;

    if (role.mapToContactRole === 'CHAMPION' && run.roadmapTargetId) {
      const link = await prisma.roadmapContact.findFirst({
        where: {
          targetId: run.roadmapTargetId,
          connectionStatus: { equals: 'champion', mode: 'insensitive' },
          contactId: { not: null },
          contact: { companyId: run.companyId },
        },
        select: { contactId: true },
      });
      if (link?.contactId) {
        await prisma.playRunContact.update({
          where: { id: rc.id },
          data: {
            contactId: link.contactId,
            status: 'CONFIRMED',
            autoFilledAt: new Date(),
          },
        });
      }
      continue;
    }

    if (deptId && role.mapToContactRole === 'EXECUTIVE_SPONSOR') {
      const exec = await prisma.contact.findFirst({
        where: {
          companyId: run.companyId,
          companyDepartmentId: deptId,
          OR: [
            { title: { contains: 'CEO', mode: 'insensitive' } },
            { title: { contains: 'CFO', mode: 'insensitive' } },
            { title: { contains: 'CIO', mode: 'insensitive' } },
            { title: { contains: 'CTO', mode: 'insensitive' } },
            { title: { contains: 'Chief', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (exec) {
        await prisma.playRunContact.update({
          where: { id: rc.id },
          data: {
            contactId: exec.id,
            status: 'CONFIRMED',
            autoFilledAt: new Date(),
          },
        });
      }
    }
  }
}

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  title: string | null;
};

function contactDisplayName(c: ContactRow): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

/** Copy roster contact onto all actions for that role; clear drafts; unblock BLOCKED or set BLOCKED when cleared. */
export async function syncPlayActionsForTemplateRole(
  playRunId: string,
  playTemplateRoleId: string,
  options?: { clearGenerated?: boolean },
): Promise<void> {
  const roster = await prisma.playRunContact.findFirst({
    where: { playRunId, playTemplateRoleId },
    include: {
      contact: true,
      playTemplateRole: {
        select: { id: true, key: true, mapToContactRole: true, isRequired: true },
      },
    },
  });
  if (!roster) return;

  const clear = options?.clearGenerated !== false;
  const role = roster.playTemplateRole;

  if (!roster.contact) {
    const actions = await prisma.playAction.findMany({
      where: { phaseRun: { playRunId }, playTemplateRoleId },
      include: { contentTemplate: { select: { requiresContact: true, contentType: true } } },
    });
    for (const a of actions) {
      const ct = a.contentTemplate;
      const block =
        !!ct &&
        contentStepNeedsAssignableContact(ct) &&
        role.isRequired;
      await prisma.playAction.update({
        where: { id: a.id },
        data: {
          contactId: null,
          contactName: null,
          contactEmail: null,
          contactTitle: null,
          targetRoleKey: role.key,
          ...(block ? { status: 'BLOCKED' as const } : {}),
          ...(clear
            ? {
                generatedContent: null,
                generatedSubject: null,
                generatedAt: null,
                editedContent: null,
                editedSubject: null,
              }
            : {}),
        },
      });
    }
    return;
  }

  const c = roster.contact as ContactRow;
  const name = contactDisplayName(c);

  await prisma.playAction.updateMany({
    where: {
      phaseRun: { playRunId },
      playTemplateRoleId,
    },
    data: {
      contactId: c.id,
      contactName: name,
      contactEmail: c.email,
      contactTitle: c.title,
      contactRole: role.mapToContactRole ?? undefined,
      targetRoleKey: role.key,
      ...(clear
        ? {
            generatedContent: null,
            generatedSubject: null,
            generatedAt: null,
            editedContent: null,
            editedSubject: null,
          }
        : {}),
    },
  });

  await prisma.playAction.updateMany({
    where: {
      phaseRun: { playRunId },
      playTemplateRoleId,
      status: 'BLOCKED',
    },
    data: { status: 'PENDING' },
  });
}

export function resolveActionStatusForNewStep(
  content: ContentTemplate,
  templateRole: PlayTemplateRole,
  rosterHasContact: boolean,
): 'PENDING' | 'BLOCKED' {
  const needs = contentStepNeedsAssignableContact(content);
  if (needs && templateRole.isRequired && !rosterHasContact) {
    return 'BLOCKED';
  }
  return 'PENDING';
}

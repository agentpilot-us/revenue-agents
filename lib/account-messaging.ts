import { prisma } from '@/lib/db';

type UseCaseEntry = {
  contentLibraryId: string;
  customNote?: string;
  departmentFit?: string[];
};
type SuccessStoryEntry = {
  contentLibraryId: string;
  whyRelevant: string;
  bestForDepartments?: string[];
};
type ObjectionHandler = { objection: string; response: string };
type DoNotMention = { topic: string; reason: string };

/**
 * Build the ACCOUNT CONTEXT prompt block from Account Messaging for a company.
 * Returns null if no account messaging or empty. Used by chat and draft-follow-up
 * in addition to existing content library and department-based messaging.
 */
export async function getAccountMessagingPromptBlock(
  companyId: string,
  userId: string
): Promise<string | null> {
  const accountMessaging = await prisma.accountMessaging.findFirst({
    where: { companyId, userId },
    include: {
      company: { select: { name: true } },
    },
  });

  if (!accountMessaging?.company) return null;

  const whyThisCompany = accountMessaging.whyThisCompany as string[] | null;
  const useCases = accountMessaging.useCases as UseCaseEntry[] | null;
  const successStories = accountMessaging.successStories as SuccessStoryEntry[] | null;
  const objectionHandlers = accountMessaging.objectionHandlers as ObjectionHandler[] | null;
  const doNotMention = accountMessaging.doNotMention as DoNotMention[] | null;

  const hasContent =
    (Array.isArray(whyThisCompany) && whyThisCompany.length > 0) ||
    (Array.isArray(useCases) && useCases.length > 0) ||
    (Array.isArray(successStories) && successStories.length > 0) ||
    (Array.isArray(objectionHandlers) && objectionHandlers.length > 0) ||
    (Array.isArray(doNotMention) && doNotMention.length > 0);

  if (!hasContent) return null;

  const contentLibraryIds = [
    ...(Array.isArray(useCases) ? useCases.map((u) => u.contentLibraryId) : []),
    ...(Array.isArray(successStories) ? successStories.map((s) => s.contentLibraryId) : []),
  ].filter(Boolean);
  const uniqueIds = [...new Set(contentLibraryIds)];

  let titleById: Record<string, string> = {};
  if (uniqueIds.length > 0) {
    const rows = await prisma.contentLibrary.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, title: true },
    });
    titleById = Object.fromEntries(rows.map((r) => [r.id, r.title]));
  }

  const lines: string[] = [
    'ACCOUNT CONTEXT (from Account Messaging):',
    `Company: ${accountMessaging.company.name}`,
  ];

  if (Array.isArray(whyThisCompany) && whyThisCompany.length > 0) {
    lines.push('Why they should care:');
    whyThisCompany.forEach((b) => lines.push(`- ${b}`));
  }

  if (Array.isArray(useCases) && useCases.length > 0) {
    const useCaseLines = useCases.map((u) => {
      const title = titleById[u.contentLibraryId] ?? u.contentLibraryId;
      const note = u.customNote ? ` (${u.customNote})` : '';
      const dept = u.departmentFit?.length ? ` [departments: ${u.departmentFit.join(', ')}]` : '';
      return `- ${title}${note}${dept}`;
    });
    lines.push('Relevant use cases:', ...useCaseLines);
  }

  if (Array.isArray(successStories) && successStories.length > 0) {
    const storyLines = successStories.map((s) => {
      const title = titleById[s.contentLibraryId] ?? s.contentLibraryId;
      const dept = s.bestForDepartments?.length
        ? ` [best for: ${s.bestForDepartments.join(', ')}]`
        : '';
      return `- ${title}: ${s.whyRelevant}${dept}`;
    });
    lines.push('Relevant case studies:', ...storyLines);
  }

  if (Array.isArray(objectionHandlers) && objectionHandlers.length > 0) {
    lines.push('Objection handlers:');
    objectionHandlers.forEach((o) => lines.push(`- "${o.objection}" → ${o.response}`));
  }

  if (Array.isArray(doNotMention) && doNotMention.length > 0) {
    lines.push(
      'Do NOT mention:',
      ...doNotMention.map((d) => `- ${d.topic} (${d.reason})`)
    );
  }

  return lines.join('\n');
}

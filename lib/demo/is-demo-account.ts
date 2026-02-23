import { prisma } from '@/lib/db';

/**
 * Returns true if the company is a demo account (frozen; no API/LLM calls).
 * Use in routes where you don't already have the company row loaded.
 * In the chat route, add isDemoAccount to the existing company select instead of calling this.
 */
export async function isDemoAccount(companyId: string): Promise<boolean> {
  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: { isDemoAccount: true },
  });
  return company?.isDemoAccount ?? false;
}

export type DemoContext = {
  isDemo: boolean;
  demoVertical: string | null;
};

/**
 * Returns demo flag and vertical for scripted chat or vertical-specific behavior.
 */
export async function getDemoContext(companyId: string): Promise<DemoContext> {
  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: { isDemoAccount: true, demoVertical: true },
  });
  return {
    isDemo: company?.isDemoAccount ?? false,
    demoVertical: company?.demoVertical ?? null,
  };
}

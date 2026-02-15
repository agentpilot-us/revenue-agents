'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { ContentType } from '@prisma/client';

export type CompanySetupState =
  | 'needs_company_info'
  | 'importing'
  | 'needs_review'
  | 'needs_content'
  | 'ready';

export type GetCompanySetupStateResult =
  | { ok: true; state: CompanySetupState; user: GetCompanySetupStateUser; latestImport: GetCompanySetupStateImport | null; contentLibraryTotal: number }
  | { ok: false; error: string };

export type GetCompanySetupStateUser = {
  id: string;
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  primaryIndustrySellTo: string | null;
  contentRefreshFrequency: string | null;
  contentRefreshNextAt: Date | null;
};

/** Single item in ContentImport.categorizedContent.items (from import-pipeline). */
export type CategorizedContentItem = {
  url: string;
  title: string;
  description: string;
  suggestedType: string;
  industry?: string;
  department?: string;
};

/** Shape stored in ContentImport.categorizedContent. */
export type CategorizedContentPayload = {
  items: CategorizedContentItem[];
};

export type GetCompanySetupStateImport = {
  id: string;
  status: string;
  totalPages: number;
  scrapedPages: number;
  categorizedPages: number;
  categorizedContent: CategorizedContentPayload | null;
  sourceUrl: string;
  industry: string | null;
  errors: unknown;
};

const IMPORT_SELECT = {
  id: true,
  status: true,
  totalPages: true,
  scrapedPages: true,
  categorizedPages: true,
  categorizedContent: true,
  sourceUrl: true,
  industry: true,
  errors: true,
} as const;

function toLatestImport(
  row: { id: string; status: string; totalPages: number; scrapedPages: number; categorizedPages: number; categorizedContent: unknown; sourceUrl: string; industry: string | null; errors: unknown } | null
): GetCompanySetupStateImport | null {
  if (!row) return null;
  const payload = row.categorizedContent as CategorizedContentPayload | null;
  return {
    id: row.id,
    status: row.status,
    totalPages: row.totalPages,
    scrapedPages: row.scrapedPages,
    categorizedPages: row.categorizedPages,
    categorizedContent: payload && Array.isArray(payload?.items) ? payload : null,
    sourceUrl: row.sourceUrl,
    industry: row.industry,
    errors: row.errors,
  };
}

/**
 * Determine content library setup state for the current user.
 * Uses contentImportLastId when set to avoid race with multiple imports.
 */
export async function getCompanySetupState(): Promise<GetCompanySetupStateResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const userId = session.user.id;

  const [user, contentLibraryTotal] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        primaryIndustrySellTo: true,
        contentRefreshFrequency: true,
        contentRefreshNextAt: true,
        contentImportLastId: true,
      },
    }),
    prisma.contentLibrary.count({
      where: { userId, isActive: true },
    }),
  ]);

  if (!user) return { ok: false, error: 'User not found' };

  type ImportRow = {
    id: string;
    status: string;
    totalPages: number;
    scrapedPages: number;
    categorizedPages: number;
    categorizedContent: unknown;
    sourceUrl: string;
    industry: string | null;
    errors: unknown;
  } | null;

  let latestImportRow: ImportRow = null;
  if (user.contentImportLastId) {
    latestImportRow = await prisma.contentImport.findFirst({
      where: { userId, id: user.contentImportLastId },
      select: IMPORT_SELECT,
    }) as ImportRow;
  }
  if (!latestImportRow) {
    latestImportRow = await prisma.contentImport.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: IMPORT_SELECT,
    }) as ImportRow;
  }
  const latestImport = toLatestImport(latestImportRow);

  const hasCompanyInfo =
    Boolean(user.companyWebsite?.trim()) && Boolean(user.primaryIndustrySellTo?.trim());

  const userPayload = {
    id: user.id,
    companyName: user.companyName,
    companyWebsite: user.companyWebsite,
    companyIndustry: user.companyIndustry,
    primaryIndustrySellTo: user.primaryIndustrySellTo,
    contentRefreshFrequency: user.contentRefreshFrequency,
    contentRefreshNextAt: user.contentRefreshNextAt,
  };

  if (!hasCompanyInfo) {
    return { ok: true, state: 'needs_company_info', user: userPayload, latestImport, contentLibraryTotal };
  }

  const inProgressStatuses = ['PENDING', 'DISCOVERING', 'SCRAPING', 'CATEGORIZING'];
  if (latestImport && inProgressStatuses.includes(latestImport.status)) {
    return { ok: true, state: 'importing', user: userPayload, latestImport, contentLibraryTotal };
  }

  if (latestImport?.status === 'REVIEW_PENDING') {
    return { ok: true, state: 'needs_review', user: userPayload, latestImport, contentLibraryTotal };
  }

  if (contentLibraryTotal === 0) {
    return { ok: true, state: 'needs_content', user: userPayload, latestImport, contentLibraryTotal };
  }

  return { ok: true, state: 'ready', user: userPayload, latestImport, contentLibraryTotal };
}

export type SaveCompanyBasicInfoData = {
  companyName?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  primaryIndustrySellTo?: string | null;
  contentRefreshFrequency?: string | null;
};

export type SaveCompanyBasicInfoResult = { ok: true } | { ok: false; error: string };

/**
 * Update user company profile (company name, website, industry, refresh schedule).
 */
export async function saveCompanyBasicInfo(
  data: SaveCompanyBasicInfoData
): Promise<SaveCompanyBasicInfoResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const update: Record<string, unknown> = {};
  if (data.companyName !== undefined) update.companyName = data.companyName?.trim() || null;
  if (data.companyWebsite !== undefined) update.companyWebsite = data.companyWebsite?.trim() || null;
  if (data.companyIndustry !== undefined) update.companyIndustry = data.companyIndustry?.trim() || null;
  if (data.primaryIndustrySellTo !== undefined)
    update.primaryIndustrySellTo = data.primaryIndustrySellTo?.trim() || null;
  if (data.contentRefreshFrequency !== undefined)
    update.contentRefreshFrequency = data.contentRefreshFrequency?.trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: update,
  });
  revalidatePath('/dashboard/content-library');
  return { ok: true };
}

export type StartSmartImportResult = { ok: true; importId: string } | { ok: false; error: string };

/**
 * Create a ContentImport and trigger the execute API (fire-and-forget). Returns importId.
 */
export async function startSmartImport(): Promise<StartSmartImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyWebsite: true, primaryIndustrySellTo: true },
  });
  if (!user?.companyWebsite?.trim()) {
    return { ok: false, error: 'Company website is required to start smart import' };
  }

  const sourceUrl = user.companyWebsite.startsWith('http')
    ? user.companyWebsite
    : `https://${user.companyWebsite}`;

  const contentImport = await prisma.contentImport.create({
    data: {
      userId: session.user.id,
      sourceUrl,
      industry: user.primaryIndustrySellTo ?? null,
      status: 'PENDING',
    },
    select: { id: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { contentImportLastId: contentImport.id },
  });

  const port = process.env.PORT ?? '3000';
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.NODE_ENV === 'development' ? `http://localhost:${port}` : null) ||
    null;
  if (!baseUrl) {
    await prisma.contentImport.update({
      where: { id: contentImport.id },
      data: {
        status: 'FAILED',
        errors: { step: 'trigger', error: 'Missing NEXT_PUBLIC_APP_URL or VERCEL_URL for import trigger' },
      },
    });
    revalidatePath('/dashboard/content-library');
    return { ok: false, error: 'Server configuration error. Set NEXT_PUBLIC_APP_URL or VERCEL_URL.' };
  }
  const executeUrl = `${baseUrl.replace(/\/$/, '')}/api/content-library/imports/${contentImport.id}/execute`;

  try {
    const response = await fetch(executeUrl, { method: 'POST' });
    if (!response.ok) {
      await prisma.contentImport.update({
        where: { id: contentImport.id },
        data: {
          status: 'FAILED',
          errors: { step: 'trigger', error: `Failed to trigger import: ${response.statusText}` },
        },
      });
      revalidatePath('/dashboard/content-library');
      return { ok: false, error: 'Failed to start import process' };
    }
  } catch (err) {
    console.error('Content import execute trigger failed:', err);
    await prisma.contentImport.update({
      where: { id: contentImport.id },
      data: {
        status: 'FAILED',
        errors: {
          step: 'trigger',
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      },
    });
    revalidatePath('/dashboard/content-library');
    return { ok: false, error: 'Failed to start import process' };
  }

  revalidatePath('/dashboard/content-library');
  return { ok: true, importId: contentImport.id };
}

export type GetImportProgressResult =
  | { ok: true; status: string; totalPages: number; scrapedPages: number; categorizedPages: number; progress: number }
  | { ok: false; error: string };

/**
 * Get progress for an import job. Progress 0-100 derived from scraped/categorized steps.
 */
export async function getImportProgress(importId: string): Promise<GetImportProgressResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const job = await prisma.contentImport.findFirst({
    where: { id: importId, userId: session.user.id },
    select: { status: true, totalPages: true, scrapedPages: true, categorizedPages: true },
  });
  if (!job) return { ok: false, error: 'Import not found' };

  const { status, totalPages, scrapedPages, categorizedPages } = job;
  let progress = 0;

  switch (status) {
    case 'PENDING':
      progress = 5;
      break;
    case 'DISCOVERING':
      progress = 15;
      break;
    case 'SCRAPING':
      progress =
        totalPages > 0
          ? 20 + Math.min(40, Math.round((scrapedPages / totalPages) * 40))
          : 25;
      break;
    case 'CATEGORIZING':
      progress =
        totalPages > 0
          ? 60 + Math.min(30, Math.round((categorizedPages / totalPages) * 30))
          : 70;
      break;
    case 'REVIEW_PENDING':
    case 'APPROVED':
      progress = 100;
      break;
    case 'FAILED':
      progress = 0;
      break;
    default:
      progress = 0;
  }

  return {
    ok: true,
    status,
    totalPages,
    scrapedPages,
    categorizedPages,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

export type CancelImportResult = { ok: true } | { ok: false; error: string };

/**
 * Cancel an in-progress import so the user can leave the progress page.
 */
export async function cancelContentImport(importId: string): Promise<CancelImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const job = await prisma.contentImport.findFirst({
    where: { id: importId, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!job) return { ok: false, error: 'Import not found' };

  const inProgressStatuses = ['PENDING', 'DISCOVERING', 'SCRAPING', 'CATEGORIZING'];
  if (!inProgressStatuses.includes(job.status)) {
    return { ok: false, error: 'Import is not in progress' };
  }

  await prisma.contentImport.update({
    where: { id: importId },
    data: {
      status: 'FAILED',
      errors: { step: 'cancelled', error: 'Import cancelled by user' },
    },
  });

  revalidatePath('/dashboard/content-library');
  return { ok: true };
}

const SUGGESTED_TYPE_MAP: Record<string, ContentType> = {
  case_study: 'SuccessStory',
  success_story: 'SuccessStory',
  customer_story: 'SuccessStory',
  event: 'CompanyEvent',
  webinar: 'CompanyEvent',
  conference: 'CompanyEvent',
  product: 'FeatureRelease',
  feature: 'FeatureRelease',
  solution: 'UseCase',
  use_case: 'UseCase',
  playbook: 'Framework',
  framework: 'Framework',
  methodology: 'Framework',
  pricing: 'ResourceLink',
  whitepaper: 'ResourceLink',
  guide: 'ResourceLink',
};

function suggestedTypeToContentType(suggested: string): ContentType {
  const normalized = suggested.toLowerCase().replace(/\s+/g, '_');
  if (normalized in SUGGESTED_TYPE_MAP) return SUGGESTED_TYPE_MAP[normalized];
  for (const [key, type] of Object.entries(SUGGESTED_TYPE_MAP)) {
    if (normalized.includes(key)) return type;
  }
  return 'ResourceLink';
}

export type ApprovedItem = {
  url: string;
  title: string;
  description?: string;
  suggestedType: string;
  industry?: string;
  department?: string;
};

export type ApproveImportedContentResult =
  | { ok: true; created: number; skipped: number; failed: number }
  | { ok: false; error: string };

/**
 * Create ContentLibrary rows for approved items and mark ContentImport as APPROVED.
 * Returns created, skipped (duplicates), and failed counts.
 */
export async function approveImportedContent(
  importId: string,
  approvedItems: ApprovedItem[]
): Promise<ApproveImportedContentResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const importJob = await prisma.contentImport.findFirst({
    where: { id: importId, userId: session.user.id },
  });
  if (!importJob) return { ok: false, error: 'Import not found' };
  if (importJob.status !== 'REVIEW_PENDING') {
    return { ok: false, error: 'Import is not pending review' };
  }

  let product = await prisma.product.findFirst({
    where: { userId: session.user.id, name: 'Company content' },
    select: { id: true },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        userId: session.user.id,
        name: 'Company content',
        description: 'Content from company setup / website import',
        category: 'Content',
      },
      select: { id: true },
    });
  }

  const urls = approvedItems.map((i) => i.url);
  const existingRows = await prisma.contentLibrary.findMany({
    where: {
      userId: session.user.id,
      sourceUrl: { in: urls },
      isActive: true,
    },
    select: { sourceUrl: true },
  });
  const existingUrlSet = new Set(existingRows.map((r) => r.sourceUrl));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of approvedItems) {
    if (existingUrlSet.has(item.url)) {
      skipped++;
      continue;
    }
    try {
      await prisma.contentLibrary.create({
        data: {
          userId: session.user.id,
          productId: product.id,
          title: item.title.slice(0, 500),
          type: suggestedTypeToContentType(item.suggestedType),
          content: { description: item.description ?? '', suggestedType: item.suggestedType },
          industry: item.industry ?? null,
          department: item.department ?? null,
          sourceUrl: item.url,
          userConfirmed: true,
          scrapedAt: new Date(),
        },
      });
      created++;
      existingUrlSet.add(item.url);
    } catch (err) {
      console.error(`Failed to create content library item for ${item.url}:`, err);
      failed++;
    }
  }

  await prisma.contentImport.update({
    where: { id: importId },
    data: {
      status: 'APPROVED',
      reviewedAt: new Date(),
      approvedCount: created,
      rejectedCount: approvedItems.length - created,
    },
  });

  revalidatePath('/dashboard/content-library');
  return { ok: true, created, skipped, failed };
}

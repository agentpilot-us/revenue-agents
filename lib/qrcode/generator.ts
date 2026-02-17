import QRCode from 'qrcode';
import { prisma } from '@/lib/db';

export interface QRCodeOptions {
  campaignId: string;
  name: string;
  shortCode?: string;
  departmentId?: string | null;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string | null;
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRCodeGenerationResult {
  id: string;
  shortCode: string;
  url: string;
  svg: string;
  dataUrl: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
}

async function generateShortCode(campaignId: string, name: string): Promise<string> {
  const campaign = await prisma.segmentCampaign.findUnique({
    where: { id: campaignId },
    include: { company: { select: { name: true } } },
  });
  if (!campaign) throw new Error('Campaign not found');
  const companySlug = slugify(campaign.company.name);
  const nameSlug = slugify(name);
  const base = `${companySlug}-${nameSlug}`.replace(/^-+|-+$/g, '') || 'qr';
  let shortCode = base;
  let counter = 1;
  while (await prisma.qRCode.findUnique({ where: { shortCode } })) {
    shortCode = `${base}-${counter}`;
    counter++;
  }
  return shortCode;
}

async function generateQRCodeImages({
  url,
  foregroundColor,
  backgroundColor,
  size,
  errorCorrection,
}: {
  url: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}): Promise<{ svg: string; dataUrl: string }> {
  const opts = {
    errorCorrectionLevel: errorCorrection,
    margin: 2,
    width: size,
    color: { dark: foregroundColor, light: backgroundColor },
  };
  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  const dataUrl = await QRCode.toDataURL(url, { ...opts, type: 'image/png' });
  return { svg, dataUrl };
}

export async function createQRCode(options: QRCodeOptions): Promise<QRCodeGenerationResult> {
  const {
    campaignId,
    name,
    shortCode: providedShortCode,
    departmentId,
    foregroundColor = '#000000',
    backgroundColor = '#FFFFFF',
    logoUrl,
    size = 512,
    errorCorrection = 'M',
  } = options;

  const finalShortCode = providedShortCode?.trim()
    ? slugify(providedShortCode)
    : await generateShortCode(campaignId, name);
  if (!finalShortCode) throw new Error('Short code cannot be empty');

  const existing = await prisma.qRCode.findUnique({ where: { shortCode: finalShortCode } });
  if (existing) throw new Error(`Short code "${finalShortCode}" is already in use`);

  const qrCode = await prisma.qRCode.create({
    data: {
      campaignId,
      name,
      shortCode: finalShortCode,
      departmentId: departmentId ?? undefined,
      foregroundColor,
      backgroundColor,
      logoUrl: logoUrl ?? undefined,
      size,
      errorCorrection,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/q/${qrCode.shortCode}`;

  const { svg, dataUrl } = await generateQRCodeImages({
    url,
    foregroundColor,
    backgroundColor,
    size,
    errorCorrection,
  });

  return {
    id: qrCode.id,
    shortCode: qrCode.shortCode,
    url,
    svg,
    dataUrl,
  };
}

export async function updateQRCode(
  id: string,
  options: Partial<Pick<QRCodeOptions, 'name' | 'foregroundColor' | 'backgroundColor' | 'logoUrl' | 'size' | 'errorCorrection'>>
): Promise<QRCodeGenerationResult> {
  const qrCode = await prisma.qRCode.update({
    where: { id },
    data: {
      ...(options.name != null && { name: options.name }),
      ...(options.foregroundColor != null && { foregroundColor: options.foregroundColor }),
      ...(options.backgroundColor != null && { backgroundColor: options.backgroundColor }),
      ...(options.logoUrl !== undefined && { logoUrl: options.logoUrl ?? null }),
      ...(options.size != null && { size: options.size }),
      ...(options.errorCorrection != null && { errorCorrection: options.errorCorrection }),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/q/${qrCode.shortCode}`;

  const { svg, dataUrl } = await generateQRCodeImages({
    url,
    foregroundColor: qrCode.foregroundColor,
    backgroundColor: qrCode.backgroundColor,
    size: qrCode.size,
    errorCorrection: qrCode.errorCorrection as 'L' | 'M' | 'Q' | 'H',
  });

  return {
    id: qrCode.id,
    shortCode: qrCode.shortCode,
    url,
    svg,
    dataUrl,
  };
}

export async function getQRCodeWithImages(
  id: string,
  sizeOverride?: number
): Promise<QRCodeGenerationResult> {
  const qrCode = await prisma.qRCode.findUnique({ where: { id } });
  if (!qrCode) throw new Error('QR code not found');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/q/${qrCode.shortCode}`;
  const size = sizeOverride ?? qrCode.size;
  const { svg, dataUrl } = await generateQRCodeImages({
    url,
    foregroundColor: qrCode.foregroundColor,
    backgroundColor: qrCode.backgroundColor,
    size,
    errorCorrection: qrCode.errorCorrection as 'L' | 'M' | 'Q' | 'H',
  });
  return {
    id: qrCode.id,
    shortCode: qrCode.shortCode,
    url,
    svg,
    dataUrl,
  };
}

export async function createQRCodesForDepartments(
  campaignId: string,
  baseOptions: Partial<Pick<QRCodeOptions, 'foregroundColor' | 'backgroundColor' | 'size' | 'errorCorrection'>>
): Promise<QRCodeGenerationResult[]> {
  const campaign = await prisma.segmentCampaign.findUnique({
    where: { id: campaignId },
    include: {
      company: {
        include: {
          departments: {
            select: { id: true, customName: true, type: true },
          },
        },
      },
    },
  });
  if (!campaign) throw new Error('Campaign not found');
  const departments = campaign.company.departments;
  if (departments.length === 0) throw new Error('No departments found for this campaign');

  const results: QRCodeGenerationResult[] = [];
  for (const dept of departments) {
    const deptName = dept.customName || String(dept.type).replace(/_/g, ' ');
    const result = await createQRCode({
      campaignId,
      name: deptName,
      departmentId: dept.id,
      ...baseOptions,
    });
    results.push(result);
  }
  return results;
}

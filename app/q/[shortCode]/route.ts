import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type DeptConfig = { departments?: Array<{ id: string; slug?: string }> };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortCode },
    include: {
      campaign: {
        select: {
          id: true,
          slug: true,
          isMultiDepartment: true,
          departmentConfig: true,
        },
      },
    },
  });

  if (!qrCode) {
    return NextResponse.redirect(`${baseUrl}/404`);
  }

  await prisma.qRCode.update({
    where: { id: qrCode.id },
    data: {
      scanCount: { increment: 1 },
      lastScannedAt: new Date(),
    },
  });

  const campaign = qrCode.campaign;
  let path = `/go/${campaign.slug}`;
  if (qrCode.departmentId && campaign.isMultiDepartment && campaign.departmentConfig) {
    const config = campaign.departmentConfig as DeptConfig;
    const dept = config.departments?.find((d) => d.id === qrCode.departmentId);
    if (dept?.slug) path += `/${dept.slug}`;
  }
  const utm = `utm_source=qr_code&utm_medium=offline&utm_campaign=${encodeURIComponent(qrCode.name)}`;
  const sep = path.includes('?') ? '&' : '?';
  const destination = `${baseUrl}${path}${sep}${utm}`;

  return NextResponse.redirect(destination, 302);
}

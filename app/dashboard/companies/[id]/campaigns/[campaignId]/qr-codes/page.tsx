import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { QRCodeManager } from './QRCodeManager';

export default async function CampaignQRCodesPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId, campaignId } = await params;

  const campaign = await prisma.segmentCampaign.findFirst({
    where: {
      id: campaignId,
      companyId,
      company: { userId: session.user.id },
    },
    include: {
      company: {
        select: {
          departments: {
            select: { id: true, customName: true, type: true },
          },
        },
      },
      qrCodes: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!campaign) notFound();

  const departments = campaign.company.departments;

  // Serialize dates to strings for client component
  const qrCodes = campaign.qrCodes.map((qr) => ({
    ...qr,
    lastScannedAt: qr.lastScannedAt?.toISOString() ?? null,
  }));

  return (
    <QRCodeManager
      companyId={companyId}
      campaign={{
        id: campaign.id,
        title: campaign.title,
        companyId: campaign.companyId,
      }}
      qrCodes={qrCodes}
      departments={departments}
    />
  );
}

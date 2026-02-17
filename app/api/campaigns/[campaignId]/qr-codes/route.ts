import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createQRCode } from '@/lib/qrcode/generator';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { campaignId } = await params;
  const campaign = await prisma.segmentCampaign.findFirst({
    where: {
      id: campaignId,
      company: { userId: session.user.id },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const result = await createQRCode({
      campaignId,
      name: body.name ?? 'QR Code',
      shortCode: body.shortCode?.trim() || undefined,
      departmentId: body.departmentId ?? undefined,
      foregroundColor: body.foregroundColor ?? '#000000',
      backgroundColor: body.backgroundColor ?? '#FFFFFF',
      logoUrl: body.logoUrl ?? undefined,
      size: body.size ?? 512,
      errorCorrection: body.errorCorrection ?? 'M',
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('Create QR code:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create QR code' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { campaignId } = await params;
  const campaign = await prisma.segmentCampaign.findFirst({
    where: {
      id: campaignId,
      company: { userId: session.user.id },
    },
    include: {
      qrCodes: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  return NextResponse.json(campaign.qrCodes);
}

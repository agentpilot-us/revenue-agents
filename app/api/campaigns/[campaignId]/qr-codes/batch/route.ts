import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createQRCodesForDepartments } from '@/lib/qrcode/generator';

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
    const results = await createQRCodesForDepartments(campaignId, {
      foregroundColor: body.foregroundColor ?? '#000000',
      backgroundColor: body.backgroundColor ?? '#FFFFFF',
      size: body.size ?? 512,
      errorCorrection: body.errorCorrection ?? 'M',
    });
    return NextResponse.json({ success: true, count: results.length, qrCodes: results });
  } catch (e) {
    console.error('Batch create QR codes:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create QR codes' },
      { status: 500 }
    );
  }
}

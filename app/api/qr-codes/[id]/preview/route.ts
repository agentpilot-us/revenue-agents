import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getQRCodeWithImages } from '@/lib/qrcode/generator';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sizeParam = _req.nextUrl.searchParams.get('size');
  const sizeOverride = sizeParam ? parseInt(sizeParam, 10) : 256;
  const qrCode = await prisma.qRCode.findFirst({
    where: {
      id,
      campaign: { company: { userId: session.user.id } },
    },
  });
  if (!qrCode) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }
  try {
    const result = await getQRCodeWithImages(id, sizeOverride);
    return NextResponse.json({ dataUrl: result.dataUrl });
  } catch (e) {
    console.error('QR code preview:', e);
    return NextResponse.json(
      { error: 'Failed to get preview' },
      { status: 500 }
    );
  }
}

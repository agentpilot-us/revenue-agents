import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getQRCodeWithImages } from '@/lib/qrcode/generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'png';
  const sizeParam = searchParams.get('size');
  const sizeOverride = sizeParam ? parseInt(sizeParam, 10) : undefined;

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
    if (format === 'svg') {
      return new NextResponse(result.svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="qr-code-${qrCode.shortCode}.svg"`,
        },
      });
    }
    const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-code-${qrCode.shortCode}.png"`,
      },
    });
  } catch (e) {
    console.error('QR code download:', e);
    return NextResponse.json(
      { error: 'Failed to download QR code' },
      { status: 500 }
    );
  }
}

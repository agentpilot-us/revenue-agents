import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { updateQRCode } from '@/lib/qrcode/generator';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
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
    const body = await req.json().catch(() => ({}));
    const result = await updateQRCode(id, {
      name: body.name,
      foregroundColor: body.foregroundColor,
      backgroundColor: body.backgroundColor,
      logoUrl: body.logoUrl,
      size: body.size,
      errorCorrection: body.errorCorrection,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('Update QR code:', e);
    return NextResponse.json(
      { error: 'Failed to update QR code' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
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
    await prisma.qRCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete QR code:', e);
    return NextResponse.json(
      { error: 'Failed to delete QR code' },
      { status: 500 }
    );
  }
}

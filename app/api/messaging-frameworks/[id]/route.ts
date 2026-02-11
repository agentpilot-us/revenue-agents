import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const framework = await prisma.messagingFramework.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!framework) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(framework);
}
async function updateFramework(req: NextRequest, params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.messagingFramework.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.content != null) data.content = String(body.content).trim();
  const framework = await prisma.messagingFramework.update({ where: { id }, data: data as Parameters<typeof prisma.messagingFramework.update>[0]['data'] });
  return NextResponse.json(framework);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateFramework(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateFramework(req, params);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.messagingFramework.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.messagingFramework.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const { personaId } = await params;

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
  });

  if (!persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
  }

  return NextResponse.json(persona);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const { personaId } = await params;
  const body = await req.json();

  try {
    const persona = await prisma.persona.update({
      where: { id: personaId },
      data: body,
    });
    return NextResponse.json(persona);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    throw error;
  }
}

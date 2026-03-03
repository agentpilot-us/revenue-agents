import { NextResponse } from 'next/server';
import { type PlayId, getStepsForPlay } from '@/lib/plays/plays-config';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playId: string }> },
) {
  const { playId } = await params;
  const steps = getStepsForPlay(playId as PlayId);
  return NextResponse.json({ steps });
}

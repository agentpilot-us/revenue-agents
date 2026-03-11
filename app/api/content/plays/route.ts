import { NextResponse } from 'next/server';
import { getAllPlays } from '@/lib/content/play-prompts';

export async function GET() {
  return NextResponse.json({ plays: getAllPlays() });
}

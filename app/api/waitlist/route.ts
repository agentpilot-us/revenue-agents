import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
  companyName: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message || 'Invalid input' },
        { status: 400 }
      );
    }
    const { email, companyName } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    await prisma.waitlistEntry.create({
      data: {
        email: normalizedEmail,
        companyName: companyName?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Waitlist POST error:', e);
    return NextResponse.json(
      { error: 'Failed to submit. Please try again.' },
      { status: 500 }
    );
  }
}

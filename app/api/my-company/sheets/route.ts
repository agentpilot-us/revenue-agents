import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const SheetConfigSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-expect-error MyCompanySheetConfig model is newly added; Prisma client types may not be regenerated yet.
  const config = await prisma.myCompanySheetConfig.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    spreadsheetId: config?.spreadsheetId ?? null,
    sheetName: config?.sheetName ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = SheetConfigSchema.parse(json);

    // @ts-expect-error MyCompanySheetConfig model is newly added; Prisma client types may not be regenerated yet.
    const config = await prisma.myCompanySheetConfig.upsert({
      where: { userId: session.user.id },
      update: {
        spreadsheetId: input.spreadsheetId,
        sheetName: input.sheetName,
      },
      create: {
        userId: session.user.id,
        spreadsheetId: input.spreadsheetId,
        sheetName: input.sheetName,
      },
    });

    return NextResponse.json({
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
    });
  } catch (error) {
    console.error('PATCH /api/my-company/sheets error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update Sheets config' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const departmentType = searchParams.get('department') as DepartmentType | null;

  const personas = await prisma.persona.findMany({
    where: departmentType
      ? {
          OR: [
            { primaryDepartment: departmentType },
            { secondaryDepartments: { has: departmentType } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(personas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const persona = await prisma.persona.create({
    data: body,
  });

  return NextResponse.json(persona);
}

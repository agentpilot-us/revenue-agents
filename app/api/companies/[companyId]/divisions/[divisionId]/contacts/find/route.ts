import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { findContactsForDepartment } from '@/app/actions/find-contacts';

const BodySchema = z.object({
  seniority: z
    .array(z.enum(['csuite', 'vp', 'director', 'manager_director', 'ic']))
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; divisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, divisionId } = await params;
    let body: z.infer<typeof BodySchema> = {};
    try {
      body = BodySchema.parse(await req.json());
    } catch {
      // empty / invalid body falls back to defaults
    }

    const seniorityLevels =
      body.seniority && body.seniority.length > 0
        ? body.seniority
        : (['vp', 'manager_director'] as const);

    const result = await findContactsForDepartment(
      companyId,
      divisionId,
      seniorityLevels,
      { apollo: true, linkedin: true }
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      steps: result.steps,
      results: result.results,
    });
  } catch (error) {
    console.error(
      'POST /api/companies/[companyId]/divisions/[divisionId]/contacts/find error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to find contacts for division' },
      { status: 500 }
    );
  }
}


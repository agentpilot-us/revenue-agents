import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const SendSchema = z.object({
  companyId: z.string(),
  divisionId: z.string().optional(),
  channel: z.enum(['email', 'linkedin_inmail']),
  contactIds: z.array(z.string()).min(1),
  subject: z.string().optional(),
  hook: z.string().optional(),
  body: z.string().min(1),
  contentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = SendSchema.parse(json);

    const company = await prisma.company.findFirst({
      where: { id: input.companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // For now, we treat "send" as a no-op that simply acknowledges the request.
    // Future work can hook this into the email/LinkedIn delivery pipeline.
    return NextResponse.json({
      ok: true,
      channel: input.channel,
      sentTo: input.contactIds.length,
    });
  } catch (error) {
    console.error('POST /api/content/send error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send content' },
      { status: 500 }
    );
  }
}


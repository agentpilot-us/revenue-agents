import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createGmailDraft } from '@/lib/integrations/google-workspace-tools';

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

    if (input.channel !== 'email') {
      return NextResponse.json(
        { error: 'Direct server-side send is only available for email drafts.' },
        { status: 400 },
      );
    }

    const contacts = await prisma.contact.findMany({
      where: {
        companyId: input.companyId,
        id: { in: input.contactIds },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const contactsWithEmail = contacts.filter(
      (contact): contact is typeof contact & { email: string } => typeof contact.email === 'string',
    );
    if (contactsWithEmail.length === 0) {
      return NextResponse.json(
        { error: 'None of the selected contacts have email addresses.' },
        { status: 400 },
      );
    }

    const drafts = await Promise.all(
      contactsWithEmail.map(async (contact) => {
        const result = await createGmailDraft({
          userId: session.user.id,
          to: contact.email,
          subject: input.subject ?? 'Draft from AgentPilot',
          body: input.body,
        });
        return {
          contactId: contact.id,
          email: contact.email,
          url: result.url,
          draftId: result.id,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      channel: input.channel,
      draftsCreated: drafts.length,
      drafts,
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


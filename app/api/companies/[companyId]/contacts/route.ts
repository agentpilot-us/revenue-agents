import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
});
const postBodySchema = z.object({
  contacts: z.array(createContactSchema),
  departmentId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json();
    const { contacts: inputContacts, departmentId } = postBodySchema.parse(body);

    if (departmentId) {
      const dept = await prisma.companyDepartment.findFirst({
        where: { id: departmentId, companyId },
      });
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }
    }

    const contactIds: string[] = [];
    let added = 0;
    let skipped = 0;

    for (const c of inputContacts) {
      const email = (c.email?.trim() || null) ?? null;
      const firstName = c.firstName?.trim() || null;
      const lastName = c.lastName?.trim() || null;
      const title = c.title?.trim() || null;
      const phone = c.phone?.trim() || null;
      const linkedinUrl = (c.linkedinUrl?.trim() || null) ?? null;

      if (!firstName && !lastName && !email) continue;

      if (email) {
        const existing = await prisma.contact.findUnique({
          where: { email_companyId: { email, companyId } },
        });
        if (existing) {
          if (departmentId && !existing.companyDepartmentId) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: { companyDepartmentId: departmentId },
            });
            contactIds.push(existing.id);
            added++;
          } else {
            skipped++;
          }
          continue;
        }
      }

      const created = await prisma.contact.create({
        data: {
          companyId,
          companyDepartmentId: departmentId ?? null,
          firstName,
          lastName,
          email,
          phone,
          title,
          linkedinUrl,
        },
      });
      contactIds.push(created.id);
      added++;
    }

    return NextResponse.json({ ok: true, added, skipped, contactIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Contacts create error:', error);
    return NextResponse.json({ error: 'Failed to create contacts' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const contacts = await prisma.contact.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, title: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Contacts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

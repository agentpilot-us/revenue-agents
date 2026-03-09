import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contactId } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, company: { userId: session.user.id } },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id: contactId } });

  return NextResponse.json({ success: true });
}

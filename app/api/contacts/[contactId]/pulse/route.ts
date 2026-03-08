import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getContactPulse } from '@/lib/contacts/contact-pulse';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contactId } = await params;

  const pulse = await getContactPulse(contactId, session.user.id);
  if (!pulse) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json(pulse);
}

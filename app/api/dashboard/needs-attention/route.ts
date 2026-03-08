import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNeedsAttentionContacts } from '@/lib/contacts/contact-pulse';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contacts = await getNeedsAttentionContacts(session.user.id, 15);

  return NextResponse.json({ contacts });
}

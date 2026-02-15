import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isCrmConfigured } from '@/lib/crm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      salesforce: isCrmConfigured('salesforce'),
      hubspot: isCrmConfigured('hubspot'),
    });
  } catch (e) {
    console.error('GET /api/crm/status', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { salesforceFetchAccounts } from '@/lib/crm/salesforce';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get('search') ?? undefined;
    const accounts = await salesforceFetchAccounts(search, session.user.id);
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error('GET /api/crm/accounts', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

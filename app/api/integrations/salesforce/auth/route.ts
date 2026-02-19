import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSalesforceAuthUrl } from '@/lib/integrations/salesforce-oauth';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state token for CSRF protection
    const state = randomBytes(32).toString('hex');
    
    // Store state in session/cookie (simplified - in production, use secure session storage)
    const authUrl = getSalesforceAuthUrl(state);

    // Redirect to Salesforce OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Salesforce auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Salesforce OAuth' },
      { status: 500 }
    );
  }
}

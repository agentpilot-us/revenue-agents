import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test if we can query the Session table
    const sessionCount = await prisma.session.count();
    
    // Try to get the first session to verify structure
    const firstSession = await prisma.session.findFirst();
    
    return NextResponse.json({ 
      success: true, 
      sessionCount,
      firstSession: firstSession ? {
        id: firstSession.id,
        sessionToken: firstSession.sessionToken ? 'exists' : 'missing',
        userId: firstSession.userId ? 'exists' : 'missing',
        expires: firstSession.expires ? 'exists' : 'missing',
      } : null,
      message: 'Session table is accessible!' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 });
  }
}

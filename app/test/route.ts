import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'App is running!',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasNextAuthSecret: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
      nodeEnv: process.env.NODE_ENV,
    }
  });
}

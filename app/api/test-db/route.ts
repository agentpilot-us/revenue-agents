import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      userCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId is required' }, { status: 400 });
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const contentItems = await prisma.companyDepartmentContent.findMany({
      where: { companyDepartmentId: departmentId },
      select: {
        contentType: true,
        content: true,
      },
    });

    const content: {
      emailSubject: string | null;
      emailBody: string | null;
      linkedinMessage: string | null;
      talkTrack: string | null;
    } = {
      emailSubject: null,
      emailBody: null,
      linkedinMessage: null,
      talkTrack: null,
    };

    for (const item of contentItems) {
      if (item.contentType === 'email_subject') {
        content.emailSubject = item.content;
      } else if (item.contentType === 'email_body') {
        content.emailBody = item.content;
      } else if (item.contentType === 'linkedin_message') {
        content.linkedinMessage = item.content;
      } else if (item.contentType === 'talk_track') {
        content.talkTrack = item.content;
      }
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error('GET /api/companies/[companyId]/content error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const body = await req.json();
    const departmentId = body.departmentId as string;
    const contentType = body.contentType as string;
    const content = body.content as string;

    if (!departmentId || !contentType || content === undefined) {
      return NextResponse.json(
        { error: 'departmentId, contentType, and content are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Map content type to database field
    const dbContentType =
      contentType === 'email' || contentType === 'email_body'
        ? 'email_body'
        : contentType === 'email_subject'
          ? 'email_subject'
          : contentType === 'linkedin' || contentType === 'linkedin_message'
            ? 'linkedin_message'
            : contentType === 'talk_track'
              ? 'talk_track'
              : contentType;

    await prisma.companyDepartmentContent.upsert({
      where: {
        companyDepartmentId_contentType: {
          companyDepartmentId: departmentId,
          contentType: dbContentType,
        },
      },
      create: {
        companyDepartmentId: departmentId,
        contentType: dbContentType,
        content,
      },
      update: {
        content,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/companies/[companyId]/content error:', error);
    return NextResponse.json(
      { error: 'Failed to save content' },
      { status: 500 }
    );
  }
}

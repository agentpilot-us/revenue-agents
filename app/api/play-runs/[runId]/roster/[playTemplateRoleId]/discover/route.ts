import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { findContactsForSegment } from '@/lib/tools/contact-finder';

/**
 * POST /api/play-runs/[runId]/roster/[playTemplateRoleId]/discover
 * Apollo search scoped to run company + division + template role title hints.
 * Returns candidates only; client confirms then PATCH /roster.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; playTemplateRoleId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, playTemplateRoleId } = await params;

    const run = await prisma.playRun.findFirst({
      where: { id: runId, userId: session.user.id },
      include: {
        company: { select: { id: true, name: true, domain: true } },
        roadmapTarget: {
          select: {
            companyDepartmentId: true,
            name: true,
            companyDepartment: { select: { orgDepartment: true, searchKeywords: true } },
          },
        },
      },
    });
    if (!run) {
      return NextResponse.json({ error: 'Play run not found' }, { status: 404 });
    }

    const role = await prisma.playTemplateRole.findFirst({
      where: { id: playTemplateRoleId, playTemplateId: run.playTemplateId },
      select: { id: true, apolloTitleTerms: true, label: true, key: true },
    });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const domain = run.company.domain?.replace(/^www\./, '') ?? '';
    if (!domain) {
      return NextResponse.json(
        { error: 'Company domain is required for contact discovery' },
        { status: 400 },
      );
    }

    const dept =
      run.roadmapTarget?.companyDepartment ??
      (run.targetCompanyDepartmentId ?
        await prisma.companyDepartment.findFirst({
          where: { id: run.targetCompanyDepartmentId, companyId: run.companyId },
          select: { orgDepartment: true, searchKeywords: true },
        })
      : null);

    const titleHints: string[] = [];
    if (role.apolloTitleTerms?.trim()) {
      titleHints.push(
        ...role.apolloTitleTerms
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
    titleHints.push(role.label);
    const keywords =
      dept?.searchKeywords != null && Array.isArray(dept.searchKeywords) ?
        (dept.searchKeywords as string[])
      : undefined;

    try {
      const people = await findContactsForSegment({
        companyDomain: domain,
        companyName: run.company.name,
        targetRoles: titleHints.length ? titleHints : undefined,
        keywords,
        maxResults: 12,
      });
      return NextResponse.json({ candidates: people });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Discovery failed';
      return NextResponse.json({ error: msg, candidates: [] }, { status: 502 });
    }
  } catch (error) {
    console.error('POST discover roster error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 },
    );
  }
}

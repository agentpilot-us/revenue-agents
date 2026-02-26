/**
 * finalize-celigo-demo.ts
 *
 * Fixes demo issues + ensures all 4 buying groups exist:
 *  1. Diagnoses why RevOps is missing and fixes it
 *  2. Updates stale "5 buying groups identified" activity
 *  3. Sets workflowStep=3 so "Research buying groups" task disappears
 *  4. Prints signal → segment mapping for contacts sidebar verification
 *  5. Locks company as demo account
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/finalize-celigo-demo.ts
 */

import { DepartmentStatus, DepartmentType } from '@prisma/client';
import { prisma } from '@/lib/db';

// The 4 groups that must exist — customName and DepartmentType
const REQUIRED_GROUPS: { name: string; type: DepartmentType }[] = [
  { name: 'RevOps', type: DepartmentType.REVENUE_OPERATIONS },
  { name: 'IT', type: DepartmentType.IT_DATA_CENTER },
  { name: 'PeopleOps', type: DepartmentType.HR },
  { name: 'Finance', type: DepartmentType.FINANCE },
];

async function main() {
  // ── Find Lattice ─────────────────────────────────────────────────────────
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: 'Lattice HQ', mode: 'insensitive' } },
        { domain: { equals: 'lattice.com', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      userId: true,
      workflowStep: true,
      accountIntelligenceCompletedAt: true,
      isDemoAccount: true,
    },
  });

  if (!company) {
    console.log('❌  Lattice HQ not found.');
    return;
  }
  console.log(`\n✅  Found: ${company.name} (${company.id})\n`);

  // ── Diagnose all existing departments ────────────────────────────────────
  const allDepts = await prisma.companyDepartment.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`── Current departments (${allDepts.length}) ─────────────────────────────`);
  for (const d of allDepts) {
    const count = (d as { _count: { contacts: number } })._count.contacts;
    console.log(
      `  customName: ${(d.customName ?? '(none)').padEnd(20)}` +
        `  type: ${d.type.padEnd(25)}` +
        `  contacts: ${count}` +
        `  id: ${d.id}`
    );
  }
  console.log('');

  // ── Fix 1: Ensure all 4 required groups exist ────────────────────────────
  console.log('── Ensuring 4 required buying groups exist ──────────────────────');

  for (const required of REQUIRED_GROUPS) {
    // Match by customName first, then by type
    const existing = allDepts.find(
      (d) => d.customName === required.name || d.type === required.type
    );

    if (existing) {
      const count = (existing as { _count: { contacts: number } })._count.contacts;
      // If found by type but customName is wrong/missing, fix the customName
      if (existing.customName !== required.name) {
        await prisma.companyDepartment.update({
          where: { id: existing.id },
          data: { customName: required.name },
        });
        console.log(`  ✅  Fixed customName: ${existing.customName ?? existing.type} → ${required.name}`);
      } else {
        console.log(`  ✅  ${required.name} exists (${count} contacts)`);
      }
    } else {
      // Doesn't exist at all — create it
      // Check if the unique constraint (companyId, type) would conflict
      const typeConflict = allDepts.find((d) => d.type === required.type);
      if (typeConflict) {
        // Type exists but under a different name — just rename
        await prisma.companyDepartment.update({
          where: { id: typeConflict.id },
          data: { customName: required.name },
        });
        console.log(`  ✅  Renamed "${typeConflict.customName ?? typeConflict.type}" → "${required.name}"`);
      } else {
        // Create fresh
        await prisma.companyDepartment.create({
          data: {
            companyId: company.id,
            type: required.type,
            customName: required.name,
            status: DepartmentStatus.NOT_ENGAGED,
          },
        });
        console.log(`  ➕  Created missing group: ${required.name} (type: ${required.type})`);
      }
    }
  }

  // ── Verify final state ───────────────────────────────────────────────────
  const finalDepts = await prisma.companyDepartment.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n── Final departments (${finalDepts.length}) ──────────────────────────────────`);
  for (const d of finalDepts) {
    const name = d.customName ?? d.type;
    const isRequired = REQUIRED_GROUPS.some((r) => r.name === d.customName);
    const marker = isRequired ? '✅' : '⚠️ ';
    const count = (d as { _count: { contacts: number } })._count.contacts;
    console.log(`  ${marker}  ${name.padEnd(20)}  contacts: ${count}  id: ${d.id}`);
  }
  console.log('');

  // ── Fix 2: Update stale buying groups activity ───────────────────────────
  const deptCount = finalDepts.filter((d) =>
    REQUIRED_GROUPS.some((r) => r.name === d.customName)
  ).length;

  const staleActivity = await prisma.activity.findFirst({
    where: {
      companyId: company.id,
      summary: { contains: 'buying group' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (staleActivity) {
    await prisma.activity.update({
      where: { id: staleActivity.id },
      data: {
        summary: `Account research completed. ${deptCount} buying group(s) identified.`,
      },
    });
    console.log(`✅  Activity updated: "${deptCount} buying group(s) identified."`);
  } else {
    console.log(`ℹ️   No buying groups activity found to update.`);
  }

  // ── Fix 3: Set workflow step to complete ─────────────────────────────────
  await prisma.company.update({
    where: { id: company.id },
    data: {
      workflowStep: 3,
      accountIntelligenceCompletedAt:
        company.accountIntelligenceCompletedAt ?? new Date(),
    },
  });
  console.log(`✅  workflowStep=3, accountIntelligenceCompletedAt set.`);

  // ── Fix 4: Lock as demo account ───────────────────────────────────────────
  if (!company.isDemoAccount) {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        isDemoAccount: true,
        demoVertical: 'saas',
        demoNote:
          'Celigo/Lattice SaaS demo — finalized ' +
          new Date().toISOString().split('T')[0],
      },
    });
    console.log(`✅  Locked as demo account.`);
  } else {
    console.log(`ℹ️   Already a demo account.`);
  }

  // ── Fix 5: Print signal → segment for contacts sidebar check ─────────────
  console.log(`\n── Signals (for contacts sidebar verification) ──────────────────`);
  const signals = await prisma.accountSignal.findMany({
    where: { companyId: company.id },
    select: { id: true, title: true, suggestedPlay: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  for (const s of signals) {
    console.log(
      `  [${(s.status ?? '').padEnd(6)}] ${(s.suggestedPlay ?? 'none').padEnd(24)} "${s.title.substring(0, 55)}"`
    );
    console.log(`            signal id: ${s.id}`);
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  console.log(`
── Verify in the dashboard ──────────────────────────────────────
  [ ] Account Radar shows 4 groups: RevOps, IT, PeopleOps, Finance
  [ ] Activity feed says "${deptCount} buying group(s) identified"
  [ ] "Research Lattice buying groups" gone from Today's Tasks
  [ ] Run Feature Release play → contacts sidebar populated
  [ ] BUYING GROUPS MAPPED counter in top bar shows 4
──────────────────────────────────────────────────────────────────
`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

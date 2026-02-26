/**
 * Clean up Celigo demo: remove extra buying groups that are NOT in the
 * known-good set (RevOps, IT, PeopleOps, Finance).
 *
 * Changes from original:
 *  1. Primary gate is name exclusion, not 0-contacts. If a keeper group
 *     somehow ends up empty it won't get deleted.
 *  2. Dry-run preview + confirmation before any deletes fire.
 *  3. Also reports keeper groups so you can verify they're intact.
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/cleanup-celigo-demo-departments.ts
 * Dry-run only: DRY_RUN=1 npx dotenv -e .env.local -- tsx prisma/cleanup-celigo-demo-departments.ts
 */

import { prisma } from '@/lib/db';
import * as readline from 'readline';

// The 4 segments that must survive — match against customName
const KEEP = new Set(['RevOps', 'IT', 'PeopleOps', 'Finance']);

const DRY_RUN = process.env.DRY_RUN === '1';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  // ── Find company ────────────────────────────────────────────────────────
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: 'Lattice HQ', mode: 'insensitive' } },
        { domain: { equals: 'lattice.com', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, domain: true },
  });

  if (!company) {
    console.log('❌  No company named "Lattice HQ" or with domain lattice.com found. Nothing to clean.');
    return;
  }

  console.log(`\n✅  Found company: ${company.name} (id: ${company.id}, domain: ${company.domain ?? 'none'})\n`);

  // ── Load all departments with contact counts ─────────────────────────────
  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const keepers = departments.filter((d) => KEEP.has(d.customName ?? ''));
  // Primary gate: delete anything not in KEEP — regardless of contact count
  const toDelete = departments.filter((d) => !KEEP.has(d.customName ?? ''));

  // ── Print keepers ────────────────────────────────────────────────────────
  console.log('KEEPING (will not be touched):');
  if (keepers.length === 0) {
    console.log('  ⚠️  None of the expected 4 groups found — check that seed ran correctly');
  } else {
    for (const d of keepers) {
      const label = d.customName ?? d.type;
      console.log(`  ✅  ${label.padEnd(20)} ${d._count.contacts} contacts`);
    }
  }

  // ── Print deletions ──────────────────────────────────────────────────────
  console.log('\nTO DELETE:');
  if (toDelete.length === 0) {
    console.log('  Nothing to delete — demo looks clean already.');
    return;
  }
  for (const d of toDelete) {
    const label = (d.customName ?? d.type).padEnd(35);
    const contacts = d._count.contacts;
    const warn = contacts > 0 ? ' ⚠️  HAS CONTACTS' : '';
    console.log(`  🗑   ${label} ${contacts} contacts${warn}`);
  }

  // Warn if any group being deleted has contacts
  const hasContactsWarning = toDelete.some((d) => d._count.contacts > 0);
  if (hasContactsWarning) {
    console.log('\n⚠️  WARNING: Some groups being deleted have contacts. Those contacts will be unassigned (SetNull), not deleted.');
  }

  if (DRY_RUN) {
    console.log('\n🔍  DRY RUN — no changes made. Remove DRY_RUN=1 to execute.');
    return;
  }

  // ── Confirm ──────────────────────────────────────────────────────────────
  const answer = await ask(`\nDelete ${toDelete.length} department(s) from ${company.name}? [y/N] `);
  if (answer !== 'y') {
    console.log('Aborted — no changes made.');
    return;
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  let deleted = 0;
  for (const d of toDelete) {
    await prisma.companyDepartment.delete({ where: { id: d.id } });
    console.log(`  Deleted: ${d.customName ?? d.type}`);
    deleted++;
  }

  console.log(`\n✅  Done. Removed ${deleted} department(s). Keepers: ${keepers.length}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

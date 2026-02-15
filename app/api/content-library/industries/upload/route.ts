import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      current.push(field.trim());
      field = '';
      if (c === '\n') {
        if (current.some((cell) => cell !== '')) rows.push(current);
        current = [];
      }
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || current.length > 0) {
    current.push(field.trim());
    if (current.some((cell) => cell !== '')) rows.push(current);
  }
  return rows;
}

/**
 * POST /api/content-library/industries/upload
 * Body: multipart/form-data with file (CSV).
 * CSV columns: name (required), overview, buyingCommittee, landmines (comma-separated in cell)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      return NextResponse.json(
        {
          error:
            'Only CSV files are supported. Use columns: name, overview, buyingCommittee, landmines',
        },
        { status: 400 }
      );
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json({
        error: 'CSV must have a header row and at least one data row',
      }, { status: 400 });
    }

    const header = rows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, ''));
    const nameIdx = header.indexOf('name');
    if (nameIdx === -1) {
      return NextResponse.json({ error: 'CSV must have a "name" column' }, { status: 400 });
    }

    const getIdx = (col: string) => {
      const i = header.indexOf(col);
      if (i >= 0) return i;
      return header.indexOf(col.replace(/\s/g, ''));
    };
    const overviewIdx = getIdx('overview');
    const buyingCommitteeIdx = getIdx('buyingcommittee');
    const landminesIdx = getIdx('landmines');

    const created: string[] = [];
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      const slug = slugify(name) || `industry-${r}`;
      const existing = await prisma.industryPlaybook.findUnique({
        where: { userId_slug: { userId: session.user.id, slug } },
      });
      if (existing) {
        errors.push(`Row ${r + 1}: industry "${name}" already exists. Skipped.`);
        continue;
      }

      const overview = overviewIdx >= 0 ? row[overviewIdx]?.trim() || undefined : undefined;
      const buyingCommittee =
        buyingCommitteeIdx >= 0 ? row[buyingCommitteeIdx]?.trim() || undefined : undefined;
      const landminesStr = landminesIdx >= 0 ? row[landminesIdx]?.trim() : '';
      const landmines = landminesStr
        ? landminesStr.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      try {
        await prisma.industryPlaybook.create({
          data: {
            userId: session.user.id,
            name,
            slug,
            overview,
            buyingCommittee,
            landmines,
          },
        });
        created.push(name);
      } catch (e) {
        const msg =
          e && typeof e === 'object' && 'code' in e && e.code === 'P2002'
            ? 'Duplicate slug for this user'
            : String(e);
        errors.push(`Row ${r + 1} (${name}): ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      createdNames: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Industry upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload industry playbooks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

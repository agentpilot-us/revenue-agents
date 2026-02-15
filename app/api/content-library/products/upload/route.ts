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
 * POST /api/content-library/products/upload
 * Body: multipart/form-data with file (CSV).
 * CSV columns: name (required), description, priceMin, priceMax, pricingModel, category (or contentTags)
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
      return NextResponse.json({ error: 'Only CSV files are supported. Use columns: name, description, priceMin, priceMax, pricingModel, category' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    const header = rows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, ''));
    const nameIdx = header.indexOf('name');
    if (nameIdx === -1) {
      return NextResponse.json({ error: 'CSV must have a "name" column' }, { status: 400 });
    }

    const getIdx = (col: string) => {
      const i = header.indexOf(col);
      if (i >= 0) return i;
      const alt = header.indexOf(col.replace(/\s/g, ''));
      return alt;
    };
    const descIdx = getIdx('description');
    const priceMinIdx = getIdx('pricemin');
    const priceMaxIdx = getIdx('pricemax');
    const priceIdx = header.indexOf('price'); // single price column
    const pricingModelIdx = getIdx('pricingmodel');
    const categoryIdx = getIdx('category');
    const contentTagsIdx = getIdx('contenttags');

    const created: string[] = [];
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      let slug = slugify(name);
      if (!slug) slug = `product-${r}`;
      const existing = await prisma.catalogProduct.findUnique({ where: { slug } });
      if (existing) {
        errors.push(`Row ${r + 1}: product "${name}" already exists (slug: ${slug}). Skipped.`);
        continue;
      }

      const description = descIdx >= 0 ? row[descIdx]?.trim() || undefined : undefined;
      let priceMin: number | undefined;
      let priceMax: number | undefined;
      if (priceMinIdx >= 0 && row[priceMinIdx]) {
        const n = parseFloat(row[priceMinIdx].replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n)) priceMin = n;
      }
      if (priceMaxIdx >= 0 && row[priceMaxIdx]) {
        const n = parseFloat(row[priceMaxIdx].replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n)) priceMax = n;
      }
      if (priceIdx >= 0 && row[priceIdx] && priceMin === undefined && priceMax === undefined) {
        const n = parseFloat(row[priceIdx].replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n)) {
          priceMin = n;
          priceMax = n;
        }
      }
      const pricingModel = pricingModelIdx >= 0 ? row[pricingModelIdx]?.trim() || undefined : undefined;
      const categoryStr = categoryIdx >= 0 ? row[categoryIdx]?.trim() : contentTagsIdx >= 0 ? row[contentTagsIdx]?.trim() : '';
      const contentTags = categoryStr ? categoryStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

      try {
        await prisma.catalogProduct.create({
          data: {
            name,
            slug,
            description,
            priceMin: priceMin != null ? priceMin : undefined,
            priceMax: priceMax != null ? priceMax : undefined,
            pricingModel,
            targetDepartments: [],
            targetPersonas: [],
            useCases: [],
            contentTags,
          },
        });
        created.push(name);
      } catch (e) {
        const msg = e && typeof e === 'object' && 'code' in e && e.code === 'P2002' ? 'Duplicate name or slug' : String(e);
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
    console.error('Product upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

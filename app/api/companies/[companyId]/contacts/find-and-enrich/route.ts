/**
 * POST /api/companies/[companyId]/contacts/find-and-enrich
 * Find contacts for all (or selected) buying groups and enrich them.
 * Streams progress via SSE. maxDuration = 120 for long-running runs.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { findAndEnrichContactsForCompany, type FindAndEnrichProgress } from '@/app/actions/find-contacts';

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { companyId } = await params;
  let body: { departmentIds?: string[]; maxPerDept?: number } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is ok
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const send = (event: FindAndEnrichProgress) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  (async () => {
    try {
      const result = await findAndEnrichContactsForCompany(companyId, {
        departmentIds: body.departmentIds,
        maxPerDept: body.maxPerDept,
        onProgress: send,
      });
      if (!result.ok) {
        send({ type: 'error', message: result.error });
      }
    } catch (e) {
      send({
        type: 'error',
        message: e instanceof Error ? e.message : 'Find and enrich failed',
      });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

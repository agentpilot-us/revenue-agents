import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { POST as generate } from '@/app/api/content/generate/route';

// Lightweight wrapper for now: treat regenerate as another generate call,
// optionally incorporating user feedback on the client side into the prompt
// before calling this endpoint.

const RegenerateSchema = z.object({
  contentId: z.string(),
  companyId: z.string(),
  divisionId: z.string().optional(),
  channel: z.enum(['email', 'linkedin_inmail']),
  persona: z.enum(['csuite', 'vp', 'director', 'all']).optional(),
  contactIds: z.array(z.string()).optional(),
  triggerId: z.string().optional(),
  activeActionIndex: z.number().int().min(0).optional(),
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = RegenerateSchema.parse(json);

    // For now we ignore the old contentId and feedback at the model layer and
    // just call the generate endpoint with the same shape it expects.
    const forwardedRequest = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        companyId: input.companyId,
        divisionId: input.divisionId,
        channel: input.channel,
        persona: input.persona,
        contactIds: input.contactIds,
        triggerId: input.triggerId,
        activeActionIndex: input.activeActionIndex,
      }),
    });

    // Reuse generate implementation
    // @ts-expect-error NextRequest subtype is compatible for our use here
    return await generate(forwardedRequest);
  } catch (error) {
    console.error('POST /api/content/regenerate error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to regenerate content' },
      { status: 500 }
    );
  }
}


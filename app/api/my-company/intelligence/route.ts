import { NextResponse } from 'next/server';

// Phase 1: minimal stub for My Company intelligence.
// This will later read/write structured intelligence for the AE's own company.

export async function GET() {
  return NextResponse.json({
    companyName: null,
    industry: null,
    keyInitiatives: [],
    valuePropositions: [],
    segments: [],
    lastUpdatedAt: null,
  });
}

export async function PATCH() {
  // Accept payload later; for now just acknowledge.
  return NextResponse.json(
    { ok: true, message: 'PATCH /api/my-company/intelligence not implemented yet' },
    { status: 202 }
  );
}


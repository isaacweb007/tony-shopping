/**
 * GET /api/status
 *
 * Returns the live/mock state for every adapter (search merchants, Vision,
 * LLM) so the UI can show "Live: Naver + eBay" instead of silently serving
 * mock data. Public — does not reveal key values, only the boolean state.
 */
import { NextResponse } from 'next/server';
import { getAdapterStatuses, getOverallStatus } from '@/lib/adapter-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      adapters: getAdapterStatuses(),
      overall: getOverallStatus(),
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    },
  );
}

/**
 * GET /api/search/stream?q=...&locale=...
 *
 * Two-phase streaming search as newline-delimited JSON (NDJSON):
 *   line 1: {"phase":"fast","result":<Jaccard-clustered SearchResult>}
 *   line 2: {"phase":"refined","result":<LLM-clustered SearchResult>}
 *
 * The client renders phase 1 the moment it arrives (~adapter latency only,
 * typically <1.5 s) and seamlessly swaps in phase 2 when Claude clustering
 * finishes (~+2-3 s). One SerpAPI call total — the raw products are fetched
 * once and clustered two ways server-side.
 *
 * On error, emits {"phase":"error","message":...} so the client can show a
 * failure state instead of hanging.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runServerSearchStreaming } from '@/lib/search/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q: z.string().min(1).max(500),
  locale: z.enum(['ko', 'en', 'vi']).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    q: req.nextUrl.searchParams.get('q') ?? '',
    locale: req.nextUrl.searchParams.get('locale') ?? undefined,
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { q, locale } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };
      try {
        const refined = await runServerSearchStreaming(
          { q, attachments: [] },
          { signal: req.signal, locale },
          (fast) => emit({ phase: 'fast', result: fast }),
        );
        emit({ phase: 'refined', result: refined });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'search_failed';
        emit({ phase: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // Disable proxy buffering so chunks flush immediately.
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Per-process in-memory telemetry for adapter calls.
 *
 * Records the most recent invocation per adapter (wall time, duration,
 * success/failure, result count). Reset on each Node process restart —
 * acceptable for an operator overview UI, not for SLA tracking.
 *
 * Vercel serverless: instances are ephemeral, so the same /setup load may
 * see different snapshots depending on which lambda instance answered the
 * request. That's fine — the UI just says "last seen by *this* instance".
 */
import 'server-only';
import type { StoreId } from '@/types/product';

export interface AdapterCallStat {
  /** ms since epoch when the last call completed. */
  lastAt: number;
  /** Wall-clock duration of the last call in ms. */
  lastDurationMs: number;
  /** Whether the last call returned products without throwing. */
  lastOk: boolean;
  /** Result count returned by the last call. */
  lastResultCount: number;
}

/**
 * Pinned to globalThis so the map survives Next dev's per-request module
 * isolation between route handlers (/api/search) and server components
 * (/setup). In production this just behaves like a normal singleton.
 */
type StatsGlobal = typeof globalThis & {
  __tonyAdapterStats?: Map<StoreId, AdapterCallStat>;
};
const g = globalThis as StatsGlobal;
if (!g.__tonyAdapterStats) g.__tonyAdapterStats = new Map<StoreId, AdapterCallStat>();
const stats = g.__tonyAdapterStats;

export function recordAdapterCall(store: StoreId, stat: AdapterCallStat): void {
  stats.set(store, stat);
}

export function getAdapterStats(): Record<string, AdapterCallStat> {
  const out: Record<string, AdapterCallStat> = {};
  for (const [k, v] of stats.entries()) out[k] = v;
  return out;
}

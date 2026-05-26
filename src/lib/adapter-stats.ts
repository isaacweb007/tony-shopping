/**
 * Per-process in-memory telemetry for adapter calls.
 *
 * Records the most recent invocation per adapter (wall time, duration,
 * success/failure, result count) plus a small ring buffer of the last
 * MAX_HISTORY durations for the /setup sparkline. Reset on each Node
 * process restart — acceptable for an operator overview UI, not for
 * SLA tracking.
 *
 * Vercel serverless: instances are ephemeral, so the same /setup load may
 * see different snapshots depending on which lambda instance answered the
 * request. That's fine — the UI just says "last seen by *this* instance".
 */
import 'server-only';
import type { StoreId } from '@/types/product';

const MAX_HISTORY = 10;

export interface AdapterHistoryPoint {
  at: number;
  durationMs: number;
  ok: boolean;
}

export interface AdapterCallStat {
  /** ms since epoch when the last call completed. */
  lastAt: number;
  /** Wall-clock duration of the last call in ms. */
  lastDurationMs: number;
  /** Whether the last call returned products without throwing. */
  lastOk: boolean;
  /** Result count returned by the last call. */
  lastResultCount: number;
  /** Oldest → newest; capped at MAX_HISTORY. */
  history: AdapterHistoryPoint[];
  /** First 200 chars of the most recent failure message — surfaced on /setup. */
  lastError: string | null;
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

interface RecordInput {
  lastAt: number;
  lastDurationMs: number;
  lastOk: boolean;
  lastResultCount: number;
  /** Optional failure message — only set when lastOk = false. */
  lastError?: string | null;
}

const MAX_ERR_LEN = 200;

export function recordAdapterCall(store: StoreId, stat: RecordInput): void {
  const prev = stats.get(store);
  const nextHistory = [
    ...(prev?.history ?? []),
    { at: stat.lastAt, durationMs: stat.lastDurationMs, ok: stat.lastOk },
  ].slice(-MAX_HISTORY);
  // Successful calls clear the prior error so a transient failure
  // doesn't haunt the card forever. Failed calls overwrite it.
  const lastError = stat.lastOk
    ? null
    : typeof stat.lastError === 'string'
      ? stat.lastError.slice(0, MAX_ERR_LEN)
      : (prev?.lastError ?? null);
  stats.set(store, {
    lastAt: stat.lastAt,
    lastDurationMs: stat.lastDurationMs,
    lastOk: stat.lastOk,
    lastResultCount: stat.lastResultCount,
    history: nextHistory,
    lastError,
  });
}

export function getAdapterStats(): Record<string, AdapterCallStat> {
  const out: Record<string, AdapterCallStat> = {};
  for (const [k, v] of stats.entries()) out[k] = v;
  return out;
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Play, Loader2 } from 'lucide-react';

/**
 * Operator probe — fires a sample /api/search call so every wired adapter
 * runs once and stamps its latency / result count into the per-process
 * stats map. After the call resolves we router.refresh() the /setup
 * route so the server re-reads getAdapterStats() and the per-card pills
 * paint the fresh numbers.
 *
 * Why a fixed sample query: we deliberately want a generic noun ("shoes")
 * so adapters in every region return *something* — a query like "토니"
 * would only hit Korean stores. The query itself never reaches the
 * shortlist or click telemetry because we don't navigate to /search.
 */
const SAMPLE_QUERY = 'shoes';

type Status = 'idle' | 'running' | 'done' | 'error';

export function RunProbeButton() {
  const t = useTranslations('setup.probe');
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>('idle');
  const [elapsed, setElapsed] = React.useState<number | null>(null);

  async function run() {
    setStatus('running');
    setElapsed(null);
    const started = performance.now();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(SAMPLE_QUERY)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('search failed');
      // Drain the body so the connection closes and the runner finishes
      // accounting before we ask the page to refresh.
      await res.json();
      setElapsed(Math.round(performance.now() - started));
      setStatus('done');
      // Server re-renders /setup with fresh stats — per-card latency
      // pills update without a full reload.
      router.refresh();
    } catch {
      setElapsed(Math.round(performance.now() - started));
      setStatus('error');
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-extrabold tracking-tight">{t('title')}</div>
          <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={status === 'running'}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-[13px] font-bold text-white transition hover:bg-ink-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {status === 'running' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
              {t('running')}
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t('button')}
            </>
          )}
        </button>
      </div>
      {(status === 'done' || status === 'error') && elapsed !== null && (
        <div
          className={
            'mt-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold ' +
            (status === 'done'
              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50/60 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300')
          }
        >
          {status === 'done'
            ? t('doneOk', { ms: elapsed })
            : t('doneErr')}
        </div>
      )}
      {status === 'done' && (
        <p className="mt-2 text-[11.5px] text-ink-500 dark:text-ink-400">{t('hint')}</p>
      )}
    </div>
  );
}

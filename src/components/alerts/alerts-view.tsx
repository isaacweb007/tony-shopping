'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  BellOff,
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { buildAlerts, countByStatus, type AlertRow, type AlertStatus } from '@/lib/alerts/build-alerts';
import { pickBuyNow } from '@/lib/alerts/pick-buy-now';
import { markAlertsSeen } from '@/hooks/use-alerts-unread';
import { formatMoneyLocale } from '@/lib/format';
import { intlLocale } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
import { affiliateUrl } from '@/lib/affiliate';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/i18n/routing';

type Tab = 'all' | 'drop' | 'rise' | 'flat';

export function AlertsView() {
  const t = useTranslations('alerts');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  const items = useShortlistStore((s) => s.items);
  const snapshots = usePriceWatchStore((s) => s.snapshots);
  const threshold = usePriceWatchStore((s) => s.threshold);
  const snoozes = usePriceWatchStore((s) => s.snoozes);
  const dismissWatch = usePriceWatchStore((s) => s.dismiss);
  const acknowledgeWatch = usePriceWatchStore((s) => s.acknowledge);
  const snoozeWatch = usePriceWatchStore((s) => s.snooze);
  const clearSnoozes = usePriceWatchStore((s) => s.clearSnoozes);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Visiting /alerts counts as "I've seen the current state of price moves".
  // Stamping on mount (not on unmount) means the header dot disappears the
  // moment the page renders, which matches user intent — they came here to
  // check, not to dismiss.
  React.useEffect(() => {
    if (mounted) markAlertsSeen();
  }, [mounted]);

  const [tab, setTab] = React.useState<Tab>('all');

  const rows = React.useMemo(() => {
    if (!mounted) return [];
    return buildAlerts({
      snaps: Object.values(items),
      snapshots,
      threshold,
      snoozes,
    });
  }, [mounted, items, snapshots, threshold, snoozes]);

  const counts = React.useMemo(() => countByStatus(rows), [rows]);
  const buyNow = React.useMemo(
    () => pickBuyNow({ rows, threshold }),
    [rows, threshold],
  );
  // Count price-drop rows whose latest observation was in the past 24h.
  // Walks the visible (snooze-filtered) rows so snoozed drops don't
  // inflate the pill — that matches the user's "I've handled this" intent.
  const drops24h = React.useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let n = 0;
    for (const r of rows) {
      if (r.status !== 'drop') continue;
      const last = r.watch?.entries[r.watch.entries.length - 1];
      if (last && last.at >= cutoff) n += 1;
    }
    return n;
  }, [rows]);

  const visible = React.useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  if (!mounted) {
    return <div className="container max-w-4xl py-12" aria-hidden />;
  }

  if (rows.length === 0) {
    // Distinguish "no shortlist at all" vs "everything snoozed" — the
    // first wants a "go search" CTA, the second wants a "clear snoozes"
    // button. We detect the latter by comparing shortlist size to the
    // (snooze-filtered) row count.
    const totalSnaps = Object.keys(items).length;
    const allSnoozed = totalSnaps > 0;
    if (allSnoozed) {
      return (
        <div className="container max-w-3xl pb-32 pt-10 md:pt-16">
          <h1 className="text-[26px] font-extrabold tracking-tighter2 md:text-[34px]">
            {t('heading')}
          </h1>
          <div className="mt-8 rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center dark:border-ink-700 dark:bg-ink-900">
            <Clock className="mx-auto h-9 w-9 text-ink-300 dark:text-ink-600" strokeWidth={1.4} />
            <p className="mt-4 text-[15px] font-semibold">{t('allSnoozedTitle')}</p>
            <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
              {t('allSnoozedHint', { n: totalSnaps })}
            </p>
            <Button
              variant="primary"
              className="mt-6 h-11 rounded-xl px-5"
              onClick={clearSnoozes}
            >
              {t('allSnoozedAction')}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="container max-w-3xl pb-32 pt-10 md:pt-16">
        <h1 className="text-[26px] font-extrabold tracking-tighter2 md:text-[34px]">
          {t('heading')}
        </h1>
        <div className="mt-8 rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center dark:border-ink-700 dark:bg-ink-900">
          <Bookmark className="mx-auto h-9 w-9 text-ink-300 dark:text-ink-600" strokeWidth={1.4} />
          <p className="mt-4 text-[15px] font-semibold">{t('emptyTitle')}</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{t('emptyHint')}</p>
          <Button asChild variant="primary" className="mt-6 h-11 rounded-xl px-5">
            <Link href="/">{t('goSearch')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl pb-32 pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            {t('eyebrow')}
          </div>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tighter2 md:text-[34px]">
            {t('heading')}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500 dark:text-ink-400">
            {t('subtitle', {
              total: counts.total,
              drops: counts.drop,
              threshold: Math.round(threshold * 100),
            })}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-tight',
            drops24h > 0
              ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400',
          )}
        >
          <TrendingDown className="h-3 w-3" strokeWidth={2.4} />
          {drops24h > 0 ? t('drops24h', { n: drops24h }) : t('drops24hZero')}
        </span>
      </div>

      {/* Bulk "전체 확인" — collapses every observed series to its latest
          entry in one shot, resetting baselines for the next round. Only
          surfaces when there are at least 2 rows with a delta, since
          single-row use just taps the per-row Check button. */}
      {counts.drop + counts.rise >= 2 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              for (const r of rows) {
                if (r.delta !== null) acknowledgeWatch(r.snap.id);
              }
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-[11.5px] font-bold tracking-tight text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
          >
            <Check className="h-3 w-3" strokeWidth={2.4} />
            {t('acknowledgeAll')}
          </button>
        </div>
      )}

      {buyNow && <BuyNowBanner pick={buyNow} locale={locale} t={t} />}

      <div className="mt-6 flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t('tabsAria')}>
        {([
          { key: 'all', count: counts.total },
          { key: 'drop', count: counts.drop },
          { key: 'rise', count: counts.rise },
          { key: 'flat', count: counts.flat + counts.unobserved },
        ] as const).map(({ key, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold tracking-tight transition',
                active
                  ? 'border-accent-500 bg-accent-600 text-white shadow-sm dark:border-accent-400 dark:bg-accent-500'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600',
              )}
            >
              {t(`tabs.${key}` as 'tabs.all')}
              <span
                className={cn(
                  'rounded px-1 text-[10px] font-bold',
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-[13px] text-ink-500 dark:border-ink-700 dark:bg-ink-800/30 dark:text-ink-400">
          {t('emptyTab')}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((row) => (
            <AlertCard
              key={row.snap.id}
              row={row}
              locale={locale}
              tg={tg}
              t={t}
              onDismiss={() => dismissWatch(row.snap.id)}
              onAcknowledge={() => acknowledgeWatch(row.snap.id)}
              onSnooze={() => snoozeWatch(row.snap.id, Date.now() + 24 * 60 * 60 * 1000)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BuyNowBanner({
  pick,
  locale,
  t,
}: {
  pick: NonNullable<ReturnType<typeof pickBuyNow>>;
  locale: AppLocale;
  t: ReturnType<typeof useTranslations<'alerts'>>;
}) {
  const { row, reasonKey } = pick;
  const snap = row.snap;
  const delta = row.delta!;
  const pct = Math.abs(delta * 100).toFixed(1);
  const buyHref = snap.buyUrl
    ? affiliateUrl({ store: snap.store as Parameters<typeof affiliateUrl>[0]['store'], url: snap.buyUrl })
    : null;
  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-card dark:border-emerald-700/50 dark:from-emerald-950/40 dark:via-ink-900 dark:to-sky-950/30 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="relative inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-emerald-500">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {t('buyNow.label')}
      </div>
      <p className="relative mt-3 text-[14px] font-semibold text-emerald-700 dark:text-emerald-300">
        {t(`buyNow.reason.${reasonKey}` as 'buyNow.reason.bigDrop', { pct })}
      </p>
      <div className="relative mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[20px] font-extrabold leading-tight tracking-tighter2 md:text-[24px]">
          {snap.name}
        </h2>
        <span className="text-[12px] font-semibold text-ink-600 dark:text-ink-300">
          {snap.store}
        </span>
      </div>
      <div className="relative mt-2 flex flex-wrap items-baseline gap-3">
        <DualMoney money={snap.finalPrice} size="lg" layout="inline" locale={locale} />
        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
          ▼ {pct}%
        </span>
      </div>
      {buyHref && (
        <Button
          asChild
          variant="primary"
          className="mt-4 h-11 rounded-xl px-5 font-bold"
        >
          <a href={buyHref} target="_blank" rel="noreferrer noopener sponsored">
            {t('buyNow.cta', { store: snap.store })}
            <ExternalLink className="h-4 w-4" strokeWidth={1.9} />
          </a>
        </Button>
      )}
    </div>
  );
}

function AlertCard({
  row,
  locale,
  t,
  tg,
  onDismiss,
  onAcknowledge,
  onSnooze,
}: {
  row: AlertRow;
  locale: AppLocale;
  t: ReturnType<typeof useTranslations<'alerts'>>;
  tg: ReturnType<typeof useTranslations>;
  onDismiss: () => void;
  onAcknowledge: () => void;
  onSnooze: () => void;
}) {
  const { snap, watch, delta, status } = row;
  const buyHref = snap.buyUrl
    ? affiliateUrl({ store: snap.store as Parameters<typeof affiliateUrl>[0]['store'], url: snap.buyUrl })
    : null;
  const lastObsAt = watch?.entries[watch.entries.length - 1]?.at ?? null;
  const observedRel = lastObsAt != null ? formatRelative(lastObsAt, intlLocale(locale)) : null;
  const prevAmount = watch
    ? watch.entries[watch.entries.length - 2]?.amount ?? null
    : null;
  const prevMoney =
    prevAmount != null && watch
      ? formatMoneyLocale({ amount: prevAmount, currency: watch.currency }, locale)
      : null;

  return (
    <li
      className={cn(
        'flex items-stretch gap-4 rounded-2xl border bg-white p-3 dark:bg-ink-900',
        status === 'drop'
          ? 'border-emerald-300/60 dark:border-emerald-700/40'
          : status === 'rise'
            ? 'border-red-300/60 dark:border-red-700/40'
            : 'border-ink-200 dark:border-ink-800',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={snap.imageUrl ?? '/icon.svg'}
        alt=""
        className="h-20 w-20 shrink-0 rounded-xl bg-ink-50 object-cover dark:bg-ink-800"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-500 dark:text-ink-400">
          <span className="text-ink-800 dark:text-ink-100">{snap.store}</span>
          <StatusBadge status={status} t={t} />
          {observedRel && (
            <span className="text-ink-400 dark:text-ink-500">
              {t('observedAgo', { rel: observedRel })}
            </span>
          )}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-tight tracking-tight">
          {snap.name}
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <DualMoney money={snap.finalPrice} size="md" layout="inline" locale={locale} />
          {prevMoney && delta !== null && (
            <span className="text-[11px] text-ink-500 dark:text-ink-400">
              {t('wasPrice', { was: prevMoney })}
            </span>
          )}
          {delta !== null && <DeltaPill delta={delta} />}
          {watch && watch.entries.length >= 2 && (
            <MiniSparkline
              amounts={watch.entries.map((e) => e.amount)}
              tone={status === 'drop' ? 'down' : status === 'rise' ? 'up' : 'neutral'}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-1">
          {buyHref ? (
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg">
              <a href={buyHref} target="_blank" rel="noreferrer noopener sponsored">
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                {t('open')}
              </a>
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {watch && delta !== null && (
            <button
              onClick={onAcknowledge}
              aria-label={t('acknowledgeAria')}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 px-2 text-[11px] font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={1.9} />
              {t('acknowledge')}
            </button>
          )}
          {watch && (
            <button
              onClick={onSnooze}
              aria-label={t('snoozeAria')}
              title={t('snoozeAria')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-700 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          )}
          {watch && (
            <button
              onClick={onDismiss}
              aria-label={tg('drawer.remove')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:text-red-600 dark:border-ink-700 dark:text-ink-300 dark:hover:text-red-400"
            >
              <BellOff className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: AlertStatus;
  t: ReturnType<typeof useTranslations<'alerts'>>;
}) {
  if (status === 'unobserved') return null;
  const map: Record<Exclude<AlertStatus, 'unobserved'>, { cls: string; label: string }> = {
    drop: {
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      label: t('status.drop'),
    },
    rise: {
      cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      label: t('status.rise'),
    },
    flat: {
      cls: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
      label: t('status.flat'),
    },
  };
  const v = map[status];
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider', v.cls)}>
      {v.label}
    </span>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        <Minus className="h-3 w-3" strokeWidth={2.4} />
        0.0%
      </span>
    );
  }
  const isDown = delta < 0;
  const pct = Math.abs(delta * 100).toFixed(1);
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold',
        isDown
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {pct}%
    </span>
  );
}

/**
 * 60×16 inline price sparkline for the right side of an AlertCard's
 * price row. Tone-driven: drop = emerald, rise = red, flat = ink.
 * Y-axis normalised per-series so each row's shape reads at a glance.
 * Renders nothing for series < 2 points (caller already guards).
 */
function MiniSparkline({
  amounts,
  tone,
}: {
  amounts: readonly number[];
  tone: 'up' | 'down' | 'neutral';
}) {
  if (amounts.length < 2) return null;
  const width = 60;
  const height = 16;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const span = Math.max(1, max - min);
  const stepX = amounts.length === 1 ? width : width / (amounts.length - 1);
  const points = amounts
    .map((a, i) => {
      const x = i * stepX;
      const y = height - ((a - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke =
    tone === 'down'
      ? 'stroke-emerald-500 dark:stroke-emerald-400'
      : tone === 'up'
        ? 'stroke-red-500 dark:stroke-red-400'
        : 'stroke-ink-400 dark:stroke-ink-500';
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={stroke}
      />
    </svg>
  );
}

const REL_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
];

function formatRelative(at: number, intlLoc: string): string {
  const diffMs = at - Date.now();
  const rtf = new Intl.RelativeTimeFormat(intlLoc, { numeric: 'auto' });
  for (const [unit, ms] of REL_UNITS) {
    if (Math.abs(diffMs) >= ms || unit === 'second') {
      const value = Math.round(diffMs / ms);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(0, 'second');
}


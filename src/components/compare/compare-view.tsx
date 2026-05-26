'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, Check, Copy, ExternalLink, GitCompare, Share2, Sparkles, Star, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { buildCompare, type ComparePriority } from '@/lib/compare/verdict';
import { formatMoneyLocale, formatCount, shipLabel } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
import { shareOrCopy } from '@/lib/share';
import { affiliateUrl } from '@/lib/affiliate';
import { useCompareNarrative } from '@/hooks/use-compare-narrative';
import { useAutoPriority } from '@/hooks/use-auto-priority';
import { RecentCohorts } from './recent-cohorts';
import type { AutoPriorityResult } from '@/lib/compare/auto-priority';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/i18n/routing';
import type { ShortlistSnap } from '@/types/shortlist';

interface Props {
  /**
   * When provided, CompareView ignores the local shortlist store and renders
   * exactly these snaps. Used by /c/[slug] for publicly shared cohorts.
   */
  seedSnaps?: ShortlistSnap[];
  /** Initial priority chip (defaults to 'balanced'). */
  initialPriority?: ComparePriority;
  /** When true, hide the per-row remove button (read-only public view). */
  readOnly?: boolean;
}

export function CompareView({ seedSnaps, initialPriority, readOnly }: Props = {}) {
  const t = useTranslations('compare');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;
  const params = useSearchParams();
  const idsParam = params.get('ids');

  const items = useShortlistStore((s) => s.items);
  const remove = useShortlistStore((s) => s.remove);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [priority, setPriorityState] = React.useState<ComparePriority>(initialPriority ?? 'balanced');
  const [userOverrode, setUserOverrode] = React.useState(false);
  const auto = useAutoPriority();

  // One-shot: if auto-priority is confident on first hydration AND the user
  // hasn't already picked a chip, adopt the recommendation. Subsequent
  // recomputations never override an explicit choice. Skip entirely when a
  // shared cohort came in with an explicit initialPriority.
  const appliedAutoRef = React.useRef(false);
  React.useEffect(() => {
    if (initialPriority || userOverrode || appliedAutoRef.current) return;
    if (!auto || auto.confidence < 0.4) return;
    appliedAutoRef.current = true;
    setPriorityState(auto.priority);
  }, [auto, userOverrode, initialPriority]);

  const setPriority = React.useCallback((next: ComparePriority) => {
    setUserOverrode(true);
    setPriorityState(next);
  }, []);

  const snaps: ShortlistSnap[] = React.useMemo(() => {
    if (seedSnaps) return seedSnaps;
    if (!mounted) return [];
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      return ids
        .map((id) => items[id])
        .filter((s): s is ShortlistSnap => Boolean(s));
    }
    return Object.values(items).sort((a, b) => b.addedAt - a.addedAt);
  }, [seedSnaps, mounted, items, idsParam]);

  const compare = React.useMemo(() => buildCompare(snaps, priority), [snaps, priority]);

  // Pre-render localised price strings once so both the table and the LLM
  // prompt see exactly the same text — keeps the narrative honest.
  const priceLabels = React.useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const s of snaps) out[s.id] = formatMoneyLocale(s.finalPrice, locale);
    return out;
  }, [snaps, locale]);

  const narrative = useCompareNarrative({
    snaps,
    priority,
    winnerId: compare.verdict.winnerId,
    reasonKeys: compare.verdict.reasonKeys,
    priceLabels,
    locale,
  });

  async function shareSet() {
    if (snaps.length === 0) return;
    const winnerId = compare.verdict.winnerId;
    const winner = winnerId ? snaps.find((s) => s.id === winnerId) ?? null : null;

    // Try the public short-link API first — it produces /c/{slug} URLs that
    // anyone (signed-in or not) can open. Falls back to the existing
    // /compare?ids=... URL when Supabase is unconfigured, the user isn't
    // signed in, or the network call fails.
    let url: string | null = null;
    try {
      const res = await fetch('/api/cohort/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snaps,
          winnerId,
          priority,
          locale,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { slug?: string };
        if (json.slug) {
          const path = locale === 'ko' ? `/c/${json.slug}` : `/${locale}/c/${json.slug}`;
          url = `${window.location.origin}${path}`;
        }
      }
    } catch {
      /* network/Supabase down — fall through to long URL */
    }

    if (!url) {
      const ids = snaps.map((s) => s.id).join(',');
      const params = new URLSearchParams({ ids });
      if (winner) {
        params.set('w', winner.name);
        params.set('store', String(winner.store));
        params.set('n', String(snaps.length));
        const score = compare.verdict.scores[winner.id];
        if (typeof score === 'number') params.set('score', String(score));
      } else {
        params.set('n', String(snaps.length));
      }
      const path =
        locale === 'ko'
          ? `/compare?${params.toString()}`
          : `/${locale}/compare?${params.toString()}`;
      url = `${window.location.origin}${path}`;
    }

    await shareOrCopy({
      title: t('shareTitle'),
      text: t('shareText', { n: snaps.length }),
      url,
      copiedLabel: tg('toast.linkCopied'),
      failedLabel: tg('toast.shareFailed'),
    });
  }

  if (!mounted && !seedSnaps) {
    return <div className="container max-w-6xl py-12" aria-hidden />;
  }

  if (snaps.length === 0) {
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

  const winnerId = compare.verdict.winnerId;
  const winner = winnerId ? snaps.find((s) => s.id === winnerId) ?? null : null;

  return (
    <div className="container max-w-6xl pb-32 pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
            <GitCompare className="h-3 w-3" strokeWidth={2.4} />
            {t('eyebrow')}
          </div>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tighter2 md:text-[34px]">
            {t('heading')}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500 dark:text-ink-400">
            {t('subtitle', { n: snaps.length })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={shareSet}>
          <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
          {t('shareSet')}
        </Button>
      </div>

      {snaps.length >= 2 && (
        <PriorityChips
          value={priority}
          onChange={setPriority}
          auto={auto}
          autoApplied={appliedAutoRef.current && !userOverrode}
        />
      )}

      {winner ? (
        <CohortVerdictCard
          winner={winner}
          score={compare.verdict.scores[winner.id] ?? 0}
          reasonKeys={compare.verdict.reasonKeys}
          totalCount={snaps.length}
          narrative={narrative.data?.narrative ?? null}
          narrativeSource={narrative.data?.source ?? null}
          narrativeLoading={narrative.isFetching}
          narrativeError={narrative.isError}
        />
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-[13px] text-ink-500 dark:border-ink-700 dark:bg-ink-800/30 dark:text-ink-400">
          {snaps.length < 2 ? t('needMore') : t('noWinner')}
        </div>
      )}

      <CompareTable
        snaps={snaps}
        compare={compare}
        winnerId={winnerId}
        onRemove={
          readOnly
            ? null
            : (id) => {
                remove(id);
                void deleteShortlistItem(id);
              }
        }
      />

      {/* Recent shared cohorts — only on the user's own /compare, not on
          read-only public cohort pages. */}
      {!readOnly && <RecentCohorts />}
    </div>
  );
}

function CohortVerdictCard({
  winner,
  score,
  reasonKeys,
  totalCount,
  narrative,
  narrativeSource,
  narrativeLoading,
  narrativeError,
}: {
  winner: ShortlistSnap;
  score: number;
  reasonKeys: string[];
  totalCount: number;
  narrative: string | null;
  narrativeSource: 'anthropic' | 'openai' | 'fallback' | null;
  narrativeLoading: boolean;
  narrativeError: boolean;
}) {
  const t = useTranslations('compare');
  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-accent-300/70 bg-gradient-to-br from-accent-50 via-white to-sky-50 p-5 shadow-card dark:border-accent-700/50 dark:from-accent-950/40 dark:via-ink-900 dark:to-sky-950/30 md:p-7">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />
      <div className="relative inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {t('cohortLabel')}
      </div>
      <p className="relative mt-3 text-[14px] font-semibold text-accent-700 dark:text-accent-300">
        {t('cohortTagline', { count: totalCount })}
      </p>
      <h2 className="relative mt-1 text-[22px] font-extrabold leading-tight tracking-tighter2 md:text-[28px]">
        {winner.name}
      </h2>
      <div className="relative mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[12px] font-semibold text-ink-600 dark:text-ink-300">
          {winner.store}
        </span>
        <span className="text-[14px] font-bold text-accent-700 dark:text-accent-300">
          {t('cohortScore', { score })}
        </span>
      </div>

      <NarrativeBlock
        text={narrative}
        loading={narrativeLoading}
        errored={narrativeError}
        source={narrativeSource}
        winnerName={winner.name}
        winnerStore={winner.store}
      />

      {reasonKeys.length > 0 && (
        <ul className="relative mt-4 grid gap-1.5 sm:grid-cols-2">
          {reasonKeys.map((k) => (
            <li
              key={k}
              className="flex items-start gap-2 text-[13px] text-ink-800 dark:text-ink-100"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.4}
              />
              <span>{t(`reasons.${k}` as 'reasons.price')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NarrativeBlock({
  text,
  loading,
  errored,
  source,
  winnerName,
  winnerStore,
}: {
  text: string | null;
  loading: boolean;
  errored: boolean;
  source: 'anthropic' | 'openai' | 'fallback' | null;
  winnerName: string;
  winnerStore: string;
}) {
  const t = useTranslations('compare');
  const [copied, setCopied] = React.useState(false);

  if (loading && !text) {
    return (
      <div className="relative mt-4 space-y-1.5">
        <div className="h-3 w-11/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
        <div className="h-3 w-7/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
      </div>
    );
  }
  if (errored && !text) {
    return (
      <p className="relative mt-4 text-[12.5px] text-ink-500 dark:text-ink-400">
        {t('narrativeError')}
      </p>
    );
  }
  if (!text) return null;

  // Plain-text payload built for paste-into-chat use. We deliberately
  // include the winner + store on the header line so a reader sees the
  // pick without context, and append the narrative as one paragraph.
  const payload = `Tony · ${winnerName} (${winnerStore})\n\n${text}`;

  async function copy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
      } else {
        // Legacy fallback — match the share lib's pattern.
        const ta = document.createElement('textarea');
        ta.value = payload;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // We could toast on failure, but the visual state already covers
      // the success case — silent failure keeps the surface calm.
    }
  }

  return (
    <div className="relative mt-4">
      <p className="text-[13.5px] leading-relaxed text-ink-800 dark:text-ink-100">{text}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          aria-label={t('narrativeCopy')}
          className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-bold tracking-tight text-ink-700 transition hover:border-accent-400 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.4} />
              {t('narrativeCopied')}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" strokeWidth={2} />
              {t('narrativeCopy')}
            </>
          )}
        </button>
        {source === 'fallback' && (
          <span className="text-[10px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
            {t('narrativeFallback')}
          </span>
        )}
      </div>
    </div>
  );
}

const PRIORITY_OPTIONS: Array<{ key: ComparePriority; iconKey: string }> = [
  { key: 'balanced', iconKey: 'balanced' },
  { key: 'value', iconKey: 'value' },
  { key: 'fast', iconKey: 'fast' },
  { key: 'genuine', iconKey: 'genuine' },
];

function PriorityChips({
  value,
  onChange,
  auto,
  autoApplied,
}: {
  value: ComparePriority;
  onChange: (next: ComparePriority) => void;
  auto: AutoPriorityResult | null;
  autoApplied: boolean;
}) {
  const t = useTranslations('compare');
  const recommendedKey = auto && auto.confidence >= 0.4 ? auto.priority : null;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('priorityAria')}>
        <span className="mr-1 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {t('priorityLabel')}
        </span>
        {PRIORITY_OPTIONS.map(({ key }) => {
          const active = value === key;
          const recommended = recommendedKey === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-bold tracking-tight transition',
                active
                  ? 'border-accent-500 bg-accent-600 text-white shadow-sm dark:border-accent-400 dark:bg-accent-500'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600',
              )}
            >
              {recommended && (
                <Sparkles
                  className={cn('h-3 w-3', active ? 'text-white' : 'text-accent-600 dark:text-accent-400')}
                  strokeWidth={2.4}
                  aria-label={t('auto.recommendedAria')}
                />
              )}
              {t(`priority.${key}` as 'priority.balanced')}
            </button>
          );
        })}
      </div>
      {auto && recommendedKey && autoApplied && (
        <p className="mt-2 text-[11.5px] text-ink-500 dark:text-ink-400">
          {t('auto.basedOn', {
            n: auto.sampleSize,
            signal: t(`auto.signal.${auto.signal ?? 'value'}` as 'auto.signal.value'),
          })}
        </p>
      )}
    </div>
  );
}

function CompareTable({
  snaps,
  compare,
  winnerId,
  onRemove,
}: {
  snaps: ShortlistSnap[];
  compare: ReturnType<typeof buildCompare>;
  winnerId: string | null;
  /** null = read-only cohort (no remove button). */
  onRemove: ((id: string) => void) | null;
}) {
  const t = useTranslations('compare');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  function valueFor(snap: ShortlistSnap, key: string): React.ReactNode {
    switch (key) {
      case 'price':
        return <DualMoney money={snap.finalPrice} size="sm" layout="stacked" />;
      case 'score':
        return snap.score?.total != null ? (
          <span className="font-extrabold text-accent-600 dark:text-accent-400">
            {snap.score.total}
            <span className="text-[10px] text-ink-400 dark:text-ink-500">/100</span>
          </span>
        ) : (
          em()
        );
      case 'ship':
        return snap.shipDays != null ? shipLabel(snap.shipDays, tg) : em();
      case 'reviews':
        return snap.reviewCount != null && snap.rating != null ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {snap.rating} · {formatCount(snap.reviewCount, locale)}
          </span>
        ) : (
          em()
        );
      case 'authenticity':
        return snap.authenticityPct != null ? `${snap.authenticityPct}%` : em();
      default:
        return em();
    }
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-800">
            <th className="sticky left-0 z-10 w-32 bg-white p-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              {t('product')}
            </th>
            {snaps.map((s) => (
              <th
                key={s.id}
                className={
                  'min-w-[180px] border-l border-ink-200 p-3 text-left align-top dark:border-ink-800 ' +
                  (s.id === winnerId
                    ? 'bg-accent-50/60 dark:bg-accent-950/30'
                    : '')
                }
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl ?? '/icon.svg'}
                    alt=""
                    className="h-20 w-full rounded-lg bg-ink-50 object-cover dark:bg-ink-800"
                  />
                  {onRemove && (
                    <button
                      onClick={() => onRemove(s.id)}
                      aria-label={t('removeAria', { name: s.name })}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 hover:text-red-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                  {s.store}
                </div>
                <div className="line-clamp-2 text-[12px] font-semibold leading-snug tracking-tight">
                  {s.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compare.criteria.map((c) => (
            <tr key={c.key} className="border-b border-ink-100 dark:border-ink-800/60">
              <td className="sticky left-0 z-10 bg-white p-3 align-top text-[11.5px] font-semibold text-ink-600 dark:bg-ink-900 dark:text-ink-300">
                {t(`criteria.${c.key}` as 'criteria.price')}
              </td>
              {snaps.map((s) => {
                const rank = c.ranks.find((r) => r.id === s.id)?.position ?? null;
                const cls =
                  rank === 'best'
                    ? 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : rank === 'worst'
                      ? 'text-ink-400 dark:text-ink-500'
                      : '';
                return (
                  <td
                    key={s.id}
                    className={
                      'border-l border-ink-200 p-3 align-top dark:border-ink-800 ' +
                      cls +
                      (s.id === winnerId ? ' bg-accent-50/40 dark:bg-accent-950/20' : '')
                    }
                  >
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                      {valueFor(s, c.key)}
                      {rank === 'best' && (
                        <span className="rounded-md bg-emerald-600 px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                          {t('bestBadge')}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 z-10 bg-white p-3 align-top text-[11.5px] font-semibold text-ink-600 dark:bg-ink-900 dark:text-ink-300">
              {t('action')}
            </td>
            {snaps.map((s) => (
              <td
                key={s.id}
                className={
                  'border-l border-ink-200 p-3 align-top dark:border-ink-800 ' +
                  (s.id === winnerId ? 'bg-accent-50/40 dark:bg-accent-950/20' : '')
                }
              >
                {s.buyUrl ? (
                  <Button
                    asChild
                    variant={s.id === winnerId ? 'primary' : 'outline'}
                    size="sm"
                    className="h-9 w-full rounded-lg text-[12px] font-bold"
                  >
                    <a
                      href={affiliateUrl({
                        store: s.store as Parameters<typeof affiliateUrl>[0]['store'],
                        url: s.buyUrl,
                      })}
                      target="_blank"
                      rel="noreferrer noopener sponsored"
                    >
                      {t('openBuy', { store: s.store })}
                      <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
                    </a>
                  </Button>
                ) : (
                  em()
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function em(): React.ReactNode {
  return <span className="text-ink-300 dark:text-ink-600">—</span>;
}

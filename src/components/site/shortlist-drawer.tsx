'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, ExternalLink, GitCompare, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useUIStore } from '@/stores/ui-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { formatMoneyLocale } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
import { Link } from '@/i18n/routing';
import { shareOrCopy } from '@/lib/share';
import type { AppLocale } from '@/i18n/routing';

export function ShortlistDrawer() {
  const t = useTranslations('header');
  const td = useTranslations('drawer');
  const tc = useTranslations('compare');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  const open = useUIStore((s) => s.shortlistOpen);
  const setOpen = useUIStore((s) => s.setShortlistOpen);

  const items = useShortlistStore((s) => s.items);
  const remove = useShortlistStore((s) => s.remove);
  const setNote = useShortlistStore((s) => s.setNote);
  const clearAll = useShortlistStore((s) => s.clear);
  const delta = usePriceWatchStore((s) => s.delta);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const list = React.useMemo(() => {
    if (!mounted) return [];
    return Object.values(items).sort((a, b) => b.addedAt - a.addedAt);
  }, [mounted, items]);

  async function shareSet() {
    if (list.length === 0) return;
    // Run the same verdict the /compare page would compute so the social
    // preview is consistent whether the user shares from the drawer or the
    // page itself.
    const { buildCompare } = await import('@/lib/compare/verdict');
    const { verdict } = buildCompare(list);
    const winner = verdict.winnerId ? list.find((s) => s.id === verdict.winnerId) ?? null : null;

    // Prefer the public short-link API; fall back to the long URL.
    let url: string | null = null;
    try {
      const res = await fetch('/api/cohort/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snaps: list, winnerId: verdict.winnerId, priority: 'balanced', locale }),
      });
      if (res.ok) {
        const json = (await res.json()) as { slug?: string };
        if (json.slug) {
          const path = locale === 'ko' ? `/c/${json.slug}` : `/${locale}/c/${json.slug}`;
          url = `${window.location.origin}${path}`;
        }
      }
    } catch {
      /* fall through */
    }

    if (!url) {
      const ids = list.map((s) => s.id).join(',');
      const params = new URLSearchParams({ ids });
      params.set('n', String(list.length));
      if (winner) {
        params.set('w', winner.name);
        params.set('store', String(winner.store));
        const score = verdict.scores[winner.id];
        if (typeof score === 'number') params.set('score', String(score));
      }
      const path =
        locale === 'ko'
          ? `/compare?${params.toString()}`
          : `/${locale}/compare?${params.toString()}`;
      url = `${window.location.origin}${path}`;
    }

    await shareOrCopy({
      title: tc('shareTitle'),
      text: tc('shareText', { n: list.length }),
      url,
      copiedLabel: tg('toast.linkCopied'),
      failedLabel: tg('toast.shareFailed'),
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right">
        <SheetHeader
          title={t('shortlist')}
          right={
            list.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                {td('clearAll')}
              </Button>
            ) : null
          }
        />
        <div className="flex-1 overflow-y-auto p-5">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 py-12 text-center text-ink-500 dark:border-ink-700 dark:text-ink-400">
              <Bookmark className="mx-auto h-8 w-8 opacity-40" strokeWidth={1.4} />
              <p className="mt-3 text-sm">{td('shortlistEmpty')}</p>
              <p className="mt-1 text-[11.5px]">{td('shortlistHint')}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Button asChild variant="primary" size="sm" className="h-10 rounded-xl">
                  <Link href="/compare" onClick={() => setOpen(false)}>
                    <GitCompare className="h-3.5 w-3.5" strokeWidth={2} />
                    {tc('openCompare')}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={shareSet}>
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                  {tc('shareSet')}
                </Button>
              </div>
              <ul className="space-y-3">
                {list.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 rounded-2xl border border-ink-200 p-2.5 dark:border-ink-800"
                  >
                    <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl ?? '/icon.svg'}
                      alt=""
                      className="h-16 w-16 rounded-xl bg-ink-50 object-cover dark:bg-ink-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-ink-500 dark:text-ink-400">
                        {p.store}
                      </div>
                      <div className="truncate text-[13px] font-semibold tracking-tight">
                        {p.name}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <DualMoney money={p.finalPrice} size="sm" layout="inline" locale={locale} />
                        <PriceDelta value={delta(p.id)} />
                      </div>
                      {p.score && (
                        <div className="text-[10px] font-medium text-ink-400 dark:text-ink-500">
                          Tony {p.score.total}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {p.buyUrl ? (
                        <a
                          href={p.buyUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                          aria-label="Open"
                        >
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                        </a>
                      ) : null}
                      <button
                        onClick={() => {
                          remove(p.id);
                          void deleteShortlistItem(p.id);
                        }}
                        className="text-[11px] text-ink-500 hover:text-red-600 dark:text-ink-400 dark:hover:text-red-400"
                      >
                        {td('remove')}
                      </button>
                    </div>
                    </div>
                    <NoteInput
                      defaultValue={p.note ?? ''}
                      onSave={(v) => setNote(p.id, v)}
                      placeholder={td('notePlaceholder')}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NoteInput({
  defaultValue,
  onSave,
  placeholder,
}: {
  defaultValue: string;
  onSave: (next: string) => void;
  placeholder: string;
}) {
  // Uncontrolled — we only commit to the store on blur (or Enter) to avoid
  // a write per keystroke. defaultValue resets whenever the parent's key
  // changes (each shortlist row is keyed by snap id).
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const initial = defaultValue;
  function commit() {
    const v = (ref.current?.value ?? '').trim();
    if (v !== initial.trim()) onSave(v);
  }
  return (
    <textarea
      ref={ref}
      defaultValue={initial}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      placeholder={placeholder}
      rows={1}
      maxLength={280}
      className="w-full resize-none rounded-lg border border-ink-200 bg-ink-50/40 px-2 py-1.5 text-[12px] leading-snug text-ink-700 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-200 dark:placeholder:text-ink-500"
    />
  );
}

function PriceDelta({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  const isDown = value < 0;
  const pct = Math.abs(value * 100);
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <span
      className={
        'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold ' +
        (isDown
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300')
      }
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {pct.toFixed(1)}%
    </span>
  );
}

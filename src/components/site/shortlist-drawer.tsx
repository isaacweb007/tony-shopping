'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useSearchStore } from '@/stores/search-store';
import { useUIStore } from '@/stores/ui-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { formatMoneyLocale } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

export function ShortlistDrawer() {
  const t = useTranslations('header');
  const td = useTranslations('drawer');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  const open = useUIStore((s) => s.shortlistOpen);
  const setOpen = useUIStore((s) => s.setShortlistOpen);

  const ids = useShortlistStore((s) => s.ids);
  const toggle = useShortlistStore((s) => s.toggle);
  const clearAll = useShortlistStore((s) => s.clear);

  const products = useSearchStore((s) => s.result?.products);
  const delta = usePriceWatchStore((s) => s.delta);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const list = React.useMemo(() => {
    if (!mounted || !products) return [];
    return ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [mounted, ids, products]);

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
            <ul className="space-y-3">
              {list.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200 p-2.5 dark:border-ink-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
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
                      <span className="text-[14px] font-extrabold tracking-tighter2">
                        {formatMoneyLocale(p.finalPrice, locale)}
                      </span>
                      <PriceDelta value={delta(p.id)} />
                    </div>
                    <div className="text-[10px] font-medium text-ink-400 dark:text-ink-500">
                      Tony {p.score.total}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <a
                      href={p.buyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                      aria-label="Open"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </a>
                    <button
                      onClick={() => toggle(p.id)}
                      className="text-[11px] text-ink-500 hover:text-red-600 dark:text-ink-400 dark:hover:text-red-400"
                    >
                      {td('remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
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

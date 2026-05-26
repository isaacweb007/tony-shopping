'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Trash2, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useHistoryStore } from '@/stores/history-store';
import { useUIStore } from '@/stores/ui-store';
import { useSearchStore } from '@/stores/search-store';
import { useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { formatRelativeTime } from '@/lib/format';

export function HistoryDrawer() {
  const t = useTranslations('header');
  const td = useTranslations('drawer');
  const locale = useLocale() as AppLocale;
  const open = useUIStore((s) => s.historyOpen);
  const setOpen = useUIStore((s) => s.setHistoryOpen);
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const clearAll = useHistoryStore((s) => s.clear);
  const run = useSearchStore((s) => s.run);
  const router = useRouter();

  // Hydration guard for persisted store
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const visibleEntries = mounted ? entries : [];

  function replay(id: string) {
    const e = visibleEntries.find((x) => x.id === id);
    if (!e) return;
    run({ q: e.q, attachments: [] });
    setOpen(false);
    const params = new URLSearchParams({ q: e.q });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right">
        <SheetHeader
          title={t('history')}
          right={
            visibleEntries.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                <span className="hidden sm:inline">{td('clearAll')}</span>
              </Button>
            ) : null
          }
        />
        <div className="flex-1 overflow-y-auto p-5">
          {visibleEntries.length === 0 ? (
            <EmptyState>
              <Search className="mx-auto h-8 w-8 opacity-40" strokeWidth={1.4} />
              <p className="mt-3 text-sm">{td('historyEmpty')}</p>
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {visibleEntries.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-start gap-2 rounded-2xl border border-ink-200 p-3 transition hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800"
                >
                  <button
                    onClick={() => replay(e.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-[11px] text-ink-400 dark:text-ink-500">
                      {formatRelativeTime(e.createdAt, locale)}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[14px] font-semibold tracking-tight">
                      {e.q}
                    </div>
                    {e.attachmentLabels.length > 0 && (
                      <div className="mt-1 truncate text-[11px] text-ink-400 dark:text-ink-500">
                        {e.attachmentLabels.join(', ')}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      remove(e.id);
                    }}
                    aria-label={td('remove')}
                    title={td('remove')}
                    className="shrink-0 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-700 dark:hover:text-ink-200"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 py-12 text-center text-ink-500 dark:border-ink-700 dark:text-ink-400">
      {children}
    </div>
  );
}

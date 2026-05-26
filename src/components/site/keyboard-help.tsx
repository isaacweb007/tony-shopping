'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/routing';
import { useShortlistStore } from '@/stores/shortlist-store';

/**
 * Global keyboard shortcuts + the help overlay (toggled by "?").
 *
 * "/"          focuses the first search input on the page (home / search).
 * "?"          toggles this overlay.
 * Shift+C      jumps to /compare when shortlist has ≥ 2 snaps.
 * Esc          closes the open dialog.
 *
 * We deliberately don't hijack typing — if the user is already inside an
 * input/textarea/contenteditable we no-op (Esc is handled by the dialog
 * primitive itself).
 */
export function KeyboardHelp() {
  const t = useTranslations('keyboard');
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function inEditable() {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }

    function focusSearch() {
      // Try the main search input on the page. Falls back gracefully —
      // pages without an input (alerts/dashboard/cohorts) navigate to
      // home with ?focus=ask so the user lands directly on the AskBox.
      const target =
        document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'main input[type="search"], main input[type="text"], main textarea',
        ) ?? null;
      if (target) {
        target.focus();
        try {
          target.select();
        } catch {
          /* readonly selects on some inputs */
        }
        return;
      }
      // No input on this page — send the user home with the focus hint.
      // AskBox already reads ?focus=ask and autofocuses the textarea.
      router.push('/?focus=ask');
    }

    function onKey(e: KeyboardEvent) {
      // Block when meta / ctrl / alt is held so we don't steal OS shortcuts.
      // Shift is allowed because "?" (Shift+/) and Shift+C both need it.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // "?" — Shift+/ on most layouts.
      if (e.key === '?' && !inEditable()) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // "/" — focus the page's main search input.
      if (e.key === '/' && !inEditable()) {
        e.preventDefault();
        focusSearch();
        return;
      }

      // Shift+C — jump to /compare when the shortlist has ≥ 2 snaps. We
      // require Shift specifically so lowercase "c" stays usable for typing
      // anywhere. We read the latest count via getState() instead of
      // subscribing — the listener never needs to re-bind.
      if (e.key === 'C' && e.shiftKey && !inEditable()) {
        const count = Object.keys(useShortlistStore.getState().items).length;
        if (count >= 2) {
          e.preventDefault();
          router.push('/compare');
        }
        return;
      }

      // Shift+G — open the public shared-cohort gallery. No precondition
      // (the gallery has its own empty state) so this works for cold
      // visitors poking around.
      if (e.key === 'G' && e.shiftKey && !inEditable()) {
        e.preventDefault();
        router.push('/cohorts');
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const SHORTCUTS: Array<{ keys: string[]; key: string }> = [
    { keys: ['↑', '↓', '←', '→'], key: 'arrows' },
    { keys: ['h', 'j', 'k', 'l'], key: 'vim' },
    { keys: ['Enter'], key: 'open' },
    { keys: ['/'], key: 'focus' },
    { keys: ['Shift', 'C'], key: 'compare' },
    { keys: ['Shift', 'G'], key: 'gallery' },
    { keys: [',', '.'], key: 'sortCycle' },
    { keys: ['?'], key: 'help' },
    { keys: ['Esc'], key: 'esc' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle className="text-[18px] font-extrabold tracking-tighter2 md:text-[20px]">
          {t('title')}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
          {t('subtitle')}
        </DialogDescription>
        <ul className="mt-5 space-y-2">
          {SHORTCUTS.map(({ keys, key }) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/40 px-3 py-2.5 dark:border-ink-800 dark:bg-ink-800/30"
            >
              <span className="text-[13px] text-ink-700 dark:text-ink-200">
                {t(`actions.${key}` as 'actions.arrows')}
              </span>
              <span className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-ink-300 bg-white px-1.5 font-mono text-[11px] font-bold text-ink-700 shadow-sm dark:border-ink-600 dark:bg-ink-900 dark:text-ink-200"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, X } from 'lucide-react';

/**
 * Web App install prompt banner. Listens for `beforeinstallprompt`
 * (Chrome / Edge / Samsung Internet support; Safari does not — the
 * banner just never appears there). Dismissal is persisted so the
 * banner doesn't keep re-appearing for someone who said "not now".
 *
 * Renders nothing until the browser fires the event AND the user hasn't
 * previously dismissed, so the home page stays clean for visitors who
 * already installed or are on an unsupported browser.
 */
const DISMISS_KEY = 'tony.install.dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const t = useTranslations('home.install');
  const [evt, setEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch {
      /* private mode — treat as not dismissed */
    }
    function onPrompt(e: Event) {
      // Browsers fire this with the prompt-capable event; we hold it
      // so we can call prompt() in response to a real user click.
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!evt || dismissed) return null;

  async function install() {
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
        // Either way, hide — Chrome won't re-fire beforeinstallprompt
        // until something material changes.
        setEvt(null);
      }
    } catch {
      // Some browsers throw when prompt() is called outside a gesture;
      // hide the banner so a second tap doesn't compound the failure.
      setEvt(null);
    }
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode — fine to keep showing this session */
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label={t('title')}
      className="container max-w-3xl pt-2"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-accent-200/80 bg-accent-50/60 px-4 py-3 dark:border-accent-800/50 dark:bg-accent-950/30">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600/15 text-accent-700 dark:bg-accent-400/15 dark:text-accent-300">
          <Download className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold tracking-tight text-ink-800 dark:text-ink-100">
            {t('title')}
          </div>
          <p className="text-[11.5px] leading-snug text-ink-500 dark:text-ink-400">
            {t('body')}
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-accent-600 px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400"
        >
          {t('cta')}
        </button>
        <button
          onClick={dismiss}
          aria-label={t('dismiss')}
          className="shrink-0 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-200"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

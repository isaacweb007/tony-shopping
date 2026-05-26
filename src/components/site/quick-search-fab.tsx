'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Link2, Plus, Search, X, type LucideIcon } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/routing';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';

/**
 * Mobile-only floating action menu (bottom-left). Three shortcuts:
 *   - Photo  → opens file picker → routes to /?img=<dataUrl-token>
 *              (handled by AskBox via session storage handoff)
 *   - Link   → window.prompt + bounce to /share?url=...
 *   - Search → routes home and focuses the AskBox textarea
 *
 * The FAB is hidden on /search and /product/* where the AskBox already
 * dominates the layout, and on screens md+ where the user has plenty of
 * room to scroll to the header. Pure UX scaffolding — no new search
 * surface.
 */
const HIDE_ON = ['/search', '/product', '/share', '/offline'];

export function QuickSearchFab() {
  const t = useTranslations('quickFab');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Hide on routes where the AskBox is already the focus surface.
  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));
  if (hidden) return null;

  function pickPhoto() {
    haptic('tap');
    fileInputRef.current?.click();
    setOpen(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    // Stash the file as a dataURL in sessionStorage so the home page can pick
    // it up without bloating the URL. AskBox reads + clears the slot on mount.
    const reader = new FileReader();
    reader.onload = (ev) => {
      const v = ev.target?.result;
      if (typeof v === 'string') {
        try {
          sessionStorage.setItem('tony.quickfab.image', JSON.stringify({ name: f.name, dataUrl: v }));
        } catch {
          /* quota — silent */
        }
      }
      router.push('/?from=quickfab');
    };
    reader.readAsDataURL(f);
  }

  function pickLink() {
    haptic('tap');
    const url = window.prompt(t('linkPrompt'), '');
    if (!url || !url.trim()) {
      setOpen(false);
      return;
    }
    const target = `/share?url=${encodeURIComponent(url.trim())}`;
    setOpen(false);
    window.location.href = target;
  }

  function pickSearch() {
    haptic('tap');
    setOpen(false);
    router.push('/?focus=ask');
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Action stack */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 md:hidden">
        {open && (
          <>
            <ActionBtn icon={Camera} label={t('photo')} onClick={pickPhoto} />
            <ActionBtn icon={Link2} label={t('link')} onClick={pickLink} />
            <ActionBtn icon={Search} label={t('search')} onClick={pickSearch} />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            haptic('tap');
            setOpen((v) => !v);
          }}
          aria-label={open ? t('close') : t('open')}
          aria-expanded={open}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-accent-600 text-white shadow-card-hover transition hover:bg-accent-500',
            open && 'rotate-45 bg-ink-900 hover:bg-ink-800',
          )}
        >
          {open ? <X className="h-5 w-5" strokeWidth={2.2} /> : <Plus className="h-5 w-5" strokeWidth={2.4} />}
        </button>
      </div>
    </>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-900 shadow-card-hover ring-1 ring-ink-200 backdrop-blur transition hover:bg-ink-50 dark:bg-ink-900 dark:text-white dark:ring-ink-700 dark:hover:bg-ink-800 animate-fade-in"
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      {label}
    </button>
  );
}

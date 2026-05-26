'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Bookmark, Clock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitch } from '@/components/ui/language-switch';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useAlertsUnread } from '@/hooks/use-alerts-unread';
import { UserMenu } from './user-menu';

export function Header() {
  const t = useTranslations('header');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const setHistoryOpen = useUIStore((s) => s.setHistoryOpen);
  const setShortlistOpen = useUIStore((s) => s.setShortlistOpen);
  const openHistory = React.useCallback(() => setHistoryOpen(true), [setHistoryOpen]);
  const openShortlist = React.useCallback(() => setShortlistOpen(true), [setShortlistOpen]);
  const shortlistCount = useShortlistStore((s) => Object.keys(s.items).length);
  const unreadAlerts = useAlertsUnread();

  // hydration guard for badge
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const badge = mounted ? shortlistCount : 0;
  const unreadBadge = mounted ? unreadAlerts : 0;

  return (
    <header className="glass sticky top-0 z-40 border-b border-ink-200/70 dark:border-ink-800/70">
      <div className="container flex h-14 items-center justify-between gap-3 md:h-16">
        <Link href="/" aria-label="Tony Shopping" className="group flex shrink-0 items-center gap-2.5">
          <Logo size="md" />
          <span className="hidden items-center gap-1 rounded-full border border-accent-100 bg-accent-50 px-2 py-0.5 text-[11px] font-semibold tracking-tight text-accent-700 dark:border-accent-800/50 dark:bg-accent-900/30 dark:text-accent-300 lg:inline-flex">
            {t('tagline')}
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Button variant="ghost" size="pill" onClick={openHistory}>
            <Clock className="h-[18px] w-[18px]" strokeWidth={1.6} />
            <span>{t('history')}</span>
          </Button>
          <Button variant="ghost" size="pill" onClick={openShortlist} className="relative">
            <Bookmark className="h-[18px] w-[18px]" strokeWidth={1.6} />
            <span>{t('shortlist')}</span>
            {badge > 0 && (
              <span className="ml-0.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {badge}
              </span>
            )}
          </Button>
          <Button
            asChild
            variant="ghost"
            size="pill"
            className="relative"
            title={unreadBadge > 0 ? t('alertsUnread', { n: unreadBadge }) : t('alerts')}
          >
            <Link href="/alerts">
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
              <span>{t('alerts')}</span>
              {unreadBadge > 0 && (
                <span
                  aria-label={t('alertsUnread', { n: unreadBadge })}
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-ink-950"
                />
              )}
            </Link>
          </Button>
          <LanguageSwitch />
          <ThemeToggle label={t('theme')} />
          <span className="ml-1">
            <UserMenu />
          </span>
        </nav>

        {/* mobile */}
        <div className="flex items-center gap-0.5 md:hidden">
          <ThemeToggle label={t('theme')} />
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link
              href="/alerts"
              aria-label={
                unreadBadge > 0 ? t('alertsUnread', { n: unreadBadge }) : t('alerts')
              }
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {unreadBadge > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-ink-950" />
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('shortlist')}
            onClick={openShortlist}
            className="relative"
          >
            <Bookmark className="h-[18px] w-[18px]" strokeWidth={1.6} />
            {badge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                {badge}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('menu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </Button>
        </div>
      </div>

      {/* mobile drawer */}
      <div
        className={cn(
          'border-t border-ink-200/70 bg-white px-4 py-3 dark:border-ink-800/70 dark:bg-ink-950 md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      >
        <button
          onClick={() => {
            openHistory();
            setMobileOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-900"
        >
          <Clock className="h-[18px] w-[18px]" strokeWidth={1.6} />
          {t('history')}
        </button>
        <div className="mt-2 px-3 py-2 text-[11px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
          {t('language')}
        </div>
        <LanguageSwitch variant="mobile" />
        <div className="mt-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Bookmark, GitCompare, Home, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useAlertsUnread } from '@/hooks/use-alerts-unread';
import { useUIStore } from '@/stores/ui-store';

/**
 * Bottom-edge nav for mobile (md:hidden). Five icon stops covering the
 * primary surfaces — home, search-ish (the shortlist drawer trigger),
 * compare, alerts, dashboard. iOS safe-area-inset is respected via
 * env(safe-area-inset-bottom) on the wrapper.
 *
 * The "compare" stop opens the shortlist drawer rather than navigating
 * — that's the entry-point most users actually want on mobile (review
 * the shortlist, then optionally jump to /compare). The dashboard stop
 * is dimmed for non-signed-in users but still navigable; the dashboard
 * itself handles the "sign in to sync" framing.
 *
 * Active state is based on the current pathname so a user on /search
 * sees that tab highlighted even though the icon is generic.
 */
export function MobileBottomNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const setShortlistOpen = useUIStore((s) => s.setShortlistOpen);
  const shortlistCount = useShortlistStore((s) => Object.keys(s.items).length);
  const unread = useAlertsUnread();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const badge = mounted ? shortlistCount : 0;
  const dot = mounted ? unread : 0;

  function isActive(prefix: string) {
    if (prefix === '/') return pathname === '/' || pathname === '';
    return pathname === prefix || pathname?.startsWith(`${prefix}/`);
  }

  return (
    <nav
      aria-label={t('header.menu')}
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/70 dark:border-ink-800/70 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="container flex max-w-2xl items-stretch justify-around">
        <li className="flex-1">
          <BottomLink href="/" active={isActive('/')} icon={Home} label={t('nav.home')} />
        </li>
        <li className="flex-1">
          <BottomLink
            href="/cohorts"
            active={isActive('/cohorts')}
            icon={GitCompare}
            label={t('nav.cohorts')}
          />
        </li>
        <li className="flex-1">
          <BottomButton
            onClick={() => setShortlistOpen(true)}
            icon={Bookmark}
            label={t('header.shortlist')}
            badge={badge > 0 ? String(badge) : null}
          />
        </li>
        <li className="flex-1">
          <BottomLink
            href="/alerts"
            active={isActive('/alerts')}
            icon={Bell}
            label={t('header.alerts')}
            dot={dot > 0}
          />
        </li>
        <li className="flex-1">
          <BottomLink
            href="/dashboard"
            active={isActive('/dashboard')}
            icon={LayoutDashboard}
            label={t('dashboard.menu')}
          />
        </li>
      </ul>
    </nav>
  );
}

function BottomLink({
  href,
  active,
  icon: Icon,
  label,
  badge,
  dot,
}: {
  href: '/' | '/cohorts' | '/alerts' | '/dashboard';
  active: boolean;
  icon: LucideIcon;
  label: string;
  badge?: string | null;
  dot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex h-14 flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-bold tracking-tight transition',
        active
          ? 'text-accent-600 dark:text-accent-400'
          : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100',
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="absolute right-2 top-1.5 rounded-full bg-accent-600 px-1 text-[9px] font-bold leading-tight text-white">
          {badge}
        </span>
      ) : null}
      {dot ? (
        <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-ink-950" />
      ) : null}
    </Link>
  );
}

function BottomButton({
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  badge?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-bold tracking-tight text-ink-500 transition hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="absolute right-2 top-1.5 rounded-full bg-accent-600 px-1 text-[9px] font-bold leading-tight text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

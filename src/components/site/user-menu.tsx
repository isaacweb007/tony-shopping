'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('auth');
  const tHead = useTranslations('header');
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || !user) {
    return (
      <Button variant="primary" size={compact ? 'pill' : 'pill'} asChild>
        <Link href={isSupabaseConfigured ? '/auth/sign-in' : '/auth/sign-in'}>
          {tHead('login')}
        </Link>
      </Button>
    );
  }

  const initial = (user.email ?? 'U').charAt(0).toUpperCase();
  const display = user.user_metadata?.full_name ?? user.email ?? 'User';

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('myAccount')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-extrabold text-white hover:opacity-90 dark:bg-white dark:text-ink-900"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <div className="text-[11px] text-ink-500 dark:text-ink-400">{t('welcome', { name: display.split('@')[0] ?? display })}</div>
          <div className="truncate text-[12.5px] font-semibold">{user.email}</div>
        </div>
        <DropdownMenuItem disabled>
          <UserIcon className="h-4 w-4" strokeWidth={1.7} />
          {t('settings')}
          <span className="ml-auto text-[10px] text-ink-400">{t('comingSoon')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

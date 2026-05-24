'use client';

import * as React from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './button';
import { usePathname, useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';

const LOCALES: { code: AppLocale; label: string; tag: string }[] = [
  { code: 'ko', label: '한국어', tag: 'KO' },
  { code: 'en', label: 'English', tag: 'EN' },
  { code: 'vi', label: 'Tiếng Việt', tag: 'VI' },
];

export function LanguageSwitch({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function change(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  if (variant === 'mobile') {
    return (
      <div className="space-y-1">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => change(l.code)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-900 ${
              l.code === locale ? 'font-semibold text-accent-600 dark:text-accent-400' : ''
            }`}
          >
            <span>{l.label}</span>
            <span className="text-[11px] text-ink-400 dark:text-ink-500">{l.tag}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="pill" className="text-sm">
          <Globe className="h-[18px] w-[18px]" strokeWidth={1.6} />
          <span>{current?.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => change(l.code)}
            className="flex items-center justify-between"
          >
            <span>{l.label}</span>
            <span className="text-[11px] text-ink-400 dark:text-ink-500">{l.tag}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

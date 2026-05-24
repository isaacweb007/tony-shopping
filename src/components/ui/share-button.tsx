'use client';

import * as React from 'react';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { shareOrCopy } from '@/lib/share';

interface Props {
  title: string;
  text?: string;
  url: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outline';
  iconOnly?: boolean;
}

export function ShareButton({ title, text, url, size = 'md', variant = 'outline', iconOnly = false }: Props) {
  const t = useTranslations('share');
  const tt = useTranslations('toast');

  async function onClick() {
    await shareOrCopy({
      title,
      text,
      url,
      copiedLabel: tt('linkCopied'),
      failedLabel: tt('shareFailed'),
    });
  }

  return (
    <Button
      variant={variant}
      size={iconOnly ? 'icon' : size === 'sm' ? 'sm' : 'md'}
      onClick={onClick}
      aria-label={t('button')}
    >
      <Share2 className={size === 'sm' || iconOnly ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.7} />
      {!iconOnly && <span>{t('button')}</span>}
    </Button>
  );
}

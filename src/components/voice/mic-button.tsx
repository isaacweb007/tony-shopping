'use client';

import * as React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { SpeechErrorReason } from '@/hooks/use-speech-recognition';

interface Props {
  listening: boolean;
  supported: boolean;
  error: SpeechErrorReason | null;
  onClick: () => void;
  size?: 'sm' | 'md';
}

/**
 * Round mic button with listening pulse animation.
 * Disabled (with tooltip) when the browser doesn't support recognition.
 */
export function MicButton({ listening, supported, error, onClick, size = 'md' }: Props) {
  const t = useTranslations('voice');
  const ariaLabel = listening
    ? t('stopListening')
    : !supported
      ? t('error.unsupported')
      : t('startListening');

  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!supported}
      aria-pressed={listening}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border transition',
        dim,
        listening
          ? 'border-red-500 bg-red-500 text-white shadow-pop'
          : supported
            ? 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700'
            : 'cursor-not-allowed border-ink-200 bg-ink-50 text-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-600',
        error === 'permission-denied' && 'border-amber-400',
      )}
    >
      {listening ? (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
          <MicOff className={cn('relative', icon)} strokeWidth={1.8} />
        </>
      ) : (
        <Mic className={icon} strokeWidth={1.8} />
      )}
    </button>
  );
}

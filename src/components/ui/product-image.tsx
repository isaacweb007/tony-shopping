'use client';

import * as React from 'react';
import { ImageIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  alt: string;
  /** Lucide icon shown when the image 404s / fails to load. */
  fallbackIcon?: LucideIcon;
  /** Aspect / sizing classes applied to the wrapper. */
  className?: string;
  /** Classes for the inner <img>. Defaults to object-cover. */
  imgClassName?: string;
  /** Tailwind classes for the fallback background (gradient etc.). */
  fallbackBgClassName?: string;
  /** Tailwind classes for the fallback icon color/size. */
  fallbackIconClassName?: string;
  /** Defaults to "lazy" — pass "eager" for above-the-fold hero shots. */
  loading?: 'lazy' | 'eager';
}

/**
 * Image with an automatic lucide-icon fallback when the source URL fails.
 *
 * Why this exists: external CDNs (Unsplash, gstatic, etc.) sometimes return
 * 404 / 403 for individual photo IDs even when the host is generally up.
 * Without a fallback the browser renders its ugly default broken-image
 * icon, which looks worse than just owning the failure visually.
 *
 * Use this anywhere we render a third-party image whose specific URL we
 * can't 100 % guarantee. The fallback is a tone-able gradient block with a
 * centered lucide glyph — picks up whatever bg class the caller passes so
 * it visually matches the parent surface.
 */
export function ProductImage({
  src,
  alt,
  fallbackIcon: FallbackIcon = ImageIcon,
  className,
  imgClassName,
  fallbackBgClassName,
  fallbackIconClassName,
  loading = 'lazy',
}: Props) {
  const [failed, setFailed] = React.useState(false);

  // Reset failed state if the src changes (e.g. parent swaps the photo).
  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-ink-100 to-ink-200/80 dark:from-ink-800 dark:to-ink-700/80',
          fallbackBgClassName,
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <FallbackIcon
          className={cn(
            'h-8 w-8 text-ink-400 dark:text-ink-500',
            fallbackIconClassName,
          )}
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn('object-cover', imgClassName, className)}
    />
  );
}

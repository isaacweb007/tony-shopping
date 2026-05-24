'use client';

import { toast } from '@/stores/toast-store';

interface SharePayload {
  title: string;
  text?: string;
  url: string;
  /** i18n labels for the toast feedback. Pass via translator. */
  copiedLabel: string;
  failedLabel: string;
}

/**
 * Share via Web Share API where available; otherwise copy to clipboard.
 * Always emits a toast (success or error).
 */
export async function shareOrCopy({
  title,
  text,
  url,
  copiedLabel,
  failedLabel,
}: SharePayload): Promise<void> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      // User-cancelled share → silent; real errors → fall through to clipboard.
      if ((err as DOMException)?.name === 'AbortError') return;
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success(copiedLabel);
      return;
    }
    // Fallback for very old browsers
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast.success(copiedLabel);
  } catch {
    toast.error(failedLabel);
  }
}

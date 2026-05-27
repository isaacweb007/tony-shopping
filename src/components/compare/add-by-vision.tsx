'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExtractPreview, type ExtractResult } from '@/components/home/extract-preview';
import { useShortlistStore } from '@/stores/shortlist-store';
import { pushShortlistItem } from '@/lib/supabase/sync-shortlist';
import { toast } from '@/stores/toast-store';
import { haptic } from '@/lib/haptic';
import type { Product } from '@/types/product';
import type { SearchResult } from '@/types/search';

interface Props {
  className?: string;
}

/**
 * Drop-in panel for /compare: paste a TikTok/Instagram URL or upload a
 * photo, and Tony adds the top matching product to the comparison set.
 *
 * Pipeline (same as the home ask-box):
 *   image|link → /api/extract → ExtractPreview (with candidates) → user picks
 *   → /api/search?q=<query> → take products[0] → shortlist.toggle()
 *
 * Errors at any stage degrade gracefully — toast the failure, leave the
 * compare table untouched.
 */
export function AddByVision({ className }: Props) {
  const t = useTranslations('compare.addByVision');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  const [url, setUrl] = React.useState('');
  const [extracting, setExtracting] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [extractResult, setExtractResult] = React.useState<ExtractResult | null>(null);
  const [open, setOpen] = React.useState(false);

  const toggle = useShortlistStore((s) => s.toggle);
  const items = useShortlistStore((s) => s.items);

  function resetAll() {
    setUrl('');
    setExtractResult(null);
    setExtracting(false);
    setSearching(false);
  }

  async function runExtractFromLink(link: string) {
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });
      if (!res.ok) {
        toast.error(t('error.extractFailed'));
        return;
      }
      const data = (await res.json()) as ExtractResult & {
        source: ExtractResult['source'];
      };
      if (!data.suggestedQuery) {
        toast.error(t('error.noProductFound'));
        return;
      }
      setExtractResult({
        suggestedQuery: data.suggestedQuery,
        candidates: data.candidates,
        source: data.source ?? 'fallback',
        hint: data.hint,
        tags: data.tags,
        image: data.image,
      });
    } catch {
      toast.error(t('error.network'));
    } finally {
      setExtracting(false);
    }
  }

  async function runExtractFromImage(file: File) {
    setExtracting(true);
    setExtractResult(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        toast.error(t('error.readFile'));
        return;
      }
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, filename: file.name }),
      });
      if (!res.ok) {
        toast.error(t('error.extractFailed'));
        return;
      }
      const data = (await res.json()) as ExtractResult & {
        source: ExtractResult['source'];
      };
      if (!data.suggestedQuery) {
        toast.error(t('error.noProductFound'));
        return;
      }
      setExtractResult({
        suggestedQuery: data.suggestedQuery,
        candidates: data.candidates,
        source: data.source ?? 'fallback',
        hint: data.hint,
        tags: data.tags,
        image: data.image,
      });
    } catch {
      toast.error(t('error.network'));
    } finally {
      setExtracting(false);
    }
  }

  async function searchAndAdd(query: string) {
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        toast.error(t('error.searchFailed'));
        return;
      }
      const data = (await res.json()) as SearchResult;
      const top = data.products?.[0];
      if (!top) {
        toast.info(t('error.zeroResults', { q: query }));
        return;
      }
      if (top.id in items) {
        toast.info(t('alreadyAdded', { name: top.name }));
        return;
      }
      const added = toggle(top as Product);
      haptic('tap');
      if (added) {
        toast.success(t('added', { name: top.name }));
        void pushShortlistItem(top as Product);
      }
      resetAll();
      setOpen(false);
    } catch {
      toast.error(t('error.network'));
    } finally {
      setSearching(false);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find(
      (it) => it.kind === 'file' && it.type.startsWith('image/'),
    );
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        void runExtractFromImage(file);
      }
    }
  }

  if (!open) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => urlInputRef.current?.focus());
          }}
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={2} />
          {t('openCta')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        'relative rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900 ' +
        (className ?? '')
      }
      onPaste={onPaste}
    >
      <button
        type="button"
        onClick={() => {
          resetAll();
          setOpen(false);
        }}
        aria-label={t('close')}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-200"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
        <Camera className="h-3.5 w-3.5" strokeWidth={2.4} />
        {t('title')}
      </div>
      <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-950">
          <Link2 className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={2} />
          <input
            ref={urlInputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim() && !extracting && !searching) {
                void runExtractFromLink(url.trim());
              }
            }}
            placeholder={t('placeholder')}
            className="h-10 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
            disabled={extracting || searching}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="h-10 rounded-xl"
            onClick={() => {
              if (url.trim()) void runExtractFromLink(url.trim());
            }}
            disabled={!url.trim() || extracting || searching}
          >
            {extracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : null}
            {t('analyzeUrl')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting || searching}
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={2} />
            {t('uploadPhoto')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void runExtractFromImage(f);
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">{t('hint')}</p>

      {extractResult && (
        <ExtractPreview
          result={extractResult}
          onAccept={() => {
            void searchAndAdd(extractResult.suggestedQuery);
          }}
          onSelectCandidate={(q) => {
            void searchAndAdd(q);
          }}
          onEdit={() => {
            setUrl(extractResult.suggestedQuery);
            setExtractResult(null);
            requestAnimationFrame(() => urlInputRef.current?.focus());
          }}
          onDismiss={() => setExtractResult(null)}
          className="mt-3"
        />
      )}

      {searching && !extractResult && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-500 dark:text-ink-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          {t('searching')}
        </div>
      )}
    </div>
  );
}

function readFileAsDataUrl(f: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (ev) => {
      const v = ev.target?.result;
      resolve(typeof v === 'string' ? v : null);
    };
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}

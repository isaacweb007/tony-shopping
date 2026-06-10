'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ImageIcon, Link2, AlignLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { useHistoryStore } from '@/stores/history-store';
import { useUserProfileStore } from '@/stores/user-profile-store';
import { categorize } from '@/lib/categorize';
import { findFirstUrl } from '@/lib/extract/url';
import { nanoid } from 'nanoid';
import type { SearchAttachment } from '@/types/search';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { MicButton } from '@/components/voice/mic-button';
import { toast } from '@/stores/toast-store';
import { PromptChips } from './prompt-chips';
import { ExtractPreview, type ExtractResult } from './extract-preview';

export function AskBox() {
  const t = useTranslations('ask');
  const tv = useTranslations('voice');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const addHistory = useHistoryStore((s) => s.add);
  const recordSearch = useUserProfileStore((s) => s.recordSearch);
  const [text, setText] = React.useState('');
  const [attachments, setAttachments] = React.useState<SearchAttachment[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const speech = useSpeechRecognition(locale, { interimResults: true });

  // Mirror speech transcript into the textarea while listening.
  React.useEffect(() => {
    if (speech.listening && speech.transcript) {
      setText(speech.transcript);
      if (textareaRef.current) autoGrow(textareaRef.current);
    }
  }, [speech.listening, speech.transcript]);

  // Mobile quick-search FAB handoff (round-h40) — pick up either:
  //   * sessionStorage("tony.quickfab.image") with a JSON {name, dataUrl},
  //     drop it into attachments + trigger the extract pipeline
  //   * ?focus=ask, autofocus the textarea so the user can type right away
  const searchParams = useSearchParams();
  const focusParam = searchParams?.get('focus');
  // Guards the one-shot ingest so React 18 StrictMode's double-mount (dev) — or
  // any remount — can't run extraction / add the link chip twice.
  const ingestedRef = React.useRef(false);
  React.useEffect(() => {
    if (focusParam === 'ask') {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    // Share-target handoff: /share redirects URLs to /?ingest=<url>. Run the
    // same link-extraction pipeline the paste button uses, so a shared SNS
    // post becomes a real product query instead of a raw-URL search.
    const ingest = searchParams?.get('ingest');
    if (ingest && !ingestedRef.current) {
      ingestedRef.current = true;
      const ingestUrl = findFirstUrl(ingest);
      if (ingestUrl) {
        setAttachments((prev) => [
          ...prev,
          { id: nanoid(6), type: 'link', value: ingestUrl, label: ingestUrl },
        ]);
        void runLinkExtract(ingestUrl, { autofillText: true, notifyOnMiss: true });
      }
    }
    try {
      const raw = sessionStorage.getItem('tony.quickfab.image');
      if (!raw) return;
      sessionStorage.removeItem('tony.quickfab.image');
      const parsed = JSON.parse(raw) as { name: string; dataUrl: string };
      if (!parsed?.dataUrl?.startsWith('data:image/')) return;
      setAttachments((prev) => [
        ...prev,
        { id: nanoid(6), type: 'image', value: parsed.dataUrl, label: parsed.name ?? 'image' },
      ]);
      // Fire the same extract pipeline the upload button uses.
      void (async () => {
        setExtracting(true);
        try {
          const res = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: parsed.dataUrl, filename: parsed.name }),
          });
          if (res.ok) {
            const data = (await res.json()) as ExtractResult & { source: ExtractResult['source'] };
            if (data.suggestedQuery) {
              setExtractResult({
                suggestedQuery: data.suggestedQuery,
                candidates: data.candidates,
                source: data.source ?? 'fallback',
                hint: data.hint,
                tags: data.tags,
                image: data.image,
              });
              setText(data.suggestedQuery);
            }
          }
        } catch {
          /* silent */
        } finally {
          setExtracting(false);
        }
      })();
    } catch {
      /* parse failure — drop silently */
    }
    // Run once on mount; subsequent re-fires would re-process stale storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user stops speaking and we have a final transcript, auto-submit.
  const lastSubmittedRef = React.useRef('');
  React.useEffect(() => {
    if (
      !speech.listening &&
      speech.finalTranscript.trim() &&
      speech.finalTranscript !== lastSubmittedRef.current
    ) {
      lastSubmittedRef.current = speech.finalTranscript;
      toast.success(tv('listening'), tg('toast.voiceCaptured'));
      setText(speech.finalTranscript);
      // Defer to next tick so the React state settles before navigation.
      setTimeout(() => submit(speech.finalTranscript), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, speech.finalTranscript]);

  // Surface voice errors as toasts.
  React.useEffect(() => {
    if (!speech.error) return;
    if (speech.error === 'permission-denied') {
      toast.warning(tg('toast.voicePermissionTitle'), tg('toast.voicePermissionDesc'));
    } else if (speech.error === 'unsupported') {
      toast.warning(tg('toast.voiceUnsupported'));
    } else if (speech.error === 'no-speech') {
      // Subtle: keep it quiet, info-level.
      toast.info(tv('error.noSpeech'));
    } else if (speech.error === 'network') {
      toast.error(tv('error.network'));
    } else {
      toast.error(tv('error.unknown'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error]);

  function toggleMic() {
    if (!speech.supported) {
      toast.warning(tg('toast.voiceUnsupported'));
      return;
    }
    if (speech.listening) speech.stop();
    else speech.start();
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    autoGrow(e.target);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const [extracting, setExtracting] = React.useState(false);
  const [extractResult, setExtractResult] = React.useState<ExtractResult | null>(null);

  /**
   * Shared pipeline for any image file source — `<input type=file>` upload,
   * drag-drop, or clipboard paste. Reads the file, attaches it, then runs
   * /api/extract (Vision when configured) to derive a search query.
   */
  async function processImageFile(f: File) {
    const dataUrl = await readFileAsDataUrl(f);
    if (!dataUrl) return;
    const filename = f.name || 'pasted-image.png';
    setAttachments((prev) => [
      ...prev,
      { id: nanoid(6), type: 'image', value: dataUrl, label: filename },
    ]);

    setExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, filename }),
      });
      if (res.ok) {
        const data = (await res.json()) as ExtractResult & { source: ExtractResult['source'] };
        if (data.suggestedQuery) {
          setExtractResult({
            suggestedQuery: data.suggestedQuery,
            candidates: data.candidates,
            source: data.source ?? 'fallback',
            hint: data.hint,
            tags: data.tags,
            image: data.image,
          });
          if (!text.trim()) {
            setText(data.suggestedQuery);
            requestAnimationFrame(() => textareaRef.current && autoGrow(textareaRef.current));
          }
        }
        if (data.source === 'vision' && data.suggestedQuery) {
          toast.success(tg('extract.detected', { query: data.suggestedQuery }));
        }
      }
    } catch {
      /* silent */
    } finally {
      setExtracting(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    await processImageFile(f);
  }

  /**
   * Native paste handler on the textarea. Three input shapes we care about:
   *  - Image bytes on the clipboard (e.g. screenshot, copied-from-browser
   *    image) → grab the first image item, prevent default text paste, and
   *    run the same extract pipeline as upload.
   *  - A URL string (TikTok / Instagram / shop page) → let native paste
   *    populate the textarea; submit() will auto-detect URL-only input.
   *  - Plain text → native paste, nothing special.
   */
  async function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find(
      (it) => it.kind === 'file' && it.type.startsWith('image/'),
    );
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        await processImageFile(file);
      }
    }
    // Otherwise fall through to default text paste.
  }

  function readFileAsDataUrl(f: File): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const v = ev.target?.result;
        resolve(typeof v === 'string' ? v : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    });
  }

  /**
   * Shared link → product extraction. Posts the URL to /api/extract, shows the
   * preview when a real product query comes back, and returns it (or null).
   * On a miss it surfaces a gentle toast — we never fall through to searching
   * the raw URL string, which would return garbage.
   */
  async function runLinkExtract(
    url: string,
    opts: { autofillText?: boolean; notifyOnMiss?: boolean } = {},
  ): Promise<ExtractResult | null> {
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: url, locale }),
      });
      if (res.ok) {
        const data = (await res.json()) as ExtractResult & { source: ExtractResult['source'] };
        if (data.suggestedQuery && data.suggestedQuery.trim().length > 0) {
          const result: ExtractResult = {
            suggestedQuery: data.suggestedQuery,
            candidates: data.candidates,
            source: data.source ?? 'fallback',
            hint: data.hint,
            tags: data.tags,
            image: data.image,
          };
          setExtractResult(result);
          if (opts.autofillText && !text.trim()) {
            setText(data.suggestedQuery);
            requestAnimationFrame(() => textareaRef.current && autoGrow(textareaRef.current));
          }
          return result;
        }
      }
      if (opts.notifyOnMiss) toast.warning(tg('extract.linkFailed'));
      return null;
    } catch {
      if (opts.notifyOnMiss) toast.warning(tg('extract.linkFailed'));
      return null;
    } finally {
      setExtracting(false);
    }
  }

  async function onPasteLink() {
    const input = window.prompt(t('linkPrompt'), '');
    if (!input || !input.trim()) return;
    const url = findFirstUrl(input) ?? input.trim();
    setAttachments((prev) => [
      ...prev,
      { id: nanoid(6), type: 'link', value: url, label: url },
    ]);
    await runLinkExtract(url, { autofillText: true, notifyOnMiss: true });
  }

  function removeAttach(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(override?: string, imageUrl?: string) {
    const raw = (override ?? text).trim();
    let q = raw || (attachments.length ? '(attachments)' : '');
    if (!q) {
      textareaRef.current?.focus();
      return;
    }

    // Input containing a URL (bare link, or a link inside caption text): run
    // /api/extract first so the upstream search gets a real product-name query
    // instead of "https://...". We extract from the URL even when there's
    // caption text around it. Skip when the caller passed an override (the user
    // already accepted a preview / candidate). On success we show the preview
    // and STOP; on a miss runLinkExtract toasts and we STOP — we never search
    // the raw URL string itself.
    if (!override) {
      const foundUrl = findFirstUrl(raw);
      if (foundUrl) {
        await runLinkExtract(foundUrl, { notifyOnMiss: true });
        return;
      }
    }

    const query = { q, attachments };
    addHistory(query);
    recordSearch({ q, categories: categorize(q) });
    const params = new URLSearchParams({ q });
    // Carry the source thumbnail (only ever a public http(s) URL from a link
    // extraction) so the results page can run reverse-image "where to buy".
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) params.set('img', imageUrl);
    router.push(`/search?${params.toString()}`);
  }

  function applyPrompt(s: string) {
    setText(s);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        autoGrow(textareaRef.current);
        textareaRef.current.focus();
      }
    });
  }


  return (
    <div className="animate-fade-up" style={{ animationDelay: '0.24s' }}>
      <div
        className={cn(
          'relative rounded-3xl border border-ink-200 bg-white p-3 shadow-card transition focus-within:border-accent-600 focus-within:ring-4 focus-within:ring-accent-600/15 dark:border-ink-800 dark:bg-ink-900 dark:focus-within:border-accent-400 dark:focus-within:ring-accent-400/20 md:p-4',
        )}
      >
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                {a.type === 'image' ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.value}
                      alt={a.label}
                      className="h-14 w-14 rounded-xl border border-ink-200 object-cover dark:border-ink-700"
                    />
                    <button
                      onClick={() => removeAttach(i)}
                      aria-label="Remove"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <div className="inline-flex max-w-xs items-center gap-1.5 rounded-xl border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-[13px] dark:border-ink-700 dark:bg-ink-800">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-500 dark:text-ink-400" strokeWidth={1.7} />
                    <span className="truncate">{a.label}</span>
                    <button
                      onClick={() => removeAttach(i)}
                      aria-label="Remove"
                      className="ml-1 text-ink-400 hover:text-ink-900 dark:text-ink-500 dark:hover:text-ink-50"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              speech.listening
                ? tv('listening')
                : extracting
                  ? tg('extract.extracting')
                  : t('placeholder')
            }
            value={text}
            onChange={onTextChange}
            onKeyDown={onKey}
            onPaste={onPaste}
            className="w-full resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500 md:text-[16px]"
          />
          <div className="pt-1.5 pr-1">
            <MicButton
              listening={speech.listening}
              supported={speech.supported}
              error={speech.error}
              onClick={toggleMic}
              size="md"
            />
          </div>
        </div>
        {speech.error && (
          <div className="mx-1 mt-1 text-[11px] text-amber-700 dark:text-amber-300">
            {speech.error === 'permission-denied'
              ? tv('error.permission')
              : speech.error === 'no-speech'
                ? tv('error.noSpeech')
                : speech.error === 'network'
                  ? tv('error.network')
                  : speech.error === 'unsupported'
                    ? tv('error.unsupported')
                    : tv('error.unknown')}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            <label
              className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-800 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
            >
              <ImageIcon className="h-4 w-4" strokeWidth={1.7} />
              {t('uploadPhoto')}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onUpload}
                className="hidden"
              />
            </label>
            <Button variant="outline" size="pill" onClick={onPasteLink}>
              <Link2 className="h-4 w-4" strokeWidth={1.7} />
              {t('pasteLink')}
            </Button>
            <Button
              variant="outline"
              size="pill"
              onClick={() => textareaRef.current?.focus()}
              className="hidden sm:inline-flex"
            >
              <AlignLeft className="h-4 w-4" strokeWidth={1.7} />
              {t('typeText')}
            </Button>
          </div>
          <Button
            variant="primary"
            size="pillLg"
            onClick={() => submit()}
            className="font-bold"
            aria-label={t('submitAria')}
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
            <span>{t('submit')}</span>
          </Button>
        </div>
      </div>

      {extractResult && (
        <ExtractPreview
          result={extractResult}
          onAccept={() => {
            submit(extractResult.suggestedQuery, extractResult.image);
            setExtractResult(null);
          }}
          onSelectCandidate={(q) => {
            submit(q, extractResult.image);
            setExtractResult(null);
          }}
          onEdit={() => {
            setText(extractResult.suggestedQuery);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                autoGrow(textareaRef.current);
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(
                  textareaRef.current.value.length,
                  textareaRef.current.value.length,
                );
              }
            });
            setExtractResult(null);
          }}
          onDismiss={() => setExtractResult(null)}
          className="mt-3"
        />
      )}

      <PromptChips onPick={applyPrompt} />
    </div>
  );
}

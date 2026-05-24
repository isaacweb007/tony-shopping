'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  ImageIcon,
  Link2,
  AlignLeft,
  Footprints,
  Lightbulb,
  DollarSign,
  Gift,
  ShoppingBag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { useHistoryStore } from '@/stores/history-store';
import { nanoid } from 'nanoid';
import type { SearchAttachment } from '@/types/search';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { MicButton } from '@/components/voice/mic-button';

const PROMPT_ICONS = [ImageIcon, Footprints, Lightbulb, DollarSign, Gift];

export function AskBox() {
  const t = useTranslations('ask');
  const tp = useTranslations('prompts');
  const tv = useTranslations('voice');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const addHistory = useHistoryStore((s) => s.add);
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

  function toggleMic() {
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

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const value = ev.target?.result;
      if (typeof value === 'string') {
        setAttachments((prev) => [
          ...prev,
          { id: nanoid(6), type: 'image', value, label: f.name },
        ]);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  function onPasteLink() {
    const url = window.prompt(t('linkPrompt'), '');
    if (url && url.trim()) {
      setAttachments((prev) => [
        ...prev,
        { id: nanoid(6), type: 'link', value: url.trim(), label: url.trim() },
      ]);
    }
  }

  function removeAttach(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    const q = text.trim() || (attachments.length ? '(attachments)' : '');
    if (!q) {
      textareaRef.current?.focus();
      return;
    }
    const query = { q, attachments };
    addHistory(query);
    const params = new URLSearchParams({ q });
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

  const promptKeys = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

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
            placeholder={speech.listening ? tv('listening') : t('placeholder')}
            value={text}
            onChange={onTextChange}
            onKeyDown={onKey}
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
          <Button variant="primary" size="pillLg" onClick={submit} className="font-bold">
            <span>{t('submit')}</span>
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      </div>

      {/* example chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {promptKeys.map((k, i) => {
          const Icon = PROMPT_ICONS[i] ?? ShoppingBag;
          const label = tp(k);
          return (
            <button
              key={k}
              onClick={() => applyPrompt(label)}
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:-translate-y-px hover:border-ink-300 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-700 dark:hover:bg-ink-800"
            >
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

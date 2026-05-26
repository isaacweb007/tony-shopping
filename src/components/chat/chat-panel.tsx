'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare, Send, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { useSearchStore } from '@/stores/search-store';
import { matchIntent } from '@/lib/chat-intent';
import { formatMoney, formatCount, shipLabel } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';
import type { Money } from '@/types/product';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { MicButton } from '@/components/voice/mic-button';

interface Message {
  id: string;
  who: 'tony' | 'user';
  text: string;
}

export function ChatPanel() {
  const t = useTranslations('chat');
  const tg = useTranslations();
  const tv = useTranslations('voice');
  const locale = useLocale() as AppLocale;

  const open = useUIStore((s) => s.chatOpen);
  const setOpen = useUIStore((s) => s.setChatOpen);

  const result = useSearchStore((s) => s.result);
  const setSort = useSearchStore((s) => s.setSort);
  const setStore = useSearchStore((s) => s.setStore);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition(locale, { interimResults: false });
  const tts = useSpeechSynthesis(locale);

  // When listening finishes with a final transcript, auto-send.
  React.useEffect(() => {
    if (!speech.listening && speech.finalTranscript.trim()) {
      send(speech.finalTranscript.trim());
      speech.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, speech.finalTranscript]);

  // Seed greeting when first opened.
  React.useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: 'greet', who: 'tony', text: t('greet') }]);
    }
  }, [open, messages.length, t]);

  // Reset on new search (different result.id).
  React.useEffect(() => {
    setMessages([]);
  }, [result?.id]);

  // Auto-scroll on new message.
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: 'u_' + Date.now(), who: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const reply = handleIntent(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: 't_' + Date.now(), who: 'tony', text: reply },
      ]);
      // Auto-speak if the user used voice input.
      if (speech.finalTranscript) tts.speak(stripHtml(reply));
    }, 550);
  }

  function toggleMic() {
    if (speech.listening) speech.stop();
    else speech.start();
  }

  function stripHtml(s: string): string {
    return s.replace(/<[^>]*>/g, '');
  }

  function handleIntent(text: string): string {
    const products = result?.products ?? [];
    if (products.length === 0) return t('intent.fallback');
    const intent = matchIntent(text, products);

    if (intent.kind === 'sort') {
      setSort(intent.sort);
      switch (intent.sort) {
        case 'price': {
          const minAmount = intent.vars.min as number;
          const min = formatMoney(
            { amount: minAmount, currency: (products[0]?.finalPrice.currency ?? 'KRW') as Money['currency'] },
            locale,
          );
          return t('intent.cheap', { min });
        }
        case 'ship': {
          const days = intent.vars.etaDays as number;
          return t('intent.fast', { eta: shipLabel(days, tg) });
        }
        case 'authentic':
          return t('intent.authentic');
        case 'review': {
          const n = intent.vars.n as number;
          return t('intent.review', { n: formatCount(n, locale) });
        }
        default:
          return t('intent.fallback');
      }
    }
    if (intent.kind === 'filter') {
      setStore(intent.store);
      return t('intent.vn');
    }
    if (intent.kind === 'summary') {
      const v = intent.vars;
      const min = formatMoney({ amount: v.minPrice, currency: v.currency as Money['currency'] }, locale);
      const max = formatMoney({ amount: v.maxPrice, currency: v.currency as Money['currency'] }, locale);
      const avg = formatMoney({ amount: v.avgPrice, currency: v.currency as Money['currency'] }, locale);
      return t('intent.summary', {
        n: v.n,
        min,
        max,
        avg,
        store: v.topStore,
        storeN: v.topStoreCount,
      });
    }
    return t('intent.fallback');
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('fabLong')}
        className={cn(
          'fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ink-900 px-4 font-semibold text-white shadow-card-hover transition hover:shadow-pop dark:bg-white dark:text-ink-900 md:bottom-6 md:right-6 md:h-13 md:px-5',
          open && 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.7} />
        <span className="hidden text-[13px] sm:inline">{t('fabLong')}</span>
        <span className="text-[13px] sm:hidden">{t('fabShort')}</span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-ink-200 bg-white shadow-pop transition-transform duration-300 ease-out dark:border-ink-800 dark:bg-ink-900',
          'md:bottom-6 md:right-6 md:left-auto md:inset-x-auto md:w-[420px] md:rounded-3xl md:border',
          open ? 'translate-y-0' : 'pointer-events-none translate-y-[110%]',
        )}
        style={{ height: 'min(80vh, 680px)' }}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-800">
          <div className="flex items-center gap-2.5">
            <span className="logo-mark flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-extrabold text-white">
              T
            </span>
            <div>
              <div className="text-[14px] font-bold tracking-tight leading-tight">
                {t('title')}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-ink-500 dark:text-ink-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('online')}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-ink-50/50 p-4 dark:bg-ink-950/40"
        >
          {messages.map((m) =>
            m.who === 'tony' ? (
              <TonyBubble
                key={m.id}
                onSpeak={tts.supported ? () => tts.speak(stripHtml(m.text)) : undefined}
                onStop={tts.speaking ? tts.cancel : undefined}
                speaking={tts.speaking}
                speakLabel={tv('speak')}
                stopLabel={tv('stopSpeaking')}
              >
                {m.text}
              </TonyBubble>
            ) : (
              <UserBubble key={m.id}>{m.text}</UserBubble>
            ),
          )}
          {typing && <TypingBubble />}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-ink-200 px-3 pt-2 dark:border-ink-800">
          <QuickChip onClick={() => send(t('quick.cheaper'))}>{t('quick.cheaper')}</QuickChip>
          <QuickChip onClick={() => send(t('quick.genuine'))}>{t('quick.genuine')}</QuickChip>
          <QuickChip onClick={() => send(t('quick.fast'))}>{t('quick.fast')}</QuickChip>
          <QuickChip onClick={() => send(t('quick.review'))}>{t('quick.review')}</QuickChip>
          <QuickChip onClick={() => send(t('quick.summary'))}>{t('quick.summary')}</QuickChip>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-ink-200 p-3 pt-2 pb-safe dark:border-ink-800"
        >
          <MicButton
            listening={speech.listening}
            supported={speech.supported}
            error={speech.error}
            onClick={toggleMic}
            size="sm"
          />
          <input
            type="text"
            value={speech.listening ? speech.transcript || tv('listening') : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            disabled={speech.listening}
            className="h-10 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15 disabled:opacity-70 dark:border-ink-700 dark:bg-ink-800"
          />
          <Button type="submit" variant="primary" size="icon" aria-label={t('send')}>
            <Send className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </form>
      </div>
    </>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-fade-up justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-ink-900 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white dark:bg-white dark:text-ink-900">
        {children}
      </div>
    </div>
  );
}

function TonyBubble({
  children,
  onSpeak,
  onStop,
  speaking,
  speakLabel,
  stopLabel,
}: {
  children: React.ReactNode;
  onSpeak?: () => void;
  onStop?: () => void;
  speaking?: boolean;
  speakLabel?: string;
  stopLabel?: string;
}) {
  // Render HTML (intent replies use <b>, <i>).
  const html = typeof children === 'string' ? children : '';
  return (
    <div className="flex animate-fade-up gap-2">
      <span className="logo-mark mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-xs font-extrabold text-white">
        T
      </span>
      <div className="group max-w-[85%] rounded-2xl rounded-tl-md border border-ink-200 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed dark:border-ink-700 dark:bg-ink-800">
        {html ? (
          // eslint-disable-next-line react/no-danger
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          children
        )}
        {onSpeak && (
          <button
            type="button"
            onClick={speaking ? onStop : onSpeak}
            aria-label={speaking ? stopLabel : speakLabel}
            title={speaking ? stopLabel : speakLabel}
            className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-ink-400 transition hover:text-accent-600 dark:text-ink-500 dark:hover:text-accent-400"
          >
            {speaking ? (
              <VolumeX className="h-3.5 w-3.5" strokeWidth={1.8} />
            ) : (
              <Volume2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2">
      <span className="logo-mark mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-xs font-extrabold text-white">
        T
      </span>
      <div className="flex gap-1 rounded-2xl rounded-tl-md border border-ink-200 bg-white px-3.5 py-2.5 dark:border-ink-700 dark:bg-ink-800">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-300 dark:bg-ink-500" style={{ animationDelay: '-0.32s' }} />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-300 dark:bg-ink-500" style={{ animationDelay: '-0.16s' }} />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-300 dark:bg-ink-500" />
      </div>
    </div>
  );
}

function QuickChip({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-[11.5px] hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:hover:bg-ink-700"
    >
      {children}
    </button>
  );
}

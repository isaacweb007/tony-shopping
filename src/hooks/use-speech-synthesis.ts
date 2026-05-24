'use client';

import * as React from 'react';
import type { AppLocale } from '@/i18n/routing';

const LANG_MAP: Record<AppLocale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  vi: 'vi-VN',
};

export interface UseSpeechSynthesisResult {
  supported: boolean;
  speaking: boolean;
  /** Speak the given text in the active locale. Cancels any previous utterance. */
  speak: (text: string) => void;
  cancel: () => void;
}

/**
 * Web Speech API TTS wrapper. Picks the best available voice for the
 * active locale; falls back to the browser default if no match.
 */
export function useSpeechSynthesis(locale: AppLocale): UseSpeechSynthesisResult {
  const [supported, setSupported] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = React.useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANG_MAP[locale];
      const match = voicesRef.current.find((v) => v.lang === LANG_MAP[locale]);
      if (match) utter.voice = match;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      synth.speak(utter);
    },
    [locale, supported],
  );

  const cancel = React.useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}

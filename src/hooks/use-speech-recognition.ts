'use client';

import * as React from 'react';
import type { AppLocale } from '@/i18n/routing';

/** Map app locale to BCP-47 used by SpeechRecognition.lang. */
const LANG_MAP: Record<AppLocale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  vi: 'vi-VN',
};

export type SpeechErrorReason =
  | 'unsupported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'unknown';

export interface UseSpeechRecognitionResult {
  /** Combined interim + final transcript. */
  transcript: string;
  /** Only the chunks marked final. */
  finalTranscript: string;
  listening: boolean;
  supported: boolean;
  error: SpeechErrorReason | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Web Speech API wrapper that exposes a stable API to React components.
 *
 * Browser support: Chrome / Edge / Safari (prefixed). Firefox: not supported.
 * The hook degrades gracefully — components should check `supported`.
 */
export function useSpeechRecognition(
  locale: AppLocale,
  options: { continuous?: boolean; interimResults?: boolean } = {},
): UseSpeechRecognitionResult {
  const { continuous = false, interimResults = true } = options;

  const [transcript, setTranscript] = React.useState('');
  const [finalTranscript, setFinalTranscript] = React.useState('');
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [error, setError] = React.useState<SpeechErrorReason | null>(null);

  const recogRef = React.useRef<SpeechRecognition | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recog = new Ctor();
    recog.continuous = continuous;
    recog.interimResults = interimResults;
    recog.maxAlternatives = 1;
    recog.lang = LANG_MAP[locale];

    recog.onresult = (e) => {
      let finals = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) finals += alt.transcript;
        else interim += alt.transcript;
      }
      setTranscript((prev) => (finals ? prev + finals + interim : interim || prev));
      if (finals) setFinalTranscript((prev) => prev + finals);
    };
    recog.onerror = (e) => {
      const code = e.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') setError('permission-denied');
      else if (code === 'no-speech') setError('no-speech');
      else if (code === 'network') setError('network');
      else setError('unknown');
      setListening(false);
    };
    recog.onend = () => setListening(false);
    recog.onstart = () => {
      setError(null);
      setListening(true);
    };

    recogRef.current = recog;
    return () => {
      try {
        recog.abort();
      } catch {
        /* noop */
      }
      recogRef.current = null;
    };
  }, [locale, continuous, interimResults]);

  const start = React.useCallback(() => {
    if (!recogRef.current) {
      setError('unsupported');
      return;
    }
    setTranscript('');
    setFinalTranscript('');
    setError(null);
    try {
      recogRef.current.start();
    } catch {
      // start() throws if already started — ignore.
    }
  }, []);

  const stop = React.useCallback(() => {
    recogRef.current?.stop();
  }, []);

  const reset = React.useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  return { transcript, finalTranscript, listening, supported, error, start, stop, reset };
}

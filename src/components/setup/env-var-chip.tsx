'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Clickable env-var pill on /setup cards. One click copies the var name
 * to the clipboard so the operator can paste straight into Vercel's
 * Environment Variables form. A 1.4s "copied" state replaces the icon
 * but leaves the var name in place — no layout shift.
 */
export function EnvVarChip({ name }: { name: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(name);
      } else {
        // Same legacy fallback shape used elsewhere (share lib).
        const ta = document.createElement('textarea');
        ta.value = name;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* silent — operators see the failure by lack of visual confirm */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${name}`}
      title={copied ? 'Copied!' : `Copy ${name}`}
      className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-700 transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:bg-accent-950/30 dark:hover:text-accent-300"
    >
      {name}
      {copied ? (
        <Check className="h-3 w-3" strokeWidth={2.4} />
      ) : (
        <Copy className="h-3 w-3 opacity-60" strokeWidth={1.8} />
      )}
    </button>
  );
}

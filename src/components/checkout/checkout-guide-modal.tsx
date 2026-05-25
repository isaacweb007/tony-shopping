'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, Info, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCheckoutGuideStore } from '@/stores/checkout-guide-store';
import { useCheckoutPrefsStore } from '@/stores/checkout-prefs-store';
import { buildCheckoutChecks, type ChecklistItem } from '@/lib/checkout/checks';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/i18n/routing';

/**
 * Mounted once at app root. Renders the pre-checkout vetting modal whenever
 * any "Buy" path called useCheckoutGuide().guard with a product.
 */
export function CheckoutGuideModal() {
  const t = useTranslations('checkout');
  const locale = useLocale() as AppLocale;
  const pending = useCheckoutGuideStore((s) => s.pending);
  const dismiss = useCheckoutGuideStore((s) => s.dismiss);
  const dontShow = useCheckoutPrefsStore((s) => s.dontShow);
  const setDontShow = useCheckoutPrefsStore((s) => s.setDontShow);

  const checks = React.useMemo<ChecklistItem[]>(() => {
    if (!pending) return [];
    return buildCheckoutChecks(pending.product, locale);
  }, [pending, locale]);

  function onProceed() {
    if (!pending) return;
    pending.onProceed();
    dismiss();
  }

  function onCancel() {
    dismiss();
  }

  const open = pending !== null;
  const productName = pending?.product.name ?? '';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-[18px] font-extrabold tracking-tighter2 md:text-[20px]">
          {t('title')}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
          {t('subtitle', { name: productName })}
        </DialogDescription>

        <ul className="mt-4 space-y-2">
          {checks.map((c) => (
            <CheckRow key={c.key} item={c} />
          ))}
        </ul>

        <label className="mt-5 flex cursor-pointer select-none items-center gap-2 text-[12px] text-ink-500 dark:text-ink-400">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600 focus:ring-accent-500"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          {t('dontShow')}
        </label>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <Button variant="outline" className="h-11 rounded-xl" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button variant="primary" className="h-11 rounded-xl px-5 font-bold" onClick={onProceed}>
            {t('proceed')}
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({ item }: { item: ChecklistItem }) {
  const t = useTranslations('checkout');
  const Icon =
    item.severity === 'warning' ? ShieldAlert : item.severity === 'caution' ? AlertTriangle : Info;
  const tone =
    item.severity === 'warning'
      ? 'border-red-200 bg-red-50/60 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
      : item.severity === 'caution'
        ? 'border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
        : 'border-ink-200 bg-ink-50/60 text-ink-700 dark:border-ink-800 dark:bg-ink-800/30 dark:text-ink-200';
  return (
    <li className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px]', tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
      <span className="leading-snug">
        <b className="font-bold">{t(`checks.${item.key}.label` as 'checks.customsKR.label')}</b>
        <span className="ml-1 font-normal">
          {t(`checks.${item.key}.body` as 'checks.customsKR.body', item.vars ?? {})}
        </span>
      </span>
    </li>
  );
}

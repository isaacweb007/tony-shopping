'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { getBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => getBrowserClient(), []);
  const available = isSupabaseConfigured && !!supabase;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!available || !supabase) {
      setError(t('errorUnavailable'));
      return;
    }
    if (!email || !password) {
      setError(t('errorRequired'));
      return;
    }
    setLoading(true);
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                typeof window === 'undefined'
                  ? undefined
                  : `${window.location.origin}/auth/callback`,
            },
          });
    const { error: err } = await fn;
    setLoading(false);
    if (err) {
      setError(t('errorInvalid'));
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function magicLink() {
    if (!available || !supabase || !email) {
      setError(t('errorRequired'));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window === 'undefined' ? undefined : `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(t('errorInvalid'));
      return;
    }
    toast.success(t('magicLinkSent'));
  }

  async function withGoogle() {
    if (!available || !supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window === 'undefined' ? undefined : `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink-700 dark:text-ink-300">
          {t('email')}
        </span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            autoComplete={mode === 'signin' ? 'email' : 'email'}
            className="w-full rounded-xl border border-ink-200 bg-white px-9 py-2.5 text-[14px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15 dark:border-ink-700 dark:bg-ink-900"
            required
          />
        </div>
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink-700 dark:text-ink-300">
          {t('password')}
        </span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordPlaceholder')}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={8}
            className="w-full rounded-xl border border-ink-200 bg-white px-9 py-2.5 text-[14px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15 dark:border-ink-700 dark:bg-ink-900"
            required
          />
        </div>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className={cn('h-11 w-full rounded-xl font-bold')}
        disabled={loading || !available}
      >
        {mode === 'signin' ? t('submitSignIn') : t('submitSignUp')}
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </Button>

      <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        {t('or')}
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl"
        onClick={magicLink}
        disabled={loading || !available}
      >
        {t('magicLink')}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl"
        onClick={withGoogle}
        disabled={loading || !available}
      >
        {t('withGoogle')}
      </Button>

      <p className="pt-1 text-center text-[12px] text-ink-500 dark:text-ink-400">
        {mode === 'signin' ? t('noAccount') : t('haveAccount')}{' '}
        <Link
          href={mode === 'signin' ? '/auth/sign-up' : '/auth/sign-in'}
          className="font-semibold text-accent-600 hover:underline dark:text-accent-400"
        >
          {mode === 'signin' ? t('signUp') : t('signIn')}
        </Link>
      </p>

      {!available && (
        <p className="text-center text-[11px] text-amber-700 dark:text-amber-300">
          {t('errorUnavailable')}
        </p>
      )}
    </form>
  );
}

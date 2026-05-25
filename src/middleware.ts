import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/supabase/middleware';

const intl = createIntlMiddleware(routing);

/**
 * Pipeline:
 *   1) next-intl handles locale routing
 *   2) Supabase refreshes the session cookie on the resulting response
 *
 * Both layers are safe no-ops when their inputs are missing.
 */
export default async function middleware(request: NextRequest) {
  // next-intl returns a fully-fledged response (rewrite/redirect).
  const intlResponse = intl(request);

  // We need supabase's refreshed cookies on that response. Merge them.
  const supabaseResponse = await refreshSession(request);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }
  return intlResponse;
}

export const config = {
  // `offline` is excluded so the service-worker shell page stays locale-less —
  // the SW cached `/offline` literal at install time; if intl rewrote it the
  // navigation fallback would land on a redirect response in the Cache API.
  matcher: ['/((?!api|_next|_vercel|offline|share|sw\\.js|manifest\\.webmanifest|.*\\..*).*)'],
};

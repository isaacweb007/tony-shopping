import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/**
 * Service-role Supabase client for trusted server jobs (the price-watch cron).
 *
 * Unlike getServerClient(), this carries NO user session and BYPASSES RLS, so
 * it can read every user's shortlist and write observations on their behalf.
 * Never expose it to a request that isn't authenticated as a trusted caller
 * (the cron route gates on CRON_SECRET before touching it).
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY (or the URL) is absent, so the
 * cron degrades to a no-op instead of crashing on unconfigured deploys.
 */
export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!SUPABASE_URL || !serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

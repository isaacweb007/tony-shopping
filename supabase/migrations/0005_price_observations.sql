-- Tony Shopping — server-side price observations
--
-- Paste this whole file into the Supabase SQL Editor and run once. Idempotent.
--
-- A per-user time series of prices Tony observed for each shortlisted product.
-- Populated by the Vercel Cron job (/api/cron/price-watch) which re-runs the
-- search for every shortlisted product and appends a row whenever the price
-- *moved* — so this is a clean record of moves, not a re-saw-it log. The
-- /alerts page merges these into the per-device price-watch timeline so a
-- price drop detected while the user was away still lights up the inbox.
--
-- Rows are written by the cron using the service-role key (RLS bypassed), so
-- only a SELECT policy (own rows) is needed for the user-facing read endpoint.

create table if not exists public.price_observations (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  product_id     text        not null,
  price_amount   integer     not null,
  price_currency text        not null,
  -- 'cron' = scheduled re-fetch, 'search' = observed during a live user search.
  source         text        not null default 'cron',
  observed_at    timestamptz not null default now()
);

-- Latest-first lookup per watched product (drives "current vs previous").
create index if not exists price_obs_user_product_idx
  on public.price_observations (user_id, product_id, observed_at desc);

alter table public.price_observations enable row level security;

drop policy if exists "price_obs select own" on public.price_observations;
drop policy if exists "price_obs insert own" on public.price_observations;

create policy "price_obs select own"
  on public.price_observations for select using (auth.uid() = user_id);
-- Lets a future client-side path record observations for the signed-in user;
-- the cron path bypasses RLS via the service role and does not rely on this.
create policy "price_obs insert own"
  on public.price_observations for insert with check (auth.uid() = user_id);

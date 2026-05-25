-- Tony Shopping — public cohort short-link table
--
-- Paste this whole file into the Supabase SQL Editor and run once.
-- Idempotent.
--
-- /c/{slug} is a public read of a cohort someone shared. Anyone (signed-in
-- or not) can open the URL and see the same compare view. Only signed-in
-- users can mint a new short link — but the row they mint is readable by
-- the world.
--
-- We deliberately do NOT store buyUrl from third-party merchant pages —
-- product.buyUrl can include affiliate IDs we don't want to leak across
-- accounts. The /c/{slug} page re-derives those locally at render time.

create table if not exists public.cohort_shares (
  slug         text        primary key,
  user_id      uuid        references auth.users(id) on delete set null,
  -- snaps is a JSON array of ShortlistSnap-shape rows. We trust the client
  -- payload up to a size cap enforced at the API layer.
  snaps        jsonb       not null,
  winner_id    text,
  priority     text        not null default 'balanced',
  locale       text        not null default 'ko',
  created_at   timestamptz not null default now()
);

create index if not exists cohort_shares_created_idx
  on public.cohort_shares (created_at desc);

alter table public.cohort_shares enable row level security;

drop policy if exists "cohort_shares public select" on public.cohort_shares;
drop policy if exists "cohort_shares authed insert" on public.cohort_shares;

-- Public read — anyone (anon role too) can follow a /c/{slug} link.
create policy "cohort_shares public select"
  on public.cohort_shares for select using (true);

-- Only authenticated users can mint a new short link.
create policy "cohort_shares authed insert"
  on public.cohort_shares for insert
  with check (auth.uid() is not null);

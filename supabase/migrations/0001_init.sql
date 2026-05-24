-- Tony Shopping — initial schema
--
-- Paste this whole file into the Supabase SQL Editor (Project ▸ SQL ▸ New query)
-- and run it once. It is idempotent — safe to re-run.
--
-- Tables
--   shortlist  — per-user compare list (product snapshots so they survive
--                even when the merchant link breaks)
--   history    — per-user search history
--   clicks     — anonymous-style outbound click ledger, linked to user_id
--                so users see only their own funnel.
--
-- RLS is enabled on every table; every policy requires auth.uid() = user_id.

------------------------------------------------------------
-- shortlist
------------------------------------------------------------
create table if not exists public.shortlist (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  product_id   text        not null,
  name         text        not null,
  store        text        not null,
  price_amount integer     not null,
  price_currency text      not null,
  image_url    text,
  buy_url      text,
  tony_score   smallint,
  added_at     timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists shortlist_user_added_idx
  on public.shortlist (user_id, added_at desc);

alter table public.shortlist enable row level security;

drop policy if exists "shortlist select own"   on public.shortlist;
drop policy if exists "shortlist insert own"   on public.shortlist;
drop policy if exists "shortlist update own"   on public.shortlist;
drop policy if exists "shortlist delete own"   on public.shortlist;

create policy "shortlist select own"
  on public.shortlist for select using (auth.uid() = user_id);
create policy "shortlist insert own"
  on public.shortlist for insert with check (auth.uid() = user_id);
create policy "shortlist update own"
  on public.shortlist for update using (auth.uid() = user_id);
create policy "shortlist delete own"
  on public.shortlist for delete using (auth.uid() = user_id);

------------------------------------------------------------
-- history
------------------------------------------------------------
create table if not exists public.history (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  q          text        not null,
  attachments jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists history_user_created_idx
  on public.history (user_id, created_at desc);

alter table public.history enable row level security;

drop policy if exists "history select own"   on public.history;
drop policy if exists "history insert own"   on public.history;
drop policy if exists "history delete own"   on public.history;

create policy "history select own"
  on public.history for select using (auth.uid() = user_id);
create policy "history insert own"
  on public.history for insert with check (auth.uid() = user_id);
create policy "history delete own"
  on public.history for delete using (auth.uid() = user_id);

------------------------------------------------------------
-- clicks
------------------------------------------------------------
create table if not exists public.clicks (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  product_id    text        not null,
  store         text        not null,
  tag           text        not null,
  score         smallint    not null,
  from_verdict  boolean     not null,
  q             text,
  created_at    timestamptz not null default now()
);

create index if not exists clicks_user_created_idx
  on public.clicks (user_id, created_at desc);
create index if not exists clicks_store_idx
  on public.clicks (store);

alter table public.clicks enable row level security;

drop policy if exists "clicks select own"   on public.clicks;
drop policy if exists "clicks insert own"   on public.clicks;

create policy "clicks select own"
  on public.clicks for select using (auth.uid() = user_id);
create policy "clicks insert own"
  on public.clicks for insert with check (auth.uid() = user_id);

------------------------------------------------------------
-- profiles (minimal — used for the user menu greeting + future preferences)
------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale       text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles select own"  on public.profiles;
drop policy if exists "profiles upsert own"  on public.profiles;
drop policy if exists "profiles update own"  on public.profiles;

create policy "profiles select own"
  on public.profiles for select using (auth.uid() = user_id);
create policy "profiles upsert own"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles update own"
  on public.profiles for update using (auth.uid() = user_id);

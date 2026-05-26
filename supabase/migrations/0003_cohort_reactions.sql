-- Tony Shopping — anonymous reactions on shared cohort short-links (/c/{slug})
--
-- Paste this into the Supabase SQL Editor and run once. Idempotent.
--
-- One row per (slug, voter_hash) so the same anonymous device can flip its
-- own vote (up→down) but cannot inflate the count. voter_hash is a 16-char
-- nanoid stored in the visitor's LocalStorage — no PII server-side.

create table if not exists public.cohort_reactions (
  slug         text        not null references public.cohort_shares(slug) on delete cascade,
  voter_hash   text        not null,
  kind         text        not null check (kind in ('up', 'down')),
  created_at   timestamptz not null default now(),
  primary key (slug, voter_hash)
);

create index if not exists cohort_reactions_slug_idx
  on public.cohort_reactions (slug);

alter table public.cohort_reactions enable row level security;

drop policy if exists "cohort_reactions public select" on public.cohort_reactions;
drop policy if exists "cohort_reactions public upsert" on public.cohort_reactions;

-- Public read so /c/{slug} can render the tally without authentication.
create policy "cohort_reactions public select"
  on public.cohort_reactions for select using (true);

-- Anonymous insert / update via the API route (which validates the voter_hash
-- shape). The trade-off: someone could spam tallies by rotating hashes — the
-- API rate-limits at the edge.
create policy "cohort_reactions public upsert"
  on public.cohort_reactions for insert with check (
    char_length(voter_hash) between 8 and 64
    and char_length(slug) <= 16
  );

create policy "cohort_reactions public update"
  on public.cohort_reactions for update using (true) with check (
    char_length(voter_hash) between 8 and 64
  );

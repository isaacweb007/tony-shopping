-- Tony Shopping — cohort clone counter
--
-- Paste this into the Supabase SQL Editor and run once. Idempotent.
--
-- Adds a `clones` column on cohort_shares plus a SECURITY DEFINER function
-- so anonymous visitors can increment the counter (atomic +1) without
-- being granted a generic UPDATE policy on the table.
--
-- We don't track *who* cloned — only the running total. Cloning is
-- anonymous per device (slugs the visitor has cloned live in their own
-- localStorage); cross-device totals come from this column.

alter table public.cohort_shares
  add column if not exists clones integer not null default 0;

create or replace function public.increment_cohort_clones(p_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.cohort_shares
     set clones = clones + 1
   where slug = p_slug
   returning clones into v_count;
  -- If the slug doesn't exist we just return null — the API layer renders
  -- a 404 in that case.
  return v_count;
end;
$$;

-- Allow anon role to invoke the bumper (the function body itself is
-- the only entry point; the underlying UPDATE policy stays restrictive).
grant execute on function public.increment_cohort_clones(text) to anon, authenticated;

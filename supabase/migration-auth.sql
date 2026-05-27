-- ============================================================
-- Migration: proper RLS policies per operation
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Set default user_id to auth.uid() so clients can't spoof it
alter table taste_profiles  alter column user_id set default auth.uid();
alter table coffee_selections alter column user_id set default auth.uid();
alter table guides           alter column user_id set default auth.uid();
alter table tasting_notes    alter column user_id set default auth.uid();

-- 2. Drop old permissive "for all" policies (too broad, missing WITH CHECK)
drop policy if exists "Users see own profiles"   on taste_profiles;
drop policy if exists "Users see own selections"  on coffee_selections;
drop policy if exists "Users see own guides"      on guides;
drop policy if exists "Users see own notes"       on tasting_notes;

-- 3. Ensure RLS is enabled
alter table taste_profiles   enable row level security;
alter table coffee_selections enable row level security;
alter table guides           enable row level security;
alter table tasting_notes    enable row level security;

-- ============================================================
-- taste_profiles
-- ============================================================
create policy "tp_select" on taste_profiles
  for select using (auth.uid() = user_id);

create policy "tp_insert" on taste_profiles
  for insert with check (auth.uid() = user_id);

create policy "tp_update" on taste_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tp_delete" on taste_profiles
  for delete using (auth.uid() = user_id);

-- ============================================================
-- coffee_selections
-- ============================================================
create policy "cs_select" on coffee_selections
  for select using (auth.uid() = user_id);

create policy "cs_insert" on coffee_selections
  for insert with check (auth.uid() = user_id);

create policy "cs_update" on coffee_selections
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cs_delete" on coffee_selections
  for delete using (auth.uid() = user_id);

-- ============================================================
-- guides
-- ============================================================
create policy "g_select" on guides
  for select using (auth.uid() = user_id);

create policy "g_insert" on guides
  for insert with check (auth.uid() = user_id);

create policy "g_delete" on guides
  for delete using (auth.uid() = user_id);

-- ============================================================
-- tasting_notes
-- ============================================================
create policy "tn_select" on tasting_notes
  for select using (auth.uid() = user_id);

create policy "tn_insert" on tasting_notes
  for insert with check (auth.uid() = user_id);

create policy "tn_update" on tasting_notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tn_delete" on tasting_notes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Service role bypass (API routes use service_role key,
-- which already bypasses RLS — no extra policy needed)
-- ============================================================

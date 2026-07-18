-- RLS для cups: чтение, запись, правка своих чашек
alter table cups enable row level security;

drop policy if exists "cups_select" on cups;
drop policy if exists "cups_insert" on cups;
drop policy if exists "cups_update" on cups;
drop policy if exists "cups_delete" on cups;

create policy "cups_select" on cups for select using (auth.uid() = user_id);
create policy "cups_insert" on cups for insert with check (auth.uid() = user_id);
create policy "cups_update" on cups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cups_delete" on cups for delete using (auth.uid() = user_id);

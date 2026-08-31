-- Сравнения (tasting flights) + привязка чашек
create table if not exists tasting_flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Сравнение',
  brew_method text,
  beans jsonb not null default '[]'::jsonb,
  focus text,
  conclusion text,
  status text not null default 'active' check (status in ('draft', 'active', 'completed')),
  source text not null default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasting_flights_user on tasting_flights (user_id, updated_at desc);

alter table tasting_flights enable row level security;

drop policy if exists "tf_select" on tasting_flights;
create policy "tf_select" on tasting_flights for select using (auth.uid() = user_id);
drop policy if exists "tf_insert" on tasting_flights;
create policy "tf_insert" on tasting_flights for insert with check (auth.uid() = user_id);
drop policy if exists "tf_update" on tasting_flights;
create policy "tf_update" on tasting_flights for update using (auth.uid() = user_id);
drop policy if exists "tf_delete" on tasting_flights;
create policy "tf_delete" on tasting_flights for delete using (auth.uid() = user_id);

alter table cups add column if not exists flight_id uuid references tasting_flights(id) on delete set null;
alter table cups add column if not exists flight_slot smallint;

create index if not exists idx_cups_flight on cups (flight_id, flight_slot);

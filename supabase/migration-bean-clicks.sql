-- Трекинг кликов «Купить» для партнёрок с обжарщиками
-- Запустить в Supabase SQL Editor

create table if not exists bean_clicks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  bean_name text not null default '',
  bean_key text,
  roaster text not null default '',
  target_url text not null,
  source text not null default 'unknown',
  created_at timestamptz default now()
);

create index if not exists idx_bean_clicks_roaster on bean_clicks(roaster, created_at desc);
create index if not exists idx_bean_clicks_created on bean_clicks(created_at desc);

alter table bean_clicks enable row level security;

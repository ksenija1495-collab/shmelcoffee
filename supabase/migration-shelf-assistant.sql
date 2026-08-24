-- AI-ассистент на полке (подписка)
-- Запустить в Supabase SQL Editor после guide_credits

create table if not exists shelf_assistant_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until timestamptz not null,
  plan text not null default 'monthly',
  updated_at timestamptz default now()
);

alter table shelf_assistant_subscriptions enable row level security;

drop policy if exists "sas_select" on shelf_assistant_subscriptions;
create policy "sas_select" on shelf_assistant_subscriptions
  for select using (auth.uid() = user_id);

create or replace function grant_shelf_assistant(p_user uuid, p_days int default 30)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base timestamptz;
  next_until timestamptz;
begin
  select active_until into base
  from shelf_assistant_subscriptions
  where user_id = p_user;

  if base is null or base < now() then
    base := now();
  end if;

  next_until := base + make_interval(days => greatest(p_days, 1));

  insert into shelf_assistant_subscriptions (user_id, active_until, plan, updated_at)
  values (p_user, next_until, 'monthly', now())
  on conflict (user_id) do update
  set active_until = excluded.active_until,
      updated_at = now();
end;
$$;

create or replace function has_shelf_assistant(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  until timestamptz;
begin
  select active_until into until
  from shelf_assistant_subscriptions
  where user_id = p_user;

  return until is not null and until > now();
end;
$$;

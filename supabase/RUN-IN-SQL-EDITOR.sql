-- ═══════════════════════════════════════════════════════════════
-- Shmelcoffee — запустить ОДИН РАЗ в Supabase SQL Editor
-- Dashboard → SQL → New query → вставить всё → Run
-- https://supabase.com/dashboard/project/vakdjxdbfoxkrsedgwcl/sql/new
-- ═══════════════════════════════════════════════════════════════

-- 1. Трекинг кликов «Купить»
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

-- 2. Идемпотентность Prodamus (если ещё нет)
create table if not exists prodamus_orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credits int not null,
  created_at timestamptz default now()
);
alter table prodamus_orders enable row level security;

-- 3. guide_credits + RPC (безопасно перезаписать)
create table if not exists guide_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);
alter table guide_credits enable row level security;
drop policy if exists "gc_select" on guide_credits;
create policy "gc_select" on guide_credits for select using (auth.uid() = user_id);

create or replace function add_guide_credits(p_user uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into guide_credits (user_id, balance) values (p_user, p_amount)
  on conflict (user_id) do update
  set balance = guide_credits.balance + excluded.balance, updated_at = now();
end; $$;

create or replace function consume_guide_credit(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_balance int;
begin
  select balance into current_balance from guide_credits where user_id = p_user for update;
  if current_balance is null or current_balance < 1 then return false; end if;
  update guide_credits set balance = balance - 1, updated_at = now() where user_id = p_user;
  return true;
end; $$;

-- 4. Статистика сообщества (обжarщики + клики)
create or replace function get_community_stats()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select json_build_object(
    'total_users', (select count(distinct user_id) from taste_profiles),
    'countries', coalesce((
      select json_agg(row_to_json(t) order by t.users desc) from (
        select tp.profile_type as origin, count(*)::int as users
        from taste_profiles tp where tp.profile_type is not null and tp.profile_type <> ''
        group by tp.profile_type limit 8
      ) t
    ), '[]'::json),
    'flavors', coalesce((
      select json_agg(row_to_json(t) order by t.users desc) from (
        select unnest(preferred_tastes) as flavor, count(*)::int as users
        from taste_profiles where preferred_tastes is not null
        group by 1 order by users desc limit 8
      ) t
    ), '[]'::json),
    'roasters', coalesce((
      select json_agg(row_to_json(t) order by t.clicks desc) from (
        select roaster, count(*)::int as clicks from bean_clicks
        where roaster <> '' group by roaster order by clicks desc limit 8
      ) t
    ), '[]'::json),
    'beans', coalesce((
      select json_agg(row_to_json(t) order by t.clicks desc) from (
        select bean_name as name, roaster, count(*)::int as clicks from bean_clicks
        where bean_name <> '' group by bean_name, roaster order by clicks desc limit 8
      ) t
    ), '[]'::json),
    'shelf_roasters', coalesce((
      select json_agg(row_to_json(t) order by t.users desc) from (
        select roaster, count(distinct user_id)::int as users from shelf_items
        where kind = 'bean' and roaster is not null and roaster <> ''
        group by roaster order by users desc limit 6
      ) t
    ), '[]'::json)
  ) into result;
  return result;
end; $$;

-- 5. Базовые рецепты + карточка чашки (см. migration-saved-brew-recipes.sql)
create table if not exists saved_brew_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brew_method text,
  recipe jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_saved_brew_recipes_user on saved_brew_recipes(user_id, created_at desc);
alter table saved_brew_recipes enable row level security;
drop policy if exists "sbr_select" on saved_brew_recipes;
drop policy if exists "sbr_insert" on saved_brew_recipes;
drop policy if exists "sbr_update" on saved_brew_recipes;
drop policy if exists "sbr_delete" on saved_brew_recipes;
create policy "sbr_select" on saved_brew_recipes for select using (auth.uid() = user_id);
create policy "sbr_insert" on saved_brew_recipes for insert with check (auth.uid() = user_id);
create policy "sbr_update" on saved_brew_recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sbr_delete" on saved_brew_recipes for delete using (auth.uid() = user_id);
alter table cups add column if not exists brew_recipe_id uuid references saved_brew_recipes(id) on delete set null;
create or replace function get_cup_card(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select id, name, roaster, country, process, brew_method, recipe,
         acidity, sweetness, bitterness, body, notes, rating, comment, created_at
  into c from cups where id = p_id;
  if not found then return null; end if;
  return json_build_object(
    'id', c.id, 'name', c.name, 'roaster', c.roaster, 'country', c.country,
    'process', c.process, 'brew_method', c.brew_method, 'recipe', c.recipe,
    'acidity', c.acidity, 'sweetness', c.sweetness, 'bitterness', c.bitterness,
    'body', c.body, 'notes', c.notes, 'rating', c.rating, 'comment', c.comment,
    'created_at', c.created_at
  );
end; $$;
grant execute on function get_cup_card(uuid) to anon, authenticated;

-- 6. RLS для cups (редактирование чашек)
alter table cups enable row level security;
drop policy if exists "cups_select" on cups;
drop policy if exists "cups_insert" on cups;
drop policy if exists "cups_update" on cups;
drop policy if exists "cups_delete" on cups;
create policy "cups_select" on cups for select using (auth.uid() = user_id);
create policy "cups_insert" on cups for insert with check (auth.uid() = user_id);
create policy "cups_update" on cups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cups_delete" on cups for delete using (auth.uid() = user_id);

-- 7. Статус запаса зерна на полке (см. migration-shelf-status.sql)
alter table shelf_items add column if not exists status text not null default 'ok';
alter table shelf_items drop constraint if exists shelf_items_status_check;
alter table shelf_items add constraint shelf_items_status_check check (status in ('ok', 'low', 'out'));
create index if not exists shelf_items_user_status_idx on shelf_items (user_id, status);
drop policy if exists "shelf_items_update" on shelf_items;
create policy "shelf_items_update" on shelf_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. AI-ассистент на полке (см. migration-shelf-assistant.sql)
create table if not exists shelf_assistant_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until timestamptz not null,
  plan text not null default 'monthly',
  updated_at timestamptz default now()
);
alter table shelf_assistant_subscriptions enable row level security;
drop policy if exists "sas_select" on shelf_assistant_subscriptions;
create policy "sas_select" on shelf_assistant_subscriptions for select using (auth.uid() = user_id);

create or replace function grant_shelf_assistant(p_user uuid, p_days int default 30)
returns void language plpgsql security definer set search_path = public as $$
declare base timestamptz; next_until timestamptz;
begin
  select active_until into base from shelf_assistant_subscriptions where user_id = p_user;
  if base is null or base < now() then base := now(); end if;
  next_until := base + make_interval(days => greatest(p_days, 1));
  insert into shelf_assistant_subscriptions (user_id, active_until, plan, updated_at)
  values (p_user, next_until, 'monthly', now())
  on conflict (user_id) do update set active_until = excluded.active_until, updated_at = now();
end; $$;

create or replace function has_shelf_assistant(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare until timestamptz;
begin
  select active_until into until from shelf_assistant_subscriptions where user_id = p_user;
  return until is not null and until > now();
end; $$;

-- 9. Feedback AI-ассистента (см. migration-shelf-assistant-feedback.sql)
create table if not exists shelf_assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('message_rating', 'pairing_success')),
  rating smallint check (rating is null or rating in (-1, 1)),
  user_message text,
  assistant_reply text,
  bean_a text,
  bean_b text,
  note text,
  created_at timestamptz default now()
);
create index if not exists shelf_assistant_feedback_user_kind_idx
  on shelf_assistant_feedback (user_id, kind, created_at desc);
alter table shelf_assistant_feedback enable row level security;
drop policy if exists "saf_select" on shelf_assistant_feedback;
create policy "saf_select" on shelf_assistant_feedback for select using (auth.uid() = user_id);
drop policy if exists "saf_insert" on shelf_assistant_feedback;
create policy "saf_insert" on shelf_assistant_feedback for insert with check (auth.uid() = user_id);

-- 10. Сравнения (tasting flights) — см. migration-tasting-flights.sql
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

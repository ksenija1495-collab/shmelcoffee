-- Исключение владельца/тестов из агрегированных метрик
-- Запустить в Supabase SQL Editor

create table if not exists metrics_excluded_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz default now()
);

alter table metrics_excluded_users enable row level security;

insert into metrics_excluded_users (user_id, note)
values ('d83618c4-5c8f-4e82-a79d-eeba7a148661', 'Owner — ksenija14.95@gmail.com')
on conflict (user_id) do nothing;

create or replace function get_community_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'total_users', (
      select count(distinct user_id) from taste_profiles
      where user_id not in (select user_id from metrics_excluded_users)
    ),
    'countries', coalesce((
      select json_agg(row_to_json(t) order by t.users desc)
      from (
        select tp.profile_type as origin, count(*)::int as users
        from taste_profiles tp
        where tp.profile_type is not null and tp.profile_type <> ''
          and tp.user_id not in (select user_id from metrics_excluded_users)
        group by tp.profile_type
        limit 8
      ) t
    ), '[]'::json),
    'flavors', coalesce((
      select json_agg(row_to_json(t) order by t.users desc)
      from (
        select unnest(preferred_tastes) as flavor, count(*)::int as users
        from taste_profiles
        where preferred_tastes is not null
          and user_id not in (select user_id from metrics_excluded_users)
        group by 1
        order by users desc
        limit 8
      ) t
    ), '[]'::json),
    'roasters', coalesce((
      select json_agg(row_to_json(t) order by t.clicks desc)
      from (
        select roaster, count(*)::int as clicks
        from bean_clicks
        where roaster <> ''
          and (user_id is null or user_id not in (select user_id from metrics_excluded_users))
        group by roaster
        order by clicks desc
        limit 8
      ) t
    ), '[]'::json),
    'beans', coalesce((
      select json_agg(row_to_json(t) order by t.clicks desc)
      from (
        select bean_name as name, roaster, count(*)::int as clicks
        from bean_clicks
        where bean_name <> ''
          and (user_id is null or user_id not in (select user_id from metrics_excluded_users))
        group by bean_name, roaster
        order by clicks desc
        limit 8
      ) t
    ), '[]'::json),
    'shelf_roasters', coalesce((
      select json_agg(row_to_json(t) order by t.users desc)
      from (
        select roaster, count(distinct user_id)::int as users
        from shelf_items
        where kind = 'bean' and roaster is not null and roaster <> ''
          and user_id not in (select user_id from metrics_excluded_users)
        group by roaster
        order by users desc
        limit 6
      ) t
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

create or replace function get_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  ex uuid[];
begin
  select coalesce(array_agg(user_id), '{}') into ex from metrics_excluded_users;

  select json_build_object(
    'registrations', (
      select count(*)::int from auth.users u
      where u.id <> all(ex)
    ),
    'quiz_done', (
      select count(distinct user_id)::int from taste_profiles
      where user_id <> all(ex)
    ),
    'active', (
      select count(distinct uid)::int from (
        select user_id as uid from cups where user_id <> all(ex)
        union
        select user_id as uid from shelf_items where user_id <> all(ex)
      ) s
    ),
    'generated', (
      select count(distinct user_id)::int from guides where user_id <> all(ex)
    ),
    'guides_total', (
      select count(*)::int from guides where user_id <> all(ex)
    ),
    'purchases', (
      select count(*)::int from events
      where type = 'purchase' and (user_id is null or user_id <> all(ex))
    ),
    'paying_users', (
      select count(distinct user_id)::int from events
      where type = 'purchase' and user_id is not null and user_id <> all(ex)
    ),
    'passport_views', (
      select count(*)::int from events
      where type = 'passport_view' and (user_id is null or user_id <> all(ex))
    ),
    'passport_shares', (
      select count(*)::int from events
      where type = 'passport_share' and (user_id is null or user_id <> all(ex))
    )
  ) into result;

  return result;
end;
$$;

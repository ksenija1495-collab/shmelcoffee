-- Расширенная статистика сообщества (обжарщики + клики)
-- Запустить в Supabase SQL Editor после migration-bean-clicks.sql

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
    'total_users', (select count(distinct user_id) from taste_profiles),
    'countries', coalesce((
      select json_agg(row_to_json(t) order by t.users desc)
      from (
        select tp.profile_type as origin, count(*)::int as users
        from taste_profiles tp
        where tp.profile_type is not null and tp.profile_type <> ''
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
        group by roaster
        order by users desc
        limit 6
      ) t
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

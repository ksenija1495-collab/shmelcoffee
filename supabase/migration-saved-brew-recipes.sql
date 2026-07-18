-- Базовые рецепты заваривания + публичная карточка чашки
-- Run in Supabase SQL Editor

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

-- Публичная карточка чашки (без user_id) по UUID
create or replace function get_cup_card(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select id, name, roaster, country, process, brew_method, recipe,
         acidity, sweetness, bitterness, body, notes, rating, comment, created_at
  into c from cups where id = p_id;
  if not found then return null; end if;
  return json_build_object(
    'id', c.id,
    'name', c.name,
    'roaster', c.roaster,
    'country', c.country,
    'process', c.process,
    'brew_method', c.brew_method,
    'recipe', c.recipe,
    'acidity', c.acidity,
    'sweetness', c.sweetness,
    'bitterness', c.bitterness,
    'body', c.body,
    'notes', c.notes,
    'rating', c.rating,
    'comment', c.comment,
    'created_at', c.created_at
  );
end; $$;

grant execute on function get_cup_card(uuid) to anon, authenticated;

-- Характер кислотности / сладости / горечи в дневнике
alter table cups add column if not exists taste_character jsonb;

-- Обновить публичную карточку (если функция уже есть)
create or replace function get_cup_card(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select id, name, roaster, country, process, brew_method, recipe, taste_character,
         acidity, sweetness, bitterness, body, notes, rating, comment, created_at
  into c from cups where id = p_id;
  if not found then return null; end if;
  return json_build_object(
    'id', c.id, 'name', c.name, 'roaster', c.roaster, 'country', c.country,
    'process', c.process, 'brew_method', c.brew_method, 'recipe', c.recipe,
    'taste_character', c.taste_character,
    'acidity', c.acidity, 'sweetness', c.sweetness, 'bitterness', c.bitterness,
    'body', c.body, 'notes', c.notes, 'rating', c.rating, 'comment', c.comment,
    'created_at', c.created_at
  );
end; $$;

grant execute on function get_cup_card(uuid) to anon, authenticated;

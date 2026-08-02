-- Статус запаса зерна на полке: есть / заканчивается / закончилось
alter table shelf_items add column if not exists status text not null default 'ok';

alter table shelf_items drop constraint if exists shelf_items_status_check;
alter table shelf_items add constraint shelf_items_status_check
  check (status in ('ok', 'low', 'out'));

-- Полка сортируется по статусу: сначала то, что заканчивается
create index if not exists shelf_items_user_status_idx
  on shelf_items (user_id, status);

-- Политика на update: без неё смена статуса с клиента молча ничего не меняет.
-- RLS специально не включаем — если она выключена, поведение таблицы остаётся прежним.
drop policy if exists "shelf_items_update" on shelf_items;
create policy "shelf_items_update" on shelf_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

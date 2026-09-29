-- История чата IVAN (хранится 7 дней, старше удаляется приложением)
-- Запустить в Supabase SQL Editor

create table if not exists shelf_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists shelf_assistant_messages_user_created_idx
  on shelf_assistant_messages (user_id, created_at desc);

alter table shelf_assistant_messages enable row level security;

drop policy if exists "sam_select" on shelf_assistant_messages;
create policy "sam_select" on shelf_assistant_messages
  for select using (auth.uid() = user_id);

drop policy if exists "sam_insert" on shelf_assistant_messages;
create policy "sam_insert" on shelf_assistant_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "sam_delete" on shelf_assistant_messages;
create policy "sam_delete" on shelf_assistant_messages
  for delete using (auth.uid() = user_id);

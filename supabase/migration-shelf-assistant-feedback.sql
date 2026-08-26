-- Feedback для AI-ассистента на полке (оценки ответов + удачные пары)
-- Запустить в Supabase SQL Editor

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
create policy "saf_select" on shelf_assistant_feedback
  for select using (auth.uid() = user_id);

drop policy if exists "saf_insert" on shelf_assistant_feedback;
create policy "saf_insert" on shelf_assistant_feedback
  for insert with check (auth.uid() = user_id);

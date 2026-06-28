-- guide_credits: баланс оплаченных гидов (99 ₽ = 1 кредит)
-- Запустить в Supabase SQL Editor, если таблица ещё не создана

create table if not exists guide_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

alter table guide_credits enable row level security;

drop policy if exists "gc_select" on guide_credits;
create policy "gc_select" on guide_credits
  for select using (auth.uid() = user_id);

-- RPC: начислить кредиты (webhook Prodamus)
create or replace function add_guide_credits(p_user uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into guide_credits (user_id, balance)
  values (p_user, p_amount)
  on conflict (user_id) do update
  set balance = guide_credits.balance + excluded.balance,
      updated_at = now();
end;
$$;

-- RPC: списать 1 кредит при генерации
create or replace function consume_guide_credit(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance int;
begin
  select balance into current_balance
  from guide_credits
  where user_id = p_user
  for update;

  if current_balance is null or current_balance < 1 then
    return false;
  end if;

  update guide_credits
  set balance = balance - 1, updated_at = now()
  where user_id = p_user;

  return true;
end;
$$;

-- Идемпотентность webhook: не начислять дважды за один заказ Prodamus
create table if not exists prodamus_orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credits int not null,
  created_at timestamptz default now()
);

alter table prodamus_orders enable row level security;

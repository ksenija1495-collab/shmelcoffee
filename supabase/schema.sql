-- Taste profiles from quiz
create table taste_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  answers jsonb not null,
  profile_type text not null,
  brew_method text,
  preferred_tastes text[],
  preferred_notes text[],
  created_at timestamptz default now()
);

-- Coffee selections (what the user chose to order)
create table coffee_selections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references taste_profiles(id),
  coffees jsonb not null,
  format text check (format in ('drip', 'beans', 'mixed')),
  status text default 'selected' check (status in ('selected', 'ordered', 'received', 'tasted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generated guides from OpenAI
create table guides (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  selection_id uuid references coffee_selections(id),
  content text not null,
  created_at timestamptz default now()
);

-- Tasting notes (user's own notes after tasting)
create table tasting_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  selection_id uuid references coffee_selections(id),
  coffee_name text not null,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table taste_profiles enable row level security;
alter table coffee_selections enable row level security;
alter table guides enable row level security;
alter table tasting_notes enable row level security;

create policy "Users see own profiles" on taste_profiles
  for all using (auth.uid() = user_id);

create policy "Users see own selections" on coffee_selections
  for all using (auth.uid() = user_id);

create policy "Users see own guides" on guides
  for all using (auth.uid() = user_id);

create policy "Users see own notes" on tasting_notes
  for all using (auth.uid() = user_id);

-- Saved brew recipes (user's reusable templates)
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

create policy "sbr_select" on saved_brew_recipes for select using (auth.uid() = user_id);
create policy "sbr_insert" on saved_brew_recipes for insert with check (auth.uid() = user_id);
create policy "sbr_update" on saved_brew_recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sbr_delete" on saved_brew_recipes for delete using (auth.uid() = user_id);

-- See also: supabase/FIX-RUN-NOW.sql for cups.brew_recipe_id, taste_character, RLS

create index idx_selections_user on coffee_selections(user_id);
create index idx_guides_user on guides(user_id);
create index idx_guides_selection on guides(selection_id);

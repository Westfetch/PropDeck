-- Graft/FPV schema
-- Run this against your Supabase project SQL editor

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  bio text,
  avatar_colour text not null default '#d26cff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Builds (the garage — each quad/build a user owns)
create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_name text not null,
  model_label text,
  note text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  lifecycle_status text not null default 'flying' check (lifecycle_status in ('flying', 'grounded', 'for_sale', 'for_swap', 'lost', 'stripped', 'retired')),
  sale_price_gbp numeric,
  rip_note text,
  flight_proof_media jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table builds enable row level security;

create policy "Public builds are viewable by everyone"
  on builds for select using (visibility = 'public' or auth.uid() = user_id);

create policy "Users can insert their own builds"
  on builds for insert with check (auth.uid() = user_id);

create policy "Users can update their own builds"
  on builds for update using (auth.uid() = user_id);

create policy "Users can delete their own builds"
  on builds for delete using (auth.uid() = user_id);

-- Inventory (parts belonging to a build)
create table if not exists fpv_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id uuid references builds(id) on delete set null,
  canonical_name text not null,
  part_type text not null,
  quantity integer not null default 1,
  variant jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  source_ref text,
  evidence_state text not null default 'confirmed',
  confidence text not null default 'low',
  condition text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fpv_inventory enable row level security;

create policy "Users can view their own inventory"
  on fpv_inventory for select using (auth.uid() = user_id);

create policy "Users can view inventory of public builds"
  on fpv_inventory for select using (
    build_id in (select id from builds where visibility = 'public')
  );

create policy "Users can insert their own inventory"
  on fpv_inventory for insert with check (auth.uid() = user_id);

create policy "Users can update their own inventory"
  on fpv_inventory for update using (auth.uid() = user_id);

create policy "Users can delete their own inventory"
  on fpv_inventory for delete using (auth.uid() = user_id);

-- Suggestions (AI-generated, pending review)
create table if not exists fpv_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id uuid references builds(id) on delete set null,
  input_source text not null,
  source_ref text,
  suggested_part text not null,
  part_type text not null,
  quantity integer not null default 1,
  confidence text not null default 'low',
  substituted boolean not null default false,
  warning text,
  alternatives jsonb not null default '[]'::jsonb,
  extracted jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  evidence_state text not null default 'observed',
  state text not null default 'unconfirmed' check (state in ('unconfirmed', 'confirmed', 'corrected', 'rejected')),
  user_correction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fpv_suggestions enable row level security;

create policy "Users can view their own suggestions"
  on fpv_suggestions for select using (auth.uid() = user_id);

create policy "Users can insert their own suggestions"
  on fpv_suggestions for insert with check (auth.uid() = user_id);

create policy "Users can update their own suggestions"
  on fpv_suggestions for update using (auth.uid() = user_id);

-- Likes (on builds and flight proof videos)
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id uuid not null references builds(id) on delete cascade,
  like_type text not null default 'build' check (like_type in ('build', 'flight_proof')),
  created_at timestamptz not null default now(),
  unique(user_id, build_id, like_type)
);

alter table likes enable row level security;

create policy "Likes are viewable by everyone"
  on likes for select using (true);

create policy "Users can insert their own likes"
  on likes for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on likes for delete using (auth.uid() = user_id);

-- Transactions (swaps and sales)
create table if not exists fpv_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('swap', 'sale')),
  status text not null default 'draft',
  initiator_user_id uuid not null references auth.users(id),
  counterparty_user_id uuid references auth.users(id),
  items jsonb not null default '{}'::jsonb,
  value_summary jsonb not null default '{}'::jsonb,
  messages_thread_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fpv_transactions enable row level security;

create policy "Users can view their own transactions"
  on fpv_transactions for select using (
    auth.uid() = initiator_user_id or auth.uid() = counterparty_user_id
  );

create policy "Users can insert transactions they initiate"
  on fpv_transactions for insert with check (auth.uid() = initiator_user_id);

create policy "Users can update their own transactions"
  on fpv_transactions for update using (
    auth.uid() = initiator_user_id or auth.uid() = counterparty_user_id
  );

-- Indexes
create index if not exists idx_builds_user_id on builds(user_id);
create index if not exists idx_builds_visibility on builds(visibility);
create index if not exists idx_builds_lifecycle on builds(lifecycle_status);
create index if not exists idx_inventory_user_id on fpv_inventory(user_id);
create index if not exists idx_inventory_build_id on fpv_inventory(build_id);
create index if not exists idx_likes_build_id on likes(build_id);
create index if not exists idx_likes_user_id on likes(user_id);
create index if not exists idx_suggestions_user_id on fpv_suggestions(user_id);

-- Helper view: build with like counts
create or replace view builds_with_counts as
select
  b.*,
  p.username,
  p.bio,
  p.avatar_colour,
  coalesce(bl.build_likes, 0) as like_count,
  coalesce(fl.flight_proof_likes, 0) as flight_proof_like_count
from builds b
join profiles p on p.id = b.user_id
left join (
  select build_id, count(*) as build_likes
  from likes where like_type = 'build'
  group by build_id
) bl on bl.build_id = b.id
left join (
  select build_id, count(*) as flight_proof_likes
  from likes where like_type = 'flight_proof'
  group by build_id
) fl on fl.build_id = b.id;

-- ============================================================
-- Foot Guru – World Cup 2026 Prediction App
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  code        text not null unique,         -- e.g. "BRA", "FRA"
  flag_url    text,
  elo_rating  integer not null default 1500,
  group_name  text,                          -- "A", "B", ... "L"
  created_at  timestamptz default now()
);

-- ============================================================
-- MATCHES
-- ============================================================
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed');
create type match_stage as enum (
  'group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'
);

create table public.matches (
  id               uuid primary key default uuid_generate_v4(),
  home_team_id     uuid references public.teams(id) not null,
  away_team_id     uuid references public.teams(id) not null,
  stage            match_stage not null default 'group',
  group_name       text,                      -- only for group stage
  kickoff_at       timestamptz not null,
  venue            text,
  home_score       integer,
  away_score       integer,
  status           match_status not null default 'scheduled',
  -- ELO snapshot at prediction time
  home_elo         integer not null default 1500,
  away_elo         integer not null default 1500,
  elo_gap          integer generated always as (abs(home_elo - away_elo)) stored,
  -- Multipliers cached for scoring
  stage_multiplier numeric(4,2) not null default 1.0,
  -- External API reference
  external_id      text unique,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- PREDICTIONS
-- ============================================================
create type prediction_outcome as enum ('home', 'draw', 'away');

create table public.predictions (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  match_id           uuid references public.matches(id) on delete cascade not null,
  predicted_outcome  prediction_outcome not null,
  predicted_home     integer,               -- exact score (optional)
  predicted_away     integer,               -- exact score (optional)
  is_locked          boolean not null default false,
  -- Filled after match finishes
  outcome_correct    boolean,
  exact_score_correct boolean,
  elo_multiplier     numeric(4,2),
  points_earned      integer,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique(user_id, match_id)
);

-- ============================================================
-- PROFILES (public extension of auth.users)
-- ============================================================
create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  username                  text unique not null,
  display_name              text,
  avatar_url                text,
  total_points              integer not null default 0,
  hide_pending_predictions  boolean not null default false,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ============================================================
-- LEAGUES (private groups)
-- ============================================================
create table public.leagues (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  invite_code  text unique not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

create table public.league_members (
  league_id  uuid references public.leagues(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (league_id, user_id)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Global leaderboard
create or replace view public.global_leaderboard as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.total_points,
  rank() over (order by p.total_points desc) as rank
from public.profiles p;

-- League leaderboard (parameterized via RPC below)
create or replace view public.league_leaderboard as
select
  lm.league_id,
  p.id        as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.total_points,
  rank() over (partition by lm.league_id order by p.total_points desc) as rank
from public.league_members lm
join public.profiles p on p.id = lm.user_id;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Recalculate total_points when a prediction is scored
create or replace function public.update_user_total_points()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set total_points = (
    select coalesce(sum(points_earned), 0)
    from public.predictions
    where user_id = new.user_id
      and points_earned is not null
  ),
  updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

create trigger on_prediction_scored
  after update of points_earned on public.predictions
  for each row execute procedure public.update_user_total_points();

-- updated_at timestamps
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at before update on public.matches
  for each row execute procedure public.set_updated_at();
create trigger predictions_updated_at before update on public.predictions
  for each row execute procedure public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.predictions   enable row level security;
alter table public.leagues       enable row level security;
alter table public.league_members enable row level security;
alter table public.teams         enable row level security;
alter table public.matches       enable row level security;

-- Teams & Matches: public read
create policy "teams_public_read"   on public.teams   for select using (true);
create policy "matches_public_read" on public.matches for select using (true);

-- Profiles: public read, own write
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_own_write"   on public.profiles for update using (auth.uid() = id);

-- Predictions: own CRUD only, no read of others before lock
create policy "predictions_own_select" on public.predictions
  for select using (auth.uid() = user_id);
create policy "predictions_own_insert" on public.predictions
  for insert with check (auth.uid() = user_id);
create policy "predictions_own_update" on public.predictions
  for update using (auth.uid() = user_id and is_locked = false);

-- Leagues: public read, authenticated insert
create policy "leagues_public_read"  on public.leagues for select using (true);
create policy "leagues_auth_insert"  on public.leagues for insert with check (auth.uid() is not null);
create policy "leagues_owner_update" on public.leagues for update using (auth.uid() = created_by);

-- League members: own CRUD
create policy "league_members_select" on public.league_members for select using (true);
create policy "league_members_insert" on public.league_members for insert with check (auth.uid() = user_id);
create policy "league_members_delete" on public.league_members for delete using (auth.uid() = user_id);

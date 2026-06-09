-- ============================================================
-- Security hardening migration
-- Apply with: supabase db push  (or paste into the SQL editor)
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── 1. Pin search_path on SECURITY DEFINER functions ─────────────────────────
alter function public.handle_new_user()          set search_path = public, pg_temp;
alter function public.update_user_total_points()  set search_path = public, pg_temp;

-- ── 2. Make leaderboard views run with the caller's privileges (enforce RLS) ──
alter view public.global_leaderboard set (security_invoker = on);
alter view public.league_leaderboard set (security_invoker = on);

-- ── 3. Security helper functions ─────────────────────────────────────────────
create or replace function public.is_league_member(p_league_id uuid)
returns boolean language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

create or replace function public.match_kickoff(p_match_id uuid)
returns timestamptz language sql security definer stable
set search_path = public, pg_temp as $$
  select kickoff_at from public.matches where id = p_match_id;
$$;

create or replace function public.join_league(p_invite_code text)
returns table (id uuid, name text)
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_league public.leagues%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_league
  from public.leagues
  where invite_code = upper(p_invite_code);

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if exists (
    select 1 from public.league_members
    where league_id = v_league.id and user_id = auth.uid()
  ) then
    raise exception 'Already a member';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league.id, auth.uid());

  return query select v_league.id, v_league.name;
end;
$$;

-- Lock down execute: only authenticated users (not anon) may join.
revoke execute on function public.join_league(text) from anon;
grant   execute on function public.join_league(text) to authenticated;

-- ── 4. Predictions: enforce kickoff lock at the database layer ────────────────
drop policy if exists "predictions_own_insert" on public.predictions;
drop policy if exists "predictions_own_update" on public.predictions;

create policy "predictions_own_insert" on public.predictions
  for insert with check (
    auth.uid() = user_id
    and public.match_kickoff(match_id) > now()
  );

create policy "predictions_own_update" on public.predictions
  for update using (
    auth.uid() = user_id
    and public.match_kickoff(match_id) > now()
  ) with check (
    auth.uid() = user_id
    and public.match_kickoff(match_id) > now()
  );

-- ── 5. Leagues: no public enumeration of invite codes ────────────────────────
drop policy if exists "leagues_public_read" on public.leagues;
drop policy if exists "leagues_member_read" on public.leagues;

create policy "leagues_member_read" on public.leagues for select
  using (created_by = auth.uid() or public.is_league_member(id));

-- ── 6. League members: scope reads to your own leagues ───────────────────────
drop policy if exists "league_members_select" on public.league_members;

create policy "league_members_select" on public.league_members for select
  using (user_id = auth.uid() or public.is_league_member(league_id));

-- Rascal Rally leaderboard (docs/sops/backend-leaderboard.md).
-- Tables have RLS on and NO policies: anon and authenticated can neither read nor write them.
-- Reads go through security-definer functions that return safe columns only; writes go through
-- the submit-score Edge Function with the service role.

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '^[A-Za-z0-9 _-]{1,16}$'),
  track_id text not null check (length(track_id) between 1 and 64),
  mode text not null check (mode in ('timeTrial', 'daily')),
  daily_seed integer,
  speed_class integer not null default 150 check (speed_class = 150),
  racer_id text not null check (length(racer_id) between 1 and 32),
  time_ms integer not null check (time_ms >= 30000),
  lap_times_ms integer[] not null default '{}',
  input_log text not null check (length(input_log) <= 262144),
  client_version text not null,
  ip_hash text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  check ((mode = 'daily') = (daily_seed is not null))
);

create index scores_board_idx on public.scores (track_id, mode, daily_seed, time_ms) where verified;

create table public.submit_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);

create index submit_attempts_ip_at_idx on public.submit_attempts (ip_hash, at);

alter table public.scores enable row level security;
alter table public.submit_attempts enable row level security;

revoke all on public.scores, public.submit_attempts from anon, authenticated;
grant select, insert on public.scores to service_role;
grant select, insert, delete on public.submit_attempts to service_role;

-- Top times for one board: best time per name, verified rows only, safe columns only.
create or replace function public.get_leaderboard(p_track_id text, p_mode text, p_daily_seed integer default null, p_limit integer default 10)
returns table (id uuid, name text, racer_id text, time_ms integer, lap_times_ms integer[], created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, b.racer_id, b.time_ms, b.lap_times_ms, b.created_at
  from (
    select distinct on (s.name) s.id, s.name, s.racer_id, s.time_ms, s.lap_times_ms, s.created_at
    from public.scores s
    where s.verified
      and s.track_id = p_track_id
      and s.mode = p_mode
      and s.daily_seed is not distinct from (case when p_mode = 'daily' then p_daily_seed else null end)
    order by s.name, s.time_ms, s.created_at
  ) b
  order by b.time_ms, b.created_at
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

-- A ghost: the input log of one verified run.
create or replace function public.get_ghost(p_id uuid)
returns table (racer_id text, time_ms integer, input_log text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.racer_id, s.time_ms, s.input_log from public.scores s where s.id = p_id and s.verified;
$$;

revoke all on function public.get_leaderboard(text, text, integer, integer) from public;
revoke all on function public.get_ghost(uuid) from public;
grant execute on function public.get_leaderboard(text, text, integer, integer) to anon, authenticated;
grant execute on function public.get_ghost(uuid) to anon, authenticated;

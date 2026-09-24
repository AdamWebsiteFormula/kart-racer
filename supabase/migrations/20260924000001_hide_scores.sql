-- A hide switch for the board (red-team 2026-09-24, Adam's OK): a row stays stored but leaves
-- get_leaderboard. During the contest a bad name or a suspect run comes off in one line:
--   update public.scores set hidden = true where name = 'BadName';
alter table public.scores add column if not exists hidden boolean not null default false;

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
      and not s.hidden
      and s.track_id = p_track_id
      and s.mode = p_mode
      and s.daily_seed is not distinct from (case when p_mode = 'daily' then p_daily_seed else null end)
    order by s.name, s.time_ms, s.created_at
  ) b
  order by b.time_ms, b.created_at
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

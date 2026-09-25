-- Any racer in any kart (design §5; Adam, 25 Sept 2026). A score records the kart it was raced in:
-- submit-score (CLIENT_VERSION 6) replays the run in that kart and stores it in kart_id.
-- NOT APPLIED when written. Adam OK'd it on 25 Sept 2026; it goes live at release (plan K7), in this
-- order: this migration (safe with the live v5 function and game: a new null column, and the board
-- gains a field old games ignore), then the v6 function (node scripts/fn-deploy-entry.mjs), then the
-- v6 game. A v6 function on the old table fails every insert, because it writes kart_id.
-- Rows from before karts keep kart_id null: they were raced in what is now each racer's own kart,
-- which handles the same, and the game shows them as that kart (backend-leaderboard client.ts).
-- The unique index (one drive is one row) is unchanged: the same log claimed in another kart
-- replays to another time and is refused before the insert.

alter table public.scores add column if not exists kart_id text null
  check (kart_id is null or length(kart_id) between 1 and 32);

-- get_leaderboard gains kart_id. A function's result columns cannot change in place, so it is
-- dropped and made again, the same query otherwise (verified rows only, not hidden, each name's
-- best run, fastest first), with its grants again.
drop function if exists public.get_leaderboard(text, text, integer, integer);

create function public.get_leaderboard(p_track_id text, p_mode text, p_daily_seed integer default null, p_limit integer default 10)
returns table (id uuid, name text, racer_id text, kart_id text, time_ms integer, lap_times_ms integer[], created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, b.racer_id, b.kart_id, b.time_ms, b.lap_times_ms, b.created_at
  from (
    select distinct on (s.name) s.id, s.name, s.racer_id, s.kart_id, s.time_ms, s.lap_times_ms, s.created_at
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

revoke all on function public.get_leaderboard(text, text, integer, integer) from public;
grant execute on function public.get_leaderboard(text, text, integer, integer) to anon, authenticated;

-- Hardening after the red-team review of 2026-09-23 (docs/sops/backend-leaderboard.md Lessons).

-- 1. Nobody reads ghost logs: nothing in the game uses them, and they let a stranger copy the
--    top run and post it under new names.
revoke execute on function public.get_ghost(uuid) from anon, authenticated;

-- 2. One drive is one row. The function stores the canonical log (cut at the finish, the
--    horn cleared), so the same drive is always the same string and a copy is refused.
create unique index scores_one_run_idx on public.scores (track_id, mode, coalesce(daily_seed, -1), md5(input_log));

-- 3. The rate limit is one atomic step (an advisory lock per client), counts only what it lets
--    through, caps a client's accepted runs per day, and prunes old attempts by time.
create index submit_attempts_at_idx on public.submit_attempts (at);

create or replace function public.take_submit_slot(p_ip_hash text, p_per_minute integer, p_per_day integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));
  select count(*) into n from public.submit_attempts where ip_hash = p_ip_hash and at > now() - interval '1 minute';
  if n >= p_per_minute then return false; end if;
  select count(*) into n from public.scores where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if n >= p_per_day then return false; end if;
  insert into public.submit_attempts (ip_hash) values (p_ip_hash);
  if random() < 0.02 then delete from public.submit_attempts where at < now() - interval '1 day'; end if;
  return true;
end;
$$;

revoke all on function public.take_submit_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_submit_slot(text, integer, integer) to service_role;

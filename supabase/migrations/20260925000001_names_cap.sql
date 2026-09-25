-- The names-per-board cap, made atomic (red-team 24 Sept 2026; NOT applied: needs Adam's OK).
-- submit-score counts a client's names on a board before its replay and inserts after it, so posts
-- sent together all saw the old count: ten at once (the per-minute limit) put ten names on a board,
-- not three. This trigger counts again inside the insert, under a lock per client, so the cap holds
-- however the posts race. The function keeps its early count (it spares the replay) and turns this
-- refusal ('names per board') into the same 400. Keep the 3 in step with NAMES_PER_BOARD in
-- supabase/functions/submit-score/index.ts. Safe in either deploy order.

-- a client's rows on a board: this trigger's count, the function's early count and
-- take_submit_slot's per-day count all look a client up by ip_hash
create index if not exists scores_ip_board_idx on public.scores (ip_hash, track_id, mode, daily_seed);

create or replace function public.scores_names_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  -- two keys, so it never shares a lock with take_submit_slot's one-key lock on the same hash;
  -- held to the end of the insert's transaction, so the next post from this client counts this row
  perform pg_advisory_xact_lock(hashtext('scores_names_cap'), hashtext(new.ip_hash));
  select count(distinct s.name) into n
  from public.scores s
  where s.ip_hash = new.ip_hash
    and s.track_id = new.track_id
    and s.mode = new.mode
    and s.daily_seed is not distinct from new.daily_seed
    and s.name <> new.name;
  if n >= tg_argv[0]::integer then
    raise exception 'names per board' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.scores_names_cap() from public, anon, authenticated;

drop trigger if exists scores_names_cap on public.scores;
create trigger scores_names_cap
  before insert on public.scores
  for each row execute function public.scores_names_cap('3');

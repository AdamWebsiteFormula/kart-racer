# Handoff (25 Sept 2026)

Read this first in a new chat, then CLAUDE.md. It carries the state, not the history.

## Where the game stands
- Live: https://adamwebsiteformula.github.io/kart-racer/ (GitHub Pages; CI runs `npm run verify`, then publishes main).
- 1466 tests, verify green (verify also runs the frame budget and the bundle gate).
- Done this month: four AI bug hunts (68 bugs fixed), a seam review, and a 35-point detail review. The review covered:
  - camera: 5.5 m back, 2.4 m up, fov 60-66, and rival karts fade near the lens.
  - effects: start lamps count red, red, red, then green.
  - land: verge dressing and Meadow's tree line.
  - sky: lit and shaded horizon rings.
  - text: US spelling and credits.
  - audio: 102 sounds and 7 songs.
- Leaderboard: the submit-score Edge Function is v17 (checker core-019f61ef2f9600d9, pinned at commit 7ffbba3; unchanged since, `npm run build:function` still makes that same file). It refuses a forged time (422).
- 24 Sept: pickup balloons redrawn as glossy party balloons (not striped beach balls). Red-team 2 fixed: one drive is one run (canonical log, 3 names per client per board), a tighter name filter, capped body read, save records checked entry by entry. A full Knockout ran with no errors (muted). All racers checked: rated G.
- Board hide switch is live: `update public.scores set hidden = true where name = 'X';` takes a row off the board. The rate limit cannot be dodged with fake address headers (tested live).
- The deadline for the "AI Automations with Jack" contest is 30 Sept 2026.

## Pending (25 Sept 2026)
- **Sound judge pass, after 20:00 EDT.** Gemini Pro allows 250 requests a day for gemini-3.1-pro and its aliases; the day resets at 00:00 UTC (20:00 EDT). Run the runbook: `scratchpad/ear3/RUNBOOK-after-2000EDT.md` in the 25 Sept session's scratchpad, or its durable copy `~/.cache/rascal-ear/pass-2026-09-25/ear3/RUNBOOK-after-2000EDT.md` (same layout; swap the path prefix if the scratchpad is gone). About 45 requests: splice checks for two song voices, compares for 23 remade sounds (drift, hop, six sounds with human-like voices, boosts, tier-ups and more), the 4 unjudged songs. Install only takes that pass its accept rules; then `npm run verify`, push, live smoke.
- **Adam decided (25 Sept):** keep the title song's "Hey!" shout at 13.5-14.2 s (option B). The runbook skips the title splice; do not install `title.splice13.*`.
- The `land` sound has no usable take (all six came back too quiet); it needs a new prompt.
- 25 Sept fixes, all live: the podium's winners no longer vanish (a 0 s frame put NaN in their springs), creatures dissolve near the lens (the goose ran through the camera), held items ride small so they never hide your kart, the storm sky rolls in before its first bolt, the mode screen's second row is centred, the steering pad never throws on a phone.

## Adam's rules (all agents)
- **Everything rated G.** Female racers (Nova, Juniper, Momo) stay fully dressed and modest. Check all new art and prompts.
- **No sound on Adam's machine, ever.** Load the game only with `?mute`, close every tab after a check, and stop any dev server you started. A test page once woke his household at night.
- Music and sound must be at the level of Mario Kart World. **No singing in any song**: ElevenLabs music uses `force_instrumental: true`.
- Use US English in chat and game text: curb, color, harbor.
- Write simply. Give at most 2 options and say which one you would pick. Ask in plain chat (Adam does not want the AskUserQuestion tool).
- Pushing to main is OK. Database changes need Adam's OK first. Deploying the score function was OK'd.
- Never print keys. The ElevenLabs key lives only in `.env.local`.
- Do not change the licences in CREDITS.md.
- No Nintendo names, assets or look-alikes. Pickups are balloons, not boxes.

## Score function: when sim code or track data changes
1. `npm run build:function`. If `public/fn/core-*.js` changes, commit it and push.
2. `node scripts/fn-deploy-entry.mjs`. This prints index.ts, with the import pinned to the jsDelivr URL for that commit.
3. Deploy it through the Supabase connector: deploy_edge_function, project thuvqdejckcphwuooyhx, name submit-score, verify_jwt true.
4. Smoke test: post a forged time. It must come back 422.

## How the work was done
- Parallel builders work in git worktrees (`.claude/worktrees/wf_*`), one group of fixes each. The main session merges them.
- SOP conflicts: keep both sides. Code conflicts: resolve by hand.
- After every merge: `npm run verify`, then commit (`<system>: <what works now>`), push, and watch CI (`gh run watch`).

## Next ideas (the definition of done in CLAUDE.md)
- Performance pass: 60 fps on a mid laptop, under 100 draw calls. Measure with `kart.stats()` in a muted page.
- Another fresh-eyes detail review of what a player sees and hears (look only; never play the sound).

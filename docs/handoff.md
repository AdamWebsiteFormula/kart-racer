# Handoff (25 Sept 2026)

Read this first in a new chat, then CLAUDE.md. It carries the state, not the history.

## State at 25 Sept 2026, 19:15 EDT (read this first)

**Model limit:** the account hit its weekly Opus limit at ~15:40 EDT (resets 30 Sept, 20:00 EDT). Opus subagents fail with HTTP 429; helpers run on `model: "sonnet"` (worked all evening) or `"haiku"`.

**Live and checked on the website (Deploy runs green, live bundle inspected):**
- All eight racers are rigged racers from parts, in low-back karts so every driver shows from the chase camera.
- Any racer in any kart is ON (K1-K7): Racer → Kart screen with the 3D racer-in-kart hero and live stat bars; `?nokarts` turns it off. Leaderboard stores the kart (migration kart_id, submit-score v19, CLIENT_VERSION 6).
- The stylized-PBR look is the default (`?look=toon` for the old); karts take the world's light and receive shadows.
- Baked soft shading at load (track-builder/mesh/bake.ts: AO + the fixed sun's shadow into vertex colors; decor receives shadows), MKW-style height haze in each sky's horizon color, ground relief to 320 m, furrowed Meadow fields, hummocked Skyline islands.
- New boost flames and drift sparks; rivals stay solid near the camera like MKW (CAM.kartFade 1.3 m).
- allocation.test.ts FRAME_GROWTH_BYTES is 96 (no leak: heap flat over 80,000 frames; CI reads ~1.15x the Mac's 59-62 B).

**Waiting:**
1. **Sound judge pass after 20:00 EDT** (Adam: "you pick the sounds, highest quality"): the audition pack's NOTES.md §6 (/Users/Adam/Desktop/rascal-rally-audio-audition-2026-09-25/; run from ~/.cache/rascal-ear/audition-2026-09-25/), Gemini Pro (6 requests), then winners into public/audio + scripts/elevenlabs/catalog.ts (NOTES §7); Lyria songs need a CREDITS row; mini-turbo tier 1 and 2, GO and item-get need new takes.
2. **Wheel suspension** (Adam: "Will the wheels have shocks?"): today the body heaves, rolls and pitches on springs and each wheel bobs with it; missing: each wheel following the road under it, and visible shocks squeezing.
3. **Polish:** the Kart screen's 3D hero is small (MKW shows the kart big); a kart icon on board rows; alt paints on combos; the PBR list (faceted low-poly props, far curb stripes, Boardwalk planks and snow roads); Meadow's new fields not yet eyeballed in place.
4. **Trailer re-cut** with the new racers, look and sounds (scripts/trailer/).

**Credits:** Higgsfield ≈ 13 left. Gemini Pro resets 00:00 UTC.


## Where the game stands
- Live: https://adamwebsiteformula.github.io/kart-racer/ (GitHub Pages; CI runs `npm run verify`, then publishes main).
- 1577 tests, verify green (verify also runs the frame budget and the bundle gate).
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

## Done 25 Sept (the MKW-parity /loop, studied against real Mario Kart World footage)
- Tools: `scripts/headless/watch.mjs` (Gemini watches a YouTube video), `frames.mjs` (muted stills from one), `scripts/trailer/` (the promo trailer pipeline; the 54 s trailer is on Adam's Desktop, rascal-rally-share-2026-09-25).
- Race HUD: place numeral colored by place (gold, silver, bronze), racer faces on the minimap, a coin pill, the Knockout goal under the place.
- Results: racer faces in every row; the finish banner readable and gone before the results; Grand Prix standings count up and flip into order with rank arrows; Next track / Race again / Change track / Change racer / Menu after Quick Race, Retry in Time Trial, Race again in the Daily; Time Trial lap splits against your best; a CUT line on the Knockout cut.
- Menus: our own SVG icons (no emoji anywhere), cup emblems, a Settings help line, Auto-accelerate, Steering assist (deterministic: it rewrites the input before it is logged), Fullscreen (row + F key).
- Bugs fixed: cut-off racers' projected times (was "670:07.36"), photo-finish order changing after the banner, a double logo at boot, creatures and props near the lens (clean fade now), the finish camera through balloons, the podium "3" badge, bunting shadow stripes, the dev server's dependency scan and watcher.
- Score function: the core file is rebuilt (`core-8e4365e9b4edf93c`); the live function is still v17 (`core-019f61ef2f9600d9`). Solo verdicts read nothing that changed, so a redeploy is optional.
- The six course creatures are off every track (live 25 Sept 2026, score core client version 5, submit-score v18); README and contest entry updated.

## Pending (25 Sept 2026)
- **Sound judge pass, after 20:00 EDT.** Gemini Pro allows 250 requests a day for gemini-3.1-pro and its aliases; the day resets at 00:00 UTC (20:00 EDT). Run the runbook: `scratchpad/ear3/RUNBOOK-after-2000EDT.md` in the 25 Sept session's scratchpad, or its durable copy `~/.cache/rascal-ear/pass-2026-09-25/ear3/RUNBOOK-after-2000EDT.md` (same layout; swap the path prefix if the scratchpad is gone). About 45 requests: splice checks for two song voices, compares for 23 remade sounds (drift, hop, six sounds with human-like voices, boosts, tier-ups and more), the 4 unjudged songs. Install only takes that pass its accept rules; then `npm run verify`, push, live smoke.
- **Adam decided (25 Sept):** keep the title song's "Hey!" shout at 13.5-14.2 s (option B). The runbook skips the title splice; do not install `title.splice13.*`.
- The `land` sound has no usable take (all six came back too quiet); it needs a new prompt.
- The goose `honk` reads as a sheep bleat to the local ear (AudioSet: Bleat 0.63, Sheep 0.26): check it in the judge pass.
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

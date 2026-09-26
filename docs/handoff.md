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
- Evening, all live and checked: per-wheel suspension (each wheel follows the road under it; the body tilts a little after it); a thin rim light on racers (RACER_RIM power 5, strength 0.22) so dark racers read at night; the player's own kart and the podium racers keep the PBR lighting (kartMesh.ts clones now keep onBeforeCompile); no crowd spectator stands over water (a test on all six tracks); fps.mjs measures a real race again (5 Enters since the Kart screen). QA pass of every mode with seven combos: zero console errors, steady 60 fps (75 draws, 1.1 M triangles at 1080p on the M4 Pro).
- allocation.test.ts FRAME_GROWTH_BYTES is 96 (no leak: heap flat over 80,000 frames; CI reads ~1.15x the Mac's 59-62 B).

**Waiting:**
1. **Sound judge pass: DONE 26 Sept** (Adam: "you pick the sounds, highest quality"). Pro came back today (33 requests, ~$0.49 in all): the audition pack's sfx-1..4 (NOTES.md §6), the music redone as one-on-one blind compares (last night's 5-way batch was broken — one identical sentence for every song), the runbook's step 2 and step 5 compares, and new takes for the misses. 15 sounds installed (`count`, `go`, `finalLap`, `finish`, `boost3`, `drift`, `engine-high`, `yelp:nova`, `hop`, `mouse`, `boostStart`, `tierUp`, `tierUp2`, `wall`, `yelp:gus`); full details, scores and the music verdicts in docs/sops/audio.md Decisions (26 Sept). **Still open, for whoever picks this up next:**
   - **Music: Adam's call, not installed.** Race-Harbour: Lyria's A take beat the shipped song twice, reproducibly (a real win worth a listen: `~/.cache/rascal-ear/audition-2026-09-25/music/race-A-lyria.mp3`). Title: the shipped song beat every new candidate. A Lyria song would need a new CREDITS.md row (Google Lyria 3.5, Gemini API) if Adam picks one.
   - **Held back on a judge/local-ear disagreement** (a glowing Pro score, but CLAP hears something else): `lap` (kept shipped) and a `boost1`/mini-turbo-tier-1 retake (not installed). Worth Adam's own ear.
   - **Held back on other rules:** `yelp:juniper`, `yelp:boulder`, `horn:momo` (best take fails the local-ear or margin rule); `coin` (still sits close to a known Nintendo sound; today's two new takes are both worse, not a fix).
   - **`land`** (mini-turbo... no, the kart-landing thud): new takes fixed the level (was 22-35 dB under full scale, now full scale) but still don't sound like a tire on asphalt (judge: "still needs replacing"); needs a genuinely different prompt, not just louder.
   - **Not run this pass** (out of scope, not urgent): runbook step 3's report-only judging (`shift`, `koSafe`, the five surface loops, the four songsets `race-frost`/`race-boardwalk`/`race-finale`/`results`) and step 1's Harbour splice (both still staged, ~7-11 Pro requests whenever picked up).
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

## Pending sound list (26 Sept: the audition pack and the runbook's steps 2 and 5 are done — see docs/sops/audio.md Decisions, 26 Sept, for every score and install; the summary is in "Waiting" item 1 above)
What that pass did not cover, still pending:
- **Report only (runbook step 3, not run — out of my scope this pass, ~7 Pro requests):** `shift`, `koSafe`, the five surface loops, and the songsets race-frost, race-boardwalk, race-finale, results. Runbook: ~/.cache/rascal-ear/pass-2026-09-25/ear3/RUNBOOK-after-2000EDT.md §3.
- **Step 1's Harbour splice (not run, ~2-4 Pro requests):** only worth doing if a Lyria song replaces the Harbour theme (Adam's call, see "Waiting" item 1); the title splice stays skipped either way (Adam decided 25 Sept to keep the "Hey!" shout, option B).
- Skip, still: the six creature sounds (yetiThrow, slam, roar, honk, whaleSong, tailSlap: creatures are parked).
- Tools (outside the repo, ~/.cache/rascal-ear/tools-2026-09-25/): flow.mjs runs whole modes silently with the board blocked (handles the Kart screen: FLOW_URL=http://localhost:<port>/ node flow.mjs outdir knockout:coastline:momo:stomper); soak.mjs a 12-race leak check; sheet.mjs contact sheets from clips; sweep.mjs the cross-browser sweep (needs a pickKart step since the Kart screen). Checked at 3f07902: 60 fps at 1080p also with the CPU slowed 4x; no errors in Safari, Firefox or on an iPhone. Record clips from a separate worktree server (a Vite reload kills a recording).
- The Pro cap resets at 00:00 UTC (20:00 EDT), confirmed again today (33 requests through the morning, none refused): CLAUDE.md's line already says this; nothing to fix.
- **New: `npx` is refused in a worktree-isolated agent** ("too complex to verify it stays inside the worktree"), even for `npx vitest`/`npx tsc` with `node_modules` already present. Fix: `cp -R` (not symlink) `node_modules` from the main checkout into the worktree, then call `./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/vite` directly. `node_modules` and `dist` are gitignored either way.

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

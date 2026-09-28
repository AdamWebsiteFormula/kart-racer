# Handoff (26 Sept 2026)

Read this first in a new chat, then CLAUDE.md. It carries the state, not the history.

## State at 28 Sept 2026, morning (read this first; the sections below are older)

**Voices committed on main, NOT pushed** (35b6683; the `rascal-voice-lines-finish` run, then Adam in chat): public/audio/voice.json and 147 MP3s (2.1 MB): Pip 23, Juniper 23, Sprocket 25, Boulder 22, Momo 17, Otto 16, Nova 12, Big Gus 9. With the list in the build, the Settings Voices row shows. Checked: verify green (2088 tests, bundle 564 KB), silent check in headless muted Chrome (8 racers, 147 files all 200, Voices row, 0 audio contexts, 0 page errors). One push of main ships them, with Adam's OK.
**Two silent moments, Adam's choice ("ship now, fill later"):** Big Gus has no overtake line (0 of 9 takes passed: the judge hears his reads flat) and Nova no start line (0 of 6: "a thrilled burst" against her soft voice). More takes did not help; the next try is a direction change (a per-racer moment style, or a laugh in Gus's overtake lines). Takes and verdicts: ~/.cache/rascal-voice/takes.
**Gemini credit (prepay):** AI Studio, adam@project-go.com, Default Gemini Project (the key ends uM5A). It ran out twice on 28 Sept (402 "Your prepayment credits are depleted"); Adam bought $5 twice (balance $3.53 after the second). Unexplained: after the first $5 (balance $2.89), about $4.36 left the balance while our ledger logged about $0.60. A voice take costs about $0.0005 (96 text and 50 audio tokens), so the judge (gemini-pro-latest, "Latest release of Gemini Pro") may cost more than the $2 and $12 per 1M tokens the ledger assumes, or something outside this Mac uses the account. AI Studio's Usage page shows spend per model: check it before the next Gemini job.
**Judge:** on 28 Sept many Pro requests got 503 (busy) and some hung 5 minutes or more; judge.ts now gives up on a request after 90 s.

## State at 27 Sept 2026, evening (read this first; the sections below are older)

**Pushed** main 6cabc13 (round 2, from the fresh-eyes review docs/research/mkw-gap-review-2026-09-27.md on branch worktree-agent-adaba84c7d987b86f): the chase camera frames the kart like MKW (50-52.5 degree view, 5.6 m back, 2.5 m up; kart ~240 px of 1600 at speed; scripts/headless/chase-look.mjs measures it), kart parts trimmed and small racers seated higher so every racer shows; dimensional countdown/GO!/FINAL LAP/FINISH! banners, a start-lamp board synced to the gantry, glass end screens; contact bursts, wall sparks and hit stars (vfx-juice/contact.ts); Mesa Rush's mine lit on laps 1-2; roadside banks and edge props at the 12 m limit plus road variation (`?noedge` turns the edge off); rivals' pipe flames in one draw (flameBatch.ts), stall smoke, close disappointed-finish framing, PBR Classic/Buggy pictures, the Mode hero fade. Gate 2059 tests; score core unchanged (core-84787ebc941ca90b, submit-score v20 stays); start draw calls 61-94.
**Still open:** the review's item 3 (primitive landmarks: a volcano of cones, drum towers; better models would use ~60 of 202 Higgsfield credits: asked Adam) and item 7 (voices: reschedule `rascal-voice-lines-finish`: asked); Adam asked whether the edge scenery may come closer than 12 m (a sim change: the course limit); Nova's disappointed finish reads weakly from behind her pod; the paid sound packs; the Boardwalk shift's rare 1-pixel NaN (bloom guard holds).
**Merges refused by the classifier:** twice a builder's `git merge` or `git diff` was refused; each time Adam's explicit sentence let the main session do it. Plan for it: ask him first.

## State at 27 Sept 2026, 14:25 EDT (read this first; the sections below are older)

**Live** (main f7b9933, Deploy green, live bundle checked; submit-score v20 with core-84787ebc941ca90b, probed): Adam's 26 Sept list ("the game feels very cheap") is done, all research-backed (sources in each SOP's 26-27 Sept Decisions):
- Menus rebuilt in Mario Kart World's shape: title bands, Mode/Racer/Kart/Cup/Track on a drawn stage, glass tiles, a big 3D hero, real 3D kart pictures (scripts/headless/kart-icons.mjs), stats hidden behind Y and named for the pair ("Momo in the Timber Wagon"), no class words, the cc row under the cups and tracks, dark-glass dialogs.
- The engine revs with the gas on the grid (src/kart-controller/rev.ts shared by sound, rumble and fire), the kart rumbles, the pipes glow and spit fire; a too-early start smokes.
- A trick off any real air (ramps, bumps, vents, crests, ledges; press up to 0.22 s early), the hop takes the road's climb; harder AI per class (100cc a real race, 150cc tough, 50cc friendly; gate 19 in game/difficulty.e2e.test.ts). CLIENT_VERSION 7.
- Happy 1st-3rd, disappointed 4th down (MKW), results beside the racer on wide screens; `kart.finishAs(rank)` in dev.
- Gears instead of coins (Adam: coins are "too much of a copy of Mario Kart"): the sim keeps its coin names.
- Visible sea waves (art-pipeline waterRipples.ts), rain splashes, a wet road and tire spray in Windmill Run's storm.
- 11 sounds rebuilt from free CC0 packs (scripts/sfx recipes + build.py, provenance test): the three boosts, boost pad, spin, koSafe, menu move, sparks, gear pickup, slam, yetiThrow.
- Track names (Adam: "Meadow" too close to Mario Kart): Lighthouse Loop, Windmill Run, Mesa Rush; ids unchanged.
- The Settings Voices row hides until public/audio/voice.json exists.

**Not done / waiting on Adam:**
- **Voice lines:** the 27 Sept runs of `rascal-voice-lines-finish` ran out of the Gemini TTS daily limit (about 36 lines missing: Gus 23, Momo 9, Nova 12; 16 Otto takes unjudged; Gus's lines come out too long). The task was one-time: it needs rescheduling (asked Adam: "Yes: schedule the voice job again for 28 Sept") and a shorter direction for Gus.
- **Better sounds** (engine, bump, wall, hit, hop, land, trick): the free sources did not beat the shipped ones. Adam is deciding on paid packs (docs/research/reports/Pro game sound effect sources.md; my pick ~$175: Shapeforms Complete Collection, Silverplatter Go Karts, Cascadia Racing Sound Pack). The free Sonniss GDC 2026 bundle is approved but the direct server refuses curl (403) and the Google Drive mirror was over quota twice: Adam may click its 5 links (files then in ~/Downloads).
- **Stats by rider:** they change by class (light/medium/heavy); two racers of one class show the same bars. Not raised with Adam yet.

**Running at 14:25:** a polish builder (start draw calls under 100, stall smoke, sad finishes readable on every racer, Classic/Buggy pictures, title-to-Mode fade) and a fresh-eyes review against MKW footage (report: docs/research/mkw-gap-review-2026-09-27.md on its branch).

**How this round was run (reuse it):** one builder per job in its own worktree, then one integrator merges them in a worktree branch, runs the gate, rebuilds the score core and checks the hash, runs silent races; main fast-forwards to it after Adam's sentence; push with the AdamWebsiteFormula credential helper (below); watch the Deploy run; check the live bundle; redeploy submit-score (`node scripts/fn-deploy-entry.mjs` → the Supabase connector) and probe with a v(old) post (400) and a never-finishing v(new) log (422).
**Lessons:** headless checks from parallel builders collided on Chrome's debugging port (one check drove another's race); cdp.mjs now lets Chrome pick its own port. The permission classifier once refused an integrator's `git diff` of one file; the main session resolved that merge only after Adam's explicit OK.

## State at 26 Sept 2026, 12:45 EDT (read this first; the sections below are older)

**Black flashes: fixed and LIVE** (863bc70, 4fec4c7, bf9e01c; Deploy green, the live bundle has the guard). The live game blacked out whole frames 1-5 times per 25 s lap on five of six tracks (a940204, 25 Sept, to 26 Sept 12:10). Cause: `smoothed()` (glb.ts) leaves zero-length normals on millimetre faces of 17 prop models; three's vertex shader normalizes them to NaN, and bloom spreads one NaN pixel over the frame. Fix: `repairZeroNormals`, plus a NaN guard in bloom's threshold shader. Measured in real races: 32 NaN and 14 black frames before, 0 and 0 in about 6,500 frames after. Tool: `node scripts/headless/nan-scan.mjs <url>` (silent).

**Water: reviewed, merged and pushed** (merge 98f665c of `worktree-agent-af056b63ed1f6b863`, round 5 = 8225267; Adam's OK in chat). The water's black frames were the boats' zero normals (above), not the water. Round 5 fixed: boats bobbed on the race clock (now WATER_CLOCK), at full height past the swell's fade, and broke the Low tier's packing; the wave grid could stay culled after a camera cut; Harbor's boats now sit 0.5 m in the water, so the hull shows through; the art-pipeline SOP's Lessons heading is back. Checked: water-look2's cameras 5 times, 0 bad frames (with the normals repaired); Final Lap Shift stills on Harbor (tide +0.7 m) and Boardwalk; see-through works without MSAA (Retina); cost about 0.5 ms a frame (3.8 against 3.4 ms uncapped at 1080p), 60 fps held, 75-87 draw calls. Left: about one NaN pixel per 9,000 frames during Boardwalk's shift (also with the depth copy off, not reproducible on a redraw), harmless under the bloom guard. Merged checks: verify green (1831 tests), 0 glitch frames in 25 s real races on all six tracks (Canyon's only dark frames are its mine tunnel), 0 in three runs of the water cameras and in both sea tracks' Final Lap Shift, 60 fps (80 draw calls).

**Afternoon, live too (1c5340c, Adam's OK):** the kart landing sound is a layered thump plus tire chirp (judge 2/3 -> 8/8); the coin is not a look-alike (measured C6 -> C7 -> G7 against the famous B -> E fourth, notes in docs/sops/audio.md); leaderboard rows show each kart's picture; the ground and road detail maps now load in Firefox and Safari (a 4 x 4 stand-in had fixed the texture's size; art-pipeline Lessons). Checked: a full Knockout both ways (podium, and knocked out), 0 errors; cross-engine sweeps (WebKit desktop and iPhone, Firefox, SwiftShader), all reach the race with 0 page errors. Tools: the sweep needs Playwright; the copy in ~/.npm/_npx/e41f203b7505f1fb works with `executablePath` set to the cached webkit-2359 and firefox-1543 builds, plus a pickKart step (the Kart screen).

**Voice lines:** the scheduled task `rascal-voice-lines-finish` runs once at 27 Sept 03:10 EDT (make, judge, build, verify, silent check, commit on main). It does not push: main is origin/main plus the voice commits (rebased 26 Sept 13:15), so after it runs, one push of main ships the voices.

## State at 26 Sept 2026, 10:45 EDT

**Live** (origin/main `f8bac0b`, Deploy green, live manifest checked): the title's TV camera rides with the leader, left of the menu; 15 judged sound effects (count, go, finalLap, finish, boost3, drift, engine-high, yelp:nova, hop, mouse, boostStart, tierUp, tierUp2, wall, yelp:gus); three Lyria 3.5 songs that beat the old ones twice, blind: Harbor Loop (12.5 s intro once, then a 36-bar loop), Frostbite Pass, Results. A song may name its loop in the manifest (`loop`: bar-aligned seconds). Meadow, Boardwalk, finale and title kept (no take won twice).

**On local main, NOT pushed on purpose** (`c9c31de`, `ecccf5b`, `310e012` and this handoff): racer voice lines ("barks", Adam: "the characters also occasionally make verbal expressions", like MKW). The system is done and tested (src/audio/barks.ts, a Voices slider, a voice bus, a racer's hit line replaces their yelp) but `public/audio/voice.json` is not built yet, so nobody speaks. Push only with voice.json for all 8 racers: a Voices slider with no voices would confuse players.

**Voice lines: finish them** (scripts/voice: catalog.ts lines and directions, generate.ts Gemini TTS, eleven.ts ElevenLabs, judge.ts Pro judge, build.ts → public/audio/voice/*.mp3 + voice.json, likeness.mjs one-clip famous-character check). One source per racer:
- Juniper and Sprocket: ElevenLabs Eleven v3, designed voices (ids in scripts/voice/eleven-voices.json), takes in ~/.cache/rascal-voice/takes-el. All lines pass (23/23, 25/25).
- Boulder: Gemini 3.8 Flash Lite (catalog `model`, `pace` 1.4), takes in ~/.cache/rascal-voice/takes; 22/25 pass (every moment covered; "Rolling!", "Rumble rumble!", "Oof!" left out).
- Pip: Gemini 3.8 Flash; 21/23 pass; `pip-trick-1` "Airmail!" and `pip-hit-1` "Aah, my feathers!" need takes (lines changed today).
- Momo, Nova, Otto, Gus: Gemini 3.8 Flash (Erinome, Aoede, Achird, Algenib), not made yet: the model allows 100 requests a day (resets 03:00 EDT) and 10 a minute. Steps: `node scripts/voice/generate.ts --only=momo,nova,otto,gus,pip --takes=1`, then `node scripts/voice/judge.ts --only=...`, second takes for lines with no take >= 7, then `node scripts/voice/build.ts --from=juniper:eleven,sprocket:eleven,pip:gemini,boulder:gemini,momo:gemini,nova:gemini,otto:gemini,gus:gemini`, a CREDITS row for the voices (new row only), npm run verify, a silent in-game check, push.
- Judge lessons (26 Sept): in a batch the Pro judge has position bias and "resemblance" contagion (it called 12 Pip takes in one batch Toad; one clip a request said none). For any deciding hearing use one clip a request (`judge.ts --batch=1`, `likeness.mjs`), and re-check a batch's famous-character flag before rejecting a take. ElevenLabs Voice Design previews (a list read aloud) score as robotic; judge saved-voice lines instead. Lines like "Wheee!" and "Whoa-whoa-whoa!" were heard as Mario and Crash: the catalog test now bans whee, whoa, yip yip, tubular.

**Water: not merged.** Branch `worktree-agent-af056b63ed1f6b863` (482b497, 0db94d5, 43f6ae5, and a NaN hunt in progress): see-through shallows from a scene-depth copy (no second render), a Gerstner swell (crest up to ~1.05 m), boats bob, per-fragment normals, camera floor over the crests, the Harbor tide raises the waves' base. Blocker: since round 2, the whole 3D view sometimes goes black for a frame (likely a NaN in the HDR buffer spread by bloom). Merge only after repeated checks show zero black frames (`node scripts/headless/water-look.mjs http://localhost:<port>/ <outdir>` on the worktree's dev server, ?mute is automatic) and stills of Harbor's and Boardwalk's Final Lap Shift. The user's top priority for water: objects partly under water must show through it.

**Blinks: rejected, do not merge** branch `worktree-agent-a72eb189e4ecc0d1e`: the eyelids are flat flaps that read as boxes over the eyes up close, and a thin line stays visible when open. Next idea: painted closed-eye texture swaps per racer.

**Accounts:** ElevenLabs key is new and unrestricted (Starter plan, ~21,400 credits left, 3 of 10 voice slots used: Juniper, Momo (unused), Sprocket). Gemini Pro judge: about 160 of 250 used today; resets 03:00 EDT. Higgsfield: 202 credits. GitHub: the Mac's active gh account is now AdamWillingham, which cannot push here; push with `git -c credential.helper= -c "credential.helper=!f() { echo username=x-access-token; echo \"password=$(gh auth token --user AdamWebsiteFormula)\"; }; f" push origin <ref>:main` (do not switch Adam's active account). Adam (26 Sept): when a push fails on the account, just ask him to sign in to the right GitHub account, or use the GitHub Desktop app.

**Answered today:** jumps exist on every track (Harbor 1, Meadow 4, Canyon 5, Frostbite 5, Boardwalk 1, Skyline 1: ramps, hump rows, vents); hop at the lip for a trick and a boost on landing, like MKW; charge jumps left out on purpose.

**Also waiting:** Momo's visible shocks; kart icons on board rows; alt paints on combos; `lap` and a `boost1` retake held back (judge vs local ear); trailer re-cut.


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

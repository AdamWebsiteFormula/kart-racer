# Plan: pick any racer and any kart (25 Sept 2026)

Adam approved the feature on 25 Sept 2026 (option B: "like Mario Kart World", with stats and live combined stat bars). The design rules are in docs/design.md §5, §10 and §12; this file is the build plan (from the planning pass of 25 Sept). Where this file and design.md disagree, design.md wins.

**The core idea:** a racer's handling is their class, with the chosen kart's stats put in place of their own kart's stats. A racer in their own kart handles exactly as today, to the last bit, so every current test, AI gate, medal time and stored leaderboard time still holds. Every kart changes *how* you are fast, not *how fast* you are.

## 1. Research (Mario Kart World) and where we differ on purpose
- MKW shows four stats (Speed, Acceleration, Weight, Handling) as bars; the driver sets a base and the vehicle adds to it; you pick a driver, then a vehicle; the vehicle screen shows the total. Weight decides collisions. Hidden layers: terrain-specific speed/handling, a hidden mini-turbo stat. Sources: mariowiki.com/Mario_Kart_World; vulkk.com/2025/08/10/how-stats-work-in-mario-kart-world/; game8.co/games/Mario-Kart-World/archives/523474.
- Ours: four stats, nothing hidden (no terrain stats, no mini-turbo stat: drifting pays the same in every kart). Anchored (a racer in their own kart = their class). Balanced by design and proven by a test. Our own bar design (smooth pill bars scaled to the fair range, a ghost for the hovered kart, chevrons per step), our own kart names and art. 10 karts, 8 stat lines (Classic and Buggy are twins). Weight only moves bumps; coins work the same for everyone.

## 2. The stats model
Shown: Speed, Accel, Handling, Weight. One step: 0.005 speed = 0.06 accel = 0.06 handling = 0.05 weight (fractions of the base, the units of today's classes).

| id | Name | Owner | Speed | Accel | Handling | Weight | Card line |
|---|---|---|---|---|---|---|---|
| scooter | Parcel Scooter | pip | −0.005 | +0.06 | 0 | −0.05 | Zips off the line |
| scrap | Scrap Buggy | momo | −0.010 | +0.06 | +0.06 | −0.05 | Nimble everywhere, low top speed |
| pod | Comet Pod | nova | −0.005 | 0 | +0.06 | −0.05 | Turns on a dime |
| wagon | Timber Wagon | juniper | 0 | 0 | 0 | +0.05 | The all-rounder, hard to push |
| skimmer | Wave Skimmer | otto | 0 | +0.06 | −0.06 | 0 | Jumps off the line, wide in bends |
| windup | Wind-Up Racer | sprocket | +0.005 | 0 | −0.06 | 0 | Quick on straights, stiff in bends |
| stomper | Stone Stomper | boulder | +0.005 | −0.06 | 0 | +0.05 | Heavy, slow to get going |
| snacktruck | Snack Truck | gus | +0.010 | −0.06 | −0.06 | +0.05 | Top speed, turns like a truck |
| classic | Classic (finish a Grand Prix) | — | twin of windup | | | | |
| buggy | Buggy (race a Knockout to the end) | — | twin of scrap | | | | |

The three classes do not change (light −0.01 / +0.12 / +0.12 / −0.15; medium all 0; heavy +0.01 / −0.12 / −0.10 / +0.18). They move from `constants.ts` into kart.schema.json `archetypes` defaults with the same values ("every number from data").

**Combine** (src/kart-controller/karts.ts, new):
```
total(r,k).x = archetypes[class(r)].x + (karts[k].x − karts[own(r)].x)     // exactly this order
topSpeed  = base.topSpeed × speedClasses[cc] × (1 + total.speed)
accel     = base.accel × (1 + total.accel)
steerRate = base.steerRate × (1 + total.handling)      // grip turn and drift turn
mass      = 1 + total.weight                            // + dash, Bubble and Strike Ball bonuses, as today
```
When k is the racer's own kart the bracket is exactly 0 (checked in floating point). Unknown kart → the racer's own kart. Unknown racer (test fixtures' 'k0') → the class alone. Nothing throws.

**Bounds** (schema data, a fast unit test):
- Per kart: whole steps only; at most ±2 steps of speed, ±1 step of accel, handling and weight.
- Balanced: each kart's predicted lap effect 1000 × (speed + accel/12 + handling/11) within ±1.
- Every racer-and-kart pair inside: speed ±0.015, accel ±0.18, handling ±0.18, weight −0.15 to +0.18.
- Mass spread (heaviest − lightest) under the boost's extra bump weight (0.35).
- Checked against the table: mass 0.85–1.18 (as today's classes); predicted pace −0.96% to +1.14% of a medium racer in their own kart; 39 distinct speed/accel/handling totals.

**Schemas:** kart.schema.json: `archetypes` defaults; new `karts` (owner, twinOf, four numbers), `kartSteps`, `kartLimits`, `comboBounds`, `kartPace` (12, 11); the "cosmetic only" wording rewritten. race-state: each kart gets `kartId`. score: `kartId` required. save: see §5.

## 3. Sim and fairness
- `makeConstants(archetype, cc, racerId?, kartId?)` (optional args: the ~120 existing calls keep working). `KartConstants` gains `kartId`; `stats` becomes the combined line. `KartState` gains `kartId` (looks only). collide.ts unchanged.
- Items and hazards: no change. Race manager: `RacerConfig.kartId?` (absent = own kart); GP and Knockout carry it race to race.
- AI: every AI racer drives their own kart, in every mode (the field reads at a glance; every AI gate and medal time was measured on these constants). `AiDriver` builds each kart's constants from its RacerConfig, so the autopilot after the finish drives the player's real combo. New src/game/lineup.ts builds the field.
- Balance gates:
  - karts.test.ts: every pair inside the bounds; whole steps, limits, balanced; racers in their own karts identical to today (8 racers × 3 classes, value for value); twins match; mass-spread rule.
  - src/game/combos.e2e.test.ts (new): each of the 39 distinct totals drives a 150cc Time Trial on all six tracks with the scripted near-perfect drifter (`__tests__/scripted.ts`, adapting to each kart's constants). G0: every combo finishes within ±3% of the track's median. G1: every combo within ±1% of the same racer in their own kart, on every track. G2: no combo fastest on more than 2 of the 6 tracks. One test per track; the ideal line computed once per track.
  - balance.e2e.test.ts extended: the Hard AI, hazards on, drives the extreme combos on every track; each finishes with no claw rescue.
  - collide.test.ts: at the extremes the lighter kart's shove ≤ 0.65 × bumpForce.
  - Tuning, time-boxed to 3 h: move a failing kart one step toward neutral (keeping it balanced) and re-run. If racers in their own karts alone break G0, report it (that is the class balance Adam approved on 24 Sept).

## 4. Leaderboard
- `Submission.kartId` required (main.ts takes it from `manager.consts[pi].kartId`). `checkSubmission` needs a known kart id (Classic and Buggy allowed; twins gain nothing). `verifyRun` / `replay` / `canonicalize` take `kartId` and replay through `soloConfig(..., kartId)`; the same log claimed with another kart replays to a different time → 422.
- CLIENT_VERSION 5 → 6 (live function v18 is on 5).
- Migration supabase/migrations/20260926000001_kart_id.sql: `scores.kart_id text null` (1–32 chars); drop and recreate `get_leaderboard` with `kart_id` (keep the `not hidden` filter), re-grant anon and authenticated; unique index unchanged. **Adam OK'd this migration on 25 Sept 2026** (apply it at release, K7, together with the v6 client and the new function).
- Board rows: place, racer face, kart icon (labeled "Pip in the Snack Truck"), name, time. Old scores kept (all raced in what is now each racer's own kart, which handles identically); null kart_id shows as the racer's own kart.
- The deployed-bundle test gains a changed-kart run (Momo in the Snack Truck on Harbor Loop), so kart tuning without `npm run build:function` fails verify.

## 5. UI
Flow: Mode → Racer → Kart → Cup or Track → race. Back from Kart returns to Racer with the racer kept; "Change racer" on the results goes through both screens; a series keeps the combo. Pressing a kart confirms (a short "locked in" pulse).
- Racer screen: each of the 8 cards shows the racer's own four bars; the garage keeps Paint, the Body row goes (Classic and Buggy move to the kart grid); class row and Mirror stay; the turntable shows the focused racer in your current kart, with the stats panel beside it.
- Kart screen ("Pick your kart"): 10 cards in 5 × 2 (an SVG in the owner's colors, the name, "Gus's kart" — twins say "Same stats as the Wind-Up Racer" — and the card line). Locked cards take focus to preview but are grayed with our padlock and the unlock hint; Enter refuses them.
- Stats panel (one piece on both screens): the solid bar is the current combo; the focused combo shows as a ghost (a light extension for a gain, a hatched cut-back for a loss) plus one chevron per step (up to 3). Screen readers: "Speed 7 of 10, up 2". Bars map to `comboBounds`: `0.08 + 0.92 × (total − lo)/(hi − lo)`. Motion: scaleX only, 240 ms in the house ease, 40 ms stagger; ghost fades in 120 ms; instant with reduced motion.
- Turntable: the chosen racer in the focused kart, captioned "Pip · Snack Truck · Berry".
- Input: arrows / D-pad / stick run through all 10 and wrap; Enter/A confirms; Esc/B back; pointer previews after a 150 ms rest; touch: first tap previews, second tap on the same card chooses; a Back button in the heading row.
- Layouts: fit 1920×1080, 1366×657, 1280×720; below 1100 px wide the panel becomes a strip above the grid; 852×393 and 740×360 fit without scrolling.
- Save (save.schema.json): `settings.selectedKartId` saved on confirm (absent: own kart); an old `selectedBodyId` of classic/buggy seeds it once and is never written again; `timeTrial[track].kart` records the best run's kart (the ghost is drawn in it; an old best's `body` maps to it); `unlocked.bodies` keeps its name and ids; SAVE_VERSION stays 1.
- Ship switch `UI.kartPick`: off = the Racer screen goes straight on and everyone drives their own kart.

## 6. Build order
| Task | Who | Files | Must pass | Waits for |
|---|---|---|---|---|
| K0 docs | main (done 25 Sept) | design.md §5/§10/§12, CLAUDE.md, first-principles.md | — | — |
| K0s + K1 schemas and sim | builder A | the four schemas; src/kart-controller/ karts.ts (new), karts.test.ts, constants.ts, index.ts, types.ts, collide.test.ts; race-manager types.ts, race.ts; ai-driver driver.ts; game/lineup.ts | unit gate; a changed-kart race replays byte-identically; all existing tests unchanged | — (merge karts.ts + signatures first as K1a to unblock B) |
| K4 UI logic | builder B | src/ui-hud/ data/karts.ts (new), screens/karts.ts (new), screens/menus.ts, app.ts, types.ts, store.ts, unlocks.ts, constants.ts (the switch, off) + tests, text.test.ts | keyboard walk Racer → Kart → Track; save round-trip and migration; panel numbers match the sim for all 80 pairs | K1a |
| K3 balance | builder A | game/combos.e2e.test.ts (new), balance.e2e.test.ts, __tests__/scripted.ts; kart numbers in the schema | G0–G2, AI extremes; final numbers into design §5 and the kart-controller SOP | K1 |
| K2 leaderboard | builder A | backend-leaderboard rules.ts, verify.ts, client.ts, server.ts + tests; submit-score index.ts; the migration file (not applied); one line in main.ts; rebuilt core.js and public/fn | changed-kart run verifies; wrong kart 422; missing kart 400; v5 400; null → own kart; bundle test | K1. Never merge core.js by hand; rebuild it |
| K5 UI screens | builder B | render/karts.ts (new), render/statPanel.ts (new), karts.css (new), icons.ts (10 kart icons), render/screens.ts, ui.ts, garage.ts + render/layout/audit/text tests | no DOM changes on a repeat render; fits the listed sizes; a11y | K4 |
| K6 art and game | later builder | art-pipeline kart.ts, rigged.ts, glb.ts, racers.ts; game lineup.ts, session.ts, showroom.ts, podium.ts, ghostView.ts; main.ts; vfx-juice kartfx.ts; frameBudget.test.ts | a combo never shows another racer's driver; rigged combos one draw (buildRiggedTemplate over the racer's driver and the kart owner's body and wheel); frame budget; viewSim and riggedRace byte-identical | all eight racers from parts landed; the flames builder merged |
| K7 release | main | switch on; Body row out; verify; build:function; Adam's OK for the migration; push; fn-deploy-entry; live probe; muted contact sheet of 8 racers × 10 karts | — | all of the above |

## 7. Risks and cuts
Risks: K6 needs all eight racers from parts; the scripted driver may value handling more than the model predicts (3 h tuning loop); CI time +~6 min (one test per track, split if over 90 s); merge conflicts in ui.ts, main.ts, session.ts, kartfx.ts (new UI in new files; K6 last); the v6 client and the new function must go live together (a slip fails safe: "please reload the game").
Cut first to last: the kart icon on board rows (text instead); the stats panel on the Racer screen; bar animation polish (keep the ghost and chevrons); kart-card pictures (name + owner color); a kart whose model looks wrong shows "Coming soon"; last resort (decided by Mon 28 Sept noon): leave `UI.kartPick` off. Never cut: the unit gate, the track gate, or kartId in the replay.

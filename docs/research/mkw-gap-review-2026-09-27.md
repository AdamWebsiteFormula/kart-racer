# Mario Kart World gap review (27 Sept 2026)

A fresh-eyes review of main at f7b9933 (what just went live), after Adam's note of 26 Sept that the game "feels very cheap and does not feel quality". Report only: no game code was changed.

## Summary

The fixes since 26 Sept hold up in the captures: the menus, the grid revs and pipe fire, tricks, the finish reactions, gears, the sea and the storm all read well. What still looks cheap is the racing view itself, the thing a new player stares at for two minutes a race. The road runs through a flat, nearly empty strip: on the four land tracks nothing solid stands within 13 m of the curb (the course limit is invisible at 12 m), roadside props run 3 to 29 per 100 m, and the big shapes the eye lands on, such as the volcano ahead of the first grid, the stacked drum towers and the cone islands, are a few code-built cones and cylinders. The chase camera then shrinks your kart to about 60% of Mario Kart World's size at speed, about 150 px against 250 px wide in a 1600 px frame, by widening to 68-80 degrees and backing off to 6-7 m. The road fills the lower half as one flat color, and your racer's head is about a third the size of Luigi's; in the Timber Wagon it sits behind a seatback. Contact has no punch: a bump shows nothing, a wall hit shows 8 dust puffs, and an item hit is a flat spin. The racers never speak (0 voice lines in a whole race, rival yelps as loud as the background). Every race ends on a cream paper form, and the countdown and FINISH! are flat web text. Three of the ten are small CSS or constant changes (the camera, the results panel, the banners), which is where I would start. The two biggest, roadside dressing and landmark models, are the ones that most change a first impression.

## How this was checked

- **Our game:** main f7b9933 on this worktree's dev server (port 5192), in silent headless Chrome only (scripts/headless/cdp.mjs adds ?mute; no sound was ever played). I drove it with the dev `kart` helper (race, step, autopilot, photo, finishAs, ceremony) and with synthetic key presses to hit walls. I took 1600x900 stills of:
  - the title, Mode, Racer, Kart and Track screens
  - the course intro at 0.8, 2.3, 3.7 and 5.4 s, the countdown and GO
  - all six tracks at 10, 22 and 37 s, and a 60 s Lighthouse Loop run shot every 0.5 s
  - a forced Homing Kite hit, three kart bumps, a wall hit and Windmill Run's Final Lap Shift
  - the finish, the results and the podium

  All of them are in `~/.cache/rascal-review/2026-09-27/ours/`.
- **Mario Kart World:** muted stills from `scripts/headless/frames.mjs`, taken from "MARIO KART WORLD Full Gameplay Walkthrough" (https://www.youtube.com/watch?v=ngiIINHSiJc). It covers the menus (0:45-1:22), a Mario Bros. Circuit Grand Prix race (1:30-4:47), covered sections (6:46-14:28) and the end of the cup (15:01-16:00). Times are the ones the player reported for each still. The stills are in `~/.cache/rascal-review/2026-09-27/mkw/`.
- **Gemini Flash** (`watch.mjs`, and a scratch copy of `review.mjs` pointed at this server) was used only to find moments and as leads. Everything below was checked on the stills. Two Flash claims did not hold and are left out:
  - "The kart rotates rigidly with no body roll": kart-controller has lean and per-wheel suspension, and the stills cannot show it either way.
  - "Flat 2D billboard flames": the flames have been the jet shader since 25 Sept.

  Banners stay up longer in the stepped captures because they time out on the real clock. That is a capture artifact, not a finding.
- **Sound:** nothing was played. I rendered and measured one whole Lighthouse Loop race offline (`scripts/elevenlabs/mix` render and measure, seed 11, Pip, 137 s). The report is at `~/.cache/rascal-review/2026-09-27/sound-07-offline-mix-report.txt`.
- **Side-by-side sheets** (ours on the left, Mario Kart World on the right) are in `~/.cache/rascal-review/2026-09-27/`: `sheet-01` to `sheet-10` (there is no sheet 07: the sound item's evidence is the render report above), plus `nit-a` and `nit-b`.

## The ten, ranked by how much a first-time player notices them

### 1. The road runs through an empty lawn (effort L)
- **What a player sees:** beside the road, a flat lawn (or sand or snow) with tufts and flowers, then a thin line of props far off. Boardwalk Nights and Skyline Circuit show bare deck and sky. Nothing whips past at speed, so 80 km/h feels slow. The course intro and the title show the same emptiness.
- **Evidence:** `sheet-01-empty-roadside.jpg` (ours: Lighthouse Loop lap 2, Windmill Run 0:34, Boardwalk Nights 0:34). Measured from the track files (`environment.decor`), roadside props per 100 m of each side of the road:

  | Track | Props per 100 m |
  |---|---|
  | Lighthouse Loop | 12.8 |
  | Windmill Run | 16 |
  | Mesa Rush | 22 |
  | Frostbite Pass | 29 |
  | Boardwalk Nights | 7.9 |
  | Skyline Circuit | 2.7 |

  On the four land tracks these props start 13-19 m past the curb (`decorBands.roadsideOffroad`), after 12 m of drivable verge (`offroadReach`) that holds only tufts and flowers. Frostbite Pass is the densest, and it reads best in the captures.
- **What Mario Kart World does:** the props start at the curb and never stop: tire walls, sponsor boards, floodlights, stands full of spectators, guard rails and chevron signs (ngiIINHSiJc 2:18, 2:29 and 2:50; the course overview at 1:34).
- **Fix:** add a decor band that runs along the course limit, carrying a continuous edge for each biome (fence, hedge, rope and posts, a line of rocks, a tire wall). Dress the verge with props you can drive through (signs, crates, barrels, bushes), at 3-4 times today's roadside count. On Boardwalk and Skyline, line the deck edge with stalls, lamp posts, railings and banners. It stays instanced as today, so it costs a few draw calls.
- **Files:** `src/track-builder/tracks/*.json` (`environment.decor`), `src/track-builder/mesh/decor.ts` (a band laid along the limit), `src/art-pipeline/decor.ts` (the edge kits), `docs/schemas/track.schema.json` (the new band).
- **Effort:** L. M for a first pass on Lighthouse Loop and Windmill Run, which open the Sunrise Cup and the title.

### 2. The camera keeps your kart small (effort S)
- **What a player sees:** at speed the kart is a small shape in the middle of a lot of gray road, and on a boost it shrinks further. Rivals alongside look bigger than you.
- **Evidence:** `sheet-03-camera-kart-size.jpg`. Kart width in a 1600 px frame:

  | Moment | Ours | Mario Kart World |
  |---|---|---|
  | On the grid | about 200 px | about 240 px (2:11) |
  | At speed | about 150 px | 250-260 px (2:18, 2:29) |
  | Boosting | about 130 px | not measured |

  The cause is `CAM` in `src/game/camera.ts`. It widens the vertical view from 60 to 68 degrees with speed, and to the 80-degree cap on a boost (`JUICE` holds +4 and each punch adds +5 to +10). It also backs off from 5.5 m to about 6.9 m.
- **What Mario Kart World does:** the camera stays close, and the kart stays about the same size at any speed. The sense of speed comes from what passes by, not from widening the view (ngiIINHSiJc 2:18, 2:29, 2:50).
- **Fix:** match the camera to those stills. These numbers are a starting point for tuning against the stills:
  - field of view 56 degrees, +4 at speed, boost punches about half (cap 66)
  - 4.5 m back, +0.2 at speed; height about 2.1 m
  - aim a little lower, about 1.1 m up and 7 m ahead
  - target: the kart fills 15-16% of the frame width at speed
- **Files:** `src/game/camera.ts` (`CAM`), `src/vfx-juice/juice.ts` (`punch`, `holdFov`, `holdBack`), `src/game/camera.test.ts`, `src/game/camera.e2e.test.ts`.
- **Effort:** S.

### 3. The big shapes are primitives (effort L)
- **What a player sees:**
  - The first thing ahead on the grid of the first track is a volcano made of three stacked cones, ringed with outsized palm fronds that are themselves cones.
  - Lighthouse Loop's sea stacks are stacked tan drums.
  - Mesa Rush's mesas are stacked orange discs, and its geyser plume is a plain white column.
  - Skyline's islands are cones with a green cap.
- **Evidence:** `sheet-02-primitive-landmarks.jpg`. In `src/art-pipeline/vista.ts`, the volcano is `m.cone(58…)`, `m.cone(46…)` and `m.cone(24…)` with 12 to 16 sides, and the rock columns are "bands" of drums.
- **What Mario Kart World does:** landmarks are modeled buildings and terrain with trim, windows, signage and layered rock (ngiIINHSiJc 1:34 course overview, 1:40 Crown City, 1:47 the factory mountain).
- **Fix:** replace the most-seen primitives with modeled GLBs: the volcano island, the drum towers, the mesa stacks, the geyser columns and the sky islands. Make them the way the racers were made (concept image, then image-to-3D, fitted in `glb.ts`). Where a model is not ready, at least break up the silhouettes with noise-displaced rock, ledges, clumps of plants and a texture.
- **Files:** `src/art-pipeline/vista.ts`, `src/art-pipeline/glb.ts`, `public/models/`, `docs/sops/art-pipeline.md`.
- **Effort:** L. M for the three seen from the start lines: the volcano, the drum towers and Mesa's mesas.

### 4. The road is one flat color (effort M)
- **What a player sees:** about the lower 40% of the screen is a single flat gray (orange on Mesa, mauve on Skyline, purple on Boardwalk), with one dashed line and a plain curb. The fine asphalt grain disappears at chase-camera distance.
- **Evidence:** `sheet-04-flat-road.jpg`.
- **What Mario Kart World does:** patched and cracked asphalt, darker rubbered racing lines, tar seams, riveted steel plates, diamond plate, painted colored stripes and arrows, and sand spilling over the edge (ngiIINHSiJc 2:15, 2:24, 2:46).
- **Fix:**
  - Add a large-scale variation layer to the road shader: patches, a darker racing line, oil stains.
  - Add a decal atlas placed from the track data: grid boxes, arrows before hairpins, the track's name at the start, repair patches, puddles.
  - Give set stretches a second surface, such as cobbles in Lighthouse Loop's town and boards on the pier.
- **Files:** `src/art-pipeline/surfaces.ts`, `src/track-builder/mesh/road.ts`, `src/track-builder/tracks/*.json`, `docs/schemas/track.schema.json`.
- **Effort:** M.

### 5. Your racer barely shows (effort M)
- **What a player sees:** from the chase camera, the racer is a small head over a big kart. In the Timber Wagon, Juniper sits behind a tall black seatback. At the finish, Pip is hidden behind handlebars and a headlamp.
- **Evidence:** `sheet-05-driver-size.jpg`, which shows the same 320x260 crop of both frames. Juniper's hat is about 35 px wide and Luigi's cap about 100 px. Head width against kart width is about 0.25 for ours and about 0.45 for Mario Kart World.
- **What Mario Kart World does:** the big-headed driver fills the middle of the screen from behind, and the finish and results cut to a close-up of the face (ngiIINHSiJc 2:18, 4:39).
- **Fix:** scale the drivers about 1.3x (heads a further 1.15x) in the rig and re-solve the seat IK. Cut seatbacks to shoulder height. Aim the finish camera at the head bone.
- **Files:** `src/art-pipeline/rigged.ts`, `public/models/racers/manifest.json` and the kart GLBs with high seats, `src/game/celebrate.ts`, `src/game/showroom.ts` (the hero framing follows).
- **Effort:** M.

### 6. Contact has no punch (effort S to M)
- **What a player sees:**
  - Bumping a rival: nothing at the point of contact, and a 0.12 camera shake.
  - Hitting a wall: the kart bounces back, but the only effect is 8 soft dust puffs, which are invisible on grass.
  - A Homing Kite hit: a white flash, a flat spin and two tiny gears.
- **Evidence:** `sheet-06-contact-no-punch.jpg` (ours: a bump at tick 756 on Windmill Run; a wall hit on Lighthouse Loop, 15 m/s to -2 m/s; a kite hit 0.25 s after impact). In the code, `juice.ts` `case 'bump'` adds camera shake only, and the `'wall'` burst in `vfx.ts` is 8 soft puffs.
- **What Mario Kart World does:** every bump shows a yellow-orange impact star, with little stars at the point of contact (ngiIINHSiJc 3:27.1, 2:30.9). A hit tosses the kart and throws coins toward the camera, along with shell shards and an icon of what hit you (2:48, 2:49).
- **Fix:** all of this is pictures only; the sim is untouched.
  - An impact-star burst at the bump's midpoint (glow pool, 0.15 s).
  - Scraping sparks along a wall.
  - On a hit: a visual hop and tumble with dizzy stars, and the lost gears thrown up and toward the lens.
- **Files:** `src/vfx-juice/juice.ts`, `src/vfx-juice/vfx.ts`, `src/vfx-juice/gears.ts`, `src/kart-controller/anim.ts` (a render-only hop).
- **Effort:** S for bumps and walls, M for the hit tumble.

### 7. The racers never speak (effort S to M)
- **What a player hears:** engines, music and effects, but no racer ever says a word.
- **Evidence:** the offline render of a whole Lighthouse Loop race (`sound-07-offline-mix-report.txt`):
  - 337 cues in all: 0 voice lines and 8 rival yelps.
  - Rival cues sit a median 0.3 dB over the background mix. 11 cues are more than 12 dB under it and cannot be heard, among them rival bumps, spins and yelps; Gus's yelp is 29 dB under.
  - There is no course ambience: between cues there is only engines and music, and the music sits a median 2.6 dB over the engines.

  `public/audio` has no `voice.json`, so Settings hides the Voices row (ui-hud Decisions, 27 Sept).
- **What Mario Kart World does:** every character calls out through the race. Super Mario Wiki's "List of quotes from the Mario Kart series" has a Mario Kart World section (https://www.mariowiki.com/List_of_quotes_from_the_Mario_Kart_series). Design §11 already asks for voice lines at Mario Kart 8's moments.
- **Fix:**
  - Finish the voice pack. `src/audio/barks.ts` is built. Per the 26 Sept handoff, Momo, Nova, Otto and Gus still need lines and Pip needs two more takes; the 27 Sept run ran out of its daily TTS quota before finishing.
  - Raise a rival's yelp and bump by 6-8 dB within about 12 m.
  - Add a quiet non-vocal ambience bed per course under the music: surf and gulls, wind in the fields, a carnival hum. No crowd voices, per the current rule.
- **Files:** `scripts/voice/*` and `public/audio/voice.json`, `src/audio/director.ts` (rival gain), `scripts/elevenlabs/catalog.ts` and `public/audio/manifest.json` (ambience).
- **Effort:** S for the voices (already under way); M with the ambience beds.

### 8. Every race ends on a paper form (effort S)
- **What a player sees:** after the finish, a cream card with outlined rows and big cartoon buttons slides in. Next to the glass menus the player started from, it looks like a web form.
- **Evidence:** `sheet-08-results-paper.jpg`. In `ui.css`, `.panel` is `var(--paper)` (#fffaf0) with an ink border. The results, the Grand Prix standings and the Knockout cut all use `panel box enter` (`render/screens.ts`, `frame()`), while the dialogs moved to deep glass on 26 Sept.
- **What Mario Kart World does:** translucent dark bars over the live scene, with italic place numbers, faces and points, and the player's row in gold (ngiIINHSiJc 4:42, 15:04).
- **Fix:** give the results family the dialogs' deep glass: translucent dark rows, white words, the player's row in gold, and the glass buttons.
- **Files:** `src/ui-hud/ui.css`, `src/ui-hud/render/screens.ts` (the class).
- **Effort:** S.

### 9. The countdown and banners are flat text (effort S)
- **What a player sees:** "3", "2", "1" in flat yellow, "GO!" in flat green, and "FINAL LAP" and "FINISH!" as flat words with an outline. The start lights are a small box on the far gantry.
- **Evidence:** `sheet-09-flat-banners.jpg`.
- **What Mario Kart World does:** huge italic numerals and words with a thick colored outline, a two-tone gradient and a bevel, flying in letter by letter. The start lights are held up close to the camera (ngiIINHSiJc 2:11, 2:12.5, 4:34).
- **Fix:**
  - One banner style for all of them: skewed italic, a gradient fill (via `background-clip: text`), an extruded look from stacked text shadows, letters staggering in one by one and squashing out.
  - Bring the start lamps close: a bigger lamp rig nearer the grid, or a lamp strip at the top center of the HUD.
- **Files:** `src/ui-hud/ui.css` (`.banner`), `src/ui-hud/render/hud.ts` (letter spans), `src/track-builder/mesh/gantry.ts`.
- **Effort:** S.

### 10. Mesa Rush's mine is a black void (effort S)
- **What a player sees:** on laps 1 and 2 of Mesa Rush, most of the screen goes black for several seconds, with a gray road down the middle.
- **Evidence:** `sheet-10-black-mine.jpg` (ours: 0:18.9, lap 1). This is by design for now: the lanterns are embers until the final lap (design §6), and the chase camera dims the sky and ambient light to about 60% inside the bore (vfx-juice Decisions, 24 Sept).
- **What Mario Kart World does:** covered sections are dimmer but always readable, with lit walls, lamps, signs and a glowing exit (ngiIINHSiJc 6:46 underpass, 7:00 indoor ramp, 10:40 train interior).
- **Fix:** light the bore on every lap: pools of lantern light at a low level, glowing timber frames, a warm fill light and a glowing far portal. Keep the final lap's flicker-on as a brighter step up.
- **Files:** `src/track-builder/mesh/tunnel.ts`, `src/track-builder/mesh/shiftStage.ts`, `src/main.ts` and `src/game/camera.ts` (`ChaseCam.tunnel`, the light inside the bore).
- **Effort:** S.

## Smaller nits

1. **The podium is one wide, static shot** of plain blocks with small karts (`nit-a-podium.jpg`). Mario Kart World gives each of the top three a moving hero shot with a name card, then shows CONGRATULATIONS over a big trophy (ngiIINHSiJc 15:32, 15:42, 15:55). File: `src/game/podium.ts`. Effort M.
2. **Lighthouse Loop's lawn after the start ends in an invisible wall.** The kart bounced from 15 m/s to -2 m/s against nothing visible (`nit-b-edges-and-lens.jpg`; `ours/wall/w0910.jpg`). Windmill Run, Mesa Rush and Frostbite Pass show a fence at the limit. The edge kit from item 1 fixes this. Effort S.
3. **The pickup balloons hang dead still by day.** Their only motion is a glow pulse, and the glow is 0 in daylight; the gears, by contrast, spin and bob. Give the balloons a bob, a sway and a swinging string, each with its own phase. File: `src/track-builder/mesh/scene.ts`. Effort S.
4. **Boost streaks cross the whole sky** and read as scratches or rain, most of all at night (`nit-b`; `ours/tracks/board-a.jpg`). Keep them to the lower edges of the screen. File: `src/vfx-juice/trails.ts`. Effort S.
5. **A gear blurs across the lens** as you take it (`nit-b`; `ours/scan-harbor/s03180.jpg`). Fade pickups from farther out while racing, as the finish camera already does (`PICKUP_GHOST`). File: `src/track-builder/mesh/ghost.ts`. Effort S.

## Checked and fine

- **Menus:** the Mode, Racer, Kart and Track screens now read close to Mario Kart World's (`ours/m2-racer.jpg`, `m3-kart.jpg`, `m4-track.jpg` against ngiIINHSiJc 1:05, 1:19, 1:22).
- **Race start:** the course intro and its title card, and the grid revs and flames at GO.
- **Driving effects:** the drift stars and boost flames, and the Final Lap Shift storm on Windmill Run (dark sky, rain, wet road, tire spray).
- **Finish:** the finish reactions and the results beside the racer.
- **HUD:** the place numeral and the gear pill.

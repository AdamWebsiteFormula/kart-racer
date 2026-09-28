# Mario Kart World gap review, round 2 (28 Sept 2026)

A second fresh-eyes review, of main at 527a1c0, after two rounds of fixes from the first one (docs/research/mkw-gap-review-2026-09-27.md on branch worktree-agent-adaba84c7d987b86f). Report only: no game code was changed. The first review's five small nits (podium, balloon sway, sky streaks, lens blur, the invisible wall) are being fixed by another builder and are left out.

## Summary

The round-2 and round-3 work holds up: the chase camera, the struck banners and start lamps, the glass end screens, contact stars, the lit mine, the banks and hedgerows at the course limit, the modeled volcano and peaks and the finish reactions all read well in the captures, and the voice lines are in the build. What still makes the game feel cheap next to Mario Kart World is now mostly about the place and the moments around the race. The first screen is a low shot of asphalt with the leading kart hiding behind the new menu. The course has almost no race dressing: arrow boards stand on one bend per track, 13 m out, as 20-pixel specks, and nothing anywhere carries a word, a banner or a flag. Five of six tracks run on the same gray highway with lane dashes, so a farm, a desert and a snowy pass look alike underfoot. Shadows are about twice as dark, relative to the lit road, as Mario Kart World's. A trick lifts the driver's arms while the kart barely tips. Every race opens with nine seconds without music. The racer you chose is never shown from the front before the count, Mesa Rush's skyline is still stacked striped drums, Windmill Run's windmill and Boardwalk's Ferris wheel never turn, and on a slower line a first visit shows the code-built stand-ins. Two blind readers, given only side-by-side stills, independently named the title, the bare trackside, the one road, the dark shadows and the missing close-up before the race; one also named the trick. Seven of the ten are small (S): the title camera, the arrow boards, the trick, the shadows, the close-up, the windmill, and hiding the stand-ins. That is where I would start for 30 Sept. The road surfaces, the openings' music and the last landmark models are medium.

## How this was checked

- **Our game:** 527a1c0 on this worktree's dev server (port 5192), in silent headless Chrome only (scripts/headless/cdp.mjs adds ?mute; no sound was played; the server was stopped at the end). The page's own loop was stopped and every frame stepped with `kart.step`, the AI driving the player, so full-page stills (HUD included) could be taken on the sim's own events: the course intro, the count, GO, drift tiers, boosts, balloons, all 13 items (forced one after another), tricks, hits (a forced decoy), laps, the Final Lap Shift and the finish. That was one Grand Prix race and five Quick Races, covering all six tracks. Also: the menus, the title every 3 s for 90 s, the title camera measured for 60 s, a real-time Final Lap on Skyline Circuit, trailed items, disappointed finishes, two landmark motion checks, and chase-height stills at the arrow-board bends.
- **The live site on a first visit:** cache off, throttled to 20, 10, 5 and 3 Mbps, pressing Enter through the menus as a new player would (scripts in `tools/`).
- **Mario Kart World:** muted stills from a copy of scripts/headless/frames.mjs that hides YouTube's overlays (`tools/frames2.mjs`). Each still is taken about 1.5 s after the time given. The videos:
  - "Mario Kart World - All Courses (150cc Grand Prix) (4K)": https://www.youtube.com/watch?v=OSU-aguh1AY
  - "MARIO KART WORLD Full Gameplay Walkthrough": https://www.youtube.com/watch?v=ngiIINHSiJc
  - "Mario Kart World - Golden Rally (150cc) Knockout Tour Gameplay 4K": https://www.youtube.com/watch?v=-5O0G54Pwu4
  - "Mario Kart World - All Characters Win & Loss Animations": https://www.youtube.com/watch?v=pVnOp1tBK-w
- **Blind second opinion:** two fresh Claude readers got only eight unlabeled pairs of stills (ours as "A", MKW as "B"; `blind/`) and ranked what makes A look cheaper. Where they agree with an item, it says so.
- **Sound:** nothing was played. Two whole races were rendered and measured offline (scripts/elevenlabs/mix render and measure: Lighthouse Loop with Juniper, Windmill Run with Momo, seed 11, 150cc). The code paths were read too. The report is `sound-06-offline-mix-report.txt`.
- **Gemini was not used** (its credit is spent).
- Everything is in `~/.cache/rascal-review/2026-09-28/`. The side-by-side sheets (ours on the left, MKW on the right) are numbered as the items, `sheet-01` to `sheet-10`; there is no sheet 06 (sound). The smaller notes are on `nit-a-hud-lens-night.jpg` and `nit-b-faces.jpg`. `tools/sheets.sh` rebuilds every sheet.

## The ten, ranked by how much a first-time player notices them

### 1. The title hides its racer behind the menu (effort S)
- **What a player sees:** the first screen is a low shot along the start straight. Road and curb fill the lower two thirds. The leading kart, about 11 m off and a tenth of the frame wide, sits at the right edge of the menu bands or behind them.
- **Evidence:** `sheet-01-title.jpg`; `ours/title/` (30 stills, 3 s apart). Measured over 60 s (`tools/measure-title.mjs`, 120 samples):
  - The leader was behind the menu in 43 samples (36%) and off screen in 7.
  - Most of the rest were within 100 px of the menu's right edge: the kart settles at x 513-560 px, and the menu ends at 541 px of 1600.
  - The cause is `tvCamera` in src/main.ts. `TV_ASIDE = 4` aims 4 m to the leader's right (its comment: "the kart shows left of the centred menu"), but the 26 Sept rebuild moved the menu to the left, over the kart. The orbit is 11 m out and 2.8 m up, with a 58° view.
- **What MKW does:** the title is a raised shot of the world with its racer in the clear under the logo (ngiIINHSiJc 0:43; OSU-aguh1AY 1:40:00).
- **Fix:** aim the other way, so the leader sits in the open right half (TV_ASIDE about -4). Raise the camera so the world fills the frame and road stays under 40% of it: a high trailing shot toward the volcano, a low front three-quarter and a side dolly past the grandstand, cut in turn.
- **Files:** src/main.ts (`tvCamera`, `TV_ASIDE`); a check in the style of scripts/headless/chase-look.mjs that the leader's box never meets the menu.
- **Effort:** S. **Fits by 30 Sept:** yes. Both blind readers named it.

### 2. The course has almost no race dressing (effort S to M)
- **What a player sees:** the road runs between lawns and hedgerows with nothing that says "race". Bends arrive unannounced. There are no banners on the fences, no signs with words anywhere, and no flags along the straights.
- **Evidence:** `sheet-02-race-dressing.jpg`; `ours/signs/`.
  - An arrow board exists (src/art-pipeline/dressing.ts `chevronSign`: a 1.9 by 1.05 m board on posts).
  - It stands on one bend per track (two on Frostbite Pass, none on Boardwalk Nights or Skyline Circuit), 13 m past the road (the track files' `*-sign` decor). From the chase camera it is a speck about 20 px tall.
  - The decor, edge and dressing kits have no banner, flag or sign with words. Apart from those boards, the only arrows are on boost pads and ramps.
- **What MKW does:** even its farm course is dressed for a race. On Moo Moo Meadows there are banners along the fences, feather flags and hay bales (OSU-aguh1AY 1:29:15), an arrow billboard at a bend (1:29:30) and a sign board over the start (1:29:00). Mario Bros. Circuit has big red arrow boards along its banked bends (3:14) and painted signs on its walls (1:37.6).
- **Fix:** put the existing arrow boards on every bend at the course limit, two to three times their size, in runs on the outside, and give Boardwalk and Skyline their own (neon, gold). Then hang banners on the fences and gates for the cast's own shops and clubs (Gus's Grub, Sprocket Spares, Pip's Parcel Post), from one drawn atlas, and add a few flags on the straights. Keep all names and designs original.
- **Files:** src/art-pipeline/dressing.ts and edges.ts (the props), src/track-builder/mesh/edge.ts (placing them on bends), src/track-builder/tracks/*.json, a sign atlas (new), docs/design.md §6.
- **Effort:** S for the arrow boards; M with the banners and signs. **Fits by 30 Sept:** yes for the arrow boards and a first set of banners. Both blind readers named it (one as the biggest gap).

### 3. Every road is the same gray highway (effort M)
- **What a player sees:** Lighthouse Loop, Windmill Run, Mesa Rush, Frostbite Pass and Skyline Circuit all run on asphalt with white lane dashes, tinted a little per biome. A farm lane, a desert track and a mountain pass look alike underfoot, and like a road demo rather than a place.
- **Evidence:** `sheet-03-roads.jpg` (Windmill Run 0:41.0, Mesa Rush 0:48.0). The lower half of every driving still in `ours/quick_*/` shows the same thing. The 27 Sept fix (racing line, patches, seams) made the asphalt less flat; it is still asphalt everywhere.
- **What MKW does:** the road belongs to the place. Moo Moo Meadows is a rutted dirt road (OSU-aguh1AY 1:29:15). The desert course has sand drifted over the road (2:26). Mario Bros. Circuit mixes asphalt with riveted steel plate (2:56, 3:02) and green and white painted edges (1:07).
- **Fix:** give each track its own road, for looks only (the sim's road stays road): packed dirt with ruts and tire streaks on Windmill Run, sand-dusted red rock on Mesa Rush, and snow-packed with tire tracks on Frostbite Pass. Keep the lane dashes only in Lighthouse Loop's town.
- **Files:** src/art-pipeline/surfaces.ts (`ROAD_LOOKS`), src/track-builder/mesh/road.ts (the markings), public/textures/, docs/design.md §3 (the road bullet).
- **Effort:** M. **Fits by 30 Sept:** partly: Windmill Run and Mesa Rush first. Both blind readers named it.

### 4. A trick barely shows (effort S)
- **What a player sees:** off a ramp or a bump row, a trick makes the driver throw up their arms. The kart tips a little and levels out, so the moment reads as nothing happening.
- **Evidence:** `sheet-04-trick.jpg`; `ours/trick2/` (a still every 0.05 s from Juniper's trick on Mesa Rush). In the code:
  - src/kart-controller/anim.ts `trickFlick` "flicks the chassis over and back (about 14°)".
  - driverAnim.ts adds arms up and a 0.55 rad twist.
- **What MKW does:** the kart spins right over in the air. At 1:37.6 it is on its side mid-trick (OSU-aguh1AY 1:37.2 to 1:37.6).
- **Fix:** for looks only, spin the kart and driver one full turn (a roll or a spin) over 0.35 to 0.45 s, sized to the air time left (half a turn on a short hop), alternating sides. Add a white flash at the press and a small ring on landing. The sim, the input logs and the replays are untouched.
- **Files:** src/kart-controller/anim.ts, driverAnim.ts, src/vfx-juice/kartfx.ts (the flash), their tests.
- **Effort:** S. **Fits by 30 Sept:** yes. One blind reader named it.

### 5. Shadows are near-black and hard (effort S)
- **What a player sees:** the bunting throws black diamonds across the road, and the kart sits on a black blob. On the Windmill Run and Mesa Rush grids, the gantry lays a black band across the front row while the count runs.
- **Evidence:** `sheet-05-shadows.jpg`. The darkest 3% of the road (shadows and tires), measured on the stills:

  | Game | Brightness of the darkest 3% of the road | Share of the road's middle brightness |
  |---|---|---|
  | Ours (Lighthouse Loop lap 2, Mesa Rush grid, Windmill Run lap 2) | 16-23 of 255 | 0.16-0.18 |
  | MKW (four stills: OSU-aguh1AY 1:11, 2:02, 2:44, 1:29:15) | 36-58 of 255 | 0.27-0.41 |

  The shadow map is `PCFShadowMap` (src/main.ts).
- **What MKW does:** shadows are soft and filled with sky and bounce light, so the road under them stays a readable mid-tone (the four stills above).
- **Fix:** lift the shadow fill so cast shadows sit near a third of the lit road (sun shadow intensity about 0.65, tinted toward the sky) and soften their edges (a 2-3 texel radius). Keep the gantry's crossbar from darkening the grid. Measure it again the same way.
- **Files:** src/main.ts (the sun, `hemi`, `fill`, `applyLight`), src/track-builder/mesh/glow.ts (it patches the shadow lines), the tracks' sky light values.
- **Effort:** S. **Fits by 30 Sept:** yes. Both blind readers named it.

### 6. Nine seconds of silence before GO, and no sound of the place (effort S to M)
- **What a player hears:** the menu music stops when the race loads. The 5.9 s course intro and the 3 s count play over idling engines and three beeps, with no music, and the race song starts at GO. Between cues there is never a sound of the place: no surf, no wind or birds, no carnival hum. Most rival noises can't be heard.
- **Evidence:** `sound-06-offline-mix-report.txt`, and in the code:
  - src/audio/audio.ts `newRace` stops the song and holds the race song for GO. The audio SOP (23 Sept) says "Race songs start on the go, not during the countdown".
  - public/audio/manifest.json has no ambience loop.
  - Two whole races rendered offline: the count's music is -inf LUFS in both.
  - Rival cues sit a median +0.5 dB and -5.1 dB against the music and engines (Lighthouse Loop, Windmill Run). 22 and 29 of them are more than 12 dB under, so they can't be heard: rival bumps, balloon pops, spins and yelps.
  - The 27 Sept review measured +0.3 dB and 11. Its "raise rivals 6-8 dB when near" and "ambience bed" suggestions were not built.
- **What MKW does:** every race opens on its cup's own opening theme. The soundtrack has "Opening (Mushroom Cup)" through "Opening (Special Cup)", plus "Opening (Knockout Tour)" (Super Mario Wiki, draft Mario Kart World soundtrack list: https://www.mariowiki.com/PipeProject:Music/Drafts/Mario_Kart_World_soundtrack; the OST upload "Race Start Intro (Mushroom Cup)": https://www.youtube.com/watch?v=GDAx-FxY0aE).
- **Fix:**
  - An original 6-9 s instrumental opening per cup (Sunrise brass and ska, Summit synth-brass funk, Knockout its own), timed to the course intro and landing on the count.
  - Rival cues up about 6 dB within 12 m.
  - A quiet ambience loop per track under everything (surf, wind and birds, a carnival hum; no crowd voices, per the current rule).
  - With the Gemini judge out, pick the takes with the local ears (scripts/ear) and Adam's own ear.
- **Files:** scripts/elevenlabs/catalog.ts, public/audio/manifest.json, src/audio/audio.ts and samples.ts (an opening cue when the intro starts), src/main.ts (the call), src/audio/constants.ts (`otherGain`, `nearMetres`), docs/sops/audio.md.
- **Effort:** S for the rival gain, S to M for the openings, M for the ambience. **Fits by 30 Sept:** yes for the openings and the rival gain; the ambience if time allows.

### 7. Your racer is never shown before the race (effort S)
- **What a player sees:** the course intro flies the track, trucks past the crowd and cranes down behind the grid. The racer the player picked is only ever seen from behind until the finish. The karts stand on plain asphalt with no grid boxes.
- **Evidence:** `sheet-07-grid-intro.jpg`. src/game/intro.ts has four moves: the sweep, the glide, the truck past the grandstand, and the crane down behind the player's kart (design §9).
- **What MKW does:** before every count it cuts to a front close-up of the player's racer in a painted grid box, then a side shot under a "1st Race" or "2nd Race" ribbon (OSU-aguh1AY 1:07 to 1:09, 1:29:04 to 1:29:06).
- **Fix:** add a fifth move before the crane: a 1.5-2 s front three-quarter close-up of the player's racer looking at the lens (driverAnim already turns the head to the camera on the grid), with the race number on a ribbon. Paint a grid box under each kart.
- **Files:** src/game/intro.ts, src/ui-hud/render/intro.ts and intro.css, the grid decals (src/track-builder/mesh/gantry.ts or road.ts), docs/design.md §9 (the intro grows from 5.9 s to about 7.5 s).
- **Effort:** S. **Fits by 30 Sept:** yes. Both blind readers named it.

### 8. The last primitive landmarks (effort M)
- **What a player sees:**
  - Mesa Rush's skyline is rows of striped cylinders in clay, cream and rust. They read as stacked drums or traffic cones, and so do the buttes by the trestle and the hoodoos by the rope bridge.
  - Lighthouse Loop's sea stacks are tan drums with green caps, and its beach huts are boxes with pyramid roofs.
  - The huts and stacks stand right behind the winner on the results screen.
- **Evidence:** `sheet-08-primitive-landmarks.jpg`. In the code:
  - src/art-pipeline/vista.ts `column()` is "a banded rock column ... drums". It builds Mesa's buttes, hoodoos and gorge columns and Lighthouse's `seaStacks`.
  - The beach huts are edges.ts `hut()`.
  - This is the rest of the 27 Sept review's item 3. Round 3 modeled the volcano, the glacier peak, the cinder cone and the floating islands.
- **What MKW does:** desert rock is sculpted and layered, with ledges, overhangs and scrub (OSU-aguh1AY 2:20; -5O0G54Pwu4 1:50).
- **Fix:** replace the drums with image-to-3D models as round 3 did (a striped butte, a hoodoo pair, a sea stack) and model the beach hut. Until then, break the columns' outlines with displaced rock, ledges and flat tops.
- **Files:** src/art-pipeline/vista.ts, src/art-pipeline/edges.ts, public/models/props/ and props.json, docs/sops/art-pipeline.md.
- **Effort:** M. **Fits by 30 Sept:** likely, if the Higgsfield credits allow. One blind reader named the mesas.

### 9. The windmill and the Ferris wheel never turn (effort S to M)
- **What a player sees:** Windmill Run is named for its windmill, and the big windmill by the road never moves its sails, while the little ones on the far hills do turn (vista.ts movers). Boardwalk Nights' Ferris wheel never turns either. Both stay in view for long stretches and in the course intro.
- **Evidence:** `sheet-09-frozen-landmarks.jpg`:
  - The sails are the same at 0:03.36, 0:04.13 and 0:04.89 (`ours/still/`).
  - The Ferris wheel's gondolas are the same in three stills 3.3 s apart (`ours/still3s/`).
  - Both are single-mesh image-to-3D models (windmill.glb, 9,972 vertices; ferris-wheel.glb, 11,471), placed whole as the track's landmark in src/track-builder/mesh/scene.ts. Nothing turns them.
- **What MKW does:** Moo Moo Meadows keeps windmills along its course (OSU-aguh1AY 1:28:58, 1:29:06), and the big set pieces work: trains run on Whistlestop Summit, boats circle Wario Shipyard's whirlpool, and DK Spaceport's robot throws barrels (Super Mario Wiki, as gathered in docs/research/track-thrills.md).
- **Fix:** at load, cut out each model's moving part by position (the sails; the wheel with its gondolas) and turn it about its hub on the shared clock: the sails once every 6-8 s, the wheel once a minute.
- **Files:** src/track-builder/mesh/scene.ts (the landmark), src/art-pipeline/glb.ts (a split helper), public/models/props.json (an axis, hub and rate for each).
- **Effort:** S for the windmill; M for the wheel with upright gondolas. **Fits by 30 Sept:** yes for the windmill, likely for the wheel.

### 10. A first visit on a slower line shows the code-built stand-ins (effort S, then M)
- **What a player sees:**
  - On 20 Mbps the title's karts are boxes and balls for the first 4-6 s.
  - On 5 Mbps the Mode and Kart screens' big 3D hero is the code-built Pip (a box scooter, a ball body, a cone beak), and the first course intro shows the old cone volcano and box houses.
  - A quick player on 3 Mbps starts the first race among box houses.
- **Evidence:** `sheet-10-cold-load.jpg`; the live site, cache off, throttled: `ours/boot-live-20mbps/`, `live-flow-20mbps/`, `live-flow-5mbps/`, `live-flow-3mbps-quick/`. On 10 Mbps the racers' drivers, bodies and wheels (about 7.1 MB; each driver 0.47-0.77 MB, Pip's 23,629 vertices) arrive between 2.4 and 8.9 s, and the props after them (`ours/sheets-src/net10.txt`). The code-built karts are the design's fallback (design §4), shown until the files are in.
- **What MKW does:** not a like-for-like case (a console game loads before it shows). The cheap moment is ours: the stand-ins are primitives, the very thing the rest of this work has removed.
- **Fix:** never show a stand-in where the player is looking. Hold the title over a painted still until the attract race's racers are in, and show the tile's picture on the setup screens until the model is. Then shrink the model files with meshopt (gltfpack) so they arrive sooner.
- **Files:** src/main.ts (the attract start, the file queue), src/game/showroom.ts, src/art-pipeline/glb.ts (the meshopt decoder), public/models/, docs/sops/performance.md.
- **Effort:** S for hiding the stand-ins; M for compressing the files. **Fits by 30 Sept:** yes for hiding them; the compression can wait.

## Smaller notes (not in the ten)

Notes 1, 2, 3 and 5 are on `nit-a-hud-lens-night.jpg`, note 6 on `nit-b-faces.jpg`.

1. **The empty item slots are two bright white discs, and a race clock sits at the top center.** Both blind readers called the HUD thin or plain. MKW shows its item frames only once an item comes, and shows no clock in a race (-5O0G54Pwu4 1:00). Make empty slots faint glass or hide them; keep the clock for Time Trial. File: src/ui-hud/ui.css (`.slot[data-state='empty']`). Effort S.
2. **A rival riding right behind you sits between the lens and your kart, drawn huge at the bottom of the screen.**
   - On a Lighthouse Loop start, Boulder hid Juniper completely (`ours/gp1/047`).
   - For about 2 s, Gus and Boulder rode 1.8 to 5 m from the lens while Juniper was 5.9 m away (`tools/dbg-cam.mjs`).
   - Both blind readers flagged it.
   - But src/game/kartFade.ts records that MKW keeps rivals solid right behind you too (checked in its footage, 25 Sept), so this may just be how pack racing looks. If it is changed, fade only a rival that covers most of your kart while it is nearer the lens (today only within 1.3 m). Effort S.
3. **A decoy or oil can dropped behind you fills the lens for a frame or two** (`ours/items/169`). This is the same family as the lens-blur nit being fixed now; tell that builder.
4. **The pickups look plain:** flat red balloons and teal gears, with no glow or sparkle. Both blind readers said so. This overlaps the balloon-sway nit being fixed now; a gloss and rim glow could go in with it.
5. **Boardwalk Nights' karts go almost black under the purple night** (`quick_boardwalk-nights_gus_snacktruck/082`). A stronger rim or headlamp light at night would help.
6. **Faces never change** (`nit-b-faces.jpg`): the same painted smile in a win, a loss or a hit. The disappointed pose hides the face, which softens it. MKW's faces carry every reaction (pVnOp1tBK-w 0:24, 0:48). Per-racer face swaps are M to L and do not fit by 30 Sept.
7. **Mesa Rush and Skyline Circuit share one race song** (`race-finale`), so the first cup's third race plays the finale's theme.
8. **Every autopilot start bumped the kart alongside within 1.1 s of GO**, on Lighthouse Loop, Windmill Run and Skyline Circuit, always Big Gus's Snack Truck. Worth checking with a human start.
9. **The boost's white wind arcs can read as a faint bubble round the kart,** like the Bubble item (`gp1/106`, `gp1/111`).

## Checked and fine

- **Menus on a normal line:** the Mode, Racer and Kart screens with their 3D heroes (`ours/live-flow-20mbps/`), and the quick move into the course intro.
- **Race start:** the course intro's flight and title card, the lamps near the camera, and the struck 3, 2, 1 and GO.
- **Driving effects:** drift sparks, boost flames and the tire marks. Contact shows now: stars on bumps and hits.
- **Items:** all 13 were used, and the trailed ball, mouse, can and decoy read clearly behind the kart.
- **Final laps:** the Final Lap Shift banners and set pieces on all six tracks (Skyline's night sky, the Windmill storm, Boardwalk's fireworks).
- **End screens:** the results beside the racer and the Grand Prix standings on glass.
- The blind readers also credited the painted skies, the distinct biomes, and the racers' and karts' silhouettes.

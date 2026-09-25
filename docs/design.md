# Design Bible — Kart Racer (working title)

Read this before any gameplay, art or content work. It is the source of truth for the world; the research plan ("Kart Racer - Research and Build Plan") is the source of truth for the *why*. Anything not here is not in the game.

## 1. One-line pitch
A bright cartoon kart racer where eight original racers drift, boost and trade blows across six vivid biomes, and every final lap the track fights back.

## 2. The twist ("Most Creative")
**Final Lap Shift.** On the last lap of every track the world changes in one readable way: a route opens or closes, the weather turns, the time of day flips, something big moves. Judges see it within two minutes of play. It is one system (a `finalLapShift` block per track) reused six ways, so it is cheap. Examples are in the track table.

## 3. Tone and art direction
- Tone: sunny, mischievous, generous. Nobody is a villain; rivals grin when they hit you.
- Art: saturated diorama in soft stylized PBR (Adam, 25 Sept 2026: "switch to the new look", chosen on side-by-side stills against the old toon look): `MeshStandardMaterial`, rough and non-metallic, with detail normals from the painted textures (asphalt grain, worn paint, tire marks, grass relief), the painted sky as the environment light, red-and-white curbs on tight corners, a soft dirt band where the grass meets the curb; the rigged racers share the same light. No outlines (Adam, 23 Sept 2026: Mario Kart World draws none), warm key light + cool fill, one accent colour per biome, painted gradient skies. Palettes per biome in §6. The old toon look (`MeshToonMaterial`, a 3-step gradient) stays behind `?look=toon`.
- Silhouette rule: every racer and every item must be identifiable in a 32 px black silhouette.
- Hard IP rules: no Nintendo names, characters, items, sounds, layouts, typography or item-box look-alikes. Pickups are **balloons**, not boxes. See research plan §3.1.

## 4. The cast (8 racers, 3 archetypes)
Stats are multipliers on a shared base, tuned so the classes race level on the real tracks. Light: accel +12%, handling +12%, speed −1%, weight −15%. Medium: all 0, no hook. Heavy: speed +1%, weight +18%, accel −12%, handling −10%; weight decides kart-to-kart bumps, so heavy pushes harder and resists being pushed.

Why speed is only −1% / +1% (bug hunt 2, 24 Sept 2026; it was −8% / +10%): our tracks are fast and flowing, so top speed sets almost all of a lap time and accel and handling pay about 1%; at −8% / +10% the heavy was 12–20% faster on every track and won 47 of 48 all-AI races, and now the AI's solo times per class are within about 3% at 100cc and 150cc.

Coins are everyone's speed bonus: a hit always spins you out and costs coins.

| # | Name | Species / idea | Class | Personality | Signature kart | Colour |
|---|---|---|---|---|---|---|
| 1 | **Pip** | Hummingbird courier, goggles too big | Light | Fast-talking, never stops moving | Delivery scooter with a parcel rack | Teal + coral |
| 2 | **Momo** | Cat mechanic in overalls | Light | Deadpan, competent, oil smudge on cheek | Stripped-down buggy with exposed engine | Charcoal + yellow |
| 3 | **Nova** | Moth astronaut, helmet visor down | Light | Dreamy, drawn to the finish-line lights | Pod with a little thruster | Lavender + white |
| 4 | **Juniper** | Fox park ranger, hat and whistle | Medium | Cheerful rule-follower, secretly fierce | Wood-panel off-roader | Rust + forest green |
| 5 | **Otto** | Otter lifeguard with a rescue float | Medium | Laid-back, waves at everyone | Water-scooter kart with a rear float | Sky blue + red |
| 6 | **Sprocket** | Wind-up robot toy, key on its back | Medium | Literal, counts laps aloud | Tin-toy racer with a visible wind-up key that spins on boost | Cream + brass |
| 7 | **Boulder** | Round, friendly rock golem with moss | Heavy | Gentle giant, apologises after ramming | Stone monster-truck | Slate + moss green |
| 8 | **Big Gus** | Walrus chef, chef's hat, spatula | Heavy | Booming laugh, feeds rivals after races | Food-truck kart, awning flaps on turns | Tomato red + white |

Rig: one blobby body rig (root, spine, head, 2 arms) shared by all eight; heads and props swap. Idle: head turns into corners, body bobs, prop wobble (hat, key, float, awning). Racers may be AI-made 3D models (concept image, then image-to-3D via the Higgsfield connector), fitted to the kart footprint in `src/art-pipeline/glb.ts`; the code-built kart stays as the fallback. (Adam, 23 Sept 2026: the contest allows any tools; replaces the no-AI-mesh rule.)

Racers from parts (Adam, 25 Sept 2026: "the wheels don't even spin", "they don't turn their heads"): each racer is rebuilt as a skinned driver (a 24-bone humanoid), its kart body and one wheel used four times (public/models/racers/manifest.json), merged at load into one skinned mesh and seated by IK on the kart's own seat, grips and foot rests, so any driver can sit in any kart. The wheels roll and steer and bob on their springs, the steering wheel turns in the driver's hands, the head looks into turns and drifts, at a rival alongside and at the camera on the grid, over the line and on the podium, and the arms throw items, fly up on a hit and celebrate the placing (art-pipeline rigged.ts, kart-controller driverAnim.ts). Until a racer's parts land it keeps its fused model.

## 5. Vehicles
Any racer in any kart (Adam, 25 Sept 2026, option B: "like Mario Kart World"). Ten karts: each racer's signature kart (above) plus Classic and Buggy, unlockable twins (the same stats as the Wind-Up Racer and the Scrap Buggy, so an unlock changes the look, never the speed). Four stats show as bars on the racer and kart screens: Speed, Accel, Handling, Weight. The racer owns the class (§4); the chosen kart's stats take the place of the racer's own kart's, so a racer in their own kart handles exactly as their class, and another kart changes how you are fast, not how fast: each kart trades one stat for another of equal lap-time value (1% top speed ≈ 12% accel ≈ 11% handling on our tracks), in whole steps (0.005 speed, 0.06 accel, 0.06 handling, 0.05 weight), and every racer-and-kart pair stays inside a fair band, proven by a test on all six tracks with the Hard AI, the measure Adam approved for the classes on 24 Sept (game/combos.e2e.test.ts, 25 Sept 2026: every distinct combo within 4% of the track's median, worst 3.2%; every racer within 4% of themselves in their own kart on each track, worst 3.75%, and within 1.5% over the six tracks, worst 1.2%; no combo fastest on more than 2 tracks; no claw rescue in any of the 702 runs). No hidden stats: no terrain stats, no mini-turbo stat (drifting pays the same in every kart). AI racers drive their own karts. Weight only moves bumps.

| Kart | Owner | Speed | Accel | Handling | Weight | Character |
|---|---|---|---|---|---|---|
| Parcel Scooter | Pip | −0.005 | +0.06 | 0 | −0.05 | Zips off the line |
| Scrap Buggy | Momo | −0.010 | +0.06 | +0.06 | −0.05 | Nimble everywhere, low top speed |
| Comet Pod | Nova | −0.005 | 0 | +0.06 | −0.05 | Turns on a dime |
| Timber Wagon | Juniper | 0 | 0 | 0 | +0.05 | The all-rounder, hard to push |
| Wave Skimmer | Otto | 0 | +0.06 | −0.06 | 0 | Jumps off the line, wide in bends |
| Wind-Up Racer | Sprocket | +0.005 | 0 | −0.06 | 0 | Quick on straights, stiff in bends |
| Stone Stomper | Boulder | +0.005 | −0.06 | 0 | +0.05 | Heavy, slow to get going |
| Snack Truck | Big Gus | +0.010 | −0.06 | −0.06 | +0.05 | Top speed, turns like a truck |

These starting numbers passed the balance gate unchanged (25 Sept 2026) and are the final ones; kart.schema.json holds them. Exhaust colour = racer accent. Horn = racer sound (Pip chirp, Momo purr-rev, Nova chime, Juniper whistle, Otto squeaky float, Sprocket tick-tock, Boulder rumble, Gus foghorn).

## 6. Biomes and tracks (2 cups × 3 tracks, stretch to 4 each)
Lap target 45–60 s at 150cc-equivalent; width ≥ 4 karts at the start; one shortcut ≤ 2 s gain with risk; one verticality moment; one landmark visible from the start line.

**Side paths help, never hinder** (Adam, 21 Sept 2026). A shortcut taken cleanly must be at least as fast as the road it bypasses, for a Hard AI and therefore for a good player; the risk is in the taking (narrow, a jump, a hazard), not in the time. Gate: ai-driver test 16 forces a solo Hard AI onto each shortcut and compares its race to the main road.

### Sunrise Cup (teaches the game)
| Track | Biome | Palette (bg / accent) | Teaches | Hazards | Final Lap Shift |
|---|---|---|---|---|---|
| **Harbour Loop** | Seaside town, piers, lighthouse | Cream sand, sea blue / coral | Steering, boost pads, first drift (turn 1 is a wide 90° with the pad on the inside line) | Seagull flock (visual), rolling barrels off the pier | Tide comes in: the beach boardwalk floods; the pier ramp on the harbour side is the one jump left |
| **Meadow Run** | Rolling farmland, windmills, hay bales | Grass green, sky / sunflower yellow | Hairpin drifting, slipstream on a long straight | Runaway hay bales, mud patch off-road | Storm rolls in: rain darkens the sky, wet grass grip drops, lightning strikes a tree that falls across the shortcut |
| **Canyon Rush** | Red-rock desert, rope bridges, mine carts | Terracotta, dusty orange / turquoise | Jumps and tricks, risky shortcut through the mine | Mine carts crossing, falling rocks | The rope bridge collapses; the only route is the mine tunnel, now lit |

### Summit Cup (tests the game)
| Track | Biome | Palette | Tests | Hazards | Final Lap Shift |
|---|---|---|---|---|---|
| **Frostbite Pass** | Snowy mountain village, ice lake | White, pale blue / hot pink | Low-grip drifting, compound corners | Ice patches, snowballs rolling downhill | Blizzard: fog closes in, ice lake freezes solid and becomes a shortcut |
| **Boardwalk Nights** | Night-time seaside carnival, neon, Ferris wheel | Deep navy / neon magenta and cyan | Tight technical corners, item duels | Bumper cars crossing, spinning teacups | Fireworks finale: the Ferris wheel's spokes become a ramp; day-glow paths light up the racing line |
| **Skyline Circuit** (finale) | Cloud islands, airships, sky bridges | Peach dawn / gold | Everything, plus the one trick surface (a rail between islands) | Airship wake gusts, retracting bridges | Sunset to starlight: bridges retract, the rail becomes mandatory, the sky goes deep blue with the finish line glowing |

Stretch tracks if ahead of schedule: **Overgrown Temple** (jungle ruins, vines swing, water rises on the final lap) and **Foundry Sprint** (industrial, conveyor belts reverse on the final lap).

### Road edges (Adam, 23 Sept 2026: option 1, "themed edges")
Mario Kart keeps striped rumble curbs for race circuits, on their corners ([mariowiki: Circuit](https://www.mariowiki.com/Circuit)); a course set in a place has an edge that belongs to it. Ours: Harbor Loop a town sidewalk, striped only where the road bends; Skyline Circuit gold trim, striped only on its corners; Meadow Run a grass verge; Canyon Rush drifted sand, with weathered ranch posts; Frostbite Pass a snowbank, with wooden snow poles; Boardwalk Nights dark planks with a glowing neon line. (track-builder/mesh/scene.ts EDGES, road.ts `bend`.)

### Road edges and off-road (Adam, 23 Sept 2026: "Do what Mario Kart World does")
No stumps, no painted strips and no walls along the road. On Harbor Loop, Meadow Run, Canyon Rush and Frostbite Pass the land itself (grass, sand, snow) meets the curb; it is drivable, with the off-road top-speed cap (70 %, ignored while boosting or airborne), out to an invisible course limit 12 m past the curb, where the roadside scenery starts, so the scenery lines the course. Water and open cliffs end in the claw (Lakitu's job in Mario Kart). Boardwalk Nights (a pier) and Skyline Circuit (a sky road) have a solid low edge at the curb: a plank kickboard with a neon strip, a gold parapet. The AI releases a drift before it slides off the road.

### The mine (Canyon Rush, 23 Sept 2026)
The mine shortcut runs through a mesa across the canyon floor, not under the ground: a timber portal in a red-rock cliff face, a rock bore lit by lanterns on alternate walls with timber frames every 8 m, climbing inside the rock to come out on the high road. Rock walls hold the karts in; the sand beside the approach narrows to the mouth over the last 16 m. On the final lap the main road takes the same bore (the bridge is down). (track-builder tunnel.ts, mesh/tunnel.ts; the mesa is the land, terrain.ts.)

### Course creatures (Adam, 23 Sept 2026)
**Parked (Adam, 25 Sept 2026): off every track until they can move like real 3D characters.** The code stays, dormant (track-builder/creatures.ts; the six spots are kept in the test fixtures as CREATURE_SPOTS). What follows describes them for when they return.

Each track has one big original creature at a set spot: a hazard with a readable warning (a shadow, a rumble, a wind-up) that knocks or spins karts, or throws something that does. Skill beats luck: the warning always comes first, and the AI sees and dodges it like any hazard. Deterministic in the sim like every other hazard; animated in code.

| Track | Creature | Behaviour |
|---|---|---|
| Canyon Rush | **Rumblesaur**, a huge red-rock dinosaur | Walks across the road at the canyon floor; each footstep sends a shock ring that bumps karts; a foot spins you out |
| Frostbite Pass | **Yeti** on a ledge | Lobs big snowballs that land on the road (a shadow grows where each lands) and roll a short way |
| Boardwalk Nights | **Kraken** glowing in the sea | Slams one tentacle across the planks (its shadow and a splash warn first) |
| Harbor Loop | **Giant crab** | Scuttles sideways across the beach road, claws snapping |
| Meadow Run | **Giant goose** | Charges honking down one straight, then turns back |
| Skyline Circuit | **Sky whale** | Swims through the clouds beside the road; its tail slap sends a gust across it |
Built 23 Sept 2026 (track-builder/creatures.ts, one per track, `type: "creature"` hazards): each is an AI-made 3D model animated in code. Rumblesaur rears up, then stomps; a dust shock ring rolls over the road (hop to clear it). Yeti throws a snowball every 4.2 s: a shadow marks where it lands, then it rolls back at oncoming karts. Kraken raises a tentacle (its shadow line warns across the planks) and slams it across the whole road. Crab scuttles across and back, waiting off the road. Goose honks, charges back down the road at karts, then waddles back. Sky whale swims out, comes close with a song, and its tail slap blows a gust across the road. Each has its own ElevenLabs sound; stomps and slams shake the camera near the player.

### Track thrills (Adam, 23 Sept 2026: "do lots of research on how Mario Kart World adds exciting things to their tracks")
Research: `docs/research/track-thrills.md`. What we take from it, in our own form:
- **Open edges and the claw.** Some stretches have no wall (the Canyon mesa, the Frostbite ledge, the Skyline islands, the Boardwalk pier). Drive off and you fall; a claw on a cable drops, grabs the kart, carries it back over the road and sets it down well inside the lane (2.4 s). MK8 catches you at once and says a fall "loses a lot of time"; ours costs about the same and is fun to watch. *Built.*
- **Boost pads, 5 to 6 a lap.** A chain of 3 leads into each big ramp (Mario Kart Stadium has 3 panels into its last ramp). One sits on every shortcut. The rest sit on the outside line of straights, so the fast line is a choice. Chevrons scroll forward and glow, so a pad reads at speed and at night.
- **Real ramps.** A striped wedge across the road that you drive up, with a bright lip. Leave it and you fly; hop at the lip for a trick boost. *Built, with the pads and bumps below.*
- **Trick bumps.** Rows of humps across the road (dunes on Canyon Rush, moguls on Frostbite Pass, hay humps on Meadow Run). Each crest is a small jump: hop off it for a trick boost, then hop the next one (MKW tricks off bumps and waves and lets you chain them).
- **Launch vents.** Geysers on Canyon Rush and steam vents on Frostbite Pass. A vent glows and bubbles for 1 s, then erupts for 1.5 s; a kart over it is thrown high, and a trick up there is a boost (MKW's Dino Dino Jungle geysers). Timed, so skill beats luck. *Built:* two geysers taking turns on Canyon Rush (t 0.16), two steam vents on Frostbite Pass (t 0.94); about 4 m of air; the AI does not dodge them; their own ElevenLabs gurgle, blast and hiss.
- **The loop-the-loop.** On Boardwalk Nights the road runs through a neon coaster loop. Every kart rides up and round it at speed (a scripted ride, no steering) and comes out with a small boost. *Built:* candy-striped ring with neon rails on two gantries; the camera swings out to the side so you watch your kart go upside down; its own ElevenLabs whoosh.
- Skipped on purpose: gliding, wall riding, charge jumps and grind rails everywhere (first-principles: one trick surface at most; Skyline keeps its one rail), traffic, rewind.

### Final Lap Shift set pieces (25 Sept 2026: "make each track's Final Lap Shift a spectacular, readable moment")
The route, grip and shortcut changes are the sim's and land on the tick the leader starts the last lap, exactly as before; from that same tick each track plays its set piece, readable from the chase camera in 2 to 3 s, and keeps its end state (track-builder mesh/shiftStage.ts, beats in shiftShow.ts; visuals and the game's own sounds only, built at load, so input logs, results and leaderboard replays are unchanged). Everyone gets the banner, the shift's sting, a small FOV pulse and one shake (none with reduced motion).
- **Harbor Loop:** the tide rolls in off the bay over the beach road, foam at its front and edges and a wet sheen, the road still drawn under the water; the sea comes up 0.7 m round the course; a beacon (two chevrons and a pillar of light) marks the pier ramp, the one jump left.
- **Meadow Run:** storm cloud rolls over from upwind, rain; lightning (the stroke and its return, then a far strike every 5 to 8.5 s, thunder after it) strikes the giant oak by the hedgerow cut, which falls across the cut's mouth and stays there.
- **Canyon Rush:** the bridge over the chasm is a rope bridge (plank deck, rope rails, end posts); it breaks in the middle and its planks fall away plank by plank, dust rising from the floor; the mine's lanterns, embers until then, flicker on from its mouth inward and their light spills out of it.
- **Frostbite Pass:** light flurries all race thicken into a blizzard; the fog closes in (140/850 m to 26/230 m); the lake along the crossing (painted on the snow: open water and floes until then, clear of every course limit) freezes out from the crossing behind a bright front.
- **Boardwalk Nights:** two salvos of fireworks over the road ahead; the far finale's three points take turns on one 3.6 s beat; two Ferris-wheel spokes swing down onto the new ramp as it rises out of the planks; a day-glow racing line lights up lap-round from the start line.
- **Skyline Circuit:** the finish line lights gold; the old sky bridges retract from their middle; the rail lights up as the only road.
Flashes (lightning, fireworks) stay at three a second at most (WCAG 2.3.1). Reduced motion keeps every beat but cuts the falls and sweeps and flashes at a third. Mirror mode mirrors every piece.

### Spectators (review, 24 Sept 2026: "no life, spectators or micro-details" by the road)
Mario Kart World lines its roads with cheering crowds; ours are original townsfolk critters, G-rated, no human crowds and no look-alikes: Harbor Loop otters, gull-folk and crabs in sun hats; Meadow Run sheep, rabbits and farm mice in straw hats; Canyon Rush jackrabbits, lizards and prairie dogs in ranch hats and bandanas; Frostbite Pass penguins, blue arctic foxes and snow hares in beanies and scarves; Boardwalk Nights raccoons and cats in party hats waving glow sticks; Skyline Circuit crested sky birds and cloud sprites. A grandstand each side just past the start line, a bleacher or a group at the highlights (turn one, the jumps, the hairpin, the loop), rows of five or six behind rope lines about every 60 m round the lap and on the outside of the sharpest bends, villagers in twos and threes; always past the course limit and out of the camera's path, never on the road, no shadows. They bob, wave, pump and hop, turn to watch the pack and burst into a cheer as it passes (every stand at once when the Final Lap Shift comes). Visual only: no crowd sound (§11). (art-pipeline crowd.ts)

## 7. Handling (from research plan §4.1)
Hop 0.25 s → drift (lands loose, tightens over 0.35 s, slides outward first, like an MKW outside drift); charge +5/frame with the stick centred or into the drift, +3.5 pushed out of it (the whole stick steers the drift: out wide, a 350 m arc at top speed so a drift holds any sweeper, centred medium, in tight); tiers 165 / 400 / 700 (blue 0.55 s, orange 1.33 s, purple 2.33 s); drift boosts +30% for 0.8 / 1.5 / 2.4 s; trick +30% 0.7 s; pad +40% 1.0 s; speed item +40% 1.5 s; non-stacking, Trick > Item > Drift; slipstream 2 s → +12% 1.5 s; coins +0.66% each, cap 10; start boost: throttle down as the **2** appears (2.0 s before GO, ±0.5 s), like Mario Kart; too early or too late earns nothing, never a spin-out. Camera and juice per plan §4.7 and §7.2.

Drifting is the core skill, as in Mario Kart World (Adam, 24 Sept 2026: MKW-level drift reward): blue comes in almost every real corner, orange in the medium and long ones, purple on the long sweepers and hairpins, and a long sweeper chains mini-turbos. A near-perfect drifter beats a driver who never drifts by 4 to 8 s over 3 laps at 150cc on every track, and the Hard AI drifts every bend (2.4 to 7 s a race faster than without its drifts).

Surfaces cap top speed rather than cutting grip: dirt 0.7, mud 0.6, ice 0.9 plus real sliding. A live boost or being airborne ignores the cap, so hopping a mud patch is a real line.

## 8. Items (13; roles from plan §5, skinned to the world; Adam, 23 Sept 2026: "works like Mario Kart World")
How holding works (Mario Kart World feel):
- **Two slots.** Pop a balloon: the item roulette spins in the first empty slot (1.5 s of flicking item art with ticks, slowing, then a chime). A second balloon spins the second slot while you can still use the first. You always use the first slot; the second moves up. Both full: the balloon gives nothing.
- **Double balloons.** A gold pair of balloons fills both slots at once. One or two per track, in the middle of a balloon row.
- **Hold to trail.** Hold the item button with a Beach Ball, Oil Can, Decoy Balloon or Wind-Up Mouse: it trails behind your kart and blocks one projectile from behind (both pop). Let go to throw or drop it. A tap uses it at once. Look back while you let go throws a Ball or Mouse backward.
- **A big power stays in the slot.** While a Strike Ball rolls, it stays in the first slot and you cannot use the second. It leaves when the power ends.
- **Our own versions, never copies** (Adam, 23 Sept 2026): no giant-growth power, no literal rocket or bullet. Each power works in its own way and has its own look.

| # | Name | Role | What it does | Look |
|---|---|---|---|---|
| 1 | Beach Ball | forward | Fires ahead, bounces off the road edge 3 times, spins who it hits | Striped rubber ball |
| 2 | Homing Kite | homing | Chases the kart ahead | Paper kite with a visible string |
| 3 | Oil Can | rearDrop | Slick behind you: 50% speed 1 s | Tipped can, rainbow slick |
| 4 | Decoy Balloon | deception | Looks like a pickup balloon; pops you | A pickup balloon with a sneaky grin |
| 5 | Air Horn | defenceArea | Blast ring 6 m: clears items, spins karts | Big red horn, visible shockwave ring |
| 6 | Bubble | defenceHeld | Absorbs one hit for 8 s, +bump weight | Soap bubble around the kart |
| 7 | **Fizz Pop** | speed | One +40% boost for 1.5 s; blasts through grass and sand | Shaken soda bottle, cap pops, foam jet |
| 8 | **Triple Fizz** | speed | Three Fizz Pops; each also doubles drift charge for 2 s (sugar rush) | Three bottles orbit the kart (replaces Rocket Lolly) |
| 9 | Fog Bank | equaliser | Everyone ahead slows to 60% for 3 s and loses items; 5th place and back only | Rolling gray cloud with a warning icon for leaders |
| 10 | **Strike Ball** | ride | You become a giant bowling ball for 5 s: roll down the road on autopilot at 1.5 × top speed, items and hazards bounce off, karts you hit fly up and spin like pins; it ends in a STRIKE burst that spins karts near you | Glossy bowling ball in your racer's colors; pins and confetti on the burst |
| 11 | **Pogo Spring** | jump | Boing 4 m up: dodge anything, hop hazards, trick for a boost; press again in the air to slam down and send a shock ring | Chrome spring with a red pad |
| 12 | **Grapple Anchor** | tether | Hooks the kart ahead (up to 50 m), reels you in fast, then slingshots you past with a boost; they wobble | Brass anchor on a chain |
| 13 | **Wind-Up Mouse** | runner | Scurries ahead along the road, weaving, and bumps up to 3 karts into a spin | Tin clockwork mouse with a gold key |

Who gets what (MKW shape, weights per place in docs/sops/items.md): leaders get balls, oil, decoys, a Bubble, Fizz Pop and the Mouse; the middle gets the Kite, springs, anchors and Triple Fizz; the back gets the Strike Ball, Triple Fizz and the Fog Bank. The Strike Ball and Fog Bank cannot roll in the first 15 s or the last 8 s. v2 candidates: Swap Whistle, Ghost Cloak, Gravity Flip.
Pickups: floating **balloons** on strings that pop on touch. (Two slots: Adam, 22 Sept 2026.)

## 9. Modes (build order)
Quick Race → Grand Prix (2 cups, 50/100/150cc, stars) → **Knockout** (8 racers, 3 linked tracks, cut lines 6/4/2, item pool shrinks) → Time Trial (ghost + medals) → Daily Challenge (seeded) → stretch: Mirror, split-screen.

Course intro (Adam, 24 Sept 2026: as in Mario Kart World). Before every race's countdown the camera flies the course in four smooth moves, cutting between them: a high sweep toward the far landmark ahead of the start; a low glide along the track's signature stretch (Harbor Loop over the pier ramp as the barrels roll at the lens, Meadow Run down the long straight toward the giant oak by the hedgerow cut, Canyon Rush up to the mine mouth, Frostbite Pass up the road beside the lake, Boardwalk Nights the neon loop side on, Skyline Circuit along the rail); a truck past the grandstand's cheering townsfolk; and a crane down behind the player's kart that lands on the chase camera's own view as the countdown begins. 5.9 s in Quick Race, Grand Prix and Knockout (every race of a series), 2.5 s (the sweep and the crane) in Time Trial and the Daily, none on a restart. Any key, pad button or tap skips it (Escape still pauses). The hazards play on, but the sim waits at tick 0: input logs, results and leaderboard replays are what they were. Reduced motion: each move a still, cut in turn. Mirror mode flies it reflected (game/intro.ts).

Finish celebration and podium ceremony (Adam, 24 Sept 2026: as in Mario Kart World). Over the line the camera swings round to the front of the player's kart in slow motion and circles it while the racer reacts to the place: 1st a leap with a whole turn in the air and fist pumps, 2nd a hop with a twist and a big wave, 3rd two happy hops and a nodded yes, a safe Knockout place a phew and a look back at the ones behind, the middle of the field a friendly shrug, the back a sag and a head shake that ends chin up (G-rated, never mocking); confetti only for the joyful ones. After about 4 s the results slide in; Enter, pad A or a tap on the finish banner skips straight to them. After a Grand Prix's final standings and after a Knockout final comes the podium ceremony, on the grid behind the last track's start line under its own sky: the top three on stepped blocks in the biome's grandstand colors (neon at night), each in their own kart, paint and body and reacting, our own gold cup with a red balloon on its lid popping up behind the winner, confetti, fireworks over the stands and the townsfolk cheering, the camera craning down and sweeping slowly, the finish fanfare then the results song; the headline, the places and the player's stars over it, then Continue. Everyone sees it: a player off the podium sees their own place under it. Reduced motion: no slow-mo or swoops, one cut to the front shot; still shots cut in turn on the podium. Pictures only: the sim, input logs and leaderboard replays are unchanged (game/celebrate.ts, game/podium.ts).

## 10. Unlocks (deterministic, visible)
Skins: gold on every Sunrise track → Pip alt; win a Knockout → Boulder alt; 10 ultra turbos → Sprocket alt. Karts: Classic (finish a GP), Buggy (finish a Knockout); each is a twin of a kart you already have (§5). Mirror: gold on every track.

## 11. Audio
Music: 6 files (title, 5 race themes reused across 6 tracks with one shared for the cup finale variant, results) + final-lap lift. Sunrise Cup = brass/ska; Summit Cup = synth-brass/funk; finale = orchestral pop. Commercial rights only (plan §7.3). SFX per plan §7.4; every racer has a horn and a hit yelp.

## 12. UI
Fonts Lilita One + Fredoka. HUD: balloon slot top-left, big position bottom-left, minimap + lap bottom-right, timer top-centre. Title: attract-mode camera rail around Harbour Loop with Pip drifting by. Racer screen: 8 cards, each with the racer's own four stat bars, and a turntable. Then the Kart screen (§5): 10 cards; the stats panel shows the combined bars, with a ghost for the kart under focus (a gain extends the bar, a loss shows hatched, a chevron per step) and words for screen readers; the turntable shows your racer in that kart.

Course intro title card (24 Sept 2026): lower left, the track's name big in Lilita One on a ribbon in the track's accent, its cup on a chip above and the race under it (Race 1 of 3 · 150cc, Round 2 of 3 · Top 4 go through, Time Trial, Daily Challenge · Sep 25, Mirror); the player's racer in a chip lower right; "Press any key or button to skip" ("Press any button to skip" once a pad is in use, "Tap to skip" on touch). It sits on ink while the race's shaders compile, sweeps in, and leaves a beat before the countdown; the race HUD comes with the countdown.

Screen transitions (24 Sept 2026): every screen change is one quick move, 240 ms: the screen going slides off the way you are heading, leaning into the move like the intro's title card, and is all but gone before the screen coming slides in; back runs the other way; a dialog pops in and shrinks away; the results, standings, podium and menu follow on the same way, and a menu slides off into a race's title card. Keys, clicks, taps and the pad wait the move out (dropped, never queued). Reduced motion: a plain cut.

Time Trial medals (24 Sept 2026): our own badge, a stopwatch struck as a medal on coral and teal ribbon tails, in gold, silver or bronze, always named in words beside it: a sticker in the corner of a Time Trial track card (the best run's medal), by the results headline with the three medal times under the run (those the run reached in color), and under FINISH! in the race.

Racer screen (24 Sept 2026): down from any card goes straight to Paint, Body and the class row, which belong to the racer on show; left and right run through the eight cards; up comes back to the racer on show. A phone on its side sets the eight cards in one row.

Finish celebration (24 Sept 2026): the race HUD steps aside (FINISH! rises and shrinks under the timer; the item slots, map, speed and hints go; the place and time stay). Podium ceremony: no dim and no panel over it, the headline with the series and the player's stars at the top, the places as they stand (2nd, 1st, 3rd) and Continue along the bottom.

Driving aids (25 Sept 2026: as Mario Kart World's options make it drivable by a five-year-old). Settings leads with two, both Off by default: **Auto-accelerate** holds the gas from GO (never in the countdown, so the start boost is still earned with a press on the 2; the brake still brakes and reverses) and **Steering assist** nudges the kart back from the road's edge and away from drops (strong input toward an edge wins, except before a drop, where it also lifts the gas). They change the player's input before it is logged, so a run with them replays on the leaderboard as it was raced. The race strip says "Gas: automatic from GO"; a small wheel by the speed readout shows Steering assist is on and lights up while it steers. (src/game/assist.ts)

Fullscreen (25 Sept 2026): a Settings row and the F key on any screen; the browser holds it (not saved); no row where the browser has none.

Cup emblems (25 Sept 2026): each cup and Knockout set has its own emblem in the house style, on its card and on the course intro's cup chip: Sunrise Cup a rising sun, Summit Cup a snowy peak with a flag, Coastline Knockout a curling wave, Peaks Knockout twin peaks.

## 13. Definition of done (repeated from CLAUDE.md)
Live URL, 60 fps, a full Knockout playable end to end, leaderboard accepts a score, red-team clean.

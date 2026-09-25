# Design Bible — Kart Racer (working title)

Read this before any gameplay, art or content work. It is the source of truth for the world; the research plan ("Kart Racer - Research and Build Plan") is the source of truth for the *why*. Anything not here is not in the game.

## 1. One-line pitch
A bright cartoon kart racer where eight original racers drift, boost and trade blows across six vivid biomes, and every final lap the track fights back.

## 2. The twist ("Most Creative")
**Final Lap Shift.** On the last lap of every track the world changes in one readable way: a route opens or closes, the weather turns, the time of day flips, something big moves. Judges see it within two minutes of play. It is one system (a `finalLapShift` block per track) reused six ways, so it is cheap. Examples are in the track table.

## 3. Tone and art direction
- Tone: sunny, mischievous, generous. Nobody is a villain; rivals grin when they hit you.
- Art: saturated toon-diorama. `MeshToonMaterial` with a 3-step gradient, no outlines (Adam, 23 Sept 2026: Mario Kart World draws none), warm key light + cool fill, one accent colour per biome, painted gradient skies. Palettes per biome in §6.
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
| 4 | **Juniper** | Fox park ranger, hat and whistle | Medium | Cheerful rule-follower, secretly ruthless | Wood-panel jeep | Rust + forest green |
| 5 | **Otto** | Otter lifeguard with a rescue float | Medium | Laid-back, waves at everyone | Jet-ski kart with a rear float | Sky blue + red |
| 6 | **Sprocket** | Wind-up robot toy, key on its back | Medium | Literal, counts laps aloud | Tin-toy racer with a visible wind-up key that spins on boost | Cream + brass |
| 7 | **Boulder** | Round, friendly rock golem with moss | Heavy | Gentle giant, apologises after ramming | Stone monster-truck | Slate + moss green |
| 8 | **Big Gus** | Walrus chef, chef's hat, spatula | Heavy | Booming laugh, feeds rivals after races | Food-truck kart, awning flaps on turns | Tomato red + white |

Rig: one blobby body rig (root, spine, head, 2 arms) shared by all eight; heads and props swap. Idle: head turns into corners, body bobs, prop wobble (hat, key, float, awning). Racers may be AI-made 3D models (concept image, then image-to-3D via the Higgsfield connector), fitted to the kart footprint in `src/art-pipeline/glb.ts`; the code-built kart stays as the fallback. (Adam, 23 Sept 2026: the contest allows any tools; replaces the no-AI-mesh rule.)

## 5. Vehicles
Each racer has one signature kart (above) plus two shared body styles unlockable later (Classic, Buggy). Karts own the class; racers own the personality. Exhaust colour = racer accent. Horn = racer sound (Pip chirp, Momo purr-rev, Nova chime, Juniper whistle, Otto squeaky float, Sprocket tick-tock, Boulder rumble, Gus foghorn).

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

### Spectators (review, 24 Sept 2026: "no life, spectators or micro-details" by the road)
Mario Kart World lines its roads with cheering crowds; ours are original townsfolk critters, G-rated, no human crowds and no look-alikes: Harbor Loop otters, gull-folk and crabs in sun hats; Meadow Run sheep, rabbits and farm mice in straw hats; Canyon Rush jackrabbits, lizards and prairie dogs in ranch hats and bandanas; Frostbite Pass penguins, blue arctic foxes and snow hares in beanies and scarves; Boardwalk Nights raccoons and cats in party hats waving glow sticks; Skyline Circuit crested sky birds and cloud sprites. A grandstand each side just past the start line, a bleacher or a group at the highlights (turn one, the jumps, the hairpin, the loop, the creature's stretch), rows of five or six behind rope lines about every 60 m round the lap and on the outside of the sharpest bends, villagers in twos and threes; always past the course limit and out of the camera's path, never on the road, no shadows. They bob, wave, pump and hop, turn to watch the pack and burst into a cheer as it passes (every stand at once when the Final Lap Shift comes). Visual only: no crowd sound (§11). (art-pipeline crowd.ts)

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

## 10. Unlocks (deterministic, visible)
Skins: gold on every Sunrise track → Pip alt; win a Knockout → Boulder alt; 10 ultra turbos → Sprocket alt. Bodies: Classic (finish a GP), Buggy (finish a Knockout). Mirror: gold on every track.

## 11. Audio
Music: 6 files (title, 5 race themes reused across 6 tracks with one shared for the cup finale variant, results) + final-lap lift. Sunrise Cup = brass/ska; Summit Cup = synth-brass/funk; finale = orchestral pop. Commercial rights only (plan §7.3). SFX per plan §7.4; every racer has a horn and a hit yelp.

## 12. UI
Fonts Lilita One + Fredoka. HUD: balloon slot top-left, big position bottom-left, minimap + lap bottom-right, timer top-centre. Title: attract-mode camera rail around Harbour Loop with Pip drifting by. Roster screen: 8 cards, turntable, animated stat bars.

## 13. Definition of done (repeated from CLAUDE.md)
Live URL, 60 fps, a full Knockout playable end to end, leaderboard accepts a score, red-team clean.

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
Stats are multipliers on a shared base; totals are equal. Light: accel +12%, handling +12%, speed −8%, weight −15%. Medium: all 0, no hook. Heavy: speed +10%, weight +18%, accel −12%, handling −10%; weight decides kart-to-kart bumps, so heavy pushes harder and resists being pushed.

Coins are everyone's hit buffer, not a class perk: a hit with coins in hand costs 2 coins and a short slow, and the same hit at zero coins spins you out.

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

## 7. Handling (from research plan §4.1)
Hop 0.25 s → drift (lands loose, tightens over 0.25 s, slides outward first, like an MKW outside drift); charge +5/frame full stick, +2 neutral; tiers 250 / 550 / 850; drift boosts +30% for 0.6 / 1.5 / 2.5 s; trick +30% 0.7 s; pad +40% 1.0 s; speed item +40% 1.5 s; non-stacking, Trick > Item > Drift; slipstream 2 s → +12% 1.5 s; coins +0.66% each, cap 10; start boost: throttle down as the **2** appears (2.0 s before GO, ±0.5 s), like Mario Kart; too early or too late earns nothing, never a spin-out. Camera and juice per plan §4.7 and §7.2.

Surfaces cap top speed rather than cutting grip: dirt 0.7, mud 0.6, ice 0.9 plus real sliding. A live boost or being airborne ignores the cap, so hopping a mud patch is a real line.

## 8. Items (8 in v1; roles from plan §5, skinned to the world)
| # | Name | Role | Look |
|---|---|---|---|
| 1 | Beach Ball | Forward, bounces ×3 | Striped rubber ball |
| 2 | Homing Kite | Homing forward | Paper kite with a visible string |
| 3 | Oil Can | Rear drop | Tipped can, rainbow slick |
| 4 | Decoy Balloon | Rear deception | Looks like a pickup balloon, pops you |
| 5 | Air Horn | Radial defence / clears | Big red horn, visible shockwave ring |
| 6 | Bubble | Held shield, +bump weight | Soap bubble around the kart |
| 7 | Rocket Lolly | Triple speed charges; each doubles drift charge 2 s | Ice lolly with a fuse |
| 8 | Fog Bank | Global equaliser: everyone ahead slows to 60% 3 s, loses item; last-4 only | Rolling grey cloud with a warning icon for leaders |
v2 candidates: Grapple Anchor (tether), Swap Whistle, Ghost Cloak, Gravity Flip.
Pickups: floating **balloons** on strings that pop on touch; roulette on the HUD. **Two item slots** like Mario Kart World: the held item and the next one behind it. A balloon fills the first empty slot; you use the held item first and the next moves up; a Fog Bank strips both. (Adam, 22 Sept 2026; replaces the one-slot rule.)

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

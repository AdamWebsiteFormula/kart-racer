# Kart Racer — Research Findings and Build Plan

**For:** Adam / Website Formula · **Competition:** AI Automations with Jack, "Game Builder" September Comp · **Deadline:** 30 Sept 2026 (25 days from today, 5 Sept)
**Status:** Research complete. Awaiting Adam's decisions on theme and title (Section 3), then build starts.

Four research agents ran in parallel (tech stack, game design, art/audio/polish, IP and originality), plus a pass through Jack's course docs for the operating-system method. Every substantive claim below carries a source; anything unverified is flagged. Full source lists are in Section 11.

---

## 0. The candid read first

**"World class, feels like a store-bought game" is not the goal you can hit in 25 part-time days. "Feels finished" is, and that is what wins.** Judges open ~30 links and give most of them 90 seconds. A kart racer that loads fast, drives beautifully on one gorgeous track, and has a hook they see in the first 30 seconds beats a sprawling half-finished one every time. Mario Kart World itself was criticised most for the parts that sprawl (open-world intermissions, empty Free Roam) and praised most for one tight mode (Knockout Tour). Build the tight thing.

**What is realistic and still impressive:**
- 8 karts on screen at 60 fps, a drift/mini-turbo system that feels like Mario Kart's, 4 tracks (stretch: 6), 8 original items, AI opponents with rubber-banding, Knockout mode as the headline, a global leaderboard, original music, toon-shaded art that does not look like every other low-poly jam game.
- That is enough to compete for Best Game, Eye Candy, One More Go and Most Creative simultaneously. Every entry in that field will be 2D or a bare Three.js demo; a polished 3D kart racer with a real idea in it is a category of its own.

**The thing that will decide it is scope discipline.** The research agent found three open-source Three.js kart projects, two of them written by Claude, that already solve drift, AI, checkpoints and laps. You are not inventing the genre in 25 days; you are standing on those, then spending your time on the three things nobody else will: the original concept, the art direction, and the polish.

**Biggest risks, in order:** (1) art time for a multi-era theme, (2) physics rabbit-holes (avoid rigid-body vehicle physics entirely, see 4.2), (3) audio licensing (free AI-music tiers are non-commercial, see 7.3), (4) building modes before the core drive feels good.

---

## 1. The decision summary (what we are building)

| Decision | Recommendation | Why (short) |
|---|---|---|
| Engine | Vanilla **Three.js r0.185.1** + **TypeScript 7** + **Vite 8**, no React, WebGL2 renderer | Most training data for Claude Code; two of the best kart references were literally built by Claude in vanilla Three.js; smallest bundle; code-first, no editor |
| Physics | **Hand-rolled kinematic kart controller** (speed + yaw + lateral slip), ground via raycast against a BVH road mesh; no vehicle physics library | Mario Kart handling is a tuned state machine, not rigid-body physics. Every reference project that started with rigid-body wheels ripped it out |
| Track system | **Closed Catmull-Rom spline** drives everything: road mesh, checkpoints, AI racing line, positions, wrong-way, respawn, minimap | One data structure, all systems for free; each track is ~1 day |
| AI | Look-ahead (pure-pursuit) steering on the spline + personality offsets + rubber-banding + stuck recovery | Exists MIT-licensed in turbo-kart-rush; proven at 8 karts / 60 fps |
| Art | **Saturated toon-diorama**: Kenney/Quaternius CC0 low-poly base, MeshToonMaterial + 3-step gradient + inverted-hull outlines, warm/cool lighting, one accent colour per track | Flat low-poly is what every jam game ships; toon+outlines is rarely done well on the web and reads as intentional in screenshots |
| Post-FX | pmndrs `postprocessing` 6.39: bloom + vignette + chromatic aberration (on boost) + LUT per track, SMAA; N8AO on High only | All merge into one full-screen pass; only SSAO costs real ms |
| Audio | Raw Web Audio buses; engine = 2–3 looped samples crossfaded by RPM; final-lap tempo lift; low-pass on hit | Standard, cheap, and the "feel" difference judges notice |
| Music | Original tracks via **Suno Pro (paid month)** or self-hosted **Stable Audio 3.0** (open weights, commercial OK); fallback Kevin MacLeod CC-BY | Free AI-music tiers are non-commercial; prize money makes this grey; do not risk it |
| Headline mode | **Knockout** (8 racers, 4 linked segments, cut lines 6/4/2) | The single most praised feature of Mario Kart World across every review |
| Backend | **Supabase** free tier + one Edge Function for a global leaderboard + ghost data (insert-only, server-validated) | Judges competing with each other on a leaderboard is the "One More Go" prize by definition |
| Hosting | Static build → **Vercel** (Jack's Level 2 flow and your Aug-19 standard for new sites); Cloudflare Pages is an equivalent fallback | Trivial for a static Vite build; GitHub-connected previews per branch |
| Theme | **Epoch: every lap is a different era** (see Section 3 for the alternatives and the honest risk) | Highest "I didn't see that coming" score that is still cheap: same track spline, three material/prop sets |

---

## 2. What Mario Kart World actually does, and what to take from it

### 2.1 Facts (Switch 2, June 2025)
- 24 racers (up from 12); open interconnected world; Grand Prix cups where races 2–4 are point-to-point "intermissions" that end on a track; **Knockout Tour**: 8 rallies, 6 checkpoints each, cut lines 20th → 16th → 12th → 8th → 4th → finish; anyone below the line is eliminated instantly. Sources: [Super Mario Wiki](https://www.mariowiki.com/Mario_Kart_World), [NintendoSoup Knockout guide](https://nintendosoup.com/guide-how-to-win-in-mario-kart-worlds-knockout-tour/)
- Classes 50/100/150cc + Mirror; Time Trials with staff ghosts; Free Roam with collectibles and a 24-minute day/night cycle; a **Rewind** button in solo modes.
- New movement: **Charge Jump** (hold drift while straight, release to hop), **Rail Ride** (magnetise to rails, builds turbo), **Wall Ride** (charges mini-turbo faster than drifting). Developer rationale: "with too many bends you lose sight of your destination; driving straight roads isn't fun either", so tricks were invented to make straights interesting. [Ask the Developer transcript](https://miketendo64.com/2025/05/21/ask-the-developer-mario-kart-world-ns2/), [Kotaku](https://kotaku.com/mario-kart-world-rail-wall-charge-jump-ride-switch-2-1851784648)
- Items: 27, position-based distribution table (reverted from MK8's distance-based), strong items locked out for the first 20–30 s, item pool shrinks as racers are eliminated in Knockout. [NintendoSoup item analysis](https://nintendosoup.com/in-depth-analysis-reveals-how-mario-kart-worlds-item-system-works/)
- Wayfinding by landmarks, not arrows: "mushroom-shaped mountains so players' eyes naturally turn toward their destination."

### 2.2 Reception (Metascore 86, user score 7.0)
- **Praised:** Knockout Tour ("the best mode in the game", TechRadar; "what all of this feels like it was designed for", TheSixthAxis), the driving feel and skill ceiling from wall/rail tricks, 24-racer chaos off the line, set-piece tracks, the soundtrack.
- **Criticised:** intermission routes ("liminal, interstitial nothingness", GMTK), Free Roam "undercooked", item spam / luck, random unlocks, stickers as rewards. A July update forcing intermissions into online random play triggered review-bombing. Sources: [Metacritic](https://www.metacritic.com/game/mario-kart-world/), [TechRadar](https://www.techradar.com/gaming/nintendo/mario-kart-world-review), [GMTK digest](https://gmtk.substack.com/p/gmtk-digest-june-2025), [NME](https://www.nme.com/news/gaming-news/mario-kart-world-multiplayer-update-ruined-game-intermission-3873079)

### 2.3 What this means for our game
- **Take:** Knockout structure (survival cut lines, shrinking item pool), position-based item tables with a 15-second lockout, landmark wayfinding, a rewind button in solo (cheap: ring buffer of kart state), one trick surface (rail or wall) if time allows.
- **Leave:** open world, intermissions, 24 racers (8 gives the same bumping chaos at a fraction of the cost), sticker unlocks.

---

## 3. The original concept (needs your decision)

### 3.1 The IP boundary, in plain language (not legal advice)
- Copyright protects **expression**: character designs, specific models/textures, music, sound cues, UI art, specific track layouts. It does **not** protect mechanics or genre: kart racing, drifting for boost, item boxes as a concept, position-based items, 3 laps. [Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf), [ABA Landslide on game rules](https://www.americanbar.org/groups/intellectual_property_law/resources/landslide/archive/why-videogame-rules-are-not-expression-protected-copyright-law/)
- The cautionary case is **Tetris v. Xio (2012)**: mechanics were fine, but copying the *total look and feel* (board size, colours, shadow piece, animations) lost. "If one has to squint to find distinctions, the works are likely substantially similar." [Summary](https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.) Lesson: **do not be a reskin. Change the expression at every layer, not just names.**
- **Nintendo v. MariCar (Japan, 2018–2020)**: the go-kart rental company lost on *character costumes and confusing association*, not on the name. [Tokyo Weekender](https://www.tokyoweekender.com/japan-life/news-and-opinion/nintendo-wins-court-case-against-maricar-over-go-karts/)
- **Patents:** the Palworld suit (2024–26) is over specific creature-capture implementations; nothing asserted relates to kart racing. One published Nintendo *application* (US 2026/0249188, Aug 2026) covers regional weather zones used as a catch-up balancer; generic weather is fine, just don't build "weather zones auto-expand around the leader." [Techdirt on Palworld](https://www.techdirt.com/2026/07/02/the-nintendo-palworld-patent-suit-appears-to-be-heading-for-a-muted-conclusion/), [weather application report](https://www.4scarrsgaming.com/2026/09/nintendo-patent-regional-weather-mario-kart-world.html)
- **Enforcement reality:** every Nintendo DMCA on record names a specific Nintendo work being copied (fan games with Mario assets, Switch emulators). No original-IP kart racer (CTR, SuperTuxKart, KartRider, Smash Karts, Nightmare Kart) has been touched. A free competition entry with zero Nintendo assets is in the same position. [GitHub DMCA record](https://github.com/github/dmca/blob/master/2026/08/2026-08-17-nintendo.md), [Odin Law on fan games](https://odinlaw.com/blog-fan-games-legal-risks/)

**Hard rules for the repo:**
- No Nintendo words anywhere: title, package.json, GitHub topics, tags, screenshots, alt text. One factual "inspired by Mario Kart World" sentence in the README is fine (nominative use).
- Never use MK textures/models/sounds even as placeholders, even in git history.
- Avoid the specific "clone tells": red/white-spotted mushroom, "?" rainbow cube item box, blue winged spiky shell, turtle shells, Nintendo-style yellow banana with eyes, a Rainbow Road, MK typography/logo cadence ("Super ___ Kart"), any MK melody or the item-roulette / coin sounds.
- Keep a `CREDITS.md` with every asset licence.

### 3.2 Theme options (ranked by wow-factor vs build risk)

| Rank | Theme | Wow | Build risk (25 d) | One-line |
|---|---|---|---|---|
| 1 | **Epoch** — every lap is a different era | Very high | Medium | Lap 1 prehistoric, lap 2 industrial/medieval, lap 3 neon future; same corners, different surfaces, hazards and shortcuts; karts morph per era |
| 2 | **Ground Crew** — airport tarmac at night | High | Low | Baggage tugs, pushback tractors, follow-me cars; a plane lands across the track once per lap; conveyor belts as speed strips |
| 3 | **Seedfall** — plants racing to spread seeds | High | Medium | Dandelion/samara/coconut/burr classes; everything you drop *grows* next lap |
| 4 | **Front** — you are the weather | High | Medium–high | Thunderhead, twister, heatwave; drift trails paint the ground with your weather |
| 5 | **Night Shift** — museum exhibits after closing | Med–high | Low | T-rex skeleton on casters, Apollo lander, chariot; security-guard flashlight freezes you |
| 6 | **Sequencer** — racing inside a music tracker | High | High | The race plays the song; on-beat gates boost. Too risky for 25 days |
| 7 | **Bloodstream** | Medium | Low–med | Familiar (Osmosis Jones); backup only |
| 8 | **Curbside** — lawn ornaments | Medium | Low | Safe comedy, least surprising |

Themes already saturated in the genre (avoid): mascot animals, food, toys/LEGO, space/neon/anti-grav, underwater, gothic/horror (Nightmare Kart), cards/decks (Kart Draft, Kartomancy), battle royale (Stampede, dead), time-ghosts (Chrono Kart).

### 3.3 Recommended: EPOCH (working title "Epoch Drift" or "Lap of Ages")
- **World:** one landscape, three eras. A river in lap 1 is a bridge in lap 2 and a hover-strip in lap 3. Same racing line so the track is learnable; surfaces, hazards, music and shortcuts change.
- **Karts morph per era** (swap child meshes, huge visual payoff): Log-roller → Wooden cart → Hover-pod; Stone-wheel bike → Penny-farthing → Monowheel; Dino-sled → Steam trike → Plasma sled; Mammoth chariot → Coal cart → Drone rig.
- **Items** (one slot, art swaps per era; roles from Section 5): Thrown rock → Cannonball → Plasma bolt (forward); Pterodactyl → Falcon → Seeker drone (homing); Tar puddle → Oil slick → EMP mine (rear drop); Bone shield → Buckler → Energy bubble (defence); Fire discovery → Steam vent → Overclock (speed); Meteor shower → Pigeons → Solar flare (area chaos); **Time Skip** (last place advances the era for everyone mid-lap, leaders on the old route get dumped into rubble) as the equaliser; Fossilise (freeze one racer in amber/ice/stasis).
- **Signature mechanic:** era-locked shortcuts. Some routes exist in only one era, so racing the same lap three ways is the skill ceiling. Item pickup is an **hourglass** that spins through era icons (a timing grab, not a static box, which is a free "we are not a clone" signal).
- **Tracks and difficulty progression:** Valley (wide, gentle, teaches the era shift) → Riverbend (river/bridge/hover crossing) → Cliffside (rockslide → tunnel → open bridge) → Capital (huts → skyline; era-locked shortcuts) → stretch: Collapse (eras cycle every 20 s).
- **The honest risk:** three art variants per surface. Mitigation: one geometry, palette/material swaps, LUT and sky swap per era, and only 3–5 hero props per era. If by day 10 the era swap isn't reading clearly, fall back to **Ground Crew**, which needs no morphing.

### 3.4 Title candidates (exact-title web/Steam/itch search found no conflicts; USPTO not queried, so "no obvious game conflict" not "trademark-clear")
Epoch Drift · Lap of Ages · Ground Crew GP · Tarmac Tuggers · Night Shift GP · Curbside Cup. Avoid "Super ___ Kart" and "___ Kart World".

---

## 4. How the game works (design spec)

### 4.1 Handling feel: the numbers
Mario Kart's drift was born from accessibility: realistic counter-steer drifting failed in playtests, so they made it "hold a button." [Game Developer](https://www.gamedeveloper.com/design/the-design-origins-of-drifting-in-i-mario-kart-i-) The model to copy is a tuned state machine.

Starting values (as ratios of base top speed V; MK8DX/MK Wii figures used as proxies since no MKW datamine exists):
- **Hop** 0.25 s airborne → drift locks direction; drift steer multiplier 0.35–0.8× depending on stick; outward drift only (MKW dropped inward).
- **Charge:** +5/frame at full stick, +2/frame neutral; tiers at 250 / 550 / 850 (≈0.85 s / 1.8 s / 2.8 s at 60 fps). Sparks blue → orange → rainbow, rising pitch. [Vike's drifting guide](https://vikemk.com/drifting-guide), [Mini-Turbo](https://www.mariowiki.com/Mini-Turbo)
- **Boost:** +20% V for 0.6 / 1.5 / 2.5 s. Trick off ramp +30% for 0.7 s; boost pad +30% for 1.0 s; speed item +40% for 1.5 s. **Non-stacking**, priority Trick > Item > Drift (exactly MK Wii). [MKWii boost data](https://wiki.mkwtas.com/wiki/Boost_information)
- **Slipstream:** 2 s in a cone 8 units long → +12% V for 1.5 s. **Coins/pickups:** +0.66% per coin, cap 10.
- **Start boost:** 0.3 s window on the "2" beat.
- Optional later: wall-ride surfaces charging at 2× drift rate.
- Open-source tunables to crib from: SuperTuxKart `kart_characteristics.xml` (max speed 25 m/s, turn radius 2 m → 30 m over speed, skid bonus tiers, zipper values). [stk-code](https://github.com/supertuxkart/stk-code/blob/master/data/kart_characteristics.xml)

### 4.2 Physics approach (this is the decision that saves the project)
Kinematic, not rigid-body. "Physics-based implementations tend to add way too much complexity"; compute the kart's position each frame for a 100%-traction feel and fake the rest visually. [Game Developer on racing implementations](https://www.gamedeveloper.com/design/implementing-racing-games-an-intro-to-different-approaches-and-their-game-design-trade-offs) Mario-Kart-3.js (4.6k stars) started on Rapier and switched to a custom capsule-vs-BVH collider. ~300 lines of surface area, fully deterministic (which makes ghosts and leaderboard verification possible).

### 4.3 Track building
- Closed `CatmullRomCurve3` centerline, arc-length lookup table (position, tangent, normal, road half-width per sample) → sweep a cross-section along it for road/kerbs/barriers; scatter decor via `InstancedMesh`.
- **Progress:** each kart tracks `nearestT`; `distanceAlong = lap × length + t × length` gives race order for free.
- **Checkpoints:** N ordered fractions of t; lap counts only when all hit in order and the start plane crossed. **Wrong way:** dot(velocity, tangent) < 0 for > 1.2 s. **Respawn:** below `VOID_Y` or stuck → last checkpoint, aligned to tangent, 0.6 s freeze.
- Track design rules: lanes ~1.6 car widths, wide at the start, alternate hard and easy sections, shortcuts save ≤2 s with real risk, one verticality moment, one "needle" set piece, a landmark visible from the start line, lap 45–60 s → 3 laps ≈ 2–2.5 min. [Game Developer track design](https://www.gamedeveloper.com/design/a-rational-approach-to-racing-game-track-design), [SuperTuxKart track fundamentals](https://supertuxkart.net/Making_Tracks:_Gameplay_Fundamentals), [MK8DX WR lengths](https://mkwrs.com/mk8dx/)
- **How many tracks feel "complete":** Garfield Kart ships 16 for a paid product (89% positive); for a free browser game, **8 in 2 cups is the ceiling, 4 is the floor**, and Knockout recombines them so they feel like more.

### 4.4 AI opponents
Pure pursuit: target = spline point at `t + L`, `L = clamp(speed × 0.9, 8, 30)`; lateral target = personality offset + inside-corner bias; drift when upcoming tangent change exceeds a threshold. Difficulty profiles (throttle cap, steering noise, start-timing error, drift usage). Rubber-banding scales AI speed by distance to the player with a dead zone, multipliers ~0.6–1.4, adjusting "skill" before "power" and *communicated* so it feels intentional. [Game AI Pro ch. 42](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter42_A_Rubber-Banding_System_for_Gameplay_and_Race_Management.pdf), [Rubber-banding as design requirement](https://www.gamedeveloper.com/design/rubber-banding-as-a-design-requirement)

### 4.5 Vehicles
3 archetypes as ±10–15% multipliers on a shared base with equal stat totals: **Light** (+accel/+handling, drift-charges 20% faster), **Medium** (keeps coins on hit), **Heavy** (+speed/+weight, bumps harder). 2 skins each = 6 characters. Below a 10% spread players can't feel the difference. (Disney Speedstorm and Sonic CrossWorlds both use 4–5 classes for the same reason.) [Speedstorm dev diary](https://disneyspeedstorm.com/news/disney-speedstorm-dev-diary-racer-classes)

### 4.6 Controls and ease of play
- Keyboard: Arrows/WASD, **Shift or Space = drift/hop**, Ctrl/E = item, Q = look back, R = rewind (solo). Gamepad: standard mapping (LS steer, A/RT gas, RB hold = drift, LB/X item, Y look back). Touch: virtual joystick + drift/item buttons, auto-accelerate. Remappable via JSON in localStorage.
- **Auto-accelerate ON by default** in the browser (Kirby Air Riders proves one-button racing is "elegant with surprising depth"). Smart-steer edge-pull for the first race only, fading after 3 completed drifts, always capped at tier-2 turbo so it is never the meta. [NPR on Kirby Air Riders](https://www.npr.org/2025/11/19/nx-s1-5611480/kirby-air-riders-racing-game-review), [MKW Smart Steering](https://kotaku.com/mario-kart-world-smart-steering-auto-acceleration-work-1851784842)
- **Teach drift without a tutorial:** track 1's first corner is a wide 90° with a boost pad reachable only on the inside line; a "coach" AI drifts visibly ahead; one 2-second toast "Hold SHIFT in a turn" on the first corner, never again. Track 1 finishable without drifting; beating AI tier 1 requires it once.

### 4.7 Camera
Chase: pivot 1.2 m above kart, camera 5.5 m back / 2.2 m up, look-at 6 m ahead; position lerp 8/s, rotation lerp 5/s so drifts show kart angle. FOV 60° → 72° on boost (in 0.15 s, out 0.6 s), +3° per 10% over base speed, ±3° roll in drifts. Look-back snaps to a rear cam at 4 m. On hit: 0.25 s shake, FOV −5°. Sphere-cast to keep the camera out of walls. (Designer defaults; Criterion's GDC "Vehicle Feel Masterclass" calls camera "often overlooked but crucial to feel.") [Sense of speed toolkit](https://elliotdev.gg/adding-the-feeling-of-speed/)

### 4.8 Modes (in build order)
1. **Quick Race** (day 1 playable)
2. **Grand Prix**: 2 cups × 4 tracks, 50/100/150cc, stars per cup
3. **Knockout** (headline): 8 racers, 4 linked segments, cut lines 6/4/2, elimination banner + camera flourish, final-duel music sting; item pool shrinks as racers drop
4. **Time Trial** with personal-best ghost (serialise position/rotation at 20 Hz to localStorage, ~5 KB/track) + bronze/silver/gold/author medals
5. **Daily Challenge**: deterministic seed from the date picks track + class + ruleset; one leaderboard per day
6. Stretch: Mirror; 2P split-screen (two cameras + scissor; feasible, 2× draw calls)

### 4.9 Replay value (the "One More Go" prize)
Global leaderboard with names (Supabase), daily seed that resets at midnight (Trackmania's Track of the Day pattern), personal ghosts, deterministic visible unlocks (6 skins, 3 kart bodies, 2 horns, mirror; unlocked by concrete goals, never random). MKW was dinged precisely for random unlocks and no reward for beating ghosts. [Trackmania TOTD](https://doc.trackmania.com/play/what-is-totd/), [PolyTrack (browser precedent)](https://www.crazygames.com/game/polytrack)

---

## 5. Items (original, re-skinnable by theme)

Principles: position-weighted tables (MK Wii/MKW shape), roles = forward attack / homing / rear drop / defence / speed / area chaos / equaliser; prefer "speed up losers" over "stop the leader"; give the leader one readable defensive tool; show the leader a warning icon for any global item. 8–10 items max, one held slot. Cautionary: Sonic CrossWorlds was dinged for item imbalance encouraging sandbagging; MKW users complain of item spam. [MK Wii item tables](https://www.mariowiki.com/Mario_Kart_Wii_item_probability_distributions), [Yabuki on the blue shell](https://www.gamedeveloper.com/design/-sometimes-life-isn-t-fair-i-mario-kart-i-director-defends-blue-shell-game-design), [Designing comeback mechanics](https://blogofarcanesecrets.wordpress.com/2018/02/12/the-underdog-story-designing-comeback-mechanics/)

| # | Role | Generic design | Counter |
|---|---|---|---|
| 1 | Forward, unguided | **Ricochet Puck**: fast disc, bounces off walls ×3, can fire backward | Dodge or absorb (#7) |
| 2 | Forward, homing | **Tracer Dart**: locks on next racer ahead, slow arc, visible beam, one in flight per racer | Drop #4/#5 behind you, or #7 |
| 3 | Forward + self-speed | **Grapple Tether**: reels you toward the racer ahead (+35% V, 1.5 s) then yanks them back 10%; needs line of sight | Break line of sight |
| 4 | Rear drop / area denial | **Oil Slick / Glue Patch**: forced 90° slide or half speed for 1 s; lasts 20 s | Avoid; #6 clears |
| 5 | Rear drop / deception | **Decoy Crate**: looks like a pickup, spins out whoever touches it | Track memory |
| 6 | Defence / area clear | **Shockwave**: radial pulse destroys projectiles, spins out adjacent racers, clears #4 | Distance |
| 7 | Defence, held | **Bubble Shield**: absorbs one hit; +50% bump weight while held; pops after 8 s | Two hits |
| 8 | Speed | **Overdrive Cell**: 3 charges; each also doubles drift-charge rate for 2 s (teaches drifting) | — |
| 9 | Equaliser (leader-focused) | **Gravity Flip**: top 3 get inverted steering 2.5 s with clear warning UI. Milder than a blue shell | Drive straight / brake |
| 10 | Equaliser, global | **Slow Field**: everyone ahead drops to 60% V for 3 s and loses their held item; last-4 only | Timing |
| 11 | Chaos | **Swap Beacon**: swap positions with a random racer 3–6 places ahead after a 2 s telegraph | Hit them in the window |
| 12 | Defence + steal | **Ghost Cloak**: 4 s intangible; passing through a racer steals their item | Hold items |

Table shape (8 racers, rough weights): P1–2: #4 40 / #5 25 / #1 25 / #7 10 · P3–4: #1 30 / #2 25 / #4 15 / #7 15 / #8 15 · P5–6: #2 25 / #8 30 / #3 20 / #6 15 / #12 10 · P7–8: #8 40 / #10 20 / #9 20 / #11 10 / #3 10. Lock #9/#10/#11 for the first 15 s and the final 8 s of the last lap.

---

## 6. Tech stack in detail

### 6.1 Engine and why not the alternatives
- Vanilla Three.js: ~155 KB gzipped core; the best references (mrdoob's `Starter-Kit-Racing`, `turbo-kart-rush`) were written by Claude in vanilla Three.js and one ships a `CLAUDE.md`. [Starter-Kit-Racing](https://github.com/mrdoob/Starter-Kit-Racing), [turbo-kart-rush](https://github.com/bridge-mind/turbo-kart-rush)
- Not React Three Fiber: adds React overhead, the game loop ends up in `useFrame` closures with refs everywhere; the pro-R3F article itself recommends vanilla for games needing tight loop control. [creativedevjobs](https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs)
- Not Babylon/PlayCanvas (editor-first, 70–85 MB packages), not Godot web (6 MB wasm before content, COOP/COEP header requirements, scene-file-centric), not Unity WebGL (heavy runtime, slow start). [2026 engine comparison](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison), [Godot 4.3 web export](https://godotengine.org/article/progress-report-web-export-in-4-3/)
- WebGL2 now; WebGPU is production-ready in three.js but only pays off in draw-call-heavy scenes, and pmndrs `postprocessing` is WebGL-only. Keep renderer-agnostic code.
- Versions verified against npm today: three 0.185.1, vite 8.2.2, typescript 7.0.2, postprocessing 6.39.4 (peer three ≥0.168 <0.186), three-mesh-bvh 0.9.14, n8ao 2.0.1, @supabase/supabase-js 2.115.0.

### 6.2 Reference codebases (all MIT; read them, don't copy their architecture blindly)
| Repo | Use it for |
|---|---|
| [bridge-mind/turbo-kart-rush](https://github.com/bridge-mind/turbo-kart-rush) (Three.js 0.185 + TS + Vite 8, built by Claude sub-agents, 18.7k lines) | **Primary template**: spline `Centerline.ts`, `Kart.ts` constants (drift stage thresholds [1.0, 2.0, 3.2], slip max 0.49 rad, grip road 8 / offroad 4), `AIDriver.ts`, `RaceManager.ts`, `ItemManager.ts`, minimap, HUD, 10 items, 4 procedural tracks. Only 6 stars and 5 days old, so evaluate code quality before leaning on it |
| [Lunakepio/Mario-Kart-3.js](https://github.com/Lunakepio/Mario-Kart-3.js) (4.6k stars) | The **drift feel and VFX bar** (sparks, flames, skid smoke); capsule-vs-BVH collision. Study, don't adopt its R3F architecture |
| [mrdoob/Starter-Kit-Racing](https://github.com/mrdoob/Starter-Kit-Racing) (Mar 2026, 3.2k lines) | The "how little code it takes" bar; Kenney tile track + editor; synthesised engine audio via AudioWorklet; ships a `CLAUDE.md` |
| [pmndrs/racing-game](https://github.com/pmndrs/racing-game) | Ghost replay + leaderboard UX only |
| [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) | The polish/quality bar |

### 6.3 Assets
- **Kenney Car Kit v3** (CC0; explicitly "added kart racers"), **Kenney Racing Kit** (110 files), **Kenney Mini Characters**, Quaternius Cars + Nature (CC0), Poly Pizza GLB bundles. [Car Kit](https://kenney.nl/assets/car-kit), [Racing Kit](https://kenney.nl/assets/racing-kit), [Quaternius](https://quaternius.com/packs/cars.html)
- Pipeline: `gltf-transform optimize in.glb out.glb --texture-compress webp` (meshopt is the right default for low-poly; Draco needs a 300 KB WASM decoder). Keep one shared palette texture → one material → merged static meshes → one draw call per track chunk. [gltf-transform](https://gltf-transform.dev/)
- AI 3D generation (Meshy 7, Tripo, Hunyuan3D, TRELLIS) is viable for **hero props only**; outputs need retopo and style-match badly. Not a replacement for a coherent kit in 25 days. Meshy free tier outputs are CC-BY (credit required); Tripo free is non-commercial. [Cinevva AI-3D guide](https://app.cinevva.com/guides/ai-3d-model-generators)
- **Characters:** "karts are the characters." 6–8 karts with strong silhouettes, 2-tone liveries, unique horn, idle animation, exhaust colour; optional blobby drivers (sphere head + goggles, 2–3 bones). No Mixamo dependency. Judges score cohesion, not headcount.

### 6.4 Performance budget (60 fps on a mid laptop)
<100 draw calls/frame; ≤3 lights, one 1024–2048 shadow map with a tight ortho frustum following the player; bake AO into vertex colours; `InstancedMesh` for props, `BatchedMesh` for heterogeneous statics; DPR capped at 2 (1.5 mobile); fixed-timestep accumulator with render interpolation and a max-steps clamp; pause on `visibilitychange`; `renderer.compileAsync` warm-up before revealing. [utsubo 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)

### 6.5 Deployment
- `npm create vite@latest <name> -- --template vanilla-ts` → `npm run build` → `dist/`.
- **Vercel** (Jack's Level 2 flow): connect the GitHub repo, build `npm run build`, output `dist`; every branch gets a preview URL. Cloudflare Pages equivalent: `wrangler pages deploy dist` (25 MiB per-file cap; keep every `.glb`/`.mp3` under it; `_headers` with immutable caching on fingerprinted assets). [Vite static deploy](https://vite.dev/guide/static-deploy), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/index.md)

### 6.6 Leaderboard backend (Supabase, already connected to your Claude)
- Table `scores(id, name ≤16 chars, track_id, time_ms, ghost jsonb, created_at, ip_hash)`; RLS on; `select` open; **no anon insert**. Inserts go through one Edge Function holding the service-role key that validates (time ≥ physical minimum per track, ghost length consistent with time, profanity filter), rate-limits per IP, optionally verifies a Cloudflare Turnstile token. Never ship the service-role key client-side (CVE-2025-48757 was exactly open-RLS tables). [Supabase rate limiting](https://supabase.com/docs/guides/functions/examples/rate-limiting), [Supabase security](https://vibeappscanner.com/supabase-security)
- Free tier auto-pauses after 7 days idle: add a scheduled ping.
- Real anti-cheat, if time allows: store the **input log** as the ghost and re-simulate it headlessly in the Edge Function (your sim is pure deterministic TS, so this is cheap).

---

## 7. Eye candy: art, audio, UI, polish

### 7.1 Art direction: "saturated toon-diorama"
`MeshToonMaterial` + 3–4 step gradient map (NearestFilter) + rim light + **inverted-hull outlines** (duplicate mesh, `BackSide`, scale 1.02–1.04, black unlit; works with instancing). One warm directional + cool hemisphere; 5-colour palette per track with one accent; pastel-saturated (Crossy Road brightness, Tunic hue shifts). Photo HDRIs (Poly Haven, CC0) for IBL only, with a painted gradient sky sphere so the toon look isn't broken. [MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html), [toon shader tutorial](https://www.maya-ndljk.com/blog/threejs-basic-toon-shader), [Poly Haven licence](https://polyhaven.com/license)

Content multiplier: **time-of-day/weather variants** of the same track (sun angle, sky gradient, LUT, fog, emissive lamps at night) ≈ 3 "screens" of eye candy for a day of work. MKW reviewers said night lighting is where it "looks its best." For Epoch, the era swap *is* this multiplier.

### 7.2 Juice checklist (each ~half a day or less)
1. Drift sparks, 3 tiers (blue 0.8 s → orange 1.6 s → rainbow 2.4 s), ascending SFX per tier, rumble tick
2. Boost release: exhaust flame, bloom, FOV 60→75 over 120 ms then ease back 600 ms, chromatic aberration 0→0.004, speed lines, engine pitch +20%
3. Trauma-based screen shake (shake = trauma²) with **rotation of a fraction of a degree** or it reads as a glitch; hits 0.5, landing 0.2, boost 0.15
4. Spring-damped camera lag; yaw into drift; roll on steer
5. Tire-mark ribbon mesh appended while drifting, fades over 10 s
6. Dust puffs off-road (colour-matched), idle exhaust
7. Hit reaction: 60–90 ms hit-stop, squash-stretch 1.2/0.8 over 150 ms, white flash, 360° spin 0.8 s, dizzy stars, music low-pass, rumble
8. Item pickup: box pop + shards + chime; HUD roulette with slot-machine easing
9. Position-change flourish on the HUD number (flip + chime)
10. "FINAL LAP" banner with overshoot; music variant kicks in
11. Finish: confetti (instanced quads), 0.3× slow-mo for 1 s, camera orbit
12. Idle life: driver looks into corners, kart bobs, antenna wobble
Sources: [Juice It or Lose It](https://youtu.be/Fy0aCDmgnxg), [Art of Screenshake](https://youtu.be/AJdEqssNZ-U), [Game feel on the web](https://valdemird.com/blog/game-feel-on-the-web/)

### 7.3 Music (licensing matters here)
- Kart music spec: 140–170 BPM, major keys, brass/synth-brass leads, funk bass, 90–120 s seamless loops. MKW's OST runs 128–174 BPM with final-lap variants at +10% (174 → 192). [MKW soundtrack](https://www.mariowiki.com/PipeProject:Music/Drafts/Mario_Kart_World_soundtrack)
- Minimum viable: 6 files (title, 4 race themes, results) + final-lap variants via `playbackRate` 1.0 → 1.08 (pitch rises too, which is the classic MK feel).
- **Licensing, Sept 2026:** Suno free/Basic = personal non-commercial only; Pro/Premier assigns you the rights (ToS effective 3 Sept 2026). Udio downloads are disabled entirely. Stable Audio 3.0 open weights = you own outputs, commercial OK. ElevenLabs Music free = non-commercial. Higgsfield says commercial OK on all tiers but audio-specific terms unverified. Prize money makes a "free" game commercial-adjacent; **buy one month of Suno Pro or self-host Stable Audio 3.0**, keep receipts, fallback Kevin MacLeod CC-BY with the exact credit line. Put a credits screen in-game. [Suno ToS](https://suno.com/terms-of-service), [Stable Audio 3.0](https://the-decoder.com/stability-ai-launches-stable-audio-3-0-with-up-to-six-minute-tracks-and-open-weights/), [Incompetech FAQ](https://incompetech.com/music/royalty-free/faq.html)

### 7.4 Sound effects
Engine = 2–3 looped samples (idle/mid/high) with `playbackRate = rpm/sampleRpm` and equal-power crossfade by RPM band (Google's Racer case study). Drift screech gain by lateral slip; UI blips with ±3% random pitch (jsfxr is perfect for the toon style). Sources: Kenney audio (CC0), Sonniss GDC bundles (royalty-free), freesound filtered to CC0, jsfxr. ElevenLabs SFX only on a paid plan. Web Audio: one context, `resume()` on first gesture, master → music/sfx `GainNode` buses → compressor, `BiquadFilter` in the music bus for the hit duck, `PositionalAudio` for the nearest 4 opponents, suspend on tab hidden. [web.dev Racer sound](https://web.dev/racer-sound), [Sonniss GDC](https://gdc.sonniss.com/), [Safari audio unlock](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)

### 7.5 UI/HUD
HTML/CSS overlay over the canvas (crisp at any DPR, easy to iterate). Layout: item slot top-left, big position number bottom-left, minimap + lap bottom-right, timer top-centre. Fonts (Google, OFL, self-hosted): **Lilita One** (display) + **Fredoka** (UI), 3–4 px dark stroke for legibility. Spring easing `cubic-bezier(0.34,1.56,0.64,1)`, hover blips, 200–350 ms wipes, animated 3D attract-mode behind the title, vehicle-select turntable with animated stat bars, results with staggered row reveal and counting points. Keep the roster to 6–8 (MKW's costume-bloated select screen was called "objectively a total mess"). [Game UI Database MKW](https://www.gameuidatabase.com/gameData.php?id=2104)

### 7.6 First impression and settings
Loading screen in the game's own fonts/palette with a real progress bar (`LoadingManager`), shader warm-up, then wipe to attract-mode title (camera on a rail, a kart drifts by with sparks, logo drops with overshoot, "Press Enter"). Low/High presets + auto DPR scaling (step DPR down 0.1 until ≥55 fps).

### 7.7 Accessibility checklist judges notice
Pause (also on tab hidden) · remappable keys/gamepad · item icons distinct by **shape + Okabe-Ito colour** · Master/Music/SFX sliders (MKW was criticised for lacking these) · reduced-motion toggle · resolution scale · gamepad rumble via `vibrationActuator.playEffect` (Chrome/Edge/Safari 16.4+, not Firefox) · full keyboard/gamepad menu navigation · credits screen. [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/basic/)

---

## 8. Building it Jack's way (the operating system for the whole process)

You asked for Jack's approach across the entire process, research through build, for every part. Here is the mapping. Everything below is from the course docs (Level 1, 3, 4, 6, 7, 8, 9 and the Claude Code OS guide).

### 8.1 First principles before anything (Level 7, Playbook A)
Run the five steps in order on the feature list: question every requirement (a named owner, not "judges expect"), **delete** (you should have to add ~10% back), simplify, accelerate the loop, automate last. Then "reduce until the question is naked":

> *Given:* Three.js, 25 part-time days, CC0 kits, 3 proven reference repos. *Aim:* a browser kart racer judges keep playing after judging. *Constraints:* no Nintendo IP, runs at 60 fps on a laptop, playable from a link.

That sentence is boring. Good. That is what Claude executes well.

### 8.2 The two CLAUDE.md files (Level 1)
- **Type A, operating manual** lives in your bucket folder (this belongs under **Adam_AI_Apps_Memory**): what this is, why, who, current state, constraints, what "good" looks like. Feeds your Obsidian memory system.
- **Type B, per-build**, lives in the game repo, ≤200 words, behaviour block + B.L.A.S.T. + specifics + definition of done. Drafted for you in Section 9.

### 8.3 B.L.A.S.T. mapped to the game
| Phase | Course meaning | For the kart racer |
|---|---|---|
| **Blueprint** | Vision and logic; discovery questions; JSON data schema before code | This document + `docs/design.md` (spec) + the data schemas: `TrackDefinition` (spline points, widths, checkpoints, era-locked segments), `KartArchetype`, `ItemDefinition`, `RaceState`, `Score` row. No code until these shapes are confirmed |
| **Link** | Test every connection with a probe script | `scripts/probe-supabase.ts` (insert via Edge Function, read via anon key), Vercel/GitHub CLI auth confirmed, asset pipeline probe (`gltf-transform` round-trip), audio unlock probe on Safari |
| **Architect** | Deterministic build as A.N.T. | **Architecture** = markdown SOPs per system in `docs/sops/` (kart controller, track builder, AI, items, audio, UI); **Navigation** = the game state machine (`Boot → Title → Select → Race → Results`) and the fixed-timestep loop; **Tools** = atomic testable modules (`Centerline`, `Kart`, `AIDriver`, `RaceManager`, `ItemManager`, `AudioBus`) each with a headless test |
| **Stylize** | Format payload, apply UI/UX, verify command per output, sign-off | Toon shading, post-FX, HUD, juice pass, music; `npm run verify` (typecheck + tests + Lighthouse perf + bundle size + 60 fps headless Playwright run); critique loop sign-off (8.5) |
| **Trigger** | Deploy, firing mechanism, self-healing loop | Vercel deploy on push to `main`; Supabase keep-alive ping; the repair loop: analyse error → patch → test → write the lesson back into the SOP |

### 8.4 Per-system research → build loop (Level 3 + Level 6 pattern)
For each subsystem (kart controller, track, AI, items, audio, UI, art, backend), run the same five-step ritual in a **fresh session** (one task, one window; context rot is real):
1. **Research prompt with parallel sub-agents** (Level 3): "Spin up three sub-agents: one reads `turbo-kart-rush/src/kart`, one reads `Mario-Kart-3.js` drift code, one researches the tunables in Section 4.1. Each reports; you synthesise the approach into `docs/sops/<system>.md`." Use Firecrawl for web reads (token-efficient).
2. **Plan mode first** with your stated intention: "My stated intention is: the thing I want to be true is `<outcome>`." Spar until the plan is right; the first prompt is the most important prompt.
3. **Build** on Accept-edits; commit via GitHub CLI at every green checkpoint (version control = save states).
4. **Critique loop** (8.5) before calling it done.
5. **Wrap up**: `/obsidian-wrap-up` into Adam_AI_Apps_Memory + vault inbox; `/compact` or new window.

### 8.5 The autonomous critic loop (Level 3, and your Design Loop)
Jack: "I never ship code without it being externally reviewed." For code: after Claude builds, "create a critique agent, review it yourself, then tag in **Codex** with a fresh perspective." You already have the Codex CLI wired for SlopMonster; reuse it. For visuals: run your **Design Loop** skill (builder + three fresh-context critics: brief / system / craft) against a `bar.md` built from the eye-candy checklist in Section 7. For the HUD/menus, `wf-site-factory:critique` and `ui-ux-pro-max` both apply. Gate: nothing merges to `main` without a critic pass.

### 8.6 Skills to build once (Level 3)
Make each a `/skill` so the next 20 uses are free: `/new-track` (scaffold a `TrackDefinition` + spline editor session), `/tune-kart` (edit constants, run the headless lap-time test, report), `/juice-pass` (walk the 12-item checklist for a given feature), `/perf-check` (draw calls, frame time, bundle size), `/critique-code` (the Codex loop), `/ship` (verify → build → deploy → smoke test the live URL).

### 8.7 Memory (Level 4)
Type A manual in `Adam_AI_Apps_Memory/Kart Racer/`; every session ends with `/obsidian-wrap-up` so decisions (tunables that worked, things deleted, critic findings) land in the vault. Add the four research reports from today to the vault `inbox/AI Apps/` for `/ingest` so Claude can query them mid-build.

### 8.8 Routines (Level 3) and the OS dashboard
- Nightly **remote routine**: run `npm run verify` on `main`, post a one-line status (green/red + fps + bundle size).
- Every 6 days: ping Supabase so the free project doesn't pause.
- Keep `bun run dev` in `~/code/claude-os` running so the OS dashboard tracks sessions and spend for this project (see your HOWTO doc).

### 8.9 Compliance (Level 9), before you post the link
Run Jack's red-team mega-prompt on the repo: no keys in git history (squash before publishing), `.env` ignored, RLS on every table, service-role key only in the Edge Function, rate limits on inserts, spend caps on Supabase and any AI API. Pick boring: static site + one function.

### 8.10 The submission (StoryBrand is your home turf)
60-second Loom, no talking head, game audio: hook in 3 s (era shift or drift sparks), the twist at 15 s, Knockout elimination at 35 s, leaderboard at 50 s, URL card at 58 s. Post in "September Comp" with the live link and the public repo.

---

## 9. Creating the project: what you need and the exact steps

### 9.1 Accounts, tools, keys (all free unless noted)
| Need | Have it? | Notes |
|---|---|---|
| Node 20+ / npm | Check `node -v` | Vite 8 needs Node 20.19+ |
| Claude Code (Max plan) + Codex CLI | Yes | Codex is the critic |
| GitHub CLI (`gh auth status`) | Yes per Level 1 | Public repo for the submission |
| Vercel CLI (`vercel whoami`) | Yes per Level 2 | Or Cloudflare `wrangler` |
| Supabase project | Connector already attached to Claude | Create a new project named for the game |
| Blender 4.x | Install | Only for kitbashing Kenney parts and exporting GLB |
| `@gltf-transform/cli` | `npm i -g` | Asset compression |
| Suno Pro (1 month, paid) **or** Stable Audio 3.0 locally | Decide | Music with commercial rights |
| Kenney Car Kit v3, Racing Kit, Mini Characters; Quaternius packs | Download | CC0 |
| Sonniss GDC audio bundle, Kenney audio, jsfxr | Download | SFX |
| Google Fonts: Lilita One, Fredoka | Self-host | UI |
| Loom | Yes | Submission video |

### 9.2 Folder placement
Code lives beside the OS: `~/code/<game-name>/`. Memory lives in your bucket: `Desktop/All/Memory Folders for AI/Adam_AI_Apps_Memory/<Game Name>/` with the Type A CLAUDE.md and a `memory/` folder (your Memory Save design).

### 9.3 Step-by-step (do these in order)
1. **Decide theme + title** (Section 3). Nothing below is worth doing until this is fixed.
2. **Type A manual**: create the bucket folder above, write the 150-word operating manual (template in Level 1 guide, Step 11).
3. **Scaffold the repo** in Claude Code:
   ```
   cd ~/code
   npm create vite@latest <game-name> -- --template vanilla-ts
   cd <game-name> && npm i three three-mesh-bvh postprocessing && npm i -D @types/three
   git init && gh repo create <game-name> --public --source=. --push
   ```
4. **Drop in the Type B CLAUDE.md** (Section 9.4) and `docs/design.md` (this document's Sections 3–7, trimmed to the decided theme).
5. **Blueprint session** (plan mode): have Claude write the JSON schemas and the `docs/sops/` skeleton. No gameplay code yet.
6. **Link session**: probe scripts for Supabase, Vercel, gltf pipeline, audio unlock. All green before Architect.
7. **Clone the three reference repos into `refs/`** (git-ignored) and run `/init` so Claude has actually read them.
8. **Architect, system by system**, each in a fresh session per the 8.4 ritual, in this order: kart controller on a flat plane → spline track + camera → checkpoints/laps/positions → AI → items → HUD → audio → Knockout → menus → leaderboard.
9. **Stylize**: toon shading, post-FX, juice pass, music, era art. Design Loop critiques.
10. **Trigger**: connect Vercel to the repo, set the nightly verify routine, red-team pass, publish.

### 9.4 Type B CLAUDE.md (≤200 words, drop in the repo root)
```markdown
# CLAUDE.md — <GAME NAME>

## Goal
A browser 3D kart racer (inspired by Mario Kart World, zero Nintendo IP) that judges keep playing: 8 karts at 60 fps, drift/mini-turbo that feels right, Knockout mode, original items, global leaderboard. Deadline 30 Sept 2026.

## Behaviour
- Think before coding. Understand the problem before touching a file.
- Simplicity first. The simplest solution that works, wins.
- Surgical changes. Edit only what needs editing — nothing else.
- Goal-driven execution. Optimise for the stated outcome, not the literal instruction.

## Process (B.L.A.S.T.)
- Blueprint: schemas in docs/schemas before code. Link: probe scripts green. Architect: SOP per system in docs/sops, atomic modules with headless tests. Stylize: npm run verify + critic pass before merge. Trigger: Vercel on main, repair loop writes lessons back to the SOP.

## Specifics
- Stack: Three.js 0.185, TypeScript, Vite, pmndrs postprocessing, Supabase Edge Function, Vercel.
- Kinematic kart controller only. No rigid-body vehicle physics. Spline drives all track systems.
- Must not touch: refs/ (read-only references), CREDITS.md licences.
- Never add Nintendo names, assets or look-alikes. Fixed timestep. <100 draw calls.

## Definition of done
Live URL, 60 fps on a mid laptop, one full Knockout playable start to finish, leaderboard accepts a score, red-team pass clean.
```

### 9.5 25-day plan (part-time; each line is a session or two)
| Days | Milestone | Done when |
|---|---|---|
| 1–2 | Blueprint + Link + scaffold; kart on a plane with hop/drift/3-tier turbo | It feels good with keyboard alone |
| 3–4 | Spline track 1 + chase camera + checkpoints/laps/positions/respawn | 3 clean laps, minimap draws |
| 5–6 | 7 AI drivers with rubber-banding; Quick Race end to end; results screen | You can lose and win |
| 7–8 | 6 items with position tables; HUD roulette | Items feel fair, leader has a defence |
| 9–10 | Toon shading, outlines, post-FX, era swap on track 1 (**go/no-go on Epoch here**) | Screenshot looks intentional |
| 11–13 | Tracks 2–4 via `/new-track`; cup structure; 50/100/150cc | Grand Prix playable |
| 14–15 | Knockout mode + elimination flourish | Headline mode complete |
| 16–17 | Audio: engine, drift, items, UI, music, final-lap lift | Sounds like a game |
| 18–19 | Juice pass (12 items), title/attract, vehicle select, settings | First 5 seconds sell it |
| 20–21 | Supabase leaderboard + ghosts + daily seed | Two browsers compete |
| 22–23 | Perf, gamepad + touch, accessibility, red-team, CREDITS | verify green on Low/High |
| 24 | Design Loop + Codex critique, fixes | Critics sign off |
| 25 | Loom, Skool post, buffer | Submitted early, not on the 30th |

If Epoch's era art isn't reading by day 10, switch to Ground Crew and reuse everything else unchanged.

---

## 10. Unverified / caveats
- No datamine of MKW's exact turbo frames or camera values exists; MK8DX/MK Wii numbers and designer defaults are used as starting points.
- The "MKW hidden difficulty tied to drift count" claim circulating online is internally inconsistent; ignored.
- GitHub star counts read from HTML; turbo-kart-rush is 5 days old with 6 stars — read its code before leaning on it.
- Higgsfield audio licensing, Safari Opus-in-ogg support, Meshy/Tripo credit amounts, and title trademark status were not confirmed against primary sources.
- Cloudflare "recommends Workers for new projects" comes from a third-party article.

## 11. Sources
Full per-topic source lists are in the four agent reports appended to this project as `claude/Kart Racer - Research Appendix.md`. Key primary sources cited inline above.

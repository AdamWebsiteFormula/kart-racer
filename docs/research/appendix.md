# Kart Racer — Research Appendix (full agent reports, 5 Sept 2026)

Companion to "Kart Racer - Research and Build Plan.md". Four research agents ran in parallel; their full reports are reproduced here so the build sessions can query them. Versions spot-checked against npm on 5 Sept 2026: three 0.185.1, postprocessing 6.39.4 (peer three >=0.168 <0.186), vite 8.2.2, typescript 7.0.2, three-mesh-bvh 0.9.14, n8ao 2.0.1, wrangler 4.129.0, @supabase/supabase-js 2.115.0. Reference repos confirmed reachable: bridge-mind/turbo-kart-rush, mrdoob/Starter-Kit-Racing, Lunakepio/Mario-Kart-3.js, KenneyNL/Starter-Kit-Racing.

---

# Report A — Technical approach

## Recommended stack
Vanilla Three.js r0.185.1 + TypeScript 7 + Vite 8, no React, no physics library for the kart itself. Hand-rolled arcade kinematic kart controller (scalar speed + yaw, lateral slip for drift, hop → 3-stage mini-turbo, ground height/normal from a raycast against a three-mesh-bvh-accelerated road mesh), static collision via capsule-vs-BVH push-out (the pattern Lunakepio/Mario-Kart-3.js switched to after abandoning Rapier) or `crashcat` (pure JS, used by mrdoob's Starter-Kit-Racing) if you want rigid-body props. Tracks as a closed CatmullRomCurve3 centerline with an arc-length lookup table driving road mesh, checkpoints, AI racing line, position ordering, wrong-way and respawn (the architecture of bridge-mind/turbo-kart-rush). Assets: Kenney Car Kit v3 + Racing Kit + Quaternius/Poly Pizza, compressed with @gltf-transform/cli (meshopt + WebP). Deploy `vite build` → Vercel or `wrangler pages deploy dist`. Optional leaderboard: Supabase free tier via an Edge Function. WebGL2 renderer as the shipping target.

## 1. Engine choice
- Three.js has by far the most public code; two of the three best kart references were written by Claude in vanilla Three.js; mrdoob's ships a CLAUDE.md. https://github.com/mrdoob/Starter-Kit-Racing · https://github.com/bridge-mind/turbo-kart-rush
- Babylon.js and PlayCanvas push editor workflows (bad for a text-driven agent). https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison
- Bundle: three core ≈155 KB gzipped; npm unpacked three 23 MB, @babylonjs/core 70 MB, playcanvas 85 MB, phaser 112 MB. Unity 6 empty WebGL 10.7 MB default; Godot 4.6 web ≈6.3 MB engine wasm before content. https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365 · https://github.com/JohannesDeml/Godot-Web-LoadingTest
- Godot web needs COOP/COEP headers for threaded builds. https://godotengine.org/article/progress-report-web-export-in-4-3/
- Not R3F: React overhead, useFrame closures with refs (Mario-Kart-3.js PlayerController.jsx is 467 lines of ref juggling); the pro-R3F article recommends vanilla for tight loops. https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs
- WebGPU production-ready since r171 with WebGL2 fallback; gains only in draw-call-heavy scenes. https://www.utsubo.com/blog/threejs-2026-what-changed

## 2. Physics: what real browser kart racers use
| Repo | Physics | Solves |
|---|---|---|
| bridge-mind/turbo-kart-rush (Three.js 0.185 + TS + Vite 8, built by Claude sub-agents, MIT, 18.7k lines) | Custom kinematic | Hop, drift, 3-stage mini-turbo, boost pads, off-road, weight-class collisions, AI with look-ahead + rubber-banding + stuck recovery, ordered checkpoints, laps, positions, respawn, minimap, HUD, 10 items, 4 procedural tracks |
| Lunakepio/Mario-Kart-3.js (4.6k stars, MIT) | Custom capsule-vs-three-mesh-bvh (Rapier world has gravity 0) | Best drift feel and VFX (sparks, flames, skid smoke), kb/gamepad/touch input, PlayroomKit multiplayer. No AI, no checkpoints |
| mrdoob/Starter-Kit-Racing (Mar 2026, MIT, Kenney CC0) | crashcat sphere body + kinematic controller | Tile track + URL-encoded track editor, lap timer, drift marks, particles, synthesized engine audio (AudioWorklet), 13 files / 3.2k lines, CLAUDE.md |
| pmndrs/racing-game (2.2k) | R3F + cannon raycast vehicle | Checkpoints, leaderboard, ghost replays |
| brunosimon/folio-2025 (1.5k) | Rapier 0.17 + custom controller, WebGPU/TSL | Pro-level feel and polish bar |
| cconsta1/threejs_car_demo | cannon-es | Small readable kart with toon shading |
Library status: @dimforge/rapier3d-compat 0.20.0 (Aug 2026, ~10 MB); cannon-es last release Aug 2022 (avoid); ammo.js (avoid); crashcat 450 stars, determinism "not deeply tested". https://github.com/isaac-mason/crashcat · https://discourse.threejs.org/t/rapier-vs-cannon-performance/53475
turbo-kart-rush Kart.ts constants: DRIFT_STAGE_THRESHOLDS [1.0, 2.0, 3.2], DRIFT_SLIP_MAX 0.49 rad, LATERAL_GRIP_ROAD 8 / OFFROAD 4.

## 3. Track building
- `new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5)`, arcLengthDivisions 4096, bake LUT (position, tangent, normal/binormal, half-width). Sweep a cross-section yourself (~80 lines); TubeGeometry/ExtrudeGeometry are awkward for flat roads. https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3
- Progress: nearestT searched locally; distanceAlong = lap*length + t*length.
- Checkpoints: N ordered fractions of t with a tolerance window; lap increments when all hit in order and the start plane is crossed. https://gamedev.net/forums/topic/391064-lap-counting-in-a-racing-game/
- Wrong-way: dot(velocity, tangent) < 0 for > 1.2 s. Respawn: y < VOID_Y or stuck → last checkpoint, 0.6 s freeze.

## 4. AI
Pure pursuit: target at t + L, L = clamp(speed*0.9, 8, 30); lateral = personality offset + inside-corner bias clamped ±0.6 half-width; hazard dodge look-ahead 25 m; difficulty profiles; rubber-banding 0.6–1.4 with dead zone, skill before power; stuck recovery reverse 0.8 s then respawn. https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter42_A_Rubber-Banding_System_for_Gameplay_and_Race_Management.pdf

## 5. Assets
Kenney Car Kit (45 assets, CC0, v3 "added kart racers") https://kenney.nl/assets/car-kit · Racing Kit (110 files) https://kenney.nl/assets/racing-kit · KenneyNL/Starter-Kit-Racing · Quaternius Cars + 150 Nature · poly.pizza bundles · https://github.com/madjin/awesome-cc0
gltf-transform optimize with --texture-compress webp; meshopt default for low-poly; Draco needs 300 KB WASM; KTX2 only if VRAM matters. https://gltf-transform.dev/
AI 3D (Meshy 7, Tripo, Hunyuan3D 2, TRELLIS 2, Rodin): hero props only; style mismatch is the bigger risk.

## 6. Performance
<100 draw calls; ≤3 lights; one shadow map 1024–2048 with tight ortho frustum; bake AO; postprocessing 6.39 with gated effects; DPR ≤2; fixed timestep with interpolation and max-steps clamp; pause on visibilitychange; atlases ≤2048. https://www.utsubo.com/blog/threejs-best-practices-100-tips · https://gafferongames.com/post/fix_your_timestep/

## 7. Input
Single InputManager → {steer, throttle, brake, drift, item, lookBack}; e.code not e.key; Gamepad API is poll-only, mapping === "standard", dead zone 0.15, Firefox needs a press first; touch joystick with pointer events, touch-action none, auto-accelerate on touch; remap stored in localStorage. https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping

## 8. Deployment
`npm create vite@latest kart -- --template vanilla-ts`. Cloudflare Pages: 25 MiB per file, 20k files free, `_headers` immutable caching on fingerprinted assets, `npx wrangler pages deploy dist`. Cloudflare now recommends Workers static assets for new projects (third-party report). https://developers.cloudflare.com/pages/platform/limits/index.md · https://vite.dev/guide/static-deploy

## 9. Leaderboard backend
Supabase free: 500 MB, 500k edge invocations, auto-pause after 7 idle days. scores table with RLS, select open, no anon insert; Edge Function with service_role validates + rate-limits (+ Turnstile). Deterministic sim → store input log as ghost, re-simulate to verify. Cloudflare alternative: Worker + D1 (free daily limits enforced from 1 Sept 2026). https://supabase.com/docs/guides/functions/examples/rate-limiting · https://vibeappscanner.com/supabase-security

## 10. Quality bar
bruno-simon.com (folio-2025), Mario Kart 3.js, mrdoob Starter-Kit-Racing, turbo-kart-rush live, pmndrs/racing-game. itch.io three.js racing tag.

## Caveats
Star counts approximate; Kenney export formats not on fetched pages; Meshy/Tripo credits vague; turbo-kart-rush is 5 days old, 6 stars, read its code first.

---

# Report B — Game design

## 1. Mario Kart World facts
- 24 racers; Yabuki: with long routes "players spread across various places... increasing the number of racers ensures competitive action." https://miketendo64.com/2025/05/21/ask-the-developer-mario-kart-world-ns2/
- Open world; GP races 2–4 are sectioned point-to-point. Knockout Tour: 8 rallies, 6 checkpoints, 24 starters, cut line 20→16→12→8→4→finish. https://www.mariowiki.com/Mario_Kart_World · https://nintendosoup.com/guide-how-to-win-in-mario-kart-worlds-knockout-tour/
- 7 cups + Special Cup; 50/100/150cc + Mirror (heavy unlock). Time Trials with Nin★ ghosts, no reward. Free Roam: 394 P Switches, 150 ? Panels, 200 medallions, 24-min day/night. Rewind: solo only, opponents keep moving. https://www.mariowiki.com/Rewind
- Charge Jump / Rail Ride / Wall Ride (wall charges turbo faster than drift). Jikumaru: "too many bends, you lose sight of your destination. Driving straight roads isn't fun either" → tricks. Landmarks not arrows. https://kotaku.com/mario-kart-world-rail-wall-charge-jump-ride-switch-2-1851784648
- 27 items (new: Coin Shell, Dash Food, Kamek, Hammer, Ice Flower, Feather, ? Block). https://www.nintendolife.com/guides/mario-kart-world-all-items-and-what-they-do
- Position-based item table (reverted from MK8 distance); stronger items overall; lockout first 20–30 s; pool shrinks in Knockout. Patch 1.2.0 weakened CPUs, cut last-place Triple Mushroom rate. https://nintendosoup.com/in-depth-analysis-reveals-how-mario-kart-worlds-item-system-works/
- Reception: Metascore 86, user 7.0. Praised: Knockout Tour, driving feel, chaos, set-pieces, soundtrack. Criticised: intermissions, empty Free Roam, item luck, random unlocks, stickers. https://www.metacritic.com/game/mario-kart-world/ · https://www.techradar.com/gaming/nintendo/mario-kart-world-review · https://gmtk.substack.com/p/gmtk-digest-june-2025
- Unverified/ignored: NintendoReporters "hidden difficulty tied to drift count".

## 2. Handling numbers
- SMK: realistic counter-steer failed; hold-a-button drift won. https://www.gamedeveloper.com/design/the-design-origins-of-drifting-in-i-mario-kart-i-
- MK8DX charge: +5/frame at >45° stick, +2 otherwise; thresholds at MT 1.00: 280/590/900; MT 5.00: 223/476/729. https://vikemk.com/drifting-guide
- Boost durations: 0.62 / 1.67 / 2.63 s. https://www.mariowiki.com/Mini-Turbo
- MK Wii: mini-turbo +20%, trick +30%, mushroom +40%; non-stacking, priority Trick > Mushroom > MT. https://wiki.mkwtas.com/wiki/Boost_information
- Coins: 10 coins ≈ +6.6% top speed. https://www.speedrun.com/mk8dx/guides/bsdh3
- MKW: outward drift only, three spark tiers, Smart Steering caps at tier 2, slipstream, start boost on "2".
- CTR: multi-boost per slide, reserves; CrossWorlds: max-level drifts much faster; KartRider: instant boost on drift exit; Kirby Air Riders: one-button elegance. https://www.powerpyx.com/crash-team-racing-nitro-fueled-boost-mechanics-explained/ · https://www.npr.org/2025/11/19/nx-s1-5611480/kirby-air-riders-racing-game-review
- SuperTuxKart tunables: max speed 25 m/s, drift ≥10 m/s, skid bonus 3–4 s / +4.5–6.5 m/s, turn radius 2→30 m, slipstream 8×4 zone 2.5 s +3 m/s, zipper 3.5 s +4.5 m/s, weight 0.6–1.1×. https://github.com/supertuxkart/stk-code/blob/master/data/kart_characteristics.xml
- Arcade > physics: https://www.gamedeveloper.com/design/implementing-racing-games-an-intro-to-different-approaches-and-their-game-design-trade-offs · Criterion GDC Vehicle Feel Masterclass https://www.gdcvault.com/play/1025383/Vehicle-Feel-Masterclass-Balancing-Arcade · PowerslideKartPhysics https://github.com/JustInvoke/PowerslideKartPhysics

## 3. Items
MK Wii position table samples (relative weights): 1st Banana 75, Green 50, Fake 35; 3rd Red 40, Mushroom 35; 6th Triple Mushroom 50, Mega 20, Spiny 15; 9th Triple Mushroom 70, Golden 55, Star 40; 12th Bullet Bill 50, Golden 50, Lightning 45, Star 30. https://www.mariowiki.com/Mario_Kart_Wii_item_probability_distributions
Yabuki: "without the Blue Shell it feels like something's missing... sometimes life isn't fair." Comeback design: don't close the gap by itself; hidden > visible babysitting; communicate rubber-banding. Small-game counts: Garfield 9, Super Indie Karts ~10, Smash Karts ~9.
Original items (Ricochet Puck, Tracer Dart, Grapple Tether, Oil Slick/Glue, Decoy Crate, Shockwave, Bubble Shield, Overdrive Cell, Gravity Flip, Slow Field, Swap Beacon, Ghost Cloak) — see main doc Section 5.

## 4. Track design
Lanes ~1.6 car widths; on-camber corners; height for sightlines; straights ±30% speed variance; punctuation; needle-threading. https://www.gamedeveloper.com/design/a-rational-approach-to-racing-game-track-design · STK: wide starts, alternate hard/easy, shortcuts save ≤2 s, lap 40–70 s, archway at the line https://supertuxkart.net/Making_Tracks:_Gameplay_Fundamentals · MK8DX 150cc WRs 1:33–2:01 for 3 laps https://mkwrs.com/mk8dx/ · Stampede 60-player lessons https://news.xbox.com/en-us/2024/07/19/stampede-racing-royale-60-player-kart-racer/
Track counts: Garfield 16 (89% positive), Super Indie Karts 48, NKR3 36, CrossWorlds 24+15, MKW 30. KartRider criticised for too-easy early circuits.

## 5. Vehicles
MKW 4 stats, equal totals per weight class; MK8DX hidden MT stat; Speedstorm 4 classes; CrossWorlds 5; STK 0.6–1.1×; MKW bikes became unviable without inward drift (a class needs a mechanical hook). https://kotaku.com/mario-kart-world-kart-best-stats-weight-vehicle-1851785613 · https://disneyspeedstorm.com/news/disney-speedstorm-dev-diary-racer-classes

## 6. Controls
MKW: Smart Steering (caps MT tier 2, antenna shown), Auto-Accelerate, Auto-Use Item, rewind on D-pad down. Browser precedent: Smash Karts WASD+Space, PolyTrack WASD + R restart. https://kotaku.com/mario-kart-world-smart-steering-auto-acceleration-work-1851784842

## 7. Replay value
Trackmania TOTD daily 19:00 CET with 24-h leaderboard https://doc.trackmania.com/play/what-is-totd/ · PolyTrack ghosts + share codes https://www.crazygames.com/game/polytrack · split-screen feasible https://github.com/Carnewal/three-splitscreen

## 8. Modes
Knockout with 8 racers (chaos comes from the start bump, not the count). Stampede's 60-player eliminator shut down June 2025. Kirby City Trial criticised for long prep phase.

## 9. Camera
No sourced MK values; designer defaults in main doc. Speed toolkit: FOV with speed, minimal shake, speed lines, edge blur, dense roadside geometry. https://elliotdev.gg/adding-the-feeling-of-speed/

## 10. Talks
Only primary: Nintendo Ask the Developer (May 2025). No GDC 2026 kart session located.

---

# Report C — Art, audio, UI, polish

## 1. Art direction
Three.js showcases are dominated by flat low-poly or neon (PolyTrack, HexGL, Bruno Simon). Toon + outlines rarely done well on the web; MKW and CrossWorlds are tagged "3D Stylized/Cartoon". Options: flat low-poly (lowest cost, low differentiation), toon/cel + outlines (low-med cost, high differentiation), toy diorama/claymation (needs AO/DoF), pastel stylized (a palette choice), PS1 retro. Recommendation: saturated toon-diorama. https://itch.io/games/made-with-threejs/tag-racing · https://www.gameuidatabase.com/gameData.php?id=2104 · https://kenney.nl/assets/mini-characters

## 2. Shaders and post
postprocessing 6.39.4 merges effects into one pass. Toon: MeshToonMaterial + gradientMap NearestFilter. Outlines: inverted hull (cheap), pmndrs OutlineEffect (selective), depth/normal edge detection (High only). Bloom mipmap at half-res; Vignette; ChromaticAberration offset 0→0.004 on boost; speed lines as a custom Effect; radial blur instead of real motion blur; LUT3DEffect per track; N8AO 2.0.1 half-res on High only; SMAA on High, none/FXAA on Low; DPR ≤2; precision mediump on mobile. https://github.com/pmndrs/postprocessing · https://github.com/N8python/n8ao · https://discoverthreejs.com/tips-and-tricks/ · https://www.maya-ndljk.com/blog/threejs-basic-toon-shader

## 3. Juice
Juice It or Lose It https://youtu.be/Fy0aCDmgnxg · Art of Screenshake https://youtu.be/AJdEqssNZ-U · Game feel on the web (shake needs rotation; hit-stop 60–90 ms; spring easing; prefers-reduced-motion) https://valdemird.com/blog/game-feel-on-the-web/ · Tire marks ribbon mesh https://discourse.threejs.org/t/racing-tire-burnout-marks-on-floor/5108 · 12-item checklist in main doc 7.2.

## 4. UI/HUD
Elements: rank, minimap, item slot, counter, timer/lap, notifications. Fonts (OFL): Luckiest Guy, Lilita One, Titan One, Fredoka, Bangers; self-host via google-webfonts-helper. AAA feel: hover/confirm SFX, animated background, one easing curve, gamepad nav with focus ring, branded wipes. MKW select screen "objectively a total mess" — keep roster tight. https://www.gameuidatabase.com/gameData.php?id=2241 · https://fonts.google.com/specimen/Lilita+One

## 5. Music
MKW OST: jazz fusion/big band/ska/calypso, 128–174 BPM, final lap +10%. Spec 140–170 BPM, 90–120 s loops, 6 files minimum. Licensing (Sept 2026): Suno free = non-commercial, Pro/Premier assigns rights (ToS effective 3 Sept 2026, litigation ongoing); Udio downloads disabled since Oct 2025; Stable Audio 3.0 open weights Community License = own outputs, commercial OK; ElevenLabs Music free = non-commercial; Higgsfield says commercial on all tiers (audio-specific unverified); Incompetech CC-BY with exact credit line; Pixabay licence no longer CC-compatible; Tone.js for adaptive playback only. https://suno.com/terms-of-service · https://the-decoder.com/stability-ai-launches-stable-audio-3-0-with-up-to-six-minute-tracks-and-open-weights/ · https://elevenlabs.io/terms-of-use · https://incompetech.com/music/royalty-free/faq.html · https://www.mariowiki.com/PipeProject:Music/Drafts/Mario_Kart_World_soundtrack
Adaptive: playbackRate 1.0→1.08 on final lap or separate stem; BiquadFilter lowpass 20 kHz→400 Hz over 50 ms on hit; bus crossfades 500 ms.

## 6. SFX and Web Audio
Google Racer: three loops sequenced with Web Audio, throttle → offset; HTML Audio lagged 2 s on old Android. https://web.dev/racer-sound · Engine recipe: 2–3 loops, playbackRate = rpm/sampleRpm, equal-power crossfade, WaveShaper on boost. Sources: Kenney audio CC0, Sonniss GDC 2026 (royalty-free, no AI training) https://gdc.sonniss.com/, freesound CC0, jsfxr https://sfxr.me/, ElevenLabs SFX paid only. Web Audio: one context, resume on first gesture, Safari ~4 contexts, iOS silent switch, bus graph → compressor, decodeAudioData preload, ogg/opus + m4a fallback, PositionalAudio for nearest 4, suspend on hidden. https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos

## 7. Characters
AI 3D 2026: Meshy 6/7 (free outputs CC-BY, paid = ownership), Tripo (free non-commercial, auto-rig), Rodin, TRELLIS.2 (MIT), Hunyuan3D 2.1 (licence excludes EU/UK/KR); raw outputs need retopo. Mixamo still up (maintenance mode). Pipeline order Tripo → Mixamo → Blender → GLB. Plan: karts as characters; optional blobby drivers; Quaternius Ultimate Animated Character Pack CC0. https://app.cinevva.com/guides/ai-3d-model-generators · https://quaternius.com/packs/ultimatedanimatedcharacter.html

## 8. Environment
Poly Haven HDRI CC0 for IBL + painted sky sphere; FogExp2 tinted; toon water (scrolling noise, fake foam); chunked InstancedMesh grass/trees with vertex wind (Codrops ~1M blades) https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/; sprite crowds; time-of-day/weather variants as content multipliers. https://polyhaven.com/license

## 9. Loading and first impression
LoadingManager progress; 1–3 GLBs; renderer.compileAsync before reveal; attract-mode title; Low/High + auto DPR. https://threejs.org/docs/#api/loaders/managers/LoadingManager.onProgress

## 10. Accessibility
GAG Basic: remap, sensitivity, no colour-only info, contrast, volume sliders, save settings, few menu steps. Okabe-Ito palette. Rumble via vibrationActuator.playEffect (Chrome/Edge/Safari 16.4+, not Firefox/iOS). https://gameaccessibilityguidelines.com/basic/ · https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect

---

# Report D — IP boundaries and originality

## A1. What protects what
Copyright = expression (characters, models, music, SFX, UI art, track layouts as artistic works); not mechanics/genre. 17 USC 102(b), Circular 33 https://www.copyright.gov/circs/circ33.pdf. Trademark = names/logos/trade dress ("Mario Kart" US Reg. 2345411). Patents = specific granted implementations. Cases: Tetris v. Xio 2012 (look-and-feel lost) https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.; Atari v. Philips (Pac-Man characters protected, maze mechanics not) https://www.americanbar.org/groups/intellectual_property_law/resources/landslide/archive/why-videogame-rules-are-not-expression-protected-copyright-law/; Nintendo v. MariCar (costumes + confusion lost; JPO let them keep the name) https://www.tokyoweekender.com/japan-life/news-and-opinion/nintendo-wins-court-case-against-maricar-over-go-karts/ · https://www.japantimes.co.jp/news/2017/03/09/national/crime-legal/patent-authority-rules-nintendo-lets-go-kart-firm-keep-maricar-trademark/
Patents: Palworld suit on capture/ride implementations (divisionals filed after launch; muted conclusion expected Nov 2026) https://www.techdirt.com/2026/07/02/the-nintendo-palworld-patent-suit-appears-to-be-heading-for-a-muted-conclusion/; US 6,699,127 replay patent expired ~2020; US 2026/0249188 A1 regional-weather-as-balancer application (published Aug 2026) https://www.4scarrsgaming.com/2026/09/nintendo-patent-regional-weather-mario-kart-world.html. Nintendo has never asserted a gameplay patent against a free hobby project.

## A2. Do / don't
Names: no Nintendo words anywhere; skip "Super ___ Kart"; "kart/racing/GP/cup/drift" generic; one factual "inspired by" sentence is nominative use. Items: reuse roles, not designs (no eyed banana, turtle shells, blue winged shell, red/white mushroom, star with eyes/music, Bullet Bill, rainbow ? cube, coin sound). Borrowing the *set* is what loses. No character silhouettes. No Rainbow Road. No MK music/cues. Own UI look. Typeface not copyrightable in US but fan fonts have licences and mimicking the logo is trade dress; use Google Fonts. Successful "inspired" examples: CTR (Wumpa-juiced items), CrossWorlds (lap-2 portals), SuperTuxKart (gift boxes, bubblegum, plunger, parachute, swapper), KartRider (water bomb, magnet, UFO), Smash Karts (arena), Nightmare Kart (aesthetic kept after IP scrub), Garfield Kart (legal clone, creatively empty). https://en.wikipedia.org/wiki/Nightmare_Kart · https://blog.activision.com/crash-bandicoot/2019-06/Crash-Team-Racing-Nitro-Fueled-Power-Up-Planning

## A3. Enforcement 2024–26
Triggers: Nintendo assets/characters (every DMCA names a specific work), emulators (Suyu network 311 repos Aug 2026), revenue at scale. Mario Royale → DMCA Royale (2019) still traced 1-1 levels and launched under the Mario name. No original-IP kart racer touched. https://github.com/github/dmca/blob/master/2026/08/2026-08-17-nintendo.md · https://www.techdirt.com/2019/06/28/nintendo-does-nintendo-mario-royale-fan-game-becomes-dmca-royale-is-now-dead/ · https://odinlaw.com/blog-fan-games-legal-risks/

## B4. Theme survey and proposals
Saturated: mascot animals, food, toys/LEGO, space/neon, underwater, gothic, cards/decks (Kart Draft, Kartomancy), battle royale (Stampede dead June 2025), elderly (Coffin Dodgers), time-ghosts (Chrono Kart). Proposed, ranked: 1 Epoch (eras per lap), 2 Ground Crew (airport), 3 Seedfall (growth), 4 Front (weather painting; avoid Nintendo's balancer patent shape), 5 Night Shift (museum), 6 Sequencer (music tracker; too risky), 7 Bloodstream, 8 Curbside. Full vehicle/item/track/mechanic breakdowns in main doc Section 3 (Epoch) and agent report.

## B5. Novel mechanics
Track changes per lap ★★★★★ (do it); drift-to-paint ★★★★; persistent growth ★★★★; momentum weapon charging ★★★; position betting ★★★ (cheap meta); item pickup as timing skill ★★ (free "not a clone" signal); leader picks next era ★★★; skip BR, rewind-as-headline, ghost-boost (Chrono Kart did it). Pattern of praised 2024–26 indies: one legible twist, fully committed, visible in the first minute. https://racinggames.gg/article/8-weird-and-wonderful-indie-driving-games-you-need-to-play · https://www.gamespot.com/reviews/sonic-racing-crossworlds-review-an-arcade-kart-racer-for-gearheads/1900-6418408/

## B6. Titles (no exact game conflict found; USPTO not queried)
Epoch Drift, Lap of Ages, Ground Crew GP, Tarmac Tuggers, Sprout & Spin, Squall Line (unverified), Night Shift GP, Curbside Cup. Avoid "Super ___ Kart", "___ Kart World", "Lawn Legends", "Bloodrush".

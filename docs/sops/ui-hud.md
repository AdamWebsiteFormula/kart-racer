# SOP — UI and HUD

## Purpose
HTML/CSS overlay: HUD (item, position, lap, minimap, timer), title/attract, roster select, results, pause, settings, credits.

## Inputs
Race events and state snapshots at render rate.

## Outputs
DOM overlay.

## Constraints
Fonts Lilita One + Fredoka self-hosted; keyboard and gamepad navigation with focus ring; colourblind-safe item icons; reduced-motion honoured.

## Tests (must pass before merge)
Every screen reachable by keyboard alone; HUD updates within one frame of a rank change; Lighthouse a11y ≥ 90 on the title screen.

## References
research plan §7.5–7.7; Game UI Database.

## Approach
_Synthesised 23 Sept 2026 from turbo-kart-rush `src/ui/` (8 files, 1397 lines + a 1938-line stylesheet), Starter-Kit-Racing `js/LapTimer.js`, Mario-Kart-3.js (mobile joystick CSS only, no menus), research plan §7.5–7.7 and appendix C§4, C§10, design §3, §4, §8, §9, §10, §12, the seven schemas, and the `src/game/` test drive already running._

### What we take from the references
- **turbo-kart-rush** is the model again: a DOM overlay over the canvas, one `#ui` layer at `z-index: 10`, a `TextField` wrapper that caches the last string and only writes to the DOM when it changes, a canvas minimap with the road drawn **once** on `setTrack()` and only the kart dots redrawn at 30 Hz, a `FocusRing` shared by mouse and keyboard so hover and arrow keys cannot disagree, results rows revealed in a stagger, and spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)` on every pop. Numbers taken: minimap redraw 30 Hz, player dot 6.5 × dpr with a 2.5 px white stroke, AI dots 4.5 × dpr, roulette flicker 90 ms (ours already), wipes 200–350 ms.
- We do **not** copy: its system-font stack (we self-host Lilita One + Fredoka), its debug GUI left in the build, its speed-first HUD (our design bible puts item top-left, position bottom-left, minimap bottom-right, timer top-centre), or its mouse-only track select.
- **Starter-Kit-Racing** contributes the lap-time readout shape (`M:SS.ss`, tabular numerals, a 1200 ms colour flash green on a personal best and red on a loss) and the localStorage best-lap key per track.
- **Mario-Kart-3.js** contributes only the touch layout idea (left thumb steer, right thumb buttons, `env(safe-area-inset-*)` padding). Touch is v1.1; the CSS hooks go in now.
- **Nobody** has Knockout cut-line screens, a Grand Prix star table, a Final Lap Shift banner, two item slots, or colourblind-safe item icons. Those we design here.

### The model
`src/ui-hud/` is **two layers**, and the split is the whole point:
1. **View models** — pure functions `(RaceState, Items state, results, save, app state) → plain data`. No DOM, no Three.js, no wall clock except where a parameter carries it. Every one is unit-tested headless. This is where all the logic lives.
2. **Renderers** — thin classes that own a DOM subtree and take a view model in `render(vm)`. They diff against the last view model field by field and touch only what changed. No logic, no branching beyond "did this string change".

Nothing else may write to the overlay DOM. `main.ts` keeps the sim loop, the scene and the camera; its hand-rolled `innerHTML` HUD is deleted.

**Screen flow** (`app.ts`, a pure reducer — `(AppState, AppAction) → AppState`, no side effects, fully tested):
`boot → title → modeSelect → rosterSelect → cupSelect (Grand Prix and Knockout only) → racing → (paused) → results → (gpTable | knockoutCut) → back to modeSelect or the next race`.
`settings` and `credits` are overlays pushed on a stack from title or pause, and pop back to wherever they came from. Every transition is an `AppAction`, so the keyboard test can walk the whole graph without a browser.

**Navigation** (`focus.ts`, pure): a screen declares a `FocusModel` — a grid of focusable ids with `up/down/left/right/confirm/back` edges. `move(model, id, dir) → id`. One model serves keyboard, gamepad and mouse: the pointer sets focus on hover, it never bypasses it. `input.ts` maps `keydown` and the Gamepad API standard mapping onto the same six actions (arrows/WASD, Enter/Space/A, Escape/B), with a 180 ms repeat delay and 90 ms repeat rate on held sticks. Focus is trapped inside the active overlay; `Escape` always goes back one level.

**HUD** (`hud/`), design §12 layout, all view models in `hudModel.ts`:
- Top-left: the two item slots (held and next), roulette flicker, charge pips.
- Top-centre: race timer, and the lap banner that takes over for `bannerHoldSeconds` (2.2) on countdown, go, final lap, wrong way and finish.
- Bottom-left: big position numeral with an ordinal suffix, and the coin count under it.
- Bottom-right: minimap and `LAP n/N`.
- Centre: hit flash, `wrongWay` warning, and the Knockout "3 REMAIN" strip when `RaceState.knockout` is set.
The HUD subscribes to **both** event streams (`RaceEvent` from race-manager and `ItemEvent` from items) through one `feed(events)` call per tick, and to state at render rate. Events drive the transient things (flash, banner, position-change flourish); state drives the steady readouts.

**Minimap** (`minimap.ts` + `minimapCanvas.ts`): `track.minimap.outlines` are already unit-square u,v pairs, so the static road is stroked once per `setLap` change into an offscreen canvas. Per frame we blit that and draw the dots from `track.minimap.toMinimap(kart.position)`. Player dot larger with a white ring, AI dots in the racer accent, finished karts dimmed, ghosts hidden. Redraw at 30 Hz, not 60; `dpr` capped at 2. The projection maths is pure and tested; the canvas class is not.

**Item icons** (`icons.ts`): inline SVG, one path per item, **shape first and Okabe-Ito colour second** so they read without colour (appendix C§10). Eight shapes: circle, triangle, square, diamond, hexagon, teardrop, star, chevron. The icon sheet also serves the results screen and the roster cards.

**Screens** (`screens/`), each a view model + a renderer:
- `title.ts` — logo drop with overshoot, "Press Enter", version line, credits and settings entries. The attract-mode camera rail is the camera's job, not the UI's; the UI just asks for it.
- `modeSelect.ts` — Quick Race, Grand Prix, Knockout, Time Trial, Daily. Locked modes read from the save.
- `rosterSelect.ts` — 8 cards from `ROSTER`, stat bars from the kart schema archetypes (speed, accel, handling, weight), speed class 50/100/150, and the racer's personality line. Cards animate in on a 40 ms stagger.
- `cupSelect.ts` — cups and Knockout sets from the cups schema, with track thumbnails as flat SVG shapes until art lands.
- `pause.ts` — Resume, Restart, Settings, Quit. Opens on `Escape` and on `visibilitychange` to hidden.
- `results.ts` — the finish table from `RaceResults`, rows revealed on a 120 ms stagger, times counting up, `dnf` greyed.
- `gpTable.ts` — Grand Prix points with the running total counting up and the star award.
- `knockoutCut.ts` — the eliminated racers crossed out, survivors sliding up, "N REMAIN".
- `settings.ts` — master/music/sfx volumes, resolution scale, reduced motion, colourblind-safe icon labels on/off, control remap. Reads and writes the save through an injected store, so tests use a fake.
- `credits.ts` — scrolling licences, read from `CREDITS.md` at build time. Never hand-edited.

**Fonts and theme** (`theme.css`, `fonts.css`): Lilita One for display, Fredoka for UI, self-hosted `woff2` in `public/fonts/` with `font-display: swap` and a metric-matched fallback stack so nothing reflows. Every colour, radius, shadow and duration is a CSS custom property on `:root`; screens use the tokens, never raw values. A `[data-reduced-motion="on"]` root attribute, set from `prefers-reduced-motion` **or** the settings toggle, drops every duration to 1 ms and kills the animated backgrounds.

**Performance.** The overlay must not cost frames: no layout reads in the render path, `transform` and `opacity` only for animation, `will-change` only on the few animating nodes, the minimap at 30 Hz, and every text write guarded by a cached-value check. Budget: under 2 ms of main thread per frame for the whole overlay, under 400 DOM nodes during a race.

### Module boundaries (`src/ui-hud/`)
| File | Owns | Test |
|---|---|---|
| `types.ts` | `AppState`, `AppAction`, `Screen`, `FocusModel`, every view-model shape | — |
| `constants.ts` | Durations, stagger, banner holds, minimap rates, dot sizes | values are sane and used |
| `app.ts` | The screen reducer and the screen stack | every screen reachable; back always pops |
| `focus.ts` | Focus grids, `move()`, wrap rules, disabled entries | every entry reachable by arrows alone |
| `input.ts` | Key and gamepad → six actions, repeat timing | mapping table; repeat delay and rate |
| `hudModel.ts` | The race HUD view model from state + both event streams | every element; banner priority; event decay |
| `minimap.ts` | Dot projection, colours, dim and hide rules | player vs AI; ghost hidden; finished dimmed |
| `icons.ts` | Item and medal SVG paths, Okabe-Ito colours | one shape per item; no duplicate shapes |
| `format.ts` | Times, ordinals, points, gaps | `M:SS.ss`; ordinals 1–8; negative guard |
| `screens/*.ts` | One view model per screen | data shape per screen |
| `render/*.ts` | The DOM renderers, one per screen plus the HUD | smoke-rendered in jsdom: nodes exist, aria set |
| `store.ts` | Save load/save through an injected backend | defaults on empty; round-trip; bad JSON ignored |
| `ui.ts` | `UiRoot`: mounts the overlay, owns the renderers, `feed()`, `render()` | mount/unmount leaves no nodes |
| `index.ts` | Public exports | — |

Imports allowed: `race-manager`, `items`, `track-builder`, `kart-controller` (types and constants only). **No Three.js anywhere in `src/ui-hud/`.** `src/game/hud.ts`, `camera.ts` and `loop.ts` stay where they are; `hud.ts`'s pure formatters move into `format.ts` and the old file goes.

### Constants
`bannerHoldSeconds` 2.2, `bannerFadeMs` 260, `flashMs` 180, `staggerMs` 120 (results) / 40 (roster), `wipeMs` 280, `popEasing` `cubic-bezier(0.34,1.56,0.64,1)`, `minimapHz` 30, `minimapDpr` ≤ 2, `playerDotPx` 6.5, `aiDotPx` 4.5, `dotStrokePx` 2.5, `repeatDelayMs` 180, `repeatRateMs` 90, `countUpMs` 700, `reducedMotionMs` 1. Read from elsewhere: `ROULETTE_FLICKER_MS` 90 (moves here from `game/hud.ts`), `SIM_HZ`, the kart schema archetype stats, the cups schema thresholds, the item schema ids and roles.

### Tests (headless, vitest; DOM tests in jsdom)
1. **Every screen reachable by keyboard alone** (SOP gate): from `boot`, a scripted list of the six actions walks title → mode → roster → cup → racing → pause → settings → credits → results → GP table → Knockout cut and back to title, asserting the reducer's screen at each step. No mouse events used.
2. **Focus reaches every entry** (SOP gate): for every screen's focus model, a breadth-first walk from the initial focus visits every enabled id, and no arrow press ever lands on a disabled one.
3. **HUD updates within one frame of a rank change** (SOP gate): feed a `positionChange` event, call the view model once, and the position string is already the new one; the renderer writes exactly one DOM node.
4. **Banner priority**: finish beats final lap beats wrong way beats countdown; each holds `bannerHoldSeconds` then clears.
5. **Item slots**: held and next, roulette flicker steps with the clock, charges shown only above 1, Fog strips both slots.
6. **Minimap**: a kart at the start line maps inside the unit square; the player dot is bigger; a ghost is absent; a finished kart is dimmed; the static layer is rebuilt only when `setLap` changed the outlines.
7. **Icons**: eight distinct shapes, eight Okabe-Ito colours, and no two items share a shape.
8. **Format**: `M:SS.ss` across a minute boundary, ordinals 1st–8th, a negative time clamps to `0:00.00`, a gap shows `+1.23`.
9. **Results**: ranks in order, dnf rows greyed and timeless, lap times sum to the total, the stagger index rises by one per row.
10. **Grand Prix table**: points per rank, running totals, the tie-break note, and the star count from the thresholds.
11. **Knockout cut**: the eliminated are struck through, survivors renumbered, "N REMAIN" matches the cut line.
12. **Settings round-trip**: change every setting, save, reload from a fresh store, every value survives; a corrupt blob falls back to defaults without throwing.
13. **Reduced motion**: with the media query on, every duration the view models publish is `reducedMotionMs`; with the settings toggle on, the same.
14. **Pause**: `Escape` pauses and resumes, `visibilitychange` to hidden pauses, and the sim is never stepped while paused (the loop asks the UI, not the other way round).
15. **No DOM churn**: render the HUD twice with the same state and a spy on `Node.textContent` counts zero writes on the second pass.
16. **a11y shape**: every screen root has a landmark role, the banner is an `aria-live="polite"` region, every focusable is a real `button` with a visible focus style, and no element relies on colour alone.
17. **Lighthouse a11y ≥ 90 on the title screen** (SOP gate): recorded manually until `npm run verify` grows a browser stage; the jsdom axe-style checks in test 16 stand in for CI.

### Out of scope here (other SOPs)
The attract-mode camera rail and the roster turntable (vfx-juice and art-pipeline own the 3D behind the overlay); menu music and UI clicks (audio); real item icon art and racer portraits (art-pipeline); the leaderboard screen's network calls (backend-leaderboard); touch controls and Mirror (stretch).

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-23: Built. `src/ui-hud/` = pure view models (`app`, `focus`, `input`, `format`, `hudModel`, `minimap`, `icons`, `store`, `screens/*`, `data/*`) and thin renderers (`render/dom`, `render/hud`, `render/screens`, `ui`), plus `ui.css`. 44 tests, 3 of them in jsdom. `npm run verify` green at 369.
- 2026-09-23: The game is called **Rascal Rally!** (`GAME_TITLE` in `constants.ts`, one place to rename). "Balloon Rally" was rejected: balloons plus karts sits too close to Mario Kart's Balloon Battle.
- 2026-09-23: A cup plays its built tracks and repeats them to keep its length (`playableTracks`), so Grand Prix and Knockout are playable end to end on Harbour Loop alone; a cup with no built track is disabled and says "Tracks coming soon".
- 2026-09-23: A player knocked out of a Knockout ends the series ("Knocked out!" then back to the menu); watching the rest is not in v1.
- 2026-09-23: The track, cup, Knockout-set and cast catalogs live in `src/ui-hud/data/` until a cups data file and a kart data file exist; they move out then.
- 2026-09-23: `save.schema.json` settings gained `masterVolume`, `reducedMotion` (auto/on/off), `iconLabels` and `resolutionScale`, schema first.
- 2026-09-23: Fonts are self-hosted through `@fontsource/lilita-one` and `@fontsource/fredoka` (OFL-1.1), bundled by Vite; no Google Fonts request at runtime. `CREDITS.md` created; the credits screen parses its tables.
- 2026-09-23: Menus read `KeyboardEvent.code` and fall back to `key` when the code is empty; racing input stays on `code` (kart-controller).
- 2026-09-23: `main.ts` rewritten as the game: `src/game/session.ts` builds and disposes one race (track, scene, manager, items, AI, views); an all-AI race runs behind the menus as the attract mode with a slow TV camera on the leader. The old test-drive `game/hud.ts` and `style.css` are deleted; their tests moved into ui-hud.
- 2026-09-23: Mode select is a fixed three-column grid so the arrow keys move the way the cards sit.
- 2026-09-23: Measured in the browser: 102 draw calls with the placeholder karts (7 meshes each, 56 for 8 karts). Over the 100 budget; the art pipeline must ship one merged mesh per kart. Bundle 722 kB JS (197 kB gzip), almost all Three.js.
- 2026-09-23: Critique (Codex `gpt-5.5`), all four accepted: only the focused button is a Tab stop and everything under a dialog is `inert`; minimap dots are rewritten in place (no per-frame objects); the minimap road key includes the track's own points so a new track never reuses the old road; Credits is reachable from the pause menu.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **Cup titles drew inside white boxes with borders.** Cause: the cup header used the class `row`, which the results table also styles. Fix: `cup-head`. Rule: in one global stylesheet, name classes after their screen, never generic words like `row`.
- 2026-09-23: **The browser test pane showed old frames and 1 fps.** Cause: the pane was hidden, so the browser throttles `requestAnimationFrame`; screenshots lag one paint. Fix: check state with `kart.ui.app` and the DOM, step `kart.session.tick()` from the console to run a race, take a second screenshot to see the real frame. Rule: never judge frame rate in a hidden pane.
- 2026-09-23: **Arrow keys and Enter did nothing in the automated browser.** Cause: its synthetic keydown carries `key` but an empty `code`. Fix: menus fall back to `key`. Rule: any keyboard handler that only a person tests still needs a `key` fallback.
- 2026-09-23: **A long bash heredoc holding a test file failed with "unexpected EOF".** Cause unknown (the harness shell quoting). Fix: write long files with the file tool. Rule: heredocs for short files only.

# Rascal Rally!

A bright cartoon kart racer for the browser. Eight original racers drift, boost and trade items across six worlds, and on every final lap the track fights back.

**Play now: https://adamwebsiteformula.github.io/kart-racer/**
Keyboard, gamepad or a phone turned sideways; tested in Chrome, Firefox and Safari. Sound on.

![Canyon Rush: the Rumblesaur towers over the road as the pack races through the canyon](docs/img/canyon-rumblesaur.jpg)

Inspired by the feel of Mario Kart World. Every racer, track, item and sound is our own.

## How to play

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Steer | A / D or ← / → | Left stick or D-pad | Left pad |
| Gas | W or ↑ | RT | Automatic |
| Brake / reverse | S or ↓ | LT | BRAKE |
| Hop and drift | Shift or Space | A | DRIFT |
| Use item (hold to keep it behind you) | E or X | X | ITEM |
| Look back (throw backward) | Q | B | LOOK |
| Pause | Esc or P | Start | Pause button at the top |

**Drift to win.** Hold drift through a turn: the sparks go blue, then orange, then purple. Let go for a mini-turbo. Press the gas the moment the **2** appears for a start boost. (Horn: H, or Y on a gamepad.)

## Modes

- **Quick Race:** one track, eight racers, 50cc, 100cc or 150cc.
- **Grand Prix:** two cups of three tracks, points and stars, then a podium ceremony.
- **Knockout:** eight start, cuts after every race, one wins the final.
- **Time Trial:** no items; race your own ghost for bronze, silver and gold.
- **Daily Challenge:** today's track, the same for everyone.
- **Mirror:** every track flipped left to right, unlocked with Time Trial gold on every track.

Time Trial and the Daily post to a global leaderboard.

## Highlights

- **8 original racers** in light, medium and heavy classes, from Pip the hummingbird courier to Big Gus the walrus chef, each with a signature kart, horn and yelp. Unlock 3 alt paints and 2 more kart bodies.
- **6 tracks, 6 giant creatures:** a crab, a goose, the stomping Rumblesaur, a snowball-throwing yeti, a kraken and a sky whale, each with a warning you can read. Plus a neon loop-the-loop, geysers, a ski jump, trick bumps, boost pads and cliff edges with no walls (fall off and a claw carries you back).
- **The Final Lap Shift.** When the leader starts the last lap, every track changes: the tide comes in, a storm rolls over, the rope bridge falls and the only way on is a lantern-lit mine, a blizzard freezes the lake into a shortcut, fireworks open a ramp at the Ferris wheel, and at nightfall the sky rail becomes the only road.
- **13 original items**, two held at a time: become a giant **Strike Ball** and bowl the pack over, boing over trouble on a **Pogo Spring**, hook the racer ahead with a **Grapple Anchor** and slingshot past, send a **Wind-Up Mouse** weaving through the field.
- **Drifting that pays.** Blue, orange and purple sparks at 0.55, 1.33 and 2.33 s. A test races every track with and without drifting: drifting wins by 3.8 to 7.7 s a race.
- **Race day, not just a race.** A camera fly-through of each course before the countdown, far vistas with a landmark ahead of every start line, birds and fireworks overhead, over a hundred cheering critter spectators per track, karts that lean, bounce and squash, a slow-motion finish with your racer's reaction, and a podium ceremony after every Grand Prix and Knockout final.
- **102 sound effects and 7 instrumental songs**, checked by AI listening models and mixed by measurement.
- **A leaderboard you can trust.** The 120 Hz sim is deterministic and bit-identical across chips and JavaScript engines, so the server replays every posted run with the real game code and stores its own time. Hardened by three red-team passes: a strict Content-Security-Policy, an origin allowlist, rate limits and a name filter.
- **Fast.** Full races held a locked 60 fps on an M4 Pro (16.7 ms frames, none over 20 ms, even with the CPU slowed 4×). The title is up in 0.8 s on fast 4G; the game's code is 423 KB gzipped.
- **Accessible.** Reduce motion (follows your system), item letters so items never rely on color, screen-reader labels, and full keyboard and gamepad menus.
- **1,462 automated tests**, run with the type check, build and bundle gate before every deploy.

<p>
  <img src="docs/img/harbor-start.jpg" width="49%" alt="Harbor Loop: GO! as the pack leaves the grid, a smoking volcano island ahead">
  <img src="docs/img/boardwalk-loop.jpg" width="49%" alt="Boardwalk Nights: the pack heads into the neon loop-the-loop">
</p>

![The six tracks: Harbor Loop, Meadow Run and Canyon Rush (Sunrise Cup); Frostbite Pass, Boardwalk Nights and Skyline Circuit (Summit Cup)](docs/img/six-tracks.jpg)

![The cast: concept art for the eight racers](docs/media/cast.jpg)

## Built with AI

Made for the *AI Automations with Jack* September 2026 game competition, from a first commit on September 5.

| Part | Made with |
|---|---|
| Design, code, tests, tuning and reviews | Claude Code (Claude Opus), with agents working in parallel |
| Racer concept art, portraits, painted skies, item art | AI images via Higgsfield (GPT Image 2.5 for the racers and skies) |
| 3D racers, creatures, landmarks and scenery | Image-to-3D via Higgsfield (Tripo H3.1 for the racers) |
| Music and sound effects | ElevenLabs (Eleven Music, Sound Effects) |
| Listening and gameplay review | Local audio models (CLAP, AST, Qwen2.5-Omni) and Gemini |
| Engine and leaderboard | Three.js, TypeScript, Vite; Supabase |

Every system has its own SOP and headless tests, built on seven shared data schemas. Agents build in parallel, then critique, bug-hunt and red-team the work, and check every screen in silent headless Chrome. The full write-up, with the measurements behind each claim, is in [docs/contest-entry.md](docs/contest-entry.md).

## Run it locally

```bash
npm install
npm run dev       # then open http://localhost:5173/
npm run verify    # type check, 1,462 tests, build and bundle gate
```

Add `?mute` to the address for a silent game. Credits and licenses are in [CREDITS.md](CREDITS.md).

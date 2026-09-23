# Rascal Rally!

A bright cartoon kart racer for the browser. Eight original racers drift, boost and trade items across six worlds, and on every final lap the track fights back.

**▶ Play now: https://adamwebsiteformula.github.io/kart-racer/**
Works in any modern desktop browser (Chrome, Edge, Firefox, Safari). Keyboard or gamepad. Sound on.

![The eight racers on the Harbor Loop grid](docs/media/grid.jpg)

## How to play

| Action | Keyboard | Gamepad |
|---|---|---|
| Go | W or ↑ | RT |
| Steer | A D or ← → | Left stick |
| Brake / reverse | S or ↓ | LT |
| Hop and drift (hold) | Shift or Space | A |
| Use item | E | X |
| Look back / throw behind | Q (hold while using an item) | B |
| Horn | H | Y |
| Pause | Esc | Start |

**Drift to win.** Hold drift through a corner: sparks go blue, then orange, then purple. Let go for a mini-turbo. Press go just as the **2** shows at the start for a rocket start.

## What's in it

- **8 racers**, each with their own kart, horn and "ouch": Pip, Momo, Nova, Juniper, Otto, Sprocket, Boulder and Big Gus.
- **6 tracks in 2 cups.** Each has a **Final Lap Shift**: the tide comes in, a storm fells a tree across the shortcut, a rope bridge collapses, a blizzard freezes the lake into a shortcut, fireworks turn the Ferris wheel into a ramp, and sunset retracts the sky bridges.
- **8 items** with two item slots: beach balls, a homing kite, oil, a decoy balloon, an air horn, a bubble shield, a rocket lolly and a fog bank.
- **5 modes:** Quick Race, Grand Prix (points and stars), Knockout (8 → 6 → 4 → 2), Time Trial (bronze, silver and gold medals) and a Daily Challenge.
- **Global leaderboards** for Time Trial and Daily. Every run is re-simulated on the server, so posted times are real.
- **Original music and sound:** 7 songs and 58 effects, a real engine sound, and a final-lap music lift.
- Runs at 60 fps. The game lowers its own resolution on slower laptops.

![Boost flames in each racer's colour](docs/media/boost.jpg)

## Built with AI

Built for the *AI Automations with Jack* September 2026 game competition.

| Part | Tool |
|---|---|
| Design, code, tests, tuning and the red-team review | Claude Code (Claude Opus) |
| Racer concept art, portraits and 3D models | Higgsfield (GPT Image 2.5 → Tripo image-to-3D) |
| Music and sound effects | ElevenLabs (Eleven Music, Sound Effects) |
| Engine | Three.js, TypeScript, Vite; Supabase for the leaderboard |

![The cast](docs/media/cast.jpg)

## Run it yourself

```bash
npm install
npm run dev
```

Useful commands: `npm run verify` (type check plus 444 tests), `npm run build`, `npm run check:bundle`. Credits and licences are in [CREDITS.md](CREDITS.md).

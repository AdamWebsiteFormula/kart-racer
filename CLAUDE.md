# CLAUDE.md — KART RACER (working title)

## Goal
Original browser 3D kart racer in the Mario Kart World mould, zero Nintendo IP: cartoon world, 8 original racers, drift/mini-turbo that feels right, 8 original items, Knockout mode, global leaderboard, 60 fps on a mid laptop. Deadline 30 Sept 2026.

## Behaviour
- Think before coding. Understand the problem before touching a file.
- Simplicity first. The simplest solution that works, wins.
- Surgical changes. Edit only what needs editing — nothing else.
- Goal-driven execution. Optimise for the stated outcome, not the literal instruction.

## Process (B.L.A.S.T.)
- Blueprint: schemas in docs/schemas before code. Link: probe scripts green. Architect: one SOP per system in docs/sops, atomic modules with headless tests. Stylize: `npm run verify` and a critic pass before merge. Trigger: Vercel on main; repair loop writes lessons into the SOP.

## Specifics
- Stack: Three.js 0.185, TypeScript, Vite, pmndrs postprocessing, Supabase Edge Function, Vercel.
- Kinematic kart controller only; no rigid-body vehicle physics. The track spline drives every race system. Fixed timestep. Under 100 draw calls.
- Read docs/design.md before gameplay work. refs/ is read-only. Never edit CREDITS.md licences.
- Never add Nintendo names, assets or look-alikes.

## Definition of done
Live URL, 60 fps, a full Knockout playable end to end, leaderboard accepts a score, red-team clean.

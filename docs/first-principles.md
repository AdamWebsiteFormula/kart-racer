# First-principles pass (Level 7, Playbook A) — 5 Sept 2026

Run before any code. Every requirement carries a person's name or it is an assumption.

## Step 1 — Requirements and their owners
| Requirement | Owner | Verdict |
|---|---|---|
| Playable from a link; "if we can't play it, it doesn't count" | Jack (competition post) | Keep |
| Submission = Skool post + 60 s Loom + repo/live link, by 30 Sept | Jack | Keep |
| "The one the judges kept playing" (Best Game) | Jack | Keep → replayability is a requirement |
| "An idea nobody saw coming, and it works" (Most Creative) | Jack | Keep → one legible twist |
| "Best art, UI, sound and polish" (Eye Candy) | Jack | Keep |
| "Highest replay value" (One More Go) | Jack | Keep → leaderboard + daily seed |
| Similar to Mario Kart World, not a narrow gimmick | Adam | Keep |
| Original everything, no Nintendo IP | Adam | Keep |
| Feels like a store-bought game, all best practices | Adam | Keep the *feel*; the "all" is an assumption → replaced by the definition of done |
| Built Jack's way, end to end | Adam | Keep (process, not scope) |
| 3D | Adam | Keep |
| 24 racers like MKW | nobody | Delete → 8 |
| Open world / intermissions / Free Roam | nobody (and reviewers hated them) | Delete |
| 30 tracks, 50 characters, 40 vehicles | nobody | Delete → 6–8 tracks, 8 racers, 3 archetypes |
| Online multiplayer | nobody | Delete (leaderboard gives the social loop) |
| Rail grind / wall ride / charge jump | nobody | Delete from v1; one trick surface is a stretch |
| Character customisation, stickers, unlock roulette | nobody | Delete |
| Mobile touch controls | Adam? (judges play on laptops) | Defer to day 22; keyboard + gamepad first |
| Split-screen | nobody | Stretch only |
| Rewind | nobody | Defer; cheap if time allows |
| AI 3D-generated characters | nobody | Delete; kitbash CC0 + hand-modelled tweaks |

## Step 2 — Delete pile (expect to add ~10% back)
Deleted: 24 racers, open world, intermissions, Free Roam, online multiplayer, 30 tracks, roster bloat, customisation, stickers, random unlocks, rail/wall/charge tricks, AI-generated characters, per-track intro cinematics, voice lines, a story mode, cloud saves, a track editor.
Expected re-adds (the 10%): rewind (if trivial), one trick surface on the finale track, touch controls.

## Step 3 — Simplify what survived
- One kart controller, one spline system, one item slot, one HUD layout, one art style, one audio bus graph.
- 8 tracks becomes **6 tracks in 2 cups of 3** if day 13 is behind; Knockout recombines them so it still feels like a full game.
- 3 archetypes × ~3 skins = 8 racers with **one** rig style (blobby body, 2–3 bones).

## Step 4 — Accelerate the loop
- Build sessions are one system per window. `/new-track` and `/tune-kart` skills make tracks and tuning a one-prompt loop.
- The longest wait is art. Mitigation: Kenney/Quaternius kits, palette swaps, and a Design Loop critique per biome rather than per prop.

## Step 5 — Automate last
Nightly verify routine, Supabase keep-alive, Vercel on push. Nothing else.

## Step 6 — The naked question
Given: Three.js, 25 part-time days, CC0 kits, three proven reference repos, Claude Code + Codex.
Aim: a browser kart racer judges keep playing after judging.
Constraints: no Nintendo IP, 60 fps on a laptop, playable from a link, submitted with a Loom by 30 Sept.

Boring. Build it.

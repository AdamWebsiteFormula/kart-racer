# Handoff (24 Sept 2026)

Read this first in a new chat, then CLAUDE.md. It carries the state, not the history.

## Where the game stands
- Live: https://adamwebsiteformula.github.io/kart-racer/ (GitHub Pages; CI runs `npm run verify`, then publishes main).
- 784 tests, verify green, at commit bbfa947.
- Done this month: four AI bug hunts (68 bugs fixed), a seam review, and a 35-point detail review. The review covered:
  - camera: 5.5 m back, 2.4 m up, fov 60-66, and rival karts fade near the lens.
  - effects: start lamps count red, red, red, then green.
  - land: verge dressing and Meadow's tree line.
  - sky: lit and shaded horizon rings.
  - text: US spelling and credits.
  - audio: 90 sounds and 7 songs.
- Leaderboard: the submit-score Edge Function is v11 (checker core-d98dd52257a7c509, pinned at commit bbfa947). It refuses a forged time (422). The board is empty: the test scores were deleted.
- The deadline for the "AI Automations with Jack" contest is 30 Sept 2026.

## Adam's rules (all agents)
- **No sound on Adam's machine, ever.** Load the game only with `?mute`, close every tab after a check, and stop any dev server you started. A test page once woke his household at night.
- Music and sound must be at the level of Mario Kart World. **No singing in any song**: ElevenLabs music uses `force_instrumental: true`.
- Use US English in chat and game text: curb, color, harbor.
- Write simply. Give at most 2 options and say which one you would pick. Ask in plain chat (Adam does not want the AskUserQuestion tool).
- Pushing to main is OK. Database changes need Adam's OK first. Deploying the score function was OK'd.
- Never print keys. The ElevenLabs key lives only in `.env.local`.
- Do not change the licences in CREDITS.md.
- No Nintendo names, assets or look-alikes. Pickups are balloons, not boxes.

## Score function: when sim code or track data changes
1. `npm run build:function`. If `public/fn/core-*.js` changes, commit it and push.
2. `node scripts/fn-deploy-entry.mjs`. This prints index.ts, with the import pinned to the jsDelivr URL for that commit.
3. Deploy it through the Supabase connector: deploy_edge_function, project thuvqdejckcphwuooyhx, name submit-score, verify_jwt true.
4. Smoke test: post a forged time. It must come back 422.

## How the work was done
- Parallel builders work in git worktrees (`.claude/worktrees/wf_*`), one group of fixes each. The main session merges them.
- SOP conflicts: keep both sides. Code conflicts: resolve by hand.
- After every merge: `npm run verify`, then commit (`<system>: <what works now>`), push, and watch CI (`gh run watch`).

## Next ideas (the definition of done in CLAUDE.md)
- Performance pass: 60 fps on a mid laptop, under 100 draw calls. Measure with `kart.stats()` in a muted page.
- Red-team the leaderboard and the site.
- A full Knockout run, end to end, in a muted browser check.
- Another fresh-eyes detail review of what a player sees and hears (look only; never play the sound).

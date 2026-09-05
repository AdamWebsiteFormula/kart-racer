# Build ritual — Jack's method, applied to every system

Use this for each system in build order: kart-controller → track-builder → race-manager → ai-driver → items → ui-hud → audio → (Knockout in race-manager) → art-pipeline → vfx-juice → backend-leaderboard → performance → deploy.

One system per window. Fresh session every time. The first prompt is the most important prompt.

## 0. Before the session
- Read `docs/sops/<system>.md` and `docs/design.md` yourself for two minutes so your stated intention is precise.
- Permission mode: **Accept edits** (bypass only for throwaway research sessions).

## 1. Research prompt (parallel sub-agents)
```
We are building the <SYSTEM> for this kart racer. Read docs/design.md, docs/sops/<system>.md and the relevant schema in docs/schemas.

Spin up three sub-agents in parallel:
1. Read refs/turbo-kart-rush/src/<matching folder> and summarise its approach, constants and edge cases.
2. Read refs/Mario-Kart-3.js and refs/Starter-Kit-Racing for the same system and note what they do better or worse.
3. Read the matching sections of docs/research/plan.md and appendix.md and list every tunable, budget and gotcha that applies.

Synthesise the three into docs/sops/<system>.md under a new "## Approach" section: the design we will implement, the module boundaries, the constants, and the tests. Do not write code yet. Ask me anything the design bible doesn't answer.
```

## 2. Plan mode
Toggle plan mode, then:
```
My stated intention is: I am asking you to implement <SYSTEM> because the thing I want to be true is <OUTCOME FROM THE SOP PURPOSE LINE>.
Plan the implementation from the Approach section. Atomic modules, each with a headless test. Surgical: touch only src/<system> and its tests. List files you will create or edit and the order.
```
Spar until the plan is right. If it takes more than three corrections, ask for the prompt back ("give me this prompt such that a new window would understand it") and restart the window with it.

## 3. Build
Exit plan mode; let it run. Commit at every green test with the GitHub CLI:
```
git add -A && git commit -m "<system>: <what works now>"
```
Commits are save states. If a step breaks things, `git checkout -- .` and re-prompt with the failure pasted in.

## 4. Critique loop (nothing merges without it)
```
Create a critique agent. Review your own implementation of <SYSTEM> against docs/sops/<system>.md: constraints, tests, determinism, performance budget. List critical / high / medium / low findings. Fix critical and high, then tag in Codex with a fresh perspective:
codex review --focus "docs/sops/<system>.md constraints and tests" src/<system>
Apply anything Codex finds that you agree with; explain what you rejected and why.
```
For anything visual (art-pipeline, vfx-juice, ui-hud): screenshot and run the Design Loop skill with `docs/bar.md` built from research plan §7.

## 5. Verify and ship the slice
```
npm run verify
```
Green → merge to main → Vercel preview URL → play it for two minutes yourself. If it doesn't feel right, that is a finding; go back to step 4.

## 6. Wrap up
```
/obsidian-wrap-up
```
Then `/compact` or close the window. Add any lesson from a bug to the SOP's "Lessons" section before you leave.

## Skills to create in week 1 (Level 3)
| Skill | What it does |
|---|---|
| `/new-track <id>` | Scaffold a TrackDefinition from the design bible row, open the spline editor session, run the LUT and draw-call tests |
| `/tune-kart` | Edit kart constants, run the headless lap test, report lap time deltas per archetype |
| `/juice-pass <feature>` | Walk the 12-item juice checklist for that feature and implement the missing ones |
| `/perf-check` | Draw calls, frame time on Low/High, bundle size, first-playable time |
| `/critique-code <path>` | The step-4 loop with Codex |
| `/ship` | verify → build → deploy → smoke test the live URL |

## Routines (Level 3)
- Nightly remote routine: run `npm run verify` on main; post green/red + fps + bundle size.
- Every 6 days: ping the Supabase project.

## Before submission (Level 9)
Run the red-team mega-prompt on the repo; squash history if any key ever touched it; confirm RLS, rate limits, spend caps; CREDITS.md complete; README has one factual "inspired by Mario Kart World" sentence and nothing else Nintendo.

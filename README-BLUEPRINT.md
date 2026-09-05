# Blueprint pack — how to use this folder

This is the Blueprint phase of B.L.A.S.T. for the kart racer, produced 5 Sept 2026. No code exists yet by design.

## Where each file goes
| File | Destination |
|---|---|
| `memory-bucket/CLAUDE.md` | `Desktop/All/Memory Folders for AI/Adam_AI_Apps_Memory/Kart Racer/CLAUDE.md` (Type A operating manual) + create an empty `memory/` folder beside it |
| `repo/CLAUDE.md` | Root of the new repo (Type B build instructions, ~200 words) |
| `repo/docs/design.md` | The design bible; source of truth for the world |
| `repo/docs/first-principles.md` | The Level 7 pass and the naked problem statement |
| `repo/docs/schemas/*.schema.json` | The five data shapes; confirmed before any code |
| `repo/docs/sops/*.md` | One SOP per system (A.N.T. Architecture layer); the repair loop writes Lessons here |
| `repo/docs/build-ritual.md` | The per-system research → plan → build → critique → wrap-up loop with the exact prompts |
| research plan + appendix (from the course project) | `repo/docs/research/plan.md` and `appendix.md` |

## Scaffold commands (step 3 of the plan, Section 9.3)
```
cd ~/code
npm create vite@latest kart-racer -- --template vanilla-ts
cd kart-racer && npm i three three-mesh-bvh postprocessing && npm i -D @types/three
mkdir -p docs refs && cp -R <this pack>/repo/* .
git init && git add -A && git commit -m "Blueprint" && gh repo create kart-racer --public --source=. --push
git clone https://github.com/bridge-mind/turbo-kart-rush refs/turbo-kart-rush
git clone https://github.com/Lunakepio/Mario-Kart-3.js refs/Mario-Kart-3.js
git clone https://github.com/mrdoob/Starter-Kit-Racing refs/Starter-Kit-Racing
echo "refs/" >> .gitignore
```
Then in Claude Code: `/init`, and open `docs/build-ritual.md`.

## Blueprint exit criteria (confirm before Link)
- [ ] Type A manual placed in the memory bucket
- [ ] Type B CLAUDE.md in the repo root
- [ ] Design bible read end to end; any disagreement edited in the bible, not in your head
- [ ] Five schemas accepted as the data shapes
- [ ] Repo scaffolded, refs cloned, first commit pushed
Next phase, **Link**: probe scripts for Supabase (insert via function, read via anon key), Vercel/GitHub CLI auth, gltf-transform round-trip, Safari audio unlock. All green before Architect.

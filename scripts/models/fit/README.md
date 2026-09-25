# Racer fitting tools (25 Sept 2026)

Tools used to turn Higgsfield 3D jobs (Meshy v7 rigged drivers, Tripo H3.1 kart bodies and wheels) into the
game's racers from parts (public/models/racers/, src/art-pipeline/rigged.ts). All run in silent headless Chrome.

- `RACERS_DIR`: the work folder (<id>/<part>.glb, sheets, fit.json, out/). Set it for a new session.
- `intake.mjs <id> <driver|body|wheel> <glb url>`: download a finished job, render its sheets; for a driver, the rig test
  (a mirror test of the arm and leg bones); for a wheel, the axle axis and two turned copies (pick the rim face).
- `check.mjs <glb> <out.jpg> [--assemble='{json}'] [--ortho=x|z|rz] [--win=[u,y,half]] [--pose=<js>] [--probe]`:
  four views, or a flat gridded view in metres for measuring hubs, seats, grips, pipes.
- `turn.mjs` (bake a yaw into a wheel), `beak.mjs` (Pip's long beak, skinned to Head), `tailfix.mjs` (Otto's tail on
  the hips), `sheet.py` (stack images; run with ~/.cache/rascal-ear/venv/bin/python).
- `JOBS.md`: every job and image id, and what each fix was. `fit-first-bodies.json`: the first fits (the manifest
  format: seat, grips, feet, steering, exhaust).
- After fitting: optimize, copy to public/models/racers/<id>/, `bash scripts/models/racer-parts.sh <id>` (the triangle
  budget), update manifest.json, `npm run verify`, photograph in the game (the chase camera must show the driver).

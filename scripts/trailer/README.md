# The trailer pipeline

Makes the 54 s promo trailer (1080p60, the title song with the game's own sound effects) from real
gameplay, all silent: the game runs in muted headless Chrome (`?mute`, `--mute-audio`), the sound is
mixed offline, nothing is ever played. First cut 25 Sept 2026 (`rascal-rally-trailer.mp4`).

Settings: `TRAILER_DIR` (the working folder: shots, frames, the mix; default a temp folder) and
`FFMPEG` (an ffmpeg 7 binary; the `rise-render` skill's copy works:
`~/.cache/rise/venv/lib/python3.14/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`).
The Python steps need the ear venv (`~/.cache/rascal-ear/venv/bin/python`: numpy, librosa, soundfile, Pillow).

1. `npm run dev` (port 5173), then film: `node capture.mjs` (course intros, the start, drifts, the loop,
   Final Lap Shifts, the win), `node capture2.mjs` (items used on cue, hero tracking shots beside the
   karts), `node capture3.mjs` (the countdown from the grid and the lamps, the storm and the sunset from
   a hero camera, the podium). `--only=a,b` films just those shots. Stop the dev server after.
2. `python sheet.py <out.jpg> <shot,shot,...>`: contact sheets to pick the moments.
3. `python edl.py`: the edit, written on the title song's measured beat grid (129 BPM, downbeats in `D`):
   cuts, captions, flashes and every sound effect's time. Writes `edl.json`.
4. `python mix.py`: the soundtrack (`soundtrack.wav`): the song, the effects, the music ducked under the
   big ones, a look-ahead limiter at -1 dBFS.
5. `node render.mjs --preview=30` (a frame every 0.5 s to check), then `node render.mjs`: every frame
   drawn by `compositor.html` (the game's fonts, captions, flashes, the logo) and encoded with the sound.
   Before sharing: level the sound to about -15 LUFS and encode yuv420p BT.709 (see the 25 Sept session:
   `volume=<gain>dB`, `-x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709`).
6. `node review.mjs <proxy.mp4> "<question>"`: Gemini Flash watches a small copy and critiques it (fine
   for pacing and pictures; its ear is weak, so check sound claims with `scripts/ear/labels.py`).

# Handoff (28 Sept 2026)

Read this first in a new chat, then CLAUDE.md. It carries the state, not the history.

## 30 Sept 2026, ~09:50 UTC: HANDOFF to a new session (contest deadline: TODAY, 30 Sept 2026) (read this first)

Adam is moving to another Claude account. Everything below is on GitHub; nothing lives only in the old session.

**Live now:** main 0689669, Deploy run 156 green, https://adamwebsiteformula.github.io/kart-racer/ serves the sound
overhaul (108 sounds from the free packs, course ambience beds, unvoiced hits yelp; manifest checked live).
**On branch claude/tender-cray-km9jt6, not live** (main + these): 6c65282 the pre-race fix (below), docs, the kart
job ledger. Ship = fast-forward main to the branch after `npm run verify`, with Adam's OK, then check the Deploy run
(GitHub Actions "Deploy to GitHub Pages") is green and the live bundle changed.

### Access the new session needs (Adam sets these up)
- GitHub: AdamWebsiteFormula/kart-racer (push) and the PRIVATE AdamWebsiteFormula/rascal-sfx-source (the raw sound and
  music packs, 7.6 GB; clone with `--depth 1`; never copy a raw pack file into kart-racer, which is public).
- Higgsfield connector on Adam's account (the kart 3D jobs below live there; 2.3 credits left after Otto's retry).
- Cloud environment network: allow `d8j0ntlcm91z4.cloudfront.net` and `d2ol7oe51mr4n9.cloudfront.net` (Higgsfield's
  result files). Without them the 3D bodies cannot be downloaded and fitted in the cloud (the old session could not).
- Supabase connector only if score code changes (it did not in this work: no CLIENT_VERSION bump, no fn redeploy).
- The ElevenLabs, Gemini and Freesound keys are only in the Mac's .env.local (not needed for the tasks below).

### Open tasks, in the order to do them today
1. **Ship the pre-race fix** (Adam, 30 Sept: "The pre-race part after clicking to race doesn't feel smooth").
   6c65282: main.ts beginRace puts the course card on ink over the menu first and builds the race only after the ink
   has faded in (afterCurtain, CURTAIN_IN 230 ms; intro.css curtain-in 200 ms), because the build held the page
   with the menu frozen and then the card cut in; the intro's clock steps at most 1/30 s a frame (INTRO_STEP) so a
   slow frame slows the flight instead of jumping it. Checked: 693 intro/UI/audio tests, and a muted headless click
   to a race (card on ink 65 ms after the click, then the flight). Not yet run: the full `npm run verify`.
2. **New background music** (Adam, 30 Sept): replace the game's music with the best tracks of TWO packs he put in
   ~/Downloads/rascal-sfx: `Kart Racer (by juanjo_sound).zip` (Juanjo Sound: Champion's Race, Festival Day, Loading 1,
   Standings, Loading 2, Canyon Dash, Festival Night, Event Finished, each also as a seamless loop; licence: games OK,
   no redistributing or remixing as your own, https://juanjosound.itch.io/kart-racer-free-music-pack) and
   `RacingMusicPack.zip` (Fan Zoo Racing Music Pack: 7 seamless-loop racing tracks, a Menu, a Podium and a Credits
   track; check its licence file). First Adam runs the upload script again on the Mac (it skips packs already up):
   `curl -fsSL https://raw.githubusercontent.com/AdamWebsiteFormula/kart-racer/7dd1c63d1aeb138ebda3d26428c776ac1f20ba5a/scripts/upload-sfx-packs.sh | bash`
   then `git -C <rascal-sfx-source clone> pull`. Adam's brief (his words; his message was cut off after course 2, so
   ASK him for courses 3-6 and the menu, podium and credits picks before choosing them):
   "Do not invent Fan Zoo filenames or track names. First inspect the downloaded Fan Zoo folder and identify the exact
   filenames for all 7 racing tracks, Menu, Podium, Credits. Also inspect the Juanjo folder and confirm the exact
   filenames and which files are the seamless-loop versions." Goal: "a bright, premium arcade kart racer: Mario
   Kart-style energy and readability, modern and punchy, colorful and fun, a little cool/edgy, strong bass and drums".
   Avoid: childish/cutesy, cheesy comedy, generic corporate, dark dystopian cyberpunk, grim combat music, vocals.
   "Use BOTH packs. Do not arbitrarily force every track from either pack into the game." Course 1, HARBOUR LOOP
   (game id race-harbour): "JUANJO — FESTIVAL DAY — seamless-loop version ... sunny, immediate, colorful, welcoming,
   energetic ... Do not replace this with a harder Fan Zoo song." Course 2, MEADOW RUN (race-meadow): one of Fan Zoo's
   7 racing tracks for "green farmland, windmills, a storm approaching, fast racing, playful but with some attitude";
   prefer energetic guitar, driving drums, catchy melody, bright 90s-style synth, a little rockier than Harbour Loop;
   avoid the darkest Fan Zoo track, anything futuristic/cyberpunk or too heavy; "document the exact Fan Zoo [filename]".
   How music is wired today: public/audio/manifest.json `music` keys title, race-meadow, race-boardwalk, race-finale,
   race-harbour, race-frost, results (plus `intro:<trackId>` course intro pieces if any), each {url, bpm, ...};
   samples.ts themeForTrack maps a track to its song; the songs' prompts and provenance are in
   scripts/elevenlabs/catalog.ts (SONGS, LYRIA_SONGS, SONG_MOMENT) and src/audio/samples.test.ts holds them to the
   manifest ("no singing" checks, loop and bar measurements) and ui-hud screens.test.ts holds CREDITS.md's
   "Music: N original songs" row to the manifest. So adding the packs' tracks needs: encoded game copies in
   public/audio/music (mp3, the loop versions for race songs), manifest entries with the real bpm, the catalog/test
   provenance extended for licensed tracks (as scripts/sfx did for the packs: see provenance.test.ts NEW_PACKS),
   and CREDITS.md rows for Juanjo Sound and Fan Zoo (new rows only; never edit a licence). Measure bpm and loop
   seams; listen is Adam's job (no sound ever plays on his machine: ?mute, headless --mute-audio).
   **The packs are UP (30 Sept, 09:5x UTC)** in rascal-sfx-source (commit abdb7cd), with these exact files:
   `packs/Kart_Racer__by_juanjo_sound_/` (terms in "Term of Use (Read Me).txt": games OK; no re-upload, remix
   or redistribution as your own, no streaming services, no content ID; "I did not use AI"): full takes and LOOP
   versions, lengths in seconds: "1 Champion's Race (by juanjo_sound).wav" 85.9 / "1 LOOP Champion's Race ..." 41.1;
   "2 Festival Day ..." 73.1 / "2 LOOP Festival Day ..." 36.5; "3 Loading 1 ..." 66.0 / "3 LOOP Loading 1 ..." 28.4;
   "4 Standings ..." 88.8 / "4 LOOP Standings ..." 44.3; "5 Loading 2 ..." 63.0 / "5 LOOP Loading 2 ..." 55.4;
   "6 Canyon Dash ..." 85.6 / "6 LOOP Canyon Dash ..." 42.7; "7 Festival Night ..." 74.9 / "7 LOOP Festival Night ..."
   66.5; "8 Event Finished ..." 93.5 / "8 LOOP Event Finished ..." 46.7 (every name ends " (by juanjo_sound).wav").
   `packs/RacingMusicPack/` (Fan Zoo; NO licence file in the zip: check the pack's own page before shipping):
   "Fast is fast.wav" 81.7, "Hot Rod Hot.wav" 94.0, "Infinity.wav" 62.2, "Night Rockus.wav" 54.9,
   "No shortcut .wav" 101.9 (note the space before .wav), "Panama.wav" 84.7, "Trigger.wav" 78.9 (the seven racing
   tracks by elimination; confirm by listening-free measurement that each loops), "Menu .wav" 16.0 (space before
   .wav), "Podium.wav" 10.0, "Credits.wav" 38.9, and "Racing Sample TRACK.wav" 102.5 (not one of Adam's ten: likely
   the pack's demo; do not use without asking). Nothing measured yet (bpm, loop seams, loudness).
3. **Sleek new kart bodies** (Adam: "The karts all look too cartoony", chose option A, "Those concepts look good").
   Ledger: scripts/models/fit/JOBS.md round 4. Tripo H3.1 bodies DONE (GLB at
   https://d8j0ntlcm91z4.cloudfront.net/user_3HBoHrhFNmtiGAFLQsDMzFxp1zE/hf_20260930_<time>_<job>.glb):
   pip 092920_a892b49a-3a2d-4135-8d85-06d01a471731, nova 092923_927f39ef-29b9-4f2d-964f-543df5420b4c,
   juniper 092925_548c18c7-2f5a-4f87-9fa2-2c4a8af09944, sprocket 092937_42afdd05-ad27-4e5f-8aec-02a95a46f52c,
   boulder 092940_d675e3c2-5b4a-4793-b5bb-b743b89e645f, gus 092942_2e108f60-2996-4d9e-8345-7c84cb644187;
   otto: first job failed (refunded), retry 61ef1936-3d00-47ab-a754-ff7e243b11ea running (find its URL with the
   Higgsfield jobs tools); momo: waits for 9 credits (Tripo from wheel-less image f443e9fa-ff4a-4b09-a5c6-77b1aea0786b,
   standard texture and geometry, PBR). Then per kart: scripts/models/fit/README.md (intake.mjs, check.mjs, the
   viewer's fits): face it (yaw), find its seat, grips, feet, steering wheel, exhaust ports and the four wheel hubs,
   write its public/models/racers/manifest.json `body` entry (keep driver and wheel), `bash
   scripts/models/racer-parts.sh <id>` (body ≤ 8 k triangles), photograph silently in a race (the chase camera must
   show the driver). The wheels should become code-built sporty wheels (low-profile slicks on alloy rims in the
   racer's accent) since the current wheels are fat toy tires; not started. This is several hours of careful work:
   if it cannot be finished well today, ship nothing of it (the current karts stay) rather than half-fitted karts.
4. Smaller open items: requests.md #14 (How to Play: option A recommended, waiting on Adam), #16 (Pip's wing, fixed on
   branch claude/zen-wozniak-mmsgsi bf670d2, not merged), the Mac's music lab branch mac/worktree-agent-a41c157f86f47ce7c
   (superseded if the new packs go in).

### Working with Adam (his standing rules; CLAUDE.md has the rest)
Write simply, US English. At most two options, say which you would pick; ask in plain chat (not the AskUserQuestion
tool). Ship to main only with his OK, then confirm the Deploy run and the live site. Never play sound on his machine
(?mute always, close tabs, stop servers). On his Mac: heavy jobs one at a time (scripts/heavy.sh). Rated G, no
Nintendo names or look-alikes, no singing. Log every request in docs/requests.md as he makes it.

## 30 Sept 2026: the sound overhaul INSTALLED on branch claude/tender-cray-km9jt6, not yet live (read this first)

Adam, 30 Sept: "Let's just go with yes for all" (all 98 files, and the yelp question). approve.py put all 108 recipes in
(approved.ts; every sound in the game is now a recipe from the free packs, none an ElevenLabs take), build.py built them
(public/audio/sfx, built.json), the six course beds are in the manifest, and a hit the barker leaves unvoiced now yelps
(audio.ts tick; before, a racer with recorded hit lines never yelped, and two hits in three were silent). CREDITS.md:
five new pack rows, the sound count on the recipes row, the ElevenLabs sound row reworded as the earlier sounds (licence
columns untouched); Kenney and VSCO rows kept though no shipped sound draws on them now. docs/contest-entry.md updated.
To ship: Adam's OK, then main takes the branch and Deploy (sounds only: no score-core change, no CLIENT_VERSION bump).

### Before: 98 candidates waiting on Adam's ears

Adam: "The existing sounds on the game are super cheap. I need a complete sound effects overhaul." Free packs only
(the $19 SilverPlatter Go Karts pack only if the drift or engines sound cheap to him). His packs are in the PRIVATE repo
AdamWebsiteFormula/rascal-sfx-source (7.6 GB, uploaded by scripts/upload-sfx-packs.sh from his Mac; never copy a raw
file into this public repo). Candidates, all on branch claude/tender-cray-km9jt6: scripts/sfx/cands-items.ts (01-21),
cands-engine.ts (22b), cands-drive.ts (23-28), cands-boost.ts (29-40), cands-ui.ts (41-55), cands-ambience.ts (56-61:
a quiet loop per course, request #11), cands-world.ts (62-78: surfaces and hazards), cands-rest.ts (79-98: stings, the
eight horns, spin-out, goose, crab, sky whale, yeti). Adam got an old-then-new mp3 of each (numbered as above; made in
the session's .review/, not in git). Every sound in the game now has a candidate. The eight hit yelps have candidates
too (cands-rest.ts) but were not sent: audio.ts skips a racer's yelp whenever they have recorded hit lines (all eight
do), though the line is said only one hit in three, so a yelp never plays. Question for Adam: let the yelp play on
the hits with no line?

**To install what Adam passes** (his "yes" per number): `python3 scripts/sfx/approve.py --verdict "Adam, <date>, by
ear: <his words>" <ids>` (records the verdict in approved.ts, where recipes.ts takes each candidate in its id's place;
moves an ElevenLabs prompt to REPLACED; lists a new sound (a course loop) in the manifest and MOMENT; adds the CREDITS
row of each pack first used and the sound count), then `RASCAL_SFX_PACKS=<clone of rascal-sfx-source>/packs python3
scripts/sfx/build.py <ids>`, then the full gate. Dry-run on a throwaway worktree 30 Sept: 595 audio and UI tests green.
Then fix by hand the CREDITS "Sound effects: N original sounds ... made with ElevenLabs" row's words (the count is kept)
and docs/contest-entry.md if it says every sound is ElevenLabs'. Ship only with Adam's OK.

**Course loops:** the game now plays the manifest's `amb-<trackId>` quietly under a race when it lists one
(samples.ts SampleBank.bed: only the raced course's is fetched and kept, never at the start; audio.ts, AUDIO.ambience
0.2). None is listed yet, so nothing plays until Adam passes 56-61.

## 29 Sept 2026, 14:00 EDT: the Mac's work is LIVE (main 174e970, Deploy run 154 green, submit-score v23 probed) (read this first)

Shipped with Adam's OK ("Yes, ship it"): the live bundle (index-BNXb1bzu.js) carries the new item names, the voice cut and CLIENT_VERSION 10; submit-score v23 imports core-ea7dc08e377167ec pinned at 9ffc6c0 (jsDelivr's copy checked byte for byte); the probe: a v9 post 400 "please reload the game: new version", a never-finishing v10 log 422 "the replay never reached the finish line". The item pictures were re-rendered in the cloud (the Mac never had). What follows is how it was merged.

### Merged on branch claude/tender-cray-km9jt6

Adam ran scripts/save-mac-work.sh; the Mac's work came up as mac/* and mac-wip/* branches, and this branch merges the finished game work: the drift arc, tricks and shadows, landmarks round 2, race dressing and road surfaces, the title camera and front shot and turning windmills, the pre-race music, the Broadcast type (Mona Sans), three item slots, the glass slots, the new item set (names, models, effects; ids unchanged), the heavy-job rule, Pip's wing fix; plus fewer voice lines (about 3 a race). CLIENT_VERSION 10 (three slots, the drift arc, each racer's own line), score core core-ea7dc08e377167ec. Checked in the cloud: tsc, 2370 tests, vite build, bundle 618 KB gzipped. Gates recalibrated with measurements (ai-driver SOP, 29 Sept).
**Not merged (need Adam's ears):** the music lab (mac/worktree-agent-a41c157f86f47ce7c), the sound lab (mac/worktree-agent-a83db92ee7f6b6303), the sci-fi item sound candidates (mac/worktree-agent-a0b61ed0157348242): tools and drafts, nothing picked. The new items still play the old items' sounds. Old branches in mac/* (pbr-default, blinks a72eb189, accd644b, adaba84c, ac8e6d7d review doc) are history, not work to merge.

## 29 Sept 2026: the Mac's work since 28 Sept, 12:36 EDT is NOT on GitHub (read this first)

The Broadcast fonts (Adam's pick), music before the race, new items and item slots, the wider drift, tricks and shadows, race dressing and roads, the title camera, Mesa Rush's landmarks, and new course music and sounds were all built or started by helpers on the Mac. The weekly limit stopped the Mac session before it joined or pushed any of it. The full list and each item's state are in docs/requests.md; add every new request there as it is made. To bring the work up, run `scripts/save-mac-work.sh` on the Mac (it pushes branches mac/* and mac-wip/*, and changes nothing on the Mac).

## 29 Sept 2026: each racer's own stats LIVE (PR #1 merged, submit-score v22, probed) (read this first)

Adam (cloud session): "No 2 racers should have the exact same stat." Racers of a class had shared their stats in their own karts (the Racer screen's Y stats showed three identical lights, three mediums, two heavies). Now kart.schema.json `racerStats` gives each racer but Juniper one balanced trade on their class (one step of one stat for one of another, equal in lap time, weight untouched; the table is in design §4), and karts.ts combines class + touch + (kart − own kart). No two racers share speed, accel and handling, in their own karts or side by side in any kart (karts.test.ts). Checked: verify green (2154 tests); the kart gate 51 totals, worst 2.85% from a track's median, 3.37% from the racer's own kart, 1.40% on the mean (limit 1.5%), no claw rescue in 918 runs; the class gate at 150cc and 100cc. Two tests recalibrated with measurements (both reported to Adam): AI gate 2's ceiling 8 -> 9 s (on 27 Sept's sim it passed by 0.03 s on one AI personality; ai-driver SOP), and the parked yeti's threat check races up to 12 seeds (it caught somebody in 3 of 12 races before, 1 of 12 now). A sim change: CLIENT_VERSION 9, core rebuilt (core-23878056ac57f901, committed on the branch).
**To ship (Adam's OK first):** main takes the branch and is pushed; Deploy green; the live bundle checked; then at once `node scripts/fn-deploy-entry.mjs` -> the Supabase connector, submit-score v22; the live probe (a v8 post 400, a v9 never-finishing log 422). The game and the function go live together: until v22 is up, the live function (v21) refuses every v9 post ("please reload"). From the cloud this needs three hosts allowed in the environment's network settings: adamwebsiteformula.github.io (the live check), cdn.jsdelivr.net (fn-deploy-entry's byte check) and thuvqdejckcphwuooyhx.supabase.co (the probe); or ship from the Mac.
**Also on the branch (a fresh-eyes tour of silent stills, 28-29 Sept; every menu and dialog, a race on each track with its Final Lap Shift, a whole Grand Prix to the podium, a Knockout to its first cut: 0 page errors, 0 audio contexts, draw calls 50-92):** the results show the player's lap times whole on a laptop (1280x720 cut them in half); the podium's headline steps out of the frame during the close shots, so the cup over the winner shows; dev `kart.race` from inside a race starts with a fresh HUD (it showed the last race's FINAL LAP). ui-hud SOP, 28 Sept. verify green (2155 tests).
**Open from the tour:** Pip on his Parcel Scooter (the Mode and Kart screens' hero, three-quarters from the front) seems to hold a wing over his face: the scooter's grips are at his chest, but his wing feathers fan up from the hands. A hand pitch (`RACER_POSES.pip.turns`, both hands 70 degrees about x) made no clear difference in software-GL stills, so it was reverted; the feathers may be skinned to the forearms. Worth a close-up session on the Mac (kart.photo round his kart).
Also from the podium check: the winner's low close shot hid Nova behind her Comet Pod's nose (only her antennae showed). **Fixed on this branch, 29 Sept:** a kart whose front rises over its driver gets its podium close shots round toward its side and higher (`PODIUM.deep`, vfx-juice SOP); stills with Nova 1st and 2nd show her face, arms and the cup. At the shot's first instant she is still crouched, before her cheer starts.
The tour scripts (silent: ?mute, --mute-audio, the leaderboard blocked, frames stepped by hand) are not in the repo; the cloud notes above say how.
**From the chat (29 Sept):** Adam has sound effects on his Mac that he believes are Apple's, probably GarageBand's (not sure). GarageBand and Logic content is royalty-free inside your own work, but not to hand out as the raw files. So change each sound (trim, layer, re-pitch) before it ships, and add a new CREDITS.md row without touching the existing licences. The Mac's system alert sounds (/System/Library/Sounds) are out. To use them from the cloud: Adam zips the chosen files to Google Drive and names the zip. None were in Drive on 29 Sept. Adam: "continue either way".
**From the chat (28 Sept, evening):** Adam: "Still no sound packs." He asked whether the Canva connector is used (no: the session only reported it disconnected), whether Firecrawl needs credits (not for now: one live-page check costs 1 credit) and whether a cloud session can reach his Mac for the voice keys (no: they are only in the Mac's .env.local, so Nova's rocket-start line is a Mac job unless GEMINI_API_KEY is added to the cloud environment). He also asked whether the cloud session has all the context on what he wants: the docs carry what was written down; the local chat after round 4 went live (12:36 EDT) is not in the repo.

## Live at 28 Sept 2026, 12:36 EDT: round 4 (the sections below are older)

main bad8b6a is live (Deploy run 151 green). Checked from a cloud session at 15:40 EDT: the live page serves index-DTMsISR1.js and index-thuL9OBv.css, the same names a local `vite build --base=/kart-racer/` of bad8b6a makes, and it opens on the new start screen. Round 4 is Adam's 28 Sept feedback plus the fresh-eyes review's last nits:
- "So corny!": no STRIKE! word on the Strike Ball's burst (512da25).
- "Why on earth is there so much voice narration throughout?": the racers speak at Mario Kart World's moments (picked, a rocket start, every hit, the finish; a trick or a gloat now and then; never a pass, a boost, a lap or a sorry; a rival only when the player's item hits them): 18.4 -> 8.3 lines a race (14d3b24; the census tool, cddd4f2).
- "The game should have music playing here" (the title): a start screen, "Press any key", whose press starts the title music; the song's file comes down while it waits (76813d7, e287a8d).
- "This part should just show the characters, not the karts" (the Racer screen): each racer standing alone, idling in their own temper, with a flourish on show and on a pick; the tiles rendered from the 3D models (6ee0dc7, 0a2121b, 71bb084).
- "The balloons, after they are selected, just appear without any animation. Looks cheap.": a popped balloon blows up again out of its knot with a little sparkle (43cf1d2); the roulette slows to its stop and the item lands in its slot with a bounce, a ring and a shine (f7bceee).
- The review's nits: the podium shot as MKW's (the crane, then 3rd, 2nd and the winner in close shots, the wide sweep; the overlay lights the card of the racer on screen), boost speed lines only on the screen's lower sides, pickup balloons floating on their ribbons, a light rail wherever a course limit stands with nothing on it. Also Frostbite's final lap back under 100 draws (the items in one batch), Nova's and Pip's sad finishes readable, no buried or floating pines.

**Score core unchanged:** `npm run build:function` on bad8b6a still makes core-afee84082edffa47, so submit-score v21 stays (no redeploy).
**Checked on bad8b6a (cloud, 28 Sept):** verify green (2152 tests, 1 skipped; bundle 579 KB gzipped). A silent check in muted headless Chromium on ?mute (0 audio contexts, 0 page errors): the start screen and its press (the title took its menu 14 ms after the key; the logo at the top left, five bands); the Racer screen (Pip, Momo, Nova, Juniper each standing alone, feet and name on one line); a stepped race on Lighthouse Loop, two balloons caught blowing back up (small and pale at 0.05 s, whole and pink at 0.15 s, red by 0.3 s, a sparkle round it) and the item landing held still by still (the bright drop, the ring, the x3 badge, the shine, settled by 0.7 s), draw calls up to 90; the podium's crane, 3rd, 2nd, winner and wide shots.

**Open:**
- Nova's rocket-start line (0 of 6 takes passed; a direction change is next). Big Gus's overtake line no longer matters: since the cut, no racer speaks on a pass.
- Paid sound packs (Adam: "not yet").
- Stats by rider: two racers of one class show the same bars (not raised with Adam yet).
- Gemini credit: check AI Studio's Usage page before the next Gemini job (28 Sept notes below).

**Cloud sessions:** the container's network policy blocks adamwebsiteformula.github.io, so check the live site through Firecrawl (its credits are low) or by comparing a local build's bundle names. scripts/headless/cdp.mjs points at the Mac's Chrome; in the cloud use Playwright's Chromium (/opt/pw-browsers/chromium) with --mute-audio, ?mute and software GL. Software GL draws a frame in 1-2.5 s, so stop the page's loop and step it (kart.step), skipping the draw to fast-forward (swap kart.post.render for a no-op, then put it back); hold a CSS animation still by still with getAnimations(), pause() and currentTime; stills at a device pixel ratio of 2 come out pink there (not the game). There is no .env.local in the cloud: no Gemini, ElevenLabs or Freesound keys.

## Live at 28 Sept 2026, 09:00 EDT

main 512da25 is live (Deploy green, live bundle and voice.json checked): the voices (147 lines), no STRIKE! word on the Strike Ball (Adam: "So corny!"), round 3 (the course limit stretch by stretch as MKW measured, four image-to-3D landmarks), with submit-score v21 (core-afee84082edffa47, CLIENT_VERSION 8). Running: a small builder for Frostbite's final-lap draw calls (101) and Nova's disappointed finish. Open: Big Gus's overtake and Nova's start voice lines; paid sound packs (Adam: "not yet").

## State at 28 Sept 2026, morning (read this first; the sections below are older)

**Voices committed on main, NOT pushed** (35b6683; the `rascal-voice-lines-finish` run, then Adam in chat): public/audio/voice.json and 147 MP3s (2.1 MB): Pip 23, Juniper 23, Sprocket 25, Boulder 22, Momo 17, Otto 16, Nova 12, Big Gus 9. With the list in the build, the Settings Voices row shows. Checked: verify green (2088 tests, bundle 564 KB), silent check in headless muted Chrome (8 racers, 147 files all 200, Voices row, 0 audio contexts, 0 page errors). One push of main ships them, with Adam's OK.
**Two silent moments, Adam's choice ("ship now, fill later"):** Big Gus has no overtake line (0 of 9 takes passed: the judge hears his reads flat) and Nova no start line (0 of 6: "a thrilled burst" against her soft voice). More takes did not help; the next try is a direction change (a per-racer moment style, or a laugh in Gus's overtake lines). Takes and verdicts: ~/.cache/rascal-voice/takes.
**Gemini credit (prepay):** AI Studio, adam@project-go.com, Default Gemini Project (the key ends uM5A). It ran out twice on 28 Sept (402 "Your prepayment credits are depleted"); Adam bought $5 twice (balance $3.53 after the second). Unexplained: after the first $5 (balance $2.89), about $4.36 left the balance while our ledger logged about $0.60. A voice take costs about $0.0005 (96 text and 50 audio tokens), so the judge (gemini-pro-latest, "Latest release of Gemini Pro") may cost more than the $2 and $12 per 1M tokens the ledger assumes, or something outside this Mac uses the account. AI Studio's Usage page shows spend per model: check it before the next Gemini job.
**Judge:** on 28 Sept many Pro requests got 503 (busy) and some hung 5 minutes or more; judge.ts now gives up on a request after 90 s.

## State at 27 Sept 2026, evening (read this first; the sections below are older)

**Pushed** main 6cabc13 (round 2, from the fresh-eyes review docs/research/mkw-gap-review-2026-09-27.md on branch worktree-agent-adaba84c7d987b86f): the chase camera frames the kart like MKW (50-52.5 degree view, 5.6 m back, 2.5 m up; kart ~240 px of 1600 at speed; scripts/headless/chase-look.mjs measures it), kart parts trimmed and small racers seated higher so every racer shows; dimensional countdown/GO!/FINAL LAP/FINISH! banners, a start-lamp board synced to the gantry, glass end screens; contact bursts, wall sparks and hit stars (vfx-juice/contact.ts); Mesa Rush's mine lit on laps 1-2; roadside banks and edge props at the 12 m limit plus road variation (`?noedge` turns the edge off); rivals' pipe flames in one draw (flameBatch.ts), stall smoke, close disappointed-finish framing, PBR Classic/Buggy pictures, the Mode hero fade. Gate 2059 tests; score core unchanged (core-84787ebc941ca90b, submit-score v20 stays); start draw calls 61-94.
**Still open:** the review's item 3 (primitive landmarks: a volcano of cones, drum towers; better models would use ~60 of 202 Higgsfield credits: asked Adam) and item 7 (voices: reschedule `rascal-voice-lines-finish`: asked); Adam asked whether the edge scenery may come closer than 12 m (a sim change: the course limit); Nova's disappointed finish reads weakly from behind her pod; the paid sound packs; the Boardwalk shift's rare 1-pixel NaN (bloom guard holds).
**Merges refused by the classifier:** twice a builder's `git merge` or `git diff` was refused; each time Adam's explicit sentence let the main session do it. Plan for it: ask him first.

## State at 27 Sept 2026, 14:25 EDT (read this first; the sections below are older)

**Live** (main f7b9933, Deploy green, live bundle checked; submit-score v20 with core-84787ebc941ca90b, probed): Adam's 26 Sept list ("the game feels very cheap") is done, all research-backed (sources in each SOP's 26-27 Sept Decisions):
- Menus rebuilt in Mario Kart World's shape: title bands, Mode/Racer/Kart/Cup/Track on a drawn stage, glass tiles, a big 3D hero, real 3D kart pictures (scripts/headless/kart-icons.mjs), stats hidden behind Y and named for the pair ("Momo in the Timber Wagon"), no class words, the cc row under the cups and tracks, dark-glass dialogs.
- The engine revs with the gas on the grid (src/kart-controller/rev.ts shared by sound, rumble and fire), the kart rumbles, the pipes glow and spit fire; a too-early start smokes.
- A trick off any real air (ramps, bumps, vents, crests, ledges; press up to 0.22 s early), the hop takes the road's climb; harder AI per class (100cc a real race, 150cc tough, 50cc friendly; gate 19 in game/difficulty.e2e.test.ts). CLIENT_VERSION 7.
- Happy 1st-3rd, disappointed 4th down (MKW), results beside the racer on wide screens; `kart.finishAs(rank)` in dev.
- Gears instead of coins (Adam: coins are "too much of a copy of Mario Kart"): the sim keeps its coin names.
- Visible sea waves (art-pipeline waterRipples.ts), rain splashes, a wet road and tire spray in Windmill Run's storm.
- 11 sounds rebuilt from free CC0 packs (scripts/sfx recipes + build.py, provenance test): the three boosts, boost pad, spin, koSafe, menu move, sparks, gear pickup, slam, yetiThrow.
- Track names (Adam: "Meadow" too close to Mario Kart): Lighthouse Loop, Windmill Run, Mesa Rush; ids unchanged.
- The Settings Voices row hides until public/audio/voice.json exists.

**Not done / waiting on Adam:**
- **Voice lines:** the 27 Sept runs of `rascal-voice-lines-finish` ran out of the Gemini TTS daily limit (about 36 lines missing: Gus 23, Momo 9, Nova 12; 16 Otto takes unjudged; Gus's lines come out too long). The task was one-time: it needs rescheduling (asked Adam: "Yes: schedule the voice job again for 28 Sept") and a shorter direction for Gus.
- **Better sounds** (engine, bump, wall, hit, hop, land, trick): the free sources did not beat the shipped ones. Adam is deciding on paid packs (docs/research/reports/Pro game sound effect sources.md; my pick ~$175: Shapeforms Complete Collection, Silverplatter Go Karts, Cascadia Racing Sound Pack). The free Sonniss GDC 2026 bundle is approved but the direct server refuses curl (403) and the Google Drive mirror was over quota twice: Adam may click its 5 links (files then in ~/Downloads).
- **Stats by rider:** they change by class (light/medium/heavy); two racers of one class show the same bars. Not raised with Adam yet.

**Running at 14:25:** a polish builder (start draw calls under 100, stall smoke, sad finishes readable on every racer, Classic/Buggy pictures, title-to-Mode fade) and a fresh-eyes review against MKW footage (report: docs/research/mkw-gap-review-2026-09-27.md on its branch).

**How this round was run (reuse it):** one builder per job in its own worktree, then one integrator merges them in a worktree branch, runs the gate, rebuilds the score core and checks the hash, runs silent races; main fast-forwards to it after Adam's sentence; push with the AdamWebsiteFormula credential helper (below); watch the Deploy run; check the live bundle; redeploy submit-score (`node scripts/fn-deploy-entry.mjs` → the Supabase connector) and probe with a v(old) post (400) and a never-finishing v(new) log (422).
**Lessons:** headless checks from parallel builders collided on Chrome's debugging port (one check drove another's race); cdp.mjs now lets Chrome pick its own port. The permission classifier once refused an integrator's `git diff` of one file; the main session resolved that merge only after Adam's explicit OK.

## State at 26 Sept 2026, 12:45 EDT (read this first; the sections below are older)

**Black flashes: fixed and LIVE** (863bc70, 4fec4c7, bf9e01c; Deploy green, the live bundle has the guard). The live game blacked out whole frames 1-5 times per 25 s lap on five of six tracks (a940204, 25 Sept, to 26 Sept 12:10). Cause: `smoothed()` (glb.ts) leaves zero-length normals on millimetre faces of 17 prop models; three's vertex shader normalizes them to NaN, and bloom spreads one NaN pixel over the frame. Fix: `repairZeroNormals`, plus a NaN guard in bloom's threshold shader. Measured in real races: 32 NaN and 14 black frames before, 0 and 0 in about 6,500 frames after. Tool: `node scripts/headless/nan-scan.mjs <url>` (silent).

**Water: reviewed, merged and pushed** (merge 98f665c of `worktree-agent-af056b63ed1f6b863`, round 5 = 8225267; Adam's OK in chat). The water's black frames were the boats' zero normals (above), not the water. Round 5 fixed: boats bobbed on the race clock (now WATER_CLOCK), at full height past the swell's fade, and broke the Low tier's packing; the wave grid could stay culled after a camera cut; Harbor's boats now sit 0.5 m in the water, so the hull shows through; the art-pipeline SOP's Lessons heading is back. Checked: water-look2's cameras 5 times, 0 bad frames (with the normals repaired); Final Lap Shift stills on Harbor (tide +0.7 m) and Boardwalk; see-through works without MSAA (Retina); cost about 0.5 ms a frame (3.8 against 3.4 ms uncapped at 1080p), 60 fps held, 75-87 draw calls. Left: about one NaN pixel per 9,000 frames during Boardwalk's shift (also with the depth copy off, not reproducible on a redraw), harmless under the bloom guard. Merged checks: verify green (1831 tests), 0 glitch frames in 25 s real races on all six tracks (Canyon's only dark frames are its mine tunnel), 0 in three runs of the water cameras and in both sea tracks' Final Lap Shift, 60 fps (80 draw calls).

**Afternoon, live too (1c5340c, Adam's OK):** the kart landing sound is a layered thump plus tire chirp (judge 2/3 -> 8/8); the coin is not a look-alike (measured C6 -> C7 -> G7 against the famous B -> E fourth, notes in docs/sops/audio.md); leaderboard rows show each kart's picture; the ground and road detail maps now load in Firefox and Safari (a 4 x 4 stand-in had fixed the texture's size; art-pipeline Lessons). Checked: a full Knockout both ways (podium, and knocked out), 0 errors; cross-engine sweeps (WebKit desktop and iPhone, Firefox, SwiftShader), all reach the race with 0 page errors. Tools: the sweep needs Playwright; the copy in ~/.npm/_npx/e41f203b7505f1fb works with `executablePath` set to the cached webkit-2359 and firefox-1543 builds, plus a pickKart step (the Kart screen).

**Voice lines:** the scheduled task `rascal-voice-lines-finish` runs once at 27 Sept 03:10 EDT (make, judge, build, verify, silent check, commit on main). It does not push: main is origin/main plus the voice commits (rebased 26 Sept 13:15), so after it runs, one push of main ships the voices.

## State at 26 Sept 2026, 10:45 EDT

**Live** (origin/main `f8bac0b`, Deploy green, live manifest checked): the title's TV camera rides with the leader, left of the menu; 15 judged sound effects (count, go, finalLap, finish, boost3, drift, engine-high, yelp:nova, hop, mouse, boostStart, tierUp, tierUp2, wall, yelp:gus); three Lyria 3.5 songs that beat the old ones twice, blind: Harbor Loop (12.5 s intro once, then a 36-bar loop), Frostbite Pass, Results. A song may name its loop in the manifest (`loop`: bar-aligned seconds). Meadow, Boardwalk, finale and title kept (no take won twice).

**On local main, NOT pushed on purpose** (`c9c31de`, `ecccf5b`, `310e012` and this handoff): racer voice lines ("barks", Adam: "the characters also occasionally make verbal expressions", like MKW). The system is done and tested (src/audio/barks.ts, a Voices slider, a voice bus, a racer's hit line replaces their yelp) but `public/audio/voice.json` is not built yet, so nobody speaks. Push only with voice.json for all 8 racers: a Voices slider with no voices would confuse players.

**Voice lines: finish them** (scripts/voice: catalog.ts lines and directions, generate.ts Gemini TTS, eleven.ts ElevenLabs, judge.ts Pro judge, build.ts → public/audio/voice/*.mp3 + voice.json, likeness.mjs one-clip famous-character check). One source per racer:
- Juniper and Sprocket: ElevenLabs Eleven v3, designed voices (ids in scripts/voice/eleven-voices.json), takes in ~/.cache/rascal-voice/takes-el. All lines pass (23/23, 25/25).
- Boulder: Gemini 3.8 Flash Lite (catalog `model`, `pace` 1.4), takes in ~/.cache/rascal-voice/takes; 22/25 pass (every moment covered; "Rolling!", "Rumble rumble!", "Oof!" left out).
- Pip: Gemini 3.8 Flash; 21/23 pass; `pip-trick-1` "Airmail!" and `pip-hit-1` "Aah, my feathers!" need takes (lines changed today).
- Momo, Nova, Otto, Gus: Gemini 3.8 Flash (Erinome, Aoede, Achird, Algenib), not made yet: the model allows 100 requests a day (resets 03:00 EDT) and 10 a minute. Steps: `node scripts/voice/generate.ts --only=momo,nova,otto,gus,pip --takes=1`, then `node scripts/voice/judge.ts --only=...`, second takes for lines with no take >= 7, then `node scripts/voice/build.ts --from=juniper:eleven,sprocket:eleven,pip:gemini,boulder:gemini,momo:gemini,nova:gemini,otto:gemini,gus:gemini`, a CREDITS row for the voices (new row only), npm run verify, a silent in-game check, push.
- Judge lessons (26 Sept): in a batch the Pro judge has position bias and "resemblance" contagion (it called 12 Pip takes in one batch Toad; one clip a request said none). For any deciding hearing use one clip a request (`judge.ts --batch=1`, `likeness.mjs`), and re-check a batch's famous-character flag before rejecting a take. ElevenLabs Voice Design previews (a list read aloud) score as robotic; judge saved-voice lines instead. Lines like "Wheee!" and "Whoa-whoa-whoa!" were heard as Mario and Crash: the catalog test now bans whee, whoa, yip yip, tubular.

**Water: not merged.** Branch `worktree-agent-af056b63ed1f6b863` (482b497, 0db94d5, 43f6ae5, and a NaN hunt in progress): see-through shallows from a scene-depth copy (no second render), a Gerstner swell (crest up to ~1.05 m), boats bob, per-fragment normals, camera floor over the crests, the Harbor tide raises the waves' base. Blocker: since round 2, the whole 3D view sometimes goes black for a frame (likely a NaN in the HDR buffer spread by bloom). Merge only after repeated checks show zero black frames (`node scripts/headless/water-look.mjs http://localhost:<port>/ <outdir>` on the worktree's dev server, ?mute is automatic) and stills of Harbor's and Boardwalk's Final Lap Shift. The user's top priority for water: objects partly under water must show through it.

**Blinks: rejected, do not merge** branch `worktree-agent-a72eb189e4ecc0d1e`: the eyelids are flat flaps that read as boxes over the eyes up close, and a thin line stays visible when open. Next idea: painted closed-eye texture swaps per racer.

**Accounts:** ElevenLabs key is new and unrestricted (Starter plan, ~21,400 credits left, 3 of 10 voice slots used: Juniper, Momo (unused), Sprocket). Gemini Pro judge: about 160 of 250 used today; resets 03:00 EDT. Higgsfield: 202 credits. GitHub: the Mac's active gh account is now AdamWillingham, which cannot push here; push with `git -c credential.helper= -c "credential.helper=!f() { echo username=x-access-token; echo \"password=$(gh auth token --user AdamWebsiteFormula)\"; }; f" push origin <ref>:main` (do not switch Adam's active account). Adam (26 Sept): when a push fails on the account, just ask him to sign in to the right GitHub account, or use the GitHub Desktop app.

**Answered today:** jumps exist on every track (Harbor 1, Meadow 4, Canyon 5, Frostbite 5, Boardwalk 1, Skyline 1: ramps, hump rows, vents); hop at the lip for a trick and a boost on landing, like MKW; charge jumps left out on purpose.

**Also waiting:** Momo's visible shocks; kart icons on board rows; alt paints on combos; `lap` and a `boost1` retake held back (judge vs local ear); trailer re-cut.


## State at 25 Sept 2026, 19:15 EDT (read this first)

**Model limit:** the account hit its weekly Opus limit at ~15:40 EDT (resets 30 Sept, 20:00 EDT). Opus subagents fail with HTTP 429; helpers run on `model: "sonnet"` (worked all evening) or `"haiku"`.

**Live and checked on the website (Deploy runs green, live bundle inspected):**
- All eight racers are rigged racers from parts, in low-back karts so every driver shows from the chase camera.
- Any racer in any kart is ON (K1-K7): Racer → Kart screen with the 3D racer-in-kart hero and live stat bars; `?nokarts` turns it off. Leaderboard stores the kart (migration kart_id, submit-score v19, CLIENT_VERSION 6).
- The stylized-PBR look is the default (`?look=toon` for the old); karts take the world's light and receive shadows.
- Baked soft shading at load (track-builder/mesh/bake.ts: AO + the fixed sun's shadow into vertex colors; decor receives shadows), MKW-style height haze in each sky's horizon color, ground relief to 320 m, furrowed Meadow fields, hummocked Skyline islands.
- New boost flames and drift sparks; rivals stay solid near the camera like MKW (CAM.kartFade 1.3 m).
- Evening, all live and checked: per-wheel suspension (each wheel follows the road under it; the body tilts a little after it); a thin rim light on racers (RACER_RIM power 5, strength 0.22) so dark racers read at night; the player's own kart and the podium racers keep the PBR lighting (kartMesh.ts clones now keep onBeforeCompile); no crowd spectator stands over water (a test on all six tracks); fps.mjs measures a real race again (5 Enters since the Kart screen). QA pass of every mode with seven combos: zero console errors, steady 60 fps (75 draws, 1.1 M triangles at 1080p on the M4 Pro).
- allocation.test.ts FRAME_GROWTH_BYTES is 96 (no leak: heap flat over 80,000 frames; CI reads ~1.15x the Mac's 59-62 B).

**Waiting:**
1. **Sound judge pass: DONE 26 Sept** (Adam: "you pick the sounds, highest quality"). Pro came back today (33 requests, ~$0.49 in all): the audition pack's sfx-1..4 (NOTES.md §6), the music redone as one-on-one blind compares (last night's 5-way batch was broken — one identical sentence for every song), the runbook's step 2 and step 5 compares, and new takes for the misses. 15 sounds installed (`count`, `go`, `finalLap`, `finish`, `boost3`, `drift`, `engine-high`, `yelp:nova`, `hop`, `mouse`, `boostStart`, `tierUp`, `tierUp2`, `wall`, `yelp:gus`); full details, scores and the music verdicts in docs/sops/audio.md Decisions (26 Sept). **Still open, for whoever picks this up next:**
   - **Music: Adam's call, not installed.** Race-Harbour: Lyria's A take beat the shipped song twice, reproducibly (a real win worth a listen: `~/.cache/rascal-ear/audition-2026-09-25/music/race-A-lyria.mp3`). Title: the shipped song beat every new candidate. A Lyria song would need a new CREDITS.md row (Google Lyria 3.5, Gemini API) if Adam picks one.
   - **Held back on a judge/local-ear disagreement** (a glowing Pro score, but CLAP hears something else): `lap` (kept shipped) and a `boost1`/mini-turbo-tier-1 retake (not installed). Worth Adam's own ear.
   - **Held back on other rules:** `yelp:juniper`, `yelp:boulder`, `horn:momo` (best take fails the local-ear or margin rule); `coin` (still sits close to a known Nintendo sound; today's two new takes are both worse, not a fix).
   - **`land`** (mini-turbo... no, the kart-landing thud): new takes fixed the level (was 22-35 dB under full scale, now full scale) but still don't sound like a tire on asphalt (judge: "still needs replacing"); needs a genuinely different prompt, not just louder.
   - **Not run this pass** (out of scope, not urgent): runbook step 3's report-only judging (`shift`, `koSafe`, the five surface loops, the four songsets `race-frost`/`race-boardwalk`/`race-finale`/`results`) and step 1's Harbour splice (both still staged, ~7-11 Pro requests whenever picked up).
2. **Wheel suspension** (Adam: "Will the wheels have shocks?"): today the body heaves, rolls and pitches on springs and each wheel bobs with it; missing: each wheel following the road under it, and visible shocks squeezing.
3. **Polish:** the Kart screen's 3D hero is small (MKW shows the kart big); a kart icon on board rows; alt paints on combos; the PBR list (faceted low-poly props, far curb stripes, Boardwalk planks and snow roads); Meadow's new fields not yet eyeballed in place.
4. **Trailer re-cut** with the new racers, look and sounds (scripts/trailer/).

**Credits:** Higgsfield ≈ 13 left. Gemini Pro resets 00:00 UTC.


## Where the game stands
- Live: https://adamwebsiteformula.github.io/kart-racer/ (GitHub Pages; CI runs `npm run verify`, then publishes main).
- 1577 tests, verify green (verify also runs the frame budget and the bundle gate).
- Done this month: four AI bug hunts (68 bugs fixed), a seam review, and a 35-point detail review. The review covered:
  - camera: 5.5 m back, 2.4 m up, fov 60-66, and rival karts fade near the lens.
  - effects: start lamps count red, red, red, then green.
  - land: verge dressing and Meadow's tree line.
  - sky: lit and shaded horizon rings.
  - text: US spelling and credits.
  - audio: 102 sounds and 7 songs.
- Leaderboard: the submit-score Edge Function is v17 (checker core-019f61ef2f9600d9, pinned at commit 7ffbba3; unchanged since, `npm run build:function` still makes that same file). It refuses a forged time (422).
- 24 Sept: pickup balloons redrawn as glossy party balloons (not striped beach balls). Red-team 2 fixed: one drive is one run (canonical log, 3 names per client per board), a tighter name filter, capped body read, save records checked entry by entry. A full Knockout ran with no errors (muted). All racers checked: rated G.
- Board hide switch is live: `update public.scores set hidden = true where name = 'X';` takes a row off the board. The rate limit cannot be dodged with fake address headers (tested live).
- The deadline for the "AI Automations with Jack" contest is 30 Sept 2026.

## Done 25 Sept (the MKW-parity /loop, studied against real Mario Kart World footage)
- Tools: `scripts/headless/watch.mjs` (Gemini watches a YouTube video), `frames.mjs` (muted stills from one), `scripts/trailer/` (the promo trailer pipeline; the 54 s trailer is on Adam's Desktop, rascal-rally-share-2026-09-25).
- Race HUD: place numeral colored by place (gold, silver, bronze), racer faces on the minimap, a coin pill, the Knockout goal under the place.
- Results: racer faces in every row; the finish banner readable and gone before the results; Grand Prix standings count up and flip into order with rank arrows; Next track / Race again / Change track / Change racer / Menu after Quick Race, Retry in Time Trial, Race again in the Daily; Time Trial lap splits against your best; a CUT line on the Knockout cut.
- Menus: our own SVG icons (no emoji anywhere), cup emblems, a Settings help line, Auto-accelerate, Steering assist (deterministic: it rewrites the input before it is logged), Fullscreen (row + F key).
- Bugs fixed: cut-off racers' projected times (was "670:07.36"), photo-finish order changing after the banner, a double logo at boot, creatures and props near the lens (clean fade now), the finish camera through balloons, the podium "3" badge, bunting shadow stripes, the dev server's dependency scan and watcher.
- Score function: the core file is rebuilt (`core-8e4365e9b4edf93c`); the live function is still v17 (`core-019f61ef2f9600d9`). Solo verdicts read nothing that changed, so a redeploy is optional.
- The six course creatures are off every track (live 25 Sept 2026, score core client version 5, submit-score v18); README and contest entry updated.

## Pending sound list (26 Sept: the audition pack and the runbook's steps 2 and 5 are done — see docs/sops/audio.md Decisions, 26 Sept, for every score and install; the summary is in "Waiting" item 1 above)
What that pass did not cover, still pending:
- **Report only (runbook step 3, not run — out of my scope this pass, ~7 Pro requests):** `shift`, `koSafe`, the five surface loops, and the songsets race-frost, race-boardwalk, race-finale, results. Runbook: ~/.cache/rascal-ear/pass-2026-09-25/ear3/RUNBOOK-after-2000EDT.md §3.
- **Step 1's Harbour splice (not run, ~2-4 Pro requests):** only worth doing if a Lyria song replaces the Harbour theme (Adam's call, see "Waiting" item 1); the title splice stays skipped either way (Adam decided 25 Sept to keep the "Hey!" shout, option B).
- Skip, still: the six creature sounds (yetiThrow, slam, roar, honk, whaleSong, tailSlap: creatures are parked).
- Tools (outside the repo, ~/.cache/rascal-ear/tools-2026-09-25/): flow.mjs runs whole modes silently with the board blocked (handles the Kart screen: FLOW_URL=http://localhost:<port>/ node flow.mjs outdir knockout:coastline:momo:stomper); soak.mjs a 12-race leak check; sheet.mjs contact sheets from clips; sweep.mjs the cross-browser sweep (needs a pickKart step since the Kart screen). Checked at 3f07902: 60 fps at 1080p also with the CPU slowed 4x; no errors in Safari, Firefox or on an iPhone. Record clips from a separate worktree server (a Vite reload kills a recording).
- The Pro cap resets at 00:00 UTC (20:00 EDT), confirmed again today (33 requests through the morning, none refused): CLAUDE.md's line already says this; nothing to fix.
- **New: `npx` is refused in a worktree-isolated agent** ("too complex to verify it stays inside the worktree"), even for `npx vitest`/`npx tsc` with `node_modules` already present. Fix: `cp -R` (not symlink) `node_modules` from the main checkout into the worktree, then call `./node_modules/.bin/vitest`, `./node_modules/.bin/tsc`, `./node_modules/.bin/vite` directly. `node_modules` and `dist` are gitignored either way.

## Adam's rules (all agents)
- **Everything rated G.** Female racers (Nova, Juniper, Momo) stay fully dressed and modest. Check all new art and prompts.
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
- Another fresh-eyes detail review of what a player sees and hears (look only; never play the sound).

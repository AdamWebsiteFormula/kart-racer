# Adam's requests

Every request Adam makes goes in this list the moment he makes it, with its state, and the list is
pushed. A request that lives only in a chat gets lost: on 29 Sept 2026 a night of work on the Mac
never reached GitHub, and a cloud session could not see that it existed.

States: **live** (on the site), **on the Mac** (built or started in a helper's copy of the code on
Adam's Mac, never pushed), **to do** (not started), **question** (waits on Adam).

## Open (29 Sept 2026; states updated after the Mac's work came up as mac/* branches)

Gathered from the Mac chat (Adam's screenshots and text, 26-29 Sept) and the cloud chats.

| # | Asked | Adam's words | State |
|---|---|---|---|
| 1 | 28 Sept | "The skid turn thing seems to turn too tight compared to Mario Kart World." | live 29 Sept (merged from the Mac, 29 Sept): the arc measured on MKW, 0.96 -> 0.86 rad/s full in |
| 2 | 28 Sept | "The background music just isn't super cool. On the courses." | on the Mac's branch mac/worktree-agent-a41c157f86f47ce7c: a music studio and first drafts of the six themes; nothing picked or installed yet |
| 3 | 28 Sept | "The sound effects are still atrocious." Then, on option B: "Do everything in your power not to make anything sound cheap ... Raise the bar on what you expect from yourself." | candidates on branch claude/tender-cray-km9jt6, waiting on Adam's ears (29 Sept, cloud): from the free packs Adam uploaded to the private repo AdamWebsiteFormula/rascal-sfx-source, 61 old-then-new files sent: items 01-21 (scripts/sfx/cands-items.ts), engine 22b (cands-engine.ts), driving 23-28 (cands-drive.ts), boosts 29-40 (cands-boost.ts), race flow and menus 41-55 (cands-ui.ts). Not yet: fanfares (the music lab's), track hazards, surfaces. SilverPlatter Go Karts ($19) if the drift or engines sound cheap. The Mac's sound lab branches stay unmerged |
| 4 | 28 Sept | "Why do so many of the graphics with the fonts feel outdated and not cool?" | live 29 Sept (merged from the Mac): Mona Sans, style A, every screen |
| 5 | 28 Sept | "There should be music when clicking to start a new race that happens before the race begins, like Mario Kart World does." | live 29 Sept (merged from the Mac): the pick sting, the fly-over plays the start of the course's song till the music lab's intro pieces land |
| 6 | 28 Sept | Fresh-eyes review 2, items 1 and 7: the title's race hides behind the menu; you never see your racer from the front before the countdown | live 29 Sept (merged from the Mac's unsaved work) |
| 7 | 28 Sept | Review 2, items 2 and 3: almost no race dressing (signs, banners, flags); five of six tracks share one gray highway with lane lines | live 29 Sept (merged from the Mac): arrow boards, flags, sponsor boards, banners; a road surface per track |
| 8 | 28 Sept | Review 2, items 4 and 5: tricks barely show (MKW spins the kart); shadows too dark and hard | live 29 Sept (merged from the Mac) |
| 9 | 28 Sept | "yes on the landmark shape improved 3d models" (review 2, item 8; up to 40 Higgsfield credits) | live 29 Sept (merged from the Mac): Mesa Rush's columns and walls, Lighthouse Loop's sea stacks and huts |
| 10 | 28 Sept | Review 2, items 9 and 10: the windmill and the Ferris wheel never turn; on a slow line simple stand-in models show first | live 29 Sept (merged from the Mac's unsaved work): the windmill and Ferris wheel turn; a race waits for its models before it starts |
| 11 | 28 Sept | Quiet sounds for each course: waves, wind, birds, no crowd voices | candidates 56-61 sent 29 Sept (scripts/sfx/cands-ambience.ts, one loop per course); the game has no bed player yet: to build once Adam likes them |
| 12 | 29 Sept | "Some of the weapons/items are downright cheesy. I'm wanting something cool and maybe a little more edgy than Mario Kart World." Ideas: a rocket shot at someone with a cool explosion, a Star Wars style laser gun, a fighter jet in place of "the goofy bowling ball thing" (after MKW's rocket item), a flame thrower or machine gun, or other ideas. "Also, the bubbles that show the items look super goofy instead something cool. And maybe there should be the ability to have up to 3 items instead of just two." "If those changes are huge, we can do them later." | live 29 Sept (merged from the Mac): three slots, glass slots, and the new set (Laser Blaster, Homing Rocket, Oil Slick, Decoy Mine, Shockwave, Energy Shield, Nitro, Triple Nitro, EMP Blast, Jet Mode, Jump Jets, Tractor Beam, Seeker Drone; ids unchanged). Their sounds are still the old items' (the sci-fi candidates wait for Adam's ears) |
| 13 | 29 Sept | "I still hear way too many voices, more than on Mario Kart." (the 28 Sept cut to about 8 lines a race is live) | live 29 Sept: about 3 lines a race (a hit one time in three, no trick, gloat or rival lines) |
| 14 | 28 Sept | How to Play: "Are those controls using best practices? That's an awful lot of buttons to remember." | question: A (the 5 main controls as one simple picture, and a gamepad laid out like MKW's) or B (only tidy the screen); A was recommended |
| 15 | 29 Sept | "It's slowing down my macbook considerably." Kill leftover rascal-ear processes; music made one job at a time, never in parallel | live 29 Sept (merged from the Mac's main) |
| 16 | 29 Sept | Pip's wing feathers over his face on the Parcel Scooter (the cloud tour's open note) | fixed on branch claude/zen-wozniak-mmsgsi (bf670d2), not merged |

Also waiting on Adam: the sound files he may zip to Google Drive (the 29 Sept cloud chat), and a
Gemini key for the cloud sound-pack session.

## Why items 1-12 and 15 are not in the game (29 Sept 2026)

The Mac session builds each job in a helper's own copy of the code (a git worktree), then joins the
finished parts, tests them, asks Adam and pushes. On 29 Sept it hit the account's weekly limit
(resets 30 Sept, 8 PM EDT) before joining or pushing any of this work. So it exists only on the Mac,
and a cloud session sees only GitHub. None of it was written into the repo either, so the cloud chats
worked from the older notes.

To recover it: run `scripts/save-mac-work.sh` on the Mac. It uploads every unpushed branch as
`mac/<branch>` and each copy's unsaved changes as `mac-wip/<branch>`, and changes nothing on the Mac.
Then a session reviews each part, finishes it, tests it and ships it with Adam's OK. The labs' outputs
may sit outside the repo (~/.cache), and the Gemini, ElevenLabs and Freesound keys are only in the
Mac's .env.local, so new music and sounds may still need the Mac.

## Done and live

- 26-27 Sept: menus in MKW's shape, the engine revs and spits fire on the grid, tricks off any air,
  harder AI, happy and sad finishes, gears instead of coins, water and rain, 11 new sounds, the track
  names (Lighthouse Loop, Windmill Run, Mesa Rush), a closer camera, big banners, crash effects,
  roadsides as close as MKW's, 3D landmarks, the racers' voice lines.
- 28 Sept (round 4): no STRIKE! word, voice lines cut from 18 to about 8 a race, a start screen whose
  press starts the title music, a racer screen of the characters alone, balloons that swell back and
  items that land in their slot, a lively podium, no speed lines in the sky, fences where invisible
  walls stood.
- 29 Sept (cloud): no two racers share a stat line, results and podium fixes.

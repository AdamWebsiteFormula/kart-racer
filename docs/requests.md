# Adam's requests

Every request Adam makes goes in this list the moment he makes it, with its state, and the list is
pushed. A request that lives only in a chat gets lost: on 29 Sept 2026 a night of work on the Mac
never reached GitHub, and a cloud session could not see that it existed.

States: **live** (on the site), **on the Mac** (built or started in a helper's copy of the code on
Adam's Mac, never pushed), **to do** (not started), **question** (waits on Adam).

## Open (29 Sept 2026)

Gathered from the Mac chat (Adam's screenshots and text, 26-29 Sept) and the cloud chats.

| # | Asked | Adam's words | State |
|---|---|---|---|
| 1 | 28 Sept | "The skid turn thing seems to turn too tight compared to Mario Kart World." | on the Mac: a helper was measuring MKW's drift and widening ours |
| 2 | 28 Sept | "The background music just isn't super cool. On the courses." | on the Mac: the music lab, new songs in a cooler style (Adam chose option B: no purchase, songs made here) |
| 3 | 28 Sept | "The sound effects are still atrocious." Then, on option B: "Do everything in your power not to make anything sound cheap ... Raise the bar on what you expect from yourself." | on the Mac: the sound lab (CC0 recordings through the Mac's Freesound key, Apple's sound library as ingredients only, sounds built in code) and a listening page for Adam to pick by ear |
| 4 | 28 Sept | "Why do so many of the graphics with the fonts feel outdated and not cool?" | on the Mac: Adam picked style A, Broadcast (big slanted capitals, the logo on a dark slanted panel, no thick black outlines, bigger menus and race numbers); a helper was putting it on every screen |
| 5 | 28 Sept | "There should be music when clicking to start a new race that happens before the race begins, like Mario Kart World does." | on the Mac: music over the course fly-over (the start of each course's song for now), and from the music lab a 6 s and a 2.5 s intro piece per course |
| 6 | 28 Sept | Fresh-eyes review 2, items 1 and 7: the title's race hides behind the menu; you never see your racer from the front before the countdown | on the Mac: the title camera and front shot helper |
| 7 | 28 Sept | Review 2, items 2 and 3: almost no race dressing (signs, banners, flags); five of six tracks share one gray highway with lane lines | on the Mac: the race dressing and roads helper |
| 8 | 28 Sept | Review 2, items 4 and 5: tricks barely show (MKW spins the kart); shadows too dark and hard | on the Mac, finished and tested, "not live yet": full flips and spins, a move of each racer's own, always landing upright into the boost; softer, lighter shadows and a soft shadow under each kart's wheels; 60 fps |
| 9 | 28 Sept | "yes on the landmark shape improved 3d models" (review 2, item 8; up to 40 Higgsfield credits) | on the Mac: Mesa Rush's striped drums and cushion walls became rock towers and layered canyon walls (a before/after was sent); Lighthouse Loop's sea rocks and huts: unknown |
| 10 | 28 Sept | Review 2, items 9 and 10: the windmill and the Ferris wheel never turn; on a slow line simple stand-in models show first | to do (no helper was named for them) |
| 11 | 28 Sept | Quiet sounds for each course: waves, wind, birds, no crowd voices | on the Mac: the sound lab |
| 12 | 29 Sept | "Some of the weapons/items are downright cheesy. I'm wanting something cool and maybe a little more edgy than Mario Kart World." Ideas: a rocket shot at someone with a cool explosion, a Star Wars style laser gun, a fighter jet in place of "the goofy bowling ball thing" (after MKW's rocket item), a flame thrower or machine gun, or other ideas. "Also, the bubbles that show the items look super goofy instead something cool. And maybe there should be the ability to have up to 3 items instead of just two." "If those changes are huge, we can do them later." | on the Mac: research done, a helper was building new items and item slots (its last note: "Lighter mine smoke; icon slick film, deeper EMP, cyan pulse, tractor angle"); it was waiting in line for its tests when the limit hit. This overturns design §8's 23 Sept rule (no literal rocket or bullet); Adam's G rating still holds |
| 13 | 29 Sept | "I still hear way too many voices, more than on Mario Kart." (the 28 Sept cut to about 8 lines a race is live) | to do |
| 14 | 28 Sept | How to Play: "Are those controls using best practices? That's an awful lot of buttons to remember." | question: A (the 5 main controls as one simple picture, and a gamepad laid out like MKW's) or B (only tidy the screen); A was recommended |
| 15 | 29 Sept | "It's slowing down my macbook considerably." Kill leftover rascal-ear processes; music made one job at a time, never in parallel | on the Mac: a one-heavy-job-at-a-time lock (heavy.sh) and 7 lines in CLAUDE.md, not committed on the Mac's main |
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

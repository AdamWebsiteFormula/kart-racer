# Racer rebuild: Higgsfield job ledger (25 Sept 2026)

Pipeline per racer: A-pose character image (gpt_image_2_5, 0.25) → Meshy v7 image-to-3D textured + a-pose + rigging (44);
empty kart image → wheel-less body image + one wheel image (0.25 each) → Tripo H3.1 detailed (12 each).
Downloads: https://d8j0ntlcm91z4.cloudfront.net/user_3HBoHrhFNmtiGAFLQsDMzFxp1zE/<result>. Local: scratchpad/racers/<id>/.
Optimize: npx --yes @gltf-transform/cli@4 optimize in out --texture-compress webp --texture-size 1024 --compress quantize --simplify false
Assemble/check: scratchpad/racers/check.mjs + viewer.html (--assemble, --pose, --split, --pieces).

| racer | char img | body img | wheel img | 3D char | 3D body | 3D wheel | status |
|---|---|---|---|---|---|---|---|
| juniper | 2bef6acc | 5416fee1 | 4a172777 | b54f9ef6 | 6719e90b | e3b6afae | in repo (public/models/racers/juniper) |
| pip | 14d09ba2 → be9ff255 (no satchel, clean wings, long beak) | 6bcc87e7 | fe4265d3 (holes) | 655bfb04 (wing bones wrong: redo from be9ff255) | a2a64985 (ok: wheels go outboard at x ±0.665) | 05d1c6a0 (turned to X: pip/wheel-x.glb) | driver redo waits for credits |
| boulder | 6ad140b7 | 6bfc5dfc → 72531dd7 (open straight arches) | 9473fc2c | 554328c4 (rig ok) | 92c236f0 (fake wheels, front-left turned: redo from 72531dd7) | 91b479c9 (turned to X: boulder/wheel-x.glb) | body redo waits for credits |
| momo | 8203b948 | ec7da6bd | 08339281 | - | - | - | waiting for credits |
| nova | c1cbb039 → 0cea2744 (wings tucked, safer rig) | 9d4c0576 | ea496f7a (stars) | - | - | - | waiting for credits |
| otto | 23f12988 | 56601560 | 1489101e | - | - | - | waiting for credits |
| sprocket | a6231afe | bddd597d | 7d9b097d | - | - | - | waiting for credits |
| gus | 7ef99db2 | 38aac37c | 639c5358 | - | - | - | waiting for credits |

Empty-kart images: pip 5eb490fb, momo f2ca5f75, nova cc4e3048, otto cef509fe, sprocket 510cac1e, boulder 3136c66f, gus 5dc6eaf5, juniper c9009b8c.
Concept uploads: juniper aa8ced40, pip 181f1622, momo a3a36dde, nova 89370808, otto c5720f60, sprocket d48e10de, boulder 78671439, gus a965a6b2.
Rig check: node check.mjs x out.jpg --assemble='{"driver":...}' --ortho=z --probe --pose=<SkeletonHelper>. Tripo wheels come with the axle on Z: tools/turn.mjs bakes a yaw so the axle is X, the rim face +X.
Credits: start 257.9; 8.65 at 11:50 (25 Sept). Need ≈ 396: pip driver 44, boulder body 12, momo/nova/otto/sprocket/gus 68 each.
 after Juniper 176.65; after Pip+Boulder 3D ≈ 33. Need ≈ 340 for momo, nova, otto, sprocket, gus (68 each).

## Round 2 (25 Sept, 12:20 EDT, after Adam's 500-credit top-up): 17 jobs, ids in jobs-2.json
pip driver redo, boulder body redo, and momo/nova/otto/sprocket/gus driver + body + wheel. Expected spend 396.
Round 2 results (12:45 EDT): all drivers pass the rig test (tools/intake.mjs) except the old Pip. New Pip (1d72444e) ok (wing tips 7 cm uneven, fine); his beak came out short again, so tools/beak.mjs adds a 0.235-long cone skinned to Head (pip/driver.glb; the Meshy original is pip/driver-nobeak.glb).
Bodies facing: juniper, pip, boulder, nova, sprocket, gus raw +X (yaw -1.5708); momo, otto raw +Z (yaw 0). Every kart has rear pipes except the first new Nova body (95dea80c: thruster facing sideways, front arch closed) -> new image 68428603 (rear 3/4 view, nozzle straight back) -> Tripo 55f68955 (running).
Wheels: momo, nova, gus axle on X already (rim +X); otto, sprocket axle on Z (wheel-xp/xm.glb made; pick the rim face).

## Fit (25 Sept, afternoon): all eight seated and measured
Nova's new body (Tripo 55f68955: nozzle straight back, four open pods) taken in as nova/body.glb (the old one is nova/body-old-1.glb).
fit.json: all eight in the game's manifest format (Juniper = the live entry, unchanged). out/<id>/: web-optimized driver/body/wheel (webp 1024, quantized, not simplified).
Proof: <id>/fit-review.jpg per racer, fit-all-chase.jpg (the game camera for all). Seating is the game's own IK (viewer.html seatIK mirrors rigged.ts seatDriver, SEATED defaults).
Changes to models: Otto's tail was skinned to his left thigh (it swung through the hull when seated): tools/tailfix.mjs moved it to Hips and turned it up 60° (otto/driver-tail.glb, source of out/otto/driver.glb).
Gus's body sits 2.9° skewed in the Tripo file: yaw -1.5208 (not -1.5708) squares it. Pip needs a head turn (RACER_POSES pip: turns [['Head','x',-22]], in poses.json) or his beak goes through the handlebar stem.
Tools: tools/run.mjs (one silent headless Chrome per script), views.mjs, proof.mjs, tailfix.mjs; viewer.html gained seatIK, marks, ortho2, persp, ray/profile, hole/mouth/pipeAxis, steerFit/rimScan/steerCut/steerOpt, stub, wheelClash, contact.

## Round 3 (25 Sept, ~15:00 EDT): low-back bodies so every driver shows from the chase camera
In the game's chase view (5.5 m back, 2.4 m up) Gus hid behind his truck box, Pip behind his parcel box, Momo behind her engine, Juniper behind her spare tire, Boulder and Sprocket behind stacks/key, Nova behind her pod. New images: "nothing behind or beside the seat rises above the top of the seat's backrest" (and "EMPTY, no driver": the image model put people in Momo's, Sprocket's and Nova's first takes).
| racer | new body image | Tripo body job |
|---|---|---|
| juniper | 123deed7 (spare tire on the side) | 5120d0c5-3cf4-4eeb-bd84-552bb0a4d7b0 |
| pip | 4cf0821d (parcel box on a front rack) | 94239ea7-af13-4cc9-9db7-3ce59c38c83d |
| boulder | a4e3157f (short pipes at the back corners) | 03a14638-f2bb-4ca9-b936-833f37b5d901 |
| gus | a776adf7 (low food cart, small awning) | dfe21192-711b-4da9-a670-f6ebf91ad3ee |
| momo | ff6bee1f (low flat engine) | 3a6499ff-4689-4393-8b38-87cb7190fa42 |
| sprocket | ba2fe9f5 (small low key) | f723306a-fb42-4892-8b5a-f0d99bae426b |
| nova | 021cd772 (small low nozzle) | 765d7fee-0d88-4b3d-8b1d-ab1db30ca93e |
Otto keeps his body. The drivers and wheels stay.

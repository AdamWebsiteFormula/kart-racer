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

## Round 4 (30 Sept 2026): sleek, sporty bodies (Adam: "The karts all look too cartoony", then option A)
Concept images (gpt_image_2_5 medium, 0.5 each, from each kart's menu art as the layout reference: "a sleek, sporty
racing kart for a premium modern 3D kart racing game ... not toy-like, not clay, not chubby", empty, nothing behind the
seat above its backrest, three-quarter front view): waiting on Adam's pick. Next per kart: a wheel-less body image from
the picked concept (open, empty arches), then Tripo H3.1 (about 9 each). The wheels become code-built sporty wheels
(low-profile slicks on alloy rims), not Tripo jobs. This cloud session cannot download from d8j0ntlcm91z4.cloudfront.net
(network policy), so fitting needs that host allowed or a Mac session.
| racer | concept image job |
|---|---|
| pip | 659cb301-bb61-49f5-b97d-14b56a9b0dca |
| momo | e207f1a0-0fb4-4a1d-93bd-18b1009251ca |
| nova | e5290215-f644-4ada-806f-da45c0caa335 |
| juniper | 2dabc8d4-2210-480d-8654-1ddb4331bcc2 |
| otto | e479b375-610e-4633-b860-8d60c92e7de4 |
| sprocket | cbad7656-6263-4525-99c6-257aefb73463 |
| boulder | 3cf7879d-be32-4cb5-8112-7e10a6c86380 |
| gus | e825af32-607f-4e81-8cc4-80f6e270a754 |
Adam, 30 Sept: "Those concepts look good." Wheel-less body images (gpt_image_2_5 medium, from each concept: "all four
wheels and tires completely removed ... empty, open wheel arches") and Tripo H3.1 bodies (standard texture and geometry,
PBR, 9 credits each). Momo waits for credits (65.3 left before these, Adam will add more): her concept is e207f1a0,
her wheel-less image f443e9fa-ff4a-4b09-a5c6-77b1aea0786b is made.
| racer | wheel-less image | Tripo body job |
|---|---|---|
| pip | 3f88d0e3-928f-410a-909e-c809d75050b5 | a892b49a-3a2d-4135-8d85-06d01a471731 |
| nova | cf5af3ac-64aa-440d-b0d4-af11a0cec6b8 | 927f39ef-29b9-4f2d-964f-543df5420b4c |
| juniper | 63ee9360-12ce-433c-8653-d822ffc14cdd | 548c18c7-2f5a-4f87-9fa2-2c4a8af09944 |
| otto | 531b3cf3-5ba8-4d10-82aa-afac528d1295 | fc5bba5d-ae15-453b-a743-cfd36a35af0e |
| sprocket | f1bd743e-fcdb-469d-8dd0-e460989dacd7 | 42afdd05-ad27-4e5f-8aec-02a95a46f52c |
| boulder | a6054806-3470-4c86-b1ed-4ba77d2ff6ea | d675e3c2-5b4a-4793-b5bb-b743b89e645f |
| gus | 4898be5a-4c07-47be-9c47-1f6d7b2fb4cf | 2e108f60-2996-4d9e-8345-7c84cb644187 |
| momo | f443e9fa-ff4a-4b09-a5c6-77b1aea0786b | (waits for credits) |

## 30 Sept 2026 (new session, bonus credits)
| racer | job | what |
|---|---|---|
| momo | 0115ef26-d1d6-4ea4-b8b5-73dd79d8944f | Tripo body, completed |
| otto | f586aad7-6a2d-4ead-9354-f8a4f209b799 | wheel-less image, checked: no wheels, whole kart in frame |
| otto | 860d0e34-df20-423d-bb3b-06c15ee96ebd | Tripo H3.1 body, started (standard, PBR) |

## Characters tweak, step 1 (30 Sept 2026): sleeker concept images (gpt_image_2_5 medium, 2:3, edited from each char img)
| racer | edited from | concept job |
|---|---|---|
| pip | be9ff255 | 5fdfd373-9c17-455b-a08d-41ac42ae420a |
| momo | 8203b948 | e3a8b51f-eafd-4004-a0f8-dac08a3ff925 |
| nova | 0cea2744 | 4b6de0e5-94d5-4ddc-b9fb-17ec19ee3108 |
| juniper | 2bef6acc | 79204d6f-d5e2-40fd-9901-a4eac0a8110f |
| otto | 23f12988 | 5ac47326-c116-4262-93f5-e38f2f05c3ee |
| sprocket | a6231afe | 75ed76f5-76b3-4c4f-8d10-f46aabe23193 |
| boulder | 6ad140b7 | d457adc2-bb1e-46fa-91ac-93b068750438 (first try hit a 429, no credit taken) |
| gus | 7ef99db2 | 45cca5db-58f3-4609-80bc-4a09855b8d3a |

Round 2 concepts (Adam's notes: Sprocket no key on back, no head antenna, worn sci-fi utility droid in gunmetal/off-white with red and black; Otto leather jacket + cool hat + pants + earring; edgier faces, no cheesy smiles; Pip a cool sci-fi animated-series look; Gus mobster suit; Boulder huge muscles). Latest per racer:
| racer | latest concept job |
|---|---|
| pip | 81c7e65b-8206-4245-a96b-82f28ae49807 |
| momo | d32e1cf3-a4d2-4e12-92da-cd831c07be45 |
| nova | 14bac0da-f1ec-4263-bc25-c2192b81f0a1 |
| juniper | 64c39a8d-06e7-40e2-981d-d5e04c07314c |
| otto | 704c74b7-746c-415d-a0c7-a0c4a6ff5004 (cap backwards; before: c2130ade-3912-4ec6-965a-0a5f7de0928e) (jacket/hat base 30a6b301-825f-4944-8cd9-d617013d1ff6) |
| sprocket | c13e2d11-b2b3-4da3-904c-acb6441ac0a0 (via 9b8a5fea, da19566d, be663d44) |
| boulder | 6ce3b270-e4db-4785-bf22-7e4167abb6db (with pants; before: 439ac85a-3386-4195-897e-aa75043a7305) (muscles 9a39a0d3 + the sport-pad outfit from d457adc2, via 5a27aefa) |
| gus | f0952277-437a-4aaa-91e5-add5e1634509 (via c854e6a4) |

## Characters tweak, step 2 (30 Sept 2026): Meshy v7 drivers (meshy_v7_image_to_3d, textured, a-pose, rigged, 44 credits each)
Adam approved all eight concepts ("Go"). Credits fit five tonight, submitted riskiest rigs first. Not fitted into the game yet.
| racer | concept image | Meshy driver job |
|---|---|---|
| pip | 81c7e65b-8206-4245-a96b-82f28ae49807 | 6be97642-8c92-454f-95ba-2549a5d7ffbc |
| nova | 14bac0da-f1ec-4263-bc25-c2192b81f0a1 | b018b1ca-6604-4ca3-8e56-e2cc3895c8a5 |
| sprocket | c13e2d11-b2b3-4da3-904c-acb6441ac0a0 | f3152b02-d3cf-4bde-908d-c19dbb3a923b |
| otto | 704c74b7-746c-415d-a0c7-a0c4a6ff5004 | 4af61e4c-5560-4f65-a021-442286296490 |
| boulder | 6ce3b270-e4db-4785-bf22-7e4167abb6db | 8971aed8-75b5-4258-85bd-5702428802e8 |
| momo | d32e1cf3-a4d2-4e12-92da-cd831c07be45 | 44ac626c-bd7a-46a2-a096-71d3b76b377a |
| juniper | 64c39a8d-06e7-40e2-981d-d5e04c07314c | 9c9ebe88-3b9d-4b85-adff-20ca2daa7816 |
| gus | f0952277-437a-4aaa-91e5-add5e1634509 | 5d86cc63-de3a-4413-9541-fe3a812ecbd1 |
Rule from the handoff: all eight must match in style, so ship none of them into the game unless all eight are fitted.
Adam OK'd Fan Zoo for the game (30 Sept, chat); no licence file in the pack.

## Kart fitting (30 Sept 2026, afternoon): the sleek bodies go in
All nine earlier jobs finished: Otto's Tripo body 860d0e34 and the eight Meshy drivers (not fitted yet).
Wheels are code-built now (scripts/models/fit/wheelgen.mjs), not Tripo. Bodies simplified to about 7.5k triangles.
Adam, 30 Sept: one kart is a chopper-style (four wheels), for Otto; not black (Gus's is black), a dark color that fits his outfit.
Adam, 30 Sept: "The Walrus's ride should look like a mobster vehicle".
| racer | image | Tripo body job | note |
|---|---|---|---|
| otto | a71c8bcb-fed8-4845-8d63-2fe9f3015dfb (chopper, sky blue) | 251955c8-e5fa-4d8c-ab7b-03219f6ded75 | superseded by the dark recolor |
| otto | f87a2f70-7175-40ec-8e3e-a22ad33b6049 (black recolor) | - | not used (Gus's kart is black) |
| otto | 5d5cbacc-312d-4b87-a0dc-df5b71f1c14f (midnight blue, red pinstripes) | 4b4b8bba-97ef-4887-a7af-1320f5271908 | the one to fit |
| gus | d4df875f-d08d-4b6d-a068-ef5c6c6a484f (1930s mobster roadster, black and red) | a4e41ac9-8ef0-485c-8a50-56627549d9fc | replaces the food-truck body 2e108f60 |

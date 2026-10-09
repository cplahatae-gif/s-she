# Walking sprite v2 generation record

Generated 2026-10-09 with built-in image_gen, transparent_background=true. No CLI fallback or raster transformation was used. Existing worker-walk.png and identity sheet are preserved.

Selected output: assets/worker-walk-v2.png
Source: C:/Users/admin/.codex/generated_images/01a11ed3-cb9b-7dc2-ad3b-e86ef9916a6e/exec-86f5a49d-1706-486e-bf2a-13cee8cbdf83.png

References:
- Attempt 1: C:/dev/S-SHE/권기봉/초안/assets/worker-walk.png (walking/style identity), C:/dev/S-SHE/assets/images/character-sheets/sheet-02-40s.png (identity).
- Attempt 2: C:/Users/admin/.codex/generated_images/01a11ed3-cb9b-7dc2-ad3b-e86ef9916a6e/exec-f79f3e81-1965-4b73-bfd7-4b4bdbcd2ef0.png (gait correction).
- Selected attempt 3: C:/dev/S-SHE/assets/images/character-sheets/sheet-02-40s.png only (fresh walk based on identity).

## Validation and limitations

Selected PNG is RGBA 1659×948; alpha extrema 0–255; 1,201,918 fully transparent pixels of 1,572,732 total (76.42%). Four columns and two rows use rounded integer boundaries because the generator did not return requested 1792×1024. Cell widths are 415,415,414,415; heights 474. Alpha>32 bounds fit every cell, full boots and helmets visible. No source image resize/crop/transparency editing was performed.

The selected sheet improves opposite arm swings and has distinct support/swing occlusion across both halves. It is a short walking cycle. Passing knees are bent with the lower leg trailing; up poses have a low airborne front boot but relatively extended knees. These subtleties require actual animation review, and static frames alone do not establish a natural finished walk.

anchorX is measured at the pelvis/waist silhouette, not the extremity of a boot. The per-cell horizontal body drift is corrected by anchors. footY is the bottom planted-boot baseline in local cell coordinates. bodyHeight is alpha>32 vertical extent. strideLength330 is an approximate full cycle distance (about twice the contact heel spacing, in source pixels) for short walking strides and should be evaluated in animation. The older sheet's first 627×627 cell remains the idle (pelvis anchorX363, footY620, bodyHeight594).

| Frame | Phase | Rect x,y,w,h | Pelvis anchorX | Ground footY | Body height | Alpha bbox x,y,w,h |
|---|---|---|---|---|---|---|
|0|left-contact|0,0,415,474|231|456|445|102,11,259,445|
|1|left-down|415,0,415,474|210|454|442|94,12,215,442|
|2|left-passing|830,0,414,474|190|456|444|112,12,140,444|
|3|left-up|1244,0,415,474|166|457|445|66,12,258,445|
|4|right-contact|0,474,415,474|228|449|444|95,5,275,444|
|5|right-down|415,474,415,474|209|449|442|100,7,204,442|
|6|right-passing|830,474,414,474|195|451|445|134,6,143,445|
|7|right-up|1244,474,415,474|175|448|442|60,6,261,442|

## Exact prompts

### Attempt 1 (not selected)

```text
Use case: identity-preserve.
Asset type: transparent production sprite sheet for a natural continuous walking animation, not a character lineup.
Input image 1 is the current walking sprite sheet: preserve its Korean man, clothing, red belt padlock with blank white tag, silhouette, realism and warm right-side rim light. Input image 2 is his 40s character identity sheet, supporting facial/clothing reference only.
Rebuild ONLY the walking cycle as exactly EIGHT full-body frames in a precise equal-cell 4-column by 2-row sheet, all right-facing strict orthographic SIDE PROFILE, camera never turns. Suggested landscape canvas 1792 x 1024, equal cells 448 x 512. Every figure entirely inside its cell with transparent margin around helmet, both hands and boots. The virtual body-root / pelvis is on EXACTLY the same center vertical line in every cell. Same figure scale, height, proportions, helmet height, backlighting and wardrobe throughout, natural small vertical torso bob under 1% of height.
Read frame order left to right top row then bottom row: 1 LEFT CONTACT (left heel forward touches ground, right foot behind on toe); 2 LEFT DOWN / RECOIL (left foot flat supports weight, knee flexes, rear right heel lifts); 3 LEFT PASSING (left stance leg vertical under pelvis, right bent knee swings forward past it); 4 LEFT UP (left supporting leg extends behind on toe, right thigh forward with bent knee, right heel preparing forward); 5 RIGHT CONTACT (right heel forward touches ground, left foot behind on toe); 6 RIGHT DOWN / RECOIL (right foot flat supports weight, knee flexes, rear left heel lifts); 7 RIGHT PASSING (right stance leg vertical under pelvis, left bent knee swings forward past it); 8 RIGHT UP (right supporting leg extends behind on toe, left thigh forward with bent knee, left heel preparing forward). This is a calm normal adult walk, moderate stride, never marching or running. Each successive leg drawing differs smoothly; contact -> down -> passing -> up -> opposite contact. Distinguish NEAR left leg and FAR right leg with physically correct occlusion in side profile, never identical duplicate poses for opposite contact. Arms swing gently opposite legs with relaxed slightly bent elbows; keep glove anatomy normal. Keep spine/head steady, body weight convincing, knees bend, boot soles articulate heel-to-toe. All grounded boots meet the same bottom baseline in each cell; lifted boot clearance is natural.
Subject: one same Korean male industrial worker in his 40s, white scuffed hard hat, navy work coverall, yellow high-visibility vest with silver reflective strips, gray gloves, brown safety boots, red belt lock with blank white hanging safety tag. Face right-facing profile with the same calm focused expression in every frame.
Style: detailed realistic game sprite photographic cutout matching references, muted workwear, warm right backlight.
Background: GENUINELY TRANSPARENT RGBA alpha, absolutely no floor, floor shadow, white/black canvas, checkerboard painted background, grid, cell borders, labels, numbers, words, typography, logos, watermarks. Do not include an idle stance anywhere in these eight frames. No off-cell pixels; no clipping/cropped feet or helmet.
```

### Attempt 2 (not selected)

```text
Use case: identity-preserve. Revise the attached 8-frame WALK CYCLE sheet to correct ONE problem: the physical gait order is currently wrong and the second half repeats the same near-side arm and leg. Keep the SAME man, head, detailed clothing, side profile camera, skin, blank safety tag and warm rim lighting.
This is a technical animation sprite asset, exact 4 columns x 2 rows with eight equal rectangular cells. Make the canvas exact 1792x1024 pixels (divisible by 4 horizontally and by 2 vertically), each cell448x512, and leave at least 18 transparent pixels ABOVE helmet, BELOW lowest boot, LEFT and RIGHT extremes inside every cell. Do not crop sheet down to its artwork bounds. Transparent empty gutter/margins are necessary technical part of the sheet. Same figure scale in all eight cells, same pelvis x-coordinate at cell center.
Correct natural moderate walking with calm torso and a 1%-height vertical bob max. Frame1 near LEFT leg forward straight but relaxed heel touching, far RIGHT leg backward on toe, near LEFT arm BACKWARD, far RIGHT arm forward. Frame2 near LEFT front foot fully planted and knee slightly bent under load, far RIGHT trailing foot begins lifting. Near LEFT arm still backward but moving toward neutral. Frame3 near LEFT leg vertical SUPPORTING, far RIGHT thigh is moving forward with bent knee and boot raised; near LEFT arm neutral. Frame4 near LEFT leg now BACKWARD and extends onto toe; far RIGHT leg swings FORWARD with knee moderately bent and heel clear of ground; near LEFT arm swings FORWARD.
Frame5 reverse of frame1: near LEFT leg BACKWARD on toe, far RIGHT leg FORWARD heel touching, near LEFT arm FORWARD, far RIGHT arm backward. THIS MUST VISIBLY DIFFER from frame1, because near left leg and arm are at opposite side of stride. Frame6 far RIGHT front foot planted, near LEFT trailing knee now bending and boot lifts behind; near LEFT arm forward toward neutral. Frame7 far RIGHT leg vertical SUPPORTING while near LEFT thigh swings forward with bent knee and raised boot; near LEFT arm neutral. Frame8 far RIGHT leg BACKWARD on toe, near LEFT leg swings forward with moderate knee bend and airborne heel approaching contact; near LEFT arm swings BACKWARD. This leads smoothly back to frame1.
Use near-side left leg and left arm occlusion consistently. Do not mistake opposite walking phases for same duplicated drawings. up poses4/8 must have BENT swing knee, not almost extended contact leg! Frame2/6 clearly intermediate between contacts and passing; no standing idle, no jumping, no high-knee marching, no running. Shoulder/hip/head stable. Arms counter-swing opposite same-side leg; hands never stretched far in front like reaching.
All eight characters entirely inside each equal cell. Orthographic right-facing profile for every frame. Real RGBA transparent background, no white/black painted backdrop, no drawn checkerboard, no floor, shadows, labels, numbers, guides, cell borders, text, logos or watermarks.
```

### Attempt 3 (selected)

```text
Use case: identity-preserve. Input is a CHARACTER IDENTITY reference only. Produce a NEW genuine anatomical WALK CYCLE sprite sheet for this same Korean industrial worker, never a lineup, all right-facing strict SIDE PROFILE.
Exactly eight full-body cutout figures, four columns two rows, transparent RGBA background. Read order row1 left to right then row2 left to right. Each equal cell has same scale, same head/hip horizontal position, same planted-foot baseline, clear transparent margins on every side. Suggested1792x1024 canvas. Face/body camera always sideways right, same yellow vest/navy workwear, white hardhat, gloves/brown boots, a little red belt padlock and a blank white hanging tag. Realistic rendered game sprites matching reference, warm right rim light. Every body fully in frame.
PRIMARY REQUIREMENT: the TWO ROWS must show OPPOSITE NEAR-SIDE LIMB SWINGS. Top row starts with NEAR VISIBLE LEG FORWARD toward right and NEAR VISIBLE ARM BACKWARD toward left. Bottom row starts with NEAR VISIBLE LEG BACKWARD toward left and NEAR VISIBLE ARM FORWARD toward right. Opposite legs occlude correctly. Same-side hand always swings OPPOSITE same-side foot. This must be obvious from silhouette and overlapping garments. Do NOT duplicate top row in bottom row.
Simple SHORT STEPS, slow relaxed normal worker walk. Never high kick, long lunge, run or march. Torso/head steady, only subtle bob. All pelvis centers sit on cell center vertical line.
Top row1 contact: visible near leg forward-right, heel down; far leg behind-left, toe down. Near glove behind-left of hip.
Top row2 down: near forward foot flat beneath its knee, supporting knee flexes a little; far trailing foot starts lifting; near glove starts returning toward hip.
Top row3 passing: near support leg almost vertical, far swing knee bends LOW and passes forward, far boot airborne just above ankle height; near glove roughly beside hip.
Top row4 up: near support leg backward-left, heel lifted and toe supports; far swing leg moves forward-right with LOW BENT KNEE, ankle airborne and heel preparing next step. Near glove now in front-right of hip.
Bottom row1 contact: NEAR VISIBLE LEG BACKWARD-LEFT, heel lifted / toe grounded. FAR LEG FORWARD-RIGHT, heel grounded. NEAR GLOVE FORWARD-RIGHT of hip. Clear opposite of top row1.
Bottom row2 down: far forward foot flat supporting weight; NEAR leg trailing behind now folds knee, boot lifted behind-left; NEAR glove moves back toward hip.
Bottom row3 passing: far support leg vertical; NEAR visible knee bent LOW moves forward past far leg, boot airborne. NEAR glove alongside hip.
Bottom row4 up: far support leg backward on toe; NEAR visible leg forward with LOW BENT KNEE, heel airborne preparing contact. NEAR glove moves behind-left of hip. Next step is top row1.
Keep facial identity, clothing shape, proportions, lighting and ortho profile consistent. Full boots must fit inside cells. Real transparent RGBA alpha only: no backdrop, floor, cast shadow, labels, captions, numbers, drawn grid, guides, checkerboard, text, watermarks or logos.
```

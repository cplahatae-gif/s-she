# 몰입도 개선 이미지 자산 v3

생성 모드: Codex 내장 `image_gen` (`transparent_background: true`). CLI/API/별도 설치 사용 없음. 원본 이미지와 앞선 자산은 유지했다. 실제 픽셀은 생성 출력 그대로 복사했다.

- `worker-actions-v3.png`: 1774 × 887 RGBA, 8개 오른쪽 방향 행동 자세.
- `equipment-v3.png`: 1536 × 1024 RGBA, 조작반·MCC·개인잠금·태그.
- `action-assets.json`: 실제 atlas crop, 발 접지점, 신체 기준 높이, 손·장비 조작점.

## 행동 시트

입력 1: `assets/images/character-sheets/sheet-02-40s.png` — 인물·복장 참조.
입력 2: `권기봉/초안/assets/stage-background.png` — 조명·소재 참조.
입력 3: `권기봉/초안/assets/worker-walk-v2.png` — 측면 방향·신체 크기 참조.

최초 프롬프트:

```text
Use case: photorealistic-natural. Asset type: production transparent game character action sprite sheet, 4 columns by 2 rows, exactly 8 equal rectangular cells on a wide 2:1 canvas.
Input images: Image 1 is identity and clothing reference only, Image 2 is industrial late-afternoon lighting reference only, Image 3 is canonical anatomy scale and right-facing side-view reference. Generate a new sheet, do not composite the factory or its floor.
Subject: the same middle-aged Korean male factory worker, white hardhat, navy work shirt and cargo trousers, yellow reflective vest, brown safety boots, work gloves. Anatomical proportions, height, head, face, clothing and camera view consistent across all 8 cells. True lateral right-facing full-body view, mild photographic depth; no front-facing poses.
Composition: one complete worker per cell. Four columns and two rows, cell margins and no overlap. SAME anatomical scale in every cell: standing body approximately 85% of the cell height, all boot soles at 93% of their cell height. Crouching workers remain at the same anatomical scale and become physically shorter; never enlarge crouching bodies. Keep all hats, hands and boots inside each cell. Transparent background alpha, no scenery, no floor, no cast shadows, no checkerboard drawn into pixels, no labels or outlines.
Exactly these poses, row-major:
1. RADIO: standing relaxed, holding a small real black handheld radio directly in front of mouth with right gloved hand, thumb on transmit switch.
2. PRESS: standing, right arm extended forward horizontally at chest height, index finger pressing an invisible control in front of him; other arm relaxed.
3. LOCK: standing, right and left hands together extended in front of waist/chest, fitting a small red personal padlock onto an invisible cabinet hasp.
4. TAG: standing, both hands carefully attaching a cream warning tag with red border to the same invisible hasp at chest height.
5. TRYOUT: standing, right index finger pressing an invisible start button at lower chest height, body cautiously leaning forward a little and looking at the control.
6. CLEANUP: deep balanced crouch or kneel, boots grounded, right hand reaching forward at shin height to retrieve a small dark cloth scrap using a short grabbing tool, left hand stabilizing on bent knee.
7. UNSAFE: crouching and leaning too far forward, right arm reaching outward at shin height with open hand into an invisible conveyor; left hand on knee. No injury.
8. RECOIL: startled defensive reaction, one short step back, torso leaning away left, hands drawn back toward chest, looking right in alarm; boot soles still visible and grounded. No gore.
Style: highly realistic photographic cutout with natural folds, believable fingers, believable joint poses, sharp alpha edges, subdued warm sunlight from upper right matching industrial reference. Avoid cartoon, vector, stylized 3D toy, dramatic glow, motion blur, text, extra people, duplicate limbs.
```

최초 출력: `C:/Users/admin/.codex/generated_images/01a11ef7-cbdf-75e3-b087-563716bc076b/exec-b528cbf0-505f-4be3-a32b-05279b9e2fbc.png`.

위/아래 행 경계에 발이 겹쳐 보여 한 차례 배치 보정. 보정 입력은 최초 출력 이미지만이며, 선택한 최종 출력은 `C:/Users/admin/.codex/generated_images/01a11ef7-cbdf-75e3-b087-563716bc076b/exec-37da0efb-fcba-4546-bb31-def1740e2a92.png`.

보정 프롬프트:

```text
Use case: precise-object-edit. Edit target: supplied 8-pose worker action sprite sheet. Fix only its cell layout and anatomical scale. Preserve the worker identity, clothes, right-facing photographic style and the exact 8 poses and their order. Make actual alpha transparency; remove every colored halo, background haze and cast shadow.
Strict 4-column 2-row equal grid. Canvas wide2:1. A single complete worker cutout in every cell. Each cell width exactlyonequartercanvaswidth, each cellheight exactlyonehalfcanvasheight. There must be a CLEAR TRANSPARENT horizontal gutter between the rows; upper row boots never cross canvas halfway line. All four upper-row worker heads start at5%cellheight and boot soles endat93%cellheight. Lower row soles alsoat93%localcellheight. Top row occupies onlyTOPHALF. Bottom row onlyBOTTOMHALF. SAME anatomicalscale all8poses: the standing radio worker, pressing worker, lock worker, tag worker, tryout worker and recoil worker all match standingbodyheight~88%cellheight. Crouch and unsafe poses must have the same headsize/limbsize as standingposes and merely occupy lower60%ofthecell, with hats below40%cellheight and bootsat93%. Keep full bodies and all feet, hands and objects within eachcell.
Row1lefttoright: radio, pressing, attachingredpadlock, attachingcreamtag.
Row2lefttoright: tryoutpress, crouchedcleanupwithshortgrabbingtool, unsafeoverreachcrouch, startleddefensivebackstep.
No new pose, no equipment, no floor, no text, no borders. Fix completebodyspacing notjustcropboots.
```

생성기는 행 높이를 정확히 절반으로 맞추지 않았다. 이미지 편집으로 발을 자르거나 픽셀을 변형하지 않고, 각 실제 자세를 명시적 crop rect로 분리한다. 논리적 배열은 4 × 2이고 상단478px·하단409px 범위를 사용한다. 위험 손 뻗기 자세의 손끝이 넓어 해당 프레임은463px, 후퇴 자세는x1400 시작374px crop이다. 모든 자세는 canonical standingHeight450을 사용하여 쪼그린 자세가 서 있는 키로 확대되지 않게 한다. tryout/recoil은 상체 기울기와 발 벌림으로 실제 높이가 낮아져도 신체 기준 축척은 유지한다.

## 장비 시트

입력: `권기봉/초안/assets/stage-background.png` — 조명·재질 참조이며 수정 대상은 아님.

출력: `C:/Users/admin/.codex/generated_images/01a11ef7-cbdf-75e3-b087-563716bc076b/exec-1f3f88ac-a692-4320-8031-7a2db70f3a2e.png`.

프롬프트:

```text
Use case: product-mockup. Asset type: transparent photorealistic industrial equipment game sprite sheet. Input reference is lighting/material reference only, not an edit target. New 2x2 sheet, exactly four equal cells, one isolated item per cell in row-major order.
Actual transparent alpha background. No floor, cast shadow, scenery, people, text labels, diagram or cell borders. Equipment photographed as full visible cutouts from straight frontal view with slight right-side depth, realistic metal, natural wear and subdued warm upper-right sunset lighting matching reference. No cartoon, vector, stylized 3D toys or sci-fi decoration.
Top left: complete floor-mounted industrial CONTROL PEDESTAL, waist-high steel square cabinet on narrow tubular column with heavy small base feet. Vertical face with one physical red mushroom stop button at upper left, one green start pushbutton at upper right and small yellow/amber signal indicator below. Metal grey, dusty and slightly weathered. All buttons clearly readable in shape, no written text or logos. Height about85% of cell, centered, floor contacts at93%.
Top right: complete closed floor-standing MCC motor control cabinet, rectangular grey steel double-height enclosure with small support feet, external black rotary energy isolator handle mounted aroundlowerchestheight on door, clear lockable metal hasp beside handle, latch and hinges. Do not open cabinet or expose live internal wires. Black rotary handle in off position downward. Height85% of cell, centered, floor contacts93%. Real motor isolation cabinet, not a household breaker box.
Bottom left: large close-up red personal safety padlock with metal U-shaped shackle in CLOSED position, a small key next to it but separated clearly, realistic moldedredbody and silvermetal. Centered in cell with comfortable transparent margins.
Bottom right: single cream rectangular durable lockout warningtag with red perimeter border and metal top eyelet threaded by small thin silver wire attachment loop. Large blank cream center with several short grey writingguide lines nearbottom, no generatedletters. Frontview. Centered, comfortabletransparentmargins.
Items stay fully within their owncells; do not repeat objects. Strict equal2x2 spacing.
```

## 검사

Pillow12.3의 읽기 전용 alpha 검사로 RGBA와 실제 투명 픽셀을 확인했다. 원본 해상도와 alpha는 유지했다. 작업자 alpha 범위0–255, 장비0–254. 장비 외부 배경 좌표(0,0),(100,100),(700,300),(700,500),(900,100),(200,100),(768,200),(900,400),(100,450),(700,800),(900,800),(400,500),(200,250)의 alpha는 모두0이다. 장비 전체의 완전 투명 픽셀1,194,500개, alpha1–15의 경계33,136개, alpha16–63의 경계2,799개다. 이미지 보기 도구에서 배경 빛무리가 보일 수 있지만 해당 배경 RGB는 alpha0이므로 게임에서 렌더되지 않는다.

작업자 접지점과 손 조작점은 alpha경계와 시각 검사로 기록했다. 장비 frame의 부착점은 실제 사진 속 버튼·외부 절연 조작기·hasp·태그 eyelet 위치에 맞춘다. padlock crop은 별도로 찍힌 key를 제외하여 장면에 열쇠가 자물쇠와 붙어 떠다니지 않게 한다.

LSP biome는 설치되지 않았고 기존 사용자 설치 거절을 유지했다. JSON 파싱·이미지 치수·metadata frame 범위 검사를 수행한다.


## 이물질 실사 컷아웃 추가

생성 모드: 내장 imagegen, transparent_background=true. 입력 `권기봉/초안/assets/stage-background.png`는 따뜻한 현장 조명과 산업 소재 참조이며 수정 대상은 아님.

저장: `debris-v3.png` (2172 × 724 RGBA). 생성 원본: `C:/Users/admin/.codex/generated_images/01a11ef7-cbdf-75e3-b087-563716bc076b/exec-5a24e022-2c76-4a70-a50e-921fc49fce82.png`.

정확한 프롬프트:

```text
Use case: photorealistic-natural. Asset type: one transparent game prop cutout, industrial debris under a conveyor, landscape low-profile silhouette.
Input image role: industrial side-view sunset scene for warm upper-right lighting and worn materials only. Do not copy its floor, conveyor or environment.
Primary request: an irregular small pile made mainly of a crumpled dirty charcoal-grey industrial rag, with one short weathered wood splinter partially caught in its folded fabric and a few tiny dust clumps clinging directly to the cloth. Plausibly found under a factory belt conveyor. Natural frayed fabric threads and gritty creases, subdued charcoal and brown, no neat geometric blocks, no perfectly stacked pieces. Entire object photorealistic, not cartoon/vector.
Camera: true side-on low-angle industrial photograph, slight visible top surface, complete small object centered with comfortable transparent margins, width roughlythree times height. Low profile, compact, nonsymmetrical. Upper-right warm sunlight with realistic material shading within the object only.
Actual transparent alpha outside the rag and splinter. No floor or plate, no cast shadow, no background haze, no gradient, no checkerboard pixels, no human, no hand, no tools, no machinery, no loose debris scattered away from the object, no letters or labels. A single realistic rag pile on a clean transparent canvas.
```

읽기 전용 alpha 측정: 범위0–255, alpha≥64의 보이는 경계(113,95,2062,646), 실제 높이551px, 완전투명909,378px. 대표 배경(0,0),(100,100),(100,600),(1500,100)의 alpha모두0. 중심 anchorX1087, 접지footY646. 전체PNG 원본을 그대로 보존했으며 이미지 픽셀 편집/잘라내기 없음. 코드 다각형 이물질을 대신하는 실제 구겨진 천·작은 목재조각 사진 자산이다.

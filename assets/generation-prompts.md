# 초안 이미지 생성 기록

- 생성일: 2026-10-09 (Asia/Seoul)
- 방식: built-in `image_gen`; 배경은 opaque, 작업자 시트는 `transparent_background: true`.
- 사용: 현장과 보행을 보여 주는 플레이 가능한 교육 초안. 실제 공장의 차단 위치·절차를 승인하거나 검증한 도면이 아니다.
- 공장 전체뷰 원본은 수정하지 않았다.
- 래스터 편집·크롭·색 보정 프로그램을 사용하지 않았다. 생성 결과를 그대로 복사했다. Pillow는 크기·alpha·프레임 경계 확인에만 사용했다.

## 입력 참조

1. `assets/images/scene-start-candidates/start-04-wide-route.png`: 배경 편집 대상. 원래 인물 제거와 수평 동선 확장.
2. `assets/images/character-candidates/candidate-02-40s.png`: 동일 40대 한국인 작업자의 얼굴·신체·복장 참조.
3. `assets/images/character-sheets/sheet-02-40s.png`: 동일 인물의 복장·여러 방향 참조. 출력 시트의 포즈 배열로 사용하지 않음.

위 참조 경로는 프로젝트 루트 기준이다. 생성 결과를 참조한 보정은 아래 각 단계의 산출물 파일을 입력으로 사용했다.

## 최종 산출물과 실제 측정

| 파일 | 실제 크기 | 모드 | 확인 |
|---|---|---|---|
| `stage-background.png` | 2172 × 724 | RGB | 3:1, 인물 없음, 수평 보행로, 높은 앞 난간 없음 |
| `worker-walk.png` | 1254 × 1254 | RGBA | 2 × 2, 셀 627 × 627, 오른쪽 측면, 전신 4개, alpha 0~255 |
| `assets.json` | — | JSON | 장면 좌표·셀 사각형·각 발 기준점 |

작업자 시트 1,572,516 픽셀 중 alpha=0인 픽셀은 1,266,591개(약 80.5%)이다. 셀 사이·모서리는 투명하다. 확대하면 일부 외곽에 노랑/빨강 경계 픽셀 잔재가 보이는 생성 초안이다.

배경 발 기준선은 `walklineV=0.83`, 시작 `startU=0.22`이다. 점검문 중심은 `u=0.16, v=0.65`, 차단함은 `u=0.855, v=0.57`이다. 생성 이미지에서 관찰한 좌표이며 실제 현장 설비 위치가 아니다.

각 alpha 경계는 alpha>32에서 셀 내부 기준으로 측정했다. `footY`는 경계의 아래쪽 exclusive 좌표, `footX`는 몸통 아래의 가상 수직 앵커를 눈으로 잡은 값이다. 셀 중심을 일괄 사용하지 말고 프레임별 앵커를 사용해야 발이 뜨는 현상을 줄인다. 기본 불투명 인물 높이 `standingHeight=594`px이다.

| 프레임 | 셀 시작 x,y | alpha bbox x,y,w,h | footX,footY | 포즈 |
|---|---|---|---|---|
| 0 | 0,0 | 301,26,141,594 | 363,620 | 정지 |
| 1 | 627,0 | 177,29,330,586 | 328,615 | 보행 접촉 A |
| 2 | 0,627 | 285,17,187,583 | 355,600 | 발 교차 통과 |
| 3 | 627,627 | 171,21,363,580 | 322,601 | 보행 접촉 B |

원시 셀의 발선 오프셋은 620/615/600/601px, 헬멧 위쪽은 26/29/17/21px이다. 앵커 후 인물 높이는 약 2.4% 이내 차이이며 초안 보행에서 약한 신체 흔들림이 남을 수 있다. 좌향은 코드에서 flip한다.

## 배경 1차 프롬프트

참조: 입력 1. 실제 출력 2172 × 724, RGB. 중간 산출물 `exec-161af058-232f-4414-a993-5a45a2aa9ea8.png`. 앞 난간이 높게 남아 아래 보정을 적용했다.

```text
Use case: precise-object-edit
Asset type: photorealistic scrolling side-view conveyor factory background for a playable 2D safety-training draft.
Input image 1 is the edit target: start-04-wide-route.png. Use this exact realistic factory, its conveyor, overhead yellow crane, steel columns, golden late-afternoon lighting, weathered metal and grated walkway as the visual source.
Primary request: remove the sole baked-in man entirely and reconstruct the conveyor/rail/floor behind him naturally. Extend the same factory scene laterally into a seamless-looking very wide 3:1 panorama, approximately 3072 by 1024. It is ONE scene, not panels.
Composition: maintain a genuinely horizontal, continuous level walking route across the entire width. Full-body character foot contact will be around 80 percent down the image. Ensure enough unobstructed grated floor above this footline to show a full-body worker. Lower the foreground yellow railing so its highest horizontal bar lies below an inserted worker's knees, near 86 percent down the image; the foreground rail must never cover torso or face. Keep conveyor and relevant equipment behind the walking route. Render perspective shallow, nearly orthographic horizontally, not a walkway retreating diagonally into the distance. Preserve the long horizontal belt, yellow mesh guards, and recognizable industrial material.
At far left around 12 percent of width: an obvious reachable maintenance access hatch on the conveyor, closed rectangular metal hatch/inspection opening housing with handle, no worker inside.
At far right around 90 percent of width: the recognizable gray local energy isolator cabinet with a single red rotary disconnect handle, with the padlock hasp empty. No existing lock or tag attached anywhere. Keep it reachable just behind the walk route, at worker hand height.
Lighting/mood: original warm natural golden late-afternoon light, realistic dusty industrial surface detail.
Constraints: edit background only, preserve recognizable source factory style; absolutely no people or human shapes, no player, no UI, no text, no lettering, no logos, no watermarks, no panels, no borders. No injury, no damage or accident. No added 3D-render/cartoon style. Opaque full-bleed photographic scene. This is a conceptual training draft, not validated plant engineering.
```

## 배경 보정 프롬프트

참조: 위 배경 1차 산출물. 실제 출력 2172 × 724, RGB. 선택한 산출물 `exec-5b3c4363-497a-4de8-a538-8f64ff56b505.png`를 `stage-background.png`로 복사했다.

```text
Use case: precise-object-edit
Asset type: final photorealistic scrolling 2D factory stage panorama.
Input image 1 is the edit target, already a wide empty factory scene.
Make one focused correction: remove the foreground yellow horizontal railing and its tall posts from in front of the grated walkway, including the rail at about 65 percent of image height. Reconstruct clean continuous unobstructed grated steel walking floor in those locations. Replace it ONLY with a low yellow toe-bar along the near/front edge at 88 percent of image height, maximum height two thin bars, no tall posts. The playable worker's footline will be 82 percent of image height; there must be absolutely no foreground railing above the worker's ankles, so a full-body sprite walking horizontally across the floor is unobstructed.
Keep every other part of the photograph: same ultra-wide approximately 3:1 composition, conveyor belt and supports, warm light, crane, steel columns, left maintenance hatch and right gray red-handle energy isolator. No attached padlock or tag; no people; no text/UI/logos. Make entire walkway level left-right, preserve all other source visual details. Opaque background.
```

## 작업자 1차 프롬프트

참조: 입력 2와 3. 실제 출력 1254 × 1254, RGBA. 중간 산출물 `exec-71cb3334-dd2e-4de3-952c-e66b1fdfbc0d.png`. 보행 A/B의 팔 스윙 차이를 보강하기 위해 아래 보정을 적용했다.

```text
Use case: identity-preserve
Asset type: photorealistic 2D game sprite sheet with genuine alpha transparency.
Input image 1 candidate-02-40s.png is the exact character identity reference. Input image 2 sheet-02-40s.png is the same character's costume and anatomy reference, NOT a pose-layout reference. Keep this exact realistic Korean male factory worker in his 40s, face, body proportions, white hardhat, navy long-sleeve workwear and trousers, worn yellow reflective safety vest, work gloves, brown safety boots. Add one small red personal padlock and one blank white lockout tag carried at his belt; these are his tools, not attached to any factory equipment.
Primary request: a 2 by 2 animation sprite sheet containing EXACTLY FOUR separate full-body views of the SAME man, all facing RIGHT in strict side profile, with four different walking/idle poses. No front/back/three-quarter view, no character turnaround.
Layout: equal-size 2x2 cells, one full-body worker centered in each cell, same scale and identical helmet/head height and boot baseline relative to each cell. Each body is fully contained in its cell with generous transparent margins at top, bottom and both sides. Transparent gutters separating all four cells; no overlap; whole helmet and boots visible. The total sheet can be 1536x1536 or 1024x1024, square.
Read row-major:
Top-left frame 0: neutral standing idle, both boots planted below body, arms down.
Top-right frame 1: left-foot heel contacting far forward to the right and right foot trailing left, clear natural stride with opposite arm swing.
Bottom-left frame 2: passing step, one planted leg upright under pelvis while the opposite knee bends forward, boots near under body, different from idle.
Bottom-right frame 3: right-foot heel contacting far forward to the right and left foot trailing left, clear opposite-phase stride with opposite arm swing from frame 1.
Keep anatomical consistency and realistic walking, not running. ALL FOUR face RIGHT, noses to the right. Boots contact the same horizontal baseline within each cell. Maintain same helmet top height. Studio-quality photorealistic cutout, realistic clothing folds and moderate warm side lighting compatible with reference factory.
Critical background constraint: the PNG background must be ACTUALLY FULLY TRANSPARENT ALPHA, not white, black, gray, checkerboard, studio backdrop or floor. No shadows, no ground, no text, no numbering, no labels, no grid, no borders, no UI, no logos. Only the four isolated worker silhouettes have nonzero alpha. Do not crop any feet.
```

## 작업자 보정 프롬프트

참조: 위 작업자 1차 산출물. 실제 출력 1254 × 1254, RGBA. 선택한 산출물 `exec-ef548fc4-ca98-4a31-bfad-da2d5ca34c4e.png`를 `worker-walk.png`로 복사했다.

```text
Use case: precise-object-edit
Asset type: photorealistic transparent four-frame sprite sheet.
Input image 1 is the exact edit target, a genuine RGBA-transparent 2x2 right-facing worker walk sheet.
Change ONLY the bottom-right character's gait. Keep the top-left idle, top-right first contact, and bottom-left passing characters completely unchanged. Keep sheet dimensions, same identity/clothing/white hardhat/red belt padlock/blank white tag/boots, four equal cells and genuine alpha background.
Bottom-right correction: create the OPPOSITE contact phase from top-right. The nearest visible arm wearing a glove must swing clearly BACK behind the torso, toward the LEFT of the frame, with slightly bent elbow; the farther arm swings forward toward the RIGHT. The near/visible leg reaches forward to the RIGHT with heel contacting ground, and the farther leg trails to the LEFT with toe touching. This should visibly differ from the top-right frame which has the near arm forward. Keep head facing RIGHT in exact profile, keep his helmet at current height, pelvis and standing planted boots at same baseline and same centered position, full body with transparent margins.
Avoid changing anything else: no text, no labels, no grid, no extra frames, no floor, no shadows, no background color, no checkerboard pixels. ACTUAL ALPHA transparency around figures. All four must face RIGHT.
```

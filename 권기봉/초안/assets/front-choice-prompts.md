# 선택 대기 정면 작업자 v1

생성 모드: Codex 내장 `image_gen`, `transparent_background: true`. 새 사진풍 게임 인물의 단일 정면 자세를 생성했다. 실제 인물을 촬영하거나 실제 개인의 신원을 재현한 자료가 아니며, 기존에 생성한 SAFEPLAY 작업자와 외형 일관성을 맞춘 합성 자산이다.

저장 자산:

- `worker-front-v1.png`: 1024 × 1536 RGBA. 정면으로 선 전신, 플레이어를 직접 바라보는 두 눈, 차분한 중립 표정, 양팔을 편히 내린 자세.
- `worker-front-v1.json`: 발 접지점과 신체 높이 메타데이터. 런타임에서는 원본 전체 PNG를 사용하고 `bodyHeight` 기준으로 크기를 맞춘다.

입력 역할:

1. `assets/images/character-sheets/sheet-02-40s.png`: 기존 합성 작업자의 인물·복장 참조. 특히 좌상단 정면 자세.
2. `권기봉/초안/assets/worker-actions-v3.png`: 기존 합성 작업자 사진풍 소재·조명·외형 일관성 참조. 행/열 배치나 측면 자세를 복제하지 않도록 지정.

입력은 먼저 `view_image`로 확인했다. 기존 `권기봉/초안/assets/worker-walk.png`도 외형 확인용으로 열어봤다.

정확한 생성 프롬프트:

```text
Use case: photorealistic-natural. Asset type: single transparent full-body game worker sprite used when the player considers four choices.
Input images: Image1 is the same existing game's synthetic worker identity/clothing reference, especially his straight frontal upper-left pose. Image2 is the existing synthetic worker's photographic materials/style consistency reference only; do not copy its sheet layout or side-facing poses. Generate a new single pose, not an edit of a real person.
Subject: the SAME Korean male factory worker, early40s, white slightly weathered hardhat, dark navy workshirt and cargo trousers, fluorescent yellow reflective safety vest, grey work gloves, brown leather safety boots. Consistent face, natural age, hair, clothing, proportions and level of realism with the references.
Pose and gaze: exactly FRONT facing camera. His nose, shoulders, chest and pelvis square to camera, symmetric shoulders with natural relaxed posture. BOTH eyes look directly into camera at the player. Calm attentive neutral expression, closed relaxed mouth, present and human rather than stern or smiling. Arms relaxed at both sides, open relaxed gloved hands. Safely upright balanced weight on both feet, feet a comfortable natural distance apart, both complete boots visible. No carried objects, no tools, no gestures.
Composition: one full-body person centered, hat to soles fully within frame, comfortable clean margins, portrait orientation. The worker fills about85% of canvas height. No other pose or other person. Photorealistic photographic game cutout with real skin, cloth folds, worn material, believable hands/anatomy and sharp clean edges. Soft neutral front fill with subtly warm upper-right factory daylight rim to match existing scene, no harsh theatrical shadow or dramatic glow.
Background: true transparent alpha, no environment, no ground, no floor, no cast shadow, no background haze, no checkerboard pixels, no halo. Avoid profile, three-quarter view, looking sideways, tilted head, aggressive face, fear, guilt, horror, oversized muscles, cartoon, vector, toy3D, text, labels, watermarks or brands.
```

생성 원본: `C:/Users/admin/.codex/generated_images/01a11ef7-cbdf-75e3-b087-563716bc076b/exec-d161ef8d-bbb3-4a0f-ba7e-443d63b4d234.png`.

선택 출력의 원본 PNG를 프로젝트 경로에 그대로 복사했다. Python/Pillow는 읽기 전용 치수·alpha 검사에만 사용했으며 리사이즈·크롭·재채색·픽셀 편집은 하지 않았다. CLI/API fallback, 추가 설치, 별도 모델 호출은 사용하지 않았다. 기존 이미지와 메타데이터는 보존했다.

측정 및 시각 검사:

- RGBA, 1024 × 1536, alpha 범위0–254.
- alpha≥64의 실제 경계: x253, y21, width516, height1472.
- alpha≥128의 실제 경계: (253,22)부터(769,1492)까지.
- 양쪽 안전화의 하단 기준 접지점 `footY=1493`, 양발 중심 `anchorX=511`, 기준 신체 높이 `bodyHeight=1472`.
- 완전투명 배경 픽셀1,091,072개. 대표 빈 배경(0,0),(100,100),(100,600),(700,100)의 alpha모두0.
- 시각 검사로 정면 어깨·몸통·골반, 양눈의 직접 시선, 양손·양발 전체 표시, 흰 안전모·형광 조끼·남색 작업복·회색 장갑·갈색 안전화를 확인했다.
- 이미지 미리보기 도구가 숨은 RGB 배경을 보여 빛무리처럼 보일 수 있지만, 빈 배경의 alpha는0으로 런타임 합성에서 표시되지 않는다.
- Biome LSP는 미설치이며 기존 설치 거절을 유지했다. JSON 직접 파싱 및 PNG 치수·앵커 범위 검사를 수행한다.

추가 halo 검사:

- 전체 alpha 히스토그램: alpha0=1,091,072px, alpha1–15=19,791px, alpha16–63=2,287px, alpha64–127=2,016px, alpha128–254=457,698px.
- alpha≥64 bbox 바깥813,312px 중 nonzero846px, 최대alpha18(7.1%), alpha≥16은7px, alpha≥64는0px이다. 극소량의 낮은 alpha 잔여 가장자리 픽셀이 있지만 넓은 불투명/반투명 직사각형 배경은 없다.
- 몸체 바깥 및 다리 사이 빈 영역(300,100),(700,200),(300,1000),(512,1200),(250,100),(775,500),(200,1450),(512,1500),(400,1500),(1023,768)의 alpha모두0이다.
- alpha>0 전체 경계는(35,15,996,1502)로 낮은 alpha의 미세 잔여를 포함한다. 런타임 접지·기준 신체 높이는 실제 인물 경계를 나타내는 alpha≥64 측정값을 사용한다.
- JSON 직접 파싱, PNG 치수·RGBA·anchor·footY·bodyHeight 범위 확인을 통과했다.

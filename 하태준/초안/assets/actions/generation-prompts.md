# 행동 장면 이미지 제작 기록

2026-10-09, 내장 image_gen 도구로 생성했다. 기존 `../stage-background.png`를 먼저 확인하고 따뜻한 측면광, 회색 철재, 노란 보호대의 재질과 색을 맞췄다. 생성 원본은 보존하고 이 폴더로 복사했다. 이미지 편집이나 확대 변환은 하지 않았다.

## 자산과 배치 기준

| 파일 | 크기 | 용도와 배치 기준 |
|---|---|---|
| panel.png | 1536 × 1024 | 조작반과 차단장치 공용 배경. 철재 면은 가로 22~78%, 세로 8~89%. 버튼, 손잡이, 잠금, 표지는 코드에서 배치한다. |
| access.png | 1536 × 1024 | 벨트와 롤러 근접 배경. 벨트는 세로 32~46%, 끼임 틈은 47%, 롤러는 49~69%. 이물질 기준점은 가로 50%, 세로 47%. |
| hand.png | 1254 × 1254 | 투명 장갑 손과 팔. 검지 끝 기준점은 가로 11%, 세로 7%. 팔은 오른쪽 아래에서 진입한다. |
| radio.png | 1254 × 1254 | 투명 장갑 손과 무전기. 안테나 끝은 가로 43%, 세로 3%, 본체 중심은 가로 46%, 세로 57%. |
| lock.png | 1254 × 1254 | 투명 개인 자물쇠. 걸쇠 바깥 꼭대기는 가로 50%, 세로 8%, 안쪽 걸림 기준점은 가로 50%, 세로 16%. |
| tool-hand.png | 1254 × 1254 | 투명 장갑 손과 금속 청소 갈고리. 열린 갈고리 끝은 가로 5.4%, 세로 14.4%, 안쪽 걸림점은 가로 8%, 세로 7%. |

투명 이미지 두 개는 PNG 색상 형식 6, 배경 두 개는 형식 2로 확인했다. 사진 전체에 설명이나 조작 문구를 넣지 않았다. 이 자산은 초안의 시각 표현이며 실제 설비 구조나 조작 절차의 증거로 사용하지 않는다.

## 생성 프롬프트

### panel.png

Use case: photorealistic-natural. Asset type: reusable landscape closeup background for industrial safety training game. Create a photorealistic 1536x1024 landscape close view of a closed gray weathered steel electrical isolation cabinet mounted in a conveyor factory. The cabinet face occupies central 80 percent, nearly straight-on view with very slight perspective, physically realistic screws and shallow seams at perimeter, empty flat steel face in center for code-rendered controls. Background edges include defocused industrial structural steel, muted yellow guards, warm late-afternoon light from right, restrained amber and gray palette. No buttons, levers, locks, hands, labels or text anywhere; all functional controls will be composited and animated separately. Realistic brushed worn painted steel, dust and modest wear, no heavy rust, no UI, no logos, no watermark.

### access.png

Use case: photorealistic-natural. Asset type: landscape closeup conveyor background for safety training game. Create a 1536x1024 landscape photorealistic closeup of a horizontal industrial black rubber belt and gray steel cylindrical conveyor roller in a worn warm-lit cement aggregate factory. Straight-on side/front closeup, belt across central horizontal band, return roller visible below it, small narrow dangerous nip gap at central point. Real gray structural steel side plates at edges, muted yellow safety frame, practical believable mechanism. Center area clearly exposes roller and black belt edge so code overlays can animate small belt movement and foreign material. No hands, tools, debris, locks, labels, text, logos, injuries or UI. Match warm late-afternoon light from right and weathered gray steel yellow guard palette. Sharp tactile realistic photography, not illustration.

### hand.png

Use case: photorealistic-natural. Asset type: transparent reusable animated hand sprite for realistic industrial safety training game. One isolated photoreal worker's right gloved hand and full forearm, no body. Beige tan leather industrial work glove with realistic stitched fingers and subtle wear, dark charcoal gray workwear sleeve cuff. Forearm enters from lower-right, hand extends diagonally upper-left. Palm tilted away from viewer, index finger extended toward upper-left as if pressing a button, remaining fingers naturally gently bent. Full hand visible, wrist and forearm visible, no cropped fingertips, reasonable anatomy exactly five fingers. Place entire object within canvas with transparent padding; 1024x1024 square. Warm soft side light from right, natural texture, no dramatic shadow. Truly transparent background, no checkerboard baked in, no tool, no blood, no text, no logo.

### radio.png

Use case: photorealistic-natural. Asset type: transparent radio and hand foreground for industrial safety training game. One photorealistic right hand wearing beige tan leather safety work glove and charcoal gray workwear sleeve, gripping an unbranded black industrial two-way handheld radio upright. Entire radio including long antenna is visible, gloved thumb resting on side push-to-talk button. Radio front speaker grill and tiny blank dark screen, no text or markings. Forearm enters from bottom-right; radio centered, glove and wrist clearly shown, plausible five-finger anatomy. Square 1024x1024 with generous transparent margins around object, realistic slightly used materials, soft warm light from right to match late-afternoon factory. Truly transparent background, no baked checkerboard, no person, no face, no background, no extra devices, no logos, no watermark.

## 확인 범위

추가 자산 `lock.png`, `tool-hand.png`도 로컬로 열어 확인했고 PNG 색상 형식 6의 투명 배경을 확인했다. 자물쇠는 닫힌 상태를 체결 결과로 사용하며 걸쇠 개폐의 정밀한 연속 동작은 이 한 장에 포함되지 않는다.

## 추가 생성 프롬프트

### lock.png

Use case: photorealistic-natural. Asset type: transparent isolated industrial safety padlock sprite. A single realistic red personal safety lockout padlock, closed shiny stainless steel U-shaped shackle, durable red polymer rectangular body with subtle bevels, no writing, no brand or logo. Front view with tiny realistic perspective showing right side edge, warm soft light from right, neutral physical textures and modest wear consistent industrial worksite. Entire object centered visible within square canvas with generous transparent padding, no hands, no key, no chain, no hasp, no shadows outside object, no text, no watermark. Actual transparent background, no checkerboard baked into image. Square 1024x1024.

### tool-hand.png

Use case: photorealistic-natural. Asset type: transparent gloved hand and cleaning hook sprite for industrial safety training game. One photorealistic right worker hand wearing worn tan beige leather safety glove with charcoal gray workwear sleeve, firmly gripping a long slender steel cleaning hook tool. Forearm enters from lower-right, hand at lower-right-middle, long straight narrow gray metal shaft extends diagonally toward upper-left, ending in small curved hook at upper-left. Entire hook tip and hand and wrist within square canvas with margin, tool not cropped. Tool used to retrieve loose foreign material beside isolated conveyor, no blade, no weapon, no debris attached. Warm soft light from right, plausible anatomy and grip, matching practical tan leather glove. Full isolated object only on genuinely transparent background, no baked checkerboard, no background, no face, no body, no labels, no blood, no logo, no watermark. Square 1024x1024.

네 장 모두 로컬 파일로 열어 구도, 재질, 문구 부재, 손과 무전기 가장자리를 확인했다. 최종 화면의 크기와 조작부 겹침은 행동 장면 구현 후 브라우저에서 별도로 확인한다. 손 이미지 한 장은 누르기와 접근 동작의 공용 자산이므로 정밀한 손가락 체결 동작 전체를 표현하지는 않는다.

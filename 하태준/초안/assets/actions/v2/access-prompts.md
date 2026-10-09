# 컨베이어 작업 컷 v2 생성 기록

생성 도구: 내장 image_gen. 생성일: 2026-10-09.

요청 해상도: 3840×2160, 16:9. 실제 출력: 모든 파일 1672×941, 가로세로비 약 1.777. 별도 확대나 이미지 후처리를 하지 않았다. 프로젝트의 4K 출력과 원본 사진 해상도는 다르다.

기존 access.png와 stage-background.png를 직접 확인했다. access-before를 먼저 편집하고, 나머지 작업 컷을 그 결과에서 이어 편집했다. access-pull은 access-contact에서 이어 편집했고, access-adjacent는 옆 설비가 보이는 넓은 구도다.

| 파일 | 장면 의도 | 편집 기준 | 실제 치수 |
|---|---|---|---|
| access-before.png | 제거 전 정지 상태. 실제 비닐과 고형 부스러기. | assets/actions/access.png | 1672×941 |
| access-contact.png | 소매와 장갑이 도구를 쥐고 비닐 주름에 갈고리가 걸린 순간. | access-before.png | 1672×941 |
| access-pull.png | 같은 도구에 비닐이 걸려 벨트 밖으로 나온 순간. | access-contact.png | 1672×941 |
| access-clear.png | 제거 후 정지 상태. 손과 도구가 없는 결과 화면. | access-before.png | 1672×941 |
| access-risk.png | 비닐 쪽으로 손이 접근하지만 손끝과 위험부 사이에 틈이 있는 순간. 부상 없음. | access-before.png + access-contact.png(장갑 외형 참고) | 1672×941 |
| access-motion.png | 이물질 유지, 손 없음. 벨트와 롤러 표면만 움직임을 표현. | access-before.png | 1672×941 |
| access-adjacent.png | 실제 금속 명판 A/B가 있는 별개 설비 두 구간. 인접 작업 범위 보류 화면. | access-before.png | 1672×941 |

직접 확인: 모든 컷은 하나의 사진으로 구성되고, 비닐은 실제 구겨진 재료로 보인다. 접촉 컷의 도구 끝과 비닐이 물리적으로 맞닿으며, 인출 컷에는 도구에 걸린 비닐과 비워진 원래 위치가 보인다. 손은 소매에 이어져 있고 아래 약 15%에 자막을 배치할 수 있다. 위험 컷의 틈과 움직임 컷의 표면 흐림도 확인했다.

한계: 생성형 이미지 편집이라 벨트와 금속의 미세 질감까지 픽셀 단위로 일치하지는 않는다. 위험 컷의 5cm는 프롬프트(prompt)의 거리 의도이며 실제 길이를 검증한 자료가 아니다. 이 사진은 시나리오의 시각 자료이며 현장의 안전한 작업 절차를 증명하지 않는다. 위험 컷을 손으로 이물질을 빼라는 안내로 사용하면 안 된다.

## access-before.png

편집 기준: assets/actions/access.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, frame 1 of a continuous five-frame sequence
Input image 1 is the edit target: existing access.png conveyor close-up. Preserve the exact frontal camera, roller, rusty yellow steel supports, dusty black belt, bolt pattern, and warm late-afternoon factory light. Reframe by extending ONLY sideways to a clean native 16:9 landscape composition, desired 3840x2160 if available. Do not stretch or blur the old image.
Primary request: make a realistic obstruction BEFORE removal. A small irregular crumpled scrap of dirty translucent off-white packaging plastic, about the width of one support bolt, is visibly trapped against the upper-front belt edge near the right-of-center portion of the belt and roller junction. It has physical folds, grime, ragged edges, and a believable cast shadow. Include a few tiny rough dry gray aggregate crumbs around it. Keep debris small, visually clear, and unmistakably a real material stuck in the machine, never a simple geometric object. Conveyor is stopped and sharp.
Composition: one single coherent live-action photograph, machinery close-up filling the frame. Keep the lower 15% visually quiet for caption overlay, with the existing dull steel crossbar, no blank graphic panel. All critical interaction at roughly x=64%, y=42%.
Avoid: people, hands, tools, logos, UI, text, icons, arrows, diagrams, circles, glowing shapes, injury, motion blur, excessive depth-of-field blur, fake floating objects. Preserve all machine background structures and lighting.
```

## access-contact.png

편집 기준: access-before.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, frame 2 of the same continuous sequence
Input image 1 is the edit target, access-before.png. Make a surgical edit. Keep the entire image, dimensions, camera, perspective, roller, belt, metal supports, every bolt, scratches, debris location and lighting PIXEL-ALIGNED with input. Target landscape 16:9 native 3840x2160 if available, retain input framing.
Change only: add ONE plausible worker's right forearm extending from the right edge, wearing a dark navy cotton work jacket and a dusty gray textured protective work glove. The sleeve is visibly attached to the glove wrist, no floating hand. Glove has anatomically natural thumb and fingers tightly wrapped around a single orange-rubber-handled LONG slim steel hooked debris tool. The tool is a physically continuous shaft from the glove to the dirty plastic scrap already stuck near x=64%, y=45%. Its small curved hook is visibly inserted THROUGH a fold of that plastic and engaging it, with believable contact, occlusion, matching shadow. The shaft approaches diagonally from the right, glove stays well outside roller nip. The debris is still trapped at the same location and has NOT yet been pulled free. This is unmistakably the instant of physical hooked-tool contact. Stopped machine, sharp surfaces.
Keep the lower 15% crossbar free of the hand and tool for captions. Keep all background unchanged.
Avoid: additional hands, extra fingers, disconnected sleeve, pointing fingers, hand touching debris directly, tool floating near debris without contact, arrows, circles, diagrams, UI, text, logos, any graphic shape, injury, gratuitous blur. One coherent realistic industrial photograph.
```

## access-pull.png

편집 기준: access-contact.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, frame 3 of the SAME continuous sequence
Input image 1 is the edit target access-contact.png. It already shows the correct worker, glove, hooked tool and machinery. KEEP the image dimensions and exact fixed-camera framing. Preserve every stationary pixel of belt, roller, bolts, rusty yellow supports, factory background, shadows and lighting. Native 16:9 desired 3840x2160 if available without reframing.
Change only the local interaction into a clear NEXT MOMENT: the SAME dusty gray right glove and navy sleeve withdraw the SAME orange-handled metal hooked tool to the upper-right, moving the hand slightly to the right. The same crumpled dirty translucent plastic scrap is NOW CAUGHT by the hook and lifted away from the conveyor edge, still visibly physically attached at a fold. Hooked plastic hangs naturally downward by gravity, around x=72%, y=35%, approximately 15 cm above the belt, not magically floating. A few of the existing aggregate crumbs may remain on the belt, but the original plastic location at x=64%, y=45% now shows the empty continuous belt edge. The tool shaft must stay continuous between hand and hooked scrap; show realistic grip, contact and occlusion. The motion is conveyed by changed position and tension, NOT motion blur. Keep the machine stopped and all details sharp.
Lower 15% crossbar remains quiet for captions. One coherent realistic photo.
Avoid: changes to background or machine geometry, missing hand-sleeve connection, extra hands/fingers, tool detached from scrap, another plastic scrap remaining on belt, graphic overlays, arrows, circles, text, UI, logos, blur, injury.
```

## access-clear.png

편집 기준: access-before.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, frame 4 of the same continuous sequence
Input image 1 is the edit target access-before.png, the fixed-camera baseline. Preserve exactly the image dimensions, framing, every bolt, support, belt and roller geometry, factory background and warm lighting. Desired native16:9 3840x2160 if available without reframing.
Change ONLY the trapped crumpled plastic scrap and loose aggregate debris near x=64%, y=45%: remove them completely, reconstruct the continuous natural dusty black belt edge and steel roller beneath exactly as surrounding materials. The conveyor is stopped. This is the clean result AFTER removal. No worker, no glove, no sleeve, no tool, no garbage anywhere else. Keep all original dust, worn paint, rust and scratches outside the debris edit unchanged, this is not polished or sanitized equipment.
Lower 15% crossbar stays quiet for captions. A single coherent sharp realistic industrial photograph.
Avoid: machine design changes, camera movement, motion blur, new objects, UI, arrows, text, graphics, logos, watermark.
```

## access-risk.png

편집 기준: access-before.png + access-contact.png(장갑 외형 참고).

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, alternate unsafe-action branch frame
Input image 1 is the edit target access-before.png. Preserve exact dimensions, fixed camera, perspective, every structural bolt, rusty yellow support, factory background, sunlight and the dirty plastic obstruction in exactly the same location. Native 16:9 desired3840x2160 if available, without reframing.
Change ONLY the local interaction: add one worker's right forearm entering from the right edge in the SAME dark navy cotton work jacket and dusty gray textured protective glove used in the tool sequence. Sleeve visibly joins glove. The glove now reaches directly toward the dirty plastic at belt/roller nip, without any tool. A natural open hand pose, thumb and four anatomically plausible fingers slightly curved to grasp the scrap. Glove fingertips are approximately 5cm short of the nip/plastic, with an unmistakably visible AIR GAP. They do not touch the belt, roller, or scrap. This is the instant just before dangerous contact, NO injury, NO entrapment. The glove is not pointing into empty space: it is aligned to grasp the visible real obstruction.
Conveyor is plausibly moving: subtle physically directional streaks on the black belt surface and slight rotational texture blur ONLY on the cylindrical roller. Keep glove, plastic scrap, supports, bolts and background sharp so machine movement is distinct from global blur. No hand motion smear. Keep lower15% crossbar free for captions.
Avoid: blood, wounds, crushed hands, actual entanglement, missing wrist, extra fingers, loose floating hand, arrows, graphic shapes, safety icons, UI, text, logos, blur of the fixed machinery.
```

## access-motion.png

편집 기준: access-before.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, movement-detected hold branch
Input image 1 is the edit target access-before.png. Preserve EXACT same image dimensions, camera framing, viewpoint, background, shadows, warm light, every bolt and structural geometry. The crumpled dirty plastic obstruction and loose gray aggregate crumbs at x=64%,y=45% MUST remain EXACTLY in place, same shape and visible sharp. Desired native16:9 3840x2160 if available, no reframing.
Change ONLY the moving machine surfaces: show unmistakable physical movement using modest but obvious directional streaks of dust on the black conveyor belt and rotational texture blur ONLY on the cylindrical steel roller, consistent with a running belt/roller. The visual must show that motion is still present even though someone expected it to be stopped. Keep belt outer edge geometric contour stable, all bearing housings, yellow supports, bolts, steel crossbar, mesh guard, upper factory buildings and obstruction SHARP. Camera does not move. This must resemble a real short-exposure photograph of rotating machinery, not general image softness.
No person, glove, sleeve or tool in this frame. Lower15% crossbar quiet for captions. Single coherent photo, no new objects.
Avoid: removing plastic, removing debris, changing machine design, blur of fixed background, text, overlays, UI, circles, arrows, diagrams, logos, watermarks, fake geometric obstruction.
```

## access-adjacent.png

편집 기준: access-before.png.

```text
Use case: precise-object-edit
Asset type: photorealistic industrial safety simulation still, neighboring-equipment scope hold branch
Input image 1 is the edit target access-before.png. This is the same dusty aggregate factory in warm late-afternoon light. Transform it into a SLIGHTLY WIDER establishing close-up by outpainting more scene to the right, not a montage. Keep the original conveyor's characteristic belt, cylindrical roller, rusty gray and yellow supports, mesh guards, physical obstruction and factory architecture visibly recognizable on the LEFT HALF. Add a physically plausible SECOND neighboring conveyor roller module on the RIGHT HALF, with separate rusty yellow steel supports and a small gap between machines. Both modules share the same floor, sunlight, perspective and industrial photographic texture. The neighboring module is a DISTINCT piece of equipment, not just another part of the first belt.
Each equipment module has a real small bolted brushed-steel identification plate mounted on its upper side support facing camera: original left machine plate has deeply stamped dark letter "A", adjacent right machine plate has deeply stamped dark letter "B". These are actual metal nameplates with screws, wear, shadows and perspective, not graphic overlays or floating letters. No other visible text. Keep these two identifiers large enough to read.
Original A plastic obstruction remains, naturally small in this wider view. Adjacent B has a few rough gray dry material chunks and a small dirty ragged scrap at its belt edge, an unassessed separate location. BOTH machines appear still with sharp belt/roller surfaces. No person, glove, sleeve or tool, nobody begins cleanup on B.
Composition: one continuous real industrial photograph, wide native16:9 landscape target3840x2160 if available, same warm subdued palette, lower15% unobtrusive steel/floor for captions. NOT a split-screen comparison.
Avoid: drawings, UI, arrows, circles, colored highlights, oversize title lettering, graphic panels, fake geometric debris, hand pointing into empty space, logos, watermark, motion blur, isolated product render.
```



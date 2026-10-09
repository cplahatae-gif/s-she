# 차단기 연속 장면 이미지 기록

2026-10-09. 내장 imagegen으로 생성·편집했다. 독립 장면 재생성 대신 같은 미잠금 기준 사진에서 원본 편집(Image Edit)을 이어갔다. 확대 보간(Upscaling)은 하지 않았다. 요청 크기는 3840×2160이었으나 실제 모든 최종 파일은 1672×941이다. 실측 비율은 1.7768로 16:9에 가깝다.

기준: `C:/Users/nomus/.codex/generated_images/01a11ef6-e886-7c32-bfa1-31014f0ce9d2/exec-fb242aa7-c319-4a18-8adb-beeb2f02d1ce.png`. 기존 프로젝트 `../panel.png`도 먼저 시각 확인했다. 하단15%에 새 중요 부품을 두지 않도록 요청했다. 손 장면의 소매는 우측 하단 일부까지 들어온다.

모든 최종 파일을 원본 크기로 직접 열어 손의 접촉, 걸쇠, 종이 연결, 명판과 인쇄문구, 카메라 구도와 부품 위치를 확인했다. 사람·작업정보는 가상 예시다. 실제 현장 장비의 설계 도면 검증은 수행하지 않았다.

| 파일 | 실제 크기 | 내용 |
|---|---|---|
| isolator-open.png | 1672×941 | OFF, 자물쇠 없음 |
| isolator-locked.png | 1672×941 | 손을 뺀 잠금 완료 |
| isolator-contact.png | 1672×941 | 장갑 손으로 열린 자물쇠를 실제 구멍에 체결 |
| isolator-wrong-loop.png | 1672×941 | 별도 문 걸쇠만 잠김, 차단기 구멍은 비어 있음 |
| isolator-other.png | 1672×941 | 다른 작업자 초록 자물쇠 |
| isolator-tagged.png | 1672×941 | SELF 작업정보가 인쇄된 표지를 실제 타이로 연결 |
| isolator-other-equipment.png | 1672×941 | A 장치 명판 |
| isolator-unlock.png | 1672×941 | 장갑 손이 열린 자물쇠를 차단기에서 빼낸 상태 |
| isolator-tag-other.png | 1672×941 | 가상 다른 작업자 MIKE LEE 표지 |
| isolator-tag-worn.png | 1672×941 | 찢기고 오염되어 식별정보를 읽을 수 없는 표지 |
| isolator-tag-contact.png | 1672×941 | 장갑 손으로 표지의 타이를 실제로 조이는 상태 |

편집 연결: 기준 → open → locked → contact/other/other-equipment/unlock. open → wrong-loop. locked → 빈 표지 중간본 → tagged. tagged → tag-other/tag-worn/tag-contact.

빈 표지 중간본 생성 프롬프트:

```text
Use case: precise-object-edit. Edit only the padlock: attach a real white rectangular paper safety work tag hanging from the closed silver shackle by a short black cable tie visibly looped through a punched hole at the card top. The tie actually passes around the silver shackle and through the paper hole, no floating card. The tag hangs below and slightly to the left of the red padlock, under gravity, with subtle thickness, small red header band and completely blank writing area with two thin grey ruled lines. No letters or numbers on the tag. Keep the padlock body visible, not entirely covered. Card approximate height 1.2 times the lock body and narrow enough to stay close to the switch. Preserve every other part exactly: cabinet position, OFF red rotary switch and yellow plate, fixed steel lug, B/C nameplate, separate right-side door latch, scratches, background, camera, 1672x941 native frame, lighting, shadows, bottom15% free of new objects. Photorealistic actual workplace photograph, never interface/drawing/overlay/floating graphics. No hands. No extra locks.
```

## isolator-open.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-3db47f87-e457-4434-9a3c-950198ef5578.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Edit target: the attached unlocked electrical isolator photo. Produce the FIRST master image of a consistent workplace safety photo sequence. Preserve the entire existing grey cabinet, weathered yellow square isolator mounting plate, red rotary OFF handle, B/C nameplate, industrial background, and warm realistic lighting. Expand the composition sideways to native landscape 16:9, requested 3840x2160; do not crop top or bottom; keep the cabinet and switch at the same vertical positions. Keep the switch OFF with the red handle horizontal exactly as the reference. Make the lock feature physically functional: the hole at the red handle's right end aligns with a small fixed metal locking lug firmly screwed to the yellow plate directly behind it, with a visible corresponding hole, so a padlock shackle through both would block rotation. It must look manufactured, not a floating loop. On the right edge of the cabinet door, add one small conventional steel cabinet-door hasp with aligned holes, separate from the switch. No padlock, no hand, no tag. Sharp authentic industrial product photography, high detail on holes, shadows, fasteners and steel. The bottom 15 percent remains quiet clear metal/background for subtitles; no new foreground objects there. No interface, symbols overlay, diagrams, floating rings, fake sticker objects, text labels beyond existing B/C and ON/OFF. Native widescreen, no borders.
```

## isolator-locked.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-43a1b982-0ce5-40f4-89f5-3de48f0ab178.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Edit target is the supplied master isolator-open image. Change only this: attach one REAL red industrial safety padlock to the rotary switch at the red handle right-end lock hole. Its silver U-shaped shackle passes THROUGH the handle hole AND the fixed steel locking lug behind that handle, and closes into the red lock body below. Photograph an actually installed closed padlock, hanging under gravity, with authentic contact shadows; its small body is about half the handle length and stays inside the yellow plate's right edge. The padlock must physically stop the OFF handle rotating. No hand and no tag. Preserve every other pixel as closely as possible: same switch hardware, grey cabinet, yellow plate, nameplate reading B/C, separate empty steel cabinet-door latch at right, exact camera perspective, framing, warm lighting, scratches, background. The red switch remains horizontal OFF. This is a continuation frame, never a regenerated scene. Requested native 3840x2160 landscape 16:9. No overlay, no drawn graphics, no watermark, no floating rings, no text added. Bottom15% stays quiet for subtitles.
```

## isolator-contact.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-b408a715-6a78-48c9-a109-33dcbd9323ef.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Edit target is the supplied locked rotary electrical isolator photo. Create the preceding installation-action photograph using this exact camera frame, not a new camera. Change only the padlock area: one real worker right hand in a naturally dirty grey knitted work glove with dark rubber-coated fingertips enters from the RIGHT edge, forearm in navy industrial coverall sleeve, and gently grips the red safety padlock BODY with thumb on its left/front edge and curled fingers on right side. Show the silver shackle currently passed through the red handle's actual right-end hole AND the fixed locking lug behind it. The lock body is held immediately below the shackle, with ONE FREE SHACKLE END just above the body's receiving socket, visibly not clicked shut yet. Natural human thumb and four fingers, believable grip and scale, contact shadows where glove touches red plastic. The hand must touch the lock body, not the rotary dial, and must leave the handle hole and small gap in the open shackle plainly visible. Preserve the switch horizontal OFF, its hardware, plate, B/C plaque, empty cabinet door latch, cabinet scratches, background, lighting, framing and all object alignment exactly. No floating hands, no composited diagram look, no outline graphics, no tag, no added text, no extra hands. Requested 3840x2160 native widescreen; bottom15% quiet for subtitles.
```

## isolator-wrong-loop.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-8148efdb-1a81-4a71-809b-9a04b8a48efe.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Starting with this supplied UNLOCKED switch photograph, attach a real closed red safety padlock ONLY to the SEPARATE steel cabinet-door hasp at the far right door edge. The silver shackle visibly passes through the existing hasp's round hole, its red body hangs just below the metal latch under gravity. Leave the red rotary switch right-end hole EMPTY and clearly visible, and the OFF switch entirely unlocked and free to rotate. This is deliberately wrong-position locking. No tag. Preserve every other part exactly: cabinet position, OFF red rotary switch and yellow plate, fixed steel lug, B/C nameplate, separate right-side door latch, scratches, background, camera, 1672x941 native frame, lighting, shadows, bottom15% free of new objects. Photorealistic actual workplace photograph, never interface/drawing/overlay/floating graphics. No hands. No extra locks.
```

## isolator-other.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-b9c4146b-6992-4233-8cec-17d4eb2f54c6.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Change only the red padlock BODY colour to an authentic worn green industrial safety padlock body. Keep its exact geometry, closed silver shackle, installed hole and position unchanged. It belongs to another worker. No tag. Preserve every other part exactly: cabinet position, OFF red rotary switch and yellow plate, fixed steel lug, B/C nameplate, separate right-side door latch, scratches, background, camera, 1672x941 native frame, lighting, shadows, bottom15% free of new objects. Photorealistic actual workplace photograph, never interface/drawing/overlay/floating graphics. No hands. No extra locks.
```

## isolator-tagged.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-e913b6c1-0832-458a-81eb-31da4d4568dd.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Edit only the blank paper work tag in this supplied photograph. On its red band print white DO NOT OPERATE. On the white paper area print three compact but clearly legible dark black lines: WORKER: SELF / JOB: B/C CLEANUP / DATE: 2026-10-09. Keep the tag identical physical paper size and orientation, and physically connected by the existing black cable tie to the padlock. Text is realistic ink printed on the angled paper itself, matching perspective and texture. Preserve the exact cabinet, switch, padlock, camera, framing, lighting, background, material detail, alignment and all unrelated pixels. Real photographic printed ink on paper only. No overlay, vector graphic, interface, watermark or subtitles. No extra hands or objects. Same native landscape frame, no upscaling.
```

## isolator-other-equipment.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-32dc712c-75bf-45a8-a63b-34e652c1b927.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. This safety photo shows the wrong equipment. Change only the existing engraved metal nameplate above the isolator: replace the B/C inscription with one large clearly readable A, dark engraved paint inside the existing steel plaque. Keep the real bolts, plaque material and shadow. Leave the OFF switch correctly locked by the red padlock. Preserve the exact cabinet, switch, padlock, camera, framing, lighting, background, material detail, alignment and all unrelated pixels. Real photographic printed ink on paper only. No overlay, vector graphic, interface, watermark or subtitles. No extra hands or objects. Same native landscape frame, no upscaling.
```

## isolator-unlock.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-25877a2f-9332-49b1-ad9d-6e703409291c.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Show actual removal of the safety padlock, not its installation. A single right hand wearing the same dirty grey knitted glove with dark rubber fingertips and navy sleeve enters from the right and holds the existing red padlock body pulled about 8cm to the RIGHT of the switch hole. The silver shackle is unlocked OPEN, rotated diagonally and almost completely slid out of the handle hole, with only its free curved tip beside the hole. Show the rotary switch's empty hole clearly and the detached opened padlock physically held between thumb and fingers. Padlock body tilts clockwise 25degrees during withdrawal. The hand grips the body with natural anatomy and contact shadows. No paper tag, tag already removed. Keep the switch horizontal OFF. Preserve the exact cabinet, switch, padlock, camera, framing, lighting, background, material detail, alignment and all unrelated pixels. Real photographic printed ink on paper only. No overlay, vector graphic, interface, watermark or subtitles. No extra hands or objects. Same native landscape frame, no upscaling.
```

## isolator-tag-other.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-674a3dd4-167f-43c2-8b29-6a7b72146597.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Treat the supplied tagged workplace photo as the EDIT TARGET. Preserve all unrelated pixels and exactly the same framing, perspective, lighting, cabinet, OFF rotary switch, closed red padlock through the switch hole, B/C nameplate, door latch, background, scratch texture and materials. Native image size, never enlarge. Actual photography only, no UI, no diagrams, no floating shapes. Change ONLY the tag's worker name line from WORKER: SELF to WORKER: MIKE LEE. This is a fictional other worker. Keep DO NOT OPERATE / JOB: B/C CLEANUP / DATE: 2026-10-09 identical and clearly printed on the same paper, same perspective, black ink and paper size. No hands.
```

## isolator-tag-worn.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-71785843-39a4-43ee-8ba2-58e605a0f56b.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Treat the supplied tagged workplace photo as the EDIT TARGET. Preserve all unrelated pixels and exactly the same framing, perspective, lighting, cabinet, OFF rotary switch, closed red padlock through the switch hole, B/C nameplate, door latch, background, scratch texture and materials. Native image size, never enlarge. Actual photography only, no UI, no diagrams, no floating shapes. Change ONLY the real paper tag to a badly worn illegible one: tear off its lower-right corner, add actual irregular torn paper fibres at edges, greasy stains and severe physical abrasion/smudging that erases all worker/job/date identification so the black text becomes unreadable dirty fragments. Keep red header band, cable tie, punched hole and tag position identical. The damage must be visible physical paper wear, not pixel blur or a censorship overlay. No hands.
```

## isolator-tag-contact.png

생성 원본: `C:/Users/nomus/.codex/generated_images/01a11f32-d9ab-7433-8d86-73374a7a841c/exec-8f758946-642a-4342-ba47-578c80a485f6.png`

최종 편집 프롬프트(Prompt):

```text
Use case: precise-object-edit. Treat the supplied tagged workplace photo as the EDIT TARGET. Preserve all unrelated pixels and exactly the same framing, perspective, lighting, cabinet, OFF rotary switch, closed red padlock through the switch hole, B/C nameplate, door latch, background, scratch texture and materials. Native image size, never enlarge. Actual photography only, no UI, no diagrams, no floating shapes. Show an actual worker ATTACHING this same paper tag to the already installed closed red padlock. Add one natural right hand wearing dirty grey knit glove with dark rubber fingertips and navy industrial sleeve entering from the right. The thumb and index finger physically pinch the black cable tie beside the tag top punched hole, pulling its free thin tail through the locking head around the shackle. The paper rests naturally at identical position against cabinet, and its printed DO NOT OPERATE / WORKER: SELF / JOB: B/C CLEANUP / DATE: 2026-10-09 stays visible below the fingertips. Leave switch lock shackle and red body visible. Natural contact shadows and plausible human hand anatomy; don't hold the padlock body, fingers manipulate the actual cable tie instead. Keep bottom15% quiet.
```

# 조작판과 무전 사진 컷 생성 기록

- 생성 방식: 내장 imagegen 도구. CLI나 외부 API는 사용하지 않음.
- 저장 위치: `assets/actions/v2/`
- 요청 해상도: 가로 16:9, native 3840×2160.
- 실제 생성 해상도: 모든 컷 1672×941. 확대나 보간하지 않음.
- 조작판 기준 이미지: `control-idle.png`. 정지, 비상정지, 시험 컷은 이 원본을 편집해 생성.
- 무전 기준 이미지: `radio-idle.png`. 송신 컷은 이 원본을 편집해 생성.
- 기존 참조: `assets/actions/panel.png`, `assets/actions/radio.png`, `assets/stage-background.png`.
- 시각 검수: 조작판 버튼 형태와 크기 구분, 해당 버튼 실제 접촉, 구도와 배경 위치, 무전 측면 송신 버튼 접촉을 확인.
- 시험 컷: 시작 버튼 압력 유지와 기존 상단 물리 표시등 녹색 점등. 정상 복귀 순서는 시험, 정지, 기본 컷으로 연결 가능.
- 한계: 생성 편집은 배경의 픽셀 단위 동일성을 보장하지 않음. 비교 시 주요 장치와 배경 구조 정렬은 유지됨. 아래 15%에는 별도 글자를 생성하지 않았지만 손목 일부가 우측에 들어옴.

## control-idle.png

```text
Use case: photorealistic-natural
Asset type: industrial safety training game full-screen photographic action cut, 16:9 horizontal, requested native 3840x2160 pixels.
Input images: Image 1 (panel.png) is environment/material reference; Image 2 (stage-background.png) is factory environment reference. Rebuild one coherent actual photograph, not an overlay.
Primary request: A realistic modest-sized industrial conveyor control panel mounted on a steel upright in the same aggregate processing factory. Eye-level close medium shot. Warm late-afternoon side light, grey dusty metal, real yellow mesh safety guards and black conveyor visible softly out of focus in background. One physically manufactured rectangular grey enclosure centered in the upper 75% of frame, with realistic switches that are clear and reachable: at upper left a raised BIG red mushroom emergency-stop on a yellow circular collar; below it at lower left a SMALL ordinary flat red stop pushbutton in a silver bezel; lower right a SMALL green start pushbutton in a silver bezel; a tiny status lamp near upper right. Distinguish red stop and red emergency by shape and size. No hand in this idle frame. Keep framing wide enough for gloved hand entering from frame right in future variants. The panel is compact and believable, not a giant blank sheet. Bottom 15 percent is uncluttered out-of-focus dark factory foreground as subtitle room, no text or graphical black bar.
Style: premium documentary photography, credible tactile manufacturing details, natural optics and physically consistent contact shadows.
Constraints: NO computer interface, NO overlays, NO floating labels, NO inset screen or miniature conveyor, NO Korean text, NO logos or watermarks. Physical buttons are integrated in metal with drilled fittings, not flat graphic shapes. No display screen. No artificial vignette.
```

## control-stop.png

```text
Use case: precise-object-edit
Edit target: attached control-idle photograph. Make the NORMAL STOP action variant.
Change only this: a realistic beige worn leather safety-gloved RIGHT hand enters from the RIGHT edge, diagonally inward, with the extended index fingertip physically contacting and depressing the SMALL RED normal-stop pushbutton at lower left of the panel. The small red normal stop has a silver bezel and is below the large mushroom. The palm and other curled fingers are to the right of the contact point. The hand must not press or cover the large red emergency mushroom at upper left. The small green start remains clearly visible.
Preserve the exact same full-image dimensions, camera, crop, panel position, every bolt, enclosure texture, switches, warm lighting and factory background. No zoom or movement. Do not repaint any background. Real contact shadow at fingertip and slight depression of small red button. Keep bottom 15% available for subtitles. No text, overlays, UI, labels, screens, watermark. One coherent documentary photograph, integrated natural hand lighting. Requested 16:9 native 3840x2160 when possible, but keep input geometry exact.
```

## control-emergency.png

```text
Use case: precise-object-edit
Edit target: attached control-idle photograph. Make the EMERGENCY STOP action variant.
Change only this: a realistic beige worn leather safety-gloved RIGHT hand enters from RIGHT edge, diagonally upward and inward. Its palm heel and four gloved fingertips firmly press the FRONT FACE of the BIG RED MUSHROOM emergency stop at upper left on its YELLOW CIRCULAR COLLAR. The hand visibly makes contact with the big mushroom. The emergency mushroom is slightly depressed. Both smaller pushbuttons below (ordinary red normal stop and green start, each in silver bezel) remain visible and untouched.
Preserve exact image dimensions, camera, crop, panel position, every bolt, enclosure texture, switches, warm lighting and factory background. No zoom or viewpoint change, no background repaint. Integrated realistic hand lighting and contact shadow, not a pasted hand. Bottom 15% stays available for subtitles. No text, overlays, UI, floating labels, screens, watermark. Requested 16:9 native 3840x2160 when possible, but keep input geometry exact.
```

## control-test.png

```text
Use case: precise-object-edit
Edit target: attached control-idle photograph. Make the START COMMAND HELD / TEST action variant.
Change only this: a realistic beige worn leather safety-gloved RIGHT hand enters from RIGHT edge, with its extended THUMB pad physically contacting and depressing the SMALL GREEN start pushbutton at lower RIGHT in its silver bezel. The glove holds the green button down continuously, clearly real sustained thumb pressure, not just hovering or pointing. Palm and curled fingers are to the right of the button, never over the red stop. Show a clear contact shadow and visibly inset green cap. Change the existing small physical status indicator at UPPER RIGHT of the panel from amber to an illuminated GREEN lens, bright enough to show active command. Do not add an indicator or selector. The big red mushroom and small ordinary red stop remain visible and untouched. The actual button press and physical green lamp must communicate the held active start command.
Preserve exact image dimensions, camera, crop, panel position, every bolt, enclosure texture, warm lighting, factory background. No zoom or viewpoint change, no repainting background. Natural integrated hand lighting. Bottom 15% subtitle room. No text, overlays, UI, labels, screens, watermark. Requested native 3840x2160 16:9 if possible, preserve input geometry.
```

## radio-idle.png

```text
Use case: photorealistic-natural
Asset type: industrial safety training game full-screen photographic radio communication action cut, horizontal 16:9, requested native 3840x2160.
Input images: radio.png is realistic radio/glove subject reference. stage-background.png is factory environment reference. Make a coherent integrated actual photograph, no transparency or pasted cutout.
Primary request: first-person close medium photograph of a beige worn leather safety-gloved RIGHT HAND naturally holding a realistic black industrial two-way handheld radio upright at center-right in same aggregate conveyor factory. Three-quarter SIDE VIEW exposes the radio's real rubber PTT side switch toward the camera. The gloved thumb is RESTING near but clearly NOT pressing that switch; leave the whole actual side switch visibly free. Radio has long black antenna, two physical top knobs, subtle speaker grille, no logos. No screen graphics. Its size is realistic, no giant oversized glove. Softly blurred steel posts, black conveyor belt and yellow mesh guardrails in background, warm sunset light from right like reference. Radio held in upper 75% of frame, glove wrist from right, bottom 15% is unobtrusive blurred dark foreground for subtitles. Lock this composition as a base for thumb-press editing.
Style: documentary photography, believable leather grain, tactile rubber and scratches, real factory ambient shadows. No text, no UI, no floating labels, no watermark, no borders.
```

## radio-transmit.png

```text
Use case: precise-object-edit
Edit target: attached radio-idle photograph.
Primary request: make the TRANSMIT photo variant by changing ONLY the right glove THUMB pose: bend the thumb inward so the thumb PAD visibly presses and compresses the actual black ridged rubber push-to-talk side switch on the RIGHT edge of the same radio. PTT is the upper side switch beside the speaker grille, NOT the front display, NOT knobs, NOT antenna. Its pressure must be clear from actual thumb contact and slight rubber depression. Keep other fingers gripping the same radio in the same positions.
Invariants: same complete radio at identical pixel location, same antenna and knobs, same hand/wrist position except thumb, exact camera angle/crop, warm light, identical factory background, same image size. No movement of the radio or glove's wrist; no zoom. Bottom 15% available as subtitle area. A real integrated documentary photograph. No labels, UI, overlay arrows, text, logos, or watermark. Requested native 3840x2160 16:9 if possible, preserve input geometry.
```



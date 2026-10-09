# SAFEPLAY horizontal-conveyor overview variant

- Generated: 2026-10-09 (Asia/Seoul)
- Tool: built-in `image_gen.imagegen`, opaque raster output
- Final asset: `assets/images/overview/factory-overview-horizontal-v2.png`
- Actual output: 1672 × 941 pixels; 3,110,899 bytes. No artificial upscaling was applied.
- Edit source: `assets/images/overview/factory-overview.png` (unchanged and retained)
- Original source provenance: `assets/images/overview/factory-overview.prompt.md`
- Edit scope: left conveyor assembly and directly associated maintenance walkway, supports and lower tower connection.
- Review status: reviewed; parent inspected the saved final image and verified the horizontal conveyor on 2026-10-09.
- No game UI/source replacement is part of this additional-image request.

## Initial exact edit prompt

```text
Use case: precise-object-edit
Asset type: additional version of SAFEPLAY 2D game's realistic full-factory overview background.
Input image 1: factory-overview.png is the EDIT TARGET. Preserve its entire factory scene, original wide framing and visual quality.
Primary request: Make a local structural edit to ONLY the left-side conveyor assembly and the maintenance walkway/supports immediately associated with it. Replace the large steep inclined conveyor and every local sloping conveyor/ramp segment around the left assembly with ONE continuous STRAIGHT HORIZONTAL conveyor work area.
Critical geometry: The new conveyor's black rubber belt and adjacent grated walking deck must run LEFT TO RIGHT, nearly parallel to the bottom edge of the image, with no elevation change from one end to the other. The walkable deck must be completely flat and level, on consistent-height practical steel supports, accompanied by worn yellow safety handrails. A 2D side-scrolling player should be able to walk along a single straight horizontal groundline. NO inclined belt, NO ramp, NO sloping walkway, NO staircase in this conveyor work area, NO segmented rising sections, NO curves or zigzags. Remove the entire former inclined left conveyor span including the high slanted support structure; do not simply rotate the image view or hide the old incline.
Placement and engineering: Place the new level conveyor across the front-left industrial service area and connect it into the LOWER part of the blue-and-white batching tower, at a plausible low service-platform elevation, never into the distant tall upper silo. Its unobstructed black belt and yellow-railed maintenance deck should be conspicuous and horizontally readable. Local support columns, entry opening and the immediately adjacent service platform may be adjusted just enough to make this replacement structurally believable. Keep the blue-roofed left aggregate storage shed where possible.
Invariants: Everywhere OUTSIDE this left conveyor assembly and immediately adjacent structural connections, preserve the existing scene: quarry rock backdrop, blue-and-white batching tower and blue silo cluster, middle concrete mixer truck yard, vehicles, right-side buildings, foreground aggregate bays and muted blue roof, concrete surface and access roads, front gate and trees. Preserve the same slightly high oblique aerial perspective, same landscape composition, realistic equipment scale, detailed dusty gray steel and concrete materials, restrained wear, muted blue and ochre yellow colors, and warm afternoon light from rear-right. Do not redesign or zoom the factory and do not change the camera to top-down.
Output: opaque landscape raster background, retaining the source image's approximately 16:9 1672x941 composition.
Avoid: text, labels, logos, watermarks, UI, titles, arrows, buttons, click markers, people or player characters, disasters, fire or injuries. Do not introduce other artistic styles. This is an additional version, not a replacement of the original source file.
```

## Targeted correction and final exact prompt

The initial edit removed the steep original incline but still left a diagonal belt in screen space. It was not accepted as final. The final generation used that intermediate image as its edit target and the following correction prompt. The rejected intermediate is not referenced by the project.

```text
Use case: precise-object-edit
Input image: the supplied factory overview is the EDIT TARGET.
Single targeted correction: The yellow-railed conveyor on the LEFT is STILL a diagonal rising from lower-left to upper-right. Correct ONLY that conveyor, its rails/deck/supports and its immediate tower connection. Leave every other part of this image unchanged.
Replace this diagonal conveyor with one continuous dead-straight LEVEL HORIZONTAL BLACK BELT and adjacent flat steel-grating maintenance walkway. In the actual output image, both long edges of the belt, the deck foot-contact line and both yellow railing tops MUST be parallel to the bottom edge of the image, at essentially CONSTANT PIXEL Y along their entire length. LEFT and RIGHT ends at same image height. A side-scrolling player should walk LEFT-RIGHT without any change in screen foot height. This is not a gradual slope, not a ramp, and not merely a level structure receding diagonally into perspective.
Geometry/placement: Orient this new conveyor laterally across the left service yard, in an axis that looks horizontal to the current fixed camera. Extend from the left plant service edge to a new low-level receiving opening at the lower front of the blue-and-white tower. Target approximately image x=90 through x=650, with black belt at y=350 (relative to the 1672x941 source), yellow rail top at y=325, flat walking deck at y=375. These are approximate compositional guides; keep a perfectly flat-looking unobstructed deck and both ends at the same height. Use plausible steel support legs with deck elevation constant, no rising top chord. Eliminate the prior diagonal yellow rail/conveyor to the tower at y=220 entirely. Modify only the necessary lower tower opening and immediate support framework. Do not cover this new conveyor with a roof.
Preserve: EXACT same factory aerial perspective, wide framing, quarry backdrop, blue and white tower and cylindrical blue silo, trucks and yard, roofed foreground/right aggregate bins, buildings, gate, road, vegetation, materials, and warm afternoon rear-right light. No camera movement, no changed overall factory layout, no new scene. Existing original asset will be retained separately.
Avoid: ANY diagonal conveyor or diagonal walking deck in the left work area, ANY slope or stairs along the designated level maintenance deck, curved or segmented belt, text, UI, markers, logos, watermarks, player characters, disaster. Opaque raster, approximately 16:9 composition.
```

## Final visual observations

- The former steep left conveyor and its high diagonal support span have been removed.
- The new black belt and adjacent yellow-railed maintenance deck run left to right, parallel to the image bottom, with no visible rising deck, ramp, curve or stair section along this work area.
- Constant deck height and vertical support legs make one horizontal walking line readable.
- The conveyor connects at the tower's lower service opening, below the tall cylindrical silo cluster.
- Full-factory framing, blue-and-white tower, quarry, mixer trucks, aggregate bays, roofs, front gate/road and rear-right warm light remain visually consistent with the original.
- Generated local connections and newly exposed background differ where the old inclined assembly was removed; preservation is visual, not a claim of pixel-exact identity.
- No UI, labels, readable company lettering or prominent player were added.

Approximate normalized coordinates against the full uncropped final image:

- Horizontal conveyor/walkway rectangle: `x=0.038, y=0.251, width=0.414, height=0.054`.
- Representative belt/deck interaction anchor: `u=0.245, v=0.280`.
- Work deck foot-contact line: approximately `v=0.293` across the visible run.

Markers and instructions remain separate code-rendered overlays.

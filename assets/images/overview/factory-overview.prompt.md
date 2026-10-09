# SAFEPLAY factory overview generation record

- Generated: 2026-10-09 (Asia/Seoul)
- Tool: built-in image_gen.imagegen, opaque raster output
- Final asset: `assets/images/overview/factory-overview.png`
- Actual output: 1672 × 941 pixels, 3,534,389 bytes. The tool returned this size despite the prompt's requested minimum; no artificial upscaling was applied.
- Structural/layout reference: `G:\내 드라이브\Open AI\참조이미지\화성공장_드론샷.jpg`
- Visual materials/light reference: `G:\내 드라이브\Open AI\참조이미지\현재장면.png`
- Written style reference: `G:\내 드라이브\Open AI\참조이미지\이미지-스타일가이드.md`
- Source references were inspected and left unchanged. Source paths are provenance only; runtime must use the relative final asset path.
- Screenshot UI and character are excluded from the generated backdrop.
- Layout is an interpreted game environment, not a measured plant plan.

## Exact generation prompt

```text
Use case: stylized-concept
Asset type: production-ready raster background for SAFEPLAY safety-training 2D browser game's first full-factory overview screen.
Primary request: Create one wide 16:9 full factory exterior overview image at 1920x1080 or higher, using the supplied images as references. It is a standalone image backdrop consumed by a 2D game, with realistic photographic/painterly industrial detail.
Input images: Image 1, 화성공장_드론샷.jpg, is the structural/layout reference: a real aggregate and ready-mix concrete plant at the foot of a pale quarry rock wall. Image 2, 현재장면.png, is the visual style/material/light reference ONLY; ignore every title, control, marker, label, vignette UI, character, and game interface in this screenshot.
Scene and subject: Show the same coherent type of full plant: tall blue-and-white batching tower and upright blue cylindrical silo cluster in upper-left/center; a long inclined blue conveyor ascending along the left to that tower; an industrial service yard with realistically scaled blue and white concrete mixer trucks in the middle; a long muted-blue-roof aggregate storage shed and separated gray gravel bins towards foreground-right; quarry rock wall with a little distant vegetation behind. The site has dusty pale-gray concrete, practical access roads, gray steel support structures and restrained signs of use. Do not reproduce any company lettering.
Composition: Slightly high oblique aerial viewpoint, lower and wider than a top-down plan, so the whole factory is readable in one horizontal frame. Preserve the broad functional connections from the drone reference while adapting its portrait framing into landscape. All main equipment should fit inside the frame with modest margins. Avoid extreme wide angle, toy-like isometric view, cutaway diagrams and impossibly distorted structures. Keep calmer sky/quarry/edge areas suitable for code-rendered title and controls.
Critical game entry area: Give the inclined conveyor on the left a clearly visible open steel belt and grated maintenance walkway segment with yellow safety handrails, mechanically connected to the batching tower, matching the supplied side-scrolling scene's exposed black rubber belt, gray steel columns and worn yellow rails. The conveyor zone should be easy to locate and not entirely hidden inside blue roofing. Maintain a believable industrial structure and readable dark belt against lighter metal.
Style and light: Photographic realistic game-environment painting, not cartoon or pixel art. Moderately desaturated gray steel, charcoal rubber, dusty gray-brown aggregates and concrete, muted industrial blue roofs and panels, ochre yellow safety rails. Restrained paint wear, small rust patches, dust and realistic metal texture; working plant, not ruin. Warm low afternoon light comes from the rear-right of the frame with coherent shadows towards the front-left, cooler gray shadows under structures, subtle atmospheric depth. The reference screenshot's muted industrial palette and layered materials must carry through.
Constraints: Background only. No baked UI, no labels, no buttons, no clickable markers, no border boxes, no text, no logos, no watermarks, no arrows, no prominent people or player characters. No visible injuries, explosions, disaster, flames, cinematic catastrophe, excessive bloom, neon colors, heavy vignette, or duplicated rails/vehicles. Keep truck and building scales realistic. Opaque background.
```

## Visual review and interaction coordinates

The final image preserves the blue-and-white batching tower, blue silo, ascending left conveyor, central mixer truck yard and front-right aggregate shed. The conveyor belt and yellow-railed maintenance access are exposed and readable. The image has realistic steel/concrete detail, coherent rear-right warm afternoon light, no visible lettering/UI, and no prominent baked player.

Coordinates are normalized against the whole source image before any crop:

- Primary exposed inclined-conveyor area: approximate rectangle `x=0.162, y=0.079, width=0.178, height=0.366`.
- Representative conveyor interaction anchor: `u=0.241, v=0.273`.
- Optional lower conveyor maintenance deck anchor: `u=0.288, v=0.462`.

The conveyor rectangle contains the full ascending run and may be narrowed to a polygon in the UI. All markers, borders, titles and instructions must be rendered separately by code.

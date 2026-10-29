# EXO V2 and VectorCraft: native 2D vector editing

Research and implementation date: 18 October 2026.

## Source and licensing

Official independent VectorCraft repository: https://github.com/storytold/vectorcraft, pinned to commit 73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7. Local shallow/sparse checkout at research/oss/vectorcraft preserves LICENSE-MIT, LICENSE-APACHE, and NOTICE. The local checkout is a source research copy, not a hosted GitHub fork and not proprietary Adobe Illustrator code. All new EXO geometry/UI code is independently written with the verified open-source interaction patterns. Upstream Pen implementation: https://github.com/storytold/vectorcraft/blob/73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7/crates/tools/src/pen.rs . Pencil gesture implementation: https://github.com/storytold/vectorcraft/blob/73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7/crates/tools/src/draw2/gesture.rs . Anchor model: https://github.com/storytold/vectorcraft/blob/73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7/crates/geom/src/path.rs .

## Implemented native 2D workflow

1. Edit Pattern cubic handles: src/core/vectorPatternBezier.js adds physically measured cubic splitting/length, 45-degree Shift snapping, smooth opposite-handle alignment with stable peer length, and Option independent-handle editing. ClothCraftBoardV2.jsx previews and commits real Rust Shape edits. The selected edge shows its controls without excess dots on other edges.
2. Shoulder reference lines have precisely two end dots per shoulder regardless of tessellated geometry; the sampled stroke stays smooth. Center-chest, belly and upper/lower hem retain left-center and center-right selectable sections, one middle dot and a segmented connected centerline.
3. Settings > Tool Index > 2D EXO extras offers optional Vector Pen and Vector Pencil. Pen click adds a corner, click-drag creates native cubic tangents, Shift locks 45 degrees, Enter completes an editable panel. Pencil drag samples a freehand path; an RDP simplifier fits a finite path, detects nearly closed loops and enforces <=64 anchors in material metres, then commits actual native cubic pattern geometry.
4. Native workspace polygon callbacks now accept optional tangents and preserve the old zero-tangent path for legacy callers. Existing garments are not replaced.
5. Settings > Tool Index also offers opt-in physical front/back sewing balance notches. Only recognized front/back attachment edge names armhole/sleeve-under/underarm receive notches. Front gets a single, back gets double marks per edge, with a six-millimetre depth. Existing native notches are skipped. These red cutting notches remain distinct from sewing-direction markers.

## Test coverage

- VectorFreehandFit unit tests: 5/5 pass.
- Cubic metre-based geometry continuity, split, length and independent handle assertions: pass.
- Native isolated Rust/Chromium test qa-v2-vectorcraft-drawing-20261018.mjs: PASS. Pen saved one 3-anchor native pattern with three cubic segments, Pencil saved a closed 17-anchor pattern with 17 cubic segments, then balance-notch action persisted two front and four back physical edge-relative notches. Native revisions 1, 2 and 8; zero page or workspace API errors.
- Native front/back guide QA: 20 selection/hover scenarios, source node alignment, saved internal lines, neckline edit and display visibility check.
- Production Vite installer completed successfully using the real bridge URL http://127.0.0.1:5385 and the signed EXO ClothCraft Studio V2.app. Previous bundle retained at the dated local application-support backup web-before-20261018-033550. Required hardware and 3D asset bundle verification passed: 162 items, 133 GLBs and 162 thumbnails. After restarting and bringing V2 to the foreground, its served index-NQmxG57e.js matched the on-disk SHA-256 digest exactly. The installed smoke test passed with nativeReady=true, fabric/geometry WASM ABI=1, 2 panels, 0 bad ports, 0 page errors, and 0 texture warnings.

## Scope limits

The main native ClothCraft Rust polygon supports cubic controls, whereas legacy PatternEditor and other EXO subsystems also maintain quadratic geometry. A full schema migration would need geometry, sewing, grading, measurements and export compatibility updates. Vector Pen/Pencil currently create new native panels and are not a complete Illustrator clone. Rust EdgeNotch currently holds arclength fraction and depth, without full CLO notch type/angle/group metadata. Factories must verify sewing notch positions and graded allowances before manufacturing. Extreme curves, self-crossing freehand strokes and accurate DXF allowance joins need further work.

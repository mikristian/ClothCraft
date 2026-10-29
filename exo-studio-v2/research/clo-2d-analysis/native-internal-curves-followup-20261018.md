# Native internal-line curves: 2D editor follow-up

Implemented in the ClothCraft 2D window on October 18, 2026.

## CLO source workflow

CLO uses **Edit Curve Point** and **Edit Pattern** to edit true Bézier pattern geometry, while **Internal Polygon/Line** can create curved internal construction lines. Official documentation: [Edit Bézier Curves](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) and [Internal Polygon/Line](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line). A construction curve is a separate garment object from a cutting edge, notch, seam allowance, topstitch or directional sewing relation.

Existing EXO Rust InternalLine objects already store material-coordinate points and symmetric tangent vectors; each interval uses cubic controls (start, start+tangent, end-tangent, end). Previously the React 2D board rendered straight chords between native anchors, even if an internal line had curved tangents.

## Implemented

1. Added src/components/nativeInternalCurve.js. The 2D canvas renders actual material-space cubic samples, with the same signed symmetric tangent convention as Rust, at 33 points per interval.
2. The Select tool hit-tests the actual curved polyline. Hover and click highlighting work anywhere on the visible curve, including after zoom and full page reload.
3. In **2D Edit Curves**, clicking an internal line reveals native tangent handles. For a straight native line with zero tangents, selection first creates collinear handles, preserving the physical straight stroke. Dragging a handle changes that line's stored tangent in a Rust Shape transaction. Original line IDs, anchor positions, other pattern geometry, and sewing references are preserved.
4. **Option-click** a curved internal line to set its tangents to zero and straighten it, creating an undoable native revision.
5. Native curve source identity persists across revisions, whereas any previously selected handle is reset when the garment document changes. The existing 2D Pattern Display controls still distinguish temporary proportion/reference guides from saved native InternalLines. No persisted file schema or original user garment was migrated.

## Verification

The focused disposable Rust workspace / Chromium script integrations/clothcraft/qa-v2-native-internal-curves-20261018.mjs exercised straight line authoring, Bézier conversion, a real pointer drag, source tangent change, exact source line identity, document reload, curved-path hover/selection, and Option-click straightening. Latest result: PASS with no browser errors or HTTP failures, through native source revisions 1–4. Screenshot: research/clo-2d-analysis/native-internal-curve-20261018.png.

The final Vite production bundle and hardware-asset verification passed. The existing EXO ClothCraft Studio V2.app was updated with the generated web resources, re-signed and verified. The installed bridge smoke test returned nativeReady=true, rustFabricWasmAbi=1, rustGeometryWasmAbi=1, panels=2, badPorts=0, pageErrors=0 and textureWarnings=0. A pre-update hard-linked rollback is preserved in integrations/clothcraft/output/app-backups/EXO-V2-before-native-internal-curves-20261018. User garment files and native executables were retained. The reproducible dist build folder was deleted after successful installation to recover disk space.

## Remaining parity limits

Rust supports 2–64 internal-line anchors, but this pass edits tangent handles and does not yet add/remove interior anchors. Intervals use 32 fixed subdivisions rather than adaptive flatness for extreme high-zoom curvature. CLO's complete curve-handle modifier constraints, detailed seam allowance corner joins, notch type/angle/grading, and sewing-direction mapping are still distinct work. The paired red marks in the local reference crop remain a probable physical back notch based on visual evidence; definitive classification requires selecting them in native CLO.

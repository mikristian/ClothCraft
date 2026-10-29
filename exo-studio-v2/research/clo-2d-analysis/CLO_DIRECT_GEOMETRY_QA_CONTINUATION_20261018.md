# CLO 7 direct geometry tests — continuation, 2026-10-18

## Scope, method and safe state

The actual native macOS **CLO 7.0.242 (r39887)** application was driven through the signed `EXO CLO Inspector.app` using Accessibility menus, real CGEvent input, and ScreenCaptureKit. All mutating gestures targeted the **unsaved in-memory copy** `Male_T-shirt-direct-test-20261018.zpac`; the original example and the on-disk copied fixture remained identical at last hash check (`SHA-256 eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83`). No changes were saved to those garments and no app UI source or native solver was edited in these tests.

The host initially had ~1.7 GiB free, below CLO's prior warning threshold of 10 GiB. Rebuildable Rust `target/` outputs (Cargo clean), generated CMake outputs, and disposable pip/Playwright/Puppeteer caches were cleared. Approximately 8 GiB of actual available capacity was recovered, temporarily reaching just over 10 GiB. Existing EXO release rollback backups, garment files, Blender/Whisper models, music and project source folders were preserved. macOS free capacity later fluctuated to ~9.3 GiB; future interactive CLO tests should recheck it and keep >10 GiB headroom before reopening files.

### Direct test A — line point insertion and Undo (observed)

- Activated **`2D Pattern > Edit > Add Point/Split Line`** by actual Accessibility menu `AXPress`, with result code 0. Real `CGEvent` pointer input clicked the left torso side between preexisting vertices on the live 2D contour.
- Source screenshots: `clo-native-sewn-edge-add-tool-20261018.png` and `clo-native-sewn-edge-add-result-20261018.png`. The latter shows a new colored vertex on the clicked left vertical side and a corresponding vertex on the linked symmetric right side. Existing points on the nearby horizontal internal construction guidelines remain at their previous locations.
- `clo-native-add-point-before-undo-20261018.png` and `clo-native-add-point-after-undo-20261018.png` demonstrate subsequent real **Edit > Undo** and removal of the added point from the contour. `clo-addpoint-three-frame-review-20261018.png` is a contact crop at higher magnification for reviewing the exact intermediate marker appearance.
- **Observed classification:** added point is displayed as a new contour node; symmetry propagation and Undo visually confirmed. **Not verified:** persisted stable IDs, actual sewing data references on the new edges, notch reparameterization, seam allowance recalculation, grading changes or PDF/export manufacturing geometry. Visible fabric/seam colors and unchanged 3D drape are insufficient to prove those contracts.

### Direct test B — dragged outline anchor and native menu Undo (observed)

- Selected **Edit Pattern**, then dragged a visible shoulder anchor on the copied torso by approximately `(-12,-7)` **screen pixels** using genuine mouse-down/multiple drag frames/mouse-up. These are screen deltas, **not centimetres**.
- Before/drag/after-Undo screenshots: `clo-native-point-menu-undo-before-drag-20261018.png`, `clo-native-point-menu-undo-after-drag-20261018.png`, `clo-native-point-menu-undo-after-undo-20261018.png`.
- The moved shoulder and neighboring segments are visibly different in the drag screenshot, including synchronized front-of-avatar shoulder alteration. CLO's **Edit > Undo** menu `AXPress` returned result 0 and `AXEnabled=true`. After Undo, the original shoulder silhouette was restored. Comparing a 147×79 pixel shoulder ROI, >900 pixels changed under the drag whereas ~155 changed after Undo versus original; the remaining differences are mainly selected anchor overlays.
- **Observed classification:** live point drag, linked geometry update, successful native menu Undo. **Not verified:** floating-point positions or exact constraints on smooth-versus-corner node handles.

### Direct test C — free curve point selection (inconclusive)

- Activated actual **Edit Curve Point** mode and clicked the visible left-front neckline interior at window-relative `(830,435)`. Probe log: `CLO native menu activated Edit Curve Point: AX result 0`; the click was dispatched.
- Evidence `clo-native-free-curve-point-before-20261018.png`, `clo-native-free-curve-point-tool-20261018.png`, `clo-native-free-curve-point-after-20261018.png` shows a changed selection state, a selection gizmo in 3D, and a `17.00` curve label on the 2D neckline. The clicked area and selected objects need further disambiguation.
- **Do not claim a free curve point was inserted** on the basis of the screenshot. There is no demonstrated point-count increase or new independently draggable curve anchor. An EXO implementation should still distinguish a free curve point from a cubic tangent handle and from a cutline split, but this specific gesture has not established CLO's exact creation method.

### Direct test D — invalid Edit Curvature geometry rejection (observed)

- Activated **Edit Curvature** through native menu and dragged the left neckline near window-relative `(826,422)` by `(-9,-13)` screen pixels on the copied T-shirt (screen placement after zoom). Screenshot before gesture: `clo-native-curvature-before-20261018.png`.
- CLO displayed a modal native **Information** dialog with the exact message **“Pattern outlines and/or holes are intersecting.”** Screenshot: `clo-native-curvature-after-20261018.png` (dialog was screenshot as its own macOS window). While that modal was open, the native menu Undo item was disabled, so sending more Undo commands would have been invalid evidence.
- Inspector dismissed the specific dialog using a guarded `AXPress` on **OK**, only with the disposable file title present in the parent CLO window; verified result `clo-after-intersection-dismiss-20261018.png` showed the normal original neckline outline and the Property Editor's **2D Line Length 17.00 cm**, **+ Symmetric Line Len 34.00 cm**, **3D Line Length 17.05 cm** in that simulation state. The earlier direct loaded fixture showed 3D 16.95 cm; 3D state-dependent measurements should not be treated as identical across captures.
- **Observed classification:** CLO checks pattern integrity on a potentially invalid curvature edit, interrupts with an intersection warning, and keeps or restores a valid-looking neckline outline. **Not verified:** precise moment of rejection, whether a topology transaction is automatically rolled back before/after modal dismissal, or tolerance definitions for near-intersections. Native source is proprietary; do not infer a hidden collision algorithm.

### Direct test E — viewport navigation (observed)

- An opt-in nonmutating mouse-wheel probe was added to the signed helper, guarded to the copied garment and coordinates inside the CLO 2D canvas. A positive 5-unit scroll **zoomed out** from the garment; a negative 8-unit scroll **zoomed in** relative to the cursor.
- Screenshots `clo-zoom-before-20261018.png`, `clo-zoom-after-20261018.png`, `clo-zoom-close-20261018.png` show 2D patterns scaled with a fixed 3D view. This matters to EXO hit testing: the hit radius should be based on displayed pixels, while authoring length/distance must remain in physical units.

## EXO parity implications grounded by these tests

| Priority | Requirement | Existing EXO state and test |
| --- | --- | --- |
| P0 | **Prevent invalid geometry commits:** continuous contour/self-intersection and hole-boundary validation before committing a curve or point drag; display a specific error and preserve the prior authoring state | `src/core/draftingTopology.js` provides JS topology checks and the native Rust PolygonPattern has validity checks. Verify native `Anchor`, `CurvePoint`, Edit Handle preview/commit and all internal line/hole operations uniformly. CLO's modal is direct evidence that this belongs in the editing pipeline. |
| P0 | **Mirror physical/symmetric cutline edits** while keeping individually editable nodes; Undo must atomically revert paired geometry | CLO addition and drag show symmetric counterparts. EXO's native seam/geometry representation must link symmetric panels explicitly, with stable directed named edges. The current `SplitBoundary` refuses sewn/notched/allowanced edges as a safe fallback. |
| P0 | **Distinguish topology-changing vertex insertion** from free curve point and Bézier tangent; preserve sewing, notch, POM and grading references if a cutline is split | CLO contour node inserted/removed. EXO native `CurvePoint {anchor,curved}` only toggles handles on existing topological anchors; it is not a complete free curve point tool. |
| P0 | **Transactional, verified Undo/Redo** for point, curve and sewing-reference operations, including symmetry and 3D synchronization | CLO's menu-based Undo visibly restored the shoulder and split-point state. EXO browser tests exist; native Rust must be tested with persisted garment state, precisely selected edge IDs, and repeatable re-render. |
| P1 | **Differentiate 2D material length, symmetric total and 3D draped length**, recomputed after successful edits | CLO Property Editor showed 17.00 / 34.00 / 17.05 cm after rejection; previously 17.00 / 34.00 / 16.95 cm. The 2D measurement is primary for cutting; 3D drape depends on simulation. |
| P1 | **Viewport hit testing** using zoom-adjusted screen tolerances, real edge projection and snap priorities | Mouse-wheel direction and object scale were tested live; the first free-curve-point click mainly affected selection, demonstrating why precise hit disambiguation matters. |

## Remaining controlled test matrix

Only proceed with **one active helper run at a time**, on a dedicated copied test garment and with adequate disk. The next sequence is: (1) explicit Edit Curve Point creation and a point-count/curve-length before-after proof, (2) Edit Curvature pull of a valid unobstructed edge with numeric arc-length before/after, (3) notch/sewing/allowance attachment inspection before and after a real split and Undo, (4) free/sewing segment M:N selection and walk length verification, (5) redo and export/reopen of DXF-AAMA or DXF-ASTM with units declared. Each case needs the exact geometry active at its start, the active tool name, screen coordinates, typed values and an actual screenshot/measurement proving the result. For a rejected operation, capture the error and stop immediately; do not infer a completed edit.

The signed inspector's opt-in live probes are in `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`, alongside strict guards checking the copied garment before sending pointer gestures. The existing 57-chapter deep audit and `clo7-native-tool-mode-parity-20261018.md` remain the broader tool/specification baseline.

## EXO source fix completed after the live invalid-contour finding

Direct code audit exposed a previously accepted invalid geometry case in EXO's legacy 2D `src/core/draftingTopology.js`. Before the fix, the validator skipped **all pairs of sampled chords belonging to the same curved edge**. For a quadratic edge from `(0,0)` to `(10,0)` with control `(20,0)` in centimetres, the curve travels past its endpoint and retraces part of itself. `inspectDraftTopology` incorrectly returned `valid: true` despite the overlapping cutline.

The validator now retains the subdivided segment index and distinguishes a legitimate shared endpoint between two consecutive chords from a genuine same-edge overlap. It still permits ordinary straight and curved edges, but rejects a physically retracing edge with `Pattern contour crosses or overlaps itself`. `isDraftEditValid` consequently rejects the invalid control edit before authoring it. This is an **independent EXO correctness change motivated by the live CLO failure mode**, rather than copying or inferring CLO's proprietary algorithm.

Focused test: `src/core/draftingTopology.curveFoldback.test.mjs`, with 3 passing cases covering valid straight/bowed cutlines, collinear Bézier retracing, and nonmutating edit preflight. Existing compatibility checks also passed: `node scripts/check-drafting-topology.mjs`, `node scripts/check-drafting-precision.mjs`, and `node --test src/core/draftingPointDeletion.test.mjs` (4/4). No large Rust build was attempted at the remaining disk capacity. **This fix has been applied to source code; installation into the bundled desktop V2 runtime has not been repeated in this validation pass.**

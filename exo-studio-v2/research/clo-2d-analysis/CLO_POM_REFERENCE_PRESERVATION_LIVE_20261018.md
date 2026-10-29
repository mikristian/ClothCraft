# CLO 7 direct measurements and reference-preservation matrix

Date: October 18, 2026. App under test: running native **CLO Standalone OnlineAuth Academic 7.0.242 (r39887)**. Driver: signed, opt-in `EXO CLO Inspector.app` using real Accessibility menu commands, CGEvent interaction and ScreenCaptureKit. All tests targeted the disposable, unsaved in-memory `Male_T-shirt-direct-test-20261018.zpac` garment. File originals were not overwritten.

## Findings established through live interactions

### 1. Free curve point deformation versus saved POM length

Starting from an active Point of Measure table, created a second front/left side POM using the real POM tool. The native table contained two rows **POM 1 = 26.18 cm, POM 2 = 26.18 cm**.

Switched to **Edit Curve Point**, clicked the left front T-shirt side near window-relative `(787,521)` and dragged the point about `(-12,0)` displayed pixels outward. The panel visibly bowed, the 3D garment responded, and the on-canvas selected edge displayed approximately **29.41 cm**. Reopened **Edit Point of Measure**: both saved POM rows **still displayed 26.18 cm**. One native `Edit > Undo` returned the edge to straight while both POM rows remained at 26.18.

Files: `clo-pomcurve-initial-pom-table-20261018.png`, `clo-pomcurve-created-pom-table-20261018.png`, `clo-pomcurve-curve-dragged-20261018.png`, `clo-pomcurve-pom-table-after-curve-20261018.png`, `clo-pomcurve-pom-table-after-undo-20261018.png`. Tool results: Edit Curve Point, Edit Point of Measure and Undo AXPress returned code 0, no inspector warnings.

**Inference bounded to the screenshots:** this CLO 7 POM table did not automatically recompute the two length values when a free curve point deformed the side. Whether CLO requires an explicit POM update, a separate POM geometry binding, or some other action remains unverified. Do not infer CLO's proprietary data schema from this.

### 2. Sewn torso side split, no explicit added attachments

Selected native **Edit Sewing** before modifying a 2D side cutline. CLO visibly showed **26.17 cm / 26.18 cm** as a pair at the highlighted sewn side, with sewing relationship colors in the 2D and 3D views. Switched to **Add Point/Split Line** at `(787,522)`, then reselected the upper and lower side in Edit Sewing. The same approx. **26.17 / 26.18 cm** pair remained visible, and the seam color lines continued through the divided segment. Native Undo/Redo/Undo returned successful menu actions and restored expected contour markers.

Files: `clo-splitref-sewing-before-20261018.png`, `clo-splitref-cutline-after-20261018.png`, `clo-splitref-upper-sewing-after-20261018.png`, `clo-splitref-lower-sewing-after-20261018.png`, `clo-splitref-undo-20261018.png`, `clo-splitref-redo-20261018.png`, `clo-splitref-restored-20261018.png`.

**Verified:** visual sewing indicator and paired numerical length continuity, plus edit transaction reversal. **Still unverified:** actual internal sewing reference IDs or saved DXF correspondence.

### 3. Split with notch and seam allowance attached

Created a notch at `(787,532)` on the copied front side, with native properties **Type I**, **Perpendicular**, length **0.70 cm**, flip/lock fields. Activated **Seam Allowance** and selected the same side; native property Width **1.00 cm** appeared with distinct `Start` and `End` seam-type fields. Then invoked **Add Point/Split Line** at `(787,522)`. CLO showed an added split point with sublength labels **13.28 and 12.90 cm** (sum = 26.18 cm). The notch markers still appeared near the hem side and a later selected allowance continued to show **1.00 cm**. After returning to **Edit Sewing**, CLO showed the paired **26.17 / 26.18 cm** display.

Files: `clo-attachedsplit-baseline-20261018.png`, `clo-attachedsplit-notch-added-20261018.png`, `clo-attachedsplit-allowance-added-20261018.png`, `clo-attachedsplit-split-with-attachments-20261018.png`, `clo-attachedsplit-allowance-after-split-20261018.png`, `clo-attachedsplit-sewing-after-split-20261018.png`.

**Verified:** in the live editor, selected geometry and corresponding notch/allowance/sewing presentations remain available after a split. The later direct `Notch` re-selection attempt returned `CLO menu bar or path unavailable` due an intermittent transient menu window; do not claim that notch ID reattachment was directly queried.

### 4. **POM table rows disappear after splitting the measured edge, then return on Undo**

Before a split, the Object Browser's actual POM tab showed two rows of **26.18 cm**. A new split near `(787,516)` divided the left front side while its POM records existed. Switching back to `Edit Point of Measure` produced an **empty POM table**. Exiting into Transform Pattern, then re-entering `Edit Point of Measure` and waiting still showed no rows. Native `Edit > Undo` then restored the two 26.18 cm rows.

Files: `clo-pomrefresh-before-20261018.png`, `clo-pomrefresh-split-20261018.png`, `clo-pomrefresh-pom-after-split-20261018.png`, `clo-pomrefresh-pom-after-reenter-20261018.png`, `clo-pomrefresh-pom-after-undo-20261018.png`.

The previous attached-reference run showed the same pattern: POM table empty after torso side split, both POM rows visible after a subsequent Undo. In that run, a later Redo screenshot still contained both rows while selection/property state changed, so **do not conclude exact internal deletion or guaranteed Redo lifecycle from one sequence**.

### 5. **Control: splitting an unrelated edge also clears the POM table in this session**

With the same two 26.18 cm left/front side POMs still present, ran the same tool test with a different target: `(1005,520)`, the left vertical boundary of the rightmost/back torso pattern, far from the original measured side. CLO's on-canvas sublength readouts were **12.24 cm and 13.93 cm**. Switching into `Edit Point of Measure` produced an **empty table**. Exiting and re-entering POM still showed it empty. One native Undo restored the two 26.18 cm POM rows.

Files: `clo-pom-otheredge-before-20261018.png`, `clo-pom-otheredge-split-20261018.png`, `clo-pom-otheredge-pom-after-split-20261018.png`, `clo-pom-otheredge-pom-after-reenter-20261018.png`, `clo-pom-otheredge-pom-after-undo-20261018.png`.

The four-stage side-by-side comparison `CLO_POM_EDGE_SPLIT_4_FRAME_20261018.png` displays the measured-edge and unrelated-edge baseline tables alongside their post-split empty POM tables.

**High-confidence live UI conclusion:** this CLO 7 session can clear its POM table following **topological Add Point/Split Line changes, even on a different pattern**, while Undo restores the visible records. This was repeated on two different edges. It does **not** establish whether the underlying records are temporarily hidden, invalidated in memory or deleted from the proprietary document; no serialized POM record or clean save/reopen was inspected. An `Auto Saved` on-screen toast was observed once, but both source and copied fixture file hashes must still be checked before inferring any on-disk status.

## EXO-specific engineering conclusions

The current EXO native Rust pattern is a `PolygonPattern` with stable edges and attachments. Its `SplitBoundary` correctly refuses certain sewn, notched, allowanced and length-targeted edges until exact attachment migration is defined. **Preserve those guards.** Implementing CLO-style visible split editing should not introduce the measured-row disappearance observed in this CLO version.

Acceptance criteria for the EXO data model and 2D panel:

1. **Persistent POM** is a typed record with stable ID, display name, owning pattern, ordered edge/fraction/arclength references, measurement unit, intended grading sizes and 2D/3D mode. Store separately from temporary ruler previews.
2. **On free curve deformation**, recompute current referenced material-geometry arclength and show the new value, or explicitly mark the POM stale/needs reattachment when exact conservation cannot be guaranteed. Never show an unchanged length as current without a warning.
3. **On a measured-edge split**, preserve the POM record and migrate its ordered path into the new directed split edges with segment intervals using arc-length or exact cubic parameter correspondence.
4. **On an unrelated edge split**, POM count, identity, length and all references should remain unchanged. The control result above confirms the value of a global POM stability regression test.
5. **On sewn/notched/allowanced split**, create a single undoable transaction remapping original seam connections, notch parameters and allowance corner treatment to the new edge segments. Verify paired sewing walk lengths and the original notch physical placement. Fail closed if a mapping is ambiguous.
6. **Undo/Redo** must restore topology, POM/attachment IDs and measurements together, with deterministic save/reopen of the same result.

## Test verification and status

The inspector is signed under the previously approved identity and passed build/signing and `codesign --verify --strict`. All result images are in `research/clo-2d-analysis/`. This series changed the inspector's explicit testing commands under `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`; it did not edit production EXO UI/native geometry files. Changes were tested only in the unsaved copied CLO garment, respecting the user's explicit authorization to risk this disposable test session. The original CLO sample and copied on-disk research sample should be compared by hash at final handoff.

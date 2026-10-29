# CLO 7 native follow-up — POM updates, sewn split, notch and allowance references

Date: **2026-10-18**. Application: **CLO Standalone OnlineAuth Academic 7.0.242 (r39887)** on macOS. Native input and window evidence came from a signed `EXO CLO Inspector.app` (Accessibility, CGEvent and ScreenCaptureKit), using the sole copied document `Male_T-shirt-direct-test-20261018.zpac`. The example garment and copied fixture were never manually saved or exported in these experiments. Both on-disk files were re-hashed at the end (912,850 bytes; SHA-256 `eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83`).

## Finding 1 — a saved POM is independently editable and immediately recomputes

**Directly confirmed.** Created a third **Point of Measure** by tracing the right torso's straight side from native 2D window-local screen coordinates **(1004,496) to (1004,546)**, using the real menu `2D Pattern > Point of Measure > Point of Measure` and endpoint double-click. CLO's POM Object Browser showed three rows: `POM 1 = 26.18 cm`, `POM 2 = 26.18 cm`, new **`POM 3 = 26.17 cm`**. This creation and row appeared after the final double-click.

Selected **`Edit Point of Measure`**, dragged the newly created right-side POM top endpoint **(-18,-12) screen pixels**. CLO immediately updated the third table row to **32.36 cm** and the selected measurement Property Editor's **Total 3D Length** to **32.36 cm**, while rows 1 and 2 remained 26.18 cm. The measured line visibly extended above the right side outline. Performed actual menu **`Edit > Undo`** (`AXPress result 0`, enabled true); the third row and Property Editor both returned to **26.17 cm**, and the line endpoint returned to its previous position. This is a measured update of **+6.19 cm** under a POM geometry edit, followed by a verified restoration.

Native images, same folder:

- `clo-pomright-second-completion-20261018.png` — added right-side third POM row, 26.17 cm.
- `clo-pomright-edit-before-20261018.png` — selected third POM at 26.17 cm.
- `clo-pomright-edit-after-20261018.png` — moved endpoint and **32.36 cm** POM.
- `clo-pomright-edit-undone-20261018.png` — Undo restored **26.17 cm**.

**EXO requirement:** stored POM records need their own point/segment control geometry, edit mode, live length computation in physical units, active table selection, and a transactional Undo that restores point positions and dependent numeric values. A read-only tape measure without persistent POM controls does not satisfy CLO parity.

## Finding 2 — POM refresh after pattern geometry changes still needs a decisive attachment test

Earlier in this same live disposable T-shirt, two left-side POM rows both showed **26.18 cm**. Using CLO's `Edit Curve Point` on the same visible left torso side, a real drag bowed the outline and displayed a changed curve length of approximately **29.41 cm**. After entering `Edit Point of Measure`, the two saved POM rows still showed **26.18 cm**. Undo restored the contour. Screenshots: `clo-pomcurve-initial-pom-table-20261018.png`, `clo-pomcurve-curve-dragged-20261018.png`, `clo-pomcurve-pom-table-after-curve-20261018.png`, `clo-pomcurve-pom-table-after-undo-20261018.png`.

Crucial qualification: this does **not** prove that CLO's linked POMs generally fail to update. Although the two POM paths visually coincide with the edited side, the test did not establish their internal attachment to the newly inserted free curve point. CLO's [Edit 2D POM documentation](https://support.clo3d.com/hc/en-us/articles/360025716814-Edit-2D-POM) states that a POM moves when its intersected Pattern Outline or Internal Line is moved. The workflow may need explicitly snapped POM endpoints, a boundary anchor edit rather than a free curve-point deformation, or a different POM measurement mode.

A more targeted experiment moved the right-side boundary near POM 3 at **(1004,496)** under `Edit Pattern`, then reopened `Edit Point of Measure`. The table still showed 26.17 cm. However, close screenshot comparison revealed only small selection-overlay differences and **no independently confirmed changed boundary contour**. Therefore this attempt is **inconclusive**, not evidence against automatic propagation. Screenshots: `clo-pom-anchor-before-20261018.png`, `clo-pom-anchor-pattern-moved-20261018.png`, `clo-pom-anchor-pom-after-pattern-20261018.png`, `clo-pom-anchor-undone-20261018.png`.

A further right-side `Edit Curve Point` run did not activate `Edit Point of Measure` after dragging because a transient CLO menu/overlay hid the app's menu bar. The generated screenshots do **not** demonstrate a changed right-side contour or a new row measurement. Mark it as blocked: `clo-pomright-curve-initial-pom-table-20261018.png`, `clo-pomright-curve-curve-dragged-20261018.png`, `clo-pomright-curve-pom-table-after-undo-20261018.png`.

**Next decisive test:** create a POM via the explicit Trace as POM function on a uniquely identified cutline edge; record its exact endpoints and measurement, move the actual source **boundary vertex** (verify a changed contour with before/after pixel and 2D length), then read the POM row again. Undo and Redo, inspect both endpoints and compare numeric units. Do not infer a link from overlapping purple/yellow pixels.

## Finding 3 — sewn side line stays visibly paired across a cutline split

Under `Sewing > Edit Sewing`, selected the left side relationship on the copied shirt. CLO's native graphical readout displayed **26.17 cm versus 26.18 cm** and highlighted both joined segments using colored sewing indicators. Entered `Add Point/Split Line` and clicked on the same side at **(787,522)**. Reselected sewing at candidate points above and below the inserted contour vertex and saw the **26.17/26.18 cm** paired sewing readout and colored seam indicators still present.

The tool completed actual **Undo → Redo → Undo** with enabled menu actions and before/after screenshots. The final test screenshot restored the original visible point geometry.

Screenshots:
`clo-splitref-sewing-before-20261018.png`,
`clo-splitref-cutline-after-20261018.png`,
`clo-splitref-upper-sewing-after-20261018.png`,
`clo-splitref-lower-sewing-after-20261018.png`,
`clo-splitref-undo-20261018.png`,
`clo-splitref-redo-20261018.png`,
`clo-splitref-restored-20261018.png`.

**Verified:** visible seam association and length continuity following a cutline split, plus successful state reversal. **Unverified:** CLO proprietary seam IDs, stored parametric correspondence/notch reparameterization, graded links and exported construction data. In EXO, keep the fail-closed Rust split guard until these references can be migrated and regression-tested. A UI-only green sewing overlay is insufficient to validate a production-ready remap.

## Finding 4 — notch and 1 cm seam allowance remain visible after splitting the edge

On the same copied shirt, performed a sequence on the left torso side: `2D Pattern > Create > Notch`, clicked **(787,532)**, observed a newly named notch with **Type I**, perpendicular angle and **0.70 cm** length; entered `Seam Allowance`, clicked **(787,515)** and observed the **1.00 cm** width, separate start and end seam-type controls. Next inserted a contour point at **(787,522)** (between the existing edge endpoints and near the new notch). CLO displayed newly divided local lengths **13.28 cm and 12.90 cm**, summing to **26.18 cm**.

Upon reselecting the allowance after splitting, the same **Width 1.00 cm** remained in the Property Editor and the notch/edge marks still appeared on the cutline. Reentering Edit Sewing again showed **26.17 / 26.18 cm** paired lengths and the 3D sewing overlay.

Screenshots:
`clo-attachedsplit-baseline-20261018.png`,
`clo-attachedsplit-notch-added-20261018.png`,
`clo-attachedsplit-allowance-added-20261018.png`,
`clo-attachedsplit-split-with-attachments-20261018.png`,
`clo-attachedsplit-allowance-after-split-20261018.png`,
`clo-attachedsplit-sewing-after-split-20261018.png`.

**Verified:** visible notch survives split, selected seam allowance still reports 1 cm, and sewing stays highlighted with matched lengths. **Not verified:** whether the same internal notch/allowance identifiers were retained, whether a separate new edge gained distinct allowance entities, whether cutting-edge miter/junction geometry was recomputed correctly, or if the exported production pattern matches the pre-split seam path. A follow-up menu call to reselect the notch returned `CLO menu bar or path unavailable` because an extra 217×44 pixel mini-window was present; no false success is claimed for the notch's editable-property re-selection.

## Inspector and session validity

The shared `EXO CLO Inspector.app` has a stable existing Apple Development signature, and validation of its changed Swift source passed `git diff --check`. A concurrent CLO worker briefly replaced the shared inspector's compiled binary during testing, which caused one probe's result to belong to that other run. These results were excluded and not presented as ours. Subsequent probes were independently verified by their exact flags/event logs, native screenshots, and timestamp.

To separate access and screenshot paths from competing workers, an additional small signed `~/Applications/EXO CLO Inspector Isolated QA.app` with bundle ID `com.mikristian.exo.cloinspector.isolatedqa` and Application Support folder `EXO-CLO-Inspector-Isolated-QA` was built from a frozen QA Swift source snapshot. It passes code signature verification but did **not** receive macOS Accessibility or Screen Recording authorization (`accessibility=false`, `screenRecording=false`, `cloWindowCount=0`). It was not used to make the foregoing native claims. The macOS permissions would need to be granted before it can run autonomous QA independently.

During the test, free disk capacity fell to around **3.7 GiB**. The user explicitly authorized continued work despite crash risk for this disposable garment. The **original and copied garment files were still byte-identical** at the final check despite a fleeting native `Autosaved` UI message; no Save/Export was manually initiated. No EXO production garment geometry, garment file, or browser/UI app module was edited.

## Next implementation and QA sequence

1. Formalize EXO `FreeCurvePoint`, `BoundaryVertex`, `BezierHandle`, `POM`, `Notch`, `SeamAllowance`, and sewing-edge records as distinct authoring objects with stable identities and physical metre units. Keep source-to-generated geometry references explicit.
2. Complete mathematical reference migration in Rust `SplitBoundary` and regression-test sewing, notch position, allowance boundaries, POM attachments, symmetry and Undo/Redo together. Preserve the current fail-closed behavior until proven.
3. In CLO, verify **Trace as POM** tracking and saved POM propagation on a *measurably moved* source contour; test numeric POM table value, POM location and Undo/Redo, then test export and grading across at least two sizes.
4. Test DXF-AAMA/ASTM or other suitable pattern interchange with known units and real seam/notch/allowance edge representations to independently validate manufacturing data. Existing screenshots alone cannot prove manufacturer-ready references.

# CLO 7 sixth native QA loop — recovery, POM transactions, sewn-edge and manufacturing references

Date: **2026-10-18**. Host: macOS. Version: **CLO Standalone OnlineAuth Academic 7.0.242 (r39887)**. Test garment: unsaved in-memory copy `Male_T-shirt-direct-test-20261018.zpac`. Input and evidence: independently signed EXO CLO Inspector via accessibility menus, native event dispatch and native screenshot capture. This is an observed-behavior study. No proprietary CLO IDs, CAD interchange or stored garment files were modified/decoded by these tests.

## Outcome and confidence

| Test | Result | What it establishes |
| --- | --- | --- |
| Recover usable CLO window after previous failure | **PASS** | Process stack showed startup stalled in `AuthenticationProcessor::RequestLogin() → ShowErrorMessageBox() → QDialog::exec()`. Real CLO window returned following acknowledgment of its startup dialog. Opened copied T-shirt using real Open Garment Load Type `Open` mode and confirmed the native `OK` button. |
| Restore 2D viewing area | **PASS** | A guarded 228 px split-view divider drag produced usable 3D/2D panels. Subsequent screenshots show the copied T-shirt and pattern pieces in one actual `AXWindow`. |
| First mid-edge split click | **INCONCLUSIVE** | Click near prior internal intersection at window-local `(810,520)`; property showed 0.00 cm and no independently verified new vertex. Do not regard as passed topology mutation. |
| Saved POM authoring | **PASS** | Created two real POM rows in the Object Browser: **79.35 cm** diagonal torso reference and **29.15 cm** side reference. The diagonal is the actual coordinate-driven result; it is **not** a 26 cm side-seam measurement. |
| POM edit and Undo | **PASS** | Dragging the POM 1 endpoint in `Edit Point of Measure` changed **79.35 → 98.13 cm**, while POM 2 stayed at **29.15 cm**; native Undo restored **79.35 cm**. |
| POM Redo and final Undo | **PASS** | Native `Edit > Redo` restored **98.13 cm**. `Edit > Undo` restored **79.35 cm**. The second POM stayed at **29.15 cm** throughout. |
| Create named notch on a sewn edge | **PASS** | New `Notch_140367` was selected on the right pattern, with **Type I**, **Perpendicular**, **Length 0.70 cm**, flip/lock off. |
| Seam allowance selection | **PASS** | Native seam allowance on the tested edge showed `Width (cm): Line`, width **1.00 cm**, separate seam start/end and intersection controls. |
| Reselect references after mid-edge split attempt | **PASS** for UI continuity; **unknown** for proprietary ID migration | With split attempt at `(1007,522)`, the same named `Notch_140367` and 1.00 cm selected seam allowance were inspectable. Edit Sewing showed connected 2D/3D seam indicators and editable `SeamLinePairG`, with 18.77 cm segment readouts. The click was near an existing horizontal construction line, therefore a new topology point is **not proven in that subtest**. |
| POM table after geometry/tool changes | **PASS** | Table initially appeared empty after leaving Edit Sewing, but switching Object Browser Fabric→POM restored both original saved POM lengths: **79.35 cm** and **29.15 cm**. |
| Dedicated upper-segment point test | **PASS** for native command sequence and visible sewing selection | A second click at `(1007,506)`, away from the existing `y≈522` construction point, used `Add Point/Split Line`, followed by `Sewing > Edit Sewing` selection. CLO displayed matched sewing segments **18.77/18.77 cm** and a `0.00` difference. The native `Undo → Redo → Undo` sequence returned success on every action. Screen differences confirm a visual state change, but screenshots alone do not prove the identity or migration of every generated segment. |

## Native screenshots

All files below are in `research/clo-2d-analysis/` and were copied immediately from the signed inspector after each native operation:

* `clo-recovered-fixture-baseline-20261018.png` — copied T-shirt visible after login window recovery and real Open Garment confirmation.
* `clo-sixth-cycle-layout-20261018.png` — 3D/2D divider restored.
* `clo-sixth-cycle-pom-first-completion-20261018.png`, `clo-sixth-cycle-pom-second-completion-20261018.png` — saved POM creation and row.
* `clo-sixth-cycle-pom-edit-before-20261018.png`, `clo-sixth-cycle-pom-edit-after-20261018.png`, `clo-sixth-cycle-pom-edit-undone-20261018.png` — first POM changes 79.35→98.13→79.35 cm.
* `clo-sixth-cycle-pom-redo-before-20261018.png`, `clo-sixth-cycle-pom-redo-after-20261018.png`, `clo-sixth-cycle-pom-redo-undo-restored-20261018.png` — Redo/Undo on the same measurement.
* `clo-sixth-cycle-attached-notch-added-20261018.png`, `clo-sixth-cycle-attached-notch-after-split-20261018.png` — same named notch `Notch_140367` before and after tool-level split attempt.
* `clo-sixth-cycle-attached-allowance-added-20261018.png`, `clo-sixth-cycle-attached-allowance-after-split-20261018.png` — 1.00 cm and seam-corner controls.
* `clo-sixth-cycle-attached-sewing-after-split-20261018.png` — selected `SeamLinePairG`, sewing indicators, 18.77 cm pair.
* `clo-sixth-cycle-pom-refresh-pom-tab-reselected-20261018.png` — two original POM values recover after native browser-tab switch.
* `clo-sixth-cycle-true-split-before-20261018.png`, `clo-sixth-cycle-true-split-after-20261018.png`, `clo-sixth-cycle-true-split-selected-sewing-20261018.png`, `clo-sixth-cycle-true-split-undone-20261018.png`, `clo-sixth-cycle-true-split-redone-20261018.png`, `clo-sixth-cycle-true-split-restored-20261018.png` — point insertion command, seam inspector and restoration cycle. Corresponding `clo-sixth-cycle-side-edge-detail-*.png` files magnify the 2D region at `x=990..1026,y=478..548`.

The two final Undo-state side-edge closeups (`undone` and `restored`) were **pixel-identical** for the checked region; the corresponding `undone` and `redone` crops differed by 322 pixels above a threshold of 25/255. This is evidence of reversible visible states, **not** proof of CLO internal reference-ID equivalence.

## What EXO should implement and verify

* **Geometry and reference data:** stable directed edge identifiers; typed notch and seam allowance records; sewing segment-to-segment correspondence; POM endpoint references that distinguish explicitly editable measurement geometry from snapped pattern-bound endpoints.
* **Transactional split:** upon a genuine interior point insert, migrate any reference at a normalized edge parameter to the correct child edge and update local parameters. This includes the paired sewing edges, notch locations, allowance corner/offset logic, POM attachment endpoints, symmetry links and history.
* **POM editing:** numerically recompute from user-edited measurement geometry immediately. Redo must recreate the altered value and Undo must restore the previous value without changing unrelated POM rows. Selection/tool changes should not destroy saved POM records or silently hide them without clear feedback.
* **Next decisive native validation:** use an image-magnified pattern and verified nonexisting cutline point; record numerical child edge lengths before/after, then inspect the same named notch and sewing pair on **both** child edges. Cross-check a real DXF/production export with source measurements and declared units. Current visual tests cannot establish native CLO internal IDs or production-file semantics.

## Helper improvements and validation

The shared inspector now has guarded startup-dialog recovery and a guarded 3D/2D layout adjustment. The login blocker was diagnosed from a live process stack; only the explicit native startup dialog was acknowledged, with no credentials supplied or authentication bypass. `check_clo_fixture_session.py` was updated to verify the copied garment tab within the Academic `AXWindow` hierarchy, since CLO does not put the garment filename in its native outer window title. The three synthetic/native archive integrity tests in `test_clo_fixture_session.py` pass.

The Swift helper was compiled and signed for repeated CLO tests. Its asynchronous dialog-click delay was changed from unsupported `Thread.sleep` to `Task.sleep` to avoid a Swift 6 compilation warning. Final verification below should be rerun after any concurrent collaborator modifies the helper or native CLO document.

These observations do **not** imply the complete 2D sewing/patternmaking parity mission is finished.

# CLO 7 direct production-pattern feature tests: sewing, split, POM, notch, seam allowance

**Test date:** 2026-10-18. Native app: CLO Standalone OnlineAuth Academic 7.0.242 (r39887) on macOS. Interaction: signed local `EXO CLO Inspector.app` invoking the actual CLO Accessibility menu tree, CGEvent pointer events, and ScreenCaptureKit screenshots. **Fixture:** the open `Male_T-shirt-direct-test-20261018.zpac` disposable copy. All edits were in memory; no garment Save/Export was executed. Original and copied on-disk garments matched SHA-256 `eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83` (912,850 bytes) when checked.

This document records observed behavior separately from unverified persistence and manufacturing semantics. See preceding `CLO_FREE_CURVE_POINT_DIRECT_QA_20261018.md` and `CLO_DIRECT_GEOMETRY_QA_CONTINUATION_20261018.md` for point/curve editing and initial geometry tests.

## Results

| Test | Actual observed result | Status |
| --- | --- | --- |
| Side-seam split, linked pattern | `2D Pattern > Edit > Add Point/Split Line` and real click at window-relative (787,521) showed a new contour point on left T-shirt side and a corresponding point on symmetric side. Undo removed; Redo restored; final Undo returned starting outline. | **PASS** for UI contour and reversal; **unknown** for stable sewing/notch/allowance ID migration |
| Existing sewing-length inspection | `Sewing > Edit Sewing` selected a side-seam relationship; CLO displayed approximately **26.17 cm / 26.18 cm** paired sewing length in the live selection. `Sewing > Check Sewing Length` activated a separate inspection panel and colored sewing indicators. | **PASS** for menu activation and visible comparison, **unknown** whether split preserves underlying sewing references |
| Notch creation | `2D Pattern > Create > Notch` clicked on copied side edge (787,528). CLO showed its corresponding notch markers and a native Property Editor with **Type I**, **Perpendicular**, **90.00°**, **Length 0.70 cm**, plus flip and lock. Menu Undo removed the newly created visible notch. | **PASS** for editable notch fields and removal |
| POM tool modes | `2D Pattern > Point of Measure > Point of Measure` and `Edit Point of Measure` both activated as separate tools; CLO opened an Object Browser table with `POM`, `Description`, `Length(cm)`. | **PASS** for tool and table |
| Actual Point of Measure record | Traced left torso side from (787,496) to lower edge (787,546) and completed with native double-click. CLO produced actual table row **1 · Point of Measure · 26.18 cm**. Earlier in-progress purple preview showed a distinct 36.59 readout while waiting for completion. | **PASS** for an in-session document POM row; disk persistence, grading, export and reference migration **not tested** |
| POM Undo/Redo | `Edit > Undo`, `Edit > Redo`, `Edit > Undo` each returned enabled `AXPress 0`. However the **26.18 cm POM table row remained** throughout the screenshots. A final screenshot showed `Selected 3D Length 26.18 cm` after selection changed. | **INCONCLUSIVE** for POM lifecycle; command success does **not** prove the row was undone |
| Seam Allowance tool and property | `2D Pattern > Create > Seam Allowance` activated. Clicking the same side edge and selecting it again produced a yellow segment selection and native property fields: `Width (cm)` set to **Line**, **Width 1.00**, `Seam Type` with **Start** and **End** corner controls; Intersection greyed out. | **PASS** for selected native width and junction property model |
| Seam Allowance Undo | Native `Edit > Undo` returned `AXPress 0, enabled true`. The next screenshot cleared the selected yellow seam allowance line and Property Editor fields, leaving prior contour geometry. | **PASS** for the captured selection/undo state, subject to in-memory screenshot limitations |
| Change seam allowance width 1.00 → 1.50 cm | AX `AXIncrementor` returned `value=1`. AXSetValue returned success code `0`, and a second test clicked the numeric control, selected all, typed `1.50`, and pressed Return. **Both tests still read `value=1` and showed 1.00 cm on screen.** Restore attempt also left 1.00. | **NOT VERIFIED**; input may not have committed or focus may be wrong; no changed-width result claimed |

## Native screenshot evidence

Direct screenshots are stored in this same `research/clo-2d-analysis/` folder. The most useful pairs:

* `clo-sewn-split-before-20261018.png`, `clo-sewn-split-after-20261018.png`, `clo-sewn-split-undone-20261018.png`, `clo-sewn-split-redone-20261018.png`, `clo-sewn-split-restored-20261018.png`: reversible side contour and symmetry.
* `clo-sewing-inspect-selected-20261018.png`, `clo-sewing-length-mode-20261018.png`: sewing length and matching interface. The combined split-plus-sewing direct probe encountered a temporary second native window/AX access loss, so `clo-sewn-split-sewing-selected-after-20261018.png` does **not** establish surviving sewing IDs.
* `clo-notch-before-20261018.png`, `clo-notch-after-20261018.png`, `clo-notch-undo-20261018.png`: notch property fields and reversal.
* `clo-pom-completed-20261018.png`, `clo-pom-after-completion-20261018.png`: the purple path plus actual POM table row. `clo-pom-undo-before-20261018.png`, `clo-pom-undo-after-20261018.png`, `clo-pom-redo-after-20261018.png`, `clo-pom-final-undo-20261018.png`: command sequence with row still present.
* `clo-allowance-property-first-20261018.png`, `clo-allowance-property-selected-20261018.png`: verified seam allowance `Width 1.00 cm`, Start/End seam types. `clo-allowance-final-undo-after-20261018.png`: restored selection state. `clo-allowance-width-keyboard-150-20261018.png`, `clo-allowance-width-keyboard-restored-20261018.png`: numeric input attempt, displayed value remained 1.00.

## Engineering consequences for EXO

1. **Separate the physical cutline and its sewing data.** `SplitBoundary` should retain stable target seam connection(s), notches and allowance attachment through a topological split. Current Rust `SplitBoundary` correctly rejects sewn, notched or allowance-linked edges when it cannot remap them. Do not remove the guard until transactional remapping and undo tests prove preservation. The CLO screenshots only verify visible point insertion; they cannot reveal CLO's proprietary internal IDs.
2. **Notches need typed production records.** Store `edgeId`, normalized edge/arclength parameter, notch type, physical length, orientation/angle, flip and lock, independent of UI selection. Create/edit/delete and symmetry should participate in a single undoable transaction and survive save/reopen and grading.
3. **POM needs its own persisted authoring model.** The native table row confirms the concept differs from the temporary two-point tape. Store stable POM IDs, description, ordered edges/fractions and physical units; keep segment/curve edits, symmetry and grading synchronized. Verify POM's own Undo and Redo in a fresh CLO fixture before claiming exact parity.
4. **Seam allowance has a separate property model.** The observed Width mode `Line`, Width `1.00 cm`, seam start/end/intersection types should map to cutting geometry and follow CLO's selected-edge UI. Include per-edge allowance attachment and corner treatment. The precise 1.50 cm numeric interaction is unverified; do not treat successful AX return code as an accepted geometry change.
5. **Manufacturing QA needs paired references.** After inserting a point on an already sewn/allowanced/notched edge, test both sides of the sewn seam plus any attached reference, reselect in `Edit Sewing`, capture `Check Sewing Length` and verify lengths/pairs before and after Undo/Redo. Then export in a supported DXF-AAMA/ASTM format for independent numerical geometry comparison, including declared units.

Official CLO references, kept distinct from direct CLO 7 observations:

- [Create Seam Allowance](https://support.clo3d.com/hc/en-us/articles/115013215727-Create-Seam-Allowance): click an outline, produces grey allowance.
- [Edit Seam Allowance Properties](https://support.clo3d.com/hc/en-us/articles/115013370408-Edit-Seam-Allowance-Properties): width, custom mode, locking and seam start/end/intersection settings. Documentation updated after CLO 7 and may describe version-specific features.
- [2D Pattern DXF Import/Export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export): future manufacturer-geometry comparison route.

## Operating constraints and next test

The signed inspector build and `git diff --check` passed. The CLO workspace remained in one running copied T-shirt session without saving or reopening the garment. Original and copied fixture bytes matched SHA-256. The Mac's free space fell from approximately **7.9 GiB to 5.5 GiB** during testing, below CLO's prior warning threshold of **10 GiB**. Consequently the next round should first recover adequate headroom, use a fresh copy of the garment if needed and test real sewing-reference migration plus POM size/grade links with a supported export. Native geometry mutation at 5.5 GiB is deferred to protect data.

No production EXO JS/Rust geometry or garment assets were modified by this audit. The opt-in helper probes live at `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`.

# CLO 7 native test loop — POM table selection, grading, pattern walk and M:N sewing

Date: **October 18, 2026**. Host: real macOS **CLO Standalone OnlineAuth Academic 7.0.242 (r39887)**. Driver: the previously authorized signed `EXO CLO Inspector.app`, which used native Accessibility menu actions, CGEvent input and ScreenCaptureKit. Disposable in-memory document: `Male_T-shirt-direct-test-20261018.zpac`. No Save or Export was invoked in this loop.

## Test A — pattern selection alone changes the POM table presentation

**Purpose:** distinguish actual topology-based POM invalidation from tool or panel-selection display changes. Earlier tests had shown an empty `Point of Measure` table after `Add Point/Split Line`, but those operations also changed active tool and panel selection.

1. Opened `2D Pattern > Point of Measure > Edit Point of Measure` and confirmed an **empty POM table** before any selection clicks in this new run. That baseline was inconclusive by itself: there were no visible rows to track. `clo-pom-selection-control-baseline-20261018.png`.
2. Entered `Point of Measure` and completed a new right-side measurement. The Object Browser then showed **four preexisting POM rows** together with a new fifth. Lengths were **26.18, 26.18, 26.17, 26.17, 26.17 cm**. Crucially, previously invisible entries were still present when a new POM was completed; this is evidence against assuming they had been permanently removed by the earlier selections. `clo-pomtoolonly-newrow-20261018.png`.
3. Reopened `Edit Point of Measure` and captured the new live five-row baseline. Switched to `Transform Pattern`, clicked **inside the right torso panel** (window-relative 1045,476) and reopened `Edit Point of Measure`. The table **was empty**. Switched to `Transform Pattern` again, clicked **inside the left/center torso panel** (827,470), and reopened `Edit Point of Measure`: still **empty**. Finally clicked **empty 2D canvas** (941,690) and reopened Edit POM: still **empty**. No authored pattern edge or POM endpoint was deliberately moved or split in these actions. All six relevant native menu presses returned `AXPress 0`, with no inspector warnings. Evidence: `clo-pom-selection-control-repeat-baseline-20261018.png`, `clo-pom-selection-control-repeat-other-pattern-pom-20261018.png`, `clo-pom-selection-control-repeat-measured-pattern-pom-20261018.png`, `clo-pom-selection-control-repeat-empty-canvas-pom-20261018.png`.
4. **Tool-only control:** created one more test POM on the copied right side (five visible rows). While keeping pattern geometry and selection untouched, used `Edit Point of Measure → Transform Pattern → Edit Point of Measure`, with **no canvas clicks at all**. All five POM rows remained visible with **unchanged lengths**. Evidence: `clo-pom-mode-control-baseline-20261018.png`, `clo-pom-mode-control-transform-only-20261018.png`, `clo-pom-mode-control-pom-after-mode-only-20261018.png`. The images display the same five rows and lengths at start/end.

The review image `CLO_POM_SELECTION_FOUR_STATE_20261018.png` places the four actual Object Browser captures side by side: all five POMs, unchanged values after tool-only switching, empty table after pattern selection, and previously visible rows returning with the additional measurement.

**Evidence-based interpretation:** the empty POM Object Browser can be triggered by **changing 2D selection alone**, without splitting or deforming geometry. Switching tools without clicking a pattern does **not** cause the empty-table result in this control. A later POM creation can reveal the previously invisible records again. This strongly suggests a CLO 7 **selection/display synchronization behavior**, potentially including selection filtering, tool state or Object Browser refresh behavior. Screenshots cannot reveal whether POM records become internally invalid, temporarily filtered, hidden or detached. It is not correct to infer permanent deletion of POM data from the empty list.

This materially revises the inference from prior `clo-pomrefresh` split tests: **a split alone has not yet been isolated as the cause of POM-row disappearance.** A decisive split experiment requires explicit selection matched on both sides of the edit and an independent serialized POM-state check.

## Test B — native advanced 2D tool workspaces

Using the same signed inspector, selected five real CLO menu commands sequentially, waited for the UI, captured each tool state, then restored neutral `Transform Pattern`. Every tool activation returned `AXPress result 0`; inspector reported no warnings. There were no canvas clicks in any advanced mode.

| CLO tool | Observed live UI/workspace behavior | Screenshot |
| --- | --- | --- |
| `2D Pattern > Grading > Edit Grading` | Opened grading-related `Size` / `Pair Avatar` view, with `Add` and `Assign`; pattern points remained in the 2D canvas. No size was added. | `clo-advanced-mode-edit-grading-20261018.png` |
| `2D Pattern > Grading > Edit Curve Grading` | Entered a separate grading tool mode; same Size/Pair Avatar browser, with different local curve-grading tool selection. No grading delta authored. | `clo-advanced-mode-edit-curve-grading-20261018.png` |
| `2D Pattern > Walk Pattern` | Tool became active; on-canvas prompt **“Click on a point/segment.”** No segment was selected yet, so walk alignment/matching remains untested. | `clo-advanced-mode-walk-pattern-20261018.png` |
| `Sewing > M:N Segment Sewing` | Entered M:N segment tool, showing existing colored sewing connections/markers on both 2D and 3D garment and opening sewing/topstitch browser context. No new M:N correspondence made. | `clo-advanced-mode-mn-segment-sewing-20261018.png` |
| `Sewing > M:N Free Sewing` | Activated distinct M:N free sewing tool with different icon while showing existing sewing indicators. No correspondence edits made. | `clo-advanced-mode-mn-free-sewing-20261018.png` |

**Implications for EXO:** implement a workspace-aware tool index whose modes are distinct from action transactions. Grading needs per-size rule data and an editable point/curve delta tool; Walk Pattern needs ordered boundary-curve walking and matching lengths; M:N segment and M:N free sewing need separate selection and correspondence semantics, and both should display their references in 2D and 3D. These screenshots confirm interface and tool-mode presence, **not** numerical grading, seam walking or M:N behavior.

## QA checkpoints for the next CLO loop

1. Select one documented POM and its exact owning panel; capture pattern name and its numerical measurement. Test an actual **source boundary vertex drag** with proven changed contour geometry, then reselect the identical owning panel and read the POM again. Direct POM endpoint edits were previously confirmed to change from **26.17 to 32.36 cm** and revert with Undo, but that does not establish attachment to a source pattern curve.
2. Repeat `Add Point/Split Line` on a measured edge with identical before/after selection, then inspect POMs after deliberately restoring the original panel selection. Distinguish table visibility from serialized identity/attachment using export/reopen only after choosing a suitable production interchange representation.
3. Test `Walk Pattern` by selecting two real edges; inspect distance and movement, and Undo. Compare curve arclength/percent changes numerically in declared units.
4. Test M:N sewing with a new copied standalone fixture designed to contain mismatched segment counts, inspect pairing order and end constraints, then Undo/Redo and verify seam walk lengths.
5. Test grading across at least two real sizes, including graded free curve points, notches, seam allowances and POM recalculation.

## Engineering verdict for the EXO 2D panel

Model **POM ID, geometry, owning pattern, selected-row UI state and displayed visibility separately**. Recompute measurements from their referenced physical paths, and never silently reinterpret a temporarily empty Object Browser as deletion. The inspector/test run also reinforces keeping manufacturing references stable through split transactions, preserving Undo/Redo and making unavailable references visibly stale instead of dropping their records.

Native source files changed only for isolated opt-in research probes in `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`; no EXO production JS/Rust geometry or garment files were edited by this loop. Source and screenshot results reside under `research/clo-2d-analysis/`.

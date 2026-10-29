# CLO 7 native QA loop: POM selection context, cutline split, recovered measurement edit

**Date:** October 18, 2026. **Application:** native CLO Standalone OnlineAuth Academic 7.0.242 (r39887), on the disposable, unsaved in-memory `Male_T-shirt-direct-test-20261018.zpac` fixture. **Method:** signed `EXO CLO Inspector.app` driving the actual CLO Accessibility menu and guarded pointer gestures, then capturing native ScreenCaptureKit screenshots. Distinguish the UI state from proprietary internal reference identity and on-disk persistence.

## Tested states and direct results

| Operation | Verified result | Evidence in this folder |
| --- | --- | --- |
| Baseline | In Edit Point of Measure, **five** POM rows were present: **26.18, 26.18, 26.17, 26.17, 26.17 cm**. | `clo-pom-mode-control-baseline-20261018.png` |
| Tool switch **without clicking patterns** | CLO changed to Transform Pattern/Fabric view and back to Edit POM. **All five rows returned intact**, same lengths. | `clo-pom-mode-control-transform-only-20261018.png`, `clo-pom-mode-control-pom-after-mode-only-20261018.png` |
| Select **another pattern**, no geometry edit | Clicking the other/right torso in Transform Pattern and reopening Edit Point of Measure yielded an **empty POM table**. Selecting the formerly measured/front torso or empty canvas and reentering POM did not immediately restore rows. | `clo-pom-selection-control-repeat-baseline-20261018.png`, `clo-pom-selection-control-repeat-other-pattern-pom-20261018.png`, `clo-pom-selection-control-repeat-measured-pattern-pom-20261018.png`, `clo-pom-selection-control-repeat-empty-canvas-pom-20261018.png` |
| **Object Browser tab refresh** after selecting another torso | While the table was empty, clicking the Fabric tab then clicking the POM tab **restored all five rows at their original lengths without changing pattern geometry**. | `clo-pom-tab-filter-before-20261018.png`, `clo-pom-tab-filter-other-pattern-pom-20261018.png`, `clo-pom-tab-filter-fabric-tab-20261018.png`, `clo-pom-tab-filter-pom-tab-reselected-20261018.png` |
| Cutline split in POM-bearing garment | Native Add Point/Split Line clicked the right torso side near window-relative **(1004,522)**. CLO displayed a new node/selection marker. Immediately reopening Edit POM in the same probe hit a temporary **CLO menu bar unavailable** accessibility condition; the in-probe result alone is incomplete. | `clo-pom-split-tab-before-20261018.png`, `clo-pom-split-tab-after-split-20261018.png` |
| Refresh POM after split | Once native Accessibility recovered, switching back to the POM tab produced the same **five rows, unchanged in row labels and values**. Comparing the `(1190,175,1504,315)` POM-list image region against the pre-split capture found **zero changed pixels at threshold 18**. | `clo-pom-postsplit-refresh-pom-tab-reselected-20261018.png`, `clo-pom-split-tab-before-20261018.png` |
| Edit a saved POM **after split** | In Edit Point of Measure, explicitly selected saved row **3** (26.17 cm) in the POM Object Browser, then dragged its top endpoint by **(-18,-12) screen pixels**. The POM row updated to **33.62 cm**; other four row values remained unchanged. | `clo-pom-row5-edit-before-20261018.png`, `clo-pom-row5-edit-selected-row5-20261018.png`, `clo-pom-row5-edit-after-drag-20261018.png` |
| Undo changed POM | The native **Edit > Undo** action returned `AXPress 0` with the item enabled. Selected row 3 and the on-canvas measurement returned to **26.17 cm**. | `clo-pom-row5-edit-undo-20261018.png` |

**One probe name is misleading:** `--probe-fixture-select-postsplit-pom` calls its click routine `clickCLOSavedPOMRowFive`, but the actual screenshot highlights **row 3**, because the fixed window-relative pointer location hits the third row at the captured UI scale. The test is reported by the *observed row selection*, not the helper's symbolic name. This naming should be corrected in future maintenance.

## What this resolves and does not resolve

**Established in this live session:**

1. Changing tools with no selection change does **not** intrinsically remove saved POM rows.
2. Selecting another garment pattern can make the POM Object Browser appear empty even without cutting or moving a pattern. Merely reentering Edit POM is insufficient in the observed state.
3. Switching Object Browser tabs from Fabric to POM restores the rows, including after a cutline split, showing that a blank list is **not evidence of permanent deletion**.
4. A saved POM remains **editable** after the split/tab refresh sequence; a concrete direct endpoint drag changed its row's numerical value and Undo restored it.

**Not established:** exact CLO internal POM/edge IDs, whether the split point became a distinct authoring vertex versus a selection marker in every snapshot, whether the split preserves all parametric sewing/notch/cutline dependencies in the proprietary file format, grading-size tracking, or save/export-reopen semantics. The visible Undo step after the split changed selections, but no exact edge-coordinate restoration was proved; the subsequent POM Undo *did* restore its measurable value.

This refines earlier reports that inferred lost POM records from empty table screenshots. The strongest supported interpretation is an **Object Browser presentation/context problem**, with concrete proof that all five records can be recovered and remain numerically editable in memory.

## EXO product and engineering requirements

- Persist POM records with stable garment-level IDs, explicit pattern/edge ownership, endpoints or directed arclength paths, and measurement units. Store independently from the currently selected panel and Object Browser tab.
- Keep the POM collection accessible when no panel is selected and when another pattern is active. If filters are enabled, display the active filter and item count; do not present silently empty data that looks deleted.
- Preserve and migrate references when an edge is split; update or mark affected POMs stale explicitly. An unrelated split must preserve the POM's identity, geometry and physical measurement.
- Expose stable POM selection from the measurement list. Moving the selected control must atomically update its actual length, the on-canvas graphic and Undo/Redo history. Verify unselected measurements remain unchanged.
- Accept two distinct regression suites: **presentation test** (switch tools/panels/browser tabs, counts unchanged) and **authoring test** (split/move POM with downstream sewing, notch, allowance and grading references, then Undo/Redo/save-reopen).

## Test harness and session status

Added opt-in native inspection probes to `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`: `--probe-fixture-pom-selection-control`, `--probe-fixture-pom-mode-switch-control`, `--probe-fixture-pom-tab-filter-control`, `--probe-fixture-pom-split-tab-refresh`, and `--probe-fixture-select-postsplit-pom`. These test actions use the copied fixture guard and fixed coordinates grounded by screenshots. The inspector was compiled with `swiftc -Onone` and signed under its existing Apple Development identity. No production EXO runtime/geometry or garment file was edited by this loop. The Mac remained under CLO's previously observed 10 GiB warning threshold; testing followed the user's explicit authorization to continue with disposable state.

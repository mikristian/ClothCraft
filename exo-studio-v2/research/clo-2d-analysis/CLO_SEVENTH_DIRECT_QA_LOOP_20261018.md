# CLO 7 live test loop — notch Flip/Lock and POM mode persistence

**Date:** October 18, 2026. **App:** CLO Standalone OnlineAuth Academic 7.0.242, on the live disposable `Male_T-shirt-direct-test-20261018.zpac`. The signed `EXO CLO Inspector.app` invoked CLO's actual menu actions and mouse gestures through macOS Accessibility/CGEvent. All screenshots named below were captured from CLO itself.

## Verified findings

### 1. Flipping a selected notch changes its actual displayed direction

With selected Type I notch `Notch_238269`, **Length 0.70 cm**, the native Property Editor showed **Flip Off**. Pressing its Flip checkbox changed the property to **On** and flipped the yellow notch tick from leftward to rightward on the 2D side outline. It did not visibly alter the garment perimeter or the manufacturing length field.

The native `Edit > Undo` menu returned AXPress success. Comparing the original screenshot to the after-Undo screenshot gave **0 differing pixels above the 18/255 threshold** in both the selected notch region and the Flip-checkbox region. This provides direct evidence of reversible notch orientation on this fixture.

- `clo-loop7-notch-flip-before-20261018.png`
- `clo-loop7-notch-flip-after-20261018.png`
- `clo-loop7-flip-undo-after-20261018.png`

### 2. Lock is an independent notch manufacturing property with physical anchor distances

The same notch initially showed **Lock Off**. Clicking Lock yielded **Lock On** and expanded native fields:

- `Lock Position: Start Point`
- `From Start Point: 14.13` (CLO UI physical unit context: centimetres)
- `From End Point: 1.65`

The selected notch's numeric length remained **0.70 cm**. This demonstrates a distinct distance-from-boundary-anchor representation separate from Flip and notch type. A following `Edit > Undo` action returned AXPress 0 but left **Lock On** in the captured Property Editor. Therefore **Lock Undo semantics are not established**; menu success should not be equated with the notch property reversing. Explicitly clicking Lock again returned **Off** and collapsed its extra anchor fields.

- `clo-loop7-notch-lock-before-20261018.png`
- `clo-loop7-notch-lock-after-20261018.png`
- `clo-loop7-notch-lock-undo-after-20261018.png`
- `clo-loop7-notch-lock-return-after-20261018.png`

**EXO implications:** preserve `flip` and `locked` as independently persistent notch properties, and represent lock side/start versus end plus measured physical offset. Include a separate `Undo/Redo` acceptance test for each; CLO's Lock behavior cannot be assumed from ordinary menu events.

### 3. POM rows survive a pure tool switch unchanged

In the same unsaved copied garment, entering `2D Pattern > Point of Measure > Point of Measure` and clicking a visible right side span at screen-local `(1061,606)` to `(1061,762)` with completion double-clicks populated the native POM table with three rows:

| Row | Description | Observed length |
| --- | --- | --- |
| 1 | Point of Measure | 79.35 cm |
| 2 | Point of Measure | 29.15 cm |
| 3 | Point of Measure | 26.18 cm |

**Important limitation:** the scripted double-click sequence produced three rows, not a controlled single POM. The 26.18 cm value aligns with a plausible right-side length; the other rows could be intermediate gesture artifacts. This test proves native rows were created and displayed, **not** that the double-click sequence is suitable for production automated authoring. Exact measurement line attachment requires a separate controlled single-POM fixture.

An `Edit Point of Measure` endpoint drag (screen-local `1061,606`, delta `-18,-12`) dispatched successfully, and CLO accepted Undo; however all three table values remained unchanged after the attempted drag. **Inconclusive** for endpoint motion: there is no numeric evidence the intended POM endpoint was selected or moved. Do not claim any POM recomputation from this attempt.

With the three POM rows displayed, switched to `Transform Pattern` and returned to `Edit Point of Measure` **without clicking or moving any geometry**. All three rows retained their original lengths. The POM table viewport before/after is **pixel-identical** (0 pixels exceeding an 18/255 difference threshold in the tab/list region `x1179–1507, y140–266`). This confirms stable POM visibility and values under a pure native tool change.

- `clo-loop7-pom-create-before-20261018.png`
- `clo-loop7-pom-create-second-completion-20261018.png`
- `clo-loop7-pom-edit-before-20261018.png`
- `clo-loop7-pom-edit-after-20261018.png`
- `clo-loop7-pom-edit-undone-20261018.png`
- `clo-loop7-pom-mode-baseline-20261018.png`
- `clo-loop7-pom-mode-pom-after-mode-only-20261018.png`

### 4. Right-side cutline insertion and sewn-reference check remained inconclusive

With the full T-shirt in a larger 2D pattern viewport, activated native `Add Point/Split Line` then clicked the mid-right side at `(1061,635)`. The pointer dispatch and tool activation returned success, but the next `Edit Sewing` command failed because the CLO menu bar temporarily stopped responding. An attempted Undo reported `AXPress=-25204`; the inspector also warned `CLO Accessibility window tree unavailable`. Before/after screenshots show a selection-state change but **no unambiguous new boundary point**. This specific split attempt does **not** establish reference preservation, or successful Undo/Redo.

The later inspector reconnected to the copied CLO document. The test remains recorded as incomplete:

- `clo-loop7-right-split-before-20261018.png`
- `clo-loop7-right-split-after-20261018.png`
- `clo-loop7-post-recovery-20261018.png`

Prior direct tests in `CLO_POM_SEAM_REFERENCE_FOLLOWUP_DIRECT_20261018.md` and `CLO_FOURTH_LIVE_QA_LOOP_20261018.md` include independently confirmed side-seam length displays and successful split/Undo sequences. Those earlier results must not be silently counted as outcomes of this seventh loop.

## EXO requirements and follow-on QA

1. Notch `flip`, `lock`, `lockFrom` (start/end), and `distanceM` should persist independently, with values stored in metres and presented in garment document units. A split must reparameterize attached references without drifting the physical position.
2. A POM must have an unambiguous editable named record and completion gesture. A double-click must not inadvertently create multiple POM rows. Verify in EXO with a regression case containing one new measurement only.
3. Do not declare a topology split, sewing remap, or POM update successful solely because an input event or AX menu call succeeded. Require a changed cutline and measured postcondition; then prove Undo/Redo and manufacturer export parity.

All tests were confined to CLO's unsaved disposable working session. No EXO production JS or Rust code was changed by this test loop.

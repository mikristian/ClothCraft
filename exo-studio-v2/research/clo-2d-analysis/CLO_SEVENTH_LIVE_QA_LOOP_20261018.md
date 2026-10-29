# CLO 7 direct QA — recover app, isolated split Undo/Redo, named notch reference and saved POMs

**When:** 2026-10-18, 17:58–18:13 local (EDT), based on inspector snapshots. **Software:** native CLO Standalone OnlineAuth Academic 7.0.242 (r39887), controlled through signed `EXO CLO Inspector.app` with macOS AX menu actions, CGEvent pointer input, and actual-window screenshots. **Fixture:** disposable in-memory `Male_T-shirt-direct-test-20261018.zpac`. The user explicitly allowed crash risk for this test copy. No production EXO app files were changed.

## Result 1: CLO reopened and the 2D viewport became usable

The previous CLO session had stalled during authentication. Native stack inspection showed the application waiting in `AuthenticationProcessor::RequestLogin()` and an Information/error dialog. The inspector acknowledged the startup modal with a guarded Return key; CLO then exposed a genuine 1512×900 Academic window. The disposable garment was opened and CLO's `Open Garment` dialog confirmed. A guarded vertical splitter drag restored the 2D Pattern Window to a usable width. `check_clo_fixture_session.py` passed with a real copied-document tab nested inside the native `AXWindow`, whereas it correctly rejects misreported `AXApplication` nodes.

**Evidence:** `clo-sixth-cycle-layout-20261018.png`, `clo-current-seventh-baseline-20261018.png`. All pattern operations below used the live copied T-shirt tab, not a screenshot mockup.

## Result 2: pattern point split has genuinely reversible geometry

To isolate CLO's Undo semantics from tool switching, the inspector added `--probe-fixture-isolated-split-undo`. With Add Point/Split Line activated via CLO's own native menu, it clicked the left lower torso cutline at native window-local screen position `(760,689)` and performed **immediate** `Undo → Redo → Undo` without selecting sewing or POM tools in between. Every menu action returned `AXPress 0`, enabled true, and all screenshots captured.

- The clicked point appeared as a bright new marker at the expected position, returned after Redo, and vanished on both Undo operations.
- **Pixel analysis:** cropping exactly `(747,618,784,762)` from native screenshots yielded **0 pixels above difference threshold 18** when comparing the before-split baseline against the first Undo and final Undo. This tests visible geometry restoration in that captured region, not the hidden internal point identity.
- Images: `clo-seventh-isolated-baseline-20261018.png`, `clo-seventh-isolated-inserted-20261018.png`, `clo-seventh-isolated-undone-20261018.png`, `clo-seventh-isolated-redone-20261018.png`, `clo-seventh-isolated-restored-20261018.png`. The corresponding `clo-seventh-isolated-zoom-*.png` are close crops for point inspection.

This establishes **native action-level Undo/Redo of a cutline split** more decisively than previous combined split+sewing sequences, where other selections changed the undo history.

## Result 3: named notch survives a topology edit, with unchanged properties

Added a real notch with `2D Pattern > Create > Notch` at left torso side `(760,697)`, retaining selection. CLO's live Property Editor displayed:

| Property | Native recorded value |
| --- | --- |
| Name | `Notch_325856` |
| Type | `I` |
| Angle mode | `Perpendicular` |
| Length | `0.70 cm` |
| Flip | Off |
| Lock | Off |

The notch marker and corresponding mirrored marker were visible on the opposite side. Next, a topology point was inserted below it on the same visible side edge at `(760,730)`, and a focused `Undo → Redo → Undo` cycle was captured. The notch line remained visible throughout these geometry states. The split itself showed CLO's temporary segment-length annotations; pixels alone do not establish its proprietary geometry IDs.

For a stronger identity check, the inspector reselected the existing notch by clicking the **interior of its line at `(775,697)`**, then inserted the nearby topology point at `(760,730)`, reentered the same Notch tool, and clicked the original notch line again. **CLO's Property Editor still displayed the exact name `Notch_325856`, Type I, Perpendicular, Length 0.70 cm, Flip Off, Lock Off after the split.** This is direct evidence of **in-session named notch preservation and continued editability**, beyond merely observing an unchanged marker.

- Images: `clo-seventh-notch-before-20261018.png`, `clo-seventh-notch-after-20261018.png`; `clo-seventh-notch-split-{baseline,inserted,undone,redone,restored}-20261018.png` with zoom crops; `clo-seventh-notch-identity-{before,split,after,undo}-20261018.png`.
- The final Undo in the notch-identity probe returned success, but because a notch selection step occurred between the split and Undo, its exact history target is **not established**. Rely on the isolated geometry-only test above for definite split reversal.
- We still cannot inspect CLO's proprietary edge IDs, notch-to-edge parameter correspondence, graded size copies or manufacturer export structures. The unchanged **displayed name and properties** are stronger but narrower evidence than a bytewise production-data assertion.

## Result 4: saved POM measurements stay accessible after a split and Object Browser refresh

Before the 2D cutline split, CLO's POM Object Browser contained three saved measurements. A separate run entered `Edit Point of Measure`, switched to `Add Point/Split Line`, clicked `(760,689)`, returned to POM mode, selected **Fabric** and then **POM** tabs, and issued CLO `Edit > Undo`. The immediate POM view was empty after changing tools, but all three persisted after tab refresh:

| POM row | Before split (cm) | After Fabric → POM tab refresh (cm) |
| --- | ---: | ---: |
| 1 | 79.35 | 79.35 |
| 2 | 29.15 | 29.15 |
| 3 | 26.18 | 26.18 |

All three rows remained visible after Undo. A later revisit to POM after the named-notch split again returned these three lengths. **This proves in-session row presence and value consistency through these UI actions**, but it does not prove geometric attachment remapping, automatic length recomputation from a moved source edge, or export persistence. The POM display filter must not be mistaken for deletion.

- Evidence: `clo-seventh-pom-preservation-{before,after-split,before-refresh,fabric-tab,after-refresh,undo}-20261018.png` and `clo-seventh-notched-pom-pom-tab-reselected-20261018.png`.

## Result 5: sewing relation visibility and important limits

A native `Add Point/Split Line → Sewing > Edit Sewing → Undo → Redo → Undo` sequence on the right lower side `(1061,688)` completed all AX menu actions without inspector warnings, and after switching to Edit Sewing, the sewing overlays remained displayed across 2D and 3D. But direct close-crop comparison showed a point marker may remain after Undo when tool selection intervenes. Consequently this **combined** sequence proves tool accessibility and overlay visibility, **not** the precise split undo transaction. The separate isolated test above resolves that ambiguity.

Selected Line in the native Property Editor showed **0.00 cm** during this combined sequence, so it does **not** provide a new numeric sewing-length assertion for this cycle. Earlier independent CLO passes captured the paired seam length comparison (26.17/26.18 cm). This pass did not independently inspect seam IDs or manufacturer export.

- Images: `clo-seventh-side-split-{before,after,selected-sewing,undone,redone,restored}-20261018.png`.

## EXO integration requirements clarified by these direct experiments

1. A true `SplitBoundary` operation should be one self-contained undoable authoring transaction, with a stable point ID and a *reversible* mapping from original to child edges. UI tool selection should not enter the same transaction history.
2. Preserve `Notch { id, name, edgeId, arcLengthOrFraction, type, lengthM, angleMode, flip, locked }` across edge splits while updating edge linkage and arclength parameters. CLO demonstrates that the **same visible notch name and properties** remain selectable after the split; EXO should verify stronger internal invariants than can be seen in CLO's UI.
3. Persist `POM` objects independent of the selected UI tool/active pattern and reliably restore their list after browser tab changes. Explicitly test both row continuity and geometric attachment/measurement recomputation.
4. Keep sewing reference migration and per-edge seam allowance corner geometry fail-closed in production Rust until native remapping, Undo, multi-size grading and DXF/AAMA export comparisons are numerically validated.

## Status and validation

All operations were made against the disposable CLO window; no Save/Export of the garment was requested or executed. The signed inspector was rebuilt for dedicated guarded split and named-notch identity probes. Native event status and screenshots accompany this note. This loop does **not** claim complete CLO feature parity or export fidelity.

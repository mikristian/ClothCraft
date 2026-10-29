# CLO 7.0.242 direct test — independent free curve point, deformation and Redo/Undo

**Date:** October 18, 2026

**Environment:** Real running CLO Standalone OnlineAuth Academic 7.0.242 (r39887), signed `EXO CLO Inspector.app` using macOS Accessibility, CGEvent and ScreenCaptureKit. Test document: disposable open copy `Male_T-shirt-direct-test-20261018.zpac`, in the 2D Pattern Window. The documented experiment altered only unsaved in-memory geometry. The original garment and the test copy on disk were not saved or intentionally modified.

## Tested question

Can CLO's **Edit Curve Point** create a free curve point on a flat-pattern outline, deform the contour by dragging that point, and reliably restore it through Undo and Redo? This is separate from **Add Point/Split Line**, which creates a segment boundary point.

Official documentation: [Edit Curve Point](https://support.clo3d.com/hc/en-us/articles/115000375127-Edit-Curve-Point) and [Edit Curve Point worked examples](https://support.clo3d.com/hc/en-us/articles/115012226307-Edit-Curve-Point). Documentation describes a simple click on a segment to add a free curve point, then drag the added point to reshape the segment.

## Exact native test and evidence

| Sequence | Driver and actual observation | Evidence |
| --- | --- | --- |
| 1. Before | On copied T-shirt, activated CLO `2D Pattern > Edit > Edit Curve Point` through Accessibility menu. The action returned `AXPress = 0`. The side seam was straight, with no newly inserted selected free curve point. | `clo-free-point-side-before-20261018.png`, `clo-free-point-side-tool-20261018.png` |
| 2. Create | Sent actual pointer hover/down/up at window-relative **(787,521)** on the left front torso's straight side outline. CLO displayed a **hollow red/orange curve point** at the selected location and two length subdivisions **12.76 cm and 13.41 cm**. The adjacent cutline segments remained straight until the next operation. | `clo-free-point-side-after-20261018.png` |
| 3. Move point | Selected the native Edit Curve Point tool and dragged the new point by **(-10,0) screen pixels**, moving it outward to the left. The 2D segment became a visibly bowed side seam and the displayed total length changed from approximately **26.18 cm** to **28.48 cm**. The 3D garment outline simultaneously bulged around the corresponding torso area. | `clo-free-point-drag-before-20261018.png`, `clo-free-point-drag-after-20261018.png` |
| 4. Undo deformation | CLO `Edit > Undo` Accessibility action returned `AXPress = 0`, `AXEnabled = true`. The side edge returned to straight, visible length **26.18 cm**, while the free curve point creation remained in the transaction history. Screen comparison of the 2D canvas showed only **83 pixels** above the threshold remaining different against the before-drag frame; most differences were selected-point color overlays. | `clo-free-point-drag-undone-20261018.png` |
| 5. Redo deformation | CLO `Edit > Redo` action returned `AXPress = 0`, `AXEnabled = true`. The bowed side seam returned. Comparing the 2D canvas against the pre-Redo screenshot found approximately **960 materially changed pixels**. | `clo-free-point-redo-before-20261018.png`, `clo-free-point-redo-after-20261018.png` |
| 6. Undo Redo | `Edit > Undo` immediately after Redo again returned `AXPress = 0`, `AXEnabled = true`. The 2D canvas region returned to **pixel-identical** geometry against the pre-Redo screenshot (0 changed pixels above threshold). | `clo-free-point-redo-undo-restored-20261018.png` |
| 7. Undo point creation | Issued one additional `Edit > Undo`, which removed the newly added free curve point and returned the displayed left side seam to its initial straight contour. | `clo-free-point-final-undo-before-20261018.png`, `clo-free-point-final-undo-after-20261018.png` |

The screenshot comparisons are based on direct PNG captures from the actual CLO window. Window-relative pointer positions are screen pixels, **not physical centimetre coordinates**. The observed lengths are CLO's displayed physical measurements; no undocumented mathematical interpolation or garment model internals are inferred. One transient inspector AX tree warning during the insertion probe did not prevent the before/after screen capture; subsequent drag, Redo and Undo probes completed without inspector warnings.

**Three-frame visual comparison:** `CLO_FREE_CURVE_POINT_3FRAME_20261018.png` aligns the captured 2D side seam and 3D garment silhouette across the straight, outward-dragged and restored states, including the 26.18 → 28.48 → 26.18 cm length readouts.

## What this newly establishes

1. **Free curve points are real independent editable objects.** A click on a straight segment with Edit Curve Point created a visible free curve-point control and selectable length subdivisions. That is more specific evidence than the prior inconclusive click on the neckline.
2. **Dragging a free curve point changes material geometry without first using Add Point/Split Line.** The side outline bowed; the arc-length display changed from **26.18 cm** to **28.48 cm**, and CLO updated the avatar garment silhouette. The screenshot does not reveal whether the underlying proprietary geometry has extra internal control nodes.
3. **Undo/Redo transactions are reversible and sequenced by action.** The point creation and the later deformation are distinguishable in CLO's action history: one Undo reversed the deformation; Redo restored it; a subsequent Undo removed the free point when the deformation had been undone.
4. **The measurement readout is coupled to geometry editing.** Recomputed lengths are exposed directly in the 2D window and respond to free point movement.

## Exact implications for EXO ClothCraft V2

Current EXO Rust `CurvePoint { panel, anchor, curved }` in `research/oss/clothcraft/src/authoring.rs` toggles Bézier handles on existing outline anchors. This is **not feature parity** with the separate CLO free curve point object observed above. In `src/components/ClothCraftBoardV2.jsx`, the native `curve` tool conflates adding cubic tangents with editing anchored geometry; there is not yet a first-class persistent free curve-point model.

**Recommended production behavior and acceptance tests:**

- Distinguish `BoundaryVertex` (topology-changing cutline split), `FreeCurvePoint` (persistent non-cutline curve shaping constraint), and `BezierHandle` (tangent control). Document units in physical metres in native Rust and apply pixel-based pointer hit tolerances after zoom.
- A free curve-point insertion on a straight side must preserve the original cutline's sewing/notch/allowance edge IDs, while attaching the new curve point to its owning directed edge by **stable edge ID plus path parameter**. The point should remain editable without creating a separate sewn cutline segment.
- Moving it must recompute the 2D arclength and update 3D geometry in one accepted transaction; invalid resulting contours must fail closed. Store an explicit undo payload for point creation, displacement and any symmetry reference updates.
- Regression fixture: add at 50% of a straight edge; verify original length on creation, length increase on outward dragging, correct edge ownership/sewing references, Undo length restoration, Redo bitwise or tolerance-bounded geometry restoration and a final Undo of creation.
- Provide selected point state, length readouts and active hover/accessibility cues matching observed CLO workflow. Do not label a simple existing-corner Bézier-toggle command `Edit Curve Point` without the addition/move/Undo behavior.

## Remaining tests

Native sewing edge/notch/allowance reference preservation under a topological split remains **unverified**. The live test did not export a manufacturer pattern or inspect CLO's proprietary IDs. For that next test, choose an explicitly sewn edge in the copied fixture, capture seam indicators/line lengths and attached notches before and after the split, then Undo/Redo; use a supported DXF-AAMA/ASTM export for numerical correspondence only when adequate disk headroom is available.

The signed inspector and existing EXO working tree changes were preserved. This audit adds research evidence only; no production EXO UI or Rust geometry was changed during this test.

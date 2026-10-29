# EXO CLO 7 right 2D A/B — functional implementation audit

2026-10-17. Real CLO toolbar labels and EXO Rust outcomes; limited supported operations are not full CLO feature parity.

| Slot | Real CLO label | V2 state | Actual behavior |
|---|---|---|---|
| A01 | Transform Pattern | native | Native BoardTransform changes 2D panel placement. |
| A02 | Edit Pattern | native | Native MovePoints/CurvePoint edit existing pattern points. |
| A03 | Fullness (Point) | native | Rust-authored gathered strip and sewing from selected internal line; no point-directed contour fullness |
| A04 | Polygon | native | Native Polygon creates authored pattern geometry. |
| A05 | Internal Polygon/Line | native | Native InternalLine authors panel interior lines. |
| A06 | Base Polygon | native | Create a real Rust Primitive rectangle, ellipse or sector panel using numeric dimensions; supported geometry is saved and reversible with native Undo. This is a limited base-shape workflow, not full CLO parametric polygon drafting. |
| A07 | Trace | native | Trace a selected native straight-edge outer contour into a separate Rust polygon panel with matching relative geometry and fabric. Curved edges and holes are rejected; native Undo/Redo and Save/reopen are supported. |
| A08 | Notch | native | Place a persistent 6 mm notch at a selected boundary arclength fraction in native Rust. Option-click can remove an exact stored marker. This is a manufacturing marking, not a mesh cutout. |
| A09 | Seam Allowance | native | Apply a persistent 10 mm per-edge cutting guide in native Rust. Option-click clears it; guide does not change stitched contour or triangulated cloth. |
| A10 | Walk Pattern | native | Actual UV seam arclength markers and mismatch; no automatic easing |
| A11 | Edit Point of Measure | inspect | Edit two metric tape endpoints (temporary) |
| A12 | Point of Measure | inspect | Two-click centimetre tape (temporary) |
| A13 | Edit Annotation | native | Edit an existing persistent pattern note in material coordinates; the Rust edit supports Undo and saved JSON reopen. This does not generate production POM tables. |
| A14 | Pattern Annotation | native | Click a 2D pattern and enter annotation text to create a persistent Rust-authored drafting note with exact material position and native Undo. Alt-click an annotation to delete it. |
| A15 | Pleats | native | 3 parallel construction fold guides on simple rectangle; no physical crease solver |
| A16 | Edit Grading | native | Manual mm grading one polygon with Rust Undo/Redo/save |
| A17 | Auto Grading | native | Preset single-pattern grade, no multi-size nest |
| B01 | Edit Sewing | native | Open the native Sew Editor and modify an existing actual edge-pair constraint, not merely colored stitch guides. |
| B02 | Segment Sewing | native | Select two existing complete 2D boundary segments and sew their full lengths with the Rust Sew command. Native Undo and edge validation apply. |
| B03 | Free Sewing | native | Select two 2D boundaries, then enter independent start/end fractions to sew all or part of their lengths through the Rust Sew command. Native Undo and edge validation apply. |
| B04 | Check Sewing Length | inspect | Actual Rust seam lengths and gap |
| B05 | Steam | unavailable | Requires a solver-backed textile finishing or reinforcement constraint, with material/temperature parameters and measurable cloth response. EXO does not yet simulate this manufacturing process. |
| B06 | Seam Taping | unavailable | Requires a solver-backed textile finishing or reinforcement constraint, with material/temperature parameters and measurable cloth response. EXO does not yet simulate this manufacturing process. |
| B07 | Edit Texture (2D) | inspect | Native Fabric properties inspector |
| B08 | Transform Graphic | inspect | Native graphic mm dimensions and appearance property editor |
| B09 | Graphic (2D Pattern) | inspect | Native graphic layers and original image import |
| B10 | Edit Topstitch | inspect | EXO draft topstitch inspector, no native thread solver |
| B11 | Segment Topstitch | inspect | EXO draft stitch segments, no native thread solver |
| B12 | Edit Puckering | inspect | EXO draft puckering settings only |
| B13 | Segment Puckering | inspect | EXO draft puckering segment settings only |
| B14 | Set Sublayer | unavailable | Requires a native pattern-side paint/layer/UV tool with persistent material masks, per-face maps and reversible edits. The separate Fabric workspace handles existing material properties. |
| B15 | Fill | native | Assign real existing fabric material to Rust panel with Undo/save |

## Verification

- Direct native grade test: 200×100 mm to 220×90 mm, Undo/Redo/save/reopen passed.
- Rust-backed 32/32 browser QA passed with zero page errors. Actual grade increments, walk markers, fill, 2D tape and sewing variants checked.
- Steam, Seam Taping and Set Sublayer remain unavailable; they require native solver or layer records.
- Fullness strip requires an existing internal line; native Ruffle tests verified it creates an actual panel and seam, with Undo/Redo/save/reopen.
- Native pleat fold guides were verified in the Rust session: exactly three parallel line records persist as a single Undo transaction, with Redo/save/reopen and invalid-orientation rejection.

## Release
**Installed and verified** in `~/Applications/EXO ClothCraft Studio V2.app` on 2026-10-17. The running signed app contains the tested Rust session binary, updated Node workspace bridge, and current built web interface. Live installed read-only browser QA verified all **32 slots** (19 native, 10 related inspectors, 3 unavailable), six real modal workflows, two native pattern panels, and zero JavaScript errors. Saved garment data was not mutated by installed QA. The previous installed native binary/bridge and user workspace were backed up under `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/right-tools-native-20261017`; the previous V2 web bundle is retained under `integrations/clothcraft/output/app-backups/EXO-V2-web-before-right-native-tools-20261017`.

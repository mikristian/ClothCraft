# EXO ClothCraft V2 — 2D manufacturing geometry milestone

**Date:** 2026-10-20. **Scope:** second milestone from `REA_CLO3D_MASTER_AUDIT_20261019.md`: physical split/notch/allowance/POM interoperability and calibrated metric SVG/DXF *engineering proofs*. Verified in source UI and disposable native Rust, **not installed or factory certified**.

## Implemented

1. **One atomic double-notch command.** Native `authoring::Command::NotchPair` accepts a named panel/edge, center arclength fraction, actual spacing in metres and notch depth in metres. Both physical positions are validated before either is recorded. A failed pair leaves no partial notch. One success creates one Rust revision and one undo step. The source 2D Notch tool now uses this command on Shift-click, rather than two independent `Notch` transactions.
2. **Physical numeric notch UI.** `ClothCraftCornerTools.jsx` exposes depth and double-notch spacing in millimetres. Defaults remain 6 mm each; edits reject nonfinite/out-of-range values. Normal click uses the authored depth, Shift-click inserts the pair, Option-click removes the nearest existing physical mark. The display warns that production cutline proof requires notch depth not greater than the assigned allowance.
3. **Multi-layer native metric export.** `exo-session.rs` `production-cutlines` now includes independent `STITCH_EXO` sewn-boundary LINE entities, `CUT_EXO` offset cutting contour, `NOTCH_EXO` marking segments, `LABEL_EXO` piece text, plus `POM_EXO` and `POM_LABEL_EXO` measurements when present. The SVG contains corresponding separately labeled sew polylines, POM lines/text and piece label. JSON adds `pomMarksMm`, measured from native named-edge physical anchors. Both SVG and DXF retain mm units; the exporter remains `factoryApproved:false`.
4. **No false import pieces or lost paired notches.** `src/core/dxf.js` ignores manufacturing support layers when reconstructing closed garment outlines. Its notch parser now retains physically distinct adjacent notch lines instead of merging everything within 8% of an edge into one mark; it reads actual DXF line length for imported notch depth.
5. **Production inspection UI.** `NativePatternAuditPanel.jsx` displays proof POM count and independent stitched contour status, with explicit non-certification warnings.

## Source files

- `src/components/ClothCraftBoardV2.jsx` (Shift-click paired notch command and numeric state; pre-existing curve edits preserved)
- `src/components/ClothCraftCornerTools.jsx` (millimetre settings)
- `src/components/NativePatternAuditPanel.jsx` (real proof readout)
- `src/core/dxf.js` (roundtrip safe layer/physical notch interpretation)
- `research/oss/clothcraft/src/authoring.rs` (atomic native command)
- `research/oss/clothcraft/src/bin/exo-session.rs` (native bridge parser and metric engineering export)
- `research/oss/clothcraft/tests/notch_pair_atomic.rs` (new Rust regression)

## Validation (all disposable)

| Gate | Reproducible command | Outcome |
| --- | --- | --- |
| Native pair, invalid rollback, one-step history | `cd research/oss/clothcraft && ~/.cargo/bin/cargo test --no-default-features --test notch_pair_atomic --quiet` | **2/2 PASS** |
| Native POM, cutline and pair regressions | `cargo test --no-default-features --test notch_pair_atomic --test persistent_pom_references --test cutline_production --quiet` | **21 tests PASS** |
| Source UI Shift-click end to end | `EXO_NOTCH_PAIR_UI=http://127.0.0.1:5297 node integrations/clothcraft/qa-manufacturing-notch-pair-ui-20261020.mjs` | **PASS** one real `NotchPair` network command, no individual notch commands; 200 mm edge, 6 mm pair separation, 4 mm depth; native revision 1→2, one UI Undo revision 3 removes **both**, saved project retains pair |
| Physical split preservation | `node integrations/clothcraft/qa-manufacturing-split-pom-20261020.mjs` | **PASS** split migrates 2 notches, POM anchors and allowances, does not mutate on invalid input, save/reopen |
| DXF/SVG independent scale and import | `node integrations/clothcraft/qa-dxf-manufacturing-20261020.mjs` | **PASS** 200×100 mm source + 10 mm all-edge allowance gives 220×120 mm cutline, 26,400 mm², 680 mm perimeter, exact metric DXF/SVG vertex and notch parity |
| DXF/SVG sew, labels, POM and double-notch parity | `node integrations/clothcraft/qa-dxf-manufacturing-pom-pair-20261020.mjs` | **PASS** four sew segments, 160 mm POM at [20,0]→[180,0] mm, two 4 mm notch marks 6 mm apart, one imported garment (not two), and two retained imported notches; undo/redo, save/reopen, invalid rollback |
| Previous 2D spline regression | `node --test src/core/nativeFreeCurvePoints.test.mjs src/core/patternGuideTracks.test.mjs src/core/patternCurveDrafting.20261019.test.mjs src/core/patternSewingGuideSampling.test.mjs src/core/patternVisualTokens.test.mjs` | **28/28 PASS** |
| Source production bundle | `./node_modules/.bin/vite build --outDir /tmp/exo-clothcraft-manufacturing-build-20261020 --emptyOutDir` | **PASS** (existing nonblocking large-chunk warning) |

## Native isolation and limitations

Every integration test used a temporary project and either an isolated Rust process or a private unique-port backend. Playwright routes all `/workspace` commands to that private backend. Neither installed CLO nor the production EXO bridge on port 5385 or the user's original garment were modified. Rebuilt `target/debug/exo-session` belongs to the development repository, **not a production installation**.

The output is still *generic R2000 DXF proof*, not graded AAMA/ASTM, PLT, factory cutter calibration or a verified sewn sample. Nested holes, authored internal lines, unsafe joins, ambiguous notch projections and missing allowances currently block cutline generation rather than emitting dishonest contours. Free-curve control topology and graded size interchange need additional qualification before a factory handoff.

**Next milestone:** turn construction-only red dart ticks into physically authored and sewn 2D dart geometry, preserved through simulation and exported cut/sew contours, with live UI and compiled Rust tests. Do not confuse the decorative red drafting marks with real fabric darts.

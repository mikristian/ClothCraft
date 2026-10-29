# EXO ClothCraft V2 — physical cut-and-sewn dart milestone

**Date:** 2026-10-20. This is the third EXO CAD milestone, after curve editing and manufacturing cutline geometry. The **installed production** workspace/project was not modified. All dart-authoring QA ran against freshly created temporary native projects. The separately named **EXO ClothCraft Studio V2 QA.app** was deliberately updated and reopened for visual inspection.

## What is now physical

The first native dart authoring command, `DartCutSew`, accepts an editable material panel, a named **straight, unsewn** cutline, two interior arclength fractions, and an apex in metres. In one transactional edit it:

- validates the intake, perpendicular inwards apex, rest geometry and source edge ownership;
- removes the wedge by inserting three contour vertices (left dart mouth, apex, right dart mouth) and three named boundary edges;
- creates one **same-panel, equal-length, reversed** Rust sewing seam connecting both actual leg edges;
- recompiles the physical mesh and sewing constraints; the 3D solver receives that seam, not merely an SVG red marking;
- carries the original seam allowance to newly created dart legs if the source edge had an allowance, while blocking factory cutline export if other required allowances are absent;
- retains a native Rust revision with standard Undo/Redo, save/reopen and native snapshot serialization.

The corresponding source UI has a **Physical Dart (Cut + Sew)** option in the 2D *Internal Line* toolbar family. The 2D Pattern Display controls offer **dart intake (mm)** and **dart depth (mm)**. Click a named eligible cutline to submit the atomic native command. The resulting two true cutline legs are highlighted by `[data-physical-dart]` and `data-dart-physical=true`, rather than the construction-only red ticks labeled `data-dart-physical=false`. The 3D viewport redraws from the committed revision.

**Important geometric distinction:** this is a **cut-and-sewn wedge removal**, not an uncut folded dart or a CLO-quality tucked fold. The experimental cloth solver enforces a seam between physical V-leg boundaries, but full folding, contact, thermal finishing, and fit convergence are not certified. No claim is made that the user's existing T-shirt is modified: this initial command only accepts an unsewn straight source edge and fails atomically for unsupported curves, annotations or pre-existing sewn intervals.

## Current code locations

- `research/oss/clothcraft/src/authoring.rs`: `Command::DartCutSew` validates, authors three source material vertices, migrates allowances and adds the linked native seam.
- `research/oss/clothcraft/src/bin/exo-session.rs`: JSON command decoder.
- `src/components/ViewportQuickTools.jsx`: actual Dart tool in Internal Line alternatives.
- `src/components/ClothCraftCornerTools.jsx`: numeric intake and depth, with limitations noted in UI.
- `src/components/ClothCraftBoardV2.jsx`: real material-space pointer projection, physical Dart command and seam-derived SVG path/metadata. Existing construction-only references remain explicitly labeled as such.
- `research/oss/clothcraft/tests/physical_cut_sewn_dart_20261020.rs`: source-level geometric, seam and rollback tests.
- `integrations/clothcraft/qa-dart-cut-sewn-worker1-20261020.mjs`: disposable native session and source browser QA.

## Validation results

| Gate | Evidence | Result |
| --- | --- | --- |
| Physical cut, solver seam, rollback and protected existing seam | `~/.cargo/bin/cargo test --no-default-features --test physical_cut_sewn_dart_20261020 --quiet` | **4/4 PASS** |
| Geometry on 200×160 mm source | Native disposable `DartCutSew` 30 mm intake × 80 mm depth | **1200 mm²** physical wedge loss |
| Rest mesh and compiled 3D | Native snapshot after `DartCutSew` | Native 3D positions and triangles regenerated, one physically compiled same-panel seam |
| Native save/reopen and single Undo | Disposable `exo-session` | PASS: reload preserves seam and vertices; Undo returns original four-point rectangle |
| Manufacturing cutline with complete allowances | Rust `production_cutline` contract on rectangle with 10 mm allowances before Dart | PASS: closed metric engineering contour with derived leg allowances |
| Real Curve/2D → native dart/3D browser transaction | `node integrations/clothcraft/qa-dart-cut-sewn-worker1-20261020.mjs` against Vite 5297 with a unique private Rust bridge | **PASS**: actual flyout Dart selection, 30 mm intake and 80 mm depth, click unoccluded 200 mm rectangle edge; exactly one `DartCutSew` POST, visible `[data-physical-dart]`, 2567 native 3D positions, saved/reopened seam, one UI Undo removes dart, no page or bridge errors; revision 1→2→3 |
| Earlier geometry/measurement regressions | Five Node test suites | **28/28 PASS** |
| Live source bundle | `vite build` isolated outDir | PASS; nonblocking pre-existing large-chunk warning |

The initial solver run advanced two steps, but the total-scene seam-gap and stretch metrics cannot establish a converged sewn dart. Quantitative dart-specific seam closure and longer stable solver runs remain required before production use.

## Reopened application acceptance — PASS

The isolated **EXO ClothCraft Studio V2 QA.app** was refreshed with the current web source and a byte-identical, freshly rebuilt private Rust `exo-session` binary, re-signed and reopened. It is running with the new dart feature as **app PID 54173**. Static frontend port **5486** returned HTTP 200; native service **5485** returned `nativeReady:true`. A read-only Chrome/Playwright inspection against that **installed, reopened QA app**, distinct from development Vite, confirmed:

- a real 2D Pattern Window and visible 3D canvas;
- **Physical Dart (Cut + Sew)** is a visible option on hovering the **Internal Line / Dart** tool family; its popover is collapsed by default;
- the bundled application JavaScript includes both literal `Physical Dart (Cut + Sew)` and `DartCutSew`; no stale-toolbar assets;
- zero browser page errors in the read-only visual QA;
- `integrations/clothcraft/output/qa-v2-physical-dart-menu-open-20261020.png` shows the actual installed QA interface with the Dart menu expanded.

**Isolation:** the regular installed EXO ClothCraft Studio V2.app remained running as PID 19562 and its original 5385/5386 services remained on original PIDs 19567/19566; no original garment project was touched. The QA app's old UI and binary were backed up under `integrations/clothcraft/output/app-backups`. Reopening this separate QA app does **not** yet deploy changes to the regular production V2 installation.

## Next safety and feature gates

1. Test dart-specific seam closure at 50, 200 and 1000 solver steps with penetration checks, not a whole-scene max from unrelated seams.
2. Make an **uncut folded dart** with genuine fold/bending constraints and overlap collision, rather than cutting away material.
3. Extend dart editing across sewn curved edges with stable notch, POM and seam ID migration, grading rule updates, and manufacturing exports. Generic R2000 cutline proof is **not** factory-approved AAMA/ASTM or a calibrated cutter pattern.

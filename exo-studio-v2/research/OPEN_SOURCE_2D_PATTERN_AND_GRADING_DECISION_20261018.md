# EXO: open-source 2D pattern and grading engine integration decision

Date: 2026-10-18. Scope: evaluate existing free/open-source apparel CAD as precision references and optional EXO adapters. This is a research/engineering recommendation, **not** certification of fabric cutting, industrial grading, or live app parity. Existing garment data and production code were not changed.

**Saved sources:** [Six checked-out repository references, exact commits and local paths](OPEN_SOURCE_2D_PATTERN_GITHUB_LIBRARY_20261018.md). FreeSewing's active home is Codeberg (GitHub is its legacy mirror), and Valentina's active home is GitLab (GitHub is a read-only mirror).

## Recommended components

| Priority | Software | License | Contribution | Integration boundary |
| --- | --- | --- | --- | --- |
| P0 | [Seamly2D](https://github.com/FashionFreedom/Seamly2D) | GPL-3.0+ | Parametric drafting construction history, named measurements, formulas, sizes, drafting tools | Source-reference and versioned `.sm2d`, `.smis`, `.smms` bridge. Existing EXO parser is read-only. |
| P0 | [Valentina](https://gitlab.com/smart-pattern/valentina) | GPL-3.0+ | Advanced curve/allowance and notch behavior, DXF AAMA/ASTM export, HPGL/PLT output, multisize Tape | Independent oracle for manufacturing edge cases; first compare fixtures before embedding anything. |
| P0 | [FreeSewing](https://codeberg.org/freesewing/freesewing) | MIT | JavaScript parametric pattern drafting, repeatable measurement-driven garment templates | Optional design generator feeding versioned EXO patterns; preserve construction formulas/measurement inputs. |
| P0 | [GarmentCode/PyGarment](https://github.com/maria-korosteleva/GarmentCode) | MIT | Semantic panels, edges, seam interface connections, procedural garments | Continue tested EXO JSON adapter; lossless roundtrip with stable IDs and sewing refs required. |
| P1 | [Clipper2](https://github.com/AngusJohnson/Clipper2) | Boost-1.0 | Robust polygon Boolean operations and contour offsetting, useful for cutlines/allowances | Use a deliberate curve-flattening error bound. Clipper2 must not replace authored Bézier curves or IDs. Project currently warns its *triangulation* implementation has unresolved issues; choose independently proven meshing for simulation. |
| Reference | [OpenPattern](https://github.com/fmetivier/OpenPattern) | GPL-3.0 | Measurement-based bodice/shirt construction, printable real-scale PDFs | Independent test fixture for point dimensions; not proposed as the live authoring UI. |

Important distinction: Seamly2D/Valentina multi-size measurement evaluation does **not automatically implement industrial point-rule grading** or every AAMA/ASTM import/export requirement. EXO needs explicit authored per-size grade rules and compatible files, tested independently against reference CAD.

## Actual EXO boundaries inspected

- `src/core/seamlyMeasurements.js` reads individual `.smis` and multi-size `.smms` measurement XML and preserves increments; **does not evaluate pattern construction formulas**.
- `src/core/seamlyConstructionReference.js` parses `.sm2d` construction tool IDs and formula text as a **read-only** graph. It does not regenerate resolved pattern points.
- `src/core/garmentCode.js` serializes EXO pieces, quadratic controls, edges and sewing into GarmentCode JSON, plus an EXO extension for additional metadata.
- `src/core/grading.js` provides EXO size-run and point transforms in the classic JS workspace. Native Rust grading in `src/components/ClothCraftWorkspace.jsx` explicitly supports one straight-outline panel; curves, holes and internal lines are not supported by that tool.
- Native manufacturing DXF/marker/POM paths exist separately from the native Rust cloth panel graph; neither their existence nor source tests prove the conversion between **every** representation is lossless.

## Acceptance-driven architecture

1. Define one authoritative, versioned **PatternDocument** with physical-unit coordinates and persistent `panelId`, `vertexId`, `edgeId`, `curveId`, `notchId`, `measurementId`, `seamId`. Keep design-time formulas/measurement bindings and a separate evaluated contour cache; do not treat flattened SVG as the source.
2. Build a parametric **construction evaluator** for named measurements, allowed expressions, circular-dependency detection, operation graph ordering, deterministic recomputation and invalid-geometry refusal. Start with point/line/arc/quadratic/cubic fixtures from permitted sources, then grow coverage tool by tool. Alternatively use Seamly2D itself as a separately launched reference evaluator until equivalent operations are validated.
3. Implement independent **rule grading**: per-point `(size, dx_mm, dy_mm)` and explicit size groups. Handle curve controls, holes, notches, grain, darts, internal marks and paired sewing, preserve base-size project, and validate each result by POM and true curved seam walking. Do not substitute uniform scaling or changes in body measurements for factory rule grading.
4. Make **topology edits atomic**: when inserting, moving or deleting a point, splitting a curved edge, unfolding or mirroring, remap all seam interval stations, paired notches, allowance segments, grade rules, measurements and cut marks to stable child IDs; reject any case without a verified remap. Preserve undo/redo and save/reopen correctness.
5. Use Clipper2 or a comparable robust Boolean/offset kernel for **derived** allowances and cutlines, retaining authored analytic curves and tolerance-bounded sampling provenance. Independently audit sharp/reentrant corners and variable-width allowances.
6. Convert **the same evaluated pattern document** to simulation rest-space UV/panel meshes, seam correspondences, and 3D placement; keep 2D metric lengths, source-edge provenance, grain and material orientations unchanged. Mesh remapping must not mutate the source drafting graph.
7. Generate per-size DXF (including AAMA/ASTM when independently implemented), calibrated 1:1 PDF, SVG and BOM/tech packs from the **same frozen revision**. Require external CAD import, actual-print calibration, sewing sample and technician measurement acceptance before factory-ready status.

## Low-disk proof sequence (no big upstream clones)

1. Create one simple straight tee, one curved-neck tee, one darted panel and one 5-size graded set in permitted reference engines. Archive **small** `.sm2d`, `.smms`, source JSON, DXF and a measured-spec manifest, with explicit permissions/licensing.
2. Test construction edits and formula recompute in Seamly2D/Valentina, then roundtrip through EXO; measure physical boundary arclength, signed area, vertex/curve coordinates and stable annotation IDs to predeclared tolerances.
3. Test exact-size POM and sewing pair consistency before and after point split and multi-size grading; compare two external CAD consumers.
4. Finally pipe accepted panels to EXO Rust sewing and 3D meshing; record self/body contacts and garment quality independently from geometric authoring correctness.

## Current local validation performed 2026-10-18

- `node scripts/check-garmentcode-adapter.mjs` **PASS**: 4 panels, 14 stitches, 5 curved front edges, metadata extension v1.
- `node scripts/check-seamly-workspace-materials.mjs` **NOT EXECUTABLE HERE**: missing expected `research/oss/Seamly2D/src/app/share/samples/patterns/male_shirt.sm2d` (ENOENT).
- `node scripts/check-native-cpp-seamly-import.mjs` **NOT EXECUTABLE HERE**: missing expected `/tmp/garment-native-seamly-test` binary (ENOENT).
- FreeSewing, Valentina, and Clipper2 **not installed or benchmarked** by this report. No percent parity or manufacturing accuracy implied.

## Licensing and scope

Current EXO repo is GPL-3.0-only, but upstream components retain their individual notices, third-party dependencies and file asset rights. Review source/dependency distribution obligations before incorporating code or installers. For a modular pipeline, keeping optional GPL design tools as external applications permits validating behavior independently; merely placing processes across IPC does not itself settle copyright/derivative-work questions.

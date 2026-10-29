# EXO Rust manufacturing geometry and safe-reference preservation

Date: October 18, 2026. Status: native source integration and limited QA, NOT manufacturer-approved.

## Authoritative Rust geometry

The new native cutline module at research/oss/clothcraft/src/garment/cutline.rs creates a complete implicitly closed counterclockwise cutting outline from sampled metric material-space boundaries, with per-edge seam allowance offsets, bounded miter joins and validated area/perimeter. Every result retains the source edge name.

Malformed inputs are refused: incomplete allowances, self-intersecting contours, degenerate samples, unsafe joins or miter blowups, unsupported holes/internal lines, ambiguous notch rays, over-deep notches and duplicate stations. The algorithm is intentionally conservative, not a full industrial all-topology offset kernel.

Notches remain source entities with original edge IDs and arclength stations. Each safely representable notch ray-projects outward onto one matching cutline boundary segment and supplies a separate marking line from cut_start to inner_end, with metric depth. The closed cutting contour remains unchanged. A manufacturer must still approve cutter-specific notch machining.

## Reference-preserving topology edits

Rust SplitBoundary already performs transactional sewing range and correspondence remapping, including reversed and eased sewing, while retaining edge identity and re-stationing allowable boundary notches. Child edges inherit allowance widths and proportionally assigned edge length targets. This pass tightened checks for nonfinite or invalid stored allowances, target specs, notch stations and notch depths BEFORE any mutation. Delete-point operations reject adjacency to attached sewing and manufacturing metadata instead of dropping references. All failures keep document history unchanged.

Exact migration of independent free curve points on a split cubic remains safely blocked; these positions use base Bézier parameterization while split positions use material arclength. There is not yet an authoritative per-point factory grading rule table or POM dependency graph in the native PolygonPattern schema. Those references cannot be represented and cannot be claimed preserved or manufacturing complete.

## Rust API and 2D UI

- The read-only and revision-locked native session operation production-cutlines returns a result per panel: generated metric cutline and marks, or a blocking diagnostic.
- Valid output includes pointsMm, source edge names, notchMarksMm, perimeterMm, areaMm2 and generic R2000 ASCII DXF and full-mm SVG engineering proof strings.
- The Rust DXF is marked with INSUNITS=4 for millimetres, a closed LWPOLYLINE on CUT_EXO and LINE entities on NOTCH_EXO. This is NOT AAMA/ASTM multi-size interchange and not guaranteed compatible with factory cutter software.
- The Native Pattern QA overlay displays current-revision geometry and blockers with per-panel download controls for SVG/DXF. It refuses stale revision downloads and does not alter the garment.
- Production macOS app and its ports 5385/5386 are unchanged; packaged verification is performed in the separate QA app using 5485/5486.

## Engineering acceptance

- Native cutline targeted Rust tests include a 10 mm rectangle, unequal allowances, concave contour, self-crossing/missing and nonfinite rejection, source notch projection, multiple marks, too-deep rejection, duplicate conflict and a mildly curved edge.
- Native seam migration tests include sewing correspondences on both sides and directions, easing, repeated split, metric allowance/target/notch migration, refusal at exact notch split and invalid metadata refusal.
- End-to-end disposable Rust session test: npm run check:rust-cutlines. It authors a 200 x 100 mm rectangle with 10 mm allowance on every edge and verifies its closed 220 x 120 mm cutline, 26,400 square mm area and 680 mm perimeter, plus a 4 mm notch marking. It checks atomic split, retained names and markings, undo/redo, save/reopen and stale revision refusal.
- The native Rust DXF is independently read by EXO's JavaScript DXF parser for length units and notch mapping. This is internal interoperability, NOT an independent industrial CAD acceptance.

## Release blockers

1. Production offset geometry for all high-curvature, acute/concave, holed, darted and internally marked patterns; variable-width join strategies.
2. Stable industrial grading point IDs and size-by-size rules, preserving all graded curves, holes and nested POM/tech-pack records.
3. Full native construction formula and measurement dependency graphs, verified against reference patternmaking engines.
4. External CLO3D / independent industrial DXF or AAMA/ASTM consumer import, plotter calibration, cutter-specific notch interpretation and physical manufacturing sample signoff.

Ignored Rust source changes have been preserved under integrations/clothcraft/rust-patches for reproducible review and reconciliation. No external OSS code was copied from the saved upstream repositories into EXO.

## Completed signed QA package verification

- Vite successfully built 2,000 modules after the final cutline preview and download UI changes.
- The isolated QA macOS app was updated in place with the current native Rust executable and web assets, ad-hoc signed and verified. Its bundle identifier is com.mikristian.exo.clothcraft.workspace.v2.qa.
- The actual installed QA Rust backend accepted production-cutlines. Both current garment panels correctly reported missing neck-left seam allowances; no user garment project was edited.
- An actual browser test opened the packaged QA UI in native hybrid mode, clicked Pattern QA and Generate Rust cutline proofs, and verified blocked-panel explanations without JavaScript page errors.
- An initial browser test caught a QA-specific routing defect: some frontend clients recognized only production port 5386 and called development port 5193 from the QA window. Source code was fixed to route QA web port 5486 to the separate Rust bridge 5485 in ClothCraftWorkspace, camera tracking, native service/API clients, collaboration and EXO App bridge calls. The final rebuilt QA browser test passed.
- Production services remained independently running at 5385 and 5386. The packaged web UI was clicked through browser automation; direct native AppKit accessibility clicking is not verified.

## How to use

Open EXO ClothCraft Studio V2 QA in Applications; its built-in Mac window loads the Rust hybrid engine. Select Pattern QA in the 2D panel, then Generate Rust cutline proofs. Assign valid seam allowances on every native edge to clear missing allowance blockers. Supported pieces offer downloadable metric SVG and generic DXF proofs; unsupported holes, dangerous joins and ambiguous notches report an explicit blocking diagnostic. Treat files as engineering proofs until a manufacturer validates the DXF import, real plotting scale and a physical sewn sample.

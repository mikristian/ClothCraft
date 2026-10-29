# CLO 7 2D workflow audit — EXO implementation and validation addendum

Date: October 18, 2026. This addendum records implementation results after the 57-chapter research audit, without reclassifying untested CLO interactions as verified parity.

## Evidence and source artifacts

- Native installed CLO 7.0.242 (build 39887), `Male_T-shirt.zpac`, captured using the preapproved signed EXO CLO Inspector. The one-shot status reported macOS Accessibility and Screen Recording authorized, one CLO window, and no capture warnings. The real image is at `research/clo-2d-analysis/live-clo-inspector-20261018.png` and reproduced in the new PDF. Its screen establishes visible points, neckline/armhole contour, internal guide lines, hem and sewing marks; it does not prove the result of an interactive point operation.
- `research/clo-2d-analysis/CLO_2D_50_PAGE_DEEP_AUDIT_20261018.md` contains 57 numbered chapters, incorporating the 162 source-marked requirements from `clo7-official-point-tool-audit-20261018.md`, with gaps grounded in `exo2d-geometry-deep-audit-20261018.md`. Printable companion: `docs/CLO_2D_50_PAGE_DEEP_AUDIT_20261018.pdf` (59 physical pages, verified with PyMuPDF, visual sample inspected). Sections labeled V/documented, D/derived and U/unverified must not be conflated.

## EXO edits installed in the V2 app

1. `src/components/PatternEditor.jsx`: selected pattern now displays a physical length readout for **every** cutline edge, positioned at the true arc-length midpoint using `edgePointAt`, including curved edges. Double-clicking an outline point selects its containing pattern; Option/Alt-click explicitly deletes a point.
2. `src/App.jsx`: numeric XY edits preserve existing vertex metadata (including grading and source IDs) while still validating topology and recording Undo. Point deletion runs a geometry and attachment preflight, preserves surviving curves/point metadata, and reindexes unaffected `topstitches`, `bindings` and `zippers` so they stay assigned to the correct physical edges. Deletion is refused when these items or notches live on either merged edge; sewn adjacent edges remain protected.
3. `src/core/draftingPointDeletion.js`: pure preflight and edge-index mapping, with `src/core/draftingPointDeletion.test.mjs` regression suite.
4. `src/core/freeSewingGeometry.js`: incomplete or nonfinite cutline indices/coordinates now fail closed instead of silently connecting surviving vertices across a nonexistent gap. `scripts/check-free-sewing-cutline-integrity.mjs` includes valid arc-length paths and ten invalid examples.

## Reproducible validation

- `node scripts/qa-2d-point-integrity-20261018.mjs` **PASS**, with all-edge measurements, point metadata retained through save/reload/edit, hardware edge reindexing after a real browser point deletion, and no browser page errors. Runs in an isolated Playwright context with `testSession=tee`.
- `node scripts/qa-precision-point-curve.mjs` **PASS**: numeric point undo/redo, curve chord and absolute controls, curve straightening/Undo, saved project, no page errors.
- `node --test src/core/draftingPointDeletion.test.mjs`: four tests **PASS**.
- `node scripts/check-free-sewing-cutline-integrity.mjs`: **PASS**.
- `node scripts/check-drafting-precision.mjs`, `node scripts/check-drafting-splits.mjs`, `node scripts/check-drafting-topology.mjs`: all **PASS**.
- Installed V2 `http://127.0.0.1:5385/validate` accepted the T-shirt fixture with HTTP 200 and `rustValidated:true`: four panels, fourteen seams, no seams removed before validation.
- `bash integrations/clothcraft/macos/install-v2-js-only.sh` **PASS** (Vite built 1,987 modules, staged JS/CSS, deployed into `~/Applications/EXO ClothCraft Studio V2.app`). `codesign --verify --deep --strict` **PASS**. Rollback copy: `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/web-js-before-20261018-034753-d7z4LgzG`. Already-open V2 window may need reload to display new assets. Installer Vite warned about cursor URLs because it builds with publicDir disabled; this warning did not fail the signed install.

## Open functional gaps before calling EXO CLO-equivalent

1. **Native Rust sewn-edge topological edits:** native `SplitBoundary` presently refuses edits to edges with seams, notches, seam allowances or target lengths; the JS editor has a more complete remap transaction. Design and test an atomic, stable-ID migration for the native version with undo, including directed free-sewing intervals.
2. **Cross-editor point system:** JS `points`/single quadratic control per edge in centimetres versus native named edges/two cubic controls in metres. A shared versioned topology contract, centimetre/metre conversions, accurate curve lengths and smooth-vs-corner handle semantics are required before unified point-tool parity.
3. **Persistent 2D POM:** native measurement tape/readouts are not a complete persisted multi-station, graded, outline/internal-line bound POM document. Add authoritative editable POM data with save/reopen and behavior under geometry changes.
4. **Production curve editing:** direct segment reshaping, handle constraints, deleting/moving curve points, notch migration under curved edge split, multi-selection and exact length edits require version-specific live CLO action tests with trusted UI access and corresponding native/EXO regression fixtures.
5. **True CLO 7 direct interaction testing:** signed inspector produced a real screenshot and Accessibility hierarchy but did not simulate geometry edits; the existing subprocess automation lacks Accessibility permission. The research's documented/visual interpretations remain explicitly distinct from firsthand interactive equivalence testing.

The release is a validated incremental 2D workflow improvement, not a claim of complete CLO 7 functional equivalence or a manufacturer-certified pattern geometry pipeline.

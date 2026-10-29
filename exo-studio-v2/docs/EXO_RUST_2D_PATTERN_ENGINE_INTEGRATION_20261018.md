# EXO Rust-first precision pattern engine — 18 October 2026

**Status:** implemented and tested in local sources, not manufacturer approved.

## Implemented this pass

- **Contour integrity:** native Rust PolygonPattern edge sampling now rejects nonfinite controls, invalid indices, malformed free-curve anchors and inconsistent point sequences before generating pattern curves.
- **Cubic grading:** the Rust native grade-pattern command transforms real polygon vertices, cubic Bézier controls, independent free-curve point positions and print annotation positions in metric units. Named edges, notch fractions and physical notch depths, and per-edge allowance widths survive scaling. Holes and internal lines are rejected rather than modified unsafely.
- **Read-only engineering QA:** native Rust operation pattern-audit reports authoritative metric stitchline lengths, piece area, dimensions, curved edges, notch counts, seam allowance coverage, target length mismatches, seam-pair length mismatch and explicit manufacturing blockers. It never asserts factory certification.
- **2D UI:** native Rust Pattern QA button plus revision-aware details overlay is wired into standalone and embedded ClothCraft 2D windows, displaying measured contours and blocked release requirements.
- **Expanded Tool Index:** 12 categorized open-source reference tools from Seamly2D, Valentina, FreeSewing, GarmentCode, OpenPattern and Clipper2, plus persisted Pattern directory focus. These reference entries are explicitly not fake working actions.
- **Source archive:** six pin-committed sparse checkouts in research/oss/pattern-cad, indexed in research/OPEN_SOURCE_2D_PATTERN_GITHUB_LIBRARY_20261018.md.
- **Reproducible Rust portability:** because the external ClothCraft clone is ignored by the outer Git repository, the authoritative polygon Rust source diff and a focused test are also preserved under integrations/clothcraft/rust-patches/ rather than relying only on the disposable source checkout.

## Evidence

- Rust five unit tests passed on the native session bin, including curved/free-point metric grading, no mutation on invalid increments, and preserving notches/allowances.
- Focused upstream Rust curve sampling, independent point and split-reference tests passed (1+10).
- Native session QA passed: original 200x100 mm, 20000 mm²; authored notch and 10 mm allowance; later real cubic grade to 220x110 mm; exact source geometry persisted; undo, redo, save/reopen and stale-revision checks passed.
- Existing native grade persistence QA passed (straight shape, undo, redo, reload, invalid increments).
- EXO GarmentCode adapter QA passed (4 panels, 14 stitches, 5 curved front edges).
- Final Vite build passed (2000 modules), including Pattern Focus workspace changes; Pattern Focus regression passed.

## Isolated packaged QA verification

The existing installed QA macOS bundle, not the production bundle, was updated in place with new web JS/CSS and a GPU-capable Rust session executable, translated to QA localhost ports 5485/5486, and ad-hoc re-signed. Its visible native window and both QA service listeners were verified. Its real Rust backend handled read-only pattern-audit successfully (2 editable panels, 8 sewn pairs, 3 factory-release blockers). Production ports 5385/5386 remained listening throughout.

The Pattern Focus preset switches the main editor to a 2D-only layout with a filtered set of working 2D tools. The filtering does not overwrite customized toolbars, which reappear when switching workspace. Extra tools from open-source references are clearly marked as research-only. Direct mouse clicking of the packaged native GUI was not verified because macOS Accessibility automation permission is missing; the packaged code, native window, HTTP service and Rust operation were checked separately.

**Packaged QA browser smoke:** An isolated Playwright Chrome session opened the actual QA-bundled web UI at 127.0.0.1:5486, selected Pattern Focus in the layout dropdown, verified 2D visible and 3D hidden, then selected Drafting and verified the split layout returned. No browser page errors. This is real browser user interaction with the packaged QA web application, distinct from an untested native AppKit accessibility click.

**Disk and release boundary:** approximately 1.8 GiB free after removing only disposable Rust incremental build artifacts; development source, compiled binaries and user documents preserved. The production installation and its localhost 5385/5386 services were not updated.

## Remaining manufacturer-readiness gates

1. Joined, closed and validated production cutline offsets for curved boundaries (current guides are not certified production cutlines).
2. Authored rule grading across sizes, preserving holes, darts/internal lines, seam references, symmetric links, notch pairings and verified POM tables.
3. Full parametric construction graph evaluation from measurement formulas; imported Seamly construction graphs are read-only.
4. AAMA/ASTM or independently validated factory DXF and calibrated plot/PDF output, with at least one external CAD importer.
5. Actual factory cut/sewn samples with independent measured POM and supplier approval; physical fabric and simulation tests.

No third-party source was copied into shipping EXO. Licenses require review before derivative integration. All changes preserve production app bundles and original garment files; native integration was built/tested in development staging.

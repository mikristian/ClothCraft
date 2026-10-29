# EXO Native 2D Manufacturing Engineering Solutions — 18 October 2026

**Scope:** Engineering specification for importer/exporter, grading, PDF plotting, POM, markers, BOM, sewing/3D, serialization, CI and Rust interfaces. **Status:** research and proposed implementation; no production certification implied.

## Evidence and existing implementation

Repository inspection confirms `native_cpp/core/dxf_import.cpp` has `importDxfPatterns` and explicitly disclaims ASTM sewing graph reconstruction; `native_cpp/core/dxf_export.cpp` implements `exportCuttingDxf`; `native_cpp/core/construction_dxf.cpp` provides construction export; `native_cpp/core/marker_pdf.cpp` has `markerToPdf` and rejects invalid markers. Grading primitives and adapters exist in `native_cpp/core/grading.cpp`, `grading_helpers.hpp`, and `graded_geometry_parity_bridge.cpp`. `native_cpp/core/bom_export.hpp`, `measurement_export.cpp`, `tech_pack_export.hpp`, `marker_exact.cpp`, and `seam_assembly_parity_bridge.cpp` indicate related implementation surfaces. Existence of these files alone does **not** establish ASTM certification, production calibration or full interoperability.

### Sources and standards to validate against

- [ASTM International standards catalog](https://www.astm.org/) — obtain licensed apparel CAD interchange standard text and test against it; do not assume proprietary semantics from file extension.
- [Autodesk DXF Reference](https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3) — group codes, entities, units and block transforms.
- [ISO 216 paper sizes](https://www.iso.org/standard/36631.html) — A-series media dimensions.
- [PDF 2.0 ISO 32000-2](https://www.iso.org/standard/75839.html) — PDF coordinate and page model.
- [CGAL polygon processing](https://doc.cgal.org/latest/Polygon_mesh_processing/index.html) — reference for robust geometry design.
- [CLO support](https://support.clo3d.com/) — interoperability behavior must be validated against installed CLO and documented export dialogs.
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) — public error and type conventions.
- [Open Design Alliance](https://www.opendesign.com/) — possible licensed CAD interoperability route.

**Evidence legend:** V = directly observed repository symbol; D = published external specification; P = proposed design requiring implementation and test. All numbered solutions below are P unless explicitly marked V.

## Gap matrix

| Capability | Observed repository surface (V) | Unresolved factory proof | Proposed gate |
|---|---|---|---|
| Generic DXF | `dxf_import.cpp`, `dxf_export.cpp` | Fidelity across supplier fixtures | Roundtrip geometry and annotations |
| ASTM/AAMA | Import source expressly excludes reconstructed sewing graph | Full semantic dialect interchange | Licensed fixtures and semantic equivalence |
| Grading | `grading.cpp`, `grading_primitives.hpp` | Rule-file vendor parity | Golden graded nest |
| Marker/PDF | `marker_pdf.cpp`, `marker_exact.cpp` | Physical 1:1 printer calibration | Measured output at multiple points |
| POM/BOM | `measurement_export.cpp`, `bom_export.hpp` | Factory-approved specs and costing | Signed release package |
| 3D sewing | `seam_assembly_parity_bridge.cpp` | Stable topology correspondence | Sewing mutation regression |
| Release | `tech_pack_export.hpp` | Complete immutable factory package | Revision hash consistency |


## 01. Canonical manufacturing graph

**Engineering design (P).** Represent each piece with immutable UUID, ordered boundary loops, explicit segment UUIDs, cubic geometry, grainline, material, cut quantity, mirrored state, and provenance. Store all geometry in centimeters internally with an explicit export unit and coordinate frame. Reject nonfinite points, self-crossings, orphan edges, and duplicate segment identifiers before export.

**Verification oracle.** Roundtrip a two-piece asymmetric garment through JSON and verify edge UUID, notch ownership, and winding invariants.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 02. DXF dialect negotiation

**Engineering design (P).** Introduce a capability matrix for generic AutoCAD DXF, ASTM apparel DXF and AAMA apparel DXF. Detect HEADER variables, BLOCKS, ENTITIES, layer semantics and grading tables; preserve unknown records in an extension bag. Never label a generic entity parser ASTM-compliant.

**Verification oracle.** Use three independently sourced factory files per dialect and record unsupported sections without silent data loss.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 03. DXF import parser

**Engineering design (P).** Use a streaming token reader of group-code/value pairs with line-numbered diagnostics, bounded entity count, size cap and deterministic decoding. Reconstruct LINE, ARC, LWPOLYLINE, POLYLINE and SPLINE with explicit closure and bulge handling. Convert bulge to signed arc sweep θ=4 atan(b).

**Verification oracle.** Property-test open versus closed polylines, negative bulges, malformed records, mixed units, and block transforms.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 04. DXF topology reconstruction

**Engineering design (P).** Build a planar arrangement by intersecting entities within ε, splitting at intersections, welding only within controlled tolerance and extracting closed faces by half-edge traversal. Preserve open internal drafting lines as independent geometry. Require operator selection when multiple candidate outer contours overlap.

**Verification oracle.** Test holes, islands, touching boundaries, coincident seams and ambiguous contours; report ambiguity rather than selecting largest polygon blindly.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 05. ASTM/AAMA semantic mapping

**Engineering design (P).** Build dialect-specific mapping tables for boundary, internal line, drill, notch, grain, piece annotation, sizes, grade rules and sew line. Carry raw original layer, block and record identifiers alongside mapped fields. Implement mapping profiles versioned per supplier.

**Verification oracle.** Golden-file tests should compare semantic records and count losses; success means no unsupported mandatory entity silently disappears.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 06. DXF export contract

**Engineering design (P).** Separate cut geometry, stitch geometry and construction lines. Export closed cut contours with seam allowances applied only once; include piece ID, grain, material, cut counts, notches, drill points and metadata using profile-defined entities. Stable ordering and numeric formatting ensure reproducible bytes.

**Verification oracle.** Reimport each exported dialect and compare area, perimeter, feature positions and metadata within explicit tolerance.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 07. Grading rule schema

**Engineering design (P).** Define baseSize, sizeOrder, pointRules keyed by stable point UUID, and optional edge interpolation rules. Store deltas in cm from the base size, with axis convention and origin. For size s, P_s=P_base+Δ_s(P). Track inherited versus overridden rules.

**Verification oracle.** Check every target size against approved sample points, rule discontinuities and symmetry exceptions.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 08. Graded rule file interoperability

**Engineering design (P).** Treat vendor RUL files as a separately versioned adapter with profile-specific syntax; do not infer compatibility from extension alone. Preserve raw rule IDs and original text. Provide a rule preview and mismatch report for points that lack correspondences.

**Verification oracle.** Fixture import/export across actual vendor formats; unknown rule codes must produce a blocking diagnostic for production release.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 09. Grading geometry continuity

**Engineering design (P).** For cubic Bézier segments, grade anchors and both handles with either per-control-point deltas or a local affine transform. Avoid grading only endpoints while leaving handles unchanged. Evaluate C0 joins and intended C1 tangent constraints after grade propagation.

**Verification oracle.** Measure curve Hausdorff distance and tangent discontinuity across size runs.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 10. Grading validation

**Engineering design (P).** Verify nested outlines per size, seam-length matching, notches, minimum curvature radius, grainline validity and size monotonicity only where applicable. Fit checks must be graded-size-specific, since global scaling distorts armholes and neckline.

**Verification oracle.** Report failing size and segment UUID with quantitative threshold and actionable correction.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 11. 1:1 PDF coordinate system

**Engineering design (P).** Convert cm to PDF points with x_pt=x_cm×72/2.54; place geometry in physical page coordinates, disable fit-to-page transforms, embed page boxes and metadata. Plot cut and stitch layers distinctly with 10 cm and 1 inch calibration squares.

**Verification oracle.** Inspect page MediaBox/CropBox and physically measure printed 100 mm calibration bars at printer actual-size setting.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 12. Tiled PDF assembly

**Engineering design (P).** For home printers, tile with configurable printable margins and overlap, registration crosses, tile row/column IDs, grain arrows and assembly map. Compute tile intersection in physical units; never rescale a contour independently per page.

**Verification oracle.** Reconstruct tiled outlines numerically and confirm seam lines align across tile overlaps.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 13. Large-format plotting

**Engineering design (P).** Support A0 and plotter roll media as independent page presets, orientation, roll width and page-length constraints. Mark scale 100%, print driver instructions, date, revision and source checksum.

**Verification oracle.** Run a plotter-specific calibration matrix at center and four corners to detect anisotropic driver scaling.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 14. Print acceptance protocol

**Engineering design (P).** Measure two orthogonal 100 mm rulers and one diagonal reference; compute sx=measuredX/100, sy=measuredY/100. Accept only against a manufacturer-agreed tolerance, and retain printer model, driver, media and settings.

**Verification oracle.** Archive signed print verification alongside factory release package.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 15. POM schema

**Engineering design (P).** Represent point-of-measurement IDs, definition text, source pattern landmarks, size, measured value, tolerance plus/minus, method, and illustration anchor. Distinguish garment-flat from body measurements and cut versus finished state.

**Verification oracle.** Test POM extraction against hand-measured control garments and flag missing landmark references.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 16. POM geometric derivation

**Engineering design (P).** Express POM as a chain of stable landmarks and geometry operators: straight distance, projected distance, contour arc length, or doubled half-body span. For a cubic, compute length by adaptive quadrature with bounded error.

**Verification oracle.** Numerical oracle compares high-resolution quadrature and hand-approved spec sheet measurements.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 17. POM tolerances

**Engineering design (P).** For target T and actual A, pass iff T−tolMinus ≤ A ≤ T+tolPlus. Carry units, precision, shrinkage allowance, and stage-specific tolerances explicitly. Do not round before acceptance comparison.

**Verification oracle.** Test boundary equalities and asymmetric tolerances; retain unrounded measurements for audit.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 18. Marker nesting data model

**Engineering design (P).** Marker includes fabric width, usable width, selvage margins, material/lot, size ratios, quantity, grain tolerance, nap direction, fold mode and placements {pieceId,size,x,y,angle,mirror}. Preserve instance identity for repeated pieces.

**Verification oracle.** Reject marker placements whose polygons exceed usable width or violate material constraints.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 19. Marker optimization

**Engineering design (P).** Generate collision-free candidate placements using no-fit polygons or robust polygon intersection; optimize utilization U=total piece area/(usable width×marker length). Run deterministic baseline shelf packing then local search with bounded time.

**Verification oracle.** Compare packing density against fixed benchmark garments while proving zero overlaps.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 20. Marker manufacturing constraints

**Engineering design (P).** Constrain directional prints, plaid matching, stripe repeat, face orientation, pair symmetry, grain angle, buffer spacing, notch accessibility and fabric defects. Encode hard constraints separately from soft cost objectives.

**Verification oracle.** Test each hard constraint by injecting a deliberately invalid placement.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 21. BOM derivation

**Engineering design (P).** Build a normalized material/component table keyed by materialId and operationId, including consumption per garment, waste, size, color, supplier, unit, currency and revision. Marker length per size contributes shell fabric consumption.

**Verification oracle.** Reconcile sum of per-size consumption against cutting order and purchase quantity.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 22. Techpack release snapshot

**Engineering design (P).** Generate immutable release packages with design revision, approved pattern hashes, grading tables, POM chart, BOM, sewing operations, marker, labeled PDF/DXF and approval history. Render human-readable documents from the same snapshot.

**Verification oracle.** Verify every exported artifact references identical release ID and canonical revision hash.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 23. Sewing graph schema

**Engineering design (P).** Define sewing edges by stable segment IDs and normalized parametric ranges, seam type, allowance, notch matching, stitch direction and side orientation. Allow one-to-many seam correspondence when gathering or easing.

**Verification oracle.** Check seam endpoint coverage, reversed orientation and impossible seam matches.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 24. 2D to 3D prepositioning

**Engineering design (P).** Place panel surfaces near the avatar via authored placement transforms and anchor landmarks. Map 2D UV to 3D mesh coordinates with persistent barycentric correspondence; mark correspondence invalid after topology edits.

**Verification oracle.** Regression-test center-front, shoulder and armhole landmarks before simulation.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 25. 2D to 3D sewing bridge

**Engineering design (P).** Compile sewing graph into particle/edge constraints with provenance to source segments. Rebuild only affected seam constraints on edit, and display pre-simulation colored seam correspondence in the 3D viewer.

**Verification oracle.** Test sewing pair selection after point insertion, deletion and splitting an edge.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 26. Serialization migrations

**Engineering design (P).** Use schemaVersion, revision, UUID-based references, unit declaration and explicit migration functions. Retain original file as a recoverable import artifact; migrations must be idempotent and deterministic.

**Verification oracle.** Load fixtures from each supported version and compare normalized canonical hashes.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 27. Transactional editing

**Engineering design (P).** Treat add/delete point, split curve, grade change and seam reassignment as atomic commands with inverse operations. Validate proposed graph before commit, increment revision once, and invalidate dependent caches by stable IDs.

**Verification oracle.** Undo/redo a 100-command random sequence and assert exact canonical document equality.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 28. Rust API boundaries

**Engineering design (P).** Expose parse, validate, import, export, grade, nest, measure and release as typed request/response APIs with error codes, diagnostics and cancellation. Separate pure computation from file I/O and UI mutation.

**Verification oracle.** Run API contract tests on malformed JSON, empty garments, huge files and cancellation.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 29. Rust and JS parity

**Engineering design (P).** Create canonical JSON fixtures shared between Rust and JavaScript. Compare geometry outputs with numeric tolerances and semantic IDs exactly; label expected differences and deprecate duplicate implementations only after parity.

**Verification oracle.** CI matrix tests native and web builds with identical fixture revisions.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 30. Numerical robustness

**Engineering design (P).** Adopt scale-aware epsilon for point proximity, robust orientation predicates for polygon topology, finite-value checks and explicit units. Avoid globally rounding control points because it can collapse narrow notches.

**Verification oracle.** Fuzz near-collinear edges, microscopic seams and kilometer-scale coordinates.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 31. Performance architecture

**Engineering design (P).** Cache tessellation per segment UUID plus revision and tolerance; update only dirty pieces, seam relationships and affected graded sizes. Move DXF parsing, nesting and PDF generation to workers or native threads with cancellation.

**Verification oracle.** Benchmark 10, 100 and 1000 pieces, peak RSS, UI latency and export throughput.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 32. CI manufacturing gate

**Engineering design (P).** Gate releases on schema validity, closed cut contours, no self-intersections, seam pairing, graded-size checks, POM coverage, marker overlap and scale-calibrated PDF output. Publish machine-readable diagnostics with stable codes.

**Verification oracle.** Fail the pipeline on a seeded broken pattern and pass a known approved factory fixture.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 33. Factory feedback loop

**Engineering design (P).** Capture manufacturer corrections as structured issue records tied to piece, segment, size and release revision. Require reviewed change requests and trace which artifacts need regeneration.

**Verification oracle.** Simulate a revised notch and verify marker, DXF, PDF and techpack revisions update together.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 34. Security and resilience

**Engineering design (P).** Limit DXF/PDF file size, entity counts, nesting runtime and decompression; sanitize filenames and annotations. Use temporary atomic writes and checksums for export bundles.

**Verification oracle.** Fuzz malicious group codes, pathological curves and interrupted writes without crashing.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## 35. Acceptance stages

**Engineering design (P).** Stage 1: stable geometry and DXF generic; Stage 2: semantic ASTM/AAMA fixtures; Stage 3: grading and rule adapters; Stage 4: POM and PDF physical calibration; Stage 5: nesting and BOM; Stage 6: techpack and 3D provenance. Each stage has factory-reviewed goldens.

**Verification oracle.** Release each stage only when its golden fixtures and quantitative QA gates pass.

**Implementation contract.** Input must carry `schemaVersion`, `documentRevision`, stable piece/feature IDs and explicit units. Output must include `ok`, typed `diagnostics[]`, source IDs, deterministic ordering and a content hash. Failure must preserve the last valid saved garment. For this subsystem, add a minimal known-good fixture, one intentionally malformed fixture and an independent numerical or semantic oracle. Expose diagnostics in the native editor with direct selection of the offending piece and feature.

**Failure analysis.** Detect missing metadata, nonfinite values, stale references, unsupported vendor variants, partial imports and mismatched units before releasing manufacturing output. Distinguish recoverable warning from hard release error. Maintain an explicit unsupported-feature count and never substitute fabricated geometry to make an export succeed.

## Worked canonical record and API proposal

```json
{"schemaVersion":2,"units":"cm","documentRevision":17,"pieces":[{"id":"piece-front","boundary":{"closed":true,"segments":[{"id":"edge-1","type":"cubic","p0":[0,0],"c1":[2,0],"c2":[4,1],"p1":[5,2]}]},"grain":{"origin":[2,3],"direction":[0,1]},"cutQuantity":1}],"grading":{"baseSize":"M","sizeOrder":["S","M","L"],"pointRules":{}},"seams":[],"measurements":[]}
```

```rust
pub struct ManufacturingDiagnostic { pub code: String, pub severity: Severity, pub piece_id: Option<String>, pub feature_id: Option<String>, pub detail: String }
pub struct ExportRequest { pub revision: u64, pub dialect: DxfDialect, pub size: String, pub units: Units }
pub struct ExportResult { pub bytes: Vec<u8>, pub sha256: String, pub diagnostics: Vec<ManufacturingDiagnostic> }
// Reject stale revisions before generating factory files.
```

## Release decision record

The current repo contains meaningful building blocks but no observed evidence here of end-to-end factory signoff. Priority is supplier-authenticated ASTM/AAMA fixtures, canonical feature IDs, physical PDF calibration, and immutable release revision propagation. Mark each fixture with its rights, origin, expected semantics, tolerated deviations and approval owner. Each numerical tolerance is a factory decision and must be stored in configuration, never embedded as an unexplained universal constant.

# EXO apparel product gap inventory | 86 candidate tools and features

**Research date:** 17 October 2026. This is an evidence-informed development inventory, **not** a claim that every competitor lacks each feature. `DOC` means a strong existing competitor capability worth matching; `PAIN` means firsthand practitioner reports show a workflow pain, with unknown prevalence; `PROP` means a proposed EXO integration or novel verification tool. Priority is EXO product judgment: `P0` foundational, `P1` near-term, `P2` later/segment-dependent. References are defined in `SOURCE_REGISTER.md` and the two specialist evidence reports.

## A. Precision 2D drafting and blocks (1–8)

| # | Priority | Classification | Feature / missing tool opportunity |
|---|---|---|---|
| 1 | P0 | DOC | Type-in millimetre coordinates for anchors, curve handles, points and edge lengths, with exact readback. |
| 2 | P0 | DOC | Robust construction geometry: tangent, perpendicular, parallel, fillet, dart transfer, true curves and intersection. |
| 3 | P0 | PROP | Immutable named contour/edge identities after editing, with reconciliation when splitting/merging geometry. |
| 4 | P1 | DOC | Parametric measurement-and-formula graph for blocks; cycle detection and change trace. |
| 5 | P1 | DOC | Curated editable body blocks with measurement assumptions and versioned sample approval. |
| 6 | P1 | PAIN | Extensive helper and annotation layers, precise dimension/measurement display and uncluttered large patterns. [S41] |
| 7 | P1 | PROP | Derived block variants with tracked differences and inherited constraints. |
| 8 | P2 | DOC | Digitize photos/scans/paper patterns with reference calibration, distortion warning and point tracing. |

## B. Production grading and sizing (9–18)

| 9 | P0 | DOC | Per-point XY size-rule tables, including cumulative and both incremental grading modes. [S01] |
| 10 | P0 | DOC | Versioned reusable grade-rule libraries and coverage/undefined-rule warnings. |
| 11 | P0 | DOC | Complete graded nest overlay with numerical rule inspectors and locked base size. |
| 12 | P0 | PROP | Per-size seam-match, armhole/sleeve ease, notches and contour validity check. |
| 13 | P0 | PROP | Constraint solver for angle preservation, parallel offset, intersect, symmetry and matching lines. |
| 14 | P1 | DOC | Formula-based alternative to point grading for individual-measurement regeneration. [S09-S10] |
| 15 | P1 | PROP | Graded POM and sewing-graph discrepancy diagnostics, with conditionally acceptable ease. |
| 16 | P1 | PAIN | Reuse a validated size run across garments, reduce repetitive point edits and import/export grade-rule complexity. [S19] |
| 17 | P1 | PROP | Nonstandard fit families, tall/petite, adaptive, size-break and shape variant support. [S30] |
| 18 | P2 | PROP | Fit-population and anthropometric dataset attribution with uncertainty and consent controls. [S29] |

## C. Sew, cut line, notches, allowances (19–28)

| 19 | P0 | PROP | Distinct stitch and cutter contours per size with geometrically joined allowance corners. |
| 20 | P0 | PROP | Notch identity/types anchored in seam arclength and propagated to cut contour/grade sizes. |
| 21 | P0 | PROP | Robust seam allowance treatment around holes, darts, hems, folds, intersections and acute corners. [S26] |
| 22 | P0 | DOC | Walk-seam inspector that checks orientation, mismatched length and ease distributions. |
| 23 | P1 | DOC | Pattern-specific drills, grain, folds, buttonholes, pleat and assembly-line notation. |
| 24 | P1 | PROP | Multi-piece construction dependency graph with seam operation semantics. |
| 25 | P1 | PROP | Structural and decorative topstitch paths with thread, spacing, seam offsets and construction labels. |
| 26 | P1 | PROP | Cuttable allowance layer QA and actual cutter import proof for custom allowances. [S15] |
| 27 | P2 | DOC | Sewing operation library linked to ISO stitch/seam code taxonomies. [S27-S28] |
| 28 | P2 | PROP | Sewing-order graph with factory machine requirements and construction rule conflicts. |

## D. Interoperability and markers (29–38)

| 29 | P0 | DOC | ASTM/AAMA DXF export/import with consistent units, named edges, sizes and grade tables. [S12-S14] |
| 30 | P0 | PROP | Automatic independent round-trip test with warnings for lost shapes/layers/rules/notches. |
| 31 | P0 | PROP | Transparent stitch/cut/layer mapping and format loss report per destination profile. |
| 32 | P1 | DOC | True-scale multi-size PDF/SVG/plotter proof with reference scale calibration. [S07] |
| 33 | P1 | DOC | Marker inventory, size ratios, fabric groups, quantity and order link. |
| 34 | P1 | PROP | Valid constrained nesting for grain, nap, fold, stripe and usable width. [S04] |
| 35 | P1 | PROP | Fabric-width and production size-mix sensitivity analyzer for yield/cost. |
| 36 | P2 | DOC | Automatic nesting with pinned pieces, material defect map and reproducible reports. |
| 37 | P2 | DOC | Cutter-specific PLT/HPGL/proprietary profile import/export when legitimately supported. |
| 38 | P2 | PROP | Marker-to-actual cut yield/defect variance dashboard. |

## E. Fabric, avatars and virtual fit (39–46)

| 39 | P1 | DOC | Physically measured fabric parameters with calibration/provenance, independent of appearance. [S16] |
| 40 | P1 | PAIN | Reality-check fit between avatar and physical sample; record divergence and cause. [S17-S18] |
| 41 | P1 | PROP | Digital-vs-physical sample comparison with pinned POM photos and standardized camera views. |
| 42 | P1 | PROP | Virtual fit confidence level by avatar, fabric lot and garment category. |
| 43 | P1 | DOC | Fabric library filter by mass, shear, bend, stretch, thickness, supplier and tested date. |
| 44 | P1 | PROP | Material substitution impact analysis on markers, seams, simulation and BOM. |
| 45 | P2 | DOC | Imported 3D scans and avatar landmark calibration with shape/proportion checks. |
| 46 | P2 | PROP | Fit population matrix across body shape/posture variants, with explicit validation limits. |

## F. Simulation QA and 3D construction (47–53)

| 47 | P1 | PROP | Collision overlay showing pair, penetration depth, normal, contact category and 2D source. |
| 48 | P1 | DOC | Fabric/solver/geometry performance profiler and honest preview/fit/presentation quality presets. |
| 49 | P1 | PROP | Reproducible garment simulation fixture, benchmark and residual/report history. |
| 50 | P1 | PROP | Structural trim-to-panel anchor and mass/collision support, clearly distinguished from visual trim. |
| 51 | P2 | DOC | Fabric surface stack, padding/trapunto, lining, interfacing and puffy appearance models. |
| 52 | P2 | PROP | Automated discrepancy explanation when solver result violates planned garment dimensions. |
| 53 | P2 | DOC | Motion and pose simulation review with layer/penetration exception snapshots. |

## G. Tech packs, measurements and product releases (54–63)

| 54 | P0 | PROP | Canonical linked POM with method diagram, finished garment vs body vs pattern distinction. |
| 55 | P0 | PROP | Explicit approval states for proposed, calculated, sampled, approved and factory-confirmed measurements. |
| 56 | P1 | DOC | Editable technical flats, style/colorway artwork, BOM, construction and full-size patterns. [S06] |
| 57 | P1 | PAIN | Contradictory document detector: artwork, measurement, sample note, BOM or spec disagree. [S20] |
| 58 | P1 | PAIN | Factory revision comparison with changes tied to one immutable released package. [S20-S23] |
| 59 | P1 | PROP | Change impact graph and required reapproval for geometry, grades, material and packaging. |
| 60 | P1 | DOC | Versioned technical BOM, supplier alternatives, size/color variants and unit quantities. |
| 61 | P1 | PROP | Sample-to-release closure: every requested fit change resolved with evidence/decision. |
| 62 | P2 | DOC | Supplier comment/annotation portals and translated factory-friendly PDFs/spreadsheets. |
| 63 | P2 | PROP | Factory capability checks and required construction machine metadata. [S22] |

## H. Costs, sourcing, factory execution and quality (64–74)

| 64 | P1 | PROP | Estimated vs quoted vs actual fabric yield/cost, with every assumption visible. |
| 65 | P1 | PROP | Geometry-driven BOM fabric consumption and trim dependency updates. |
| 66 | P1 | DOC | Fit/proto/size-set/PP/TOP sample rounds and approval ledger. |
| 67 | P2 | DOC | Supplier RFQ comparison by terms, quantities, currencies, FOB/EXW/incoterms and dates. |
| 68 | P2 | PAIN | MOQ/cash-flow impact and capability mismatch warnings before a factory is selected. |
| 69 | P2 | DOC | Fabric lot, cut batch and sewing/bundle traceability across production orders. |
| 70 | P2 | DOC | Inline/final QC defects, measured tolerance and signed supplier disposition. |
| 71 | P2 | PROP | Standard-backed acceptance sampling planner with validated ISO 2859-1 option. [S33] |
| 72 | P2 | PROP | CAPA/root-cause link from defect through construction operation/material lot. |
| 73 | P2 | DOC | Shop-floor event capture, scanned bundle records and ERP/MES connector. |
| 74 | P2 | PROP | Material provenance and product-passport field schema with rule effective date. [S34-S36] |

## I. AI, recovery, visualization and teaching (75–86)

| 75 | P0 | PROP | Scoped typed AI commands with preconditions, entity constraints and readback. [S37] |
| 76 | P0 | PROP | Save, reopen, geometry checksum and inverse/undo verification after AI actions. |
| 77 | P1 | PROP | AI-generated edit proposals with expected vs observed measurements and failure explanations. |
| 78 | P1 | PROP | Reusable verified skills/recipes, fixture inputs and logged output. |
| 79 | P1 | DOC | Crash-resistant autosave, backed-up checkpoints and damaged-file repair audit. |
| 80 | P1 | PROP | Construction-locked AI editorial visualization with mesh/manifest identity. [S38] |
| 81 | P1 | DOC | Blender/Unreal export profiles for scales, UVs, mesh roles and material mapping. [S39-S40] |
| 82 | P1 | PROP | Automated destination-app import validation and version capability notes. |
| 83 | P1 | PAIN | Contextual training that demonstrates control effects and factory meaning, not only tooltips. [S41] |
| 84 | P2 | PROP | Fit-prediction AI that labels limitations by training/calibration coverage. |
| 85 | P2 | PROP | Factory-facing question assistant that detects unanswered decisions but never invents specs. |
| 86 | P2 | PROP | Color/style analytics linked to sampled return reasons, with privacy/quality controls. |

## Practical reading of the inventory

The **P0 candidates are the first engineering benchmark** because downstream production tools depend on their geometry and version integrity. `DOC` features should be evaluated against current competitors before implementation; `PAIN` items need reproduction or interviews; `PROP` items are design hypotheses. Do not announce any row as already implemented in EXO unless an independent source code audit and integration test confirm it. For fuller competitor evidence and regulatory caveats see the two specialist source chapters and `SOURCE_REGISTER.md`.

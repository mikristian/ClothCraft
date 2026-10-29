# EXO 2D manufacturing parity gaps — source audit, 18 October 2026

**Scope:** Native EXO ClothCraft V2 2D drafting, Rust session commands, adjacent JavaScript production modules, and their relationship to CLO / Marvelous Designer workflows. **Method:** source inspection and official reference reading, without new live GUI interaction. **Status notation:** **I** implemented in inspected code; **P** partial / constrained; **M** missing from inspected native path; **U** unverified end to end. Evidence **V** directly visible in source or official documentation; **D** deduced from source with stated assumptions; **U** cannot establish by inspection. These are engineering statuses, not factory acceptance decisions.

## 01. The boundary between editors [V]
The relevant native 2D editor is `src/components/ClothCraftBoardV2.jsx`, controlled by `src/components/ClothCraftWorkspace.jsx`, with its command bridge in `integrations/clothcraft/exo-session.rs`. Separate classic application modules include `src/core/grading.js`, `src/core/marker.js`, `src/core/productionCost.js`, and `src/core/digitalTechPack.js`. Presence of functionality in the separate JavaScript system does **not** prove that it is wired to the native editor. The native Production panel explicitly links to the full EXO production workspace, and calls native SVG a reference (Workspace lines 1539–1540). **Priority P0:** identify one canonical project schema and controlled conversion between native patterns and production packs.

## 02. Native panel geometry [I/V]
`ClothCraftBoardV2.jsx:1262–1378` renders panel polygons, material coordinates, selected segments, and edit handles. `ClothCraftBoardV2.jsx:392–450` configures edit modes and layer visibility. **Acceptance:** all edits operate on real authored polygon points, preserving stable point and edge identity after modification and undo. **Test:** polygon with convex and concave corners, tiny edges, and curved segments; confirm topology and persisted state.

## 03. Anchor and point selection [P/V]
`ClothCraftBoardV2.jsx:18–20, 777–919` separates vertex/curve visuals and pointer gestures; `research/clo-2d-analysis/exo2d-geometry-deep-audit-20261018.md` identifies remaining native point editing constraints. **Priority P1:** establish deterministic anchor selection, multi-select, constrained drag, insertion and delete semantics with stable, indexed references. Test hover, selection, shift selection, boundary move, multi-point drag, undo, reload.

## 04. Cubic curve handles [P/V]
`ClothCraftBoardV2.jsx:11, 832–907` invokes `editPatternBezierHandle`; distinct handle and anchor drags exist. **Gap:** no proof all native edge operations preserve curve continuity, arc distance, sewing range, notch position and offset integrity. **Test:** G0/G1-continuous and deliberately sharp curves, mirrored curve changes, undo/redo, save/reload.

## 05. Internal lines and tangents [I/V]
`ClothCraftBoardV2.jsx:87–129, 542–585, 919–948` draws and edits native internal lines and prohibits crossing outside a pattern. Rust command mapping at `exo-session.rs:34` accepts internal points and tangents. **Gap P:** sewing/pleat/fold relationships may depend on stable curve topology. Test concave containment along entire segment, not endpoints alone.

## 06. New polygon drawing [I/V]
`ClothCraftBoardV2.jsx:1071–1103, 1183–1203` implements pen/pencil construction, freehand fitting and tangents; tool mapping is at lines 450–451. **Gap P:** factory-use cutlines need a constrained, unit-aware closure and self-intersection policy. Test close-within-threshold, duplicate vertices, crossing, near-zero segments and reversed winding.

## 07. Split edge and point insertion [P/V]
Source audit `exo2d-geometry-deep-audit-20261018.md` documents lack of full sewing-aware native split and approximated arclength in certain pathways. **Priority P0:** split must atomically migrate seam segments, notches, allowances, lengths, internal references and undo identities. Test split at endpoint, curve midpoint and successive splits with sewing attached.

## 08. Point deletion and index migration [P/V]
The prior geometry audit finds deletion constraints in native geometry and stale indexed references in the separate JS editor. This is **not** evidence the native editor corrupts identical references. **Priority P0:** define graph-preserving deletion and explicit rejection of unsafe changes; surface useful user feedback. Test zipper, binding, topstitch, annotations and all attached sew ranges where supported.

## 09. Native seam editing [P/V]
`ClothCraftBoardV2.jsx:450, 468–518` exposes sew and seam-edit interactions; `src/core/sewingConstruction.js:24–65` separately validates sewing overlaps. **Gap:** native-to-classic validation parity, edge remapping, and topology-wide sewing constraints remain U. **Test:** same-edge, opposite-facing, overlapped, crossing and partial-length sewing with edit, split and undo.

## 10. Free sewing point validity [P/V]
`ClothCraftBoardV2.jsx:1352–1378` projects free-sew points onto boundary geometry. Prior audit flags danger of invalid sampled point filtering creating a fabricated bridge. **Priority P0:** reject invalid vertex sequences, report affected edge, prohibit sewing/export until valid. Test NaN, missing, repeated and out-of-range indices.

## 11. Notch authoring [I/V]
`ClothCraftBoardV2.jsx:1003–1042` places notches by fraction of physical edge arclength, supporting grouped notches with physical spacing. Native Rust command mapping `exo-session.rs:22–23` supports creation/removal. **Gap P:** count, style, inside/outside direction, cut depth, grading propagation and exchange representation must be verified. Test notches on cubic curves and near corners through split, resize, export.

## 12. Reference-only notches [I/V]
`ClothCraftBoardV2.jsx:257–284` draws reference notch ticks only when no authored native notch exists. These are visual references and must never be included as manufactured notch entities. **Priority P1:** color/code non-production guides separately in visual export and deliver manufacturing export only from native authoritative annotations.

## 13. Per-edge seam allowances [I/V]
`ClothCraftBoardV2.jsx:228–250, 1003–1060` exposes seam allowance editing and guide strokes; Rust mapping at `exo-session.rs:24` handles explicit widths. **Gap P:** corner joining and clipping, per-edge transitions, inner/outer offsets, fold/hem special rules, seam-line vs cut-line integrity. **Test:** right angle, acute angle, concave notch, offset self-intersection, variable allowances and 0 mm.

## 14. Cutline offset kernel [U/D]
The board can draw allowances, but this audit has not established a production-validated cutline offset engine that exports closed, correctly joined offset polygons. **Priority P0:** build a deterministic robust curve-offset computation with seam allowance attributes, miter/round/bevel joins and signed area checks. Compare physical samples against a CAD reference at 1:1.

## 15. Grain direction and fabric axis [P/V]
`src/core/marker.js:41–44` accounts for `grainAngleDeg` in classic marker rotations. The inspected native board and production panel do not establish synchronized grainline manufacturing annotations. **Priority P0:** native panel grainline vector, grain tolerance, cross-grain permit, fold alignment and export serialization. Test rotated/asymmetric pieces and marker placement.

## 16. Fold lines, drill holes and placement marks [U]
Native internal lines exist, but no confirmed end-to-end separate semantic export contract for fold, drill, button placement, placement print and dart endpoint exists in inspected native source. **Priority P1:** typed annotation model with positions in material units, legend and format mapping. Distinguish construction markings from simulation-only guides.

## 17. Pleats and variable fold [P/V]
`ClothCraftBoardV2.jsx:1154–1157` routes a pleat-target selection; deeper property and simulation parity remains unverified. Marvelous Designer 2026.1 supports different fold angles at internal-line ends: [official variable fold angle](https://support.marvelousdesigner.com/hc/en-us/articles/59783425428121-Internal-Line-Variable-Fold-Angle). **Priority P2:** add typed start/end fold properties and symmetric-link semantics only after authored internal-line persistence passes.

## 18. Darts and slash-spread editing [U]
There is no verified native end-to-end dart intake-to-closure operation in the inspected board and Rust command excerpts. **Priority P1:** specify pivot, legs, intake, apex, seam compensation and regenerated sew edges; run line walk/measurement tests before and after.

## 19. Symmetry and linked editing [P/U]
Native mode controls include independent geometry edits; preservation of linked symmetry during every split, notch, allowance and internal-line operation remains U. Marvelous 2026.1 explicitly improves symmetric half-pattern topology synchronization ([release page](https://www.marvelousdesigner.com/products/release)). **Priority P1:** shared mirror transform and operation propagation with explicit unlink action; test identifiers and winding.

## 20. Measurement tape [P/V]
`ClothCraftBoardV2.jsx:1068–1075, 1179–1180` manipulates tape endpoints; the prior geometry audit identifies a distinction between visual tape and durable bound POM. **Priority P0:** store measurements as references to stable anchors, edges, curves and construction landmarks, with recalculation after edit, sizing and conversion.

## 21. Seam walking / truing [P/V]
`ClothCraftWorkspace.jsx:105` holds seam walking state, but integration quality cannot be verified from state alone. **Priority P1:** use accurate curve arclength, seam matching, ease/distribution, notch-pair alignment and discrepancy report before export. Tests include opposing curves with equal endpoint distances but differing arclength.

## 22. Grading in native Rust [P/V]
`ClothCraftWorkspace.jsx:1408–1461` exposes grade panel and native `grade-pattern` request. The UI explicitly says it **applies to one straight-outline pattern; curves, holes and internal lines unsupported** (line 1447). Rust `exo-session.rs:227–232` routes grade-pattern and checks editable polygons. **Priority P0:** support multisize authored rules over stable pattern anchors, curved edges, holes, darts, notches, internal lines, sewing and aliases. Preserve base sizes immutably and verify each derived size.

## 23. Grading in classic JS [I/V]
`src/core/grading.js:5–13, 83–121, 198–200` supplies separate size-offset, piece and size-run utilities. The code's presence does not certify native pattern round-trip. **Priority P0:** map graded native pattern primitives to consistent size-run schema; test S–XXL perimeter, marker, measurement and import/export equivalence.

## 24. Grading rule files and size groups [M/U]
Native Production panel exposes JSON, OBJ and reference SVG at `ClothCraftWorkspace.jsx:1539`, without an identified direct AAMA/ASTM grading rule-file export. CLO DXF export supports size group selection and grading information embedded or separate as rule file: [official CLO DXF import/export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export). **Priority P0:** explicit grade table, rule files and group identifiers in interoperability tests.

## 25. DXF-AAMA / ASTM interchange [M/V]
Native Production code `ClothCraftWorkspace.jsx:1132–1133, 1539` exposes OBJ, SVG reference and project JSON; it says the SVG is not scale-verified factory DXF. No native DXF-AAMA or DXF-ASTM export is established here. Classic EXO elsewhere may have features; do not attribute them to native. **Priority P0:** independent importer/exporter conforming to documented entity/layer/size conventions, with third-party CAD round trip, contours, curves, grain, notches, allowances and grades. Cross-check [CLO DXF support](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export).

## 26. DXF import precision [U]
CLO describes automatic recognition of DXF seam allowance as locked custom allowance and optional removal of nongrading points for AAMA. EXO native import of such attributes is unverified. **Priority P0:** reject ambiguous units, preserve precise curves, grading anchors and allowance lock metadata; never silently convert arcs to coarse polygons. Fixtures from at least two CAD vendors, compare edge and notch coordinates within explicitly chosen millimeter tolerances.

## 27. PDF scale print and tiling [M/V]
The native production UI lacks a verified full-scale tiled PDF pattern path (`ClothCraftWorkspace.jsx:1539`). Marvelous 2D Snapshot offers 1:1 output and media presets: [official 2D Snapshot](https://support.marvelousdesigner.com/hc/en-us/articles/47358119414937-2D-Snapshot-2025-0). **Priority P0:** separate print-calibrated PDF generator with physical units, 100 mm calibration square, page overlap registration, portrait/landscape, size labels, cutline/seamline distinction and print-at-actual-size instructions.

## 28. PDF printer tolerance criteria [D]
Acceptance proposal (engineering targets, not official garment standard): 100.00 mm calibration line within ±0.5 mm on validated printers; geometry file within ±0.25 mm at authored reference marks; long panel lengths checked over 500 mm; scale factors mathematically exact before printer effects. Record specific printer/paper settings and clearly distinguish source precision from printer distortion. **Priority P0:** compare measured printed calibration pages, do not infer from screen SVG.

## 29. Marker nesting [P/V]
`src/core/marker.js:120–197` offers classic marker building and fabric width/gap control; `src/core/productionCost.js:12–42` estimates fabric quantities. No proven authoritative native-to-marker pipeline. **Priority P1:** size, fabric, quantity, nap, directional print, grain tolerance, fold, repeat/stripe matching and defect exclusions; verify all pattern pieces with correct cut quantities and pairing.

## 30. Bill of materials and factory handoff [P/V]
`src/core/digitalTechPack.js:10–13, 69–89` supports draft source, material BOM, graded POM, sewing/construction, trims, labels, packaging, photos, revision and print-friendly HTML. The footer explicitly says **Not factory certified**. **Priority P0:** make native pattern entities and measurement releases feed BOM quantity, supplier unit, colorway and cut piece counts; revisions must pin the exact source geometry and grades. Manual draft placeholders must be obvious and block a misleading production-ready badge.

## 31. Technical specifications and sample tolerance [P/V]
`digitalTechPack.js:74–76` maps POM columns and per-item tolerance; `digitalTechPack.js:89` includes factory sections and sample feedback. **Gap:** validation that every size has all required POM and signoff against physical samples. **Priority P0:** required POM matrix per garment class, variance by size, measurement method diagram, tolerance policy, auditor name/date and immutable revision release.

## 32. Construction specification linkage [P/D]
`src/core/digitalTechPack.js:89` prints construction operations, stitches and source instructions; `src/core/sewingConstruction.js:24–65` performs separate seam diagnostics. **Priority P1:** resolve every factory seam operation to stable CAD edges and keep stitch type, SPI, seam allowance, operation order, binding/tape or zipper metadata under pattern edits.

## 33. Revision and collaboration provenance [I/U]
`digitalTechPack.js:21–37` supports revisions, comments, samples and diffs. Whether manufacturer access restrictions, source signatures, approvals, and audit logs are honored in deployed native collaboration requires separate authentication audit. **Priority P1:** pin exported DXF/PDF/BOM manifest to one approved revision hash and explicit approver.

## 34. Marvelous Designer 2026.1 deltas [V]
The official [2026.1 release page](https://www.marvelousdesigner.com/products/release) lists customizable toolbars, variable fold angle, half-symmetry topology sync, zipper positioning and end extension, time-based autosave, lock graphics, seamline ripping, brush pinching and simulation override. The 2D-adjacent priorities are (a) fold-end properties (P2), (b) symmetry change propagation (P1), (c) zip endpoint/boundary geometry (P1), (d) toolbar discovery and persistence (P2), (e) authored torn seams as simulation effects only unless a manufacturing tear operation is explicitly documented (P3). [Official seamline ripping documentation](https://support.marvelousdesigner.com/hc/en-us/articles/59816167297433-Seamline-Rip) states a sewing-line selection may occur on a 2D or 3D pattern.

## 35. Earlier 2026.0 features relevant to parity [V]
The official [Marvelous 2026.0 change list](https://support.marvelousdesigner.com/hc/en-us/articles/55837641308313-Marvelous-Designer-2026-0-New-Feature-List) includes pattern archive, drafter edit mode, 2D fit map display, smooth-curve point selection, optimization of flattened points, unlink internal-line symmetry and improved numeric input. These are candidate product parity items; inclusion in release notes is not evidence of existing EXO behavior.

## 36. Acceptance gates and highest-priority sequence [D]
**P0 order:** 1. canonical native pattern/grade schema and revision identity; 2. geometry integrity after insertion, split and delete; 3. true cutline offset + seam allowance and notch production semantics; 4. persistent POM and native multisize grading; 5. DXF AAMA/ASTM roundtrip; 6. print-scale PDF and calibration; 7. BOM/tech pack synchronization and export manifest. Every gate needs fixtures, assertions, saved-project reload, and external CAD/printed-sample inspection.

**P1 order:** native grainlines, drill/fold/dart semantics, seam walking, marker constraints, symmetry, zipper references and operational construction links. **P2:** fold gradients, full user-configurable toolbar, graphic lock and surface presentation refinements. **P3:** simulation-only seam ripping and artistic distortions.

## 37. Minimal regression fixture matrix [D]
Build fixtures for (a) rectangular woven panel with varying allowances; (b) T-shirt neckline with cubic curves and sleeve balance notch; (c) trouser dart and fold line; (d) asymmetric zipper piece with diagonal edge; (e) mirrored halves with intentionally asymmetric edit; (f) graded 5-size family with notches and sew pairs; (g) concave shape with an inner void; (h) malformed edge with missing index; (i) tiny sub-millimeter curve segment; (j) mixed cut quantities and directional fabric. For every fixture compare native source, reload, DXF out/in, PDF geometry, tech pack, and per-size marker dimensions.

## 38. Evidence boundaries and release decision [V/D/U]
**Verified:** source-level UI and command availability at citations above, official CLO DXF and Marvelous release documentation. **Deduced:** severity/ordering and desired numerical tests. **Unverified:** full production CAD conformance, print accuracy on physical printers, deployed manufacturer permissions, every native runtime gesture and 2026.1 behavior as installed locally. Treat a feature as **manufacturer ready** only after deterministic source validation, third-party CAD round-trip, approved production spec and physical cutting/sewing sample signoff.

### Source bibliography
- [CLO DXF import/export, AAMA/ASTM, size groups, rules, allowances](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export)
- [Marvelous Designer 2026.1 official release](https://www.marvelousdesigner.com/products/release)
- [Marvelous Designer 2026.1 variable internal-line fold angle](https://support.marvelousdesigner.com/hc/en-us/articles/59783425428121-Internal-Line-Variable-Fold-Angle)
- [Marvelous Designer 2026.1 seamline ripping](https://support.marvelousdesigner.com/hc/en-us/articles/59816167297433-Seamline-Rip)
- [Marvelous Designer 2D Window](https://support.marvelousdesigner.com/hc/en-us/articles/47358246789529-2D-Window)
- [Marvelous Designer 1:1 2D Snapshot](https://support.marvelousdesigner.com/hc/en-us/articles/47358119414937-2D-Snapshot-2025-0)
- [Marvelous Designer 2026.0 changes](https://support.marvelousdesigner.com/hc/en-us/articles/55837641308313-Marvelous-Designer-2026-0-New-Feature-List)
- Internal: `research/clo-2d-analysis/exo2d-geometry-deep-audit-20261018.md`, `research/clo-2d-analysis/CLO_2D_50_PAGE_DEEP_AUDIT_20261018.md`. Prior research is contextual evidence only; no fresh native CLO inspector interaction claimed.

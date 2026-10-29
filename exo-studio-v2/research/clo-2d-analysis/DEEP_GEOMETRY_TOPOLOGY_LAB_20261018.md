# EXO Native 2D Geometry and Topology Engineering Laboratory — 18 October 2026

**Scope:** Original technical investigation of native EXO 2D CAD geometry, topology, Bézier editing, trimming, offsetting, grading, sewing references, and Rust/WASM/C++ boundaries. This is an engineering design and falsifiable test program, **not** a claim that proposed algorithms have been implemented or manufacturing certified.

## Inspected code and evidence boundaries

- `rust/exo_geometry_kernel/src/lib.rs` (140 lines inspected): ABI 1, grid snapping, nearest point on straight segment, 2D/3D length and adaptive Simpson **quadratic** Bézier length; Rust tests cover those primitives. No cubic arrangement/DCEL functions are present in this module.
- `src/core/rustGeometryKernel.js` (76 lines inspected): asynchronous WASM loading with validated ABI 1 exports and synchronous JS fallbacks. It documents validated numeric upstream assumptions.
- `src/core/vectorPatternBezier.js` (91 lines inspected): cubic evaluation, de Casteljau split, 96-chord length approximation, preview anchor movement, tangent editing.
- `src/core/vectorcraftAnchorPort.js`: constrained handle port with upstream VectorCraft attribution; collinearity tolerance in classification.
- `src/core/draftingTopology.js`: sampled quadratic/legacy contour validation, fixed EPS collision tests and capped intersection list.
- `src/core/draftingPointDeletion.js`: deletion rejects adjacent notch/trim attachments and reindexes numeric edges; graph-wide persistent identity remains a design problem.
- `src/components/ClothCraftBoardV2.jsx`: edits send Shape mutations, previews cubic lengths and handles and draws sewing correspondence; not proof that every operation has a robust geometric backend.
- `integrations/clothcraft/exo-session.rs`: parses SplitBoundary command and implements grade operation based on bounding dimensions, with tests of named-edge preservation and degenerate-grade rejection.
- The full Rust garment polygon engine, native C++ mesh remesher, and installed CLO internals were **not exhaustively inspected** in this assignment. Scope conclusions refer to named modules only.

### Trustworthy external algorithms to evaluate

Shewchuk, *Robust Adaptive Floating-Point Geometric Predicates*, ACM 1996, https://doi.org/10.1145/237218.237337 and freely accessible https://people.eecs.berkeley.edu/~jrs/papers/robust-predicates.pdf . CGAL 2D Arrangement manual https://doc.cgal.org/latest/Arrangement_on_surface_2/index.html and Bézier traits https://cgal.github.io/9465/doc/Arrangement_on_surface_2/classCGAL_1_1Arr__Bezier__curve__traits__2.html . CGAL documents exact/filter-assisted Bézier arrangements but that is **not** evidence it has been integrated in EXO. Rust geometry candidates for independent prototype include https://github.com/linebender/kurbo , https://github.com/mfogel/polygon-clipping , https://github.com/geo-rust/geo , https://github.com/AngusJohnson/Clipper2 . These links are candidate projects, not compatibility or performance certifications.

## Explicit architectural recommendation

Adopt a canonical **typed, versioned topology graph** in Rust, preserving physical edge identity, with robust orientation/intersection predicates and a parameter-aware cubic curve layer. Keep board gestures visually immediate, then commit validated atomic graph operations. Treat generalized curve Boolean and offset operations as distinct acceptance gates. Quantify tolerance in metres and transfer sewing/notch references through each topology mutation. The existing ABI 1 stays compatible until structured ABI 2 is validated.


## Chapter 01. Geometry ownership and invariants

**Engineering model.** Canonical pattern representation must reside in material coordinates with an explicit unit tag, immutable UUIDs for contours, vertices and directed edges, and a revision counter. A render transform cannot be the source of measurement truth. Reject nonfinite coordinates, collapsed spans and dangling references before commit.

**Falsifiable test and expected oracle.** Schema oracle: serialize a rectangle, pan/zoom/rotate view, then compare canonical coordinates bytewise; expected identical. Hypothesis H01: decoupling render coordinates eliminates zoom-dependent seam errors.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 02. Coordinate scales and tolerances

**Engineering model.** Current native board renders panel-local metres, while legacy draftingTopology.js works with centimetre-shaped objects. Convert exactly once at an API boundary. Define geometric tolerance from bounding extent and specified fabrication tolerance; predicates need adaptive sign rather than an arbitrary fixed EPS. Store display rounding separately from computational precision.

**Falsifiable test and expected oracle.** Oracle: 100 mm edge entered as 10 cm yields 0.1 m internally; tolerance sweep 1e-12–1e-3 m must not flip positive area except near genuine degeneracy.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 03. Orientation predicates

**Engineering model.** A determinant `(bx-ax)*(cy-ay)-(by-ay)*(cx-ax)` is ill-conditioned for near-collinear data. Filter using an error bound; retry uncertain inputs with expansion arithmetic or an exact rational representation of binary64 inputs. Never infer a topological side from a fuzzy distance comparison.

**Falsifiable test and expected oracle.** Oracle: points (0,0),(1,1e-12),(2,2e-12+1e-20) produce a stable nonzero orientation when representable; translation by 1e5 is separately tested for representability.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 04. Segment intersection classification

**Engineering model.** Return tagged cases `Disjoint`, `ProperCross`, `EndpointTouch`, `CollinearOverlap`, `Degenerate`. Classify using orientation signs and robust interval overlap; intersection coordinates may be inexact while classification remains exact. An overlap must carry two parameter intervals, not a single midpoint.

**Falsifiable test and expected oracle.** Oracle: crossing diagonals touch at (0.5,0.5), parallel horizontal disjoint, shared end classified EndpointTouch, reversed identical edges CollinearOverlap.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 05. Bounding hierarchy

**Engineering model.** Index edge bounding boxes in an R-tree or spatial hash, inflated by controlled numeric and stroke tolerances. Refit changed edges incrementally after drag. Broadphase must produce a superset of exact narrowphase pairs; missing a near-tangent pair makes exported cuts unsafe.

**Falsifiable test and expected oracle.** Oracle: brute-force enumeration over seeded 10k random pairs has zero missed candidate overlaps; profile update cost versus full rebuild.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 06. Cubic evaluation

**Engineering model.** Represent cubic Bézier as P0,P1,P2,P3 and evaluate by de Casteljau near endpoints for numerical stability. Derivatives are quadratic and permit tangent, normal and curvature evaluation; do not infer arc length from control polygon lengths. Preserve control points in exact material coordinates.

**Falsifiable test and expected oracle.** Oracle: cubic with collinear equally spaced controls must interpolate a line and length match endpoint distance within prescribed quadrature error.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 07. Bezier splitting

**Engineering model.** de Casteljau at parameter t yields two exact cubic subcurves with continuous positions and original geometry preserved. Splitting a pattern edge requires atomic replacement of original edge by two persistent IDs plus a parent mapping `old:[0,t],[t,1]`; reparameterize all notches and sewing anchors.

**Falsifiable test and expected oracle.** Oracle: for 127 sample u values, original B(u) equals remapped left or right evaluation within 1e-12 m; seam anchor at t=0.75 maps to right at 0.5 when split t=0.5.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 08. Curve extrema

**Engineering model.** Cubic axis extrema occur at roots of derivative quadratics in (0,1). Include endpoint coordinates and every valid derivative root when constructing tight bounds. Convex hull bounds are safe but slower for broadphase; analytic extrema avoid unnecessarily large boxes.

**Falsifiable test and expected oracle.** Oracle: arch cubic from (0,0) to (1,0) with y controls 1,1 reaches y=0.75 at t=0.5; tight ymax must equal 0.75.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 09. Curve intersection isolation

**Engineering model.** Use bounding hull subdivision with parameter intervals, terminate only after validated isolation and residual bounds. Handle overlapping curves, multiple roots and tangential contacts as distinct outcomes. Curves may intersect up to nine times counting multiplicity for two generic cubics; do not rely on uniform sampling.

**Falsifiable test and expected oracle.** Oracle: identical curves produce overlap intervals; a line tangent to a parabola produces a single tangent contact, not zero or two intersections.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 10. Self-intersection of one cubic

**Engineering model.** The two parameter values for a loop must be distinct; partition the domain into nonadjacent intervals and solve B(t)=B(u). Exclude diagonal t=u and endpoint joins separately. A loop invalidates a cut contour unless explicitly intended as a trim construction.

**Falsifiable test and expected oracle.** Oracle: a deliberately looped cubic reports one self-crossing with t<u; monotonic convex cubic reports none.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 11. Quadratic compatibility

**Engineering model.** Rust kernel currently exposes adaptive-Simpson quadratic length; preserve this function for legacy consumers while adding native cubic length. Conversion of quadratic Q to cubic uses C1=P0+2/3(Q-P0), C2=P2+2/3(Q-P2); this is geometry-exact.

**Falsifiable test and expected oracle.** Oracle: quadratic and promoted cubic agree at 101 parameters to floating-point tolerance and arc lengths agree to the requested physical tolerance.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 12. Arc length and inverse length

**Engineering model.** Integrate |B'(t)| with adaptive Gauss–Kronrod or adaptive Simpson; return a bound or failure state when recursion limits are hit. Inverse length uses a monotonic bracketed solver, optionally Newton accelerated within bracket; never extrapolate parameter outside [0,1].

**Falsifiable test and expected oracle.** Oracle: half-length parameter returns measured length within 0.01 mm on a sleeve curve and is monotonic with target distance.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 13. Closest point on cubic

**Engineering model.** Minimize squared distance via roots of (B(t)-Q)·B'(t), a quintic polynomial; partition monotone intervals and solve roots with safeguarded numerical methods. Include endpoints and tied minima. Click selection and snapping should expose deterministic tie handling.

**Falsifiable test and expected oracle.** Oracle: Q above line segment projects to interior t=0.5, outside endpoint projects t=0 or 1, mirrored hairpin may return two equal minima.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 14. Curvature discontinuity

**Engineering model.** G0 ensures same position; G1 requires aligned tangents; C1 additionally requires matching derivative vectors; G2 additionally aligns curvature. Pattern anchors can intentionally be corners, so continuity is user-selected constraint per junction. Handle mirroring alone must not silently enforce C1.

**Falsifiable test and expected oracle.** Oracle: split cubic has C2-compatible geometric continuity before edit; toggling corner retains independent incoming/outgoing tangents.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 15. Offset mathematical singularities

**Engineering model.** For regular oriented curve B(s), offset O(s)=B(s)+d n(s). Derivative scale is (1-dκ(s)), producing cusps where dκ=1. Offsets of cubics are generally non-cubic. Use tolerance-controlled approximation and classify cusp events before generating cutlines.

**Falsifiable test and expected oracle.** Oracle: circle-like arc offset toward center by its radius triggers singular warning; straight offset preserves parallel lines and specified distance.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 16. Join semantics for allowances

**Engineering model.** At corners support miter, round, and bevel joins with miter limit. Distinguish seam-line allowance offset from outer-cut polygon, especially concave corners that require trimming. Different allowance widths per original edge require explicit junction interpolation rules.

**Falsifiable test and expected oracle.** Oracle: 90-degree outward corner with width 10 mm miter extends sqrt(2)*10 mm from vertex; near-reversal obeys miter cap.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 17. Variable allowance mapping

**Engineering model.** Store allowance as a scalar function of edge arc length or piecewise stations rather than only a per-edge number. Splitting an edge remaps stations by physical distance. If neighbor widths disagree, enforce configurable transition distance and manufacturing minimum.

**Falsifiable test and expected oracle.** Oracle: edge 100 mm with 10 mm start and 15 mm end, split at 40 mm, yields interpolated 12 mm at junction with no jump.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 18. Trim and boolean operations

**Engineering model.** Construct a planar arrangement, split edges at all proper intersections, label faces by winding, then extract selected boundaries. Shared borders and overlaps demand regularized semantics; naive point deletion on crossed line fragments cannot recover orientation correctly.

**Falsifiable test and expected oracle.** Oracle: overlapping rectangles union area 7, intersection area 1, difference area 3 for 2×2 rectangles shifted by (1,1).

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 19. Half-edge topology (DCEL)

**Engineering model.** Each directed half-edge requires origin, twin, next, prev, incident face, geometry-span reference, and persistent ID. Face loops can be holes. Validate twin symmetry, next/prev reciprocity, and closed traversal. Material contours and construction paths must not share implicit ownership.

**Falsifiable test and expected oracle.** Oracle: simple square yields 4 contour half-edges plus twins; interior face traversal visits exactly four and returns to origin.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 20. Persistent identity across edits

**Engineering model.** Allocate UUID or generation-stamped IDs independent of vector index. Split yields new child IDs while retaining ancestry; merge declares mapping and migration policies. Avoid integer-array indices in persisted seams because insertion shifts indexes.

**Falsifiable test and expected oracle.** Oracle: add vertex before notch, save/reload, then notch resolves to same physical locus and owning geometric edge lineage.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 21. Transactional topology edits

**Engineering model.** Stage geometry edits as immutable proposed revisions, validate orientation, intersections, attachments, and unit limits, then atomically commit. Failed operation must leave sewing and grading data untouched. Undo stores semantic inverse and/or exact prior snapshot with schema version.

**Falsifiable test and expected oracle.** Oracle: self-crossing drag returns structured validation error; revision and serialized object remain byte-identical to pre-edit.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 22. Edge attachments

**Engineering model.** Seam edges, notches, topstitches, prints and trims bind to edge IDs plus canonical arc-length fraction or curve parameter with declared semantics. On a split, translate coordinate via ancestry; on deletion, reject or request an explicit transfer policy.

**Falsifiable test and expected oracle.** Oracle: attaching a notch at 30% then inserting a vertex upstream does not move the notch on the cloth.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 23. Sewing side orientation

**Engineering model.** Store each attachment as directed interval and side orientation, not solely an edge name. Two equal-length sides may be sewn forward-to-reverse; sampling correspondence should follow normalized arc-length mapping and preserve intended side orientation.

**Falsifiable test and expected oracle.** Oracle: paired 50 mm lines in reverse orientation have endpoint correspondence A0↔B1 and A1↔B0; seam closure stays invariant under view mirroring.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 24. Ease and unequal seam lengths

**Engineering model.** Two sides with lengths La and Lb may require controlled ease ratio (La-Lb)/min(La,Lb) and anchor constraints. A sewing planner should declare whether excess is gathered, stretched, or invalid. Numeric arc-length tolerances must be tighter than ease acceptance thresholds.

**Falsifiable test and expected oracle.** Oracle: 100 mm to 105 mm seam maps endpoints correctly and reports 5% ease against a 100 mm denominator.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 25. Darts pleats and internal cuts

**Engineering model.** Represent internal paths in the same geometric kernel but with path roles: annotation, sewing guide, cut opening, pleat fold and dart leg. Only cutting paths alter material topology. Dart closure can transform contour geometry and requires consistent seam anchor remapping.

**Falsifiable test and expected oracle.** Oracle: annotation crossing the contour does not create a hole; cutting slit changes contour graph and attachment checks.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 26. Pattern grading constraints

**Engineering model.** Grade as parameterized geometric transformation plus style constraints, with correspondence between sizes. Affine width/height scaling is a first baseline, but control-point tangents, seam length and notch location may require graded rules. Detect topology changes when a size collapses or crosses itself.

**Falsifiable test and expected oracle.** Oracle: sizes XS–XXL retain identical semantic seam identity where possible; reject any size whose polygon signed area vanishes.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 27. Graded topology events

**Engineering model.** Model event ranges where edge disappearance, dart merge or notch relocation becomes necessary; do not interpolate topology by vertex index after a change. Define cross-size correspondence graph and preserve style lineage where one-to-one topology is impossible.

**Falsifiable test and expected oracle.** Oracle: a neck curve nearing the shoulder at extreme grade reports a topology event and blocks blind interpolation.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 28. Polygon orientation and nesting

**Engineering model.** Signed area determines winding for simple contours; nested hole parity requires containment tree plus orientation policy. A self-crossing outline cannot be classified by signed area alone. Define whether cutline fill uses even-odd or nonzero winding and keep export consistent.

**Falsifiable test and expected oracle.** Oracle: outer 10×10 and inner 2×2 hole has material area 96 square units regardless of input ordering after normalization.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 29. Triangulation boundary fidelity

**Engineering model.** Constrained triangulation consumes validated contour and hole constraints; no triangle edge may cross a boundary. Mesh density may vary independently of 2D CAD control geometry. Preserve mapping from triangle boundary vertices to curve parameter and source edge UUID.

**Falsifiable test and expected oracle.** Oracle: reconstructed mesh boundary Hausdorff distance stays under target export tolerance at all grades and sewing anchors remain recoverable.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 30. Rust kernel modular architecture

**Engineering model.** Split `predicates`, `curves`, `arrangement`, `offset`, `attachments`, `grading`, `serialization` as separate Rust modules with typed units. Keep primitive ABI exports stable; introduce versioned structured operations via a linear-memory protocol with explicit ownership.

**Falsifiable test and expected oracle.** Oracle: Rust native and browser WASM produce the same canonical op transcript for fixed seeded corpus; schema mismatch rejected before mutation.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 31. WASM memory safety and ABI

**Engineering model.** Simple f64 arguments work for existing functions but graph edits need vectors. Use pointer/length input and output buffers with allocation/free API, explicit little-endian encoding or a chosen stable serialization format, bounds and version checks. Avoid exposing Rust layout as wire ABI.

**Falsifiable test and expected oracle.** Oracle: malformed length returns an error instead of reading outside WASM memory; repeated calls show no live-allocation growth.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 32. C++ bridge coexistence

**Engineering model.** C++ cloth solver and Rust geometry should exchange immutable topology snapshots and stable IDs over documented C ABI. Establish authoritative ownership of contour edits before feeding simulation. Rebuild only affected mesh and seam regions when the geometric revision changes.

**Falsifiable test and expected oracle.** Oracle: after split, solver receives updated mesh/seam mapping exactly once; a rejected revision never changes solver state.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 33. Determinism and concurrency

**Engineering model.** All edit operations carry base revision and deterministic tie-break rules. Reject stale writes or resolve with explicit transform/rebase, never accept last-write silently on concurrent topology edits. Floating-point serializations should normalize -0 and invalid numbers.

**Falsifiable test and expected oracle.** Oracle: applying edit E to revision R twice produces identical result or duplicate-operation idempotency; stale R fails with conflict.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 34. Performance profiling

**Engineering model.** Benchmark 10,100,1000,10000 edges with realistic curve distributions; measure operation latency p50/p95, memory and topological correctness. Separate pointer-preview cost (frame budget) from commit quality (precision budget). Incremental BVH, spatial indices and topology locality matter more than raw SIMD alone.

**Falsifiable test and expected oracle.** Oracle: compare reference all-pairs algorithm to broadphase; false negatives exactly zero, p95 under chosen hardware budget measured rather than asserted.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 35. Fault injection and fuzzing

**Engineering model.** Generate seeded near-coincident anchors, almost parallel spans, loops, overlapping curves, zero-length handles, huge translations and repeated undo/redo. Compare candidate output to exact oracle or reference arrangement for every valid finite case. Shrink failures to minimal reproducible fixtures.

**Falsifiable test and expected oracle.** Oracle: seed, operation trace, expected predicate class and reduced geometry are persisted for every disagreement.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Chapter 36. Acceptance gates and rollout

**Engineering model.** Gate publishing/export on closed oriented non-self-intersecting cutline, resolved holes, attached notch/seam IDs, consistent dimensions, and stable per-size grading. Introduce kernel behind feature flag and dual-run shadow validation against JS. Require recorded evidence before declaring manufacturer accuracy.

**Falsifiable test and expected oracle.** Oracle: release corpus of certified gold patterns roundtrips through edit/save/import/export without topology or dimension drift above declared tolerances.

**Implementation decision.** Record the typed input/output contract, edge identity changes, tolerance budget, rejected degeneracies and measured runtime before merging this operation. The canonical Rust graph produces the authoritative committed result; the UI may offer speculative previews, but must restore the committed result when a preview diverges.

## Candidate selection and benchmark matrix

| Candidate | Predicate rigor | Native curved arrangement | Rust/WASM friction | Best initial use | Decision gate |
|---|---|---|---|---|---|
| Current EXO Rust primitives | Basic finite f64, no robust orientation API | Absent in inspected module | Already deployed ABI 1 | Preserve numeric hot paths | Keep, extend with guarded ABI 2 |
| Shewchuk adaptive predicates | Exact sign of representable floating inputs under assumptions | No | C port/FFI or Rust implementation requires audit | Orientation/incircle oracle | 100% classification agreement near degeneracy |
| CGAL Arrangement + Bézier traits | Filtered/exact algebraic operations | Yes | High; C++/WASM binary size and licensing evaluation required | Golden reference oracle and advanced booleans | Compare runtime, memory, build provenance |
| kurbo | Floating curve utilities | No full arrangement promised here | Native Rust | Cubic length, splitting, extrema candidates | Error-bound/edge-case benchmark |
| geo | General geometry algorithms | Curve topology not guaranteed | Native Rust | Broad compatibility experiments | Polygon-with-holes roundtrip accuracy |
| Clipper2 | Robust integer-scaled polygon clip/offset | Flattening required for Bézier | FFI/wrapper and quantization | Offset/boolean reference for flattened paths | Bounded Hausdorff drift at production scale |
| Custom exact-rational arrangement | Potentially rigorous | Requires major new engineering | Native Rust, complexity high | Research fallback | Prefer only if validated alternatives fail |

**Benchmarks:** 64/512/4096/16384 edges; straight, monotone cubic, loop, tangent, overlap; 1/100/10000 repeated edits. Record p50/p95 commit ms, peak bytes, intersection completeness, endpoint remap error, Hausdorff error in mm, false negatives, and deterministic hash stability. Fix a hardware profile and serialized corpus before comparing. Candidate rankings remain **undetermined** until those measurements exist.

## Runnable reference oracles (isolated; no app edits)

A cubic split geometric invariant can be checked in a standalone JavaScript console with `src/core/vectorPatternBezier.js`: choose random finite P0…P3, split at t in (0,1), then compare `cubicAt(...,u)` with the corresponding reparameterized child. Use absolute error <= 1e-10 times the largest coordinate scale for ordinary nondegenerate cases. A rectangle Boolean oracle uses A=[0,2]×[0,2], B=[1,3]×[1,3]: intersection 1, union 7, A\\B 3. A split-attachment oracle at original parameter 0.75 split at 0.5 expects child right, local parameter 0.5. These are **designed expected outputs**, not assertions that current repo tests pass.

## Prioritized implementation ladder

1. Define typed units, edge UUID ancestry, graph validation and pure transaction format; build fixture corpus before UI migration.
2. Implement robust orientation/segment predicates and exact sign differential oracle.
3. Implement cubic extrema, arc-length integration, inverse arc length and closest point with explicit error contracts.
4. Implement cubic split plus seam/notch/grade remapping and undo; integrate with selected native Shape command.
5. Implement arrangement-based intersections, overlap classification and face labeling.
6. Implement variable seam allowance offset, cusp checks, clipping and corner joins.
7. Connect validated topology to C++ solver mesh and native export; measure manufacturing tolerances from real patterns and measured fabric tests.

## Remaining uncertainties / research requiring direct measurement

Native Rust polygon seam-map structure and complete SplitBoundary internals require a separate full-code audit; complexity is not inferred from the parser alone. Production tolerance needs a manufacturer’s plotter, seam allowance and fabric-specific specification. External library benchmarks need pinned versions, license review, builds against the EXO macOS/wasm toolchain and identical test corpus. No exact-equivalence claim to CLO3D is supported solely by these sources.


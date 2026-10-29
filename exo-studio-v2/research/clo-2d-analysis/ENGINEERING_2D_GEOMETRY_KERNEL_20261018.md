# EXO native 2D geometry kernel: engineering design and corrective program

Date: 2026-10-18. Scope: source-level audit plus implementation design; no application code changed.

## Evidence convention

**V** verified in repository source inspected today; **D** engineering design/proposal; **U** requires fixture or end-to-end validation. Repository observations: `rust/exo_geometry_kernel/src/lib.rs` contains scalar helpers and quadratic arc integration, `src/core/rustGeometryKernel.js` loads six ABI exports and falls back to JavaScript, `src/core/project.js` attaches seam allowances, curves, sewing and notches by edge indices, `src/components/PatternEditor.jsx` exposes quadratic controls, `src/core/clothcraft2dGeometry.js` renders UV-mesh boundaries in metres. The existing Rust kernel is not the complete editable topology kernel. [V]

## Engineering decisions at a glance

Canonical geometry lives in an independently versioned Rust PatternDocument; IDs survive reordering; curve path and sewn topology remain separate; WASM returns explicit remap maps after edits; cutline regeneration is a derived artifact; manufacturing export validates the whole graph. [D]

## 01. Kernel boundary and scope

Make one canonical editable PatternDocument independent of JSX, triangulated cloth panels, and renderer coordinates. Geometry edits accept an immutable revision and return a new revision plus an explicit Remap. The Rust ABI currently exposes six scalar numerical functions; therefore document topology kernel work as proposed, not shipped. Keep a typed, versioned adapter between `src/core/project.js` centimeter models and native 2D mesh UV metres. Never infer cutlines from triangles. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for kernel boundary and scope; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 02. Canonical coordinate system

Store pattern geometry as f64 centimetres in pattern-local axes, with an explicit `unit: cm` and coordinate-frame ID. The native board receives metres using exactly `m = cm/100`; canvas transform and rotations belong to view state. Transform control points using the same affine matrix as anchors. Export all physical distances from model space, never SVG pixels. Reject NaN and infinity at the input boundary; normalize signed zero on serialized output. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for canonical coordinate system; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 03. Stable identity graph

Assign monotonically unique UUID or 128-bit IDs to Piece, Vertex, HalfEdge, Curve, Notch, Seam, Dart, and Constraint. Index positions are ephemeral traversal orders only. Deleting vertex V must rewrite all associated edges using an explicit policy; no sewing instruction may silently migrate to the next numeric index. Store tombstones within transaction remaps to support undo and external references. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for stable identity graph; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 04. Doubly connected edge list

Represent each outer or hole loop as oriented halfedges with `origin`, `next`, `prev`, `loop`, and `twin` only for genuine planar subdivision relationships. A garment sewing counterpart is a separate SewRelation, not a DCEL twin: sewn panels are distinct solids prior to simulation. A cut piece may have multiple loops. Enforce `next.prev=id`, matching endpoints, one owner loop, and nonzero area for manufacturing export. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for doubly connected edge list; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 05. Curve primitives

Use Line, Quadratic and Cubic enum variants. For cubic endpoints P0,P3 and controls P1,P2, evaluate B(t)=(1-t)^3 P0+3(1-t)^2t P1+3(1-t)t²P2+t³P3. Derivative B'=3[(1-t)²(P1-P0)+2(1-t)t(P2-P1)+t²(P3-P2)]. Canonicalize curve degree only with explicit data migrations. Existing PatternEditor `piece.curves[edgeIndex]` is quadratic; preserve round trip when unchanged. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for curve primitives; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 06. Cubic editor semantics

Use independent tangent handles, aligned tangents, mirrored tangents and automatic smooth nodes. A cusp permits unrelated derivatives on adjacent segments. Alignment constraint is cross(vin,vout)=0 with anti-parallel orientation. Mirroring also requires equal magnitude. Near-zero handles need stable fallback tangent from neighboring edge; no division by tiny norms. Set state via constraint solver, not UI-only mirroring. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for cubic editor semantics; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 07. Exact cubic split

Apply de Casteljau: A=lerp(P0,P1,t), B=lerp(P1,P2,t), C=lerp(P2,P3,t), D=lerp(A,B,t), E=lerp(B,C,t), F=lerp(D,E,t). Emit child cubics `(P0,A,D,F)` and `(F,E,C,P3)`. Keep source edge genealogy `(oldId,[leftId,rightId],t)`. Tests compare child geometry against original parameter intervals at 101 sample values and verify tangent continuity. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for exact cubic split; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 08. Quadratic compatibility splitting

Quadratic Q(t)=(1-t)²A+2(1-t)tC+t²B splits via L=lerp(A,C,t), R=lerp(C,B,t), M=lerp(L,R,t). Result children `(A,L,M)` and `(M,R,B)` preserve shape exactly. Preserve existing curved edge metadata and remap notch parameters. Exact midpoint by arc length requires root solving; midpoint t=.5 only means parameter midpoint. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for quadratic compatibility splitting; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 09. Length and inverse arclength

Integrate `||B'(t)||` using adaptive Gauss–Kronrod or Simpson with explicit absolute tolerance in centimetres and a bounded subdivision count. Binary search on cumulative arclength using safeguarded Newton steps. Cache `(edgeId, revision, tolerance)` arc-length lookup tables. In `src/core/project.js`, `edgeRangeLength` scales whole-edge length by |t1-t0|, which is inaccurate for nonuniform curved speed; replace algorithmically only after parity fixtures. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for length and inverse arclength; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 10. Distance and hit testing

For candidate cubic B(t), find roots of `(B(t)-P)·B'(t)=0` in [0,1] using interval subdivision and safeguarded Newton iterations. Compare root distances and endpoints; obtain conservative boxes for broad phase using cubic derivative roots. Pointer tolerance must convert pixel radius through inverse view transform, whereas selection distances use world space. Include extreme zoom and nearly coincident anchors. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for distance and hit testing; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 11. Robust orientation predicates

Use adaptive exact predicates for orient2d in topology decisions; avoid naive epsilon orientation as the final verdict. `robust` crate ports Shewchuk predicates under MIT/Apache-2.0. Distinguish exact arithmetic sign for a finite floating-point input from semantic snapping tolerance. Predicates decide crossing order; user snapping defines intentional coincident geometry. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for robust orientation predicates; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 12. Intersections and degeneracy

Use interval bounding-box pruning, monotone subdivision and root isolation for curve–curve intersections. Classify CROSS, TOUCH, OVERLAP and UNSURE with an explicit result enum and parameter intervals. Overlapping cubics need more than point solutions: capture coincident parameter spans and orientation. Do not automatically heal uncertain intersections into invented geometry. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for intersections and degeneracy; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 13. Planar arrangement

Convert each proposed cut operation into an arrangement of original segments split at all isolated intersections, then construct faces via angularly sorted directed edges. Preserve winding and provenance to recover owner features. Distinguish self-intersecting sketch (editable with warning) from validated manufacturing cut region (simple outer plus valid holes). Keep fill rule explicit. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for planar arrangement; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 14. Boolean algebra

Implement union/intersect/difference/xor on flattened tolerance-controlled paths or use an audited boolean engine. Record approximation tolerance with result. For Boolean combinations of curves, lift resulting polyline nodes back to curve references only when provenance survives; otherwise mark approximated output and allow fitting with bounded Hausdorff error. Verify area inclusion identities and commutativity where applicable. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for boolean algebra; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 15. Clipper2 assessment

Clipper2 is attractive for integer-scaled clipping/offsetting and explicit join/end types; its native implementation introduces C++ integration/FFI effort and scaled integer range bounds. Before adoption verify current upstream license and C ABI against the pinned release. Quantize cm to fixed units with error <= half a grid cell, detect overflow before conversion, and keep original Bézier cutline as canonical. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for clipper2 assessment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 16. geo assessment

The `geo` Rust crate provides BooleanOps and buffer/offset capabilities and is dual MIT/Apache-2.0; this enables WASM-friendly experiments. Benchmark thin slivers, touching rings, holes, scale extremes and orientation. Do not assume a buffer curve preserves exact seam construction or that invalid polygon repair preserves manufacturing semantics. Maintain property-driven regression fixtures. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for geo assessment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 17. kurbo assessment

The `kurbo` Rust library supplies f64 cubic Bézier geometry, subdivision and path machinery under MIT/Apache-2.0. Adopt as a curve math dependency if ABI weight and numeric behavior satisfy fixtures. Preserve EXO IDs and metadata in a wrapper, since a general-purpose curve crate does not define sewing references, grading or cut topology. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for kurbo assessment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 18. lyon assessment

`lyon` supplies fill and stroke tessellators and vector path geometry; use it to draw curves and generate preview triangles. Its tessellation triangles are a derived render cache, never an authoritative sewing graph. Performance benchmark shape edits at several levels of tessellation tolerance. `lyon` is MIT/Apache-2.0/MPL-2.0 licensed according to its repository. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for lyon assessment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 19. CGAL assessment

CGAL has mature 2D straight skeleton and offset methods, but the straight skeleton package is GPL licensed; use requires compatible release architecture or a commercial license. C++ integration and browser WASM size are additional costs. It is a useful reference/oracle in isolated evaluation; do not import GPL algorithm code into a proprietary core without appropriate licensing decision. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for cgal assessment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 20. Offset curve construction

At regular smooth points the geometric parallel offset is `O(t)=B(t)+d·N(t)` with `N(t)=s·(-y'(t),x'(t))/||B'(t)||`; generally this is not a cubic Bézier. Produce a tolerance-controlled approximation via adaptive sampling and fitting. At cusps/zero derivatives, classify and use explicit join policies. Negative offsets can collapse loops; return multipolygon and diagnostics. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for offset curve construction; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 21. Variable seam allowance

Associate allowance intervals with stable oriented EdgeId and normalized arclength fractions, not vertex indices. Segment by breakpoints where width or join semantics change; evaluate offset `d(s)` and ensure blends are deterministic. For each factory pattern label, track sewing line separate from cut line. Cut length is not automatically sew length. Preserve allowances through edge splits by subdividing interval ranges. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for variable seam allowance; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 22. Allowance corners

Support miter, bevel, round and custom taper. Limit miter length by ratio `m = 1/|sin(theta/2)|`, avoiding spikes at acute corners. Join disposition depends on outward direction and orientation; inward re-entrant corners demand trimming/intersection. Detect and annotate small loops after offset, and require explicit approval or rule-defined removal during manufacturing export. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for allowance corners; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 23. Notch attachment

Store notch as `(edgeId, stationArclengthCm, side, kind, depthCm, widthCm, seamCorrespondenceId)` with optional fraction for compatibility. Moving curve maintains physical station unless product policy locks relative percentage. Edge splits map station to child from cumulative lengths. Emit a typed orphan diagnostic if the supporting edge is deleted. Double notches remain paired and ordered. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for notch attachment; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 24. Sew topology

Represent a seam as pairs of directed edge spans `(edgeId,s0,s1,orientation)` and stitch parameterization `u∈[0,1]`, independent from triangulation boundaries. Detect zero-length spans, missing IDs, and sewing endpoints outside valid ranges. Validate opposing orientation, ease ratio, and notch mapping. A seam can span multiple consecutive edges; store sequence rather than welding edges purely for UI convenience. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for sew topology; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 25. Seam walking and ease

Compute exact-to-tolerance lengths `L_A`, `L_B` and signed ease `e=(L_B-L_A)/L_A` when `L_A>0`. Sample equally in physical arclength and compare matched notch stations. Present signed measurements plus residuals. For distribution, allocate ease piecewise by seam segments with explicit weights and limits. Verify a collar and curved armhole with intentionally different geometric lengths. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for seam walking and ease; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 26. Symmetry constraints

Define reflection by an infinite construction line `(origin, unitDirection)`; transform a point p as `p'=o+(2uuᵀ-I)(p-o)`. For cubic, reflect all four control points and reverse traversal only when required to preserve loop orientation. Symmetry can be linked (edit one side updates peer) or materialized (independent). Constraint cycles must produce a validation error instead of recursive updates. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for symmetry constraints; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 27. Grading rules

Store base-size geometry and ordered grade rules per anchor/control handle: relative dx/dy, measured increments, constraint equations and optional piecewise size mappings. Evaluate each target size from the base, never by repeatedly grading previous size (avoids accumulated drift). Recompute sewing lengths and notch locations for each size and record tolerance failures. Auto grading of complex curved tangents requires graded handles or an explicit constraint policy. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for grading rules; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 28. Darts, pleats and internals

Internal construction curves and fold lines must have distinct semantic layers from cutline loops. Dart apex/legs carry identity and fold direction; closing a dart modifies a derived manufacturing shape while preserving original authoring graph. Avoid treating rendered internal strokes as holes or cut edges. Model a pleat as an operation with fold depth and registration markers. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for darts, pleats and internals; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 29. Delete and merge policies

Deleting an anchor joining two curves is geometrically underdetermined. Expose preserve tangent, fit within tolerance, replace with straight, and cancel; use constrained least-squares cubic fitting for the first two, report max deviation and arclength delta. Any seam/notch/allowance attached to two source edges gets a deterministic remap or explicit orphan state. No silent bridge across missing points. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for delete and merge policies; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 30. Undo and transaction journal

A transaction includes baseRevision, operationId, input IDs, before/after patch, Remap and validation diagnostics. Apply atomically, compute inverse operations using original IDs, and invalidate caches by changed entity IDs. Redo replays the same deterministic operation under the recorded schema. Concurrency uses revision mismatch errors with conflict resolution, never last-write-wins topology mutations. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for undo and transaction journal; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 31. Persistence and compatibility

Define schemaVersion, units, origin, pieces, vertices, halfedges, curves, sewing, notches, allowance, grading, constraints and provenance. Migrate `points[]`, `curves[edgeIndex]`, notch `edgeIndex` and seam `edgeIndex` through one deterministic import pass, then retain a compatibility projection for legacy views until removed. Use canonical ordering for stable diffs and checksum. Reject dangling foreign keys before manufacturing export. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for persistence and compatibility; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 32. Serialization invariants

Round trip JSON -> Rust -> JSON should retain identity and semantics; float values can use stable decimal representation with tolerance-aware geometry comparison. Include schema migration fixtures for old saves and changed edge counts. Check no duplicate IDs, all references resolve, boundaries close, signed areas maintain orientation, and no coincident consecutive non-intentional points. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for serialization invariants; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 33. WASM API design

Expose document-level commands using a binary or JSON envelope with explicit version, requestId, revision and error enum. Prefer coarse command calls `apply_operation`, `validate`, `sample`, `measure` over calling WASM once per pointer sample. The existing scalar `exo_*` ABI remains version 1; additions should enter ABI v2 with negotiation and deterministic fallback. Never mutate a partial buffer if validation fails. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for wasm api design; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 34. Performance and caching

Maintain bounding-volume tree or R-tree over curve bounds, and invalidate only touched edge neighborhoods. Cache arclength tables, flattening, offset result, triangulation and displayed dimensions with cache keys `(entity revision,tolerance,unit,algorithm version)`. Interactive drag may use low-detail previews; commit must run exact validation and full tolerance. Instrument p50/p95 latency on 100, 1,000 and 10,000-edge patterns. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for performance and caching; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 35. Testing methodology

Use pure fixture commands for create/move/split/delete, plus property tests for invariants. Generate random valid closed polygons, cubic controls and seam references with seeded cases. Metamorphic tests: translate/rotate preserves lengths/areas; splitting preserves curves; undo restores serialized semantic state; grading twice from base is deterministic; offset area grows for simple convex outward offset. Save minimized failures as static fixtures. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for testing methodology; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 36. Native board interoperability

`src/core/clothcraft2dGeometry.js` currently consumes metre UV coordinates and boundary index arrays. Treat these as derived views: canonical pattern boundary -> discretized render mesh -> array indices. Selection must map render hit to canonical edgeId and physical arclength. `boundarySegments` already preserves breaks in invalid indices; require complete valid loop for manufacturing while allowing diagnostic preview of partial runs. [D / V]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for native board interoperability; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 37. Rust integration seam

The existing `rust/exo_geometry_kernel/src/lib.rs` provides snap_grid_coordinate, nearest_segment_t, length_2d, length_3d and quadratic_arc_length plus C ABI. Start kernel V2 with pure tests; move feature-by-feature and verify identical legacy outputs except explicitly corrected bugs. Keep `src/core/rustGeometryKernel.js` ABI detection and fallback stable during rollout. Do not infer this new core exists until linked and tested. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for rust integration seam; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 38. Feature rollout order

First introduce stable IDs and a read-only migration bridge. Next ship exact split with mapping and scoped seam/notch remaps. Then add cubic controls and precise arc length, robust intersections, Boolean/offset engine, grading, and native persistence. Gate each stage with fixture parity on both editors. Add diagnostics panels before enabling destructive topology commands. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for feature rollout order; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 39. Manufacturing acceptance oracle

Export must satisfy closure, bounded self-intersection count zero, seam connectivity complete, allowed notch depth, physically meaningful allowance widths and per-size sewing reports. Produce a manifest with source revision and tolerance used to generate cutting paths. For PDF/DXF, coordinate units, line type and scale must survive independent third-party reimport. UI screenshots alone are not production evidence. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for manufacturing acceptance oracle; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## 40. Uncertainty register

Verified: Rust ABI source and JS pattern methods listed in this manuscript. Proposed: new identity graph, arrangement, exact curve split and integration. Untested: computational performance, library accuracy on EXO fixtures and manufacturing interoperability. Resolve uncertainties with package-pinned benches and actual saved garments before declaring CLO parity. [D]

**Acceptance fixture.** Execute a deterministic before/edit/after replay for uncertainty register; serialize resulting IDs, validate all graph references, confirm numeric and visual results under canonical centimetre units, and compare restored state after undo. Record whether this is implemented, proposed or blocked; never treat rendering success as proof of manufacturing correctness. [D]

## Reference data model (proposed)

```rust
struct PatternDocument { schema_version:u32, revision:u64, pieces:Vec<Piece>, seams:Vec<SewRelation>, grade_rules:Vec<GradeRule> }
struct Piece { id:Id, loops:Vec<Loop>, construction:Vec<InternalPath> }
struct Vertex { id:Id, p:[f64;2], constraints:Vec<Id> }
struct HalfEdge { id:Id, from:Id, to:Id, next:Id, prev:Id, curve:Curve, loop_id:Id }
enum Curve { Line, Quadratic{control:[f64;2]}, Cubic{out:[f64;2], in_: [f64;2]} }
struct EdgeSpan { edge_id:Id, start_cm:f64, end_cm:f64, reverse:bool }
struct SewRelation { id:Id, a:Vec<EdgeSpan>, b:Vec<EdgeSpan>, ease_rule:EaseRule }
struct Remap { vertex_ids:Map<Id, Vec<Id>>, edge_ids:Map<Id, Vec<NewEdgeSpan>>, orphaned:Vec<Id> }
```

## Algorithm: safe atomic edge split

```text
split_edge(doc, edge_id, t, expected_revision):
  assert doc.revision == expected_revision
  assert finite(t) && 0 < t < 1
  old = doc.lookup(edge_id)
  [left_curve,right_curve,split_vertex] = de_casteljau(old.curve,t)
  [left_id,right_id,new_vertex_id] = allocate_ids()
  rewrite_cycle(old.prev -> left -> right -> old.next)
  remap = {old_id: [(left_id,0,t),(right_id,t,1)]}
  remap_notches_using_inverse_arclength(remap)
  remap_sewing_edge_spans(remap)
  remap_allowance_intervals(remap)
  validate_modified_piece_and_all_references()
  return transaction_or_error(doc, remap)
```

## Explicit failure codes

`InvalidNumericInput`, `StaleRevision`, `MissingEntity`, `DegenerateCurve`, `LoopNotClosed`, `SelfIntersection`, `AmbiguousOverlap`, `UnresolvedSewReference`, `AllowanceCollapse`, `OffsetOverflow`, `GradeConstraintUnsatisfied`, `SchemaMigrationFailure`, `ManufacturingExportRejected`. Include entity IDs and world-space locus, never only a generic failure string.

## Proposed targeted regression corpus

| Fixture | Action | Acceptance oracle |
|---|---|---|
| single straight rectangle | split one side and undo | unchanged area, ID remap, round-trip exact topology |
| asymmetric cubic armhole | split at arclength 43% | Hausdorff error below 1e-9 cm, seam station retained |
| tiny notch at seam end | delete adjacent point | explicit remap or orphan, never silent position change |
| nested hole and tangent contact | Boolean difference | deterministic ring count, no bridge across contact |
| acute V-neck | 1 cm variable outward allowance | limited miter, no spike, export diagnostics |
| 8 size jacket grade | apply base-relative grade rules | deterministic each-size neck/armhole/stitch lengths |
| reversed sew direction | seam walk | detects opposing orientation or user-specified reversal |
| malformed mesh UV list | derive board boundary | preview gaps and export rejection |
| extreme coordinate scaling | integer clipping | overflow or controlled quantization, never wrap |
| split then merge then undo | editing transaction | stable IDs where viable, complete reference graph |

## License and engineering source register (reviewed 2026-10-18)

- Rust robust adaptive predicates: https://github.com/georust/robust (MIT/Apache-2.0; orient2d/incircle).
- geo library and booleans: https://github.com/georust/geo and https://docs.rs/geo/latest/geo/algorithm/bool_ops/index.html (MIT/Apache-2.0).
- kurbo cubic paths: https://docs.rs/crate/kurbo/latest/source/README.md (MIT/Apache-2.0).
- lyon fill/stroke: https://docs.rs/lyon_tessellation/latest/lyon_tessellation/ and https://github.com/nical/lyon (MIT/Apache-2.0/MPL-2.0).
- CGAL package-specific licensing: https://www.cgal.org/license.html and https://doc.cgal.org/latest/Straight_skeleton_2/group__PkgStraightSkeleton2Ref.html (straight skeleton GPL).
- Clipper2 source: https://github.com/AngusJohnson/Clipper2 (pin and check release LICENSE before adoption).
- Shewchuk original predicate paper and code: https://www.cs.cmu.edu/~quake/robust.html .
- Original EXO sources: `rust/exo_geometry_kernel/src/lib.rs`, `rust/exo_geometry_kernel/Cargo.toml`, `src/core/rustGeometryKernel.js`, `src/core/clothcraft2dGeometry.js`, `src/core/project.js`, `src/components/PatternEditor.jsx`.

## Verification boundary

Research contains 38 original technical sections, an explicit structural proposal, operation pseudocode and fixture matrix. Reading files is evidence of code structure only. No library was installed or benchmarked here, no production solver changed, and no runtime parity claimed.


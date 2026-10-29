# EXO 3D CAD, arrangement and manufacturing engineering research

**Date:** 2026-10-18. **Scope:** EXO ClothCraft V2 3D window, comparison with documented CLO / Marvelous Designer user workflows, industrial pattern handoff, fit analysis and a testable implementation architecture. **Method:** static inspection of named EXO files and official vendor documentation; no proprietary solver reverse engineering, certified manufacturing validation, or live interaction with installed CLO is asserted.

**Evidence key:** **V** directly located in current EXO source (presence of code, not successful end-to-end use); **D** described in public official CLO/Marvelous documentation; **E** original EXO engineering design and proposed acceptance thresholds; **U** unverified or missing evidence. Sources are URLs with explicit feature scope. Vendor manuals can change and may describe different product versions.

## 01. Outcome and release definition

**E.** The target is a 3D CAD workspace in which a manufacturer can trace a simulated garment to a uniquely identified 2D cutting pattern, graded size, sewing operation, fabric measurement, avatar, solver run and exported exchange file. Appearance, real-world fit prediction and factory artifact correctness are independent pass/fail dimensions. A fast preview may be attractive while its contact and material physics remain unvalidated; a physically excellent simulation can still export unusable DXF. EXO should publish separate release confidence scores for *interactivity*, *numerical stability*, *measured predictive agreement*, *pattern interoperability* and *manufacturing completeness*. Every reported result includes tool version, asset hashes, solver backend, fabric card, mesh resolution, units and date.

**E.** Acceptance gate: for an agreed reference garment and factory-approved pattern, pass round-trip dimensional tolerance, preserve every seam/notch/grade relationship, solve representative poses without unacceptable penetrations, reproduce repeat runs within a declared tolerance and meet a published frame budget. Do not call the product more accurate than CLO or Marvelous until blind experiments with the same fabric, avatar, patterns and ground truth establish that result.

## 02. Evidence from current EXO implementation

**V.** `src/core/patternBodyArrangement.js:7-66` infers anatomical roles from panel names and project context, then applies hard-coded approximate positions such as torso front/back and sleeve offsets; uncertain panels remain unassigned. These offsets are a usable heuristic initializer, not anatomy-matched placements. **V.** `src/core/nativePreDrapeCurvature.js:1-78` bends selected reset-stage panel vertices in a separate display buffer, checks coarse avatar ranges and local averages, and explicitly excludes the modified coordinates from the solver, undo state and serialization. This is visual preparation only. **V.** `src/components/ClothCraftSceneV2.jsx:1332-1361,1756` provides a displayed extension-based color ramp and explicitly labels it “Principal extension … not stress/pressure.” **V.** `src/components/ClothCraftWorkspace.jsx:1538` reports worst seam gap, extension p95 and contacts while identifying collision and fit as experimental.

**V.** The workspace supplies typed panel placement controls in meters/degrees, transform tools, play/pause/step/reset, and 2D seam length mismatch in millimeters (`ClothCraftWorkspace.jsx:1473,1522,1543`). **V.** `src/core/nativePatternExportPreparation.js:9-87` builds a disposable export copy, removes microscopic edges, normalizes winding and remaps indexed seam and marking data. This preparatory step is not itself a validated DXF-AAMA/ASTM writer. **U.** Inspection of these files does not prove a production-grade canonical arrangement/solver contract, calibrated avatar fitting, DXF round-trip, full stress tensor, contact-pressure integration or factory-approved tolerance system. A separate existing inventory, `research/clo-3d-analysis/EXO_3D_VIEWPORT_PARITY_INVENTORY_20261018.md`, documents many more UI surfaces.

## 03. CLO arrangement behavior and version-specific reference

**D.** CLO arrangement points are anchored to avatar bounding volumes; selecting a pattern, hovering an arrangement point and clicking previews and places the panel; associated symmetric settings can arrange paired patterns. A flip-wrap command changes wrap direction. Source: [CLO arrangement points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction). **D.** An arrangement point has bounding-volume association, X/Y, offset and wrap direction; CLO documents left/right naming conventions for symmetric points. Source: [CLO add arrangement point](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point). **D.** Custom bounding volumes carry joint endpoints and cylinder/cuboid geometry and are editable in an avatar editor. Source: [CLO bounding volume](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume). **D.** CLO can automatically generate arrangement points when eligible OBJ avatars arrive in A or T pose; success is not guaranteed on arbitrary rigs. Source: [CLO automatic creation](https://support.clo3d.com/hc/en-us/articles/360001749467-Automated-Arrangement-Point-Creation).

**E.** Reproduce the *observable workflow*, not undocumented internal implementation. Provide an arrangement-point selector, visible avatar regions, hover ghost, wrap sign, scalar clearance, local rotation, mirror handling and contextual failure explanations. Maintain stable identity across avatar shape changes. A role guess alone must never overwrite an explicit user placement.

## 04. Canonical coordinate systems and units

**E.** Introduce precise frame types: `Pattern2D.cm`, `PatternMeshRest.m`, `AvatarLocal.m`, `World.m`, `RenderWorld.m`; store conversion at boundaries rather than sprinkling factors of 0.01. A rigid placement acts on local mesh points by `x_world = T_world_avatar * T_avatar_anchor * R_panel * x_rest`. Distinguish pose-dependent anatomical frame, saved arrangement transform and simulated deformed vertex positions. Normals are inverse-transpose transformed under nonuniform scale. Negative determinant changes face orientation and sewing winding assumptions and demands an explicit remapping, never a silent reflection.

**E.** Invariants: all finite coordinates; fixed handedness; agreed avatar forward/up vectors; stable pattern origin; simulation data in SI; persisted numeric precision declared; one canonical result for front/back normal. Regression: asymmetric front/back pattern, 90° avatar turn, nonuniform imported scale and mirrored left/right garment survive render/save/reopen with signed normals and dimensions intact. Units must accompany every import and export and defaults must be visible.

## 05. Avatar anatomical model and metadata

**D.** CLO's avatar editor includes avatar size, arrangement points, volumes and basic/surface/tape/circumference measurements; its size and mesh assets are distinct file types. See [CLO Avatar Editor guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide) and [file formats](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats). **D.** Marvelous Designer's avatar editor documents distinct basic and surface measurements and editable arrangement metadata. See [MD Avatar Editor](https://support.marvelousdesigner.com/hc/en-us/articles/47358128221337-Avatar-Editor-ver-2025-0).

**E.** Store `AvatarAsset {id, meshHash, skeletonHash?, neutralPose, bodyAxis, units, landmarks[], measurementDefinitions[], signedDistanceVersion?, confidence}`. Landmark positions use an avatar triangle ID with barycentric coordinates for surface adherence, and/or skeleton-local coordinates when robust across animation. Each measure carries route type (`euclidean`, `meshGeodesic`, `planeSection`, `surfaceTape`) and reference pose. Reject “exact waist” if waist plane was guessed without calibration. Avatar scaling invalidates cached skin clearance and pressure calibration. Three manually checked anthropometric landmark sets on different body morphs form the first evidence dataset.

## 06. Shape-dependent arrangement frames

**E.** Replace hard-coded torso Z and sleeve X positions with a target surface frame `A=(p,n,t,b)`, where `p` is an avatar surface sample, `n` its outward unit normal, `t` a tangent aligned with garment grain/body vertical or limb axis, and `b=n×t`. Re-orthogonalize `t` via Gram-Schmidt: `t' = normalize(t-(t·n)n)`. Use skeleton joint axis, region geodesic direction or manually configured landmark orientation to avoid unstable tangent flips. For limbs, define longitudinal coordinate by projected joint distance and circumference coordinate by angle around the local limb axis.

**E.** Surface samples must have persistent region identifiers and confidence. At shoulders/underarms, smooth patch transitions or require user confirmation rather than allowing a point to jump across nearby but anatomically different surfaces. If avatar topology changes, rematch using landmark plus region, then report mismatch if confidence is below a defined threshold. Acceptance: avatar size morph ±20% maintains correct side and mirror symmetry; sleeves do not teleport across arms when elbow flexes.

## 07. Bounding volumes and acceleration

**E.** Joint-bound cylinders/capsules are useful for first-hit placement but not sufficient for body collision. Use an `AvatarRegionVolume` with joint references, transform, primitive type, side, priority, capsule radius profile and optional manually edited footprint. A surface BVH accelerates precise raycast/closest-point; a narrow-band signed distance field can accelerate clearance for repeated solver queries if robust sign can be computed from watertight oriented mesh. Non-watertight avatars need two-sided closest surface with separately inferred normal and an `ambiguous_inside` state.

**E.** Broad phase cost targets are measured as function of panel triangles N, avatar triangles M and contacts K: avoid per-frame all-pairs `O(NM)`; use hierarchical traversal and temporal coherence. Cache by `(avatarMeshHash, poseRevision, scaleRevision)`, rebuild only deforming sections when possible. Test thin concavities, gap between arm and torso, crossed legs, mirrored imported meshes and zero-area triangles. Collision tests are independent of pretty bounding-volume drawing.

## 08. Pre-simulation panel curvature geometry

**E.** A physically consistent initializer maps rest 2D coordinates `u=(s,t)` to an offset anatomical manifold `x(u)=S(φ(u))+d n(S(φ(u)))`, where `S` is the local target surface, `φ` a parameterization, and d configurable clearance. A simple cylinder initial guess on torso/arm may use `x(s,t)=c(t)+r(t)[cos(θ_0+s/r)n_0+sin(θ_0+s/r)b_0]+d n(s,t)`; taper and torso curvature require sampled avatar surface. Preserve UVs and original 2D edge arclength; bending should approximate isometry. Objective: minimize `E = λ_l Σ_ij (||x_i-x_j||-L_ij)^2 + λ_d Σ_i (signedDistance(x_i)-d)^2 + λ_s E_smooth + λ_o E_orientation`, with constrained region and seam margins.

**E.** Do not silently push a broad piece into an intersecting avatar just to make preview look draped. The proposed canonical `ArrangementState` must output initial particle positions `x0`, not merely render replacements. Use a conservative collision-free projection and clearance certificate before handing x0 to the Rust solver. Track failure classes `no_surface`, `self_intersection`, `avatar_penetration`, `unreachable_wrap`, `inverted_triangle`. Current `nativePreDrapeCurvature.js` is intentionally render-only (**V**); adapting its heuristics directly as physical initial conditions without validity checks would be unsafe.

## 09. Arranging before and after simulation

**E.** State machine: `Flat → DraftArrangement → CheckedInitialState → Simulating → PausedSolved → ExportableSnapshot`. A paused rigid transform updates authoring placement; a grabbed cloth vertex injects a temporary physical constraint; a post-simulation redrape changes state through explicit transition, invalidating previous solver cache. Undo stores edits to canonical arrangement, not render mesh pointers. When a selected panel has seams, moving only that panel either restarts solve with consistent sewing or declares the temporary preview detached; never conceal a seam constraint discrepancy.

**E.** Save and reopen test compares serialized target attachment, transform and generated initial geometry hash, then checks seam alignment after a short solve. Undo/redo should remain stable under avatar morph and viewport view changes; camera navigation should never dirty the manufacturing document. Preview ghost may be computed asynchronously, but commits need revision checks to discard stale geometry.

## 10. 3D pen and drafting on surfaces

**D.** CLO display controls expose 3D pen markings on avatars and avatar-tape/measure displays. [CLO 3D display toggles](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons). **E.** Implement surface strokes as `SurfaceCurve {id, surfaceId, anchors:[{faceId,barycentric}], interpolation, units, parentPattern?, semanticRole}`. Convert pointer rays to mesh hits and store the surface point in triangle barycentrics so strokes follow avatar pose. Smooth stroke by optimizing geodesic curvature with constrained endpoints, not by merely interpolating projected screen pixels. Maintain explicit states for missing faces after avatar remesh and show broken references.

**E.** For “draw 3D then develop 2D,” define a flattening operation that is either a geometrically valid near-isometric patch (report distortion) or user-approved shaped pattern with darts/seams. In general a doubly curved avatar surface cannot flatten exactly without distortion, so promise quantified residual rather than zero-error mapping. Tests: draw around shoulder, cross mesh face boundary, undo, animate elbow, export reference line on garment, and compare 3D source line length to developed 2D line length.

## 11. Reference guides and precise anatomical rulers

**E.** Support center-front/back, chest, underbust, waist, high hip, hip, shoulder slope, elbow, wrist, knee, inseam and user-defined guides. A circumference guide is the ordered intersection of avatar mesh with a calibrated anatomical plane; stitch open polyline fragments into closed loops with tolerance and assign side/projection. An outline drawn over the front camera view is not an anatomical circumference. Geodesic guides use mesh shortest paths or heat-method approximation with reported discretization error. Capture guide source, avatar revision and measurement definition.

**E.** Overlay depth is policy driven: silhouette/occluded dotted segments; on-surface marks depth-tested; labels projected with anchor-to-label leader lines. At glancing camera angles labels remain legible; behind-body labels fade instead of claiming to lie on the front. Verify rotated avatar, transparent skin, dense seam overlays and perspective/orthographic projection. Guide styles must remain identical in snapshots and exported measurement reports.

## 12. Symmetry and mirror correspondence

**E.** Mirror pairs should be identified by persistent counterpart IDs rather than names ending left/right; CLO documents a naming convention (**D**) but EXO should store explicit links for reliability. Pattern geometry can be symmetric while body placement differs due to asymmetric postures, so mirror geometry and mirror placement are independently selectable. For reflection `M`, transformed winding changes: face indices, material normals, seam start/end, notch parameter t and twist direction need reconciled mappings. Mirror across a calibrated avatar midsagittal plane rather than world X=0 if the avatar is offset or rotated.

**E.** Test a mirrored sleeve with asymmetric notch, zipper tooth direction and printed grain arrow. After duplication and flip-wrap, seam pair identity and 2D printing must remain consistent; a seemingly correct 3D silhouette does not excuse reversed factory metadata.

## 13. Sewing semantics and colored correspondence

**E.** A sewing relationship is a topological association, not a collection of decorative viewport lines. Canonical `SeamPair{id, a:{panelId, edgeId, t0,t1}, b:{...}, orientation, operation, easeDistribution?, seamAllowanceRefs[], constructionOrder}`. Parameterize each edge by rest arclength `s∈[0,L]`; store sampled sewing correspondences `f(s_a)=s_b`, which may represent gathering or easing, and validate monotonicity except at explicitly declared folds. In 3D draw sampled paths directly on deformed mesh using barycentric edge attachment, plus direction arrows, start and end identifiers and precise gap labels. The 2D board and 3D scene must share one seam ID and one deterministic color palette derived from a stable ID hash.

**E.** For elastic ease, define `r=(L_a-L_b)/max(L_a,L_b)` but report local material and grain direction too. Thresholds must be fabric/process specific; 4% ease may be acceptable in one seam and impossible in another. The overlay must distinguish seam adjacency, planned matching point and current physical separation. UX: clicking a magenta seam in 3D highlights precisely the corresponding 2D curve segment and operations ledger; deleting its source edge invalidates that seam with an actionable error.

## 14. Trims, seam allowance and construction hierarchy

**E.** Represent cut edge, stitchline, foldline, edge allowance and trim anchors as separate typed geometries. Seam allowance changes the cutting contour; topstitch is construction information; binding contributes physical layers; zipper hardware includes tape, teeth/pull, endpoints and a sewing operation. For industrial correctness every attachment references stable edge or surface geometry and process parameters, not just world coordinates. Three-dimensional display must not replace deterministic pattern construction metadata.

**E.** Model garment assembly as a DAG of operations, with physical activation ordering: seam closure, topstitch, overlock, adhesive, pressing, trimming and post-process shrink may change stress and drape. Early preview can approximate these effects but must mark which operations are simulated. Regression includes a curved zipper following nonplanar seam, an anchored button that persists across remeshing, and a turned collar with correct front/back material side.

## 15. Difference between strain, stress, tightness and pressure

**D.** CLO documents four distinct fit maps: stress (kPa), strain (%), categorical fit and avatar contact pressure, with distinct user-facing definitions. [CLO garment fit maps](https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps). **E.** EXO should avoid turning one extension estimate into all four. For each fabric triangle, form rest tangent basis `D_m=[u_1-u_0,u_2-u_0]` in material coordinates and deformed basis `D_s=[x_1-x_0,x_2-x_0]`; `F=D_s D_m^{-1}` (3×2). Compute `C=F^T F`, Green strain `E_G=(C-I)/2`, stretch along unit warp/weft vectors as `λ=√(a^T C a)`, engineering extension `(λ-1)×100%`. Reject singular/near-zero rest triangles; use material coordinates, never guessed screen orientation.

**E.** Stress requires an identified constitutive law and measured parameters. A simple orthotropic membrane approximation uses `σ=C_mat:ε` with material-specific nonlinear tension and shear; accurate values need lab calibration (e.g., low-load extension, bending, shear and hysteresis). Contact pressure `p=N/A` requires physically meaningful normal contact force N and contact area A, including discretization assumptions; a point count or penetration depth alone is not pressure. Fit categories need body-region, ease, stretch and wearer-validated discomfort thresholds; otherwise show `unvalidated fit heuristic`, not clinical certainty.

## 16. Numerical diagnostics and legends

**E.** Each map reports `{kind, units, meshRevision, solverRevision, validity, scaleMin, scaleMax, perFaceValues, sourceParameters}`. Use a fixed quantitative legend for reproducibility and optionally a fabric-relative legend for design iterations. A color gradient without the numeric domain and method is scientifically ambiguous. Retain discontinuities across material boundaries and show precise per-triangle probes on click: warp stretch, weft stretch, shear, principal stretches and confidence. If the solver does not expose stress or forces, offer only strain/extension and an explicit unavailable state.

**E.** Compare triangle-level predictions under tensile uniaxial and pure shear analytical cases; assert zero strain on exact rigid transform, homogeneous stretch `λ=1.10` reads +10% in loading direction, and no NaN from inverted or degenerate elements. Pressure probe must integrate over known area and report force conservation in a simple loaded contact patch. Colors never enter the physics solver as data.

## 17. Manufacturing POM measurements

**E.** Points of measure (POM) belong to a typed `MeasurementDefinition` with target garment size, measuring posture, flat/on-body state, endpoints or landmarks, pathway (`straight`, `surface`, `seamwalk`, `circumference`), allowance treatment and tolerance. The same named chest width can mean flat half-girth or around-avatar circumference, and must not be conflated. Factory POM records include target, measured sample, absolute/percent difference, allowable range, operator, date and revision.

**E.** Build POM evaluation against canonical pattern edges and/or deformed garment mesh; after every topology edit remap anchors or invalidate them. Seam walking integrates cubic edges with adaptive quadrature, not chord sums at arbitrary render sampling. A production review should display pattern size, measurement recipe, nominal value, tolerances, fit sample and unresolved exceptions in one auditable report.

## 18. Material cards and calibration

**E.** `FabricCard` holds areal density (kg/m²), warp/weft extension curves, biaxial response, shear law, bending stiffness in two directions, thickness, compression, friction, damping, shrinkage and environmental condition; each measured property states test method, specimen dimensions, conditioning, supplier lot and confidence interval. Visual PBR, normal maps and woven texture frequency belong to a separate appearance card linked by material ID. Matching screenshots cannot establish physical parity.

**E.** Proposed calibration: collect repeated force-extension data across warp/weft/bias, bending cantilever data, fabric-fabric and fabric-skin sliding, sample panel drapes, and optical marker trajectories. Fit parameters with bounded optimization `min_θ Σ_k w_k ||observable_sim(θ)-observable_lab||² + λ||θ-θ_prior||²`; use held-out specimens for predictive validation to avoid parameter overfit. Material card hashes are mandatory in performance comparison.

## 19. Numerical fabric model and fidelity tiers

**E.** Runtime choices should reflect validated accuracy/runtime tradeoffs: membrane stretch/shear triangles and discrete shell bending, contact and explicit sewing constraints. A thin-shell energy is `Π(x)=Σ_f A_f^0 W_mem(F_f)+Σ_e L_e^0 W_bend(θ_e-θ_e^0)+E_seams+E_contact+E_gravity`; solve with a stable implicit method for high-quality fitting and optionally accelerated projective/XPBD preview with physically interpretable compliance mapping. Explicitly document that PBD compliance changes with time step and iterations unless corrected.

**E.** For quasi-static fit solve `∇Π(x)=0` with robust line search and convergence checks on residual force, maximum displacement and constraint violation. For dynamic motion integrate inertia and damping with substeps; contact robustness requires conservative collision detection, friction stabilization and careful self-collision handling. Implement coarse-to-fine mesh continuation; report any fabric bias caused by triangles aligned with warp differently. A fast mode and a reference mode must share material metadata and disclose numerical differences.

## 20. Collision, clearance and assembly stability

**E.** Pre-simulation validity tests evaluate minimum signed avatar clearance, triangle normals, garment self-intersection and seam partner distance. During solve, use continuous collision detection or conservative substeps for fast motions; combine broad phase spatial BVH with narrow phase vertex-face and edge-edge events. Contact forces integrate thickness offsets; robust iterative solvers must handle near-parallel triangles and meshes initially intersecting. Never silently resolve an impossible initial overlap by massively displacing a garment without recording the correction.

**E.** Define metrics: max penetration (mm), intersection count, contact impulse/area validity, open-seam distance distribution, solver residual, energy change and divergence flag. A no-friction preview may be acceptable in exploration, but needs labeling in fit artifacts. Challenge tests: narrow armhole, waistband wrapping torso, layered pocket, crossed sleeves and compression foam over a curved body.

## 21. DXF-AAMA, DXF-ASTM and dimensional fidelity

**D.** CLO explicitly supports DXF-AAMA, DXF-ASTM and standard DXF for importing/exporting pattern geometry and notes units, annotation, grading and seam allowance handling. [CLO DXF import/export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export). **E.** EXO should distinguish a DXF carrier of drawing primitives from apparel-specific semantic layer/content mappings. Use a documented vendor-neutral internal graph: `PatternPiece → ClosedCutline, SewLine, InternalLines, Notches, DrillHoles, Grainline, Labels, SeamAllowances, SizeVariants, RuleTables`. An entity may be geometrically valid yet semantically incorrect for a factory import profile.

**E.** Build importer stages `parse → explicit unit normalization → typed geometry → topology validation → apparel semantic mapping → report`, and reverse export with destination profiles. Export round-trip invariants: signed area, perimeter, canonical vertex chain within metric tolerance, notch station, drill-point distance, grain arrow orientation, seam allowance profile and graded size association. Supply conversion warnings for unsupported custom curves and use tessellation with Hausdorff error bound, e.g. ≤0.10 mm for an initial engineering target that manufacturers may tighten. Compare files in at least two independent CAD readers before calling interoperability production ready.

## 22. Grading and avatar size sets

**E.** A graded pattern should be derived from stable base topology and per-anchor rules, not independently redrawn arbitrary vertex sets. Store `GradeRule {basePointId, sizeCode, Δx_mm, Δy_mm}` plus curves and linked notches. Evaluate sizes then validate that all grading profiles preserve seam associations; an underarm point shifting differently across adjoining panels can create inconsistent sewing lengths. Scale avatar body dimensions with explicit anthropometric target data and independently assess fit per size.

**E.** Test at least five size codes, petite/tall variants and an asymmetry case; measure step increments, grade rule round-trip and seam mismatch. Product range fit evidence cannot be extrapolated from medium sample without validation. For DXF exchange, record whether grading information is embedded or exported as accompanying rule file, matching chosen destination profile.

## 23. Scene graph and data contract

**E.** Suggested serializable envelope:

```ts
type GarmentDocument = {
  schemaVersion: number; units: 'mm'; revision: string;
  pieces: PatternPiece[]; sewings: SeamPair[];
  avatar: { assetId: string; meshHash: string; poseId: string };
  arrangement: ArrangementState[];
  fabrics: FabricCardRef[]; measurements: MeasurementDefinition[];
  manufacturing: { sizeSetId: string; processes: Operation[] };
};
type ArrangementState = {
  panelId: string; avatarRegionId?: string; surfaceAnchor?: SurfaceAnchor;
  transform: { translationM: [number,number,number]; quaternion: [number,number,number,number] };
  wrap: { direction: 1|-1; method: 'flat'|'cylinder'|'surface'; offsetM: number };
  sourceRevision: string; validatedInitialPositionsHash?: string;
};
type SimulationRecord = {
  runId: string; documentHash: string; solverVersion: string;
  materialHashes: string[]; avatarHash: string; meshHash: string;
  timestepS: number; convergence: Diagnostics; precision: string;
};
```

**E.** Immutable geometry revisions allow stale async simulation results to be rejected. Store only authoritative data and deterministic references; render buffers, GPU resource handles and hover ghosts stay derived. Migrations must map seam edge identities explicitly, and failed migration must retain raw source plus validation errors instead of silently dropping constraints. Persist camera settings separately from manufacturing revision.

## 24. Performance engineering and reproducible benchmarks

**E.** Instrument at least: import time, arrangement hover latency, placement solve latency, warm BVH query time, cloth solver ms/substep, render ms/frame, peak RSS, GPU memory, draw calls, garbage-collector pauses, export time and round-trip error. Suggested initial targets, which are engineering proposals rather than measured EXO results: hover response p95 under 50 ms on a defined reference Mac; editor input-to-render p95 under 100 ms; simple 50k-triangle preview at ≥30 fps on named hardware; a 250k-triangle high-quality solve measured by seconds-to-convergence instead of FPS. Quality must gate every speed comparison.

**E.** Benchmark matrix: triangle counts 5k/25k/50k/100k/250k, avatars 20k/100k/500k triangles, one/four/twelve garments, zero/one/ten trim collections, cold/warm cache, rest/animated pose and mixed fabric stiffness. Run 10 warmed replicates after a separate cold-start measurement; report median, p95 and IQR. Hash inputs and retain traces. Optimize repeated `preDrapeDisplayPositions` avatar traversal with per-pose spatial indices if profiling justifies it; avoid per-snapshot rebuilding of topology and line correspondence.

## 25. Validation suite, manufacturing release and differentiators

**E.** Test pyramid: analytical geometry (circle circumference, rigid transform), property-based topology (orientation, closed cutline, invariant edge IDs), simulation unit cases (uniform strain, gravity sag, bending strip, seam joining), integration (avatar wrap → sew → simulate → measure → export → import) and factory correlation (physical sewn sample). Calibrate scanner and measuring tape errors and calculate 95% confidence intervals for garment POM prediction. Report both signed bias and absolute error; selective use of visually favorable angles does not count as scientific comparison.

**E.** Potential competitive innovation: explainable geometric placement showing surface contact, clearance and seam alignment before simulate; error-aware fit maps with physics provenance; editing 2D and 3D as one dependency graph; automatic cutline/DXF validation against factory rules; and per-size manufacturability reports. These are design hypotheses. A measurable claim of superiority would require preregistered benchmarks and blind users comparing task completion, fabric fidelity and factory import error with target versions of CLO and Marvelous, on the same hardware and fixtures.

## 26. Browzwear VStitcher: multi-size engineering reference

**D.** VStitcher documents a 3D Review workspace with parallel views of garments, sizes and avatars, including pressure-map variation between sizes. This is a strong benchmark for a manufacturer's ability to discover fit differences invisible in a single-size model. [Browzwear 3D Review Workspace](https://help.browzwear.com/en/articles/13065807-3d-review-workspace). **D.** Browzwear documents automatic simulation of multiple sizes in VStitcher 2026.1.2 and improvements to DXF; [VStitcher release notes](https://help.browzwear.com/en/articles/14794274-vstitcher-2026-1-2-release-notes). **D.** VStitcher also documents independent arrangement controls per size or linked arrangement across size sets; [2023.2 release notes](https://help.browzwear.com/en/articles/13065198-release-notes-vstitcher-2023-2-pre-release). **D.** Direct grade-point editing on non-base sizes is documented from VStitcher 2025.2; [grading article](https://help.browzwear.com/en/articles/13065373-edit-non-base-size-while-grading).

**E.** EXO should model fit evaluation as a matrix `(patternSize × avatarBody × pose × materialLot)`, not a single hero render. A simulation run has immutable keys for each matrix coordinate, and a comparison view shares a camera and normalized diagnostic legends across cells. Each map has a display scale locked across sizes; auto-rescaling each panel's red/blue values could hide worsening tightness. Include an automatic matrix summary with POM error, p95 warp/weft stretch, max seam gap, contact-normal pressure percentile and non-wearable classification when those quantities have validated definitions. Build a multi-size scheduler that deduplicates shared pattern and avatar assets, uses bounded concurrency and reports failure per size without discarding successful runs.

**E.** Benchmark test: simulate XS through 2XL against matched avatars; change one shoulder-grade rule, rerun affected sizes, assert untouched sizes reuse valid cached artifacts and every visible fit-map cell identifies its fabric and solver run. Comparative evaluation should measure the number of incorrect sizes detected before a physical sample, rather than simply counting how many models can be rendered side by side. **U.** No multi-size solver matrix or equivalent VStitcher 3D Review implementation was verified in the EXO code paths inspected in this report.

## 27. Browzwear physical fabric measurement and diagnostic units

**D.** Browzwear documents its Fabric Analyzer as collecting the full force-extension curve and translating measurements into parameters for mass, thickness, bending, stretch and shear. The official description does not establish the proprietary conversion equations. [Fabric Analyzer manual](https://help.browzwear.com/en/articles/13065916-fabric-analyzer). **D.** The VStitcher tension map shows a legend in gr/cm², color-coded tension, and hover readouts for maximum stretch in length and width. [Tension map](https://help.browzwear.com/en/articles/13854342-tension-map). **D.** Its pressure map shows body-pressure visualization and can be reviewed per animation frame. [Pressure map](https://help.browzwear.com/en/articles/13854350-pressure-map).

**E.** EXO should build an open calibration protocol that accepts CSV curves from verified lab instruments and exposes how fitted coefficients depend on the measurements. Raw force data should store N, extension ratio or mm, sample width and gauge length, direction, preconditioning cycles and replicate ID; a curve in N must not be interpreted as material stress until the cross-section/width convention is defined. Use units-aware conversion with explicit dimensions: `N/m` is fabric membrane tension, `Pa=N/m²` is 3D Cauchy stress, and `N/m²` from contact normal forces per surface area is contact pressure; these are distinct quantities. If comparing to VStitcher displays using gr/cm², document its stated scale verbatim and avoid assuming whether “gr” denotes gram-force without further vendor clarification.

**E.** Publish a fabric calibration coverage score: count required measurements, directional anisotropy observations, hysteresis replicates and confidence limits. On a blind drape holdout, report displacement RMSE and 95th-percentile silhouette error across several poses. Performance gains count only if the same calibration record is used. **U.** The inspected EXO UI reports extension but is not verified to consume instrument-grade fabric curves or yield a calibrated pressure map.

## 28. Optitex: pattern production and fit visualization

**D.** Optitex's official products page describes 2D/3D garment workflows, multiple layers/gathering simulation and an XY tension map in PDS. It also describes stretch and unique-color maps for side-by-side fit review in OPTINEDCloud. These are product-described capabilities; marketing statements such as “95% Accuracy” have unspecified dataset, error metric and test conditions in the cited page and must not be treated as scientific validation. [Optitex products](https://optitex.com/products/).

**E.** Adopt Optitex as an additional interoperability and 2D production benchmark: execute the same reference pattern through EXO and a licensed Optitex environment with units, seam notches, drill marks, annotations, grading and per-size cutlines checked. A tension visualizer must state whether it combines X/Y strain, material membrane force or another scalar, and must give a mathematically defined reduction from the directional tensor. EXO's potential improvement is simultaneously showing signed warp/weft stretch, shear and pressure without hiding directionality behind a single “XY tension” value. This is a proposed comparison, not a claim that Optitex lacks other analysis tools.

**E.** A vendor-neutral test corpus should contain source DXF-AAMA/ASTM files produced by multiple CAD systems, factory-verified pattern drawings, expected area/perimeter/notch positions and tool-version screenshots. Maintain source ownership and redistribution rights. **U.** No live Optitex import or direct Optitex-to-EXO fit correlation was performed in this audit.

## 29. Four-product competitive evaluation protocol

**E.** Compare CLO, Marvelous Designer, Browzwear VStitcher and Optitex on the same physical T-shirt, fitted trousers, padded jacket and asymmetrical technical garment. Keep identical raw body scan, body landmark definitions, 2D master CAD, fabric test specimens, calibrated camera poses and constructed sewn garments; adapt exchange features only when the application's documented importer requires it, and record all adaptation. Each run should identify exact installed version and hardware.

| Dimension | What to test | Ground truth / scoring |
|---|---|---|
| Arrangement UX | First reliable avatar placement of 12 panels | Blind operator task time, wrong-side events and placement corrections |
| Multi-size fit | Five patterns against matching avatars | Per-size POM bias and pressure/strain differences, where calibrated |
| Fabrics | Warp/weft/bias and multi-ply drape | Lab force curves, hanging silhouette scans, bending strip |
| Manufacturing | Notches, SA, grade, drill points, annotations | Factory approval and CAD round-trip residuals |
| Stability | Fit, move, undo, resimulate, save/reopen | Failure rate, mismatched IDs and unexplained model changes |
| Speed | Full model to validated convergence | Elapsed time and error at fixed workstation/mesh settings |

**E.** Collect at least three operator repetitions per workflow and multiple independent cloth samples where possible; preregister acceptance tolerances with a technical patternmaker. Track uncertainty from sewing variation, material batch and avatar scan. Without this common evidence, benchmark claims remain qualitative and cannot establish that EXO predicts manufacturing fit better than its competitors.

### Prioritized implementation work packages

| Package | Dependencies | Deliverable | Release evidence |
|---|---|---|---|
| P0 canonical coordinates | Geometry + avatar schema | SI transforms and ID-stable frames | Mirror/unit/orientation tests |
| P0 arrangement anchors | BVH + landmarks | Anatomical hover, placement and curved initial geometry | Reload and zero-penetration suite |
| P0 seam visualization | Canonical seam IDs | Both viewports share colored arclength mapping | Reversed/eased seam acceptance |
| P0 actual solver handoff | Arrangement + contact | Initial positions committed into physics, validity report | Before/after energy and gap logs |
| P0 honest fit outputs | Material + solver telemetry | True strain and physically derived stress/pressure where available | Analytical tests, calibration specimens |
| P0 factory exchange | Stable pattern topology | DXF-AAMA/ASTM profiles + round-trip reports | Independent importer and tolerance audit |
| P1 measurement guides | Calibrated avatar/garment references | Body guides, surface tape, POM definitions | Repeated measurement variability |
| P1 grading and production | POM, notch, seams | Multi-size handoff and tech pack provenance | Five-size sample inspection |
| P1 performance | Profilers + deterministic fixtures | Optimization with reproducible speed/fidelity plots | Hardware-named p95 results |

### Official documentation references

1. CLO: [Avatar Editor Guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide).
2. CLO: [Add Arrangement Point](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).
3. CLO: [Add/Edit Bounding Volume](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).
4. CLO: [Arrange Pattern with Arrangement Points / Flip Wrap](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).
5. CLO: [Automated Arrangement Point Creation](https://support.clo3d.com/hc/en-us/articles/360001749467-Automated-Arrangement-Point-Creation).
6. CLO: [File Formats](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats).
7. CLO: [3D Vertical Toggle Icons](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).
8. CLO: [Garment Fit Maps](https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps).
9. CLO: [How do you fit 3D Garments](https://support.clo3d.com/hc/en-us/articles/115013660447-How-do-you-fit-3D-Garments-in-CLO).
10. CLO: [2D Pattern DXF Import/Export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export).
11. Marvelous Designer: [Avatar Editor](https://support.marvelousdesigner.com/hc/en-us/articles/47358128221337-Avatar-Editor-ver-2025-0).
12. Marvelous Designer: [3D Window Display Icons](https://support.marvelousdesigner.com/hc/en-us/articles/47358200025497-3D-Window-Display-Icons).
13. Marvelous Designer: [Auto Sewing](https://support.marvelousdesigner.com/hc/en-us/articles/47358149073305-Auto-Sewing-Ver-2025-0).
14. Browzwear: [3D Review Workspace](https://help.browzwear.com/en/articles/13065807-3d-review-workspace).
15. Browzwear: [Multiple-size simulation release notes](https://help.browzwear.com/en/articles/14794274-vstitcher-2026-1-2-release-notes).
16. Browzwear: [Fabric Analyzer](https://help.browzwear.com/en/articles/13065916-fabric-analyzer).
17. Browzwear: [Tension Map](https://help.browzwear.com/en/articles/13854342-tension-map) and [Pressure Map](https://help.browzwear.com/en/articles/13854350-pressure-map).
18. Optitex: [Products and features](https://optitex.com/products/).

**Audit limitations:** The cited vendor manuals establish observable workflow capabilities, not proprietary algorithm specifications. All equations and thresholds labeled **E** are engineering proposals requiring prototype implementation, measured calibration and factory acceptance. EXO evidence labeled **V** is static code inspection on a dirty concurrently changing tree, not a certified system-level test.

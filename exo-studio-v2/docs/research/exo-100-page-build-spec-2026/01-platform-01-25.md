## Page 01 | EXO platform build contract

**Product outcome.** Deliver one EXO platform in which an authored garment moves through technical design, grading, verified exports, manufacturing collaboration, physical samples, virtual presentation and real photo-shoot production. A source garment remains editable on the user's machine; downstream workspaces reference named immutable revisions. This contract covers a native macOS editor, a secure browser collaboration service, a manufacturer portal and a virtual-to-real Photo Studio.

**Explicit product boundary.** Design geometry and production instructions are different approval domains. A factory can discuss, upload evidence and propose changes, but cannot silently rewrite released pattern geometry. A photographer can move lights, cameras and props without modifying the approved garment. An AI agent may execute a scoped, reversible command only when its target IDs and preconditions match the current source. The platform must disclose incomplete grading, export compatibility, material calibration and physical-fit evidence.

**Initial reference system.** The existing EXO React/Vite experience includes measurement generation, factory-package exports, basic costing, production checks and stage/render settings. V2 also operates a native Rust cloth and pattern workflow. Current project documentation warns these two editable representations are not yet fully unified. The build first introduces a checked canonical snapshot contract; portal and studio work depend on that milestone.

**Acceptance and exclusions.** The baseline demonstration uses a four-piece tee and a multi-panel hoodie with real named edges, size sets, fabric, trim, artwork and at least two source revisions. A manufacturer can inspect R01, annotate a size-specific cuff issue and obtain R02 after approval. A producer can generate eight virtual shots and a scaled physical set plan. All outputs retain source IDs and hash provenance. This specification does not approve deployment, certify physical fit or presume a factory has accepted EXO files.

<!-- PAGE -->

## Page 02 | Scope, user roles and job outcomes

**Roles and tasks.** A designer needs flexible 2D/3D authoring and presentation. A professional patternmaker needs numerical tools, stable grading rules and construction checks. A technical developer needs measurements, tolerances, trim data and factory-ready release controls. A factory contact needs a readable specification, question threads, sample entry and controlled proposed changes. A producer and photographer need shot references, physical dimensions, lighting positions, gear lists and timing. An administrator manages access without gaining automatic design approval authority.

**Workspace composition.** The product exposes Design Studio, Production Studio, Factory Hub, Photo Studio, Library and a shared Style Overview. Each workspace has purpose-specific tools but the same selected style and source revision. Library contains approved patterns, physical and visual fabric profiles, trims, stage sets, camera rigs and recipes with provenance. The Overview shows open sample questions, revision alerts, pending approvals, source status and planned shoots; it must never show sensitive factory data to the wrong organization.

**System-of-record decisions.** Canonical garment engineering lives in a versioned source snapshot derived from the native/design adapters. FactoryRelease is a signed frozen document set. ShootRevision contains editorial decisions. The backend owns accounts, invitations, comments and approvals, while the desktop application continues to own local interactive geometry. Every action has an actor and timestamp; every artifact has a checksum and access classification.

**Out of scope for first release.** Do not promise vendor-neutral fit certification, a replacement for every industrial cutter, legally binding digital signatures in every jurisdiction, automated factory purchasing, public access to proprietary grading, or exact reproduction of real flash illumination from virtual watt values. These may become later features after experiments and specialist review. The first outcome is a coherent traceable workflow that saves teams from wrong versions and repetitive document changes.

<!-- PAGE -->

## Page 03 | Success metrics and nonfunctional requirements

**Manufacturing success.** Measure time to prepare an approved tech pack; source-to-DXF graded-coordinate error; count of unresolved sew and cut warnings at release; time for a factory question to reach an assigned technical owner; fraction of sample issues attached to a POM, seam or trim ID; rate of wrong-version file use; and ability to reconstruct an old release. Baselines must be recorded before promising efficiency gains. “PDF generated” is not a manufacturing acceptance metric.

**Photo success.** A creative team should assemble an eight-shot board from one existing garment and stage preset, save/reopen camera and light values exactly, generate low-resolution contact sheets, render an approved still and export a metrically annotated real studio plan. Compare actual shoot setup to planned positions and log differences. The demo should distinguish a virtual-only stage element from a physically procurable stand, reflector or backdrop.

**Reliability targets.** All authoritative mutations must be durable, attributable and reversible through a new compensating edit. Avoid silent last-write-wins in POM and release fields. A job retry must not create duplicate releases or charge for identical render tasks twice. Clients reconnect after disconnection and reconcile events by sequence. Every tenant-scoped read must authorize the exact target, including nested attachments and image thumbnails.

**Performance policy.** UI viewport response, 3D frame rates, simulation step latency, DXF export time, preview rendering and remote portal p95 latency receive separate workload benchmarks rather than one global “fast” claim. Use measured typical/complex fixture garments and Mac hardware profiles. A production render runs in an explicitly requested, cancellable job with resource budget; opening a shoot cannot silently start heavy GPU work.

**Release gate.** A version is shippable only after regression on saved project recovery, 2D/3D source parity, role isolation, release hash reproduction, simulated corruption and network failure, real graded export import and at least one real photographer/factory pilot. Publish which tests passed and which remain unverified.

<!-- PAGE -->

## Page 04 | Current architecture audit and protected boundaries

**Reusable modules.** `src/core/measurements.js` computes technical measurement data, `src/core/factoryPackage.js` assembles structured factory outputs, `src/core/productionCost.js` provides fabric-only estimates, and `src/core/productionPreflight.js` checks structural failures. `src/data/stagePresets.js` records twenty original stage concepts; `src/App.jsx` exposes Render controls. Native Rust garment authoring is bridged by `integrations/clothcraft/`. Existing capabilities are starting points, not proof that a multiuser manufacturer website or scalable Cycles job service is operational.

**Preservation policy.** Treat the existing V1 worktree, V2 installed app and saved V2 garment as protected user assets. Prototype on branch-isolated code or test fixtures with disposable backend ports, databases and asset directories. Never migrate or overwrite the live garment just to demonstrate a new schema. Capture pre-migration file hashes and reversible backups. A long-running render process must not interfere with the live native garment editor or user's stored session.

**Adapter gap.** Native ClothCraft's template and broader EXO draft project can render a similar shape yet contain different authoritative fields. Build an explicit field-by-field map covering panel vertices/edge IDs, seam graph, units, grading, fabric physical properties, appearance, trims and source revision. Mark unrepresented data as unsupported. An unknown field can survive transport, but an unknown critical manufacturing field should block release until reviewed.

**Audit deliverable.** Produce an inventory listing every relevant existing module, its public interface, current tests, exact output shape, source ownership and known limitations. For each planned screen or API, label implementation status as reusable, needs adaptation, new, or blocked. Validate assertions through source and disposable integration tests. A decorative UI element cannot be marked implemented solely because it appears in a toolbar.

<!-- PAGE -->

## Page 05 | Canonical garment object model

**Root schema.** Define `GarmentSnapshot` containing `schemaVersion`, `styleId`, `garmentRevisionId`, `parentRevisionId`, `sourceSystem`, `sourceHash`, `canonicalUnits`, `createdAt`, `authorId` and typed arrays or references for pieces, sew links, grading, size set, measurements, trims, graphics, fabrics and accepted 3D presentation assets. A `PatternPiece` contains stable ID, contour, edge definitions, internal markings, notches, allowance rules, grain direction, material assignment and cut quantity.

**Identity preservation.** Never use list position or display label as an entity key. Each editable anchor retains an ID across dimensional changes; topology-changing split/merge operations publish an ID migration map or explicitly invalidate dependent comments and construction links. A `SeamAssembly` stores two named boundary intervals, orientation, intended ease and attached sewing recipe. A `GradeRule` stores independent XY motion relative to a known base size or a named formula. Every physical measurement specifies a dimension and units.

**Authority metadata.** Values must identify whether they were entered by designer, calculated from geometry, measured on physical sample, imported from supplier, approved or estimated. Do not reduce those categories to one scalar. A render material can cite an appearance texture and an independent tested mechanical profile; similar-looking fabrics are not physically interchangeable.

**Serialization and validation.** Use a published JSON Schema, deterministic numeric encoding/rounding policy, explicit reference integrity and a monotonically versioned migration path. Reject nonfinite coordinates, undefined required IDs, broken seam references, cycles in parameter graphs and unsupported mandatory fields. Keep hash checks for source geometry and attachment manifests. The canonical snapshot must load without silently normalizing real dimensions or reordering grade size labels.

**Proof fixture.** Export tee + hoodie from current EXO models, independently parse them, save/reopen and compare all labeled points, seam references, fabric IDs and meaningful measurements. The adapter reports coverage by field group before either fixture becomes publishable.

<!-- PAGE -->

## Page 06 | Draft, garment and release revision graph

**Three independent revisions.** `GarmentRevision` represents authoritative pattern and construction source. `FactoryRelease` pins one garment revision plus a reviewed tech-pack specification, production files and approval signatures. `ShootRevision` pins a visual asset derived from the garment along with camera, light, set, styling and schedule. Changing exposure cannot update a factory release. Changing the sewing of a collar can invalidate both a draft factory release and virtual-shoot renders without changing their already approved historical snapshots.

**Mutation protocol.** Every edit sends `expectedRevision` and a narrowly scoped operation. The server or local editor validates the revision, target entity IDs, capability and invariants before committing. Concurrent conflicting POM updates return an explicit conflict containing both proposed values and actor provenance. Free-text notes may use a collaborative editor, but numeric patterns, quantities, approval transitions and released content must use validated transactions.

**Content hashes.** A revision records canonicalized source JSON SHA-256 and hashes of associated immutable bytes. Derived outputs record their exact parents. If the same source produces a PDF with differing timestamps, distinguish a transport wrapper from the manufacturing payload hash. Never overwrite the file referenced by an approved release, even if a content-addressed storage object can be deduplicated internally.

**Change impact rules.** Map `edge changed` to seam walk, notch position, allowance contour, POM/size set, cut export and any source-anchored comment. Map `fabric changed` to mechanical calibration, marker width, shrinkage, BOM, costing and visual materials. Map `camera changed` only to shot preview/render and shoot plan. An impact engine is advisory until every dependency relation is tested; unknown dependencies create review tasks.

**Replay test.** Produce revisions G1–G3, issue F1 on G2, approve shot S1 on G2 and edit G3. Reopen F1 and S1 and assert the exact original content hashes and measured values remain. The Overview must show that each is linked to the older source.

<!-- PAGE -->

## Page 07 | Local-first desktop and connected web architecture

**Desktop boundary.** The V2 macOS app continues running native simulation and geometry operations locally for interactive response and privacy. Add a `SnapshotSyncService` that exports a validated normalized snapshot by explicit user action or saved draft policy. A remote browser must never call the user's localhost Rust port. Offline local authoring remains useful without a cloud connection; issuing shared factory releases and distributing partner assets requires authenticated synchronization.

**Backend shape.** Start with a modular TypeScript API, PostgreSQL transactional store, content-addressed object storage and a durable job queue. Modules include identity, organization, style/revision, factory release, comments/proposals, samples/orders, media, shoots/renders, notifications and audit. Favor a modular monolith for the first partner pilot; stable APIs can later support independent services if operational evidence warrants scaling.

**Synchronization states.** `LOCAL_DIRTY`, `VALIDATING`, `READY_TO_SYNC`, `UPLOADING`, `SYNCED`, `CONFLICT`, `REJECTED` and `OFFLINE` are visible to the author. The sync client uploads immutable blobs first, then commits metadata transactionally with `expectedParentRevision`. It may retry using an idempotency key. Conflicting revisions are reconciled through a user-visible compare rather than silently choosing newest clock time.

**Storage and data boundaries.** Store mesh/texture/render binaries outside relational rows; record MIME type, bytes, checksum, source rights, moderation or malware scan status and tenant owner. Never expose raw unpublished fabric price or pattern geometry in public search indexes. Read-only published asset derivatives require sanitization at the bytes/metadata level, not merely hidden UI controls.

**Acceptance.** A user edits locally while disconnected and reopens without data loss. On reconnect the client syncs a new draft, handles stale parent conflict, and proves older published factory release bytes remain identical. A contractor's web account cannot infer existence of private drafts. Jobs continue to record progress when the originating browser closes.

<!-- PAGE -->

## Page 08 | Shared interface system and navigation

**Primary navigation.** A compact header selects style, source revision and workspace: Design, Production, Factory Hub, Photo Studio and Library. The active status always distinguishes local draft, synchronized draft, approved release and superseded artifact. Center viewport and docked inspectors retain EXO's usable dark CAD interaction style. Responsive collaboration views prioritize readability, accessible tables and clear approval actions over recreating every advanced CAD control in the browser.

**Object-centric inspector.** The same selection system can identify a pattern edge, material row, trim anchor, factory comment, shot camera or light source. The right inspector shows only controls allowed in that workspace and actor capability. Contextual jump actions move from a manufacturer question on a sleeve edge to its local 2D source, or from a product hero shot to the approved garment asset and fabric appearance profile.

**Global change indicators.** Persistent warnings show unresolved grade/cut blockers, stale factory-release drafts, missing fit evidence, unsynced local edits and shoot samples that are not yet physically available. A red issue has an actionable item ID, severity, owner and resolution path. Avoid vague “validated” badges when only structural checks passed. Never treat an approved studio composition as approval of all factory manufacturing data.

**Interaction standards.** Every toolbar item needs a real active state, enabled prerequisites, shortcut, numeric inspector and undo semantics where applicable. Hover behavior should appear consistently on keyboard focus and pointer hover across stages, hardware and materials. Dialogs preserve changed fields on validation error. Tables support keyboard navigation, batch selection, sorting and unit display without changing canonical values.

**Acceptance.** A tester can traverse the same hoodie from piece edge to POM row, release issue thread and hero shot, each still referring to the correct source revision. Guest and factory views omit forbidden navigation and data at the API level. Mobile users can resolve an assigned comment without relying on a 3D drag gesture.

<!-- PAGE -->

## Page 09 | Design workspace and tool behavior contract

**Authoring surface.** The native editor has coordinated 2D drafting and Rust-backed 3D garment panels. Tools include select, point/curve edit, edge split, internal line, dart, sew, notch, seam allowance, topstitch, graphic, hardware placement, panel transform and simulation manipulation. Every visible action must map to an implemented typed command, preview action, or a clearly disabled entry with an explanation. The user never receives a false “applied” message for an unsupported native operation.

**State ownership.** Pattern authoring modifies rest geometry with undo/redo history. Simulation operations modify a time-dependent draped state and need separate reset/recovery semantics. A user dragging a simulated sleeve must not silently alter pattern dimensions or the completed factory release. Editing a 2D pattern must preserve the garment's logical source IDs where geometry permits. Stage camera movements and fabric visual appearance belong to independent presentation state.

**Contextual validation.** An edge split invalidates or migrates attached sewing segments, notches, allowance rules and comments. Before commit, show the consequences or block the edit if they cannot be mapped safely. When fabric assigned in 3D, 2D drafting-piece fill stays neutral so pattern geometry remains legible; material color belongs to 3D appearance and material inspection. SVG graphics need exact panel placement with UV/deformation mapping and preserved image rights.

**Command API.** Each operation accepts `commandId`, `expectedTemplateRevision`, target IDs, canonical units and typed payload; responds with new revision, changed IDs, measured readback, warnings and an undo reference. Mutations are transactional: a failed native validation leaves the former template intact. Batch edits are either atomic or explicitly partial with per-command results and stable recovery point.

**Proof.** For every toolbar family, create at least one real interaction fixture and one invalid-input fixture on disposable native/web services. Verify geometry and history, screenshot changed state, save/reopen and assert no unrelated panel or project data changed. Build UI smoke checks that fail on inert controls.

<!-- PAGE -->

## Page 10 | Geometric coordinates, units and topology

**Coordinate contract.** Maintain local material-space 2D geometry in metres in the native canonical model, with explicit transform into browser drafting coordinates. The broader legacy EXO model may use centimetres, so adapters must convert by documented factor and test scale markers. All 3D stage/camera/light positions are stored in metres with a defined right-handed axis convention; translations and camera targets have explicit frame IDs. Never infer a coordinate unit from displayed decimal precision.

**Contours and edges.** A pattern piece stores vertex/curve identifiers, orientation, contours including holes, grain direction, internal guides, seam/cut boundaries and stable edge identities. Signed polygon area and winding must be consistently applied; an outward normal depends on winding and edge direction. Spline samples used for measurements should be deterministic under a documented tolerance and must not distort true geometry through display-only tessellation.

**Topology operations.** Splitting, joining, mirroring, unfolding and dart transformation alter relationship mappings. Each operation returns an ID migration or invalidation set for sewing, notches, graphics, POM anchors and comment attachments. For a mirrored piece, explicit handedness and orientation rules preserve seam-mate direction and fabric face. Importers must detect self-intersection, zero-length fragments, accidental duplicate edge IDs and invalid holes before release.

**Numerical policy.** Define edit tolerance, curve sampling tolerance, export tolerance and final acceptance tolerance separately. Use exact double-precision calculations where feasible and finite-value checks at all boundaries. Rounding for on-screen labels must not feed back into computation. A “1.0 cm” seam allowance should not shift after changing display to inches and back.

**Acceptance.** A known polygon with one Bézier curve, hole, two notches and allowance offsets survives save/open and unit conversion. The physical dimensions before/after adapter round-trip match within declared tolerance. A deliberately flipped polygon triggers an orientation diagnostic and an appropriately corrected outward offset, not inverted fabric cuts.

<!-- PAGE -->

## Page 11 | Parametric patterns, blocks and grading rules

**Drafting graph.** A parametric `PatternBlock` stores named body measurements, design-ease values, geometric construction nodes, equations, intersections, tangent handles, derived points and constraints. Each node has a stable ID, unit and dependency list. The graph rejects cycles, undefined measurements, nonfinite solutions and underconstrained or conflicting rules. A user can edit by direct manipulation and inspect the resulting formula, or edit a formula and see the affected outline; both paths operate on the same source.

**Grading modes.** Support point-based XY rules, cumulative offsets from the base and incremental per-size offsets, with explicit rule type and reference size. Multiple shape families (regular, petite, tall, custom waist/hip groups) remain separate size-set branches. Size labels are strings rather than numerical assumptions. A rule applies to a stable graded landmark, not the index of a vertex in a remeshed polygon. Curve shape and darts must be recalculated consistently across sizes.

**Reusable libraries.** Record block category, originating sample, target anthropometric assumptions, fit population, fabric stretch assumptions, grade table version, author and production evidence. Inheriting a base block does not automatically transfer a different fabric's shrinkage, collar shape or approved ease. A derived style should show which rules are inherited and which are overridden. Locking one point cannot silently shift another locked point to satisfy the same measurement.

**Diagnostics.** The grade inspector overlays the full size nest with named points, XY vectors, POM deltas, mirrored pairs and rule provenance. It flags seam incompatibility, reversed contours, non-monotone measurements where inappropriate, disappearing notches and ungraded critical features. Warnings cite size and point IDs and allow qualified exceptions with rationale, not an unconditional red badge.

**Acceptance.** Grade a fitted tee, trouser and multi-piece jacket from XS to 3XL. Compare rule vectors with independently calculated fixtures, regenerate each size twice without cumulative drift, round-trip grade files and report every missing correspondence. A source change must recompute derived sizes from the base and rules, never repeatedly transform an already transformed mesh.

<!-- PAGE -->

## Page 12 | Seam graph, edge correspondence and ease

**Core representation.** A `SeamAssembly` references two material-space edge intervals by piece and stable edge IDs, with start/end fractions, matching orientation, sewing direction, intended length/ease rule and operation type. Support partial seams, split edges, multiple attached panels, folded assemblies and loose unsewn boundaries. Attach a notch pair as a relationship instead of independent visual marks. Distinguish structural seam, bound edge, topstitch and a decorative mark.

**Seam walking.** Sample each matched interval by deterministic physical arclength. Report edge A/B length, mismatch in millimetres and percent, targeted ease distribution and notch alignment for every graded size. Use an explicit tolerance profile based on construction/fabric; a tailored sleeve cap can intentionally include ease, while a waistband joining pair may demand near equality. Do not force equal lengths by silently modifying approved patterns. Store a qualified exception where intentional gathers or shaping require mismatch.

**Editing rules.** A panel point move recomputes all seam calculations depending on its boundary. A split requires mapping old seam intervals onto child edges. Deleting an attached edge either blocks with a clear message or performs an explicit detached-seam transaction requiring confirmation. Changes to seam type update construction notes and any affected seam allowance/topstitch treatment. No feature uses a painted seam guide as proof the native solver physically sewed the panels correctly.

**UI contract.** Select a seam in 2D or 3D to view paired panels, endpoints, direction arrows, corresponding notches and size-by-size walk metrics. In 3D, simulation join/strain is a separate tab from authored seam metadata. A failure shows the exact two edge IDs, severity, target measure and a jump-to-source action. The user can preserve manually approved ease without muting unrelated warnings.

**Acceptance.** Move an armhole landmark in size M, regrade XS–3XL and verify the cap/armhole mismatch report changes by size. Undo returns all geometry and seam records. A deliberate wrong seam orientation must be detected before factory release, and a split with unresolved seam remapping must not leave a dangling connection.

<!-- PAGE -->

## Page 13 | Notch authoring and industrial seam allowances

**Notch schema.** Store `Notch { id, pieceId, edgeId, t, type, depthM, pairedNotchId }` where `t` is the fraction of sampled edge arclength and all physical depths are in metres. Validate 0 < t < 1, a finite positive depth and a valid edge. Marker geometry is derived from the directed contour and correct outward orientation. On grading, notch placement follows explicit grade or seam-match semantics rather than a blind unchanged percentage if the edge geometry changes.

**Allowance distinction.** An edge-offset guide is useful drafting feedback but is not a manufacturing cut line. The production implementation needs an independent closed cutting contour incorporating per-edge widths, butt/miter/round transitions, convex and reflex corners, darts, fold edges, holes, tapers and overlapping offset cleanup. Keep stitch contour and cutting contour separately named. Each width references edge ID and construction operation; display both contours with a measurable separation.

**Topology and export.** When allowances meet, resolve intersections with a robust planar geometry algorithm and reject invalid resulting polygons. Generate exact cut-piece area, orientation and bounding boxes. Layer mapping should preserve notch geometry, drill holes, grain, fold, internal lines and stitch/cut separation through the chosen DXF/plotter profile. If a destination format lacks a field, issue a visible loss report and require conscious acceptance.

**Native implementation phases.** Existing Rust authored notch/allowance work represents persistent markers and per-edge guides, according to the local source handoff. Before production readiness, benchmark the complete contour-generation kernel and connect command variants to the actual running adapter. Render a “draft guide” status until the full cutting contour passes independent geometry/round-trip tests.

**Acceptance.** Test rectangle, tapered facing, concave hoodie neckline, enclosed holes, dart tip and compound allowances at acute corners. Check watertight cut contours, notch foot/tip, expected topology, mm-accurate distances and grade-size round trips. Deliberately self-intersecting allowances must block cutting export rather than be silently visualized as valid.

<!-- PAGE -->

## Page 14 | Trims, hardware, graphics and engineered placement

**Attachment model.** A button, zipper, ring, buckle, grommet, rivet or patch is a `GarmentFeature` with stable ID, kind, panel/edge anchor, physical dimensions, supplier SKU when known, visual mesh, construction operation and trim BOM quantity. Appearance parameters and manufacturing specifications remain separate. A zipper has tape width, gauge, chain type, sliders, stops and physical opening length; an illustrative 3D puller alone does not satisfy those fields.

**Placement and constraints.** Surface graphics use a logical panel attachment, local UV coordinates, scale, orientation and source artwork ID. The renderer deforms the graphic along with the garment mesh, preserving authored print size in physical units. Moving the garment or switching to a graded size must not arbitrarily rotate the print. Image/vector upload requires content validation, rights/provenance, predictable transparency and a persistent asset reference. Printing annotations remain visible in factory technical flats.

**Hardware realism.** When a user selects a catalog buckle, the UI displays actual dimensions, finish and supplier data if available; unknown properties are labeled. A visual model can cast shadows but does not automatically create a mechanically validated attachment. Structural stress or rigid-body collision requires separate tested simulation support. Hardware placement must update BOM and sewing or reinforcement notes where those relationships exist, and must be flagged as unlinked otherwise.

**Workflow.** In Design, user places an SVG front graphic and changes its offset from collar seam to 8 cm. The inspector displays centimeters and affected colorways. Photo Studio renders the graphic from front/three-quarter angles. Factory Hub links a measurement/placement callout to approved artwork and film/print technique. A different file revision creates a new artwork asset and triggers a visual/factory release dependency warning.

**Acceptance.** Save/reopen a graphic on a 3D-deformed panel, resize and rotate it, regrade, export a technical flat, and verify no unexpected modification of 2D white pattern fills. Add a zipper with known length and reject a physically impossible opening mismatch. The BOM and rendered visual must reference the exact same feature ID without exposing confidential unit costs.

<!-- PAGE -->

## Page 15 | Measured fabrics, visual textiles and supplier data

**Separate profiles.** `FabricPhysicalProfile` stores composition, construction, GSM, measured thickness, warp/weft extension at documented loads, shear, bending, recovery, friction, conditioning, specimen ID, test method and uncertainty. `FabricVisualProfile` stores PBR base color, directional normals, roughness, sheen, weave repeat scale, image rights and shader compatibility. An imported fabric photo cannot generate reliable mechanical modulus values on its own. A supplier fabric code identifies a commercial article and physical lot, not an invariant simulator material.

**Library user experience.** Search by construction, supplier, composition, weight, width, color, stretch and evidence status. Preview a square swatch and an illustrative fabric drape over a sphere or body form. The preview should disclose when folds are computed with estimated properties, measured properties or a fixed illustration. Users may choose a fabric visually and subsequently attach a tested specimen; publishing a fitted sample requires a separate validation decision.

**Dependency impact.** Changing fabric can affect 3D folds, seam operation selection, shrinkage allowance, marker usable width, consumption, BOM and cost. Mark the impacted records stale, re-evaluate allowable stretch ranges and request a technical review. Recoloring a PBR surface must not change 2D pattern geometry or production GSM. Back and face materials can differ; padding, interfacing, ribbed cuffs and leather trims may each require multiple physical/material records.

**Versioning.** Save sample lab observations separately from solver-specific coefficients. A VBD estimate is not directly portable to a PPF FEM parameter. Store each calibration's backend, version, target curve, fit residual and approved validity range. Imported vendor swatches need clear data rights; unsupported machine-derived properties stay unknown.

**Acceptance.** Apply visually identical but mechanically different fabrics and show distinct provenance/expected physical behavior. Render macro texture at calibrated repeat width. Save/reopen and compare body and material outcomes. A substitution triggers cutting/fit/cost review. The test asserts that an image-only import never changes measured physical fields.

<!-- PAGE -->

## Page 16 | Simulation orchestration and contact diagnostics

**Simulation layers.** Preserve the fast native VBD/GPU VBD editing path for interactive drape where supported. An optional offline PPF reference path can run a frozen source through a separate job with explicit engine/version, material map, collider and settings. Do not assume completed simulation equals physically valid fit. Historical EXO audits found seam and collision issues; no engine path may silently replace accepted pattern source or be labeled production-fit certified without independent acceptance.

**Solver job contract.** `SimulationJob` stores source and mesh hashes, avatar version, solver name/commit, physical material mapping, time step, collision thickness, world gravity, start state, output frame series, wall clock and failure status. Submitted jobs validate mesh manifoldness, finite coordinates, seams, collider orientation and no disallowed initial intersections. Results are immutable diagnostic artifacts; editors may preview them but must explicitly accept any material-state application.

**Diagnostics UX.** A collision panel shows panel/body pair, penetration depth, 3D location, local 2D source, normal, frame/time and suspected cause, with snapshots and replay. A seam panel shows mean/max gap by source sew edge. Show full-frame and swept-contact results distinctly. Expose mesh density and solver timing separately from render FPS. “Increase collision thickness” may be suggested with effects but not automatically applied to every fabric.

**Recovery and quality profiles.** Draft, fit review and presentation quality profiles set measurable solver/mesh parameters, not unknown magic quality scores. A failed step returns to last valid state and preserves source edits. Save a checkpoint before long offline simulation; cancellation must free compute and leave the prior accepted state intact.

**Acceptance.** Benchmark drape square, layered sleeve/torso, hood/neck, thick cuff, decorated leather trim and animated avatar. Validate determinism where engine permits, inspect every produced frame, compare with independent collision code and report memory/time at several resolutions. Force a crash/cancel and confirm authoring state and previous diagnostic run remain recoverable.

<!-- PAGE -->

## Page 17 | Avatar sizing, poses and fit evidence

**Avatar data.** A fitting avatar is a versioned body reference with height, named landmark measurements, pose, shape/scan provenance, rig and body-mesh hash. Record uncertainty when dimensions are inferred rather than physically measured. Selecting a display avatar should not silently replace the native collision body unless a verified mapping has been performed. The 2D projected silhouette is a geometric drafting aid, not a substitute for chest/hip circumference or collision quality.

**Pose controls.** Support standardized neutral standing, arms-away, walking, seated and fashion reference poses as separate rig targets. Transforming an avatar during drape creates a new simulation input state, with recorded time and pose. A thumbnail screenshot of a pose is inadequate for reproducibility. Maintain garment-to-body alignment and explicit collision-body status throughout edits. Photo Studio poses may be visual-only if the physical simulation is not validated for movement.

**Fit measurement.** Tie target garment POMs to actual pattern-derived values and separately uploaded physical-sample measurements. Fit visualization can show garment clearance/strain metrics with calibrated assumptions and confidence tags. It cannot infer comfort or medical pressure safety from a beautiful image. A model wearing size L may appear plausible but fail stitched construction or physical sleeve tolerance; display the discrepancy rather than masking it.

**Sample feedback.** A technical developer records approved fit sample ID, fabric lot, body/avatar match assumptions, size, measured differences and accepted corrections. Use this evidence to select future block/grade calibration, but never turn a single person's fit into universal sizing validation. Unknown anthropometric or textile measurements remain explicit gaps in approval.

**Acceptance.** Change shoulder width in the avatar profile while preserving source garment coordinates. Show which fitting diagnostics change, which remain measured facts and which are merely estimated. Load a second mesh and verify the 2D silhouette changes without mismatching stable garment ID. Replay a saved pose and compare skeleton/camera transforms numerically.

<!-- PAGE -->

## Page 18 | Graded export, DXF/RUL and independent round trips

**Production file contract.** Export each approved size with explicit unit, named pieces, grain, cut quantity, stitch contour, cut contour, notches, drills, internal markings, size label and consistent grade-point mapping. Support the applicable ASTM/AAMA DXF interpretation with an accompanying RUL or equivalent grade-rule representation when required. A generic DXF with exploded polylines is not sufficient to claim it preserves grading semantics or factory import behavior.

**Validation sequence.** First validate in-process source geometry and cut contours. Then export and reimport using an independent parser. Compare point coordinates, sampled curves, piece inventory, area, seam lengths, notch positions, size labels and layer mapping under explicit tolerances. For customer-facing compatibility, test a representative current target CAD and cutter/plotter workflow rather than merely inspecting source DXF text.

**Export profiles.** Maintain versioned profiles for each approved destination: units, axes, layer names, unsupported entities, curve flattening settings, notch representation, allowable text, plot calibration and version. Users preview losses before generating a package. Each export writes a machine-readable `ExportVerification` report that names parser/destination and any untested elements. A structural pass must not be presented as factory-certified.

**Interoperation error handling.** If a cutter import drops a custom seam allowance or applies a different unit scale, the validation should display precise coordinate/layer evidence. Retain original file, target import screenshot/diagnostic and factory acknowledgement. Do not rewrite the original approved release after a destination-specific fix; issue a new compatible export revision with a clear mapping and signature.

**Acceptance.** Build fixtures for a multi-size tee, hoodie with hood/zipper, tailored jacket and asymmetric trouser. Verify base and extreme sizes in two independent readers plus printed reference square. Intentionally invert scale, strip an allowance layer and swap size labels; each must fail with a cause-specific diagnostic before bulk cutting authorization.

<!-- PAGE -->

## Page 19 | Marker making, nesting and cut-order planning

**Marker inputs.** A marker request specifies factory order, style release, fabric/SKU and lot where known, usable width, grain direction, nap/print repeat rules, allowed rotation/mirroring, piece quantities by size/colorway, bundling constraints, defects/splice zones, buffer between pieces and cutter profile. Do not infer fabric lot or cutter capabilities from stage preview or design material color. A single-size illustration and an actual multi-size production cut order are different objects.

**Optimization behavior.** Launch with a deterministic, constraint-valid placement and an independently verifiable piece inventory. Later add heuristic/solver optimization for area yield, lay length, size mix and cutter time. Users can pin an approved piece and re-nest remaining pieces; report both material utilization and every hard constraint. A visually compact marker that flips a one-way velvet grain is invalid regardless of percentage utilization.

**Safety and operations.** Compute cut count and size ratios from an approved manufacturing order, not arbitrary UI defaults. Keep pattern-piece revisions and fabric width pinned to the marker artifact. Defect maps and roll-length restrictions must be explicit. A changed grade or cut contour makes dependent marker outputs stale and blocks sending them to a cutter until rerun or approved with a documented exception.

**Outputs.** Export a marker drawing, machine profile files only when verified, piece/bundle labels, fabric consumption, estimated waste, order/size breakdown, lay count and a proof manifest with hashes. Factory Hub can comment on marker feasibility, but cannot rewrite approved source contours by moving shapes inside the web page.

**Acceptance.** Place all ordered pieces of a size-mixed tee run under valid grain/nap/width constraints; report reproducible area and usable length. Repeat with a too-narrow fabric and assert unplaced pieces are blockers. Change the cuff size rule, regenerate marker and detect that old cut orders reference a superseded pattern revision.

<!-- PAGE -->

## Page 20 | Measurement engine and production preflight

**Measurement definitions.** Each point of measure has ID, purpose, anchor method, size/colorway applicability, physical condition, unit and target/tolerance. Body measurement, pattern flat dimension, finished sewn garment and observed sample actual are separate values. A POM definition such as “half chest at 2.5 cm below armhole” must specify how to identify that location on the constructed garment. The display may switch between inches and centimeters; canonical data is not rewritten.

**Preflight architecture.** Divide checks into geometry, seam/assembly, graded size family, cut/allowance, BOM/trim, material provenance, DXF/marker output, technical document and supplier/approval. Each rule returns code, severity, target entity, expected and observed values, allowed tolerance, dependency IDs, source reference and suggested resolution. An exception records a qualified approver and rationale without silently suppressing the underlying warning.

**Status distinctions.** `BLOCKED` means a required invariant fails. `REVIEW_REQUIRED` means a qualified human must evaluate a warning. `STRUCTURAL_CHECK_PASS` means checked code-level properties passed. `SAMPLE_APPROVED` means actual identified sample evidence was reviewed. `FACTORY_DESTINATION_VERIFIED` means named software/hardware accepted the file. Do not represent these as one “production ready” boolean.

**Integration.** Use the existing EXO productionPreflight report as a fixture and gradually expand into typed rules over the canonical model. Reconcile the native Rust source and broader EXO project first; where data are absent, mark the check “not performed” rather than passing. Report drill-down and export a machine-readable preflight manifest alongside every release.

**Acceptance.** Validate good and deliberately bad hoodie fixtures covering flipped polygon, missing notches, invalid size, marker overflow, unmatched seams, absent trim SKU and stale document. Each rule points to the correct editor location. Approval must reject unresolved blockers and preserve previous release bytes after failed preflight.

<!-- PAGE -->

## Page 21 | Technical drawings and generated specification assets

**Drawing sources.** A factory technical flat derives from a pinned garment source revision with named panels, seam construction, graphic/trim placement and dimension anchors. It is deliberately different from a shaded editorial render. Generate front/back/detail views with neutral line colors, meaningful labels, stitch/cut distinctions where appropriate, and explicit variant/size. Drawings may use controlled manual annotations but each binding to a physical specification must reference an actual POM or construction operation ID.

**Output model.** A `TechnicalDrawing` records source garment hash, drawing type, projection, visible features/layers, document unit, author overrides and generated image/vector asset hash. A print layout specifies paper size, intended scale, orientation, page overflow and calibration marks. A diagram may illustrate instructions that are not directly derivable from current geometry, but must be labeled authored reference instead of solver-verified result.

**Regeneration policy.** When geometry changes, mark source-linked dimensions and technical views stale, regenerate and compare old/new overlay. Preserve approved manual styling notes unless their anchors changed, in which case create a reattachment task. The system cannot infer that two photographed garments have identical construction merely because rendered silhouettes match. Support source evidence images as separate illustrative/approved/reference statuses.

**Tooling.** Render vector-first where possible for sharp technical flats and measurements; use font-safe PDF exports and accessible HTML tables for values. Export signed factory documents from one frozen release manifest, not live localStorage. Use exact brand-approved artwork and per-variant placements. Factory PDF includes part IDs, size run, revision, printed timestamp and a machine-readable identifier; static printouts clearly warn about later revisions.

**Acceptance.** An approved hoodie generates full/partial technical flats and detail diagrams, with all POM IDs and trims traceable to the source. After moving a hood seam and issuing R02, the old R01 technical flat remains byte-stable, and the new flat/size table reflect the exact changed seam. Printing at 100% passes a 100 mm check where true-scale output is intended.

<!-- PAGE -->

## Page 22 | Source asset library, search and licensing

**Library entities.** `LibraryAsset` identifies type (pattern block, fabric, trim, stage, avatar, pose, reference photo, camera, light rig, graphic, construction recipe), revision, owner, title, tags, physical scale, preview URI, source/license, author, visibility, validation status and immutable underlying file hashes. Source data and sanitized preview derivatives have separate access scopes. A supplier-paid material or third-party stage model cannot automatically be republished with a garment image or bundled to a factory.

**Discovery UI.** Search by category, exact ID, garment use, color, dimensions, physical/visual validation and preferred supplier. Library hover cards can show large photographs/3D previews, fabric drape, trim hardware details and available physical measurements. A preview is evidence of appearance, not confirmation of catalog pricing or physics; label it. Users can favorite and group asset collections by product line, material family or shoot campaign.

**Import pathway.** All uploads retain originals, scan safety-relevant file types, extract factual metadata with provenance, validate sizes/coordinate frame, and generate bounded thumbnails. Imported SVG/PNG/GLB/.blend/DXF require type-specific adapters and rights review. Unknown or unsafe embedded scripts and external references must not execute in browser or rendering workers. A GLB with missing texture still imports as an incomplete asset with visible warning and retry path.

**References vs copies.** Design projects reference immutable asset versions with a chosen snapshot policy; edits to the global library never silently change an approved garment release or shot. An author may create a new version of a fabric or softbox preset and intentionally update affected workspaces. Private files are not leaked to search snippets, OCR indexes, public alt text or unauthorized generic product pages.

**Acceptance.** An approved garment and photo shoot both reference the same visual fabric asset while retaining separate permissions. Changing the library asset creates an update suggestion, not retroactive pixel or BOM changes. Import tests cover a benign SVG, damaged GLB, overlarge image, missing texture and expired rights; each returns an intelligible status without corrupting source projects.

<!-- PAGE -->

## Page 23 | AI agent actions, tool schema and verified skills

**Agent boundary.** An AI agent is a client of typed commands and read-only project queries, not a privileged alternative write path. Its instruction cannot override organization grants, approved release state or source revision preconditions. Design capabilities include listing pieces, inspecting seam/measurements, proposing grade edits, adding a notch, assigning fabric/trim, checking export readiness and assembling a shot. External publishing, factory release, supplier payment or expensive render submissions use explicit authorized actions.

**Command shape.** Each tool accepts `actorContext`, `styleId`, `expectedRevision`, `targetEntityIds`, typed dimensions, a declared operation and optional idempotency key. Outputs include before/after values, changed IDs, validation status, diagnostic evidence and undo transaction ID. A free-form string such as “make cuff smaller” must be resolved to specific POM/pattern entities and a measurable proposed change before execution.

**Verification loop.** Agent reads current state, drafts a plan, validates target scope and asks for clarification when physically ambiguous, performs a reversible edit in isolated draft context, reloads actual geometry, verifies accepted numeric values, checks unaffected entity hashes, runs dependency preflight and saves a checkpoint. If any test fails it reports the exact failure, preserves original state and offers rollback; it does not fake success by changing a display field.

**Reusable skills.** A skill is a versioned task recipe with supported preconditions, typed operations, known fixtures, output proof and failure handling. Example: “increase hoodie sleeve length by 15 mm across a selected size family,” “relink a dropped notch after edge split” or “create white ecommerce eight-shot board.” Skills cannot directly copy private pattern files into a remote model or post production documents without authorized connector scopes.

**Acceptance.** Run an agent against a synthetic garment with one authorized seam edit and one prohibited factory release action. Confirm the edit has correct measured readback, history, save/open and exact unaffected-point hashes; the release operation is denied without approval. Randomize object IDs and stale revisions so the agent cannot pass by hardcoded button scripts.

<!-- PAGE -->

## Page 24 | Engineering integration contracts and staged migrations

**Contract ownership.** Publish `GarmentSnapshot.schema.json`, versioned TypeScript types and compatible Rust serialization interfaces, with a contract fixture suite shared across clients. The native adapter is responsible for actual ClothCraft source; the legacy EXO adapter maps the broader design/project model; the cloud serializer stores only validated canonical snapshots. Clear responsibility prevents the backend from inventing missing sewing or grade fields during import.

**Migration strategy.** Start with read-only normalized exports from existing saved fixture garments, preserving exact original bytes and a source hash. Diff mapped fields against each renderer's geometry and known derived measurements. Implement new fields behind `schemaVersion` and migration functions that are tested in both directions where lossless. A schema migration that cannot preserve a critical manufacturing entity must remain a read-only conversion pending manual reconciliation.

**Concurrency.** Provide a version contract for service, desktop app, native engine, web UI and render workers. The server can accept an older client snapshot when all required semantics are representable, and reject unsupported critical version features with actionable diagnostics. A background render that began with old scene schema finishes against its frozen inputs, not whichever version a developer deploys next.

**Open interfaces.** Use JSON Schema/OpenAPI for HTTP data, explicit metric unit classes, content hashes for files and a named, versioned event envelope. OpenUSD/glTF can support scene outputs but not replace garment engineering. DXF/ASTM can transport pattern data but cannot represent the entire sewing graph. All format adapters return a coverage and loss report rather than claiming perfect universal interoperability.

**Acceptance.** Reopen a synthetic saved V2 garment from before new schema fields existed. Verify identical original geometry, stable sew references, deterministic material/source IDs and no silent fabric-property assumptions. Test partial/new schema fields, corrupted hashes and multi-client version mismatch. Produce a migration audit file with source, destination, warnings and explicit user acknowledgement of any loss.

<!-- PAGE -->

## Page 25 | Development foundation milestone and technical gates

**First slice.** Before publishing a manufacturer website or Photo Studio, implement a checked, versioned source snapshot from a current EXO garment; one read-only style summary; one factory technical preview; and one photo shot manifest referencing the same immutable geometry. These should run on disposable fixtures and a separate development database. Use existing factory package JSON and Stage Library data where accurate, but do not present all of their fields as production verified.

**Milestone M0 definition of done.** Exact source geometry and size labels survive save/open; adapter reports per-field mapped/unmapped status; high-level POM/BOM can be displayed without retyping; the developer can calculate a deterministic source and asset hash; a static factory export and photo preview refer to the same source revision. A failed adapter field does not silently default to an arbitrary measurement. A raw browser preview never needs direct remote access to the native Rust port.

**Engineering decomposition.** Create isolated source-contract and fixture packages before touching large actively changing UI modules. Implement testable adapters, shared validation rules, viewer components and draft service endpoints as independent units. Build permissions for private read-only data before enabling external invitations. Keep the current V1/V2 backups and installed app out of test scripts. Record how production exporter and Studio renderer paths differ from the native Rust project source today.

**Reviewers and evidence.** A pattern engineer checks measurement, seam and cut fidelity; a backend engineer checks object authorization and revision transactions; a photographer confirms saved camera/light data and useful reference outputs; a manufacturer judges readability of a static technical pack. Gate decisions are based on fixtures and recorded outcomes rather than visually impressive screenshots.

**Exit gate.** Move to factory collaboration only after numerical source-to-display parity and permissions tests pass. Move to photoreal final rendering only after the scene compiler reproduces camera framing and preserves garment texture/trim identities. Keep unverified physical fit and cutter compatibility explicitly pending their real-world trials.

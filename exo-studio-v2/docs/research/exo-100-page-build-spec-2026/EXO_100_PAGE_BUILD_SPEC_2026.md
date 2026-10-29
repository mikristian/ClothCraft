# EXO ClothCraft V2 | 100-Page Build Specification

**Version:** 2026-10-17 research and implementation specification. **Status:** proposed requirements and architectural decisions; not a claim that the integrated service is implemented.

This main file consists of exactly 100 numbered sections. Refer to `README.md` and `TRACEABILITY_86_GAPS.md` for source references, existing capability gaps, test coverage and delivery approach.

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

<!-- PAGE -->

## Page 26 | Living tech-pack schema and data authority

**Required aggregate.** A `TechPack` belongs to an organization and style; it owns working revisions and references zero or more immutable `FactoryRelease` objects. A revision pins `garmentRevisionId`, size set, colorways, POM, BOM, construction instructions, technical flats, grading/cut artifacts, artwork/labels, packaging and source references. Each section carries stable entity IDs, schema version, provenance, units and validation state. Do not reconstruct structured manufacturing facts by OCR of an exported PDF.

**Authority classes.** A technical pack must distinguish editable draft values, geometry-derived values, physical sample actuals, factory proposals, authorized approval and released binding instructions. The same POM row may show target, measured sample and proposed next revision side by side. A manufacturer changing “Sample 1 actual chest = 56.5 cm” cannot thereby change “Approved R01 chest target = 55 cm.” Store approvals and actuals as separate records with explicit source.

**Serialization.** Use canonical metric fields, stable references to garment geometry and immutable assets, document-specific display units and deterministic release serialization. Schema migration retains unknown optional fields and rejects unsupported critical quantities. Generated factory-spec HTML, POM CSV, BOM CSV, DXF, marker and PDF must use the same release snapshot and embedded digest. Where current EXO exports lack a field, show “not supplied” and a task owner rather than fabricating a default.

**Browser contract.** A viewer can inspect the current released tech pack, open a permitted old release, compare revisions or submit a proposal. Working drafts are internal unless explicitly shared. Public portfolio pages receive sanitized visual derivatives, not raw POM, vendor pricing, source equations or pattern files.

**Acceptance.** Create a hoodie pack with base S–XL, five POMs, two fabrics, zipper hardware and a size-run source. Release R01, modify a draft and prove R01 JSON/PDF/ZIP payload hashes remain stable. Compare every web table value to source export data and reject a malicious client payload that attempts to change its organization or release owner.

<!-- PAGE -->

## Page 27 | Style overview and manufacturer information architecture

**Manufacturer landing page.** Header identifies style/SKU, colorway, approved release, sample stage, assigned factory, issue status and acknowledgement. Left navigation contains Overview, 2D/3D Garment, POM & Grades, Materials/BOM, Construction, Hardware, Graphics, Samples, Quality, Files and Revision History. Center shows an interactive technical preview or selected table; right rail contains anchored comments, assigned tasks, evidence and proposed changes. Costs appear only when the organization's grant permits.

**Context transfer.** Clicking a sleeve seam locates its source edge and the linked construction recipe, notch details, relevant sample issues and approved reference photo. Clicking a measurement shows the diagram and every size's target/tolerance and actuals. Clicking a zipper shows approved trim identity, length and any related supplier question. The selected release stays explicit as the user navigates; a new working draft does not automatically replace it.

**Use on production floor.** Provide high-contrast concise tables, one-size-at-a-time mobile view and a read-only static release PDF. A workroom operator may lack permission to inspect pricing or unreleased draft content yet still need seam instructions. Navigation never makes unauthorized fields available in underlying API responses. Keyboard controls and a non-3D list alternative permit reviewing annotations without precision mouse movement.

**Status signals.** Show “factory acknowledged R02,” “three sample comments unresolved,” “production cut based on R01,” and “zipper substitution awaiting approval” as sourced events, not AI-inferred progress. Every badge leads to a task/release ID and responsible actor. A style may be assigned to two factories; each sees its own order, communication, costs and release scope unless the owner intentionally shares.

**Acceptance.** Have a manufacturer without training locate size-L cuff tolerance, respond to its issue thread and upload a measurement. Reopen after another designer issues a new draft and confirm the manufacturer still sees its approved release. Test screen-reader navigation and Factory B attempts to access Factory A's style by guessed IDs.

<!-- PAGE -->

## Page 28 | Point-of-measurement specification engine

**Entity definition.** `POMDefinition` contains immutable ID, name, construction reference, category, measuring method, applicable garment condition, source panel/edge anchors, location diagram, dimension and target sizes. `POMSpec` binds definition to release and provides target value plus upper/lower tolerance for each size/colorway. `SamplePOMObservation` records a physical garment's actual measured value, sample ID, time, operator, test condition and attached evidence.

**Input and display.** POM tables support direct numeric entry, unit formatting, copy-from-base-size tools, formula-linked grading and explicit overrides. Recalculation from pattern geometry must label its source method. A physical sample's measurement remains independent even if target values change. An unfilled row renders as missing, never implicit zero or an average. Rounding occurs only for display; canonical precision is preserved.

**Review behavior.** Mark actuals within tolerance, out of tolerance, unmeasured and inconclusive separately. A designer can accept an outlier with reason or request rework; a factory can post corrective suggestions but cannot change the approved target without proposal workflow. A measurement method diagram is versioned, because measuring a cuff flat vs stretched can change meaning even when the numeric target is identical.

**Integrity rules.** Validate min/max ordering, units, required size coverage and links to source garment. A base-size grade update must recompute derived sizes and flag direct overrides with conflicts. If an edge anchor was split, the POM needs a reliable migration or explicit reattachment before release. Distinguish body circumference, flat width, finished length and wash-conditioned dimension in search and export.

**Acceptance.** On R01 size L, factory reports cuff 1.2 cm wide relative to tolerance. The portal displays target/actual/deviation and raises issue pinned to the POM. The factory suggests changing target, designer declines and requests sample correction: R01 remains unchanged. Separately approve R02 with target change and verify all size values, approval actor and method diagram survive export and reopen.

<!-- PAGE -->

## Page 29 | Size-run and graded-production validation

**Grade release content.** A production release references `SizeSet`, base size, dimension rules, actual grade landmarks, all required pattern-piece IDs and per-size measured POM results. For every size, validate seam correspondence, notch mapping, allowance cutting outline and cut inventory. Attach a destination DXF/RUL verification report naming export profile, parser and accuracy status. This is distinct from previewing visual nested outlines.

**Factory viewer.** The manufacturer can compare size S/M/L/XL tables and overlay the graded nest with source IDs, notch marks, seam tolerance and piece counts. Numeric measurements have units and a consistent location diagram. The factory can flag an improbable grade progression or inconsistent rule and request technical review. They cannot directly manipulate brand-owned point vectors on a released size run.

**Validation pipeline.** Preflight checks size-label uniqueness, rule completeness, missing mirrored pieces, contour integrity, point misreferences, cut quantity, seam ease and production export metadata. A change to the base sleeve triggers re-evaluation across sizes, not a one-size-only numeric table edit. A legitimate non-monotone measurement must be represented as an authorized design exception; generic monotonicity checks cannot substitute for garment-specific rules.

**Version boundary.** A production order may have cut against R01 at certain quantities when R02 is approved. Maintain order-line release mapping so existing cut inventory isn't automatically treated as the new size run. Record whether the manufacturer accepts the revised file, whether old markers remain usable and what material/lead-time impact exists.

**Acceptance.** Import an approved four-size tee to the portal and compare size-chart values with independent pattern calculations. Alter the grade rule for a cuff, approve into a new draft, verify old size assets still available and mark all dependent markers stale. A deliberately dropped notch on XL must block a manufacturing-ready export and identify the exact size and edge.

<!-- PAGE -->

## Page 30 | Production BOM and supplier material records

**Technical BOM.** Rows reference stable `BOMItemId`, category (shell, lining, thread, interlining, zipper, button, label, packaging), per-style/variant applicability, supplier article/SKU, composition, physical specifications, unit, required quantity, estimated consumption, substitution policy and evidence status. Separate fixed unit-count trims from marker-derived fabric consumption. Each commercial supplier may quote different currency, MOQ or effective dates without changing the identity of the product requirement.

**Cross-reference.** A 55 cm zipper placed in the model links to one BOM item and construction operation. If the opening changes, the system flags the zipper length and related machine operation as needing review. A fabric swap impacts marker width, shrinkage, simulations, photo appearance and cost through distinct dependencies. A physically untested look-alike surface map is not a supplier-approved textile substitute.

**Permissions.** Manufacturers view their approved BOM and permitted supplier article details. Internal target margin, alternative vendor quotations and other factories' unit prices are separate confidential records. The production team can expose a required quantity without exposing design development cost. Changing quote price does not modify the released technical material specification unless a quote has been formally incorporated into a release revision.

**Versioning.** Each BOM row change includes before/after quantity, unit, supplier ID, source/reason, reviewer and affected colorways/sizes. Avoid in-place mutation of released BOM data. If a material is discontinued, preserve the historical record and issue a substitution proposal. Unknown fabric price must remain null, not a zero cost. Calculations carry calculation method and effective date.

**Acceptance.** The web pack and factory ZIP must show equal BOM quantities and approved SKU for each colorway. Simulate changing zipper length and replacing rib knit with a visually identical fabric from another mill: dependency graph requests construction/physics/marker review. A separate factory account attempts to read confidential quote fields and is denied by backend authorization.

<!-- PAGE -->

## Page 31 | Construction operation and seam instruction system

**Operational model.** A `ConstructionOperation` links specific seam/edge/trim IDs to technique, stitch or seam classification, machine requirements, thread, SPI or spacing, reinforcement, fold/bind width, operation order, quality checkpoint and illustration. A construction graph expresses prerequisites: attach pocket before closing side seam, finish neckline before certain topstitch, and install hardware only after suitable reinforcement where applicable. Do not confuse an ornamental line texture with an actual sewn operation.

**Factory presentation.** Selecting an operation highlights the relevant 2D pattern edge and technical diagram, shows written instruction and optional approved video/photo reference, and provides a “Question on this step” action. A sewing detail page displays the exact release ID and variant scope. A stage-specific note may supplement but not overwrite the authoritative operation.

**Links to source.** If an authored seam is split or its allowance changes, identify operations that reference it and require remap or review. A change in topstitch distance can affect sewing diagram, BOM thread estimate, Photo Studio macro appearance and sample checkpoint. Hardware installation instructions must link to the actual BOM item and anchor feature, with sizes in canonical units.

**Disagreement handling.** The factory may propose a machine-compatible alternate seam, but a text message cannot silently approve a different operation. Proposal includes current/new method, capacity, sample evidence, cost/lead-time impact and required reviewer. The designer or technical developer formally accepts into a draft, reruns construction checks and issues a new release.

**Acceptance.** Build a padded hoodie operation list with cuff attachment, hood assembly, main seam, zipper, binding and topstitch. Export both work instructions and geometry trace. Delete a source seam and verify linked operation becomes blocked rather than pointing to a different edge. Confirm a factory-only actor cannot edit approved SPI through the HTML inspector.

<!-- PAGE -->

## Page 32 | Comment anchors and geometry remapping

**Anchor types.** Support `PatternEdge(panelId,edgeId,t,sourceRevision)`, `PatternPoint`, `SeamAssembly`, `POMDefinition/Size`, `BOMItem`, `TrimFeature`, `Sample`, `Shot` and `ImagePosition(assetId,normalizedXY)`. A 3D surface comment should retain source panel/feature IDs plus mesh revision/triangle barycentric coordinates for positioning. Mesh triangle IDs can change after remeshing, so store a fallback still frame and never silently attach a comment to an unrelated triangle.

**Creation experience.** In the tech pack, the factory taps an edge, POM row or photo and types a comment. The portal displays an on-canvas pin and right-side threaded discussion; selected anchor highlights in other compatible views. Every comment references the frozen source revision and its release/draft scope. An internal reviewer can open the relevant native element through a deep link when desktop source is available.

**Version propagation.** Geometry editing produces an ID migration map. If a POM persists across revisions, show the thread as relevant with a clear original-release origin. If a panel is split, compute whether the old edge interval maps unambiguously; otherwise mark anchor `NEEDS_REATTACHMENT` while preserving its original screenshot and coordinates. Never move a thread based only on the nearest current pixel.

**Security and integrity.** Comments have visibility scope and actor access separate from the underlying garment. A project guest seeing a public image should not fetch private factory threads via image annotation APIs. Edits and deletion policies preserve the audit record needed for production decisions. Attachments receive independent authorization and cannot be inferred via sequential filenames.

**Acceptance.** Pin a comment 65% along an approved sleeve edge, modify the curve without changing its logical identity and reopen: the comment remains on the corresponding edge. Split the edge into two and test both valid mapping and deliberate ambiguity; ambiguous case preserves thread but forces human reattachment. Cross-factory ID substitution must fail.

<!-- PAGE -->

## Page 33 | Discussion threads, assignments and response times

**Thread lifecycle.** States: `OPEN`, `ANSWERED`, `ACTION_REQUIRED`, `RESOLVED`, `REOPENED` and `ARCHIVED`. Each change has actor, timestamp, original-release reference and optional decision reason. Distinguish a comment thread from a typed change proposal, and keep discussion alongside the latest accepted/rejected proposal when relevant. Resolve does not erase the original factory question or the technical answer used during production.

**Collaboration features.** Thread participants can reply, mention authorized users, assign a technical owner, set due date, attach images or measurement evidence, link other issues and filter by severity/status. A manufacturer should be able to ask for clarification without selecting a special proposal type. An internal reviewer may convert a clarified issue into a structured proposal when it requires changing an authoritative field.

**Notifications.** Notify only actors who have read permission for the exact thread, release and attached data. Prefer neutral subject lines in external notifications if confidential specs would otherwise leak. Mention autocomplete is filtered by membership. Allow digest preferences, muted threads and quiet hours. A user losing access must not continue receiving future excerpts or render thumbnails in email push.

**Offline and concurrency.** Each posted reply uses an idempotency key and expected target status. Offline drafts indicate pending sync, and server rechecks the actor's grant before accepting them. Concurrent replies can append safely, but a thread changing from resolved to reopened must use an explicit transition. A deleted attachment may leave a visible tombstone if it formed part of a production decision.

**Acceptance.** A manufacturer opens a sleeve issue, two designers reply, one accepts assignment and resolves after R02 release. Reopening the original R01 reproduces full history. Send the same offline reply twice and assert one stored event; revoke membership and verify no additional comment reads or notifications.

<!-- PAGE -->

## Page 34 | Factory sample photographs, files and evidence

**Evidence entity.** `SampleEvidence` binds to sample round, physical sample ID, factory, release, size/colorway, observation or target feature, creator and capture date. An original photo or document is immutable by content hash. Drawn arrows, measurement labels and cropped review images are separate derived assets with their own version, preserving the original for audit.

**Upload path.** Browser obtains an upload intent for a scoped release/sample, transfers through a short-lived object URL, then finalizes with checksum, MIME/size metadata, image transform and visibility. Server scans and validates before permitting other collaborators to view. Failed uploads remain retryable but not approved. Importing from a phone camera should not require heavy 3D rendering and should support slow connections and progress.

**Measurements.** A photograph with a ruler is supporting evidence; it is not an automatic calibrated measurement unless a validated image/calibration procedure is used. Enter actual values explicitly with unit, method, condition and responsible measurer. Source photo can be annotated with a pin tied to POM, trim or seam. Captured light/color may affect shade interpretation, so fabric approval should require specified color/lighting methods.

**Access and retention.** Manufacturer A's photo must not appear in Factory B's comment search. Private face/body scans and unpublished garment designs require access classification and retention policy. Revoking access stops new reads; backups and existing legally retained released records may follow documented retention rules. A photo revision or replacement creates a new attachment, never overwrites evidence cited by an old sample decision.

**Acceptance.** Upload front/back/detail photos and a measurement sheet for Sample 1, attach them to cuff and hood issues, create a crop annotation and download the original unchanged bytes. Upload corrupt, overlarge and maliciously named files and verify clear rejection. Revoke partner access and test direct object URLs and all image derivatives return denied or expired.

<!-- PAGE -->

## Page 35 | Structured change proposals and manufacturer suggestions

**Proposal contract.** `ChangeProposal` records ID, source `FactoryReleaseId`, target entity ID/path, type, current value, proposed value, canonical unit, affected sizes/colorways, rationale, photographs, estimated cost and lead-time effect, author and expected revision. Valid types include POM adjustment, seam/construction treatment, grade correction, fabric substitution, trim, artwork, labeling, packaging and work-order exception. No proposal mutates the release directly.

**Factory workflow.** An authorized manufacturer selects a POM or component, chooses “Propose change,” views the current approved value, enters the alternative and supplies evidence. Server validates scope, target existence and syntactic/value constraints. The request becomes `PENDING_TECH_REVIEW`; the factory can clarify or withdraw it but cannot transform a rejected suggestion into an already approved value by editing message text.

**Designer decision.** A reviewer can request evidence, reject with reason, partially accept with explicit revised fields, or accept into a **new working draft**. Acceptance triggers source adapter commands or assigned manual pattern tasks if the native operation is not implemented. Only after technical checks and formal approval does an R02 release contain the new value. The portal shows the difference between “proposal approved for draft work” and “new factory release issued.”

**Conflict handling.** Two factories may propose different cuff widths. Keep each proposal independently scoped and display both alternatives to the authorized owner. Conflicting changes to the same POM and revision cannot be automatically merged by last-write-wins. If the expected release is superseded, a reviewer must rebase or explicitly close the stale request. Store the entire decision chain with actor and timestamps.

**Acceptance.** Factory A proposes zipper length +5 cm while Factory B proposes alternate tape material on its distinct order. Verify no release bytes change. Approve the first into a draft, recompute its opening/trim dependencies and issue R02 only after sign-off. Try posting to another factory's release ID and expect denial before metadata disclosure.

<!-- PAGE -->

## Page 36 | Diff review, impact analysis and rebase

**Comparison contract.** Show source R01 beside working R02 candidate with exact changed fields, dimensional values, size scope, actor, reason and related proposals. POM changes display old/new target and tolerance for each size. BOM changes display supplier SKU, composition, quantity and cost visibility as permitted. Sewing changes identify edge/operation IDs and overlay curves. New or deleted pattern pieces require source geometry and cut-piece inventory comparison.

**Impact engine.** Compute a dependency set for each changed entity. A cuff outline change should re-evaluate graded POMs, seam walking, notches, allowance cut line, marker nesting, construction illustration and any related hardware/graphic anchors. A fabric substitution may affect physical simulation, shrinkage, marker widths, BOM, costing and photo material appearance. An unmodeled dependency becomes `UNKNOWN_REVIEW_REQUIRED`, never an assumed unaffected check.

**Review UX.** Reviewer opens change proposal and sees visible old/new fields with units, side-by-side 2D overlay and source evidence. They can request measurements, assign remapping tasks, approve individual changes or reject with reason. Accepting one of multiple proposals applies it to a new working draft after optimistic-lock validation, not directly to the immutable release. If draft diverged, the interface offers a reviewed rebase rather than overwriting later valid edits.

**Audit.** Persist `ChangeSet` with source and candidate revision hashes, operations in typed canonical form, before/after values and validation report IDs. All approvals identify exact change-set digest. A reviewer signing a candidate must reapprove if its hash changes before issuance; a stale signature is invalidated.

**Acceptance.** Simulate cuff width, thread spec and garment color changes in one draft, then compare to R01. Confirm the engine flags geometry-related exports but does not mark an unrelated style photo as a factory cut blocker. Edit a value after approval; issue must fail until the new digest is approved. Diff output matches machine-readable snapshot comparison.

<!-- PAGE -->

## Page 37 | Internal technical approvals and signatures

**Approval policy.** A style may require pattern engineer, technical designer, sourcing owner and brand approver signatures depending on risk. Represent a versioned `ReviewPolicy` with required capability sets, gates, sequence and conditions. Use authentication session, actor ID, timestamp, immutable candidate hash, decision and rationale. A digital acknowledgement is product audit evidence; do not claim automatic legal e-signature equivalence without jurisdiction-specific design.

**Preflight prerequisite.** Approvers see source/grade/cut/BOM/techpack issues with severity and evidence. Hard blockers prevent issuance; a warning can be accepted only by an actor possessing the defined waiver capability. Certain technical checks must be independently performed, such as DXF round-trip or physical size-set fit review. A missing physical sample remains missing even when a reviewer has permission to issue an experimental release.

**Concurrency and stale approvals.** When source or binding spec changes after review, calculate affected approval scope and invalidate signatures that no longer apply. A different user editing only a private comment cannot invalidate geometry approval. Store each signer's digest and the approval policy version. Prevent a last-minute race where release occurs against a different candidate from the one inspected.

**Interface.** “Request approval” generates assignments with due dates and changeset summary. Approver can compare, view evidence, approve or return for changes. UI differentiates ready, awaiting evidence, rejected and issued. A factory user can acknowledge receipt but cannot satisfy a brand's internal technical approval role unless separately granted and recorded.

**Acceptance.** Two-step technical and owner approval issues R01 only when both current candidate hashes match. Change BOM after first approval; test that correct scopes are invalidated. Attempt issuance from a stale tab, disabled reviewer account and cross-tenant identity; every unauthorized transition must fail. The audit reconstructs all approvals after restart.

<!-- PAGE -->

## Page 38 | Immutable factory release and downloadable package

**Release manifest.** `FactoryRelease` records release ID, style ID, frozen source garment revision, tech pack snapshot, size/colorway scope, approved pattern/marker/DXF documents, BOM/POM/construction revisions, signing actors, created timestamp, partner grants and file hash list. A release is append-only; corrections create a superseding release. A factory's sample or cut order references the exact issued release even after newer versions exist.

**Package generation.** Use current EXO factory export modules as an initial adapter, then produce one authoritative bundle from the normalized release snapshot. Factory-friendly HTML/PDF, POM CSV, material BOM, technical construction sheets, verified patterns and metadata should be derived from the same data. Include a manifest with hashes, file sizes, schema/export profile, local unit and release designation. Generation failures leave release candidate unissued or explicitly partial; never distribute an incomplete bundle as approved.

**Acknowledgement.** Each invited factory records receipt with actor/time and outcome `ACKNOWLEDGED`, `NEEDS_CLARIFICATION`, `UNABLE_TO_PRODUCE` or `DECLINED`. Receipt does not mean fit-certified. A newly issued R02 can mark R01 superseded and require fresh acknowledgement, while historical R01 downloads remain available to authorized auditors when retention policy permits.

**Static safety.** Every printed page shows style/SKU, issue ID, revision, date and optional QR lookup. A QR destination must authorize the viewer, not expose private files through mere possession of an obscure URL. Signed artifact links expire; source bytes remain stored with content hashes. A revoked manufacturer may lose access, while the brand preserves historical release records.

**Acceptance.** Download R01 before and after multiple draft edits and compare manufacturing payload hashes. Generate R02 after an approved cuff change, then verify R01 and R02 size charts differ only as expected. Corrupt an export artifact and prove manifest/hash verification blocks delivery; retry with idempotency key creates no duplicate issued release.

<!-- PAGE -->

## Page 39 | Factory invitation, membership and external partnerships

**Organization model.** Create `Organization`, `User`, `Membership`, `PartnerRelationship` and `ReleaseGrant` entities. Factory accounts belong to an organization, and access is granted to explicit styles/releases and capabilities. Being invited to view a tech pack never grants all brand designs or pattern-library downloads. Roles define a default capability set, while per-resource grants and deny rules govern actual reads/writes.

**Invite UX.** Brand owner selects factory organization, named contact or secure invitation route, exact release and scopes: view technical sheets, download patterns, comment, submit POM samples, propose changes or report order milestones. Display an expiration time and whether another approver must validate the invitation. The recipient confirms account identity before sensitive data become accessible. Email may contain a generic invitation without proprietary specs.

**Partner lifecycle.** Invitations progress `CREATED`, `SENT`, `ACCEPTED`, `EXPIRED`, `REVOKED`. A factory contact leaving the organization loses membership and dependent access. A factory invited for a new R02 must see which old R01 records remain necessary for an already cut order. Revocation stops new data and file reads; already downloaded offline documents cannot be technically recalled, which should be explained in partner terms.

**Limits.** Companies often interact by email or spreadsheet, so allow approved static PDF/ZIP export and response import without pretending offline recipients are actively viewing the site. Accounts must not permit one factory to enumerate the other factory's contacts, negotiated prices, issue threads or active orders. Public showcase rights and internal factory grants are entirely separate.

**Acceptance.** Invite Factory A to R01 with comment + sample upload rights but no source pattern download; verify each route honors the capabilities. Factory B receives a different release grant, attempts direct IDs and nested attachments from A and is denied. Expire/revoke invite and confirm cached API and signed URLs no longer grant new reads.

<!-- PAGE -->

## Page 40 | Multi-tenant ACL and supplier data isolation

**Access decision.** Every backend operation evaluates actor identity, organization membership, resource organization, style, exact release or draft, data classification, action and current grant state. `read`, `comment`, `propose`, `uploadEvidence`, `approve`, `issueRelease`, `downloadPattern` and `readCost` are distinct capabilities. CSS-hidden tabs are never a security control. Authorization is applied before returning resource existence details, search results or media derivatives.

**Database enforcement.** Include tenant IDs in relational keys and use constrained queries or row-level policies where supported. Verify nested relationships: a `Comment` belongs to a particular release and project, an `Attachment` to that authorized comment, a `SampleRound` to the factory's assigned order. Users cannot submit `tenantId` in the body to choose another tenant's ownership. Object-store signed URLs originate only from an authorized request with short lifetime.

**Private subsets.** Separate internal target margins, supplier alternatives, owner negotiation messages and unpublished source patterns from factory-visible technical BOM fields. A photographer may receive a GLB product visual but no cutter geometry. Manufacturing personnel may see pattern instructions but not the brand's marketing plans. Public users obtain only sanitized derivative assets stripped of sensitive metadata.

**Testing.** Use a matrix of Owner, Designer, Patternmaker, Approver, Factory A, Factory B, Photographer and Guest across data classes and API verbs. Include insecure direct object reference attempts, guessing IDs, uploading into foreign samples, using old signed links, foreign search filters and event/notification leakage. Apply the same scope to audit exports and historical revisions.

**Acceptance.** Run each API route under all test identities; cross-tenant access must yield no private bytes, counts or filename hints. Deny attempts to approve via a factory account even when a stale browser shows the button. Rotate grants during an active upload and prove finalize authorization is rechecked; no previously uploaded file becomes public.

<!-- PAGE -->

## Page 41 | Manufacturer production dashboard

**Dashboard purpose.** Show what the manufacturer has actually reported, which approved release work is based on, and which decision remains blocked. Each order tile displays stage, planned quantity, reported actual, work location, owner contact, last event, evidence and variance. Do not calculate a theatrical “78% complete” from the number of clicked task buttons without a defined denominator and source.

**Core entities.** `ProductionOrder` links style/colorway/size quantities to factory, release, destination and status. `ProductionMilestone` has type, plan date, actual event timestamp, work-order scope, quantity and documentation. Stage families include sample, raw materials, fabric cutting, sewing, wash/finish, QC, packaging and shipment; factories can configure their own operations. A factory may subcontract stages, but permissions are still explicit.

**Factory interaction.** An authorized production contact can report “fabric received 450 m,” “cut 120 of 200 units” or “awaiting replacement zipper”; upload delivery documents, attach photos and request help. Backend checks quantity ranges, unit, order reference and idempotency; records reported actual separately from independently confirmed physical events. Designer's central dashboard shows cross-factory progress only according to their permissions and grouped by order.

**Exception handling.** A factory cutting against superseded R01 is visibly flagged when R02 changes grading; the owner decides whether the order can finish using R01 inventory or requires rework. A missed expected shipment date becomes an event and assignment, not a silent overwrite of the original estimate. If an update originated in ERP integration, record source system and external event ID.

**Acceptance.** Set up two orders with different size mixes and factories, report partial cuts and one delay, and verify accurate quantity/event history. Factory A cannot change B's actuals; duplicate webhook retries do not double-count units. Issuing R02 creates an impact review without retroactively rewriting an R01 cut event.

<!-- PAGE -->

## Page 42 | Sample rounds, fit comments and approvals

**Sample identity.** A `SampleRound` has sample ID, factory, garment release, stage (proto/fit/size-set/PP/TOP), size/colorway, fabric lot where known, sent/received dates, courier info, tested avatar/body profile if relevant, measured POM results, photos, workmanship review, assigned owner and final decision. The physical sample is distinct from a 3D render; its evidence can be incomplete or disputed.

**Workflow.** Factory creates Sample 1 record, enters actual measured values and uploads annotated photos. Designer compares target spec and tolerance, records failure codes and marks `ACCEPTED`, `REWORK_REQUIRED`, `CONDITIONAL` or `REJECTED` with rationale. Sample 2 may be produced from R02 or from process correction under R01; the source distinction is mandatory. A comment on a sample can produce a separate change proposal.

**Close-out rules.** A sample approval specifies which exact size, colorway, fabric/lot, release and conditions were evaluated. Approval of one size cannot silently approve all graded sizes. A visual seam correction may require actual POM verification. Physical sample reports can improve fit calibration, but a photo alone does not prove all relevant dimensions were measured.

**User experience.** Show sample timeline with thumbnail, version, POM summary, open issues and courier status. Selecting an out-of-tolerance observation jumps to measuring method and released target. The factory receives a clear list of required retake photos, requested corrections or accepted deviations. The designer can export the sample decision as an immutable review PDF linked to release.

**Acceptance.** Record two hoodie samples of size M and L. First sample fails cuff tolerance; second corrects it after R02 issue. Compare without merging actuals across sizes or releases. Reopen archived Sample 1 and recover original values, photos and reviewer decision even after the main project has progressed.

<!-- PAGE -->

## Page 43 | Quality inspection and corrective action records

**Inspection structure.** `InspectionRecord` references factory, production order, release, date/time, inspector, location, lot/size/colorway, sampling method, measured fields, defect list and disposition. A defect has region/feature anchor, severity under the negotiated product specification, photo, observed value, expected standard, suspected operation/material and proposed corrective action. ISO 2859-1:2026 sampling uses a real lot-by-lot plan and licensed tables, not a hardcoded arbitrary percentage.

**Evidence and independence.** Distinguish factory self-report from external QA result. An approved inspection should not erase original failed measurements. A technician can attach new evidence, note rework and confirm follow-up. Aggregate dashboards show defect counts and inspected quantities with denominators, not invented quality scores. An unresolved critical defect can block shipment acknowledgement under the contract's review policy.

**Corrective action.** A `CAPA` record links problem to possible root cause, containment, owner, due date, test plan, verification and preventive change. Examples include wrong button spacing from a misread technical flat, seam puckering from needle/thread/fabric combination or size inconsistency from a stale DXF. A root cause is a reviewed hypothesis until supported by observed manufacturing evidence.

**Data links.** QC findings attach to specific released POMs, construction steps, fabric lots and work orders. If repeated defects trace to a BOM or cutting file, a technical designer may create a new draft and revision proposal. Changes in the style source must not retroactively alter measured defect history.

**Acceptance.** Enter lot inspection with multiple seam and measurement failures, record rework, then re-inspect with independent evidence. Verify the old outcome remains and the released package stays frozen. Export an audit trail with sampling-plan metadata, all decisions and source hashes; an unauthorized factory cannot edit a brand-owned closed inspection.

<!-- PAGE -->

## Page 44 | Work orders, quantities and stage scheduling

**Work-order model.** `ProductionOrder` includes customer/brand order identity, partner factory, release, required SKUs, size/colorway quantities, planned dates, ship destination and contractual notes. `WorkOrder` partitions material prep, cutting lays, sewing groups, finishing, QC and packing into trackable operations with dependencies. A factory-specific workflow may include outside wash, printing, embroidery or subcontract finishing.

**Schedule logic.** Stage tasks support planned start/finish, actual start/finish, responsible team, blocker and evidence. Dependencies must be explicit: a bulk sewing task depending on approved cut bundles cannot be marked production-complete solely because one sample was approved. Replans store old/new forecast with reason. Show critical path or confidence only when actual durations and dependencies are available; otherwise use simple planned dates.

**Quantities.** Planned, reserved, cut, sewn, passed-QC, rejected/reworked, packed and shipped quantities are distinct. Count transitions from source events rather than mutable uncontrolled totals. Material roll consumption is separate from garment unit count and must carry units. A partial production event references release and lot, avoiding a change that accidentally treats 120 already-cut R01 pieces as R02 inventory.

**Factory/customer UI.** Production status is visible as an order-specific timeline and a summary of blockers. The factory can update its own actuals and attach delivery evidence; the brand can ask follow-up questions and record acceptance. Partner quotes and confidential internal margin must not be part of general production-status payloads.

**Acceptance.** Plan 200 hoodie units, cut 120, sew 90 and pass 80 QC. Reject a shipment status claiming 240 units without documented adjustment. Edit an expected delivery date and retain old forecast/event history. Reprocess the same warehouse webhook three times and assert quantities remain unchanged after the first accepted event.

<!-- PAGE -->

## Page 45 | Material sourcing, factory RFQ and substitutions

**RFQ contract.** `RequestForQuote` references one exact tech-pack release, BOM subset, colorways, production quantity, sample/production requirements, Incoterms context, requested lead date, certification/evidence obligations and approved recipient list. Supplier responses reference their organization and submitted time, detailed material options, MOQ, price basis/currency, capacity, tooling/sample fees and assumptions. Quotes are commercial offers, not automatically approved changes to technical garment specification.

**Proposal workflow.** A factory may suggest an alternate French terry, zipper gauge or leather trim due to sourcing availability. Require supplier article ID and composition, measurable physical properties where relevant, approved appearance reference, prototype need, lead-time/cost change and affected garment versions. A substitute that looks similar cannot silently inherit the mechanical test evidence of the original material.

**Comparison view.** Present supplier quotes side by side with units normalized only when data permit. Show unit price, MOQ, tooling, setup, usable width, physical evidence, claimed availability, effective date, shipping terms and requested exceptions. Missing price or origin data stays blank with a reason. Approved material decision creates a new BOM/production draft or authorized substitute mapping, with signed approval and the factory's acknowledged release.

**Access model.** Quotes for Factory A are not visible to Factory B; brand internal target margin is still private. A supplier may see only its own RFQ and documents. A public product page must never leak source supplier contacts or landed-cost components from underlying style JSON.

**Acceptance.** Send identical quote request to two authorized factories, compare returned offers and accept one alternative into draft. The review flags material physical recalibration, marker width and sample need. Attempt to accept a quote without mandatory article/technical data; release gate requests evidence rather than inserting fabricated values.

<!-- PAGE -->

## Page 46 | Estimated cost, confirmed quotation and landed economics

**Costing boundaries.** Separate `DesignEstimate`, `SupplierQuote`, `ApprovedStandardCost` and `ActualInvoiceCost`. A design estimate derives fabric length from marker or approximation, trim counts from BOM, process time if supplied and any explicit setup/shrinkage/waste assumptions. Existing EXO `buildFabricCostRun` calculates estimated fabric-only material cost; do not silently add zero labor/trim/shipping values or present the result as fully landed cost.

**Data model.** Each cost component stores value, unit basis, currency, effective date, quantity, source, status, related BOM/order entity and confidence. Fabric cost may depend on usable width, marker length and size ratio. Sewing labor can depend on route, operation and factory rate, requiring an actual external quote or internal estimator. Landed costing also accounts for freight, insurance, duties, packaging, sampling and spoilage where applicable. Taxes and incoterm obligations must be parameterized by market, not hardcoded global percentages.

**What-if interactions.** Let authorized owners compare 150 cm vs 170 cm fabric width, different size ratios, changed MOQ, trim suppliers or sample-round counts. Display which data came from approved quotes and which are placeholders. Cost scenario creation must not mutate released BOM or published retail price. The system should calculate impact of changing an approved zipper to an alternate SKU with a transparent assumption list.

**Confidentiality.** Factory-visible cost fields are grant-specific; one partner's proposal cannot reveal another's negotiated rate. Internal target margin and pricing strategy remain separate from the production package. A factory may quote a different rate but cannot override brand standard cost without authorized acceptance and audit.

**Acceptance.** Compute fabric-only estimate from a known marker fixture and verify unit/currency conversion. Add trim, labor and shipping components to a cost scenario; confirm “estimated” status is preserved. Remove a fabric quote and verify total becomes incomplete, not artificially lower. Cross-partner API checks prevent quote leakage, including exported spreadsheets and notification payloads.

<!-- PAGE -->

## Page 47 | Marker, cut plan and production quantity handoff

**Binding references.** A factory cut plan references released pattern source, verified DXF/RUL export, fabric SKU and usable width, ordered sizes/colorways, piece cut counts and approved marker profile. Each marker artifact records every placed/unplaced piece, grain/nap restrictions, rotation flags, fabric print repeat, lay count, order ratio and material-consumption estimate. It must not inherit a render-stage color shader as the production fabric identity.

**Cut planning.** Support an order cut matrix by size and colorway, fabric lay groups, marker-to-order allocation and cutter proof. Factory may upload actual marker results from its existing CAD/cutter; EXO checks that size labels, piece inventory, reference units and patterns match the approved release. If source changes after cutting begins, track which cut lots are from which release rather than applying the new geometry retrospectively.

**Validation.** Before supplying a cut file, independently verify contour closure, orientation, allowance geometry, notches, drills, mirrored pieces and cutter layer mapping. A structurally valid DXF is not proof an actual plotter or cutter accepted it. Destination validation should record software/hardware versions and measured proof sheet dimensions. A missing notch or incorrect cut width becomes a blocking issue and an export profile repair task.

**Factory workflow.** Manufacturer acknowledges cut package version and may report that the imported marker needs a layer map or unit fix. An authorized technical owner creates a new destination-specific export revision, with hash and explicit loss diagnostics. Historical package remains untouched, and the order references the exact file used. Report marker yield, unplaced pieces and operator modifications separately from system estimates.

**Acceptance.** Simulate cutting 120 size-mixed hoodies under R01 and issuing R02 with a different hood notch. The dashboard must distinguish already cut R01 panels from revised R02 uncut quantities, flag their incompatibility and prevent a silent mixed production file. A target cutter import with wrong unit scale must fail numerical verification.

<!-- PAGE -->

## Page 48 | Factory package formats and round-trip receipts

**Export bundle.** Include `manifest.json`, technical-spec PDF/HTML, POM CSV, BOM with permitted commercial data, construction sheets, approved reference images, graded pattern DXFs, RUL/grade metadata if compatible, marker outputs, trims and sample/QC criteria. Every component is stamped with style, release ID and file hash. Generate exports from one immutable release snapshot, not whichever garment happens to be loaded on the desktop during asynchronous bundling.

**Interchange adapters.** Define versioned profiles for generic ASTM/AAMA, target apparel CAD, cutter/plotter, SVG/PDF and 3D presentation formats. Fields absent in the target format require a loss report. A GLB cannot be treated as a production pattern; a DXF cannot carry the complete sewn garment graph. A factory may receive both native-authoring JSON and industry-standard cut data only if entitled and technically relevant.

**Receipts and proof.** Factory acknowledges the exact bundle digest, records imported destination, destination version and optional proof screenshot or measured plot dimensions. The backend stores `ExportVerification` under the release, with pass/fail and which checks actually ran. A “downloaded” event does not mean the recipient opened or successfully interpreted all pattern layers. A “reimport passed” report does not imply a sewn sample fit was tested.

**Failure handling.** Background export jobs are idempotent; timeout/cancel should not leave partially published ZIPs. If a file fails checksum or required format conversion, mark the package `FAILED` and retain diagnostics. Changing one export profile creates a new export artifact associated with the same released source if approved; it never rewrites the original signed file.

**Acceptance.** Export an R02 hoodie and independently reimport DXF in a separate parser, compare piece counts/notch positions and print a reference scale square. Reproduce package hashes after repeated download. Remove a mandatory file during assembly and verify no incomplete “approved” ZIP reaches a partner; retry successfully without duplicating release.

<!-- PAGE -->

## Page 49 | Mobile, offline access and factory notifications

**Responsive portal.** On a phone, prioritize approved release, POM charts, construction steps, sample entry and assigned questions. POM viewer presents one selected size at a time with sticky measurement name, target, tolerance and actual. Technical flats and 3D previews have pan/zoom but can also be navigated as accessible object lists. File download is explicit and announces whether it is a static snapshot.

**Offline operations.** Allow granted users to download immutable, watermarked release PDF/ZIP for offline work. If storing web data offline, define encryption/storage policy, expiry and what can be revoked at the next connection; already downloaded static material cannot be retroactively erased. Local comment or measurement drafts show `PENDING_SYNC`, and server rechecks actor, release and expected revision before final acceptance. Conflicts are visible; they are not silently merged into new approved values.

**Notification design.** Issue context-aware alerts for factory questions, sample uploads, assigned decisions, release acknowledgements, production stage delays and revoked permissions. External notification previews avoid confidential measurements, suppliers or artwork when a recipient could see them outside an authenticated session. Email and in-app events reference scoped IDs; opening them still performs authorization. Digest preferences and mute controls prevent excessive alerts.

**Data consistency.** Every reported update has actor, created time, received time, associated release, idempotency key and status. Slow-network retries must not duplicate sample photos or count order units twice. If a user loses membership while uploading, the finalize step denies publication. Present timezone-correct factory deadlines with stored source timezone instead of guessing from the designer's laptop.

**Acceptance.** Test a 360 px browser entering actual sleeve length and attaching a photo during intermittent connection. It must retain draft without claiming successful submission until server confirms. Expire the invite, reconnect and reject the queued comment with a clear recovery message. Verify screen-reader navigation and no unauthorized data in push payload.

<!-- PAGE -->

## Page 50 | Factory pilot release tests and operational drills

**Pilot scope.** Use one approved hoodie style, two frozen releases, sizes S–XL, a true POM table, construction/trim BOM, at least one verified export profile and two isolated factory organizations. One manufacturer handles a sample fit problem and a proposed cuff change. The other works a separate order with distinct pricing and file access. Include a technical designer and a patternmaker in the brand approval path.

**Required journey.** Issue R01 from validated source G01, invite Factory A with limited permissions and obtain acknowledgement. Factory uploads Sample 1 photo and out-of-tolerance cuff measurement; a contextual issue is assigned to the designer. Factory proposes a revised cuff spec; designer accepts into Draft G02, updates geometry if supported, walks seams, checks grade and DXF, then obtains required approvals and issues R02. Factory acknowledges R02 and reports partial cutting against the correct release.

**Failure drills.** Race two reviewers modifying a POM, retry a network mutation, corrupt a source file, expire an attachment URL, revoke Factory A mid-session, attempt cross-tenant access from Factory B, change native geometry after a rendered proof was approved and restart backend during package creation. The workflow must preserve source and issued releases, reject stale edits, recover event sequences and clearly mark incomplete operations.

**Independent verification.** Compare web POM/BOM, PDF/ZIP and source export values by field hash and size. A factory pattern operator evaluates whether actual cutter import preserves units, grade and notches. An apparel technical reviewer confirms sample instructions make sense. Security tests assert that guessable IDs, nested media, search, events and notifications expose no partner data across organizations.

**Exit decision.** Pilot passes only if a full manufacturing revision is reconstructable and the factory can operate without developer intervention. Record failed requirements in a priority backlog with owner and evidence. Cosmetic screenshots, API response codes and a generated PDF alone are insufficient. Advance to more factories, pricing and deeper production tracking only after those invariants hold.

<!-- PAGE -->

## Page 51 | Photo studio outcomes and boundaries

**Purpose and user promise.** PHOTO STUDIO turns an approved garment revision into an executable photography plan: virtual frame previews, a measurable set, a shot sequence, a crew brief, physical lighting instructions, and a record of real captures. The product must distinguish a virtual proof, an approximate previsualization, a conceptual image, and a camera original. Each carries a visible classification and immutable provenance. Existing EXO stage previews establish a foundation for selecting environments; they do not establish a completed studio planning or photoreal rendering pipeline. The workflow begins with a style and ends with accepted deliverables and shot evidence.

**Data and interface.** Define PhotoProject(id, campaignId, title, ownerId, styleId, garmentLockId, intent, targetChannels, deliveryRatios, plannedShootDate, state, createdAt, updatedAt). Intent enumerates ecommerce, editorial, lookbook, productInspection, and mixed. The overview displays the locked sample, outstanding coverage, render jobs, scene dependencies, schedule readiness, approvals, and cost forecasts. Roles include creative director, CAD owner, producer, photographer, manufacturer reviewer, and read-only guest. Only the CAD owner may publish a new garment source revision; scene editors attach it by immutable reference.

**Lifecycle and failure.** A project advances draft, inReview, approvedForProduction, shooting, delivered, archived. Approval freezes a project revision, not future editing; amendments produce a traceable child. Missing asset permissions, unresolved garment identity, or unsigned releases block applicable publication stages. Network failure preserves local drafts with conflict notices; a failed render preserves the most recent valid preview and a truthful error state. Changes to colorway or sewing details invalidate dependent proof assets.

**Acceptance.** From one approved garment snapshot, a director creates a six-shot pack, associates source geometry, reviews virtual frames, exports a storyboard and lighting diagram, and records actual captures without losing revision references. Test role separation, stale notices, asset removal, and reopening approved projects. This page extends the proposed architecture in docs/research/exo-all-in-one-implementation-2026/PHOTO_STUDIO_BLUEPRINT.md; no professional parity is asserted until integration and visual QA pass.

<!-- PAGE -->
## Page 52 | Creative projects, looks and wardrobe

**Model.** A Campaign can contain several PhotoProjects. Each project contains Look(id, lookCode, displayName, garmentLockIds, assignedAvatarIds, colorwayIds, sampleUnitIds, accessories, stylingNotes, hairMakeupNotes, continuityReferenceIds, readiness). One look may feature layers, but every independently manufactured piece retains its own immutable lock. The UI shows a large reference still, labeled sample condition, approved colorway, size, pose compatibility, and a compact list of attached assets. Duplicate Look creates a new ID and explicit origin pointer.

**Editing behaviors.** Designers drag looks into shot groups, select physical or virtual wardrobe separately, and enter notes about cuffs, hood, closures, fabric face, steaming and accessory positioning. A change in garment render geometry creates a new look version; styling a physical sample creates a continuity event. A look inspector exposes source hashes, avatar measurements, physical unit availability, responsible stylist and fitting approval. Color changes applied to a 3D visualization may never recolor source 2D CAD pattern pieces or rewrite released material specifications.

**Scheduling rules.** Look dependencies track fitting, wardrobe prep, sample shipping, alteration and talent availability. If two concurrent shots require the same unique physical sample, the production board flags the conflict. Multiple camera perspectives of one look reuse a garment lock, while changing the draped pose records a new verified simulation or marks quick skinning as unverified. Accessories have rights, placement anchors and ownership metadata; the system prevents a borrowed prop from silently becoming an owned production item.

**Failure and acceptance.** An unavailable size leaves its planned shots editable but blocked from shoot readiness. A missing garment mesh offers a labeled placeholder, never an allegedly accurate rendering. Deleting a look with active shots offers reassignment or archiving and preserves historical references. Verify three looks across two colorways, one shared accessory, incompatible sampling times, and a replaced revision. The shot list must correctly identify the source garment and actual wardrobe unit in exported briefs, including when one physical sample differs from its digital counterpart.

<!-- PAGE -->
## Page 53 | Shots, setups and shot groups

**Entities.** ShotGroup(id, projectId, label, orderedShotIds, sceneVersionId, locationId, setupId, estimatedResetMinutes) represents shots sharing logistical resources. Shot(id, code, lookId, garmentLockId, sceneVersionId, cameraVersionId, lightingRigVersionId, poseVersionId, deliverableSpecIds, priority, status, ownerId) represents a capture requirement. Shot and StoryboardFrame remain separate objects: multiple illustrative moments can describe one actual setup. Identifiers such as CAM-A-01 remain stable even when display order changes.

**Behavior.** The timeline supports group creation, drag reorder, multi-select duplication, variants, dependencies, setup-time estimates and coverage tags such as frontLogo, rearSeam, sleeveShape and hardwareMacro. A group contains a reference image, shared equipment, location, light plot and estimated move time; individual shots override camera position or wardrobe while inherited settings stay visible. Conflicting group-level and shot-level values show effective values plus their origin. Editing a shared setup previews which shots will be affected before committing a new setup revision.

**Checks.** Every publishable shot needs an accessible garment source, agreed aspect ratio, recorded camera transform, intended focal subject and approved permissions. Shots with physical venue assignments also require access windows and resource availability. The coverage validator checks project-specific garment features and delivery requirements; it never assumes front/back alone meets all ecommerce requirements. Missing a detail shot raises a gap rather than generating fake evidence. Schedule optimization groups setups sensibly but respects talent, changeover and crew breaks.

**Failure and acceptance.** A deleted group reparents shots only after operator confirmation. Importing duplicate shot codes resolves collisions and retains source codes in audit metadata. If an upstream material changes, affected shots show stale renders but remain on the schedule for review. Test reorder, overrides, version restoration, export, and schedule conflicts. Six images across two groups must preserve camera and lighting identity when moved, and a human should recover the exact approved composition months later.

<!-- PAGE -->
## Page 54 | Storyboards and contact sheets

**Representation.** StoryboardFrame(id, shotId, frameOrder, mediaAssetId, cameraMoment, description, focalFeature, annotationIds, referenceRightsId, reviewState) is independent of the render output. ContactSheet(id, projectRevision, templateVersion, selectedFrameIds, paperSize, layout, generatedDigest) records a reproducible sheet. A frame can be sketched, imported, or generated from Three.js or Cycles; the thumbnail carries source type and revision, never a claim that a virtual image is a camera capture.

**Editor.** Provide a grid, chronological strips and printable page mode. Reorder frames without modifying shot ID or camera values. Pin comments at normalized image coordinates so annotations survive export scaling. Each cell can expose a cropped reference and its shot code, aspect, lens, camera height, light setup, garment version, action direction, model pose, location and approval. Export letter/A4 PDF and a machine-readable JSON attachment; pagination must be stable for the same revision and template, including font fallback and long captions.

**Version and rights.** Changes to camera or pose mark dependent preview images stale. Users may preserve an approved frame as historical reference while proposing an updated candidate. Imported inspiration images require source URL or file digest, usage license, creator attribution and permitted distribution audience. Export can automatically mask private talent references from external vendor editions. Review records author, timestamp, comment, decision and specific content hash; a generic campaign approval cannot silently bless revised frames.

**Failures and acceptance.** Missing images render explicit missing-asset cells with codes; no frames disappear or shift numbering invisibly. A failed PDF generation yields a diagnostic and leaves the prior approved document intact. Validate a twelve-frame contact sheet, annotations in print and mobile view, mixed virtual and photographed sources, rights-restricted vendor export and a changed shot revision. Every exported frame must map back to one unambiguous Shot and StoryboardFrame through identifiers retained in metadata.

<!-- PAGE -->
## Page 55 | 3D stage library and quality gates

**Existing inventory.** docs/research/exo-all-in-one-implementation-2026/PHOTO_STUDIO_BLUEPRINT.md describes twenty stage preset IDs, R01–R05 and S01–S15, in src/data/stagePresets.js, alongside five curated selectable StageCatalog choices, including the MIKRISTIAN Cathedral House. These inventories must remain distinct. Existing preview integration via src/core/createStageEnvironment.js and GLTFLoader is an initial capability, not evidence of photoreal or physically surveyed environments. The new library shows asset origin, measured status, visual QA level and render availability.

**Asset contract.** StageAsset(id, assetVersion, catalogSourceId, classification, geometryHash, materialHash, textureManifest, dimensionsMeters, floorPlane, origin, bounds, triangleCount, previewIds, licenseRecordId, QAStatus, supportedEngineProfiles) references immutable content. Status progresses draft, measured, visualReviewed, approved, archived. A stage can be suitable for editorial visualization while remaining unsuitable for physical venue planning. Filters expose studio, runway, architectural, outdoor and product tabletop sets, followed by rights and measured-geometry filters.

**Interaction.** Cards load actual 3D geometry on hover or click where feasible, with thumbnail fallback explicitly labeled. The stage preview supports orbit, lit object inspection, floor grid and material resolution warnings. Scene selection pins a stage version and does not change an approved garment or teleport the subject without a reported placement update. Operator-defined floor anchors, ceiling heights and entrances are viewable; unknown values remain unknown and cannot be inferred from an appealing image.

**Failure and acceptance.** Failed GLB loads record URL, network result, parser error and fallback state. A missing texture cannot promote the asset to approved. Imported public reference listings retain licensing uncertainty, and EXO-created representations are labeled as such. Test all curated choices at desktop and mobile widths, confirm geometry exists for claimed 3D previews, and verify that stale thumbnails cannot masquerade as loaded meshes. Promotion requires inspected dimensions, critical camera views and at least one offline render comparison.

<!-- PAGE -->
## Page 56 | Stage schemas, units and transforms

**Canonical coordinates.** Store positions and dimensions in meters, orientation in a declared right-handed Y-up coordinate system for the interactive scene, and transforms as position vector, quaternion and scale vector. StageVersion references asset digest, authored basis, world basis, import conversion matrix, floor normal, measured bounds, collisionsVersion and material set. The Blender compiler must convert Y-up to Z-up with an explicit, roundtrip-tested basis transform. Avoid automatic scaling or recentering after shot approval.

**Schema.** StageManifest(schemaVersion, stageAssetId, versionId, geometryDigest, textureDigests, unitScaleToMeters, originalAxisConvention, anchorPoints, cameraExclusionVolumes, ceilingHeightMeters, floorLoadNotes, venueSurveyId, qualityFlags) is JSON validated before any render. Each anchor has stable ID, name, 3D transform, purpose, confidence and source. Imported Blender files, GLB and manually measured plans may have different unit conventions; importer displays a dimension check using a standard 1 m cube and requires explicit confirmation when metadata is inconsistent.

**Migration.** A schema upgrade produces a new immutable manifest, preserving the prior asset and a migration report of changed matrices, bounds and anchors. Cache keys include stage manifest digest, so the runtime never mixes a new floor with previous collision meshes. Camera viewpoints and prop positions retain local-to-stage coordinates; moving a scene as a whole applies a parent transform without silently rewriting source assets. Floor and wall normals are checked for reversed winding and visually indicated when correction is proposed.

**Failures and acceptance.** Reject NaNs, nonfinite transforms, zero scales, unsupported coordinate basis, absent geometry and unresolved hashes. Negative scale can reverse normals and must be handled explicitly or blocked. Test imported 2 m doorway and 3 m ceiling across both engines with numeric tolerances defined per asset. Reopening a project preserves object positions and camera horizon. A Blender export and Three.js preview must agree on reference anchor distances before users may classify a stage as geometrically matched.

<!-- PAGE -->
## Page 57 | Props, collision and practical blocking

**Asset and instance separation.** PropAsset holds source mesh digest, asset units, materials, dimensions, massEstimate, owner, license, physicalAvailability and practicalNotes. PropInstance holds sceneVersionId, propAssetId, transform, anchorId, collisionShapeId, visibility, stylingOverrides and reservationId. A virtual marble plinth and a real rental plinth can share a creative label while having distinct material, size, weight and logistics records. Inventory must never infer rental confirmation from scene placement.

**Editing.** Users insert columns, CRT monitors, stools, fabric rolls, flags, benches and custom imported geometry from searchable cards. Snapping modes include floor, wall, anchor, measured grid and free transform. Provide numeric coordinate inputs, rotation, duplicate, grouping, multi-selection, undo and lock. Collision overlays show prop-to-prop, prop-to-model and camera-travel intersections. Collision is advisory during concept planning; physical production readiness requires documented clearances, route widths and appropriately reviewed load/rigging details.

**Interaction and dependencies.** Parent-child links keep a CRT on its wheeled base while still exposing independent cable routes and power needs. Hidden props may remain in asset lists and render variants but must not occupy physical floor-plan space unless assigned a reserved footprint. Heavy equipment blocks movement paths even when cosmetic geometry is small. Floor markers, stand legs and human movement envelopes are distinct collision classes so a tight editorial shot can carry an explicit reset or obstruction note.

**Failures and acceptance.** Missing collision proxies display an incomplete blocking warning instead of a safe-to-shoot flag. Failed imports preserve an instance placeholder with asset error details. The editor detects intersections without automatically moving approved camera positions. Verify the user can place a column and CRT, align them numerically, identify a blocked doorway, export the metric top view and restore previous placements after undo. Tests must include rotated props, nested transforms and asset revision changes affecting dimensions.

<!-- PAGE -->
## Page 58 | Avatars, poses and revision-locked drape

**Identity.** AvatarAsset(id, rigDigest, measurementProfileId, rightsId, presentationType, sourceKind) describes a mannequin or licensed performer representation. PoseVersion(id, skeletonSchema, jointTransforms, rootTransform, gazeTarget, handPose, footContacts, timeIndex) represents pose independently. AvatarInstance binds avatar, pose, transform and look to one shot. Reference scans require permitted use and protected access to source identity data.

**Garment consistency.** GarmentLock links a specific style, colorway, size, pattern/seam manifests, approved materials, geometry and cloth simulation digest. Changing pose can invalidate simulated drape even if garment manufacturing revision is unchanged. The UI must label pose presentation approvedSimulation, quickSkinnedPreview or unverified. If collision or stress checks fail, prevent a pose from being presented as a verified product-fit render. Operators can intentionally use a dramatic editorial pose with an unresolved fit warning.

**Controls.** Offer upright front, quarter turn, profile, walking contact and passing frames, seated, hands-in-pocket and arm movement starting poses. Each control supports exact joint changes, pose mirroring, foot anchoring and cloth resimulation request. Show penetration, stretched panels, hem inversion, seam distortion and disappearing fasteners in a diagnostic overlay. Avoid editing the underlying production pattern when an art director adjusts arm position or avatar proportions. An approved digital body shape is not itself proof of physical sample fit.

**Failures and acceptance.** Missing joints or incompatible rig versions block animation retargeting; they do not silently drop bones. Record solver version, gravity, collision scale and fabric profile for any newly simulated cache. If generation fails, retain the prior validated pose/render and show the failed candidate separately. Test a two-avatar shot, two poses of one hoodie, a seated collision warning, and switching colorway revisions. Every export identifies avatar, pose and simulation source, and distinguishes quick viewport deformation from validated cloth output.

<!-- PAGE -->
## Page 59 | Camera sensor geometry and framing

**Camera model.** CameraVersion stores world transform, sensorWidthMm, sensorHeightMm, focalLengthMm, focusDistanceM, apertureF, shutterSeconds, ISOPlanningValue, cropMode, renderGate, pixelAspect, lensProfileId and optional shift. Scene dimensions use meters; optics fields retain their physical units. Derive horizontal and vertical field of view from the active sensor gate and focal length, accounting for crop. Record camera height above the surveyed floor and subject reference distance independently.

**Operations.** Camera view is the default composition canvas with thirds grid, center mark, safe areas, product outline, horizon, ground projected field and logo visibility guides. Support track, dolly, truck, pedestal, pan and tilt as distinct controls; orbit is a convenience control with an indicated pivot. Numeric transforms must update the viewport and offline scene manifest identically. A locked product camera prevents accidental field-of-view shifts when an operator changes browser width. Output ratio crops should preview both original gate and target crop.

**Shot continuity.** Save named rigs CAM-A, CAM-B and CAM-MACRO, with shot-specific versions. Duplicate a shot to compare focal lengths without inheriting accidental stage edits. Pose and camera collision checks flag a wall-mounted camera, a camera inside the avatar or a blocked dolly path. Camera matching to real photos requires calibration measurements; approximate EXIF matching must be labeled estimated. Motion shots add time samples, frame rate, keyframed camera path and stabilizer notes.

**Failures and acceptance.** Disallow zero or negative focal lengths, invalid sensor dimensions and nonfinite transforms. When a requested crop excludes a required logo, raise a coverage warning without changing composition automatically. Test full-frame and APS-C sensor presets for different fields of view at the same focal length; verify image extents numerically. A documented 1 m subject should occupy matching screen proportions at matching camera configurations in both Three.js and Blender within published tolerances.

<!-- PAGE -->
## Page 60 | Lenses, focus and depth of field

**Lens identity.** LensProfile includes manufacturerLabel, modelLabel, focalLengthMm, projectionModel, maxAperture, focusRangeM, distortionAssetId, vignetteCurveId, breathingNotes and calibrationStatus. CameraVersion references the specific lens profile version. A generic 85 mm lens is a simulation default, never a claim to reproduce a particular commercial lens character. Users may keep an abstract profile until rental equipment is chosen, but such shots remain optically approximate.

**Focus behavior.** Set focus by distance, selected garment feature, avatar eye, or a manually positioned focus plane. Store focusTargetId and resolvedDistanceM; if the target moves, the operator selects trackFocus or holdDistance semantics. Depth-of-field preview presents a visible focus overlay and cost-saving approximation in Three.js, while offline output uses Cycles camera settings and separately verified bokeh. Near and far focus indications need units and sensor-dependent computation; do not promise precise real-world sharpness from crude post blur.

**Framing effects.** Aperture changes exposure planning metadata and geometric defocus, with a preview indicator if renderer assumptions differ. Lens distortion, chromatic aberration and vignetting belong to explicit optional profiles; they must not warp technical garment measurements in product proof without disclosure. A macro shot includes minimum working distance, expected subject size, desired logo pixels and a stable tripod or focusing rail note. The UI should warn if the requested focus plane cannot be reached.

**Failure and acceptance.** Missing calibration yields neutral optics and a clear estimated badge. Unsupported tilt/shift parameters produce a validation error or labeled fallback rather than silently changing output. Test focus on garment chest print, then rotate the avatar while holding versus tracking focus; confirm distinct saved results. Compare wide-open and stopped-down offline crops at equal viewpoint, checking selected feature sharpness. Export the chosen physical lens identity and focus intention to shot metadata and crew instructions.

<!-- PAGE -->
## Page 61 | Light rigs, energy and color temperature

**Lighting schema.** LightRigVersion owns LightEmitter instances with transform, type, luminous magnitude and declared unit, emitting dimensions, CCTKelvin, tint, shape, spread, exposureMultiplier, shadowSetting, IESDigest and rig group. The UI distinguishes emitter approximation from physical fixture. Key, fill, rim and backdrop labels encode creative role; one physical fixture can contain several emitters when its optical behavior demands it.

**Preset workflow.** Supply high-key seamless, clamshell, split key, softbox beauty, dual rim, product macro and top-down setups. Applying a rig creates an editable shot instance referencing a pinned preset revision. Knobs control placement, aim, emitter dimension, intensity, CCT and exposure. A floor-plan view shows measured height, bearing, distance to subject and throw, with elevation inset and camera axis. Light balancing should preserve intentional ratios when moving a whole rig; changes of light count identify resource increases.

**Accuracy.** Three.js uses a visually useful approximation for interactive previews. Cycles receives mapped area, spot and environment emitters, checked energy units, color transforms and shadow settings. Kelvin values alone do not predict complete fixture spectra or physical fabric appearance. Gray card, color chart, calibrated monitor and actual sample observations remain necessary for approving product color. Scene versions store world environment and all emitters to prevent nondeterministic appearances.

**Failure and acceptance.** Reject missing or nonpositive emitter sizes and unsupported IES assets with diagnostics. Warn when light stand footprints overlap subject movement or fixture clearance zones. An extreme CCT selection may be allowed creatively, but cannot overwrite the released fabric swatch standard. Test applying a rig to two shots, editing only one inherited instance, and comparing planned lighting across preview and Cycles. Export a versioned metric lighting plot identifying every source, orientation, modifier intention and uncertainty.

<!-- PAGE -->
## Page 62 | Translating virtual light to real fixtures

**Mapping.** RealFixture(id, manufacturer, model, serialOrRentalRef, outputProfileId, powerWatts, supplyType, modifierId, standId, maxHeightM, massKg, availabilityState, sourceVendorId) is linked to a virtual emitter with TranslationMapping. Mappings store measured output assumptions, expected beam angle, emitter area, diffuser/flag setup, fixture-to-subject distance and confidence. A visual virtual softbox cannot count as a booked softbox or a confirmed real irradiance level.

**Planning.** Provide a searchable catalog of actual fixture specifications and modifier dimensions, seeded only with sourced product data or user-entered equipment. The translator proposes an equipment package, light plot and rental checklist using the closest compatible fixture profile. The producer approves or swaps each mapping and sees revised power, cost, floor footprint and setup time. A placement can specify stand height, boom reach, sandbag, cable route and required crew role. Outlets, venue circuits and rigging points remain survey-dependent.

**Review.** The lighting plot includes a scale bar, subject center, camera position, coordinates in meters, fixture aim, modifier direction and light numbers. Version the diagram alongside the shot revision and include a substitution log on call sheets. Environmental daylight and reflective surfaces are notes until measured; synthetic light matching is a planning aid that depends on spectral behavior, flagging and wall bounce.

**Failure and acceptance.** If actual gear lacks an output profile, mark translation estimated and request meter readings during setup. If circuit capacity or allowable rigging is unverified, prevent automatic safety certification. A fixture with insufficient height marks the layout infeasible; an unavailable rental remains proposed. Test a three-light studio setup with one alternate softbox, a blocked stand, a verified and an unknown power circuit, and two vendor substitutions. Export must retain both virtual creative intent and physical placement instructions, clearly distinguishing simulations from verified on-set measurements.

<!-- PAGE -->
## Page 63 | Materials, shaders and color management

**Source preservation.** Product materials inherit approved GarmentLock bindings: textile assignment, colorway, texture maps, physical roughness assumptions, normal/displacement sources, UV coordinates and logo/artwork geometry. Editing editorial lighting or a temporary stage color must not mutate the material specification or change white 2D pattern surfaces. Provide separate TechnicalMaterialVersion and EditorialOverride layers, with the latter clearly disclosed when generating product-proof images.

**Shader compilation.** Represent supported baseColor, metallic, roughness, normal, alpha, transmission and displacement in a versioned canonical material description with input digests. The Three.js adapter uses documented real-time approximations; Blender converts compatible properties to node inputs, with explicit fallback for unsupported procedural shaders or texture channels. Bake a node network only when the operator requests and the derived texture is tracked. UV seam alignment, color space of each map, tangent basis and normal strength must survive conversion.

**Color chain.** Store source swatch measurement method when available, profile assumptions, illumination, exposure, rendering view transform and export conversion. Masters should preserve high-bit-depth data where supported, with explicitly transformed sRGB review derivatives. A rendered gray card aids comparison but cannot establish textile spectral accuracy. The review UI shows the same camera crop under shared viewing transforms and allows manufacturer reviewers to reject a mismatch without editing the original CAD material.

**Failure and acceptance.** Missing map hashes, invalid UV channels and unsupported transparency create visible warnings; never substitute a decorative gray texture invisibly. Denoising may erase fabric weave, so detailed textile proof requires crops at final output resolution. Test two colorways, a logo normal map, brushed metal trims and translucent fabric under one light rig. Verify that switches affect only the intended look variant and that exported renders preserve garment source hashes, override flags and color-transform versions.

<!-- PAGE -->
## Page 64 | Garment fidelity gates and image QA

**Fidelity classes.** A scene can be creativeConcept, approximatePreview, geometryChecked, materialReviewed or approvedProductProof. These levels are scoped to a shot/output version and have different evidence requirements. A pretty render may fail seam placement, fit, logo scale or textile color review. Approved product proof requires content-linked garment lock, valid drape snapshot, physical dimensions check, material audit and named human review. It never certifies physical manufacturing quality without sample evidence.

**Inspection tools.** Overlay pattern IDs, seam curves, topstitch paths, print/logo boundaries, button centers and hem guides in 3D and in projected image coordinates. Provide zoomable pixel crops, side-by-side approved sample photos, silhouette differences, UV checker, texture resolution statistics, interpenetration heatmap and normal-direction checks. Reviewer records accepted and rejected observations by precise feature IDs and crop coordinates; corrective art direction produces a new derived candidate, preserving the original output.

**Automated gates.** Validate garment asset digests, mesh manifold expectations where relevant, nonfinite coordinates, missing geometry, reversed normals, invisible trim objects, minimum logo visibility and source aspect constraints. Feature thresholds are category-specific and configurable by the CAD owner; a sheer garment cannot use generic opaque collision heuristics. Drape simulation quality is separate from physical fit validation. Review evidence references exact pixel assets and renderer versions, not ephemeral browser screenshots.

**Failures and acceptance.** A missing button blocks a trim-required proof even if its full-body thumbnail looks acceptable. A deliberate silhouette crop may satisfy an editorial shot while failing required product coverage. Test a dropped zipper, hidden back print, flipped normal patch, moved logo and changed colorway; each should generate actionable detection or documented manual review. Publication retains failure reports and precise waiver identity where a stakeholder accepts a known limitation. See docs/research/exo-all-in-one-implementation-2026/PHOTO_STUDIO_BLUEPRINT.md for the immutable garment contract.

<!-- PAGE -->
## Page 65 | Responsive Three.js composition preview

**Runtime goal.** The interactive studio provides low-latency composition, navigation, prop blocking and lighting direction. Render mode is explicitly previewWebGL with an uncertainty label relative to offline Cycles. Load only visible geometry and compatible level-of-detail resources; maintain stable project state outside the renderer so a GPU context reset does not lose shot edits. A first-frame skeleton and progress state avoid blank canvases masquerading as completed stage loads.

**Architecture.** A versioned SceneManifest feeds a Three.js adapter that creates stage, prop, avatar, garment, cameras and lights. Each loaded object stores its content hash and engine-specific diagnostics. Dispose geometries, textures and render targets on stage change and cancellation, while caching immutable resources by digest. UI layout remains responsive with numeric editors accessible on narrow screens; the camera aspect adapts using defined crop behavior, never overwrites stored sensor geometry.

**Interaction contract.** Orbiting the editor must not unintentionally mutate the selected shot camera unless camera-edit mode is on. Gizmos, snapping, clipping planes, grids and focus overlays are individually toggled. Picked objects expose stable IDs and selection highlights. Provide performance quality tiers and transparent estimates for shadows, SSAO, material response and depth of field. Asset load failures allow retry and show detailed reason; previous valid renders remain available for review.

**Validation.** Test realistic garment and stage assets at desktop and narrow mobile viewport; check actual mesh counts, load errors, camera math, selection, transform undo and scene reload. Capture reference screenshots at pinned viewport dimensions, drivers and settings, but do not use screenshots alone as correctness evidence. A manifest edited from the interface must serialize and reconstruct equivalent placements after refresh. The stage catalog's current work-in-progress assets remain labeled until each reaches visual and geometry QA.

<!-- PAGE -->
## Page 66 | Blender scene compiler and parity checks

**Compiler role.** A server-side compiler consumes a signed immutable SceneManifest, resolves content-addressed GLBs/textures, applies the declared Y-up to Blender Z-up transform, builds collection hierarchy and saves a reproducible .blend artifact. Source stage objects, garment meshes, materials, avatars, props, rigging, camera and lights must retain source IDs in Blender custom properties. No compiler stage reads the current mutable UI after job submission.

**Contract.** CompilationRequest(manifestDigest, adapterVersion, blenderBuild, renderProfileVersion, assetResolverVersion, outputPolicy) produces CompilerArtifact(blendDigest, dependencyDigests, warnings, transformAudit, materialAudit, cameraAudit, buildLog). Validate units, signed geometry transforms, lens sensor gate, focus distance, color interpretation, rig poses and missing texture references. Render helpers must not quietly center the garment, change seam geometry or apply undocumented smoothing. Unsupported shaders require recorded baking or explicit fallback acknowledgement.

**Equivalence testing.** Compile a calibration stage containing measured rulers, three reference spheres, a textile swatch, an avatar, a known logo and one camera. Compare projected feature positions and apparent size in Three.js and Blender within declared tolerances. Also compare floor anchors, camera direction, material channel values and relative emitter placements. Color and shadow comparisons have wider documented tolerances; geometric equivalence does not imply pixel-perfect visual equivalence.

**Failures and acceptance.** Schema mismatches and unresolved digests fail before Blender launch. A Blender crash preserves manifest and logs, and keeps previous compiled artifacts available. Cache compilations by manifest digest and compiler build; version changes force recompile. Test two full scenes, one missing texture, one incorrect basis, and one replaced garment lock. An authorized reviewer should inspect compiler warnings, download the source manifest, reconstruct the project and explain why any preview-to-offline difference occurred. The compiler must also emit a human-readable conversion report listing original and resolved object transforms, units, shader substitutions and export warnings. This report accompanies each offline artifact so independent QA can reproduce the compiled environment without guessing at hidden defaults.

<!-- PAGE -->
## Page 67 | Cycles profile and rendering pipeline

**Output profiles.** Define proofCyclesDraft, proofCyclesFinal and editorialCyclesFinal as versioned parameter sets with engine and Blender build, device policy, pixel dimensions, sample cap, adaptive threshold, bounces, denoise flags, world/HDRI, exposure, view transform, transparency and enabled passes. A shot records target channel and aspect ratio separately from render resolution. Preview thumbnails may be cheap; finals must use measured render settings and verifiable output quality.

**Execution.** A render worker verifies artifact digests, loads an isolated compiled scene, sets deterministic seed where supported, selects compatible CPU/GPU devices and writes masters to a temporary directory. Prefer multilayer OpenEXR for layer-aware masters and derivative PNG/JPEG with published color transformations. Hash outputs, inspect resolution/frames/channel count and atomically publish a complete result set. Record sample counts, frame duration, GPU model, Blender version, adaptive noise configuration and log digest.

**Detail retention.** Garment folds, stitches, textile weave, transparencies, specular trims and fine printed graphics need close-up proof crops at final pixel resolution. Draft denoise can flatten texture, while excessive displacement can distort approved CAD silhouettes. Technical review compares the render to immutable garment feature geometry and optionally a photographed sample; art-driven retouch is logged as a downstream derivative. Publish source manifests with every render so a production reviewer can identify exact colorway and simulation cache.

**Failure and acceptance.** Out-of-memory, unsupported denoiser, missing pass or bad EXR metadata must fail the job clearly and retain diagnostic files. A configurable CPU fallback requires an explicit profile change and revised cost estimate. Test single frame, portrait crop, macro seam shot and a short camera animation; validate output dimensions, provenance, passes, file integrity and no silent rerender of changed UI state. No claim of real-world fabric color fidelity follows solely from a passing Cycles render.

<!-- PAGE -->
## Page 68 | Render queue, retries and idempotency

**Queue model.** RenderJob(id, projectRevision, shotVersion, manifestDigest, compilerDigest, profileDigest, frameRange, priority, key, state, attempt, workerId, submittedBy, outputSetId) captures immutable inputs. States include queued, validating, compiling, ready, rendering, compositing, verifying, published, failed, cancelled and stale. UI progress derives from actual worker events, frame completion and render logs; invented percentages are forbidden. Job detail exposes resources, time stamps and failure reasons.

**Idempotency.** Compute key from manifest digest, profile digest, compiler build, frames, asset resolver version and deliberate iteration seed. Submitting an equivalent job returns its prior verified output or an existing active job. Re-render requests can create a uniquely numbered iteration with a reason. A changed light, garment lock or frame count changes the key. Publishing uses temporary object keys followed by digest verification and atomic pointer update; half-built outputs never replace successful published sets.

**Scheduling.** Apply fairness across users and cap GPU memory, worker concurrency and reservation budgets. A quick ecommerce proof can outrank a low-priority editorial sequence when authorized, with an audit of priority changes. Estimate cost and duration from device- and scene-specific benchmark history, showing uncertainty. Queue operators can retry transient failures up to a configurable budget, cancel before publish and resume eligible frame ranges without claiming a partial sequence is complete.

**Failures and acceptance.** Detect stale heartbeats, duplicate deliveries, partial uploads, corrupt EXR frames and content hash mismatch. Worker restarts must be safe: repeated completion events cannot publish two conflicting finals. Test ten duplicate submissions, cancellation during render, storage outage during publication, GPU failure with explicit fallback and upstream garment revision edit. Outputs must always point to the manifest they actually rendered, and previous successful versions remain accessible throughout retries. Retried frame subsets require explicit completion masks and validation against the original frame-range specification. Expired jobs release worker reservations, while retained manifests and logs support operator diagnosis. Publication events must be durable and queryable by shot identifier.

<!-- PAGE -->
## Page 69 | Render passes and compositing revisions

**Pass contract.** PassSet(id, renderJobId, beautyDigest, alphaDigest, depthDigest, normalDigest, shadowDigest, cryptomatteDigest, objectIdDigest, colorTransformVersion) records available channels, data type and color interpretation. A requested pass unsupported by the configured Cycles build blocks the corresponding requirement or shows a deliberate fallback. The interface distinguishes source multilayer EXR from flattened display images; generated JPEG is never substituted as the technical master.

**Compositing.** CompositeVersion references immutable source render outputs, photographic plates, masks, adjustment graph, LUTs, typography overlays and operator. Nodes include exposure and color balance, background replacement, shadow grading, crop and limited cleanup. Every node specifies input/output color spaces. A generated background or retouched garment component is labeled in provenance, especially when mixed with real campaign captures. Product-proof permissions prohibit altering approved seam positions, logos, trims and silhouette without creating a flagged nontechnical creative derivative.

**Review interface.** Offer split view and opacity slider for raw beauty versus composite, channel inspection, zoom at 100%, feature overlays and pinned comments. Edits produce a new composite manifest and derivative asset rather than modifying EXR masters. Export presets enforce ratios and delivery formats with ICC transformation decisions recorded. If contact sheets use composited frames, their annotations retain links to the underlying source renders and photographic plates.

**Failure and acceptance.** Missing alpha yields a specific diagnostic rather than a black background. Different depth conventions or straight/premultiplied alpha cannot be silently mixed. Validate a reflective logo, hair transparency, shadow pass, camera plate integration and a mobile crop with controlled sRGB export. Confirm that changing one composite node alters only the new derivative and leaves the garment lock, raw passes and previous approvals intact. Rendering passes are an optional but defined capability of the proposed pipeline, not a currently verified shipped feature.

<!-- PAGE -->
## Page 70 | Review, approvals and change records

**Roles and decisions.** ReviewRequest(id, artifactType, artifactDigest, projectRevision, reviewerIds, requestedAt, dueAt, decisionState) groups decisions per exact output. Decision(id, reviewerId, role, verdict, annotations, timestamp, waiverReason) records approve, requestChanges or reject. Creative director signs composition; technical CAD reviewer signs construction fidelity; production lead signs physical readiness; rights holder signs use when applicable. An approval is invalidated only by a declared changed dependency, never by arbitrary unrelated notes.

**Interface.** Review board shows virtual draft, Cycles final, composite and on-set camera original as separately labeled columns with synchronized zoom and compare controls. A timeline reveals each asset's source locks, render version, author and superseding derivatives. Comments attach to image coordinates or object feature IDs. Resolve comments via a candidate version and explicit reviewer closure. Exportable approval packets list decision scope, pending issues, asset digests and waivers.

**State rules.** An artifact progresses submitted, underReview, changesRequested, approved, superseded or withdrawn. Rendering completion is not approval. A revised seam mesh or material hash marks affected visual proofs stale and requests re-review. A changed camera crop may require editorial approval but leave the technical garment lock valid. The manufacturer can comment on visible details without obtaining write access to technical patterns or garment simulation.

**Failures and acceptance.** Duplicate reviewer clicks remain idempotent; permissions are enforced server-side and audit events are append-only. Broken links retain artifact metadata and show restoration tasks. Test concurrent comments, rejected logo placement, technical signoff followed by a fabric change, and selective approval of a safe crop derivative. Exports must identify who approved which exact pixels and under which source revision. No status should imply that a concept image establishes physical sample accuracy. Review invitations include a permission-scoped link, due date and notification preference. The system records acknowledgment independently from acceptance. Reviewers who lack rights to a sample photograph see a protected thumbnail and can still comment on approved public derivatives.

<!-- PAGE -->
## Page 71 | Ecommerce coverage presets and marketplaces

**Preset specification.** EcommercePackVersion defines shot templates, required garment features, studio geometry, lighting profile, camera defaults, permitted background palette, aspect ratios and destination-specific validation. Initial neutral templates include front, three-quarter, side, rear, chest branding, trim macro and size/fit detail. Platform requirements are configurable and sourced; an example marketplace profile cannot be treated as timeless universal policy. Snapshot each profile when applied.

**Workflow.** Starting from a GarmentLock and Look, the wizard proposes coverage and displays why each requested image exists. Users may keep one light rig for body shots and switch to a separate macro rig for fine details. The shot table shows model/mannequin, orientation, focal feature, crop safety and required output size. A white seamless set carries a measured background plane and high-key emitter arrangement, with physical gear needs translated only when a venue is specified.

**Consistency.** All images in a pack reference declared sample size, colorway and source revision. Camera height and model marks can be locked between front, side and back for coherent comparative imagery. Background cleanup and flattening must not erase hemlines, transparent material or true logo boundaries. The UI flags large differences in product scale and white point across a set; an editor may approve exceptions with notes. Asset labels distinguish technical evidence from editorial interpretations.

**Failure and acceptance.** Missing rear-logo coverage, low-resolution detail, inaccessible model asset or stale garment materials block full-pack approval but do not erase draft shots. Validate generation of a six-shot virtual pack with documented camera, garment and light settings; export originals, crops, contact sheet and JSON coverage result. Verify changing a marketplace profile creates an explicit new delivery revision. The system must make gaps actionable without automatically inventing unrendered product images.

<!-- PAGE -->
## Page 72 | Editorial and campaign storytelling presets

**Creative grammar.** EditorialPresetVersion combines narrative beats, stage family, shot role, camera motion, pose suggestions, lighting transitions, props, styling notes and output ratios. Examples include concrete monument, dark cathedral, CRT-and-column signal, runway passage, night exterior and frozen landscape concept. Such presets express visual direction; location photography, venue accessibility and manufacturing proof remain independent concerns. Presets carry author, license and references for imported creative assets.

**Sequence editor.** A campaign can define opening, introduction, detail, tension, hero and resolution beats with optional timing and music reference. Each beat maps to ShotGroups and StoryboardFrames. Users swap stage assets and lighting without losing garment identity. The system recommends coverage for both logos and colorways when a campaign brief requires them, but it displays uncovered features as explicit tasks. Motion previews store camera rails, pose frames and transition notes instead of promising a finished cinematic animation from a still image.

**Production translation.** Each editorial idea has feasibility fields: virtualOnly, physicalFeasible or unassessed; stage dimensions; set construction estimate; location permit dependencies; special effects; props; talent and weather constraints. A snowy pond reference requires separate location and seasonal verification before becoming a physical shoot. Creative assets that do not correspond to measured real locations are labeled concept. A preset's narrative arc may be preserved when the producer substitutes a rented studio backdrop for an impossible location.

**Failures and acceptance.** Missing props or rights-restricted references remain visible as unresolved dependencies. If a target aspect crop removes a branded detail, the storyboard shows an explicit coverage conflict. Test six narrative beats, two garment colorways, stage substitution, a camera move and alternate vertical delivery. The exported package must include both expressive visual references and concrete setup instructions without confusing visual mood for approved fabrication details or confirmed travel logistics.

<!-- PAGE -->
## Page 73 | Surveyed physical studio and venue plan

**Venue record.** VenueVersion includes address visible only to authorized production roles, leaseOrPermissionStatus, roomBoundsMeters, ceilingHeightM, entranceWidthM, floorLoadRatingStatus, accessibleRoutes, windows, powerCircuitSurveyIds, riggingPermissions, blackoutOptions, ambientNotes, referencePhotos and surveyConfidence. Survey geometry is separated from approximated walls and props. Never infer real dimensions from a marketing picture or a decorative GLB.

**Plan editor.** Draw walls, doors, columns, cyc curves, power outlets, load-in route, bathrooms, holding zones, wardrobe, makeup and egress on a metric floor grid. Overlay virtual camera and light positions with stand and operator footprints. Show clearance intersections, camera travel corridors, ceiling elevation and reflective surfaces. Every planned marker references a shot or setup ID, so moving a fixture can propagate an auditable proposed update to dependent light plots. Printable diagrams include dimensions and scale bar.

**Operational checks.** Room and booking status, venue contacts, access hours, floor protection requirements and sound restrictions must be explicitly verified. Circuit calculation uses stated device wattage against recorded local capacity; it cannot certify electrical or rigging safety automatically. Unknown ceiling anchor certification blocks a suspended fixture plan, leaving a permitted floor-stand alternative. Separate speculative locations from booked venues and published call sheets.

**Failure and acceptance.** Conflicting survey revisions require review and cannot silently rescale approved camera marks. Offline notes merge with conflict records rather than overwriting another surveyor's measurements. Test a room with a door, columns, 3 m ceiling and three lights; detect blocked egress and incompatible boom height, then export both top-down and elevation layouts. A producer must be able to trace a floor mark from physical diagram to intended virtual Shot and back, including uncertainty annotations. Survey records include measuring instrument, operator, capture date and confidence interval for each critical dimension. Export flags which room elements have never been measured, helping the crew distinguish a provisional sketch from a verified installation layout.

<!-- PAGE -->
## Page 74 | Crew, call sheets and equipment logistics

**Data model.** ProductionDay(id, venueVersionId, date, timezone, status, setupSequenceIds) relates CrewAssignment, TalentBooking, EquipmentReservation, WardrobeUnit and CallSheetVersion. CrewAssignment stores role, contactPermissions, availability, confirmedCall, wrapEstimate and acknowledgment. EquipmentReservation stores vendor, asset ID, serial/rental reference, pickup window, return window, booking confirmation, dimensions and power. Public call sheets expose only approved contact channels.

**Scheduling.** The producer orders shots by light setup, location, talent, garment change and priority. The timeline accounts for load-in, build, calibration, wardrobe, breaks, capture, backup and strike. A tentative booking does not become confirmed when a plan is exported. Generate a crew edition, talent edition and vendor equipment edition of the call sheet with role-specific visibility. Include date, real venue access, transportation, planned shots, contacts, weather contingency when relevant, wardrobe/props and exact diagram revision.

**Day-of controls.** Mobile checklists track arrived, rigReady, talentReady, capturing, captured, hold, needsPickup and wrapped. Crew can acknowledge receipt and enter blocked reasons; each substantive change issues a new call sheet version with distribution log. The reference storyboard and setup diagram remain pinned locally for weak connectivity. The producer can record actual call/wrap times without rewriting planned schedules, permitting honest overrun analysis.

**Failures and acceptance.** Detect a single sample booked for overlapping looks, unconfirmed rented lens, missing talent release and incompatible studio access window. A lost network connection preserves locally timestamped events until reconciliation. Confirm contact privacy, revision diff, PDF/mobile export, time zone handling and crew acknowledgement. A dry-run production day with two looks, three setups and a fixture substitution must yield a consistent schedule, equipment checklist and source-linked shot references without implying reservations were completed externally. Call sheet regeneration preserves the prior version and generates a human-readable change summary: updated call times, equipment replacements, location access changes and newly blocked shots. Receipt acknowledgment does not constitute agreement to a revised booking or employment term.

<!-- PAGE -->
## Page 75 | On-set ingest and virtual-real comparison

**Capture identity.** OnSetCapture(id, shotId, setupVersionId, cameraOriginalDigest, storageUri, capturedAt, cameraSerialOptional, EXIFSnapshot, operatorId, sampleUnitId, continuityRecordId, releaseState) links an actual file to an intended shot. Preserve original RAW/JPEG bytes and hashes; thumbnails and graded proofs are derivatives. Mark planned camera metadata separately from observed EXIF and manually recorded distances, modifiers and light meter readings. The actual physical garment unit is tracked separately from the virtual GarmentLock.

**Pairing process.** A capture station receives camera card folders, validates checksums, groups burst sequences by timestamps and operator tags, and proposes Shot matches. The operator confirms matches in a side-by-side viewer showing approved virtual frame, real original and same-crop derivatives. Offer alignment controls using landmarks, crop/rotation and exposure-normalized comparison. Flag seams, logos, garment length, drape, reflective hardware, perspective, lighting direction and color-chart difference for human inspection. Comparisons must show whether calibration data exist.

**Field feedback.** Producers can record actual camera height, focal length, focus, modifiers, light distances, prop placement, garment alterations, weather and deviation reason. A pickup request creates an actionable shot task with priority and visual annotation. Approval of final photographer captures does not retroactively validate a virtual simulation or manufacturing sample. Physical sample quality claims require appropriate separate fit and production records.

**Failure and acceptance.** Unreadable RAW, missing EXIF, duplicate digest, corrupted copy or ambiguous shot pairing enters a quarantine/review state; original files remain untouched. Never automatically classify a concept render as on-set evidence. Test card import with two duplicate files, six shot matches, changed physical lighting, one garment continuity alteration and one missing release. Verify side-by-side comparison, retrieval by garment revision, checksum persistence and export of a final capture report showing virtual intent, physical reality and unresolved discrepancies.

<!-- PAGE -->

## Page 76 | Identity, sessions and authentication

**Actors and entry points.** Define User(id, verifiedEmail, displayName, disabledAt, createdAt), IdentityProvider(id, issuer, subject, providerType) and Session(id, userId, organizationContextId, issuedAt, expiresAt, revokedAt, deviceLabel). Local macOS authoring remains distinct from proposed cloud authentication; no remote factory may authenticate into a personal Rust development port. Invitation acceptance must establish an actual verified account before organization membership is granted. Authentication state never substitutes for authorization on a protected garment revision.
**Experience and lifecycle.** Support email verified invitation, secure sign-in, session listing, logout everywhere, recovery and optional organization-managed SSO after requirements discovery. Enforce short-lived session credentials, refresh rotation, anti-replay controls, secure cookie attributes for browsers and CSRF protection wherever browser cookies authorize mutation. A user switching tenants sees a confirmed workspace switch and refreshed permission scope. Deleted or suspended memberships invalidate scoped access even while an independent device session is alive.
**Failure and measurement.** Expired invite, conflicting identity link, unverified email, locked account and unavailable provider yield distinguishable but account-enumeration-safe messages. Log authentication attempt outcome without tokens, secrets or full personal contact records. Acceptance uses tests for stale sessions, revoked memberships, concurrent devices and account recovery. Define baseline metrics including sign-in completion rate, unauthorized session reuse count and median login latency; operational thresholds require real pilot measurement before release gating.

**Abuse boundaries.** Rate-limit authentication and reset endpoints by a privacy-preserving identifier and network signal. Offer organization recovery only after independent administrator proof. Revoke refresh descendants after suspicious token reuse, while keeping an auditable account restoration path.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 77 | Tenant boundaries and object permissions

**Authorization model.** Organization(id, slug, status) owns its private Style, Revision, FactoryRelease, Shot, Comment and Asset records. Membership(id, userId, organizationId, role, state) establishes one role context. AccessGrant(id, resourceKind, resourceId, granteeOrganizationId, actionSet, expiresAt, createdBy) limits manufacturer access to a specific release and attached evidence. Policy evaluates actor, tenant, object identity, action and release state on every request, including search, previews and socket subscriptions.
**Roles and inheritance.** Designer may edit drafts; technical approver may issue immutable releases; manufacturer collaborator may read approved shared releases and submit comments and change proposals; producer may plan shoots; reviewer may approve only assigned artifacts. A factory receiving R01 does not inherit R02 or another factory's messages. Server authorization denies by default even when UI controls are hidden. PostgreSQL row level security may add defense in depth but cannot replace correctly scoped application checks.
**Enforcement and failure.** Background jobs run with explicitly derived least privilege capabilities, never unrestricted public URL reads. Every object list filters before pagination/count, including autocomplete. Revoke access on grant expiry, organization removal or withdrawal, then invalidate caches and document previously downloaded artifacts as non-recallable. Acceptance executes Factory A versus Factory B tests over API, websocket, notifications, signed download creation, search and export. Attempted cross-tenant accesses return minimal safe errors and an auditable decision event.

**Policy maintenance.** Keep an authorization decision table as an executable fixture checked against both server handlers and database policy. An administrator cannot self-grant a release approval that organizational separation of duties forbids without a documented override and review.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 78 | Private assets and rights-controlled URLs

**Asset security contract.** Asset(id, tenantId, ownerId, digest, mimeDeclared, mimeSniffed, sizeBytes, class, rightsRecordId, scanState, retentionPolicy, objectKey) is never exposed by raw bucket path. Classes include protected CAD, factory sample, private photograph, licensed texture, garment likeness and public marketing derivative. RightsRecord stores licensor or source, permitted uses, territory where relevant, audience, expiration, attribution and verification status. Missing rights means blocked external distribution, not implicit permission.
**Upload and delivery.** Authenticate before issuing a scoped upload token; enforce content length, allowed MIME, storage namespace and expiry. Quarantine incoming objects until malware, file structure, archive traversal and image decoder checks pass. Download requests authorize the exact asset and action before creating short-lived signed URLs. Use separate review derivatives for restricted originals; don't embed secrets, storage coordinates or reusable bearer tokens in exports, logs or thumbnail metadata.
**Revocation and evidence.** Record who requested each signed URL and its expiry, distinguish link expiry from already downloaded bytes, and disallow public CDN caches for private records. Deleting references does not immediately erase an immutable release dependency: apply retention and legal decision rules before garbage collection. Tests attempt ID guessing, URL replay, tenant-scoped derivative access, malicious SVG, zip path traversal and expired license export. A studio reviewer must be unable to retrieve supplier price sheets unless separately granted.

**Derivative rights.** Rendering a private logo into a photograph creates another rights-bearing derivative, not an automatically public file. The export compiler checks source license restrictions across all texture, stage, performer and brand layers before external distribution.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 79 | Audit events and provenance

**Event ledger.** Append AuditEvent(id, tenantId, actorId, actorType, action, targetType, targetId, targetVersion, correlationId, happenedAt, requestId, beforeDigest, afterDigest, outcome, ipPrefixOptional) through a controlled writer. Keep sensitive field values out of event payloads; snapshots, file digests and permission changes provide reproducibility without copying measurements or contact information into a broadly readable log. Record source importer identity, human approval and background-job service identity separately.
**Domain versus audit.** Domain events such as ReleaseIssued, ProposalSubmitted, SampleMeasured and RenderPublished represent business facts and support notification consumers. The audit stream captures both accepted and denied operations with actor attribution. Use an outbox transaction so an approved release cannot commit while its durable issuance event disappears. Consumers are idempotent by event ID and version. An older event cannot silently replace a newer materialized notification or schedule state.
**Review and recovery.** Provide filterable history to authorized administrators with time window, resource, actor and decision details. Audit retention policy and access boundaries must be established before live factory use. Verify a complete R01 comment, proposal, draft R02, technical approval and acknowledgement chain after database restart. Test transaction rollback, replay, duplicate event receipt and intentional clock skew. Metrics track missing actor IDs and outbox delivery lag; either indicates traceability degradation requiring an operator investigation.

**Integrity.** Archive older audit partitions with manifest digests and recovery instructions. Prefer tamper-evident append workflows with controlled administrative correction events; silently deleting an embarrassing failed approval would destroy the evidence required for partner reconciliation.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 80 | REST contracts and generated clients

**API governance.** Publish a versioned OpenAPI contract for /organizations, /styles, /revisions, /releases, /proposals, /comments, /samples, /shots, /render-jobs and /assets. Each operation defines request/response schemas, OAuth or session authentication requirements, tenant scope, permission codes, pagination, filtering, cache semantics and stable request ID. Keep the native Rust authoring adapter and browser portal separate clients of the same typed source data; schema generation cannot decide which legacy field is authoritative.
**Payload boundaries.** SnapshotCreate accepts schemaVersion, sourceSystem, styleId, stable panel IDs, size units and content digest; ReleaseCreate references a prevalidated immutable snapshot. ShotCreate references a separate appearance lock and camera/light manifest. No endpoint accepts casual edits to an already issued release. Return typed problem responses following RFC 9457 with field paths, safe error codes and actionable conflict revision IDs. Upload and render endpoints return asynchronous job handles instead of pretending work finished.
**Validation.** Generate client types from the approved specification, then use contract tests against actual service handlers, including unknown fields and unsupported versions. Forbid tenant identity supplied solely by a mutable URL parameter; server derives effective access from session plus resource grants. Test cursor stability, denied counts, HTTP caching for immutable artifacts and conditional updates. Changes breaking old desktop builds require explicit version migration and coexistence policy rather than silent JSON reinterpretation.

**Compatibility discipline.** API contracts publish examples using synthetic identifiers and representative errors; deprecation notices identify replacement fields and minimum supported client builds. Contract validation must check both no-data and large-result fixtures, preventing accidental omission of required release metadata.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 81 | Transactions, concurrency and idempotency

**Write invariants.** Changing proposal state, publishing a factory release and generating downstream artifacts must occur through transactional application services. ProposalAcceptance creates a reviewed draft change, never silently edits R01; ReleaseIssue freezes a manifest digest, approver identity, approval time and distribution grants. Optimistic revision tokens prevent editors from overwriting each other's source drafts. A database transaction commits state with an outbox message; external file writes are verified before the commit references them.
**Idempotency contract.** Mutation requests carry Idempotency-Key scoped to actor, tenant and endpoint, with normalized request digest and bounded retention. Exact replay returns the original result; same key with different payload returns conflict. Render jobs derive deterministic keys from pinned scene, profile, compiler and requested frames; users may explicitly request a new iteration. Do not treat retries of invitation acceptance, acknowledgement or sample measurements as independent business actions.
**Failure handling.** Unique constraints protect release sequence, message identity and duplicate acknowledgement. A failed object-store upload leaves a provisional record subject to cleanup; failed postcommit notifications retry without reissuing release. Expose conditional update errors with latest safe version metadata. Test two concurrent approvers, network timeout after successful commit, duplicate webhook, stale draft save and storage outage. Acceptance requires exactly one visible release identity for a repeated authorized issuance, with all original references intact.

**Human traceability.** When a transaction changes multiple child measurements, audit links each affected stable POM identifier to the same reviewed proposal. Rollback must leave all measurements, acknowledgements and distributed artifacts in their previous consistent version.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 82 | Realtime events, notifications and offline use

**Delivery channel.** Notification(id, tenantId, recipientId, eventId, category, targetRef, createdAt, seenAt, deliveryState) is derived from durable domain events. Websocket subscriptions are authorized per tenant and specific resource, with authorization checked again on reconnect. The transport is optional acceleration: all updates remain queryable through authenticated REST polling and cursor-based event catchup. Avoid publishing protected garment titles in push notifications to unverified devices.
**Offline strategy.** Factory mobile screens cache only explicitly selected, access-approved release views and local drafted comments, with encryption and expiration policy appropriate to the device. Pending write operations get a client-generated UUID, intended target revision and visible unsynced state. On reconnect, verify membership, grant status and release version before submission. Conflicts require user review, particularly measurements, approvals and supplier data. A downloaded PDF cannot be remotely retracted; warn at issuance and clearly watermark its version.
**Reliability and acceptance.** Support reconnect backoff, event deduplication, ordering per aggregate and gap detection. An offline comment on withdrawn R01 remains local until a user chooses to retarget or archive it; it must not jump automatically to R02. Test simultaneous browser tabs, revoked session, stale socket, lost notification, reconnect and mobile airplane mode. Measure notification receipt lag and unreconciled offline drafts, then set pilot service targets based on observed usage rather than unsupported guarantees.

**Channel policy.** Provide per-category notification preferences and an explicit mute option while retaining mandatory in-app delivery for safety-critical access withdrawal. Notification preview text must be redacted when device locking and destination ownership cannot be verified.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 83 | PostgreSQL relations and indexes

**Relational core.** Organizations, users, memberships, styles, garment_revisions, snapshot_assets, factory_releases, release_grants, comments, proposals, sample_measurements, production_orders, photo_projects, shot_versions, scene_versions, render_jobs, media_assets, approvals and audit_events use UUID primary keys. Every tenant-owned table includes organization_id; external release grants reference both owning and receiving organization. Immutable version tables reference content digests and prior-version IDs rather than updating historical measurements in place.
**Constraints and query shapes.** Add foreign keys on parent revisions, check constraints on statuses and numeric units, unique indexes for tenant plus style code and release number, and partial indexes for active invitation and pending jobs. Query-specific composite indexes cover (organization_id, created_at, id), (release_id, anchor_kind, anchor_id), (job_state, priority, created_at) and (shot_id, version). An asset digest need not be globally readable just because content-addressed blobs deduplicate internally. Define precise cascade versus restrict rules before migrations.
**Operations.** Use transactions, explicitly set and reset tenant context for row-level security if enabled, and test pooled connection reuse. Expose no cross-tenant aggregate counts. Audit query plans with representative pilot-scale data, not empty tables. Migration testing includes constraint backfills, restart and rollback. Acceptance verifies complete reconstruction of R01 and R02, factory-specific comment search, shot manifest restore, and bounded pagination without N+1 asset permission checks.

**Data lifecycle.** Partition high-volume audit or render telemetry when justified by measured growth, avoiding premature database complexity. Backups must include both relational IDs and their referenced immutable blob digests, otherwise restores can produce misleading orphaned releases.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 84 | Object storage and render artifact lifecycles

**Blob model.** AssetBlob(digest, bytes, mediaType, storageClass, encryptionKeyRef, integrityState, firstSeenAt) and AssetReference(id, tenantId, blobDigest, ownerEntity, purpose, retentionUntil, accessPolicyId) separate immutable content from ownership. A render OutputSet names EXR masters, PNG/JPEG derivatives, shot manifest, color transform, compiler report and all output hashes. Original RAW sample photos and approved release PDFs retain distinct provenance and retention policies.
**State progression.** Upload starts provisional, moves through validating and quarantined or accepted, then becomes referenced by an approved entity. Render workers write to temporary prefixes, verify frame count, dimensions and checksums, then atomically publish an immutable output manifest. Garbage collection only considers blobs after all protected references, retention holds, audits and user-access grants are resolved. Storage lifecycle tiers can reduce cost but must preserve restore expectations documented to users.
**Failure handling.** Repeated upload of identical bytes may share a blob while respecting separate ACL references. Reject dangerous archives, corrupted EXR, mismatched digest and unsupported codecs with safe diagnostics. A partial render output cannot replace a previously approved set. Test storage outage, worker crash during final publish, delayed object consistency, missing texture blob and restore from backup. Measure orphaned provisional bytes, restore time and hash mismatch incidence before committing a retention SLA.

**Cost control.** Charge render derivatives to a named project and enforce budget warnings before high-resolution batches. Archiving review thumbnails may be reversible, while destructive purge of regulated or release-linked masters must be separately authorized and logged.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 85 | Schema migrations and source importers

**Sources and adapters.** The baseline should inspect src/core/measurements.js, src/core/factoryPackage.js, src/core/productionPreflight.js, the native Rust source and protected V1 as separate potentially inconsistent sources. Canonical GarmentSnapshot includes schemaVersion, sourceSystem, revisionId, stable panel/edge/point IDs, units, material assignments and unsupportedField diagnostics. Import adapters may normalize values only with explicit unit/basis conversions and traceable source expressions.
**Migration process.** Version JSON Schema alongside database changes, with forward and backward transformations when feasible. Run dry-run import reports before committing objects: detected sizes, losses, duplicate IDs, unsupported grade rules, broken seam links and unverified hardware geometry. Keep original bytes and import diagnostics with a content digest. Do not invent missing factory measurements, compatibility or certification flags to satisfy a schema. A release importer cannot overwrite an issued immutable FactoryRelease.
**Rollout and acceptance.** Expand/contract migrations allow older desktop clients to coexist until a defined support cutoff. Backfills run in checkpoints with resumable progress and checksum verification; schema changes with destructive effects require restore rehearsal. Test historical garment fixture roundtrip to POM/BOM/DXF, mixed units, 2D/3D identity drift and native source reconciliation. A lost panel association must cause a blocked export with meaningful diagnostics. Track fidelity score as a set of individually validated fields, never an unexplained percentage.

**Provenance.** Preserve importer version and exact original filename as metadata, while escaping untrusted labels before UI display. Reimport of identical bytes returns the prior canonical output or an explicit new normalization version, never silent history replacement.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 86 | AI tools, permissions and safety

**Assistant scope.** AI may help classify comments, draft technical questions, suggest shot compositions, identify missing coverage and propose manufacturing edits. It operates on explicitly authorized snapshots and retrieval contexts with scoped tenant grants. Model output is a proposal with source citations and uncertainty, never an authoritative factory approval, fabric property measurement, safety certificate or guaranteed physical-light prediction. Keep prompts and responses separated from proprietary data retention policy.
**Tool contract.** Each callable action declares read/write scope, required role, affected object IDs, input schema, expected effect, cost ceiling and confirmation class. Read-only summaries can run automatically on authorized files; editing a production draft requires a reviewable diff; issuing a manufacturing release remains a named human approval. Externally fetched instructions, embedded PDF text and user comments are untrusted content and cannot grant permissions. Do not let a retrieved web page instruct the agent to upload private sample files elsewhere.
**Evaluation and failure.** Record model/provider version, authorized context identifiers, generated candidate, tool decision trace and human disposition. Protect against cross-tenant retrieval, prompt injection, fabricated POM numbers, ambiguous units, unsafe auto-export and unauthorized links. On unavailable model or tool error, preserve manual workflows. Test a manufacturer comment requesting measurement change, a malicious document asking for credentials and an editorial prompt suggesting logo alteration. Acceptance requires explicit review for any state-changing AI suggestion.

**Data boundaries.** External inference providers, if selected, need contractual and privacy review; tenant content must not be sent without authorized configuration. Provide a local/manual fallback for teams unable to approve external processing.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 87 | Agent edit verification and controlled execution

**Change protocol.** AgentChange(id, tenantId, initiatingUserId, targetKind, targetId, baseVersion, proposedPatchDigest, rationale, sourceRefs, state) progresses drafted, validated, previewed, approved, applied, rejected or failed. Proposed changes are shown as field-level and geometry-aware diffs against the exact base revision. An agent may create a new draft but cannot quietly alter a released tech pack, pattern source, approved shot image or manufacturer acknowledgement.
**Verification pipeline.** Before execution, schema-validate inputs, check organization and object permissions, compare optimistic version token, evaluate geometric invariants, calculate impacted measurements and render dependencies, then produce a dry-run diff. A human approver sees source and destination units, old/new values, affected sizes and any unverified assumptions. Executing writes only the approved patch digest and records audit events. Postwrite independent readback compares canonical field values and hashes to expected results.
**Failure and acceptance.** Stale targets return a conflict with rebase guidance; unsupported sewing operation or renderer backend fails cleanly. A partially completed multi-entity task remains pending with durable recovery instructions, not falsely marked done. Tests include a legitimate cuff POM suggestion, changed style underneath an open review, wrong tenant, failed import and deliberate prompt injection. Success is an exact replayable diff and verified readback linked to named reviewer, not a conversational success message.

**Evidence view.** Display the actual mutated data readback rather than a green success banner alone. Each agent action lists authorized tool IDs, input digest, output digest and unresolved warnings for retrospective investigation.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 88 | Observability, service health and cost

**Telemetry layers.** Emit structured logs with requestId, tenant pseudonym, actor class, service/module, operation, status and duration, removing tokens, body measurements, supplier contracts and personal communications. Metrics cover API latency, authorization denial rate, release issue errors, importer failures, file checksum failures, queue wait, render failure, websocket reconnect and audit-outbox lag. Trace boundaries across API, database, asset store and Blender worker with correlation IDs from immutable job manifests.
**Service goals.** Define objective families for authorized portal availability, mutation durability, render-queue completion, restore readiness and notification lag. Numeric thresholds must be based on pilot loads, hardware and budget rather than fabricated production performance. Dashboards distinguish preview error from manufacturing release failure. Cost allocation splits storage, GPU minutes, transfer and notification usage per tenant with recorded estimation uncertainty.
**Alerts and response.** Alert on unauthorized grant escalation, systemic release export mismatch, persistent worker crashes, backup verification failure and queue backlog above tested limits. Provide runbooks for disabling new submissions, restoring snapshots, reissuing notifications and entering read-only safe mode. A monitor must never log restricted garment source. Test alert delivery using synthetic fault injection and one controlled restore rehearsal. Acceptance includes a complete release trace, a render provenance trace and a data-minimized incident diagnostic packet.

**Incident exercises.** Run a simulated expired-asset incident and a stalled-release worker exercise with operators. Record detection-to-acknowledgement and restoration evidence, then revise alert thresholds based on noisy or missed signals.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 89 | Crash recovery and protected editor state

**Safety boundary.** Existing native EXO V2 and protected V1 must keep independent state and recovery paths. The cloud collaboration proposal cannot rely on the browser's currently open garment or the local Rust development process for source truth. A durable local draft record contains schema version, save generation, content hash, updatedAt and last verified snapshot reference. On restart, show recovery choices for autosave and named source version without silently replacing either.
**Recovery protocol.** Write local snapshots atomically with temporary file plus rename where supported, keep bounded checkpoints and verify checksums before activation. Persist cloud edit intent with idempotency key and base revision. When the network fails during upload, recover from last acknowledged snapshot, examine pending jobs and reconcile conflicts explicitly. The app must never call a stale render a fresh approved proof merely because the screen resumed.
**Failure and acceptance.** Test forced quit while editing a pattern, incomplete browser IndexedDB write, Rust process restart, app bundle update, corrupt local checkpoint and cross-version workspace opening. Record recovery diagnostics without deleting user drafts or application assets. Factory release and shot manifest hashes must remain reconstructable independently of local UI state. A successful test restores exact stable panel IDs, numeric measurements, source material and project links; failed validation presents a nondestructive previous version.

**Corruption boundary.** Bad checkpoint parsing opens a quarantine copy and permits safe export for support. Preserve a hash list of prior good versions, with deletion prohibited until the user confirms a recovered state.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 90 | Test architecture and fixture discipline

**Test layers.** Establish unit tests for geometry/math, schema parsing, permission policy and domain transitions; property-based tests for grading and topology invariants; integration tests for PostgreSQL, object storage and queue adapters; contract tests for OpenAPI; browser end-to-end paths for factory and photo users; and Blender golden-scene comparisons. Make each layer target a failure mode and avoid superficial tests that merely reproduce implementation constants.
**Fixtures.** Build synthetic garments containing stable panel/edge IDs, nested sizes, two colorways, a zipper, sample measurement difference and one approved R01/R02 release chain. Add two unrelated factories and a six-shot studio fixture with camera/light manifests. Fixtures must be legally shareable and must not expose personal customer garments or model scans. Pin versions of Blender, browser, schema and renderer drivers in reproducibility reports.
**Execution and gates.** Pull request checks validate schemas, unit tests, permission policy and deterministic imports. Release candidates run restoration, tenant security, native readback, actual DXF artifacts, render parity and mobile accessibility. Tests publish evidence hashes and failure artifacts with scoped access. Flaky tests require triage and isolation, not blanket retries. Acceptance means every critical journey can be replayed from empty state and after restart, with documented exceptions and owners.

**Ownership.** Each test suite names an engineer responsible for fixtures and an independent reviewer for its meaning. Evidence from last month's build cannot certify a new auth policy or geometry import path without a fresh compatible execution.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 91 | Grading and geometry property tests

**Engineering invariants.** Geometry validators test finite coordinates, nonzero edges, polygon winding, closed required cut contours, graded size ordering where applicable, notch anchoring, sewn-edge correspondence and consistent physical units. Parameterize seam tolerances by construction context; unlike visually plausible 3D meshes, manufactured cut paths must satisfy cutter-facing constraints. Existing productionPreflight is an input to the suite, not proof of factory certification.
**Generators and oracles.** Generate valid and invalid parametric pattern variations, resize curves, sleeve/armhole permutations and unit conversions. Compare independent analytical measurements against src/core/measurements.js outputs and native Rust readback; include fixtures for self-intersections, extreme grade increments, degenerate seam allowances and missing trim anchors. Preserve a minimized failing case with seed and source manifest when fuzz tests fail. A visual screenshot cannot substitute for length and topology assertions.
**Acceptance.** Confirm size-linked POM and BOM mappings survive save/reopen/export, including reversed winding and rotated panels. Test textile marker feasibility as separate from grading and reject claims of zero waste without verified layout constraints. Any negative invariant blocks release where relevant and describes affected panel/edge/size IDs. A qualified patternmaker must review the suite's tolerance catalogue before factory pilot. Record coverage by geometry property and garment archetype rather than generic test count.

**Ground truth.** Hand-constructed reference garments must specify expected physical dimensions and acceptable tolerances in millimeters. Generated fixtures cannot be their own oracle; cross-validate against externally checked measurements.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators. Compare each exported cutter layer with the expected seam allowance and independently measured grading interval.

<!-- PAGE -->

## Page 92 | Factory release and authorization security tests

**Threat model.** External factory users may receive a specific R01 link, comment on a POM and upload fit photos, but must not inspect another organization, release, designer draft, supplier price or photo asset. Test object reference enumeration, nested subresource access, search leakage, pagination counts, signed URL issuance, offline cached scope, invitation reuse and socket subscriptions. A successful login does not grant an unrestricted organization role.
**Release integrity.** Issue R01 from an immutable snapshot, submit a measurement correction as ChangeProposal, approve it into an editable draft and only then release R02 with separate authorized signoff. Verify R01 PDF/ZIP/JSON content and hashes remain byte-identical through revisions, including after service restart. Manufacturer acknowledgements bind the exact release ID; a later factory comment does not modify the released POM table.
**Adversarial acceptance.** Run Factory A and Factory B fixtures across API, browsers and direct asset endpoints. Replay expired invites, revoke membership mid-download, edit request tenant IDs, forge a role in JSON and race two approvals. Expected responses are safe authorization failures, no cross-tenant bytes and auditable action records. Test permission changes on cached client views and active subscriptions. Release readiness requires documented zero critical cross-tenant disclosures in the defined suite; a later security incident triggers immediate re-evaluation.

**Cache behavior.** Audit previews, thumbnails and PDF download endpoints after revocation, including direct access to previously indexed URLs. Record why a downloaded offline copy cannot be revoked retroactively.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 93 | Photo Studio render-parity QA

**Reference scene.** Build a deterministic calibration scene with dimension ruler, gray/color chart, matte and reflective spheres, approved garment mesh, seam guides, recognizable logo, named stage anchors, area lights and one lens at recorded sensor dimensions. Run the identical immutable manifest through Three.js preview and the proposed Blender compiler. Validate geometry first, then material and lighting response under separately defined tolerances.
**Measurement gates.** Project the same 3D landmarks into screen coordinates, compare bounding boxes, anchor distances, camera horizon, object orientation, material channel mappings and selected depth positions. Use pixel-level comparisons cautiously because tone mapping, shadow algorithms, denoising, glass and cloth shading differ. Report numeric errors, renderer profiles, driver versions, transform matrices and reference image hashes. Visual garment drape remains an independent simulation-validation question.
**Workflow and failure.** Verify preview camera updates survive reload and that a Cycles job uses a pinned scene even after the user changes lights. Inject a missing texture, wrong unit scale, corrupt EXR, cancelled render and stale garment lock. The output must show exact failure provenance and retain previously approved results. Review final product-proof crops with a human technical reviewer and a photography practitioner; do not equate photoreal appearance with sample color, fit or actual fixture metering.

**Tolerances.** Define acceptable screen-space geometry differences in pixels at pinned resolution before running parity tests. Archive side-by-side evidence, numeric comparator output and an approved deviation register.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 94 | Accessibility and interactive performance

**Access goals.** Target WCAG 2.2 AA in browser production views and accessible practical operation of the design/studio controls where technical graphics make alternative interaction necessary. All comments, POM tables, approvals, stage selectors and shot cards need semantic labels, keyboard navigation, focus visibility, screen-reader status announcements and text alternatives for essential diagrams. A 3D gizmo always offers equivalent numerical coordinates and understandable error text.
**Responsive targets.** Validate factory review on a 360 px mobile viewport, tablet and desktop, with large readable release identity and clear upload actions. Keep image-forward studio design while providing a compact table mode for dense camera/lighting settings. Use progressive asset loading, virtualized histories and lazy imagery without concealing mandatory source warnings. Renderer framerate and memory budgets require measurement on declared reference hardware before setting thresholds.
**Failure and acceptance.** Test keyboard-only approval flow, voiceover reading of POM changes, color contrast, touch hit regions, zoom to 200 percent, reduced motion, dialog focus restoration and disconnected mobile operation. Report Core Web Vitals and interaction latency using realistic fixture sizes and throttled networks. A stage geometry load failure must leave form fields usable and announce a truthful error. Accessibility regressions on external factory paths block pilot.

**Input resilience.** Screen readers should announce a pending upload, processing error and issued approval without relying on toast color. Realistic slow networks must preserve keyboard focus and avoid inadvertent duplicate submissions.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 95 | Phased launch and feature-gate strategy

**Gate design.** Implement explicit flags scoped by environment, organization and role: canonicalSnapshot, factoryReadOnly, factoryComments, proposalReview, immutableRelease, photoShotPlanner, blenderCompiler, renderQueue and onSetPairing. Every gate records owner, dependencies, default state, rollout cohort, rollback action and data compatibility. Flags do not grant authorization, and disabling a UI feature cannot expose an otherwise private endpoint.
**Sequence.** Begin with source adapter and local synthetic fixtures, then isolated read-only factory web demo, comment/proposal flow, release issuance, production milestones, static photo planning, deterministic Cycles output and physical on-set comparison. Require repeatable release readback before factories edit observations and vetted shot provenance before offline final rendering is called product proof. Protect V1 and existing V2 authoring during rollout.
**Rollback and acceptance.** Reversible code paths can disable write endpoints and queue submissions while preserving accepted data. A schema migration must be backward-compatible or accompanied by explicit restore rehearsal; a database rollback is not implied by a flag. Track cohort adoption, conflict rate, failure rate and user task completion. Pilot promotion requires targeted evidence for each gate and signed owner decision, not an arbitrary delivery date or high feature count.

**Decision ownership.** Feature flags cannot become a substitute for migration documentation or entitlement policy. Before each cohort expands, record measured success, unresolved risks and the exact operational rollback operator.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators. Confirm flags remain consistent across all signed-in tabs and independently running worker processes. Record conflicting observations as a deployment blocker.

<!-- PAGE -->

## Page 96 | Delivery team and accountable ownership

**Disciplines.** Assign a technical lead for canonical snapshot and native Rust/Vite integration; a backend lead for PostgreSQL, auth and audit; a frontend engineer for manufacturer portal; a graphics/render engineer for Three.js and Blender; a product/UX lead for workflows; and part-time qualified patternmaker, factory operator, photographer and producer for domain signoff. These are proposed functions, not asserted current hires or staffing commitments.
**Responsibilities.** Every epic has a directly responsible owner, reviewer, dependency owner and measurable acceptance artifact. The CAD lead owns panel identity and schema truth; security/backend owns tenant isolation and immutable releases; render lead owns scene compilation and outputs; photography lead reviews physical feasibility; factory expert signs production terminology and practical handoff. Shared design reviews reconcile differences without transferring manufacturing approval to an AI model.
**Work cadence.** Maintain an implementation decision register with status, alternatives, costs, test evidence and reversal implications. Weekly reviews inspect demoable workflows and blockers, while gate meetings accept or reject specific artifacts. Do not treat a failed stage preview or unverified export as completion. Capacity planning includes validation, user interviews, support, incident response and cross-platform Mac test devices. Staffing and calendar estimates need approval against budget and measured effort.

**Escalation.** A dispute between aesthetics and manufacturing truth goes to the technical approver for garment fidelity and creative director for nontechnical imagery. Neither silently overrides the other's controlled domain.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators. Document substitute reviewers before planned absences and preserve separation between reviewer and author.

<!-- PAGE -->

## Page 97 | Twelve-month dependency roadmap

**Planning frame.** Months denote a conditional sequence from project kickoff, not a promise that a deployed service exists or that work began on October 17, 2026. Months 1–2 target truth audits, source fixtures, stable IDs, snapshot schema, protected V1/V2 isolation and tenancy decisions. Months 3–4 target organization grants, immutable asset store, read-only release website, comments and proposed changes after architecture/security signoff.
**Middle sequence.** Months 5–7 prioritize approved R01/R02 release, acknowledgement, restore and audit, plus typed factory sample evidence and initial photo shot manifest. Months 8–9 add production milestones, studio floor plan, camera/light profiles, Three.js preview and first deterministic Blender draft renderer if source fidelity and compute availability permit. Months 10–12 focus on verified render queue, virtual/real pairing, measured pilot evaluation, accessibility, resilience and release review.
**Dependencies and replanning.** EXO-101/102/103 block release authority; tenant ACL EXO-105 blocks external collaboration; EXO-114 precedes storyboard EXO-116 and Blender EXO-118, which precedes queue EXO-119. An unresolved geometry roundtrip blocks production signoff; a failed tenant isolation suite blocks any external pilot regardless of UI quality. Every phase ends with a recorded demo, risk review and updated date estimate grounded in completed work.

**Capacity caveat.** The sequence may pause at a gate for partner recruitment, validated physical fabric values or hardware budget. Revised planning always publishes the dependency that shifted instead of a fabricated completion forecast.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators. Reassess resource allocation whenever external partner validation identifies a missing prerequisite.

<!-- PAGE -->

## Page 98 | Risk register, owners and mitigation

**Registry schema.** Risk(id, domain, scenario, likelihoodBand, impactBand, detectionSignal, owner, mitigation, contingency, reviewDate, state) is reviewed at phase gates. Initial risks include native/legacy source drift, invalid grading or seam correspondence, tenant data leakage, unsigned factory changes, missing sample provenance, unsafe file imports, unlicensed imagery, misleading photoreal claims, GPU render cost and unavailable physical equipment. Impact is assessed per release path, not hidden in one project-wide score.
**Response design.** Source drift is caught by native readback and immutable hashes; geometry defects block factory package; tenant leaks are tested at API and blob boundaries; physical color uncertainty requires reference photography; shader/compiler mismatch requires calibration scenes; unreliable queue workers require idempotent retries. Put a named technical owner and an independent reviewer on each high-impact item. If mitigations cannot pass their gate, fall back to read-only preview or manual export, clearly labeled.
**Failure and acceptance.** Record risk occurrence, evidence link, residual impact and closure decision without rewriting historical assessments. Reassess after new manufacturing samples, external partner onboarding or renderer changes. A pilot-ready register lists no unowned critical risks, publishes testing exceptions and identifies actionable rollback commands for deployed modules. Unknowns remain explicit rather than being replaced by invented precision or blanket safety claims.

**Prioritization.** Risks with low likelihood but catastrophic private-data exposure retain hard technical gates. Assign an owner for residual rights uncertainty and ensure the review board cannot publish restricted asset composites.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 99 | Pilot workflows and acceptance evidence

**Participants.** Recruit a qualified patternmaker or cut-room operator, at least one actual factory collaborator and one photographer/producer for permissioned pilot tasks. Use anonymized or consented synthetic garment snapshots before handling confidential client CAD. Establish baseline clarification cycles, time to locate latest release, source mismatch rate and studio setup preparation time with each participant; compare against observed pilot results rather than unsupported percentages.
**Scenarios.** In factory path, produce R01 with approved POM/BOM and immutable assets, let Manufacturer A comment with physical sample evidence, review a proposed dimension, issue R02 and obtain explicit acknowledgement. Factory B must be unable to see those resources. In studio path, plan a six-to-eight-shot pack with saved sensor, lens, stage and lights; export contact sheet, run draft Cycles if available, print a dimensioned gear plan and pair actual capture to its source shot.
**Evaluation.** Record participant role, device, task start/end, errors, manual workarounds, answer confidence and artifact hashes. Critically review user language and whether a technician can recover an older approved revision without staff intervention. Block promotion on cross-tenant data exposure, lost manufacturing authority, unrecoverable snapshots or falsified proof labels. Other usability defects receive priority, owner and deadline proposal only after pilot observation.

**Interview evidence.** Collect consented screen recordings or structured observation notes, with participant opt-outs respected. A failed task is recorded even when staff assisted completion, so training effort stays visible.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

<!-- PAGE -->

## Page 100 | Formal release exit and open decisions

**Release dossier.** A release candidate needs immutable build ID, pinned source commit, database migration version, configuration digest, dependency inventory, threat model, security test evidence, backup restore report, factory roundtrip artifacts, render parity report, accessibility audit, support runbook, cost estimate and signed review record. Separate approvals from technical CAD authority, platform security and business product owner. A completed 100-page document establishes implementation scope, not operational readiness.
**Exit criteria.** The factory path reconstructs approved R01/R02 after restart with no mutation to historic snapshots; tenant isolation and scoped asset downloads pass adversarial checks; comments/proposals preserve identity and version; shot manifest reopens with unchanged camera/light values; any offline render maps to exactly one source digest. Confirm protected V1 remains isolated, and every claim of sample accuracy cites independent human evidence. Any unresolved critical issue explicitly blocks external release.
**Decisions outstanding.** Select identity provider and deployment region, authority for canonical Rust snapshots, release-signature policy, partner approval rules, signed URL duration, retention and erasure policies, renderer device fleet, pilot budgets, on-set calibration method and realistic service targets. Each choice needs an owner, alternatives and decision date established by the team. Handoff includes next sprint backlog, rollback criteria, participant consent plan and acceptance evidence index. Never mark the architecture deployed simply because it has been specified.

**Governance.** Final signoff names decision-makers and exact exclusions from first release. Deferred functionality remains in a separately owned backlog with prerequisite tests; no unresolved item is hidden as implicit completion.

**Traceable acceptance record.** The responsible reviewer attaches a dated run identifier, fixture IDs, actual versus expected values, relevant output digests and a clear pass/fail decision to this page's contract. Failures produce an owned issue and a retest link before this capability is represented as available to collaborators.

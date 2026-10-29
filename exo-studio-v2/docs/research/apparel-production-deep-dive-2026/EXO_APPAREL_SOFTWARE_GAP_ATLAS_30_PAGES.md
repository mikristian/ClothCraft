# EXO CLOTHCRAFT V2 | APPAREL SOFTWARE GAP ATLAS

**Page 01 | Research edition • 17 October 2026**

**The missing infrastructure between garment design and manufacturing**

Comparative research into the strongest grading and pattern CAD platforms, digital fit systems, marker making, technical product development, manufacturing control, and user-reported workflow failures. Includes independently sourced Reddit feedback and a practical EXO feature strategy.

**Decision question.** What should EXO build to help a patternmaker move from a reliable base pattern to consistent graded sizes, a verifiable production handoff, and a garment that matches what the factory actually produces?

**Audience.** EXO product and engineering team, professional patternmakers, technical designers, independent clothing labels, sample rooms and manufacturing partners.

**Method.** Vendor documentation describes marketed and documented features. First-person Reddit discussions reveal specific experiences and requests. Industry standards describe measurable interfaces. Proposed features are marked as opportunities until verified in code. A public discussion is not proof that a particular product universally fails.

**Scope.** Approximately 30 report pages, cross-referenced evidence register, comparative evaluation criteria, validation tests, and a staged feature roadmap. This work supplements the existing `docs/research/clo-connect-community/` report and avoids repeating its stage-library recommendations.

**Strategic thesis.** The most useful next layer is a trustworthy production graph connecting geometry, measurements, grade rules, sewn construction, bill of materials, specifications, revisions, markers and factory deliverables. An AI agent can help operate that graph when its edits are constrained and verifiable.

<!-- PAGE -->

## Page 02 | Executive findings and recommendations

The market is full of highly capable specialist software. Lectra Modaris, Gerber AccuMark, Optitex, TUKAcad, Gemini and similar systems address industrial pattern/grade/marker needs. CLO, Browzwear and Style3D address digital garment visualization and development. Seamly2D and Valentina address parametric drafting with low barriers to access. PLM/ERP/technical-pack tools manage product data and suppliers. Consequently a blanket claim that grading, seam allowances, tech packs or 3D simulation are absent from the market would be false. The uncovered opportunity is more precise: **maintaining verified consistency across all these representations and teams**. [S01-S08, S13, S18]

**Finding A — grading must be relational.** A good grade is more than scaling a polygon: each landmark moves intentionally; seam lengths and notches must remain compatible; fit measurements must meet tolerances; rules should be reusable and explainable. Professional Reddit contributors emphasize that judgment and technical know-how remain essential. [S11, S19]

**Finding B — exports must be checked at the destination.** A reported CLO-to-Gemini DXF/RUL case preserved base size but changed graded-size dimensions; a later cutter workflow report describes custom seam allowance missing after import. These are case reports, not established vendor defects, but they demonstrate why successful file writing alone is insufficient. [S14, S15]

**Finding C — technical development is a change-management problem.** Factory-facing specifications fail when a revised fabric, grading table, print position, seam construction or trim is updated in one document but not the others. Community accounts describe version sprawl and inconsistent handoffs, while other professionals correctly point out that training and factory competence matter as much as software. [S20-S23]

**Finding D — 3D fit is conditional evidence.** Correct avatar shape and measured fabric parameters substantially affect the outcome. Reported mismatches between virtual and physical garments warrant calibration, not a promise that a convincing render proves correct fit. [S16-S18]

**EXO first builds:** validated grading kernel; complete seam-allowance/cut-line geometry; DXF/RUL plus round-trip checks; sewing graph integrity; linked measurement and tech-pack data; and scoped AI operations with exact geometric readback. A broader PLM system follows after these foundations are trustworthy.

<!-- PAGE -->

## Page 03 | Evidence method, limits and confidence

This is an opportunity-discovery review as of 17 October 2026, not a statistically representative satisfaction survey, a benchmark lab study, or a licensed feature audit. The earlier CONNECT work included title-only posts whose detailed bodies were inaccessible. Those remain leads for interview follow-up; this expansion emphasizes richer independent Reddit discussions and official documentation, together with ISO/ASTM descriptions and supplier-facing workflows. [S09-S11, S14-S24]

**E1 — documented capability.** A current official guide or reference says the product has a specific feature: for example Browzwear's grading-point interface and full-scale vector PDF export options, or CLO 2026.1's grading review and pattern revision history. Vendor marketing may make broader outcome claims, which are not independent performance measurements. [S03, S05, S08]

**E2 — direct experience.** A user describes exact steps, software versions, exports or observed measurements, ideally with another person reproducing them. Such a report establishes a plausible edge case, not a failure rate. The 2025 CLO/Gemini size mismatch and 2026 cutter-seam-allowance case qualify as useful repro recipes. [S14-S15]

**E3 — corroborated theme.** Multiple independent discussions identify a problem category, such as grade reuse, difficult fit calibration, missing technical documentation, or vendor adoption. A repeated theme can justify a prototype even when individual failures remain unverified. [S10-S12, S20-S23]

**E4 — hypothesis.** Ideas such as multi-format construction graph exchange, continuously linked material costing or calibrated fit confidence are potential EXO differentiators. They should enter discovery interviews and prototype tests before being described as solved production problems.

**Bias controls.** Highly vocal hobbyists and software vendors do not represent all patternmaking teams; pricing and feature access change by license or release; Reddit discussion posts sometimes include undisclosed software promotion. Separate manufacturer claims, independent comments, and our inference. Do not treat popularity, votes, unverified complaints or absence from a product page as proof of a missing feature. Compare actual exported files and trial versions for definitive feature coverage.

**Recommended next research.** Conduct 15–25 structured interviews spanning indie designers, experienced patternmakers, graders, sample makers, cutter operators and factory technical teams. Collect consented anonymized test files; reproduce workflows on documented product versions; count severity by job impact, not forum frequency alone.

<!-- PAGE -->

## Page 04 | The complete garment data chain

An apparel product begins with a design brief, fit intent and target consumer. It becomes a base block, then an edited pattern. The pattern requires material properties, seams, allowances, interlinings, hardware, printed graphics, colorways and an avatar or fitting reference. A grade turns it into a family of sizes. Marker planning allocates ordered size quantities to fabric widths and lays. A tech pack communicates approved measurements, points of measure, construction methods, materials, artwork and labels. Sampling creates a feedback loop; bulk production adds purchase orders, inspections, cut lots, sewing operations, packaging and traceability. [S01-S08, S20-S23]

**Why current handoffs fragment.** Pattern CAD stores geometric entities and grade tables; 3D authoring stores simulation meshes and presentation material; spreadsheets contain points of measure and tolerances; PLM stores supplier-approved materials and revisions; cutter software may use another interpretation of DXF layers; factories may respond via email or messaging. Each transfer can drop semantics even when the visual result looks correct.

**Proposed EXO canonical record.** A style has immutable revision IDs and versioned entities: `PatternPiece`, `ContourEdge`, `GradeRule`, `SizeSet`, `Notch`, `SeamAllowance`, `SeamAssembly`, `ConstructionOperation`, `FabricLot`, `Trim`, `ArtworkPlacement`, `POM`, `Tolerance`, `MarkerOrder`, `CutInstruction`, `TechPackRevision`, `SampleReview`, and `ExportVerification`. Relationships use stable IDs. A pure drawing or render is an output of the model, not its source of truth.

**Change propagation example.** Move the sleeve-cap point at size M. Recompute armhole/sleeve seam walks for every graded size, flag affected notches, regenerate piece dimensions and seam-length reports, identify if the sew operation changed, and mark any released marker or tech pack as requiring approval. If the change does not affect a BOM or supplier spec, preserve those records untouched. Every warning names the changed entity, the constraint and the affected sizes.

**Reversibility.** Each operation retains preconditions, before/after hashes, units and reference IDs. A saved snapshot can be reopened and reconciled. Transaction history must extend into export and release metadata, not just the visible undo stack. This system-level traceability is the basis for reliable agents and factory collaboration.

<!-- PAGE -->

## Page 05 | What makes a grading system genuinely strong?

**Dimensional accuracy.** Professional grading preserves approved points of measure across the full size range, within explicit garment-specific tolerance; displays numeric XY movements for each graded landmark; manages edge and curve shape rather than merely multiplying all coordinates. It supports nonuniform growth, pivot locations, asymmetry, left/right variants, different garment categories and meaningful size intervals. [S01-S04, S11]

**Control and reuse.** The user can import/export grade-rule tables, assign named rules to points, create size-range libraries, preserve base blocks, derive new styles from those blocks, and reuse rules across construction variations. Parametric drafting can make every size a consequence of a measurement formula; rule grading can preserve a production team's established increments. Both are valuable and cannot always be merged blindly.

**Construction-aware verification.** The system flags if a graded collar cannot walk onto a neckline, a sleeve cap loses ease, a notch changes sides, an allowance overlaps itself, a pocket changes orientation, or the total cut-piece inventory changes unexpectedly. Size-specific charts must distinguish body measurements, finished garment measurements, and ease.

**Industrial outputs.** A top-performing grading tool can prepare or reliably interoperate with DXF ASTM/AAMA, RUL grade tables, plotter/cutter layers, annotated PDF and marker making. Interoperability matters because manufacturers do not all use the same CAD. The ASTM interchange practice explicitly defines 2D pattern and grade-rule representations, but does not encode the full garment assembly graph. [S12, S13]

**Workflow quality.** Fast editing of several pieces, precise snapping, curve truing, seam walking, size comparison, keyboard macros, clear edit history and large-file performance matter to experts. A strong product makes errors visible before export, allows manual override with justification, and produces a machine-readable report.

**EXO evaluation benchmark.** Grade a four-piece tee and a multi-piece tailored jacket across XS–3XL, including asymmetric sleeve and custom seam allowances. Time the work, count manual steps, compare seam length and measurement tolerances, export to two independent parsers, then reload the project. Use observed pass/fail evidence to compare tools rather than generic “best software” rankings.

<!-- PAGE -->

## Page 06 | Competitor landscape: strengths by job

**Gerber AccuMark / Lectra ecosystem.** Industrial-grade CAD workflows and marker production are the category to benchmark for precise pattern edits, grading, production nesting and cutter interoperability. Gerber's established manufacturing install base is a major ecosystem advantage; obtain current license-specific matrix and real-world test files before judging individual features. [S01]

**Lectra Modaris.** Official documentation describes gradeable base libraries, 2D industrialization, 3D options and parametric modeling in its Expert tier. Strength: model reuse and industrial pattern discipline. Caveat: the vendor's stated efficiency gains are marketing claims, not independent comparative test results. [S02]

**Optitex PDS + Marker.** Official materials describe point editing, functional grading, measurement comparisons, tech-pack data, standard CAD exchange, marker orders and automated nesting with constraints. Strength: a coherent pattern-to-cut workflow. Caveat: validate exact behavior and file compatibility for each cutter configuration. [S03-S04]

**TUKAcad, Gemini, Assyst, StyleCAD, Grafis.** Additional specialist products to shortlist for pattern design, size grading, production markers or formula-based pattern systems. Each has a distinct market, CAD implementation, license and training ecosystem; “supports grading” alone is insufficient to select a benchmark. Request exports, manufacturing references and tests of corner allowances and graded seam integrity.

**CLO.** Strong 2D/3D editing and visualization. The August 2026 release explicitly adds 2D grading review, pattern information/revision history and UI improvements. Criticisms must be checked against the current version: new allowances and grading review are real features, while downstream file compatibility remains a question to test. [S08, S15]

**Browzwear VStitcher.** Documented manual/visual grading with point controls, size review, technical-pack generation and vector PDF options, plus physical fabric measurement workflows. Strength: explicit development pipeline between 2D, 3D and production documents. [S05-S07, S16]

**Seamly2D / Valentina.** Low-cost or free parametric patternmaking models excel at individual measurements, formula-based drafting and reusable blocks. These solve a different segment's needs than a full industrial marker/CAM suite; their file-format support and platform maintenance should be verified before business adoption. [S09-S10]

**Verdict.** There is no defensible universal winner. Benchmark industrial grading against Modaris/AccuMark/Optitex, tailored parametric drafting against Seamly2D/Valentina, and integrated visual development against CLO/VStitcher. EXO's opportunity lies in their **verified intersection**, especially affordable production handoffs.

<!-- PAGE -->

## Page 07 | Grading math, constraints and reproducibility

A grading engine should distinguish the base-size contour from graded transformation data. For named anchor `i` and size `s`, an elementary XY rule is `P(i,s) = P(i,base) + (dx(i,s), dy(i,s))`. This is useful but insufficient for arbitrary topology, graded arcs, angle preservation, seam walking and dimension constraints. Grading rules should be recorded as authored intent, not inferred only from rendered coordinates.

**Independent control points.** Corner landmarks, notches, dart legs, grain indicators, sleeve-cap balance marks, crotch depth and armhole points may require different movements. Curves need stable reparameterization and a choice of control-handle behavior. Rules should specify if a change is measured per adjacent size step or cumulatively from the base, and detect duplicate rule assignment.

**Geometric invariants.** Reject nonfinite measurements, folded edges, reversed contour winding, self-intersections, inverted seam allowances, lost holes and invalid notches. Report seam-length difference and ease along seam-matched arclength, not via a naive point-count comparison. A size-set check should confirm that required pieces, mirrored counterparts and sew links exist at every size. Output a diagnostic report with responsible points.

**Measurement intent.** Permit target measurement constraints (chest, neck opening, sleeve length), with priority and solvability documented. The system must explain when constraints conflict; it should never silently move unrelated points to force all goals to pass. Keep user-authored base geometry and grade vectors accessible after any optimization.

**Regrade safety.** When the base pattern changes, recompute derived sizes from the base + rule graph rather than modifying already modified meshes. This prevents cumulative drift and helps isolate unintended size changes. Store numeric units, size labels, rule versions and deterministic serialization. Undo records should encompass rule edits and resulting geometry as one transaction.

**Test dataset.** Include straight and curved sleeve/armhole pairs, graded dart tips, nested collars, asymmetrical pockets, long/short/tall size families and duplicate grain/print markers. Compare exact points and sampled curves after save/open and export/import, including size-label mapping and negative/zero increments. Industry practitioners stress that software accelerates grading without replacing grading expertise. [S11]

<!-- PAGE -->

## Page 08 | Parametric drafting and pattern libraries

Rule grading modifies a validated base pattern across sizes. Parametric drafting generates geometry from measurements and relationships. A robust platform needs both methods and a clear boundary between them. Seamly2D's open-source documentation describes multi-size measurement files as well as individual client measurements; users discuss their value for made-to-measure blocks and projector sewing. [S09-S10]

**Graph requirements.** Parameter nodes include body measurements, design ease, formulas, reference lines, intersections, tangent constructions, true curves, dart transfers, seam allowance rules, dependencies, mirrored pieces and generated grading landmarks. Formula evaluation must detect cycles, invalid ranges, negative lengths and unstable numerical intersections. Show dependency traces: “armhole depth changed because chest ease increased by 12 mm.”

**Reusable blocks.** Provide canonical slopers or proven blocks for tees, trousers, hoodies, jackets and shirts, with size, fabric-stretch and gender/body-shape assumptions explicitly documented. A block is not universally correct: pattern conventions, market population, avatar shape and physical samples matter. Preserve versions and ownership of any imported third-party block. A custom-fit pattern can be derived from a customer measurement file while still reporting deviations from a production size family.

**Usability tradeoff.** Code-driven drafting can be expressive; a 2026 Reddit developer showcased measurement-driven templates and projector output, while respondents expressed mixed preferences about typing versus graphical editing. EXO should offer direct manipulation with an optional formula/agent pane rather than requiring code for ordinary adjustments. [S25]

**Template safeguards.** Treat style parameters separately from anthropometric inputs: changing waistband contour design is different from changing target hip circumference. A meaningful preview shows base and generated pattern overlap, per-measurement provenance, and all affected construction links. Offer locked points, editable allowances, fabric stretch assumptions and a recalculation diff.

**EXO differentiation.** Allow patternmakers to capture a successfully sampled garment as an editable parametric block, including labeled landmarks, tested tolerances, supporting photos, fabric notes and a baseline physical-fit rating. This makes repeated work reliable and preserves institutional knowledge better than an unannotated shape library.

<!-- PAGE -->

## Page 09 | Seam allowances: from offset guides to cut geometry

A seam allowance is a physical pattern construction rule. It can vary by edge or operation, taper, join at acute and obtuse corners, account for folds, intersect darts and holes, follow internal lines, and require special treatment at facings, hems and binding. A simple edge-parallel preview is useful, but it is not a production cut perimeter without robust joining and topological cleanup.

**Verified market state.** CLO 2026.1 expanded custom seam allowance handling, according to user and release documentation. A May 2026 thread describes corner/holes trouble on one project, while an August 2026 user reports a custom allowance apparently absent in cutter-software DXF import. This does not prove it was missing from the exported file; layer mapping or importer behavior may explain the report. [S08, S15, S26]

**Production-grade model.** Store stitch contour separately from cut contour; attach allowance definitions to stable edge IDs; support corner joins (miter, bevel, round), per-edge widths, taper transitions, notch-cut conventions, dart folding, hem turnups, drill marks, pleat allowances, and underlap/overlap rules. Generate a connected closed cut polygon, resolve self-intersections and guarantee nonzero valid area. Show exact measurement of seam line and cut line.

**Validation.** A change in allowance must not change the stitch-line mesh unless explicitly requested. When a seam changes, recalculate affected allowances and detect islands, pinholes or self-overlap. Display layer mapping in DXF: stitch contour, cut contour, internal construction, notch, grain, text and drill. Export a 1:1 proof sheet with a calibration square and named pieces.

**EXO current-state distinction.** The native Rust notch/allowance work described in the prior implementation handoff stores boundary-linked markers and outward guide data. That is a valid foundation, but corner joining, full cut geometry, cutter layers and round-trip tests remain essential before claiming manufacturing-ready allowances. Separate annotation, export and manufacturing-complete status in feature dashboards.

<!-- PAGE -->

## Page 10 | Seam walking, notches and sewing construction

Notches coordinate assembly across pieces. They may indicate sleeve front/back, shoulder, center, pocket placement, panel matching, easing or assembly order. A notch placed at 30% of one boundary is not automatically a correct match for its sewn partner, particularly after grading and ease. The grading tool must account for construction relationships rather than treating notch coordinates as decoration.

**Sew graph.** Model pairings between named boundary intervals, orientation, direction and intended ease. For a two-piece sleeve, armhole and cap are not necessarily equal in length: record allowable ease and distribution. Distinguish an assembly seam from decorative topstitch, edge binding, under-stitching, bartacks and button attachment. Each operation needs identifiable piece edges and a construction method.

**Walked seam check.** Sample each boundary using physical arclength, compare its paired side after orientation reversal, calculate mismatch per graded size and show the error along the seam. Generate correspondence points where a notch or corner needs to align. Report when a matching notch is missing, when a size has excessive mismatch, or when a seam crosses a graded discontinuity. Manual easing may be appropriate; allow documented exceptions.

**Manufacturing details.** The sewing operation should reference stitch class and seam type where appropriate. ISO 4915 describes stitch-type terminology and ISO 4916 seam classification; EXO can expose a simplified user-facing sewing vocabulary linked to standard-compatible metadata without reproducing proprietary standard illustrations. [S27-S28]

**Topstitch.** Store a path, offset from source seam, stitch spacing, thread/needle specification, color and decorative versus structural role. A photorealistic preview may use visual texture, while factory output requires engineering callouts. Buttonholes, hardware, zippers and rivets must have anchoring and placement constraints traceable into tech packs, even when physical stress simulation is unavailable.

**Acceptance.** Create a hoodie with a two-piece hood and rib cuffs in S–XL. Change one base point and regrade. Validate every seam orientation, matched notch position, piece inventory, allowances and topstitch offset; generate a factory-facing construction sheet and save/reopen without losing relationships.

<!-- PAGE -->

## Page 11 | Size systems, inclusive fit and measurement provenance

Sizing must begin with an explicit target body population. A size M is a commercial label, not a universal anthropometric truth. Body stature, chest, waist, hip, posture, shoulder slope and rise vary independently; graded increments appropriate for one demographic or fabric family can be wrong for another. ISO 8559-1 specifies definitions for anthropometric measurements and supports systematic size/shape profiling. Its existence does not dictate a universal grade rule for every garment. [S29]

**Three distinct measurements.** Body measurements define the wearer; finished garment measurements define physical production specifications; pattern measurements define flat geometry, including shapes and seam allowances. Ease and shrinkage connect these systems but do not make them equivalent. Every point of measure should declare what is measured, where, in which condition, and at which stage (cut, sewn, washed, finished).

**Inclusive grading.** Beyond linear XS–XL size lists, support numeric sizing, tall/petite ranges, dual-size combinations, adaptive and nonstandard body-shape groups. For example, a waist-to-hip differential garment may need multiple fit families rather than one graded waist increment; a 2026 apparel startup discussion explicitly asked for nonstandard differential waistband grading. This is a use-case signal, not validation of one proposed solution. [S30]

**Body and avatar proof.** Preserve source measurements, scanning method, anatomical landmarks, pose, tolerance and a versioned avatar profile. Record unknown shape information rather than claiming a circumference-only avatar recreates a person's exact body. If automated rules extrapolate beyond supported sizes, show an uncertainty warning. A grade passing dimensions may still need fit evaluation and physical samples.

**Manufacturing acceptance.** A size chart is internally consistent when graded garment POM, pattern-derived dimensions and approved sample measurements agree within documented tolerance. Include measurement method diagrams; create a size-fit audit with outlier detection and change history. Fit should be evaluated on multiple representative bodies instead of one attractive render.

**EXO opportunity.** A size-system engine with editable size labels, linked anthropometric profiles, distinct body/garment/pattern dimensions, versioned fit families and explicit rule confidence can combine professional grading discipline with custom-fit accessibility.

<!-- PAGE -->

## Page 12 | DXF, ASTM/AAMA, RUL and cutting export fidelity

The central issue in a production exchange is whether the receiver gets the same manufacturable pattern, not merely a file that opens. ASTM D6673 documents 2D sewn-product pattern data exchange using DXF-based conventions and a text grade-rule table. Its scope explicitly excludes representation of sewn relationships between pieces or 2D-to-3D correspondence; that missing semantics must be carried separately. [S12-S13]

**Round-trip contract.** Specify units, origin, piece IDs, baseline size, all sizes, graded point IDs, internal lines, cut/stitch distinction, notches, drill holes, grain, fold lines, piece quantities, fabric groups, seam allowance information and layer conventions. Declare how unsupported annotations or curve primitives are approximated. Never silently flatten grades into unrelated polylines without an export warning.

**Two-stage verification.** First reimport generated output into an independent parser and compare measured contour coordinates, piece counts and size tables. Second import into at least one actual destination workflow: another apparel CAD and a representative cutter/plotter chain. Compare printed or cut dimensions. The reported CLO-to-Gemini case is a useful fixture: base size matched but several graded dimensions differed on import, and reported cutter values differed again. [S14]

**Troubleshooting UI.** Show export layers and their expected mapping as a visible table, preview all graded sizes and custom allowances, and surface mismatches: “Size L left-front cut contour absent from destination DXF layer CUT_OUTLINE.” Offer layer-template profiles for common target software without implying universal compatibility.

**Tolerance policy.** Define hard numerical acceptance by object type: coordinates in millimetres, contours within geometric tolerance, correct size labels, area difference, seam-length deviation and no lost notches. For printing, validate 100 mm reference square under a no-scaling workflow. Reject unsupported items before export or include explicit loss-of-fidelity reports.

**EXO product value.** Export report cards should record tested version, origin units, target parser, checksum, date and result; factories can attach a proof photograph or imported-size report. That converts a file interchange from an ambiguous hope into an auditable handoff.

<!-- PAGE -->

## Page 13 | Marker making, nesting, yield and cut orders

Marker making is an optimization problem under physical constraints. An efficient marker minimizes fabric waste while preserving grain, nap, face orientation, stripe/plaid alignment, fold requirements, size quantities, cutter width, splice rules and production sequencing. Optitex explicitly documents marker orders, fabric-width constraints, defect avoidance, manual placement and multicore automated nesting. Production CAD suites often compete strongly in this domain. [S04]

**Data required from design.** Every pattern piece must carry cut quantity, fabric family, lining/interlining group, usable orientation, rotation permission, mirror/pair symmetry, size, label, face side and shrinkage convention. A complete marker must account for order ratios, fabric width and unusable roll sections. Without correct piece semantics, an apparently excellent utilization percentage can represent a wrong cut plan.

**Two operating modes.** A fast costing marker estimates average consumption early in design; an approved production marker references actual orders, lay lengths, ply counts, cutter throughput, fabric batches and inspection restrictions. They should be visibly distinguished. Yield percentage alone does not explain net material cost or time. A wider marker with more waste may be operationally cheaper if it changes ply count or cutting time.

**Optimization approach.** Start with deterministic geometric packing and hard validity checks. Establish a baseline with simple heuristics; later add metaheuristic nesting, compatible piece rotation and fabric defect maps. Report both utilization and constraint violations; never accept a high-yield invalid marker. Allow human operators to pin pieces, freeze zones and rerun the remaining placement.

**Factory output.** Export plotter or cutter files, piece/bundle IDs, size ratios, ply and marker reports, consumption by fabric SKU, expected waste, optional barcodes and a proof preview. Reconcile marker piece quantities with the BOM and production order. A marker revision should invalidate obsolete cut instructions.

**EXO opportunity.** Launch a verified marker checker and simple constrained nester before trying to beat mature industrial nesting algorithms. Early value comes from accurate inventory, understandable restrictions and cross-checking actual order quantities; algorithmic sophistication can follow measured factory cases.

<!-- PAGE -->

## Page 14 | Virtual fit: useful measurement versus attractive image

3D garment simulation offers faster iteration and visual feedback, but its predictive value depends on inputs and validation. Browzwear documents tension/pressure tools and fit evaluation, and CLO provides garment/avatar simulation. These are real capabilities. However, a virtual fitting image should not by itself authorize bulk production. [S05-S08, S16-S18]

**Reported mismatch modes.** A user sewing a dress from a CLO pattern reported worrying 3D neck/shoulder strain while the real garment fitted comfortably; replies emphasized avatar and fabric settings. Another team reported a French-terry half-zip looking markedly different in 3D and on physical children. These are isolated experiences with multiple possible causes, not evidence that simulation universally fails. [S17-S18]

**Calibrate three layers.** The body layer includes scan accuracy and location of measuring landmarks; the material layer includes mass, thickness, tensile behavior, shear, bend, hysteresis and elastic response; the construction layer includes seam behavior, bindings, reinforcements, hardware and garment assembly. A model calibrated for an unstructured woven fabric should not be transferred uncritically to thick padding, rib knit or a structured collar.

**Fit review artifacts.** Compare 3D and physical sample photos from fixed viewpoints and known poses, with marked shoulder point, hem, armhole, rise and key POMs. Keep size and fabric lot IDs. Use strain maps as one diagnostic rather than an absolute comfort indicator. Identify the divergence and whether it arises from wrong material, avatar, solver settings or pattern construction.

**Confidence statements.** EXO should report “calibrated against fabric lot X and fit block Y” or “visual-only simulation; physical validation not available.” It should never equate simulated pressure directly with a clinically calibrated body-pressure measurement without independent data.

**EXO opportunity.** A fit evidence panel links each virtual revision to fabric measurements and approved fit samples, allowing teams to learn which material/silhouette combinations predict reality well. This is a stronger manufacturing advantage than another photorealistic preset.

<!-- PAGE -->

## Page 15 | Cloth simulation, collisions and performance observability

Simulation reliability and diagnostic transparency are separate features. A model can run quickly but hide inaccurate contact, or look attractive while violating intersections under motion. Existing systems expose quality and layer/collision parameters; EXO can differentiate by explaining which constraints failed and why.

**Collision report.** For each detected penetration, identify panel pairs, 3D contact location, depth, local normal, cloth thickness assumptions, frame and simulation stage. Connect the 3D hit to a pattern-piece name and material-space region. Distinguish self-collision, cloth/body contact, trim collision, seam collision and starting penetration. Provide a reproducible scene snapshot.

**Physical constraints.** Record solver settings, material parameters, contact thickness, relative velocity, pin state and numerical residuals. Label optional corrective actions as suggestions rather than a guaranteed physical fix. Tight armholes, layered hoods and stiff trims may need different collision tolerances and mesh resolutions. Increasing thickness indiscriminately can create false puffiness and fit change.

**Performance profiler.** Show effective CPU/GPU path, solver and collision time per frame, render time, triangle counts, texture load, VRAM/RAM pressure and mesh resolution. CLO's August 2026 release advertises broader Apple Silicon GPU simulation, illustrating why comparisons must be version- and platform-specific. [S08]

**Adaptive quality.** Offer draft, fit review and presentation profiles with clearly disclosed physics/geometry tradeoffs. If a draft profile suppresses certain contacts or uses coarse fabric discretization, label it accordingly. A quality preset cannot substitute for a correct manufacturing geometry model.

**Test harness.** Include hanging square fabric, standard drape tests, layered seam strip, hood around a head, sleeve/torso contact, thick waistband, buckled trim and animated walking avatar. Record mesh sensitivity and repeatability over multiple runs. Compare numerically, not only screenshots.

**EXO opportunity.** A single click on a red collision marker should explain contact class, magnitude, affected 2D pieces, recommended settings and the last version where it passed. This bridges graphical troubleshooting and measurable simulation QA.

<!-- PAGE -->

## Page 16 | Fabric physics, supplier libraries and physical proof

Digital materials should represent two parallel things: **appearance** (color, weave, roughness, normal/height maps, transparency) and **mechanical response** (areal mass, thickness, warp/weft stretch, shear, bending and other calibrated behavior). Confusing these turns visually similar swatches into unreliable fit evidence.

**Current best practice.** Browzwear's Fabric Analyzer documentation describes physical tests including force/extension data and derived mass, thickness, bend, stretch and shear. Its fabric testing service describes texture scanning and optional physical-vs-digital drape validation. The service expressly warns that faux fur, sherpa, thick/engineered knits, laminates, puffy fabric and unusual structures can be limited. [S16, S31]

**Fabric library record.** Store supplier, article/SKU, mill, origin, composition, knit/weave structure, GSM, width, usable width, color, lot, finish, shrinkage, washing condition, test date, test method, measured mechanical values, appearance maps, licensing rights and uncertainty. Mechanical properties should be versioned separately from shader presets; an updated PBR image is not evidence that fit properties changed.

**Matching workflow.** A visual retrieval model can identify candidate materials from a photograph, but it cannot measure the fabric's tensile response from image alone. Label recommendations as appearance matches until a valid physics profile or supplier test is linked. When a designer chooses a new fabric, propagate relevant cut-width, shrinkage, drape and costing consequences to marker and BOM reviews.

**Production feedback.** Compare approved supplier swatch, measured roll sample and returned garment. Show when a material substitution alters construction requirements (stitch count, needle type, seam finish, interface, heat setting). Keep supplier-approved substitutions separate from silent default replacement.

**EXO opportunity.** Build a measured-fabric registry with explicit provenance and a fit calibration score. Support loading digital textures quickly, but reserve “production validated” status for entries with reliable source data and an actual physical match test.

<!-- PAGE -->

## Page 17 | Hardware, trims and construction operation intelligence

Many visual CAD libraries can show buttons, zippers, rivets, buckles, drawcords and hangers. The manufacturing gap is how those objects participate in construction. A decorative 3D button mesh does not specify shank size, attachment method, washer, reinforcement, spacing, supplier item, wash resistance or required machine operation.

**Parametric trim model.** Record 2D anchor point or curve reference, associated garment panel, visible 3D model, dimensions, finish/color, material, SKU, supplier, per-piece quantity, placement tolerance, required backing, fastener mating counterpart and cost. Maintain an actual physical dimension distinct from display-scale adjustments. Hardware can then contribute to BOM and tech pack outputs.

**Feature families.** Zippers need gauge, tooth/coil type, slider, tape, top/bottom stops and length; buttons need diameter/shank and stitch/loop details; eyelets and grommets need hole diameter and reinforcing spec; rivets require backing and substrate thickness; elastic/drawcord trims require stretch/length and routing. For quilted/padded garments, record padding panel stack, quilt or trapunto path, stitch construction and support layers.

**Sewing instructions.** A factory needs order of operations, stitch class, seam type, SPI, thread, needle, machine type, finishing and heat/seal operations. These can be represented as reusable named construction recipes linked to pattern edges and trim placement. ISO seam/stitch taxonomies can improve terminology consistency while allowing factory-specific naming. [S27-S28]

**Geometry confidence.** If a button or zipper is for visualization only, say so. Physically modeled trim mass, collision and pull-through should be explicitly distinguished from appearance-only geometry. The product should never infer washer placement or rivet strength from a render.

**Acceptance.** Change a zipper from 50 cm to 55 cm. EXO should flag any incompatible panel opening, update zipper BOM quantity/cost and affected sewing instruction, and require approval of revised placement and spec. This compound edit demonstrates the true value of construction-aware hardware.

<!-- PAGE -->

## Page 18 | Tech packs: production contracts, not presentation decks

A technical package should let another team build the intended garment without guessing. Required content varies by factory and stage but commonly includes technical flats, piece names, material and trim BOM, POM chart with tolerances, grading, seam/collar/cuff construction, artwork placement, labels, packaging, colorways and revision history. Browzwear explicitly documents tech-pack export, and dedicated tech-pack products compete in this space. [S06-S07]

**Independent feedback.** Multiple 2026 Reddit discussions describe sampling confusion from contradictory or stale documents. One May discussion gives detailed examples of manually updating BOM, cost, sewing notes and factory files after material changes. Another practitioner argues that many submitted specifications are not complete technical packages. A respondent counters that well-trained professionals often manage this successfully, reminding us that software cannot replace manufacturing expertise. [S20-S22]

**Document engine.** Generate a human-readable PDF and spreadsheet output from a versioned data model. Bind every measurement cell to a POM record; every trim row to an approved material SKU; every visual callout to a stable panel/feature ID. Warn when a sheet contains conflicting numbers or unapproved components. The approved release should carry an immutable revision ID and change summary.

**Factory-friendly views.** Separate an overview for quotations, sample construction package, grading/measurement sheet, artwork-placement pack and bulk production release. Suppliers may need translated units and labels; preserve canonical measurements underneath. Give factories a simple acknowledgement flow for accepted specs, proposed substitutions and questions.

**Mismatch example.** The tech pack says pocket 25 mm below a seam; the 3D scene places it 33 mm below; the print artwork is still attached to last season's pocket coordinate. EXO should flag the contradiction before export and identify which authority must resolve it. Do not let an AI guess which number is correct.

**EXO opportunity.** A living tech pack generated from verified garment geometry and BOM, with reliable revisions and diff reports, can address more sampling friction than merely generating prettier AI tech-pack images.

<!-- PAGE -->

## Page 19 | Collaboration, approval and change propagation

Apparel development involves decisions by designers, patternmakers, product developers, fabric mills, trim suppliers, QA teams, production planners and factories. Each person may approve a different representation of the same style. The core requirement is a consistent decision history: who approved which exact geometry, measurement and material under which conditions.

**Version graph.** Separate working edits from approved checkpoints and released packages. A material change can automatically mark affected costing, fabric physics, marker constraints and construction notes as needing review, while leaving unrelated artwork intact. Preserve approval of unchanged data through stable IDs and content hashes.

**Real user signal.** A 2026 Reddit respondent describes “V3_final” sprawl and mismatched releases to two factories, and the need to synchronize Figma, Illustrator and spreadsheets manually. Another post describes repeated sample changes that never made it back into the document the factory received. An April PLM user reports copying data across tabs in the same system, with an October response saying they observed similar friction. These are concrete but limited anecdotes. [S20-S23, S32]

**Proposed approval workflow.** A change request identifies affected style revisions, delta, rationale, responsible owner, required approvals, deadline and documents that must be regenerated. An approval screen compares old/new grade curves, POM, BOM and rendered preview. A factory answer attaches to that specific request, not to a free-floating chat comment.

**Offline and external suppliers.** Some factories will use email, spreadsheets or a shared folder rather than EXO accounts. Therefore every export should carry a stable revision identifier and a machine-readable manifest, enabling imported comments and third-party changes to be reconciled. Require explicit acceptance of deviations rather than silently overwriting the baseline.

**Automation opportunity.** A change-impact engine can prevent stale files even without a complex enterprise PLM UI. Build granular event/version tracking first; consider role-based permissions and supplier portals once real collaboration cases justify the overhead.

<!-- PAGE -->

## Page 20 | Sourcing, landed cost and sample economics

Costing cannot be fully accurate from the visual garment alone. Relevant inputs include fabric consumption per size/mix, usable roll width, shrinkage, cutting yield, fabric price and MOQ, lining/interlining quantities, trims, embellishment setup costs, labor operations, defect allowance, freight, duties, packaging and currency. Each quantity needs source and effective date.

**Design-stage estimate.** EXO can estimate early material consumption using a costing marker and default operation times while clearly disclosing assumptions. A true factory quote needs supplier capacity, validated material prices, sewing methods, production volume and location-specific costs. Display “estimated” and “factory confirmed” separately.

**Dependency propagation.** Changing fabric SKU should update usable width and unit price where known, create a need to recalculate marker yield, and alert the technical designer when stretch or thickness may require construction changes. A zipper length edit should affect BOM and cost. A size mix shift can affect marker consumption despite unchanged design.

**Sampling economics.** Each fit/proto/PP sample is a versioned event with cost, lead time, comments and approved changes. Include sample photographs, measured deviations, factory explanation and whether the next sample addressed the issue. This makes repeated sampling failure measurable. Discussion participants note that technical-pack revisions often follow actual fit samples rather than replace them. [S21-S22]

**Supplier choice.** Store capability criteria (required seam operations, waterproof taping, print techniques, minimum production volume, allowed fabrics, grading/cutting systems). A factory with incompatible equipment is not made compatible by a perfect tech pack. Community participants explicitly describe supplier substitutions and the distinction between missing specification and capability mismatch. [S22]

**EXO opportunity.** A costing provenance ledger and factory capability matching should come after BOM/markers are reliable. A useful first release compares predicted consumption to actual sampled/cut consumption and learns from errors, rather than marketing an unverified universal cost estimator.

<!-- PAGE -->

## Page 21 | Factory planning, inspections and closed-loop quality

After a style is approved, a reliable system must manage production order quantities, raw materials, fabric rolls, cutting, bundles, sewing, finishing, packing, inspections and shipments. These require actual events from factory operations, not inferred progress from a project manager's timeline. ERP, MES and PLM each hold different aspects of reality, so an EXO integration should make boundaries explicit.

**Production events.** Track approved release ID, purchase order, color/size SKU, lot, facility, work order, operation, planned quantity, actual quantity, timestamp and source system. Cutting records need marker, lay/ply, roll defects, cut-piece and bundle inventory. Sewing records can reference operation sequence, station and rework; QA records attach evidence and disposition. A late supplier substitution can change material performance and should trigger review rather than quietly replacing the approved BOM.

**Inspection standard.** ISO 2859-1:2026 provides lot-by-lot acceptance sampling procedures indexed by acceptance quality limit. It is not equivalent to “inspect 2.5% of garments”; sampling plans depend on lot size, inspection level, acceptance quality criteria and switching rules. Any implemented planner must use licensed/verified tables and qualified QA review. A configurable checklist without this statistical engine should be labeled inspection support, not certified AQL planning. [S33]

**Defect traceability.** Classify issues by contract-specific severity, garment region, manufacturing operation, supplier lot, photo, inspector and sample/lot decision. Capture corrective actions and whether the same defect recurs. Link wrong pocket placement back to construction/marker/release; link seam puckering to stitch, thread, material lot or machine configuration where evidence exists.

**Human boundary.** A supplier may provide measurements in PDF or WhatsApp photos; EXO can help transcribe and compare them but should preserve originals and require confirmation before they become actual production evidence. Distinguish plan from forecast, supplier-reported actual from independently verified actual, and unresolved exception from approved deviation.

**EXO opportunity.** Begin with a release checklist and mobile/offline inspection capture connected to pattern/tech-pack IDs. Full ERP and accounting should remain integrations until the garment engineering core proves reliable.

<!-- PAGE -->

## Page 22 | Sustainability, supply chain evidence and DPP readiness

Digital product passports and supply-chain traceability create long-term data requirements, but they must not become a pretext for inventing unsupported sustainability claims. The EU Ecodesign for Sustainable Products Regulation provides a framework for product-specific delegated acts. The European Commission's textile guidance currently indicates planned textile delegated-act adoption in Q4 2027; it explicitly does **not** establish that every textile product already needed a complete DPP in October 2026. [S34-S35]

**Data model now, claims later.** Record fiber/material composition, supplier identity, origin claims, supporting certification references, fabric/mill lot, processing facility, product model/SKU, repairs/care, market, dates and verified supporting documents. Attach a confidence/status to each field: declared by supplier, independently tested, verified certificate, inferred, unknown. Role-aware access must distinguish public passport data from confidential suppliers/prices.

**Evidence gap.** Textile Exchange's September 2026 Materials Benchmark report covers 384 reporting brands/retailers and highlights difficulty identifying raw-material origin. This is a self-selected participant group and not a whole-industry survey. Nevertheless, origin data has an independent documented deficiency: a system should make missing upstream tiers explicit rather than filling the blank from a country-of-manufacture label. [S36]

**Implementation sequence.** Start a durable material/supplier provenance model and exportable claim manifest. Add applicable jurisdiction/product rule profiles with effective dates as law is finalized. Build API/import pathways for certificate evidence, chain-of-custody and product IDs. Add consumer-facing passport presentation once the underlying records, permissions and legal requirements are verified.

**Avoid false certainty.** Composition on a bill of materials is not proof of fiber source; a digital ledger is not proof an upstream factory reported truth; a product has multiple plausible traceability granularities (model, batch, individual unit). Explicitly document which links are known and which are supplied as attestations.

**EXO opportunity.** Integrate provenance into engineering and purchasing at the time a material is approved. A fabric SKU linked to lot-specific physics, sourcing evidence and cut batches serves both quality troubleshooting and future regulatory readiness.

<!-- PAGE -->

## Page 23 | AI garment agents with measurable, reversible authority

An apparel agent should operate an actual geometric and production model, not manipulate screenshots until a render looks plausible. The October 2026 CLO CONNECT contributor's independently built Marvelous Designer/MCP workflow demonstrates a useful operating pattern: start with inspection, make a small explicit edit, read measurements back, save/reopen, and preserve the user's manual decisions. That is a user-built workflow, not an official built-in native MCP capability. [S37]

**Read-first protocol.** Before changing anything, retrieve project revision, piece/edge identifiers, size set, construction graph, targeted measurements, known material limitations and unresolved warnings. The agent defines a scoped change such as “increase cuff width 10 mm in size M, then recalculate graded sizes using rule R-12.” It must not interpret “make it look better” as permission to overwrite validated construction.

**Transaction proposal.** Present preconditions, affected entity IDs, old/new measurements, expected dependent changes and test plan. Execute on an isolated editable checkpoint. On completion re-read exact geometry, compare all untouched piece hashes, run seam and grade checks, and produce a structured diff with uncertainty notes. A successful API response is not an end-to-end verified task.

**Approval levels.** Reversible local geometry previews can be autonomous. More consequential operations—overwriting an approved production release, changing a supplier material, exporting to an external cutter, placing a production order—need explicit authorized gates. Provide an easy undo and recovery path. Guard stale references after cuts, merges, split boundaries and imported files.

**Tools and skills.** Represent operations as typed commands (`move-point`, `set-grade-rule`, `add-notch`, `set-seam-allowance`, `walk-seam`, `create-marker`, `check-tech-pack`, `roundtrip-dxf`) with input schema, constraints and deterministic output. Save verified task recipes and fixtures; store unsupported actions as visible tasks rather than fake success.

**EXO opportunity.** Treat AI as an orchestration and QA layer on top of reliable native editing commands. This allows future multimodal design agents while retaining trust in geometry, history and production documents.

<!-- PAGE -->

## Page 24 | Construction-preserving AI imagery and product identity

Generative imagery is useful for campaign concepts, lighting, backdrops, casting, virtual staging and look development. Its central apparel risk is silently changing garment features: seam paths, rib cuffs, button count, hardware geometry, logos, panel shapes, embroidery, fabric surface or sizing. A 2026 user discussion describes difficulty maintaining true construction under garment AI visualization. This report treats it as a credible single-user need, not proof that one vendor systematically fails. [S38]

**Immutable design manifest.** Before rendering, compile a signed construction identity listing piece topology, stitch line map, silhouette landmarks, logo locations, material assignments, fasteners and pattern measurements. Design visuals reference the manifest; any change to garment identity requires a new design revision, while scene/background/camera edits should not.

**Two layers of output.** Production proof comes from deterministic geometry rendering of the approved garment. Editorial AI can act on background, lighting mood, stylized set dressing or clearly designated non-product regions. Image-only tools may still hallucinate garment edges; therefore label their results “concept visualization” unless geometric correspondence is independently established.

**Difference detector.** Compare logo positions, hardware count, seam paths, sleeve/hem silhouette and region-level appearance against reference camera renders. For moving-camera shots, evaluate multiple known views. A visual similarity metric is only an aid; construction correctness should be checked against the geometric model and manually reviewed at critical locations.

**Asset provenance.** Keep source render, prompt, reference images, generation method/version, edited masks, user approvals and image rights. A supplied third-party garment photograph cannot automatically yield production patterns or ownership of design details.

**EXO opportunity.** A dual pipeline—locked garment geometry plus flexible editorial environments—can support campaign work without presenting AI-transformed garments as accurate factory references. Marketing assets, rendered lookbooks and released tech packs remain clearly differentiated.

<!-- PAGE -->

## Page 25 | Blender, Unreal, CAD and reversible interoperability

Apparel users also need materials and motion assets in Blender, Unreal and other DCC tools. A generic mesh export can preserve appearance while losing sewable pattern semantics, size grading, notches and manufacturing construction. Conversely, a production DXF may carry pieces and grade data but no 3D drape or lighting scene. These outputs serve different jobs and must have different declared scopes.

**Destination profiles.** A Blender-facing package should validate scale, units, coordinate axes, object transforms, UVs, textures, material naming, normal orientation, mesh subdivision and scene/hanger/avatar anchors. An Unreal-facing package must additionally specify rest/render simulation meshes, cloth-specific metadata, skeleton/skin mapping, material IDs, collision configuration and reimport behavior where supported. Epic's Chaos Cloth documentation describes USD import and separate render/simulation mesh workflows, demonstrating why OBJ-like geometry alone does not imply a usable cloth asset. [S39-S40]

**Independent verification.** Export an EXO source garment, open it in a supported test version of Blender and Unreal, then compare bounding dimensions, reference markers, UV location, garment orientation, material counts, animation frame sampling and intended simulation or asset assembly. Save scripts and pass/fail artifacts by profile version.

**No magic portability.** Stitch lines, grading rules, fabric-physics coefficients and decorative trims are not universal data structures. When a target format lacks a feature, document the conversion or loss. Keep EXO's editable canonical record alongside a render/output file so production data is not reconstructed from an imperfect mesh.

**Workflow usability.** Provide export presets named by actual target usage, e.g., “Blender editorial static,” “Unreal Chaos cloth source,” “DXF ASTM grading to cutter,” “SVG print/plot” with exact inclusion options and a preview of expected losses. Prompt for optional validation after export and attach the result to the revision.

**EXO opportunity.** Verified interoperability profiles will create practical trust while avoiding unsupported claims that one format fully translates CAD, physics, animation and manufacturing structures.

<!-- PAGE -->

## Page 26 | Access, learning, pricing and underserved users

Industrial apparel CAD can be costly and intimidating to small labels or independent creators, while accessible software often lacks the entire production process. Independent patternmaking discussions describe interest in low-cost precision CAD, numerical coordinates, reference/helper lines, reusable parametric blocks, file export, projector sewing and clearer tutorials. Users disagree about the ideal tool—some prefer graphic interaction, some formulas or code, others paper—and those differences define distinct products. [S09-S11, S25, S41]

**Persona split.** An expert grader optimizes hundreds of size-specific points and expects deterministic shortcuts; a bespoke tailor needs individual-measurement generation; a fashion student wants teachable operations with visible constraints; an indie founder needs a correct manufacturing packet; a factory patternmaker expects files that integrate with established cutter/CAD software. A single simplistic “easy mode” cannot fully serve all these users.

**Interface model.** EXO could offer an accessible project path and an expert mode on the same underlying data. Expert controls need typeable dimensions, visible axes, construction anchors, batch grade edits, docking, command search, keyboard shortcuts and editable tables. New users need tutorial fixtures and actionable warnings that explain sewing, not merely a tooltip that repeats the button name.

**Learning content as tests.** A tutorial should start with a known garment, specify target measurements, guide a change, then compare the finished geometry against expected seam/grade/cut results. This both teaches pattern engineering and tests the software. Offer accessible downloadable sample files without exposing proprietary third-party patterns.

**Business model hypothesis.** A local-first low-cost authoring core plus optional professional collaboration, manufacturing QA and AI services may reduce friction for independent labels. However, pricing, seat restrictions and free-tier eligibility change; compare published terms at time of procurement instead of embedding guessed annual prices in engineering decisions.

**EXO opportunity.** Accessible industrial accuracy is defensible only if backed by verified export and measurement behavior. A simple UI with untested DXF output is not a meaningful alternative to established manufacturing systems.

<!-- PAGE -->

## Page 27 | Evidence-weighted EXO opportunity ranking

**P0 — reliability foundations.** (1) Grading size/rule graph with explicit XY modes and reusable rule tables; (2) seam walking, notch correspondences and graded assembly checks; (3) production cut-line and allowance geometry with correct corner/holes treatment; (4) DXF ASTM/AAMA plus RUL round-trip fidelity; (5) project/revision recovery and deterministic save/reopen tests. These solve concrete failure classes surfaced in industry documentation and firsthand reports. [S11-S15, S26]

**P1 — factory communication.** (6) Linked POM + size chart + tolerance engine; (7) live technical package and BOM with explicit draft/approved status; (8) revision graph and factory release diff; (9) structured fit sample feedback; (10) grading-aware marker inventory and basic constrained nesting; (11) construction methods for seams/topstitch/trim. These connect the garment to the producer, with repeated qualitative support from 2026 factory-development threads. [S20-S23]

**P1 — digital proof.** (12) measured fabric provenance with simulator calibration state; (13) 2D/3D collision and fit diagnostic overlays; (14) Blender/Unreal export profiles; (15) scoped AI agent with readback, checkpoint, undo and regression ledger. Evidence exists that pieces of these workflows are already offered by competitors, so differentiation must be in verified integration. [S16-S18, S37, S39-S40]

**P2 — scale and optimization.** (16) advanced marker optimizer with cutter constraints and yield reports; (17) supplier RFQs/quotes and capability matching; (18) landed costing with BOM/marker dependencies; (19) purchase/order and factory milestones; (20) QA defects, acceptance-sampling support and corrective action; (21) material/lot traceability and rule-aware product passport export; (22) made-to-measure variant engine.

**P2 — presentation and accessibility.** (23) construction-locked AI visuals; (24) source-linked stage and trim assets; (25) tutorial/error explanation; (26) collaborative size/fit review. These can expand adoption but should not displace the accuracy foundation.

**Ranking logic.** Rank on severity of bad outcome, frequency of repeated handoff, dependency of downstream work, independent evidence strength, implementation risk and user reach. Proposed priorities are product judgment, not a measured market-wide preference count. A few costly manufacturing errors can justify investment more than dozens of aesthetic requests.

<!-- PAGE -->

## Page 28 | Twelve-month implementation roadmap and stage gates

**Phase 0 (weeks 1–4): measurement and evidence lab.** Assemble consented representative garments, size tables, 2D CAD files, graded DXFs, sample photographs and one real cutter destination. Create deterministic fixtures for seam lengths, notches, cut lines, size ratios, marker inventory, save/reopen and export/import. Document baseline EXO behavior honestly; use no proprietary datasets without rights.

**Phase 1 (months 1–3): authoritative 2D.** Implement grade-point IDs, size-set model, incremental/cumulative rule tables, full curve grading, edge/point constraints, matching seam walks, notches and validated allowance/cutting polygons. Add numerical inspector, all-sizes overlay and history checkpoints. Gate: all golden garment fixtures pass numeric and geometric invariants across the full size family.

**Phase 2 (months 3–5): trustworthy exports.** Build ASTM/AAMA/RUL profile exporters/importers and PDF/SVG plot proofs, layer mapping preview, size/curve tolerance checker and independent reimport. Gate: cut geometry, graded dimensions, grain, notches and size labels survive two independent destinations within declared tolerance; unresolved conversions produce visible losses.

**Phase 3 (months 5–7): production package.** Implement POM, measurement methods, tolerances, technical BOM, color/size variants, construction recipe and immutable factory release. Build change-impact graph and approval diffs. Gate: three real sample review cycles have zero unflagged stale sheets or missing critical specs; a factory technical designer signs off on readability.

**Phase 4 (months 7–9): calibrated 3D and agent.** Link source pattern to sim mesh, add fabric provenance and fit uncertainty, show collision diagnostic evidence. Add scoped AI command transaction protocol and project replay regression. Gate: AI edits exactly one targeted constraint without mutating unrelated patterns; save/reopen/undo and geometry checks pass.

**Phase 5 (months 9–12): factory and optimization pilots.** Pilot marker checks, constrained nesting, quote comparisons, sample-to-release closure, small QA/lot workflow and interoperability profiles. Gate: two real manufacturing partners complete the process with version-matched outputs and independently recorded production exceptions.

**Delivery controls.** Review each phase with one designer, one professional patternmaker and one factory operator. Do not declare production readiness based on demo renders or unit tests alone.

<!-- PAGE -->

## Page 29 | Scorecard and falsifiable acceptance tests

**Grade determinism:** same base style/rule library evaluates identical named anchor coordinates across repeated opens, platform builds and exports. **Curve health:** all graded contour samples have valid winding, no unexpected self-intersections or degenerate edges. **Measurement compliance:** each size's calculated POM has a documented, adjustable tolerance and named measuring procedure.

**Sew integrity:** every assembly boundary has a valid correspondence and orientation; seam walking reports difference/ease for each size; anchor-linked notches never disappear during grading. **Cut validity:** allowance output is a connected, non-self-intersecting cut contour with correct hole treatments, fold behavior, area, piece counts and separate stitch/cut layers.

**Interop fidelity:** round-trip independent ASTM/AAMA/RUL parsing preserves all required data within explicitly configured unit and geometric tolerance. Print proof's reference square is to scale. Cutter acceptance is measured on destination software/hardware, and any loss of unsupported semantics is disclosed.

**Marker validity:** piece inventory equals released cut order, fabric orientations obey constraints, size ratios and fabric groups are correct, and yield/cost basis is reproducible. **Tech pack:** all required POM, BOM, materials, operation and print fields have unique version-controlled sources; contradiction checks pass; each factory receives one immutable release identifier.

**AI scoped action:** before/after diff lists all modified entities; hashes of unrelated source pattern pieces remain equal; expected numeric change is measured; saved state reopens and transaction can be undone. **Fit confidence:** digital sample references actual fabric/avatar test data; mismatches are recorded as unresolved instead of concealed by styling.

**Production traceability:** delivered garments reference approved release and production lot; QC records link to defect, operator, evidence, corrective action and closeout. Claims in a digital product passport carry source/verification state and effective rule profile.

**Business outcome metrics:** median pattern adjustment time, grade-check failures found before cut, percent of exports accepted without manual repair, sample revisions per style, quantity of stale factory packs prevented, cutting waste per order and unresolved supplier questions at first sample. Establish baseline before claiming improvement.

<!-- PAGE -->

## Page 30 | Sources, disclosures and immediate action list

The full linked source register appears in `SOURCE_REGISTER.md`, including primary vendor documentation, independent Reddit discussions, technical standards, dated official regulatory sources and the two companion specialist evidence files (`grading-cad-evidence.md`, `manufacturing-plm-evidence.md`). Source numbers [S01–S41] used throughout this report resolve there. Vendor feature descriptions are **documented offerings**, not independently tested results; Reddit posts are **individual qualitative accounts**, not prevalence statistics. Product naming, licensing and current feature scope require further checks at purchasing time.

**Three actions to start:** commission two independent DXF/grade import validation fixtures with production partners; build a seam/grade/allowance invariants test bench around the current Rust engine; and interview technical designers about exactly which data must survive the move from fit sample to factory release. These are concrete ways to convert research into evidence for prioritization.

**Six questions for the next interview round.** What is the last size set that actually went to production? Which source holds final cutting geometry? How is a sewn edge matched after grading? How many sample changes were not propagated to the factory document? Which file does the cutter operator really import? What would count as a provably correct result? Ask for anonymized before/after data when participants permit it.

**What remains unverified.** Vendor-independent accuracy rankings; exact license entitlements and pricing; market share; error rates; generalized AI image fidelity; production-grade DXF interoperability for every vendor pair; factory acceptance of an EXO-generated release; and the accuracy of virtual fit without validated physical materials and avatar data. These are explicit validation targets, not excuses to skip implementation.

**Product decision.** Prioritize verifiable garment engineering and shared manufacturing data above additional untested aesthetic tools. The strongest EXO outcome is a designer changing one feature and knowing—through measurable tests—which patterns, sizes, seams, markers, specs, material quantities and factory releases are affected.

**Research record:** EXO ClothCraft V2 / `docs/research/apparel-production-deep-dive-2026/` • 17 October 2026 • qualitative comparative industry review.

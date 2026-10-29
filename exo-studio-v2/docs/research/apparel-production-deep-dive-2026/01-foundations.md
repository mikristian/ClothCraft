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

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

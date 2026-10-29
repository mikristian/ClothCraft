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

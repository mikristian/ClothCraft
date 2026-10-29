# EXO 100-page build spec: traceability of all 86 identified gaps

**Source inventory:** `../apparel-production-deep-dive-2026/EXO_FEATURE_GAP_INVENTORY.md`.
**Detailed prior implementation matrix:** `../exo-all-in-one-implementation-2026/86_GAP_IMPLEMENTATION_MATRIX.md`.
The target page references in this document point to the new 100-page specification.

**Important:** `verify-existing` means code may exist but requires fresh behavioral tests.
It does not mean complete. The mapping is architectural and includes both built-in
native garment requirements and planned factory/photo-studio functionality.

| Gap ID | Priority | Engineering work package | New spec page | Existing proof status | Acceptance evidence |
|---:|:---:|---|---:|---|---|
| 1 | P0 | 2D CAD: numeric editing for vertices, handles and lengths with canonical mm | 009 | verify-existing | Enter 125.25 mm; display and reload within 0.01 mm |
| 2 | P0 | Geometry kernel: tangent/perpendicular/parallel/fillet/dart/intersection solvers | 010 | verify-existing | Constraint fixtures solve without curve self-crossings |
| 3 | P0 | Identity graph: stable piece/edge GUIDs and explicit split/merge lineage | 010 | proposed | Split seam; old comment anchors resolve to archived edge or migration review |
| 4 | P1 | Pattern formula engine: typed dependencies and acyclic evaluation graph | 011 | verify-existing | Detect cycles; one variable change produces ordered trace |
| 5 | P1 | Blocks library: parameterized templates and physical-fit evidence versions | 011 | verify-existing | Duplicate approved block with provenance and reversible edits |
| 6 | P1 | 2D workspace: helper/annotation layer visibility and dimension inspector | 009 | verify-existing | Hide guides while all saved measurements remain intact |
| 7 | P1 | Variant engine: inherited base block plus explicit override diff | 011 | proposed | Parent edit updates unoverridden child, warns conflicting overrides |
| 8 | P2 | Pattern digitizer: image calibration and deformable tracing | 022 | proposed | Import distorted scan and show calibrated distance uncertainty |
| 9 | P0 | Grading engine: per-point XY incremental and cumulative rule tables | 011 | verify-existing | Known grade fixtures match expected points for every size |
| 10 | P0 | Grade library: immutable reusable size-rule versions and undefined-point audit | 011 | proposed | Missing rule blocks production export and shows affected sizes |
| 11 | P0 | Grading UI: overlaid nests, inspectable deltas and locked base size | 011 | verify-existing | Overlay six sizes with numeric readout, base unchanged after edits |
| 12 | P0 | Grading QA: per-size seam/ease/notch and self-intersection validator | 012 | proposed | Deliberate sleeve mismatch fails with precise size and seam IDs |
| 13 | P0 | Constraint kernel: symmetric/offset/intersection/angle solver propagation | 010 | verify-existing | Parameter change preserves symmetry and geometric tolerances |
| 14 | P1 | Fit generator: measured-size formula regeneration with revision history | 011 | proposed | Distinct input measurements yield distinct, deterministic nests |
| 15 | P1 | Measurement QA: graded POM vs seam graph and allowed ease envelope | 012 | proposed | Detect incompatible sleeve ease while passing allowed variant |
| 16 | P1 | Grade interchange: library migration and validated rule reuse | 011 | proposed | Transfer graded size run to another style with zero silent point loss |
| 17 | P1 | Fit variant model: tall/petite/adaptive breaks and indexed shape families | 017 | proposed | Variant-specific grade/POM/export diff persists |
| 18 | P2 | Anthropometry registry: provenance, consent, uncertainty and permitted usage | 017 | proposed | Block unconsented dataset and display coverage uncertainty |
| 19 | P0 | Cut geometry: distinct stitch/cut contours and robust joined corner offsets | 013 | verify-existing | Size-graded offsets export with accurate signed allowances |
| 20 | P0 | Notch engine: seam-relative unique notch type/arclength through grade/cut | 013 | verify-existing | Grade/export/import notches retain type, identity and placement |
| 21 | P0 | Seam allowance: holes, dart, hem, fold and acute offset solver | 013 | verify-existing | Adversarial fixture yields valid nonintersecting cut boundaries |
| 22 | P0 | Seam walk: orientation, paired lengths and localized ease report | 012 | verify-existing | Detect reversed seams and 4 mm mismatch with location |
| 23 | P1 | Draft annotations: grain, drill, fold, pleat, buttonhole semantic objects | 014 | verify-existing | Round-trip every annotation into factory line drawings |
| 24 | P1 | Sewing graph: stable assembly IDs and seam operation edges | 012 | proposed | Orphan panel/operation validation blocks production release |
| 25 | P1 | Stitch library: structural/decorative topstitch path constraints and properties | 014 | proposed | Change seam allowance and preserve thread offset/label trace |
| 26 | P1 | Cutter QA: allowable cut contour proof against actual destination import | 018 | proposed | Fixture validates cutter-imported cutline and notch positions |
| 27 | P2 | Manufacturing taxonomy: controlled seam/stitch code reference library | 031 | proposed | Export selected valid code with operation and revision |
| 28 | P2 | Operation planner: sequence DAG, machine requirements and conflict checks | 031 | proposed | Impossible production sequence surfaces unresolved machine requirement |
| 29 | P0 | DXF adapter: ASTM/AAMA profiles with units, sizes, named layers and grades | 018 | verify-existing | Independent reimport preserves known piece/grade/notch fixture |
| 30 | P0 | Interchange QA: independent DXF round-trip geometric differential | 018 | proposed | Deliberately dropped notch/rule/layer yields blocking report |
| 31 | P0 | Export mapping: stitch/cut/layer semantic projection and known-loss manifest | 018 | proposed | Destination lacking feature emits named loss and requires acknowledgement |
| 32 | P1 | Proof renderer: true-scale PDF/SVG/plotter tiled sheets | 018 | verify-existing | Printed 100 mm ruler measures 100 mm within documented tolerance |
| 33 | P1 | Marker/order model: marker inventory, size ratio, fabric groups, PO link | 019 | proposed | Marker piece counts equal approved order size curve |
| 34 | P1 | Nesting planner: grain/nap/stripe/width constrained placement | 019 | proposed | Every placed piece satisfies collision, orientation and fabric bounds |
| 35 | P1 | Marker sensitivity: fabric widths and size curve vs yield/cost scenarios | 019 | proposed | Two widths recalculate and preserve assumptions on export |
| 36 | P2 | Nesting optimization: pinned placement, defect-map mask and reproducible run | 019 | proposed | Same input seed/constraints reproduce marker and utilization report |
| 37 | P2 | Cutter connectors: documented device-specific HPGL/PLT profile validation | 047 | proposed | Real hardware/software round-trip preserves required dimensions |
| 38 | P2 | Yield ledger: marker estimate vs actual cutting and defect event variance | 047 | proposed | Lot actuals differ visibly from estimate with traceable source |
| 39 | P1 | Fabric lab: measured shear/bend/stretch/mass calibration record | 015 | proposed | Swatch test evidence and units persist independent of render color |
| 40 | P1 | Fit verification: simulation-to-physical discrepancies with cause classification | 017 | proposed | Physical sample deviation recorded and simulator confidence revised |
| 41 | P1 | Fit photo compare: standardized pose/camera and POM photo registration | 017 | proposed | Ruler photo maps to pinned POM and sample ID, no fabricated accuracy |
| 42 | P1 | Fit confidence: conditional rating by lot/avatar/category evidence | 017 | proposed | Uncalibrated fabric displays unknown; no unqualified fit claim |
| 43 | P1 | Fabric catalog: typed/tested material traits and searchable provenance | 015 | verify-existing | Filter measured mass and supplier date without mixing visual presets |
| 44 | P1 | Change impact: substitution graph into seam, nest, physics and BOM | 015 | proposed | Fabric swap enumerates recalibration, cost and sample gates |
| 45 | P2 | Avatar scan adapter: landmarks, alignment calibration and limits | 017 | proposed | Scan landmarks map with error report and no hidden morphing |
| 46 | P2 | Fit population: posture/body shape trial matrix with evidence boundaries | 017 | proposed | Coverage matrix shows untested shapes without assumed pass |
| 47 | P1 | Simulation inspector: collision pairs, depth and CAD source linkage | 016 | proposed | Target penetration fixture identifies colliding seam/mesh pair |
| 48 | P1 | Solver diagnostics: CPU/time/memory and honest preview/fit/render tiers | 016 | verify-existing | Performance run records reproducible solver quality and frame time |
| 49 | P1 | Simulation QA: version-pinned fixtures, residual history and regression | 016 | proposed | Equal solver/input run stays within benchmark envelope |
| 50 | P1 | Trim rig: anchored structural mass/collision separated from visual trims | 014 | proposed | Physical fastener affects solver; decorative mesh does not |
| 51 | P2 | Material stack renderer: lining, interfacing, padding/trapunto and bulk | 015 | proposed | Padded section renders with traceable layer order and export |
| 52 | P2 | Simulation discrepancy: solver vs approved measurements, interpretable causes | 016 | proposed | Failing dimensional fixture reports source inputs and error |
| 53 | P2 | Motion validation: posed layer collisions and exception snapshots | 016 | proposed | Motion frames flag layer penetration and retain provenance |
| 54 | P0 | POM core: typed finished/body/pattern measures and landmark diagram | 028 | proposed | Same-named body and finished POM cannot conflate; units/method required |
| 55 | P0 | Measurement state machine: proposal/calculated/physical/approved/factory-ack | 028 | proposed | Simulated measurement cannot transition to physical approval automatically |
| 56 | P1 | Tech pack compiler: editable flats, artwork, construction, BOM, patterns | 021 | verify-existing | Factory PDF repeats exact immutable release manifest/checksum |
| 57 | P1 | Spec consistency checker: artwork/POM/BOM/sample contradiction rules | 036 | proposed | Conflicting zipper length vs BOM triggers blocking issue |
| 58 | P1 | Factory release: immutable manifests, scoped diffs and acknowledgement | 038 | proposed | R03 remains unchanged after R04 and factory sees exact diff |
| 59 | P1 | Approval graph: reapproval routing after geometry/material/packaging changes | 037 | proposed | Changed approved trim invalidates relevant signoff only |
| 60 | P1 | Technical BOM: components, supplier alternates, size/color/version rows | 030 | proposed | 2-color x 6-size BOM resolves typed quantities and alternatives |
| 61 | P1 | Fit closure: comment→sample observation→decision→release successor linkage | 042 | proposed | Every critical fit request has change or signed no-change outcome |
| 62 | P2 | Factory website: scoped anchors, multilingual UI, watermarked signed PDF/XLSX | 049 | proposed | Supplier sees only assigned release and downloads stamped approved PDF |
| 63 | P2 | Factory capability: operations/machines/vendor evidence and blocker rules | 031 | proposed | Factory lacking required machine flagged before PO authorization |
| 64 | P1 | Cost ledger: estimated/quoted/actual yields and cost basis snapshots | 046 | proposed | Cost report preserves units, assumptions, currency and dates by basis |
| 65 | P1 | BOM propagation: geometry-dependent consumption and trim quantities | 030 | proposed | Hood area edit generates reviewed proposed BOM delta |
| 66 | P1 | Sample ledger: proto/fit/size-set/PP/TOP and granular signoff | 042 | proposed | Sample tied to release, size/lot, observations and approver |
| 67 | P2 | Sourcing RFQ: supplier-confidential quote comparison normalized to Incoterms | 045 | proposed | Incompatible EXW/FOB offers not compared as equal totals |
| 68 | P2 | Procurement guardrails: MOQ/cash/deposit and capability risk warnings | 046 | proposed | Order below MOQ or deposit budget blocks without override |
| 69 | P2 | Production genealogy: fabric lot→cut bundle→order/finished SKU | 044 | proposed | Scan finished item and trace roll, cut, and release |
| 70 | P2 | QC ledger: categorized defect/POM tolerances and signed disposition | 043 | proposed | Failed lot cannot ship until authorized hold resolution |
| 71 | P2 | Acceptance sample planner: licensed ISO 2859-1 plan integration | 043 | proposed | Chosen lot/inspection rules produce correct sampled accept/reject counts |
| 72 | P2 | CAPA graph: defects→operations/material lots→rework and retest | 043 | proposed | Root-cause issue resolves to affected lots and signed closure |
| 73 | P2 | Shop-floor interface: barcode bundle events, offline replay and ERP/MES API | 044 | proposed | Duplicate/out-of-order scans deduplicate without losing timestamps |
| 74 | P2 | Traceability/passport: documented claims and versioned applicable rules | 049 | proposed | Claim lists evidence and effective legal profile; unsupported marked unknown |
| 75 | P0 | Command router: typed scoped AI edits and preflight validation | 023 | verify-existing | Unauthorized/out-of-bounds edit rejected before mutation |
| 76 | P0 | Save/recovery QA: durable snapshot, checksum, undo inverse and reopen round trip | 023 | verify-existing | AI edit/save/reopen/undo restores byte-stable semantic geometry |
| 77 | P1 | AI review: plan vs observed measurement delta and reasoned error report | 023 | proposed | Agent mismatch explicitly reported; cannot claim false success |
| 78 | P1 | Recipe registry: versioned actions, input fixtures and expected outcomes | 022 | proposed | Same recipe fixture yields logged, inspectable result |
| 79 | P1 | Recovery: autosave checkpoints, corruption detection, safe rollback | 089 | verify-existing | Kill mid-save; reopen prior checkpoint and audit lost edits |
| 80 | P1 | Shoot visualizer: geometry-locked aesthetic layers and immutable mesh manifest | 024 | proposed | Shoot render retains sewn-pattern source while changing lights/style |
| 81 | P1 | DCC export: Blender/Unreal scale/UV/mesh roles, camera and material profiles | 064 | verify-existing | DCC roundtrip preserves 1 m ruler, piece IDs and asset manifest |
| 82 | P1 | Destination QA: automated actual Blender/Unreal import with capability report | 067 | proposed | Smoke-import scene; emit missing mesh/UV/material failures |
| 83 | P1 | Contextual guidance: animated tool demonstrations with factory semantics | 094 | proposed | A user finishes a measured seam/POM task without tooltip guessing |
| 84 | P2 | Fit model: calibrated predictive estimate labeled by data coverage | 073 | proposed | Out-of-distribution inputs abstain and display validation limit |
| 85 | P2 | Factory QA assistant: permission-scoped unanswered decision triage | 086 | proposed | Assistant cites exact release/thread and refuses unsourced measurement |
| 86 | P2 | Style analytics: aggregate sell-through/returns tied to verified fit causes | 095 | proposed | Small-cell private returns suppressed and claims traceable |

## Dependency ordering

**Engineering root:** pages 04–10 and 24–25 specify actual EXO source compatibility,
stable IDs, revisions and integration gates. Pages 11–20 define grading, sewing,
allowances, fabrics, fit and cutters. Pages 26–50 specify the secure living
manufacturer tech pack, proposals, release system, production tracking and sample
records. Pages 51–75 specify Photo Studio assets, virtual rendering and physical
shoot planning. Pages 76–100 specify platform operations, privacy, AI verification,
quality gates, migration and rollout. Implementing an advanced feature does not
waive any earlier source/authorization or export gate.

## How this mapping becomes work

Each row should become or link to one tracked ticket with an owner, explicit
source revision/fixture, quantified acceptance, current implementation evidence,
regression test and reviewer. If a row is already partly implemented, link the
specific code and a successful native/browser test before moving it out of
`verify-existing` status. Do not derive completion percentages from this document.

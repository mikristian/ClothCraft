# EXO ClothCraft V2 — 86-Gap Implementation Matrix

**Research and implementation design, 17 October 2026.** Source of truth: [EXO_FEATURE_GAP_INVENTORY.md](../apparel-production-deep-dive-2026/EXO_FEATURE_GAP_INVENTORY.md). The IDs, original priorities and intended concepts come from that inventory. **No row is asserted complete:** `proposed` means implementation is required or designed; `verify-existing` means relevant code may exist, but capabilities must pass a source audit and independent behavioral validation before reclassification. Every acceptance criterion requires demonstrable output, not a visible but inert button. Phase **P0** precedes **P1**, which precedes **P2**; priority is dependency-first product planning, not confirmation of runtime functionality.

The cross-cutting interfaces are an immutable geometry identity graph, revision-pinned factory release and POM service, source-to-visual 3D identity manifest, and real-photo shoot planner. P0 measurement identity and export fidelity are the contracts that let supplier comments, sample QA, grading, marker cutting, 3D rendering and shoot evidence refer to the *same garment specification*.

| ID | Pri. | Owner module and engineering approach | Prerequisite | Phase | Testable acceptance | Status |
|---:|:---:|---|---|:---:|---|:---:|
| 1 | P0 | 2D CAD: numeric editing for vertices, handles and lengths with canonical mm | Coordinate/unit kernel | P0 | Enter 125.25 mm; display and reload within 0.01 mm | verify-existing |
| 2 | P0 | Geometry kernel: tangent/perpendicular/parallel/fillet/dart/intersection solvers | #1 | P0 | Constraint fixtures solve without curve self-crossings | verify-existing |
| 3 | P0 | Identity graph: stable piece/edge GUIDs and explicit split/merge lineage | #1–2 | P0 | Split seam; old comment anchors resolve to archived edge or migration review | proposed |
| 4 | P1 | Pattern formula engine: typed dependencies and acyclic evaluation graph | #1, #3 | P1 | Detect cycles; one variable change produces ordered trace | verify-existing |
| 5 | P1 | Blocks library: parameterized templates and physical-fit evidence versions | #4, #54 | P1 | Duplicate approved block with provenance and reversible edits | verify-existing |
| 6 | P1 | 2D workspace: helper/annotation layer visibility and dimension inspector | #1, #3 | P1 | Hide guides while all saved measurements remain intact | verify-existing |
| 7 | P1 | Variant engine: inherited base block plus explicit override diff | #4–5 | P1 | Parent edit updates unoverridden child, warns conflicting overrides | proposed |
| 8 | P2 | Pattern digitizer: image calibration and deformable tracing | #1–3 | P2 | Import distorted scan and show calibrated distance uncertainty | proposed |
| 9 | P0 | Grading engine: per-point XY incremental and cumulative rule tables | #1, #3 | P0 | Known grade fixtures match expected points for every size | verify-existing |
| 10 | P0 | Grade library: immutable reusable size-rule versions and undefined-point audit | #9 | P0 | Missing rule blocks production export and shows affected sizes | proposed |
| 11 | P0 | Grading UI: overlaid nests, inspectable deltas and locked base size | #9–10 | P0 | Overlay six sizes with numeric readout, base unchanged after edits | verify-existing |
| 12 | P0 | Grading QA: per-size seam/ease/notch and self-intersection validator | #9, #19–22 | P0 | Deliberate sleeve mismatch fails with precise size and seam IDs | proposed |
| 13 | P0 | Constraint kernel: symmetric/offset/intersection/angle solver propagation | #2–3 | P0 | Parameter change preserves symmetry and geometric tolerances | verify-existing |
| 14 | P1 | Fit generator: measured-size formula regeneration with revision history | #4, #9 | P1 | Distinct input measurements yield distinct, deterministic nests | proposed |
| 15 | P1 | Measurement QA: graded POM vs seam graph and allowed ease envelope | #12, #24, #54 | P1 | Detect incompatible sleeve ease while passing allowed variant | proposed |
| 16 | P1 | Grade interchange: library migration and validated rule reuse | #9–10, #29–30 | P1 | Transfer graded size run to another style with zero silent point loss | proposed |
| 17 | P1 | Fit variant model: tall/petite/adaptive breaks and indexed shape families | #7, #14 | P1 | Variant-specific grade/POM/export diff persists | proposed |
| 18 | P2 | Anthropometry registry: provenance, consent, uncertainty and permitted usage | #17, #54 | P2 | Block unconsented dataset and display coverage uncertainty | proposed |
| 19 | P0 | Cut geometry: distinct stitch/cut contours and robust joined corner offsets | #2–3, #13 | P0 | Size-graded offsets export with accurate signed allowances | verify-existing |
| 20 | P0 | Notch engine: seam-relative unique notch type/arclength through grade/cut | #3, #9, #19 | P0 | Grade/export/import notches retain type, identity and placement | verify-existing |
| 21 | P0 | Seam allowance: holes, dart, hem, fold and acute offset solver | #19–20 | P0 | Adversarial fixture yields valid nonintersecting cut boundaries | verify-existing |
| 22 | P0 | Seam walk: orientation, paired lengths and localized ease report | #3, #19–21 | P0 | Detect reversed seams and 4 mm mismatch with location | verify-existing |
| 23 | P1 | Draft annotations: grain, drill, fold, pleat, buttonhole semantic objects | #3, #19 | P1 | Round-trip every annotation into factory line drawings | verify-existing |
| 24 | P1 | Sewing graph: stable assembly IDs and seam operation edges | #3, #22–23 | P1 | Orphan panel/operation validation blocks production release | proposed |
| 25 | P1 | Stitch library: structural/decorative topstitch path constraints and properties | #19, #24 | P1 | Change seam allowance and preserve thread offset/label trace | proposed |
| 26 | P1 | Cutter QA: allowable cut contour proof against actual destination import | #19–21, #29–31 | P1 | Fixture validates cutter-imported cutline and notch positions | proposed |
| 27 | P2 | Manufacturing taxonomy: controlled seam/stitch code reference library | #24–25 | P2 | Export selected valid code with operation and revision | proposed |
| 28 | P2 | Operation planner: sequence DAG, machine requirements and conflict checks | #24, #27, #63 | P2 | Impossible production sequence surfaces unresolved machine requirement | proposed |
| 29 | P0 | DXF adapter: ASTM/AAMA profiles with units, sizes, named layers and grades | #3, #9, #19–20 | P0 | Independent reimport preserves known piece/grade/notch fixture | verify-existing |
| 30 | P0 | Interchange QA: independent DXF round-trip geometric differential | #29 | P0 | Deliberately dropped notch/rule/layer yields blocking report | proposed |
| 31 | P0 | Export mapping: stitch/cut/layer semantic projection and known-loss manifest | #19, #29–30 | P0 | Destination lacking feature emits named loss and requires acknowledgement | proposed |
| 32 | P1 | Proof renderer: true-scale PDF/SVG/plotter tiled sheets | #29–31 | P1 | Printed 100 mm ruler measures 100 mm within documented tolerance | verify-existing |
| 33 | P1 | Marker/order model: marker inventory, size ratio, fabric groups, PO link | #10, #19, #60 | P1 | Marker piece counts equal approved order size curve | proposed |
| 34 | P1 | Nesting planner: grain/nap/stripe/width constrained placement | #19, #33 | P1 | Every placed piece satisfies collision, orientation and fabric bounds | proposed |
| 35 | P1 | Marker sensitivity: fabric widths and size curve vs yield/cost scenarios | #33–34, #64 | P1 | Two widths recalculate and preserve assumptions on export | proposed |
| 36 | P2 | Nesting optimization: pinned placement, defect-map mask and reproducible run | #34–35 | P2 | Same input seed/constraints reproduce marker and utilization report | proposed |
| 37 | P2 | Cutter connectors: documented device-specific HPGL/PLT profile validation | #26, #29–31 | P2 | Real hardware/software round-trip preserves required dimensions | proposed |
| 38 | P2 | Yield ledger: marker estimate vs actual cutting and defect event variance | #35–37, #69 | P2 | Lot actuals differ visibly from estimate with traceable source | proposed |
| 39 | P1 | Fabric lab: measured shear/bend/stretch/mass calibration record | #54, #79 | P1 | Swatch test evidence and units persist independent of render color | proposed |
| 40 | P1 | Fit verification: simulation-to-physical discrepancies with cause classification | #39, #41, #54 | P1 | Physical sample deviation recorded and simulator confidence revised | proposed |
| 41 | P1 | Fit photo compare: standardized pose/camera and POM photo registration | #40, #54–55, #66 | P1 | Ruler photo maps to pinned POM and sample ID, no fabricated accuracy | proposed |
| 42 | P1 | Fit confidence: conditional rating by lot/avatar/category evidence | #39–41 | P1 | Uncalibrated fabric displays unknown; no unqualified fit claim | proposed |
| 43 | P1 | Fabric catalog: typed/tested material traits and searchable provenance | #39 | P1 | Filter measured mass and supplier date without mixing visual presets | verify-existing |
| 44 | P1 | Change impact: substitution graph into seam, nest, physics and BOM | #39, #24, #35, #59–60 | P1 | Fabric swap enumerates recalibration, cost and sample gates | proposed |
| 45 | P2 | Avatar scan adapter: landmarks, alignment calibration and limits | #40–42 | P2 | Scan landmarks map with error report and no hidden morphing | proposed |
| 46 | P2 | Fit population: posture/body shape trial matrix with evidence boundaries | #18, #42, #45 | P2 | Coverage matrix shows untested shapes without assumed pass | proposed |
| 47 | P1 | Simulation inspector: collision pairs, depth and CAD source linkage | #3, #24, #39 | P1 | Target penetration fixture identifies colliding seam/mesh pair | proposed |
| 48 | P1 | Solver diagnostics: CPU/time/memory and honest preview/fit/render tiers | #39, #47 | P1 | Performance run records reproducible solver quality and frame time | verify-existing |
| 49 | P1 | Simulation QA: version-pinned fixtures, residual history and regression | #39, #47–48 | P1 | Equal solver/input run stays within benchmark envelope | proposed |
| 50 | P1 | Trim rig: anchored structural mass/collision separated from visual trims | #3, #47, #60 | P1 | Physical fastener affects solver; decorative mesh does not | proposed |
| 51 | P2 | Material stack renderer: lining, interfacing, padding/trapunto and bulk | #39, #50, #80 | P2 | Padded section renders with traceable layer order and export | proposed |
| 52 | P2 | Simulation discrepancy: solver vs approved measurements, interpretable causes | #42, #49, #54 | P2 | Failing dimensional fixture reports source inputs and error | proposed |
| 53 | P2 | Motion validation: posed layer collisions and exception snapshots | #47–49, #51 | P2 | Motion frames flag layer penetration and retain provenance | proposed |
| 54 | P0 | POM core: typed finished/body/pattern measures and landmark diagram | #1, #3, #9 | P0 | Same-named body and finished POM cannot conflate; units/method required | proposed |
| 55 | P0 | Measurement state machine: proposal/calculated/physical/approved/factory-ack | #54, release ledger | P0 | Simulated measurement cannot transition to physical approval automatically | proposed |
| 56 | P1 | Tech pack compiler: editable flats, artwork, construction, BOM, patterns | #24, #31–32, #54–55, #60 | P1 | Factory PDF repeats exact immutable release manifest/checksum | verify-existing |
| 57 | P1 | Spec consistency checker: artwork/POM/BOM/sample contradiction rules | #54–56, #61 | P1 | Conflicting zipper length vs BOM triggers blocking issue | proposed |
| 58 | P1 | Factory release: immutable manifests, scoped diffs and acknowledgement | #3, #30–31, #54–55 | P1 | R03 remains unchanged after R04 and factory sees exact diff | proposed |
| 59 | P1 | Approval graph: reapproval routing after geometry/material/packaging changes | #3, #44, #55, #58 | P1 | Changed approved trim invalidates relevant signoff only | proposed |
| 60 | P1 | Technical BOM: components, supplier alternates, size/color/version rows | #54–55, #58 | P1 | 2-color x 6-size BOM resolves typed quantities and alternatives | proposed |
| 61 | P1 | Fit closure: comment→sample observation→decision→release successor linkage | #41, #55, #58, #66 | P1 | Every critical fit request has change or signed no-change outcome | proposed |
| 62 | P2 | Factory website: scoped anchors, multilingual UI, watermarked signed PDF/XLSX | #58–61, tenant grants | P2 | Supplier sees only assigned release and downloads stamped approved PDF | proposed |
| 63 | P2 | Factory capability: operations/machines/vendor evidence and blocker rules | #24, #27–28, #62 | P2 | Factory lacking required machine flagged before PO authorization | proposed |
| 64 | P1 | Cost ledger: estimated/quoted/actual yields and cost basis snapshots | #35, #60 | P1 | Cost report preserves units, assumptions, currency and dates by basis | proposed |
| 65 | P1 | BOM propagation: geometry-dependent consumption and trim quantities | #3, #19, #35, #60 | P1 | Hood area edit generates reviewed proposed BOM delta | proposed |
| 66 | P1 | Sample ledger: proto/fit/size-set/PP/TOP and granular signoff | #54–55, #58 | P1 | Sample tied to release, size/lot, observations and approver | proposed |
| 67 | P2 | Sourcing RFQ: supplier-confidential quote comparison normalized to Incoterms | #60, #62, #64 | P2 | Incompatible EXW/FOB offers not compared as equal totals | proposed |
| 68 | P2 | Procurement guardrails: MOQ/cash/deposit and capability risk warnings | #63–64, #67 | P2 | Order below MOQ or deposit budget blocks without override | proposed |
| 69 | P2 | Production genealogy: fabric lot→cut bundle→order/finished SKU | #33, #58, #62 | P2 | Scan finished item and trace roll, cut, and release | proposed |
| 70 | P2 | QC ledger: categorized defect/POM tolerances and signed disposition | #54–55, #66, #69 | P2 | Failed lot cannot ship until authorized hold resolution | proposed |
| 71 | P2 | Acceptance sample planner: licensed ISO 2859-1 plan integration | #69–70 | P2 | Chosen lot/inspection rules produce correct sampled accept/reject counts | proposed |
| 72 | P2 | CAPA graph: defects→operations/material lots→rework and retest | #24, #69–71 | P2 | Root-cause issue resolves to affected lots and signed closure | proposed |
| 73 | P2 | Shop-floor interface: barcode bundle events, offline replay and ERP/MES API | #62, #69–70 | P2 | Duplicate/out-of-order scans deduplicate without losing timestamps | proposed |
| 74 | P2 | Traceability/passport: documented claims and versioned applicable rules | #60, #69–73 | P2 | Claim lists evidence and effective legal profile; unsupported marked unknown | proposed |
| 75 | P0 | Command router: typed scoped AI edits and preflight validation | #1–3, release roles | P0 | Unauthorized/out-of-bounds edit rejected before mutation | verify-existing |
| 76 | P0 | Save/recovery QA: durable snapshot, checksum, undo inverse and reopen round trip | #3, #75 | P0 | AI edit/save/reopen/undo restores byte-stable semantic geometry | verify-existing |
| 77 | P1 | AI review: plan vs observed measurement delta and reasoned error report | #54–55, #75–76 | P1 | Agent mismatch explicitly reported; cannot claim false success | proposed |
| 78 | P1 | Recipe registry: versioned actions, input fixtures and expected outcomes | #75–77 | P1 | Same recipe fixture yields logged, inspectable result | proposed |
| 79 | P1 | Recovery: autosave checkpoints, corruption detection, safe rollback | #76 | P1 | Kill mid-save; reopen prior checkpoint and audit lost edits | verify-existing |
| 80 | P1 | Shoot visualizer: geometry-locked aesthetic layers and immutable mesh manifest | #3, #47, #58, #81 | P1 | Shoot render retains sewn-pattern source while changing lights/style | proposed |
| 81 | P1 | DCC export: Blender/Unreal scale/UV/mesh roles, camera and material profiles | #3, #47, #80 | P1 | DCC roundtrip preserves 1 m ruler, piece IDs and asset manifest | verify-existing |
| 82 | P1 | Destination QA: automated actual Blender/Unreal import with capability report | #81 | P1 | Smoke-import scene; emit missing mesh/UV/material failures | proposed |
| 83 | P1 | Contextual guidance: animated tool demonstrations with factory semantics | #24, #54, #75 | P1 | A user finishes a measured seam/POM task without tooltip guessing | proposed |
| 84 | P2 | Fit model: calibrated predictive estimate labeled by data coverage | #18, #40–42, #46 | P2 | Out-of-distribution inputs abstain and display validation limit | proposed |
| 85 | P2 | Factory QA assistant: permission-scoped unanswered decision triage | #58, #61–62, #75 | P2 | Assistant cites exact release/thread and refuses unsourced measurement | proposed |
| 86 | P2 | Style analytics: aggregate sell-through/returns tied to verified fit causes | #66, #69–70, consent rules | P2 | Small-cell private returns suppressed and claims traceable | proposed |

## Dependency roadmap and integration contracts

**P0 geometry and truth layer must ship and independently pass before feature breadth.** Establish canonical units, deterministic geometry/constraints (#1–3, #13), grades and notch/cut fidelity (#9–12, #19–22), independent DXF round-trip/loss QA (#29–31), typed POM and approval states (#54–55), and AI action save/reopen checks (#75–76). Grade-driven POM is downstream of valid per-size geometry. Cutter contours and seams must have stable identity before contextual factory comments can bind to them. Any existing UI implementation marked `verify-existing` must be evaluated with recorded file location, independent execution fixture, fail cases and owner signoff.

**P1 product specification and physical proof.** Build formulas, block variants, annotations, sewing graphs, technical BOM, immutable release manifests, material/yield/cost propagation and sample closure (#4–7, #14–17, #23–26, #32–35, #39–44, #54–61, #64–66). Revision changes propagate as reviewable suggestions. The living factory tech pack consumes validated grading and cut geometry, renders flattened drawings and graded POM, and pins each release to all source revisions. Sample and physical fit photos refer to those release/POM IDs. A material swap can alter nested yield, cost, seam behavior, simulation calibration and render appearance, but requires distinct technical, commercial and physical approvals.

**P1 photo studio previsualization.** Connect #39–50 and #80–82 to the same garment revision: keep structural mesh, seams, fabric calibrated properties and source IDs locked while swapping lighting rigs, cameras, set environments, poses and presentation materials. Save `ShootPlan{shoot_id, factory_release_id, garment_revision_id, scene_revision_id, shot_list[], camera/lens, lighting, models, props, deliverables, physical_location_notes, approval}`. Every virtual frame records exact garment/scene/camera/render versions and an explicit label “3D previsualization.” Add physical shoot planning fields for shot order, equipment list, room/set dimension, talent schedule, styling, wardrobe SKU, lighting diagram, reference photos and real shoot capture links. The output is a virtual contact sheet and a real shoot call sheet: virtual photography should guide the physical studio without being misrepresented as physically photographed merchandise. Structural garment change invalidates impacted shots or triggers a measured rerender review, while cosmetic lighting changes leave tech pack and sewing untouched.

**P2 supplier manufacturing and observed actuals.** Once the immutable release and POM contracts are validated, deliver external tenant grants and factory website (#62–63), RFQ/MOQ (#67–68), production genealogy and QC (#69–74), advanced production/cutter tools (#36–38), operations (#27–28), advanced fit/sim (#45–46, #51–53, #84), scan digitization (#8), and factory assistant/style analytics (#85–86). Factory proposals refer to source release and stable POM/BOM/seam anchors, with accept/reject/impact preview; approval creates a *new* technical candidate. A factory's acknowledge event must pin exactly one manifest. No released pattern, quote, cutting instruction or prior physical observation can silently change. Inspection holds and corrective action use physical lot identity, which can feed future pattern and photo-shoot quality warnings without rewriting past orders.

**Shared cross-module data flow:**

```text
2D anchors + constraints (#1-3,#13)
     ├─> grades (#9-12) ──> cut/seam/notch (#19-22) ──> DXF/proof (#29-32) ──> marker/cut (#33-38)
     ├─> POM methods + approval (#54-55) ──────────────────────┐
     ├─> sewing graph (#24) + BOM (#60,#65) ───────────────────┤
     └─> 3D garment/fabric + simulation (#39-53) ──────────────┤
                                            revision manifest (#58)
                                              ├─> factory portal/proposals/PDF (#56-63,#67-68)
                                              ├─> samples/photos/physical fit (#40-42,#61,#66)
                                              ├─> production/QC/lot provenance (#69-74)
                                              └─> photo previsualization (#80-82) ──> physical shoot plan
```

## Verification procedure

Run the following against the checked-in file and source inventory; it verifies **86 distinct numbered matrix rows, exact one-to-one identity coverage, and original priority preservation**. It does not verify functionality or completion, which requires code/behavior audits.

```python
from pathlib import Path
import re
base = Path("docs/research")
src = (base / "apparel-production-deep-dive-2026/EXO_FEATURE_GAP_INVENTORY.md").read_text()
matrix = (base / "exo-all-in-one-implementation-2026/86_GAP_IMPLEMENTATION_MATRIX.md").read_text()
source = [(int(i), p) for i,p in re.findall(r"^\|\s*(\d+)\s*\|\s*(P[012])\s*\|", src, re.M)]
rows = re.findall(r"^\|\s*(\d+)\s*\|\s*(P[012])\s*\|.*?\|\s*(proposed|verify-existing)\s*\|$", matrix, re.M)
mapped = [(int(i),p) for i,p,_ in rows]
assert len(source) == len(rows) == len(set(i for i,_ in mapped)) == 86
assert sorted(source) == sorted(mapped) == [(i,p) for i,p in sorted(source)]
assert {i for i,_ in mapped} == set(range(1,87))
print("PASS: 86 unique IDs, identical priorities, all proposed or verify-existing")
```

Status governance: no `complete` label is allowed without a future reviewed implementation PR, independently executed acceptance fixture, negative-case test, screenshot or technical output when applicable, and explicit product owner verification. Evidence references from the inventory's [source register](../apparel-production-deep-dive-2026/SOURCE_REGISTER.md) establish feature relevance, not proof of deployed EXO behavior. The companion [manufacturer portal blueprint](MANUFACTURER_PORTAL_BLUEPRINT.md) provides the full release, supplier rights, approvals, audit, RFQ, sample, production and QC schemas.

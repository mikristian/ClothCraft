## Page 11 | Living Tech Pack: exact screen and behavior

The manufacturer website is a responsive style-specific workspace, not a static PDF embedded in a browser. Design an **Overview** with style/SKU, size range, colorways, approved release number, last factory acknowledgement and outstanding critical questions. The central workspace displays an interactive 2D flat or 3D garment preview; a section navigation contains POM and Grading, Patterns, Materials, Trims, Sewing, Artwork, Packaging, Samples, QA, Costs (if authorized), Files and Versions. A right rail displays anchored discussion and task history for the currently selected element.

**Desktop layout:** left 20% navigation and piece tree; center 50% technical visual; right 30% properties, issue thread and action controls. On smaller devices, choose a section and display attachments/discussions as cards with a persistent “Reply” and “Upload sample” button. Keep full-size geometry downloads optional and permissioned. Keyboard users must be able to select and review every contextual comment without relying on precise 3D clicking.

**Manufacturer read experience:** clicking a collar seam shows manufacturing operation, tolerance, notch positions, relevant close-up reference and revision history. Clicking a POM cell shows measurement diagram, target per size, tolerance and latest physical sample actual. Clicking a trim shows approved supplier spec, alternative policy and order quantity. Each item distinguishes the authoritative instruction from commentary and hypothetical alternatives.

**Manufacturer write experience:** the partner may create a `Question`, `MeasurementObservation`, `SampleReview`, `SubstitutionProposal` or `ChangeProposal`, upload a factory photo or mark a task complete. Their typed proposed values are stored separately from the released specification; two conflicting proposals remain separate until an authorized reviewer decides. The factory can acknowledge or reject a release receipt, but cannot rewrite its contents.

**Modes:** released-vs-working toggle is available only to internal users; comparison mode overlays R01/R02 technical geometries using fixed camera and units. Supplier invitation links open directly to a specific released view, with clear version and access expiry. “Share an interactive tech pack” exports a secure invitation, and “Download factory package” generates only the exact approved snapshot.

**Acceptance:** A partner finds the cuff tolerance, posts a size-L question, attaches a measured photo and receives an answer pinned to the same field and R02 even after a new R03 draft exists.

<!-- PAGE -->

## Page 12 | Comment and markup system: the highest-value detail

Comments must be anchored to **meaningful garment identities**, not just arbitrary screen pixels. Provide anchor types `PatternEdge(panelId,edgeId,t)`, `PatternPoint`, `SeamAssembly`, `POM(size,colorway,measurementId)`, `BOMLine`, `TechnicalImage(normalizedXY)`, `ThreeDFeature(panelId,featureId,assetRevision)` and `ProductionTask`. Store the source revision at anchor creation time and a frozen supporting screenshot. An edge split can break source IDs; an explicit mapping algorithm should either relocate the comment with evidence or label it “needs reattachment.”

**Thread data:** id, entity kind/id, release or draft revision, author identity, visibility, content history, attachments, mentions, severity, assignee, due date, status and resolution record. Thread states: open, answered, action required, resolved, reopened, archived. A resolved thread is still searchable and its original message is retained under defined retention. Editing a comment should preserve audit provenance; user-deleted comments may need placeholder/tombstone behavior depending on policy.

**Proposals and comments differ.** “Could you widen the cuff?” is a question. “Propose POM-CUFF-OPENING size L from 24.0 to 25.0 cm” is a typed change with expected revision and validation range. A simple chat message never causes a geometry change. Typed proposals route to a reviewer and can generate side-by-side spec diffs without granting the factory editing privileges.

**Image markup:** draw arrows, circles, pins and freehand notes on a photo; retain original unmodified image plus overlay vector paths, normalized positions and reference size. Let the factory take a photo from phone camera, attach a ruler/caliper image and tag a POM or seam. Show that a photographic measurement is provisional until reviewed against the measurement method and physical report.

**Notification rules:** only participants authorized for the specific entity receive content. Email push may contain a neutral “new action required” summary rather than confidential measurements. Mentions work within the project's granted membership; do not permit role leakage via search or autocomplete.

**Validation:** Simulate a moved panel anchor after grading, a superseded release, a user losing access and an offline comment submitted late. The system must preserve the original reference, reject unauthorized delivery and show when an anchor cannot be remapped safely.

<!-- PAGE -->

## Page 13 | A manufacturer's structured change proposal

Introduce a **Change Proposal** drawer attached to one immutable factory release and a selected technical object. A form asks for reason, affected part/size/colorway, current approved value, proposed value, supporting photo, expected cost/lead-time effect, urgency and type (measurement, fabric, construction, artwork, hardware, packing). Typed fields use canonical units and validation; free-text explanation stays optional but encouraged. A proposal has immutable provenance even when the submitter later edits their suggestion.

**Server behavior:** Verify that the target release is accessible to that manufacturer and the referenced technical entity exists in the snapshot. Store the proposal under a new ID and original revision. Notify the assigned designer, plus qualified technical staff where relevant. Do not change the `FactoryRelease` or authoritative POM/BOM. Another factory with access to a different release cannot see the proposal or its cost implications.

**Designer review:** Present side-by-side released value vs proposed value; show geometry or spec discrepancies by size; identify dependencies (seam walking, marker, trim count, sample status and supplier quote). For a material substitution, display known properties and unknown calibration evidence. The decision can be accept into draft, request more evidence, partially accept with explicit edits or reject with explanation.

**Accepting is a workflow, not a direct overwrite:** Create a new working draft from approved R02, apply the accepted typed changes with editor transactions, validate downstream metrics, and request formal approval. If the necessary native authoring operation is not supported, record “accepted proposal, manual geometry update required.” Never claim that accepting a comment magically updates a pattern.

**Release lifecycle:** Once the new draft passes technical review, issue immutable R03 with content hash, approval identities and changelog. Send Factory A a required acknowledgement task; the portal keeps R02 visible as historical and prints its superseded status. A sample already cut against R02 remains traceable to R02, and downstream quantities are not falsely reassigned to R03.

**Example:** On a jacket, Factory A proposes a 5 mm underlap change on the zipper facing. EXO flags adjacent notch and topstitch placement, asks patternmaker to confirm the change and requests a revised trim consumption calculation. Once issued, the R03 package and portal both display 5 mm. Failure to update any dependent sheet blocks approval until reviewed.

<!-- PAGE -->

## Page 14 | Durable release, approvals and factory acknowledgement

An approved digital tech pack must behave like a release artifact. One immutable snapshot captures garment source revision, POM/grade, BOM, construction graph, applicable material SKUs, artwork coordinates, technical flats, allowed files, sample conclusions and QA instructions. Each release includes a manifest of file hashes and schema version; its human-readable PDF and machine-readable JSON derive from the same immutable data.

**Review policy:** configurable approvers such as technical designer, patternmaker and owner. Each sign-off records actor, time, exact release candidate digest, check results and exceptions. Do not infer approval from someone opening a page or clicking a render thumbnail. Approval gates can be tighter for regulated claims, physical safety or expensive orders. Where signatures have legal consequences, obtain specialist legal and contractual review before promising legal equivalence to e-signature products.

**Snapshots and changes:** New revisions use parent-revision references and deterministic field diffs. A release export must be reconstructable even if newer drafts change or original texture files are re-uploaded. Retain original user-provided attachments by content hash and rights/access metadata. The same release downloaded tomorrow should have identical embedded manufacturing data; only a transport wrapper or newly generated signed URL may differ.

**Acknowledgement:** Manufacturer A receives an action “Review and acknowledge R03.” It can mark accepted receipt, need clarification, unable to produce or decline; those statuses and comments are recorded, with dates and roles. An acknowledgement means the partner saw the instructions, not that the garment was physically tested or production-ready. A release may be issued to multiple factories with independent scoped acknowledgements.

**Print/offline fallback:** every downloadable PDF/ZIP is stamped with style, size set, release ID, issue timestamp and digest/QR lookup. Mobile factory users can navigate the web pack; line operators can use a compact construction print-out. Offline copies identify themselves as static and prompt confirmation of revision on reconnect.

**Integrity tests:** random changes to current working draft must not alter R02 byte hashes. A revoked factory loses access to future downloads. R03 does not make historical R02 sample measurements look like R03. Audit ledger reconstructs who changed, approved and acknowledged every consequential field.

<!-- PAGE -->

## Page 15 | POM, grades, cut files and material truth

The living technical chart distinguishes `BodyMeasurement`, `PatternMeasurement`, `GarmentFinishedMeasurement`, `SampleObservedMeasurement` and `Tolerance`. POM rows include a method illustration, location anchors, before/after wash condition, sample size, expected graded values and upper/lower limits. Store canonical millimetres or metres with explicit dimensions; inches and centimetres are view conversions. A missing size value is “not supplied,” never zero.

**Calculate vs approve:** The existing EXO measurements and grading functions provide useful draft numbers; production release should compare them with verified patterns and approved physical samples. The report recommends adding a constraint-validation layer: seam walks, notch alignment, allowance validity, target-vs-derived measures and size-set completeness. The previous Gap Atlas documents a real qualitative demand for DXF/RUL interoperability and independent destination-app verification.

**BOM truth:** Each material row refers to a unique supplier item with fiber composition, article/color ID, measurement provenance, usable width, unit, estimated consumption and substitution policy. A physical fabric test and an appearance-only shader are different records. A photographer can use a visual map without obtaining sensitive supplier price fields; the factory sees the binding bill of materials it must use.

**Grade uncertainty:** If source-size grading cannot be reconciled to native Rust material geometry, show an export barrier and a clear test requirement. Grade comparisons must cover actual measured points, curves, seam matching and cut-piece inventories across the size run. An SVG or DXF “success” response is not certified cutter compatibility.

**Release preflight:** block on missing essential pattern, unresolved geometry self-intersection, invalid sizes, illegal or contradictory cut piece counts, absent required BOM identifiers and unmapped critical POMs. Allow controlled waivers for appropriate warnings with named reviewer and rationale. Distinguish “passed structural software check,” “sample approved” and “factory verified.”

**Useful automation:** On a proposed cuff narrowing, compare prior R02 POM table, resulting size-S–XL pattern widths, seam walk and trim/supplier quantity implications. Draft a change-impact summary with evidence links. If native grading rule application is unavailable, open an assigned technical task rather than modifying independent tables silently.

<!-- PAGE -->

## Page 16 | Manufacturer dashboard: production in plain sight

Above the factory's detailed tech pack, add a **Production Dashboard** for the linked order. At a glance it shows active release, acknowledgements, sampling stage, confirmed purchase order quantities, material readiness, cutting, sewing, finishing, QC and shipment tasks. Each tile names planned vs reported actual quantity, update source, last event time, assigned contact, related attachment and blocker status. Avoid generic percent-complete bars computed from nothing.

**Milestone records:** `OrderAccepted`, `FabricReceived`, `SampleDispatched`, `FitDecision`, `CutStarted`, `CutComplete`, `SewStarted`, `SewComplete`, `QAComplete`, `Packed`, `Shipped` and custom partner-defined events. Every event links to a responsible organization and factory release. Do not force every manufacturer to use the same production sequence; configurations may differ by business model.

**Update pathways:** Factory user marks a task, enters actual quantities, uploads a photo/packing list, or comments on a blocker. A later optional integration can ingest barcode/BOM/ERP events. Audit the difference between factory-reported numbers and independently verified measurements or QC results. A ship date estimate is not a guarantee and should show confidence/source.

**Designer view:** A style/project overview displays multiple factory orders separately. Factory A's production cost and comments are private from Factory B unless intentionally shared. The designer can track which customer-facing garment sizes are affected by a late trim delivery and whether production is based on a superseded release.

**Review flows:** A manufacturer reports “cut 120 of 200” against marker R02. The dashboard checks that 120 is within authorized PO quantities and requests reasons if the factory reports a different color/size ratio. Factory requests a replacement material? Generate a typed deviation and hold the dependent cutting task until an approver decides.

**Acceptance:** Three factory accounts and two orders can be updated independently; quantities are source-labeled and auditable; repeated identical events are deduplicated; a factory cannot mark another partner's order complete.

<!-- PAGE -->

## Page 17 | Samples, QC, sourcing and actual costing

Represent Sample Round as a versioned project object with stage (proto, fit, size-set, PP, TOP), physical sample identifier, factory source, tested size/colorway, fabric lot, received date, reference release, actual POMs, annotation/photo set and review decision. Designers compare measured deviations against approved tolerances and capture accepted changes. The next tech-pack draft records which sample problems led to which spec edits.

**QC:** Build a controlled issue taxonomy for dimensional error, seam quality, missing trim, fabric shade, wash/shrinkage, print placement, handling and packing. Record critical/major/minor under the applicable contract, physical lot, inspector, sample selection method and correction. Do not label a simple checklist “ISO AQL certified”; ISO 2859-1 sampling plans require the actual chosen plan and correct edition. A later inspection planner can be built against licensed standards and factory evidence.

**Sourcing:** Suppliers offer quotes against exact BOM/release/size mix. A factory may propose alternative fabric or zipper SKU, but this must trigger verification of appearance, measured physical characteristics, supply capability, MOQ, consumption, unit cost and delivery impact. Store accepted alternatives by variant and effective date; do not overwrite old purchase records.

**Costing:** Use `buildFabricCostRun` as an early, appropriately labeled fabric-only estimate. Full unit cost must add cutting yield, trim, operations, labeling, packaging, shrinkage/waste, development/tooling, freight, duties and supplier terms. Keep estimated, factory quoted and invoiced actual as separate numbers with source dates/currencies.

**Physical check loop:** When a physical garment fails cuff opening tolerance, manufacturer uploads the actual number and photo, EXO links it to size and POM ID, brand reviews corrective action, then tracks whether Sample 2 passes. If the pattern revision changed, the re-sample references new release; if process changed, record process correction separately.

**Practical scope:** The first deployment should manage sample evidence and technical comments without trying to replace an enterprise ERP. Add purchasing, factory QA and costing modules only when the underlying BOM and release graph are trusted by manufacturing partners.

<!-- PAGE -->

## Page 18 | API contracts, events and interoperability by example

Favor small typed HTTP endpoints and stable resource IDs. Proposed contract: `POST /v1/styles/{styleId}/snapshots` stores a validated source snapshot and hash; `GET /v1/techpacks/{packId}/revisions/{revisionId}` reads authorized sections; `POST /v1/releases` creates a candidate from pinned inputs; `POST /v1/releases/{id}/approve` records a signature; `POST /v1/releases/{id}/issue` publishes immutable release; `POST /v1/releases/{id}/acknowledge` records factory receipt. Each mutation is authenticated, idempotent when appropriate, and checks expected revision.

For collaboration: `POST /v1/comments` takes `{releaseId,anchor,body,scope}`; `POST /v1/change-proposals` takes `{expectedReleaseId,entityId,operation,from,to,unit,rationale,attachments}`; `POST /v1/sample-rounds/{id}/measurements` records actuals and evidence. Only a separate owner-approved operation may change the source garment or release it for manufacturing.

**Event journal:** `ReleaseIssued`, `FactoryAcknowledged`, `CommentAdded`, `ProposalReviewed`, `SampleMeasured`, `ProductionQuantityReported`, `ShotApproved`, `RenderCompleted`. Event envelope includes `eventId`, `tenantId`, `actorId`, `entityId`, `revisionId`, `correlationId`, `eventTime`, `payloadSchema` and minimal safe payload. Outbox pattern ensures transaction and emitted event remain consistent.

**Artifact types:** signed, immutable `FactoryExportManifest`, approved POM CSV, pattern DXF per size, read-only technical SVG, `SampleEvidence`, renderable sanitized glTF/GLB, and `ShotManifest`. All carry content hashes and retention/permissions. The factory website reads those artifacts through an authorization service rather than exposing local native ports.

**Integration adapters:** initially EXO local outputs and Blender; later import from spreadsheet, enterprise CAD and supplier ERP when the format is legally and technically supported. ASTM/AAMA DXF cannot represent all sew semantics, so preserve the source assembly graph separately. Report transformations and losses at destination.

**Version negotiation:** clients declare schema version and capabilities. On older factory browsers, show an explanatory read-only fallback instead of attempting unsafe writes. Background conversion jobs include explicit statuses and diagnostic outputs.

<!-- PAGE -->

## Page 19 | Manufacturer mobile, accessibility, notifications and offline

Factories may use phones on the sampling floor or a shared production desk. The mobile experience should prioritize reading the approved release, answering questions, taking sample photos and entering measurements. A responsive table offers one size at a time with sticky POM name, target, tolerance, actual and status. For complex 2D geometry, provide accessible flat snapshots and a “jump to element” list rather than requiring pinch navigation alone.

**Offline package:** Factory can download a permitted release-tagged PDF/ZIP and read its data without internet. Optional progressive-web offline mode can cache only explicitly permitted short-lived content with an expiration/revocation tradeoff documented. Queued comments and measurements must display “pending sync” until validated against server authorization and the still-current release. Do not advertise offline upload as approved until the server confirms acceptance.

**Notifications:** role- and scope-correct messages for mentions, reply needed, sample uploaded, new factory release, approval blocked, production status changed and shot-plan revised. Let users configure digests and quiet hours. A push preview must never leak private supplier prices or garment geometry; access checks apply when opening the notification, not only when sending it.

**Accessibility:** semantic controls for annotation navigation, visible focus, keyboard-only replies, descriptive alternative text for factory evidence and correct units. A size-table change should be readable via a row diff, not just a red/green marker. Teams working across languages need approved translated labels, with the original authoritative numeric record preserved.

**Time zones and audit:** retain UTC timestamps plus the viewer's displayed zone; shipment/sample cutoffs must specify local facility zone. Corrections to reported factory milestones are new events, not destructive replacement; show who corrected what and why. Support a “revoke supplier” action that stops new downloads, notification delivery and access to sensitive previews.

**First mobile milestone:** Factory A logs in, opens R02, checks chest and cuff POM, uploads two tagged phone photos, proposes a corrected stitch spec, and later acknowledges R03. An internal reviewer sees the full lifecycle on desktop; Factory B's account cannot read any item in that thread.

<!-- PAGE -->

## Page 20 | Manufacturer launch: the minimum valuable pilot

Avoid launching every possible manufacturing module at once. **Pilot V0:** Import a single EXO garment fixture, create a read-only web tech pack and show immutable source revision, 2D/3D preview, POM, BOM, construction and attachments. Validate that the generator outputs match the web data. Recruit one technical designer and one manufacturer to evaluate usefulness without connecting production orders or private supplier secrets.

**Pilot V1:** Add organizations and grants, comments pinned to measurements/edges/images, sample rounds with actual measurements and photos, structured proposals and request/resolve status. All updates become append-only audit events. Show one-way factory access to only approved releases. Test actor permissions with malicious ID swaps and expired links before invitations leave the team.

**Pilot V2:** Implement approval chain, release diff, R01/R02 snapshots, acknowledgement, factory PDF/ZIP download and mobile viewing. Add work-order milestones as reported events; preserve historic packages and link actual Sample 1/2 to source. No automated factories or AI purchasing are required for this value proposition.

**Non-negotiable acceptance:** Two designers and two isolated factories can concurrently view one shared style without leakage; one factory proposes a cuff modification while the other has an unrelated job; no proposal changes the approved spec; designers can approve R03; both R02 and R03 can be reconstructed, and stale edits are rejected. A phone user can upload a sample photo on slow service without duplicate entries. A revoked user's access fails on every API and file route.

**User outcome metrics:** time from factory question to clarified decision, percent of issues pinned to a specific POM/part, unacknowledged release count, stale-file delivery errors, sample rounds per style, wrong-version cutting incidents and factory adoption. Establish a baseline before claiming productivity improvements.

**Recommended first stakeholder review:** Show a working annotated living tech pack to a garment maker, pattern engineer, factory technical operator and small brand owner. Ask them to complete the R01→Sample1→ChangeProposal→R02 loop without training. Record every unresolved question, and build features based on observed production blockage rather than how visually impressive the portal looks.

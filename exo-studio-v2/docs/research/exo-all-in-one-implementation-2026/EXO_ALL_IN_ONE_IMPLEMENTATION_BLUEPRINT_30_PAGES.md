# EXO ALL-IN-ONE | GARMENT, FACTORY & PRODUCTION STUDIO

**Page 01 | Implementation blueprint | 17 October 2026**

**Design once. Develop with the factory. Previsualize the campaign. Produce with confidence.**

This second report translates the October apparel-software gap study into an engineered EXO ClothCraft V2 product program. The main proposal is one connected platform combining an editable garment engineering workspace, a versioned interactive tech pack, a manufacturer-facing collaboration and production portal, and a photo production studio that can generate credible 3D look images and pre-plan an actual studio shoot.

**Two differentiated experiences:** (1) an interactive garment website sent securely to a manufacturer, where every measurement, manufacturing instruction, comment, sample, approval, and change is traceable; (2) a visual shot-planning workflow where digital looks, studio space, lights, cameras, lenses, poses and storyboard outputs become a practical real-world photo shoot plan.

**Research and implementation basis:** the prior 30-page EXO Apparel Software Gap Atlas; existing EXO October 16 living tech-pack concept; current factory-package modules and render panel; staged Blender environments; security and rendering references. This is a build plan, not a claim that either connected cloud product is already deployed.

**Outputs:** exact UI modules, architecture decisions, data model and contracts, permissions, release lifecycle, render job pipeline, collaboration patterns, test fixtures, delivery phases and realistic scope boundaries. Accompanying specialist documents give deeper manufacturer and photo-studio specifications.

---

<!-- PAGE -->

## Page 02 | The product vision: one garment, several destinations

An EXO garment begins as a source document: pattern pieces, curves, 3D arrangement, seams, fabric specifications, grades, notches, hardware, artwork and measurements. That source creates separate but linked outputs. The fit/engineering representation helps design; the released factory representation communicates binding construction; the editorial representation helps sell the garment; and the real photo shoot plan communicates how to capture it. Each output must reference exactly which garment revision it uses.

**The desired experience:** Open a hoodie project. On a top workspace switcher, choose **Design**, **Production**, **Factory Portal**, or **Photo Studio**. In Production, inspect the living tech pack, confirm grade/measurements/BOM and issue Factory Release R02. Invite an approved manufacturer; their own portal displays only R02, approved construction and scoped project messages. The factory measures Sample 2, uploads photos, suggests a seam change and marks the sample as “needs review.” The designer sees the comment anchored to that actual seam, reviews a structured proposal and issues R03 after approval. Every historical release stays reconstructable.

Next, the brand moves to Photo Studio. Choose the approved garment presentation revision, add an avatar or model reference, select a neutral cove, place softboxes and cameras, create “front ecommerce,” “left profile,” “hardware detail” and “editorial three-quarter” shots. Low-cost scene previews become high-quality 3D renders. The same shot definitions generate a physical studio floor plan, lighting chart, gear list and shoot-day call sheet.

**Shared foundation, distinct authority:** Factory approval is a controlled engineering event. A photoshoot mood or lighting edit is a creative event. Changing exposure must never mutate an approved color/material spec. A sample measurement cannot be silently overwritten by an AI render. The system should represent dependencies and demand reapproval when a meaningful source record changes.

**What makes the platform differentiated:** one entity graph and audit trail, along with specialized views for designers, patternmakers, factories, producers, photographers and campaign teams. This eliminates repeated manual retyping while respecting that each role needs different controls and confidential information.

<!-- PAGE -->

## Page 03 | Existing EXO state: what we can genuinely reuse

The inspected React/Vite project already contains `src/core/measurements.js` with `buildTechPack`; `src/core/factoryPackage.js` with `buildFactoryPackageFiles` and `buildFactoryPackageZip`; and `src/core/productionPreflight.js` with geometry, seam, marker and size checks. The generated ZIP contains `tech-pack.json`, `pom-spec.csv`, `materials-bom.csv`, construction sheets, size-run data, source JSON, DXF patterns and marker plots. `src/core/productionCost.js` estimates fabric-only material cost and appropriately marks uncertain or incomplete cases. Native C++ factory exporters also exist. **These are export capabilities, not yet a shared factory web service.**

EXO's `src/App.jsx` includes a Render panel with stage, lighting and output presets and high-resolution still export. `src/data/stagePresets.js` defines a collection of 20 original stage concepts, and source Blender scenes exist in `docs/research/clo-connect-community/blender-scenes/`. The October 16 material/studios architecture already proposes an editable stage scene with cameras and lights. This report operationalizes it into shot lists and real-shoot production records.

**Critical architecture caveat:** V2 has a Rust ClothCraft-native editor alongside the broader legacy EXO draft project. Existing state-management documentation explicitly says the full EXO grading/trim/production model and Rust viewer do not yet share a single synchronized authoritative garment source. Before manufacturing or render releases, bridge them through a typed adapter and prove ID, units and revision parity. An appealing synchronized UI alone is insufficient.

Existing local saves in `src/App.jsx` rely on browser localStorage for significant draft state, while the installed V2 native app maintains its own local saved source/simulation state. Shared collaboration therefore needs a backend with authorization, persistence, conflict resolution and object storage; using localStorage as a multiuser database is not viable. Keep the local-first authoring experience even as approved project snapshots sync.

**Preservation rule:** The protected V1 worktree and live saved V2 garment remain untouched by this research effort. The implementation should develop behind feature flags using separate test organizations and synthetic fixture garments before importing real owner projects.

<!-- PAGE -->

## Page 04 | Navigation, modes and one coherent EXO identity

Make the large workspace understandable through four persistent top-level destinations: **Design Studio** (2D/3D source), **Production Studio** (grade/BOM/measurement/cut check), **Factory Hub** (living tech pack, supplier/sample/milestones), and **Photo Studio** (virtual shoot and physical production planning). A fifth **Library** collects patterns, fabrics, trims, stage scenes, avatars, cameras and reusable shot recipes. The left sidebar changes to the relevant domain; common style/revision information remains in a shared top bar.

An EXO **Style Overview** is the entry point. It displays draft revision, approved factory release, target size run, fabrics awaiting verification, open factory questions, sample progress, active shoot, latest approved render and unresolved source/export warnings. A design warning should link to the exact 2D edge or BOM row; a shoot comment should link to a shot, not an ambiguous image filename.

**Separation of public and confidential data:** A brand employee sees internal costs, formulas and working drafts if permitted. A factory invited for R02 sees only that style's authorized releases, samples and comments. A photographer can see approved appearance assets and the shoot plan without obtaining graded production DXFs. A public customer sees only explicitly published visuals and product information.

**Interaction design:** A global context bar shows current style, colorway, size, revision status and who can edit. The right inspector follows the selected object: pattern edge, POM line, factory comment, shot camera, light stand or render output. A globally accessible activity drawer shows “what changed,” “who needs to respond” and “which artifact is now stale.” Keep unresolved blockers persistent through workflow navigation.

**Desktop vs web:** Keep native garment authoring on the desktop where its Rust engine and local project data are available. Host the collaborative factory website behind authenticated HTTPS, with a bounded source-sync agent transferring approved normalized snapshots. The photo planner can use web-based fast previews while the high-quality Blender render worker runs on a chosen local or authorized compute host.

**First prototype:** the designer-facing Tech Pack and Photo Studio tabs can be developed side-by-side using immutable fixture data. Factory sign-in, real approvals and production invitations must wait until object-level access checks are actually implemented and tested.

<!-- PAGE -->

## Page 05 | End-to-end journey: hoodie from pattern to campaign

**Design:** A patternmaker opens an existing hoodie and confirms the base size, fabric assignments, seam structure and hardware. The preflight report checks for invalid contour geometry, unmatched seam lengths, missing required materials and incomplete marker pieces. Anything not experimentally verified remains clearly labeled; for example the PPF fit path has known historical contact issues and cannot be treated as physical fit certification.

**Digital tech pack:** The team creates a TechPack Draft based on an immutable garment snapshot. It adds front/back technical flats, POM instructions, grading and size table, seam callouts, button/zipper trims, BOM, supplier alternatives, wash/artwork references and approved photo evidence. A review detects an unapproved fabric-color substitution and missing size-L sleeve actual measurement. Those issues are resolved or explicitly waived by an authorized reviewer before release.

**Manufacturer exchange:** The owner releases R01 for Factory A. The factory acknowledges the release, requests clarification on stitch density, then uploads Sample 1 with cuff photo and measured cuff opening. A comment ties the photo to `POM-CUFF-OPENING`, size L and R01. The designer proposes a revised sleeve/cuff specification, sees which size charts and construction diagrams change and approves R02. R01's data and factory acknowledgement stay unchanged.

**Photoshoot preproduction:** The creative director chooses the approved garment appearance asset, picks a “white infinity” preset and creates an eight-shot studio plan: front/back/product three-quarter, hood detail, zipper macro, full-body model, editorial movement and alternate crop. They save actual focal lengths, expected camera distance, lighting fixtures and positions, stage dimensions, garment colorway, makeup/pose direction and sample readiness.

**Virtual and real shoot:** Render low-resolution contact sheets to approve composition, then high-quality 3D previews. Export a numbered shot board, camera diagrams, lights/equipment packing list and timeline to the real studio team. On shoot day, upload photographer selects to the corresponding `Shot` rows for virtual-versus-actual review. If the physical sample differs from the digital garment, record it explicitly, preserving manufacturing traceability.

**Success criterion:** Every external output identifies the same style and relevant revision, while edit permissions remain scoped. The workflow produces usable factory and photography artifacts even if the receiver never installs desktop EXO.

<!-- PAGE -->

## Page 06 | Canonical record and identity graph

Use a domain model with separate immutable identities for `Organization`, `Style`, `Colorway`, `SizeSet`, `GarmentRevision`, `TechPack`, `TechPackRevision`, `FactoryRelease`, `Factory`, `PartnerGrant`, `SampleRound`, `ChangeProposal`, `WorkOrder`, `ShootProject`, `Shot`, `SceneRevision`, `RenderJob`, and `MediaAsset`. A style can have many garment revisions and releases; a release pins exactly one validated source snapshot plus the approved spec/BOM files. A shoot can reference the same style but separately pin the presentation asset and approvals.

**Identity rules:** stable UUID/ULID for entities, source `panelId`/`edgeId` references where available, immutable `revisionId`, `contentHash` and `schemaVersion`. Refer to logical POM or seam IDs for comments, not display-row numbers, pixels or unstable triangle indices. Store source units and transforms; metric SI numbers are canonical even when displayed in inches. A cloned style gets new identity and an attribution lineage, not a mistaken reuse of the source style's release IDs.

**Dependency graph:** `GarmentRevision → graded shapes → POM values → cut package → FactoryRelease`. `FactoryRelease → SampleRound → Observation → ChangeProposal → next draft`. In parallel `GarmentRevision → VisualAsset → ShootProject → ShotManifest → RenderJob → Select → PhysicalPhoto`. The same source revision can be used to calculate asset invalidation, but production and visuals follow different approval policies.

**Minimum durable database:** relational database for identities, ACLs, status and transactions; blob/object storage for heavy JSON/GLB/DXF/images/BLEND/render passes; a background job queue for validation and rendering. Keep immutable artifact SHA-256 and size; every API response identifies version and access scope. Do not store full 3D binary scenes in free-text comments or rewrite released geometry in place.

**Schema evolution:** content records carry `schemaVersion` and migrations; unknown required fields block release while optional unknown fields survive a round-trip. Every generated factory ZIP and photo manifest embeds a snapshot hash. Changes to source geometry produce a new revision and a recoverable mapping of logical IDs, especially after split/merge operations.

<!-- PAGE -->

## Page 07 | Versioning semantics: working draft, approved release and visual look

Define three clocks explicitly. The **authored source clock** tracks geometry/physical material/grade edits. The **factory release clock** tracks reviewed and approved production instructions. The **shoot clock** tracks lighting, poses, sets and campaign edits. A camera move increments shoot revision only. Changing a cuff edge increments garment revision and invalidates relevant unapproved factory/visual derivatives; it does not silently rewrite a released pack.

**Factory states:** `DRAFT → IN_REVIEW → CHANGES_REQUESTED → APPROVED → RELEASED → SUPERSEDED/ARCHIVED`. Transitions check expected parent revision and actor capability. “Approve” and “Release” may be different permissions. Issuing R02 never mutates R01, and manufacturers must actively acknowledge R02 if the new release affects their contracted work. A release can be withdrawn with a logged reason; its signed record remains.

**Shoot states:** `IDEA → PLANNING → PREVIS_READY → APPROVED_FOR_SHOOT → SHOT → SELECTED → DELIVERED`. Edits after approval generate an impact notice for the producer rather than modifying the call sheet that was already distributed. Individual shots may have separate status; a cancelled shot remains visible in the historical board.

**Content-addressed manifests:** a source snapshot records canonical JSON digest; factory release records hashes of POM/BOM/cut assets; shoot manifest hashes garment asset, pose, scene, camera/light rig, render settings and producer-approved look. A render can be repeated only if its external dependencies remain available and versions are compatible. Record non-deterministic seeds and denoising/render-engine versions.

**User-facing compare:** R01 versus R02 should show measurement diffs by size with units and tolerances, seam and cut-line changes, fabrics/trim substitutions, document updates and comments resolved. Shot V03 versus V04 should show composition image overlay plus changes to focal length, light positions, stage assets and assigned garment appearance revision. “Changed” is meaningful only with its domain and source.

**Enforcement:** optimistic locking (`expectedRevision`) prevents a stale browser from overwriting an accepted measurement. Concurrent editorial notes may merge; authoritative numeric specifications and release statuses must use validated transactions. Conflicts become explicit alternatives for review.

<!-- PAGE -->

## Page 08 | Source adapters: bridging EXO draft, Rust, C++ and web

EXO has distinct source systems today. Build a **Canonical Garment Snapshot Adapter** before adding web collaboration. It reads the EXO draft `project` and native Rust `GarmentTemplate` via explicit typed mapping, normalizes units and logical IDs, and labels unsupported semantics. It does not declare the two models interchangeable simply because the same garment renders in two viewports. An adapter fixture should contain a patterned tee or hoodie with named edges, 2D/3D shape, seams, size run, POM/BOM, notches, allowances and trims.

**Adapter outputs:** `sourceSnapshot.json`, `manifest.json`, `geometryDiagnostic.json`, factory-specific files as generated by existing exports, and optional presentation mesh with known transform/version. Report which fields are authoritative on each side. A native edit is valid only when the UI-side readback agrees on mapped geometry and the edit history records the right source revision.

**Service boundaries:** The desktop bridge can expose a local authenticated `GET /project/snapshot` and `POST /project/validate`, then perform an authenticated outbound sync of an approved snapshot. A remote factory user never directly invokes the Rust native service. The cloud API accepts validated uploaded snapshot packages and returns versioned IDs and validation reports. Display whether a snapshot is “local working,” “synced draft” or “factory released.”

**Export re-use:** Do not rewrite `buildTechPack` and factory ZIP exporters before building an import/read-only projection into the collaboration service. Their current outputs are practical fixtures; reconcile differences with the parallel native C++ factory paths and report missing data. Later refactor toward a shared schema/type generator to prevent JavaScript/C++/Rust drift.

**Unsupported fields:** a draft visual fastener without measured supplier SKU or physical attachment capability is shown as “illustrative trim; production details required.” A render-only surface map without tested stretch/bend properties is similarly marked. Never upgrade unverified visual properties to manufacturing authority.

**Proof:** round-trip one untouched source through the adapter, cloud store, signed factory download and local reimport. Compare pattern coordinates, size labels, cut-piece counts, POM, seam IDs and hash manifest. A mismatch creates a blocker with exact field path and revision information.

<!-- PAGE -->

## Page 09 | Online architecture: local-first authoring, durable collaboration

Recommended architecture: keep the native macOS V2 application as the heavy authoring client, with an explicit desktop sync component. Use a standard HTTPS backend (e.g. TypeScript API backed by PostgreSQL and object storage) for organizations, styles, releases, comments, proposals and projects. A relational database is a pragmatic fit for transactional releases, joins and authorization. Treat hosting/database choices as replaceable until an actual deployment platform is selected.

**Read model:** server imports a normalized snapshot, generates a sanitized 2D SVG or read-only pattern preview and low-poly 3D representation, creates an indexed POM/trim/construction search view and stores release-specific signed exports. A factory browser fetches only permitted data. Read-only rendering of released garment is enough for V1; web-based editing of raw pattern topology is not needed to deliver high manufacturer value.

**Write model:** a designer drafts corrections in the desktop or approved web spec editor. The factory can comment, attach evidence and create typed `ChangeProposal` records. Only authorized design roles can approve a proposal; approval generates a new **draft** based on a chosen source revision. Issuance of a manufacturing release requires explicit validation and signer identity.

**Realtime and offline:** WebSocket or SSE broadcasts scoped updates (comments, sample statuses, notifications); every event includes monotonically ordered sequence and unique event ID for replay. Offline notes can queue locally and sync with revision/conflict detection when connected. The offline client never assumes that an expired invitation still authorizes uploading data.

**Storage/performance:** structured technical data lives in DB; immutable blobs in object storage with hash and MIME/size validation; thumbnails and generated PDF are derived outputs. Use a job queue for PDF/ZIP generation, mesh conversion, virus/media scanning and Blender render. Enforce file quotas, timeouts, idempotency keys and cancellation to avoid duplicate paid GPU work.

**Deployment decision:** the collaborative portal can be hosted separately from the Mac native UI; a single sign-in provides consistent accounts if desired. A private local mode should continue to support garment design even when the cloud is unavailable; syncing and factory releases clearly require connectivity.

<!-- PAGE -->

## Page 10 | Permissions, supplier isolation and confidential assets

Use authorization that considers **actor + organization + project + exact release + action + data classification**. Default deny on every API route and object fetch, including thumbnails, render passes, exports, comments, search and notification payloads. Role labels such as Designer, Approver, Manufacturer and Photographer are useful UI concepts but must be enforced using capabilities and object relationships. OWASP's Authorization guidance explicitly addresses multi-tenant and cross-organization object access challenges: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html.

**Example scopes:** Owner may edit the design and invite partners. Patternmaker may edit draft grading and tech specs but not publish external factory releases without approval. Factory A sees only its authorized release(s), own sample uploads, scoped questions and allowed pattern package files. Factory B cannot infer Factory A's prices, quotes, contacts or exports. Photographer receives approved visual mesh, shot plan and usage rights, not raw factory DXF or hidden cost data. External Guest may have expiring view-only access to one specified artifact.

**Sensitive separations:** classify raw geometry, design references, supplier and raw material prices, physical sample measurements, artwork/licensed assets, internal notes and public presentation independently. Generating a sanitized preview means removing unapproved materials and metadata from the actual binary/JSON response, not hiding components using CSS.

**File security:** all downloads authorize the exact artifact on the server and use short-lived access URLs; upload scanner and content validation run before anyone sees an asset. Encryption at rest/in transit, session expiry, MFA support for approvers, signed audit log and controlled retention/deletion rules should be planned. Track consent and licensing for external images, 3D models and scans.

**Release controls:** approving a spec, acknowledging a release and changing partner access are separately auditable activities. Protected references must not be overwritten by a renderer job or automated importer. Recoverability includes daily backups and tested restoration of revisions, relational records and object storage.

**Critical abuse test:** log in as Factory B and replay Factory A's known release ID, signed attachment URL, photo job ID and comment ID against GET/POST/PATCH/DELETE. Each request must deny or return an intentionally opaque error, including nested URL variants. Repeat with a photographer trying to fetch internal raw patterns. OWASP's authorization regression guidance provides a template: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html.

<!-- PAGE -->

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

<!-- PAGE -->

## Page 21 | EXO Photo Studio: virtual photographs and real-shoot plans

Add a **Photo Studio** workspace designed for two outputs at once: convincing 3D images of the approved garment and a practical preproduction plan for shooting that garment with real people, cameras and lights. The workflow is not only choosing a filter or stage; it plans individual frames, sequential looks, the physical footprint of the studio, crew, equipment, lighting modifications, garment samples and actual shoot time.

**Photo Studio home:** each `ShootProject` belongs to a style collection or campaign and contains one or more `Look` records, shot templates, sets, sessions, production tasks and assigned users. Users begin with “Create shoot” and choose purpose: ecommerce pack, editorial/lookbook, campaign, fit/product details, or showroom/runway. A setup wizard asks which garment revision to photograph, which sizes/colorways are ready, whether a physical sample exists, target aspect ratios and planned deliverables.

**Workspace composition:** left column **Looks / Sets / Shots / Assets**; center realtime stage with movable garment/model/camera/light handles and camera-view toggle; right inspector **Camera / Lens / Framing / Lights / Pose / Props / Material / Rendering**; bottom storyboard/contact-sheet timeline showing every shot thumbnail, status and real-shoot schedule. A second tab displays a top-down scaled floor plan rather than 3D. A third tab displays the call sheet and crew/equipment list.

**Preset workflow:** “White E-commerce / 8-shot kit” creates shot placeholders with front, back, side, three-quarter, mid, logo/zipper detail, material macro and lifestyle image. “Editorial Concrete / 5-shot story” creates hero, angle/pose variants, intimate texture and dynamic transition shots. Each preset is a template with editable cameras, backgrounds and actions; it should never rewrite a user's authored camera rigs without explicit choice.

**Output:** preview stills, photorealistic render jobs, storyboard with notes and numbered filenames, shot list spreadsheet/CSV, set plan with equipment positions, photographer-facing image contact sheet, crew timeline and shoot-day call sheet. EXO can later ingest actual photographer selects and pair them with their virtual reference shot IDs.

<!-- PAGE -->

## Page 22 | Build on the actual EXO Stage Library

Current EXO has 20 original procedural stage concepts and original Blender scene sources, with a more curated StageCatalog view. These establish useful source assets but do **not** automatically provide lighting-calibrated physical studio plans, photoreal garment renders, camera rigs or a queued production-grade Blender pipeline. The implementation must retain a distinction between `StageDefinition` and `ShootSet` that references the stage and adds physical camera/light and delivery semantics.

**StageDefinition:** stable stage ID, master Blender file/GLB, authored room scale, floor and collision reference, lighting placeholders, camera-ready clearances, source rights, texture dependencies and supported render versions. Catalog groups: white/neutral cove, concrete editorial, classic interior, industrial set, dark showroom, muslin backdrop, runway and outdoor environment. Curation matters more than many inconsistent presets.

**ShootSet:** selected stage version, placement transform, usable floor footprint and ceiling height, real studio correspondence, backdrops, props, light fixtures, V-flats, stands, practical lamps and camera movement zones. A virtual scene may include objects that a real photographer cannot rent or physically fit; flag these as “virtual-only” unless mapped to a real asset or custom-build task.

**Asset library:** cameras, focal-length templates, model avatars, poses, furniture, turntable podium, floor sweep, diffusion frames and studio lights each have size/unit, licensing, real-world equivalent (optional), condition and bounding volume. Tag effects such as simulated fog or physically impossible light source as editorial choices, not preproduction guarantees.

**Preset properties:** stage type, scene renderer compatibility, named camera spots, light positions in metres, nominal modifier dimensions, backdrop dimensions, safe movement areas, shot templates, rough render budget and texture/mesh resource requirements. Each library preset produces an independent shot instance; editing that instance never corrupts the global catalog.

**Quality gate:** open every selected native .blend fixture and web GLB derivative; confirm units and orientation, available camera and lights, no missing textures and usable garment insertion at reference origin. Establish fast Three.js parity screenshots and reference Cycles renders for a few flagship stages, then expand coverage.

<!-- PAGE -->

## Page 23 | Shot boards, looks, story and contact sheets

A single image is a `Shot`, a set of views forms a `ShotGroup`, and the campaign's ordered list forms a `ShotBoard`. Each shot records a unique number, title, intent, garment version, colorway, approved appearance profile, model/pose ID, set, camera, lights, planned prop, crop, resolution, notes, approval status, expected duration and linked outputs. A shot can be duplicated into a variant without losing the original. Sequence matters for storytelling and for an efficient real-world schedule.

**Storyboard UI:** use a horizontal filmstrip or responsive grid of thumbnails. Cards show “SH-005: Hoodie zipper detail,” look name, approval, camera and render status. Drag to change sequence or group shots by garment look, camera setup, lighting setup or real shoot time. On selection, the 3D viewport moves to the exact saved camera and light state; the right inspector displays the reference and a director's note.

**Shot presets:** garment on avatar front/back; side and three-quarter; front flat-lay; hero low-angle; close-up seam; full-body model; seated portrait; motion/walking; product turntable; texture/specimen comparison; twin-model look; campaign environmental establishing shot. Assign physical-sample dependencies: a close-up zipper requires the actual final trim for the real shoot, even if the virtual file has a convincing placeholder.

**Preview modes:** low-cost viewport screenshot for blocking; intermediate contact-sheet render using same stage/pose/camera but reduced samples; full editorial render for approved look. An approval must specify what is approved: composition, lighting direction, styling, product fidelity or final publication. A director approving a gray-box story does not certify garment texture or physical fit.

**Exports:** produce a shot board PDF with image, focal length, estimated camera height/distance, lighting note, pose reference, props, styling, sample readiness and planned output crop. Export the same dataset as CSV/JSON for producers and photographers; include stable shot IDs in filenames and optional QR lookup in printed board.

**Approval loop:** Creative director comments “Raise eye-line camera 15 cm, soften left shadow,” assistant updates only camera/light parameters, creates V02 preview and preserves the existing V01 thumbnail. Approved variants become frozen shoot instructions and render manifest inputs.

<!-- PAGE -->

## Page 24 | Virtual cameras and studio lights mapped to equipment

Define a `CameraRig` with transform, target/subject anchor, projection, focal length in millimetres, sensor dimensions, crop/aspect, resolution, aperture, focus distance, shutter style, ISO/exposure-equivalent controls and depth-of-field settings. Save the actual numerical position in metres; a camera thumbnail screenshot alone does not reproduce real composition. Camera presets may map to common full-frame equivalents such as 35 mm environmental, 50 mm portrait, 85 mm product and 100 mm macro, but lens-equivalence calculations must use the chosen sensor/crop.

**Light rigs** include key/fill/rim/background/grids, modifier type and actual size, light position and orientation, beam/spread, correlated color temperature, intensity estimate, falloff, attachment stand and real equipment mapping. A virtual rectangular area light can approximate a softbox shape; physical strobes are rated in watt-seconds with modifiers, flash duration and distance, so do not advertise a direct 1:1 Blender watt-to-flash-energy conversion.

**Realtime editing:** select a light in 3D and drag its stand/aim handle; show a virtual top-view plan with distance measurements, shadow direction and obstruction/safety overlays. Record ratios as relative exposure/appearance plus tested real-world light-meter notes if available. Support white seamless wall, V-flats, negative fill, reflectors, flags, diffusion scrims and practical lamps as useful studio objects.

**Real room checks:** Enter room width/depth/height, loading access, electrical limits, shooting distance and backdrop width. EXO can warn when the virtual 100 mm lens camera is too far from the subject for a 6 m room, when a boom stand sits in a doorway or the light modifier intersects the model. Those checks require measured studio geometry; an arbitrary virtual room proves nothing about a booked physical venue.

**Color discipline:** renderer working space, view transform, exposure, output ICC/color conversion and display assumptions are saved. Use a neutral material proof mode for fabric/color references; editorial color grading may deliberately shift perceived colors and should never redefine the approved factory dye reference.

**Acceptance:** Open the same shot on two machines and compare camera framing/bounds and light positions numerically. Export a measured floor plan; a photographer can assemble corresponding camera/light positions without guessing solely from the rendered reference.

<!-- PAGE -->

## Page 25 | Product realism, drape validity and source safety

For credible 3D product photos, lock the actual garment **construction identity**: pattern revision, visible silhouette, seam/topstitch IDs, hardware count and positioning, artwork/logos, colorway and material assignments. The render may add staging, lighting, camera and model pose, but must not silently change those elements. Studio art and production engineering have different authority.

**Input pipeline:** a frozen authoring source produces a presentation mesh plus source/solver/provenance manifest. Material visual profiles include PBR albedo, normal, roughness, sheen, scale and fiber direction. The physical profile is separate, and any draped frame should identify simulation backend, material approximation and acceptance/verification. Previous PPF audit found garment-contact/seam failures, so do not present a cosmetically smooth frame as certified fit or cloth-body clearance.

**Two preview paths:** browser Three.js produces interactive fast camera/staging previews; Blender Cycles produces controlled high-sample still images using the same shot manifest after a conversion/compatibility check. The exported GLB can lose Blender light setups and certain material features, so the adapter must instantiate cameras/lights explicitly for each backend and flag unsupported differences.

**Quality controls:** protect logos and graphic locations, compare garment topology and material IDs, check UV direction and fabric repeat size, ensure expected pieces/fasteners exist, calculate crop and camera visibility, inspect contact shadows and clip/penetration, and use neutral reference shots for calibrated fabrics. Cosmetic denoising can alter microtexture; verify details at 100% display.

**Render status:** A job can finish computationally and still be rejected by visual QA for missing trim, black texture, unsupported shader, unexpected clipping or inaccurate product identity. Distinguish `RENDER_COMPLETED` from `VISUALLY_ACCEPTED` and `PHYSICAL_PRODUCT_VERIFIED`.

**Important distinction:** 3D render is useful for previsualizing a real studio photo, but actual fit, skin/hair, fabric sheen, physical sample construction and real equipment may differ. Include an unobtrusive “virtual visualization” provenance indicator for internal reference. Do not promise pixel-perfect correspondence to reality.

<!-- PAGE -->

## Page 26 | Render farm and versioned shot production

Begin with a **local render worker** on the user's Mac and a controlled Blender installation. A RenderJob references immutable `shotManifestHash`, scene asset versions, garment/presentation mesh hash, validated material maps, selected renderer, resolution, sample count, denoising, output format, GPU/CPU capabilities and queue priority. The server or local service submits one job at a time or within measured hardware quotas, returns progress and writes outputs with unique filenames and hashes.

**Pipeline:** User chooses shot → EXO validates required asset hashes and licenses → compile a Blender scene from the source `.blend` stage plus frozen garment and camera/light config → open/render headlessly → collect output PNG/EXR plus optional object/matte/depth/material passes → run technical image checks → attach preview, settings and diagnostics to shot. Keep original scene and output layers available for revisions.

**Queue states:** `QUEUED`, `VALIDATING`, `ASSEMBLING`, `RENDERING`, `POSTPROCESSING`, `COMPLETED`, `REJECTED_QA`, `FAILED`, `CANCELLED`. Changing a shot after submission does not mutate its queued manifest; the user can cancel and create a new version. Cache reuse keys must incorporate garment/scene/light/material revisions and render version.

**Interoperability:** Exchange transforms in metres with explicit axis conversions, color management, UV tangent conventions, physically separate fabric front/back shaders and named material channels. OpenUSD's layered/reference composition and variant sets may help later with reusable looks and shot variants, but should not be adopted blindly before Blender and web support are measured: https://openusd.org/25.11/usdfaq.html and https://aousd.org/usd-core-specification/.

**Performance:** draft renders use lower resolution and controlled samples. Finals are queued with resource estimates and optional hardware profiles. Track CPU/GPU backend, available memory, frame duration, asset weight and estimated credits/cost. Do not launch hidden GPU jobs just because a user switches stage; explicit render actions should control expensive work.

**Acceptance:** Batch 12 shots; verify no cross-shot camera leakage, deterministic manifest hashes, recognizable image thumbnails, cancel/resume behavior and asset provenance. Restart the worker mid-job, restore statuses without declaring partial images complete and preserve the user's saved garment and ongoing native app session.

<!-- PAGE -->

## Page 27 | Make the digital plan usable on a real shoot day

The distinctive goal is **rehearsing the physical shoot before paying for the studio**. Add “Convert to Real Shoot Plan” to a reviewed shot board. Ask for studio venue, floor measurements, set access, time window, model/crew roles, available lights/cameras/lenses, equipment rentals and final physical samples. Virtual shot parameters are then translated into annotated floor and elevation diagrams showing subject/pose points, camera tripods, focal lengths, light stands, modifiers, V-flat placement, background distance and clearances.

**Producer view:** Group shots by lighting setup and wardrobe change to minimize resets. Estimate setup and shooting duration per group with explicit human-adjustable assumptions; derive a draft chronological call sheet including crew call, model/talent arrivals, hair/makeup, first shot, breaks, location restrictions and wrap. Crew safety, labor rules, venue access and equipment power capacity require a real production manager's confirmation.

**Gear breakdown:** camera body/sensor, lenses, tethering/capture laptop, color cards, tripods, seamless rolls and support, softboxes/stripboxes/reflectors, stands/booms, clamps, sandbags, props, garment steamers, styling clips, spare trim and sample size/color inventory. EXO can recommend a list based on the shot plan while leaving availability and supplier price as “unconfirmed” until supplied.

**Talent and garment readiness:** Use one row per look: chosen model, approved physical sample size, styling/shoes/hair/makeup, backup sample, fit notes, responsible stylist and shot IDs. A campaign with three garment colorways should not imply that a virtual colorway is available as a sewn physical sample. The platform explicitly flags missing sample or incompatible fit.

**Outputs:** downloadable shot board/contact sheet, schedule CSV/ICS or compatible calendar artifact, PDF floor plan with metre dimensions, crew-facing call sheet, gear list, location notes and reference images. Version the package and collect approvals before distribution. The photographer should be able to print or open these without EXO accounts if granted a production-safe export.

**Day-of-shoot:** mark each shot pending/captured/selected/reshoot, attach RAW/JPEG references and contact sheet links, and record discrepancies to the virtual plan. Never overwrite the approved virtual preview with a physical capture; pair them through shot ID for later comparison.

<!-- PAGE -->

## Page 28 | The physical-photo / virtual-render comparison loop

Each shot should have a **reference render**, an **on-set capture**, a **selected final** and a **change log**. Review them side by side at matched crop, camera orientation and known garment features. Virtual shots answer “What will the planned composition look like?” Physical photos answer “What actually happened with this garment, model and set?” Their differences can improve future previsualization.

**Useful metrics:** camera/lens/subject-position mismatch, shadow direction and contrast, visible garment hue under real lights, pattern/zipper/logo framing, sample fit/silhouette differences, set-prop mismatch and shot coverage. Optional image alignment tools may help compare edges and composition, but subject movement and depth of field can make naive pixel differences misleading.

**On-set dashboard:** show each shot card with reference thumbnail, completion state, capture notes, assigned photographer/stylist and approved select. A remote director can mark “retake logo detail at shallower angle” with visual pin; the task belongs to `Shot SH-07`, not a generalized project message. Offline photo teams can import from a standardized directory with filenames carrying shot IDs and capture timestamps.

**Approval specificity:** a client can approve composition but request better fabric texture; a production manager can approve time/gear plan but mark an electrical issue unresolved; a brand owner approves final marketing image only after verifying product identity. Preserve all these distinct review decisions. Published files should reference a final selected asset rather than a provisional render whose source later changes.

**Reproducibility and honesty:** Store color pipeline, image metadata, garment appearance revision and renderer version for virtual outputs. Store actual camera/lens metadata and approved edit lineage for physical photos when provided. Mark any composited/generated product modifications clearly in the internal provenance trail; do not use a fabricated stitch, zipper or silhouette as manufacturing truth.

**Later opportunities:** automated shot grouping by crew/lighting, AR overlays for camera positions, light-meter integration and production scheduling optimization. Validate each against real shoots first. The strongest V1 value is likely a usable 3D storyboard and a practical physical studio plan, even before advanced AR features exist.

<!-- PAGE -->

## Page 29 | Roadmap, team, effort and decision gates

**Month 0–1: source and interface contract.** Audit the active V2 hybrid garment state. Define canonical `GarmentSnapshot`, revision IDs, POM/BOM and 3D appearance pointers. Establish synthetic factory fixture and a white-studio shot fixture. Choose storage and API deployment strategy. Gate: full source readback, saved hashes and no silent drift between native and EXO draft geometry.

**Months 1–3: two visible prototypes in parallel.** Team A builds private read-only living tech pack with technical sections, POM viewer, released PDF and fixture preview. Team B builds Photo Studio shot list, stage selection, camera/light controls, four presets and storyboard PNG. Both reference immutable garment fixture revisions. Gate: pattern/model and shot revisions remain independent; source export matches displayed data.

**Months 3–5: factory review & real-photo planning.** Build scoped partner accounts, pinned comments, photo uploads, factory questions, change proposals and approvals; implement physical studio dimensions, shot floor plans, call sheet/gear list and actual-vs-virtual shot pairing. Gate: complete sample-review demo with two isolated factories; 8-shot storyboard yields usable physical plan signed off by a photographer.

**Months 5–7: reliable releases & rendered imagery.** Implement immutable R01/R02, acknowledgement and diff; complete render queue with Blender Cycles scene assembly, material/color checks and source hashes. Gate: reconstruct factory release/shot manifest after restart and prove accepted renderer matches required garment identity without missing assets.

**Months 7–10: manufacturer pilot and launch quality.** Add mobile portal, source change propagation, production milestone reporting, per-order access, role revocation, backup/restore, secure downloads and approved virtual look exports. Gate: real manufacturing partner can work through one complete sample iteration with readable offline files; shot previsualization used in at least one physical studio test.

**Months 10–12+: selective expansion.** Costing, deeper BOM/cut/marker checks, QC tracking, translations, supplier APIs and optional advanced shoot automation. Prioritize based on partner feedback and availability of validated native geometry. Actual timelines are estimates contingent on existing project stability, team skill, stakeholder access and competing V2 repair work.

**Indicative staffing:** one CAD/Rust/native integration engineer, one backend/auth/DB engineer, one full-stack portal engineer, one 3D/Blender/render pipeline engineer, one product/UX designer, and fractional professional patternmaker, factory reviewer and photographer/producer. Tasks can be shared, but reliable multiuser security and calibrated render parity add nontrivial calendar time. No procurement or shipping date is approved by this research.

<!-- PAGE -->

## Page 30 | Priorities, acceptance ledger and first build slice

**The first high-confidence build slice:** (A) one versioned read-only Tech Pack website generated from EXO's existing factory JSON/POM/BOM/2D previews; (B) one camera-aware Photo Studio shot board using the existing white/neutral stage and garment visual asset. Both have a fixed source revision and a shared Style Overview. This proves the platform's navigation and data contract without risking a real production release.

**Next build slice:** authenticated factory partner, anchored POM/edge/photo comments, sample observation, approval proposals and R01/R02 diff. Parallel studio work adds visual presets, virtual camera/lights, physical floor dimensions and an eight-shot printable storyboard. Ship each as a separately testable vertical workflow before attempting enterprise PLM or a massive render farm.

**Gate F1 — technical provenance:** Every Tech Pack section shows source revision and whether values are supplied, calculated, measured or approved. **Gate F2 — release integrity:** R01 never changes after issue; R02 requires valid diff and owner sign-off. **Gate F3 — access:** Factory B cannot read Factory A's files, comments or costs. **Gate F4 — production:** sample observation and corrective spec changes remain linked to their original release. **Gate S1 — shot fidelity:** eight camera/lighting/garment manifests reopen reproducibly. **Gate S2 — physical plan:** a photographer can recreate set placement within documented measurement tolerance using exported diagrams. **Gate S3 — renderer:** a completed high-quality image identifies source, render engine and files; errors are surfaced before editorial sign-off.

**Risks needing early mitigation:** old-vs-native garment source mismatch; rendering physically implausible fitted poses; missing supplier material data; unsafe file/share permissions; silent 2D annotation drift after topology changes; lack of sample verification; mismapped Blender/glTF lighting and color; optimistic schedule estimates; partner reluctance to use an online portal. Each risk receives an assigned acceptance test and fallback.

**Sources and companion plans:** The prior `docs/research/apparel-production-deep-dive-2026/` Gap Atlas and 86-item inventory; EXO's `docs/EXO_INTERACTIVE_WEB_TECHPACK_PLANNING_2026-10-16.md`; `docs/EXO_PPF_MATERIALS_IMMERSIVE_STUDIOS_FUTURE_ARCHITECTURE_2026-10-16.md`; official Blender manual (https://docs.blender.org/manual/en/latest/), OpenUSD (https://openusd.org/25.11/usdfaq.html), OWASP Authorization Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and dedicated `MANUFACTURER_PORTAL_BLUEPRINT.md` / `PHOTO_STUDIO_BLUEPRINT.md`. Consult the accompanying reference register for full provenance and unresolved feasibility questions.

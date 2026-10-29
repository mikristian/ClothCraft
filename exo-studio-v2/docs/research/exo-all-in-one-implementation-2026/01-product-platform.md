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

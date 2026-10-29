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

## Page 26 | Living tech-pack schema and data authority

**Required aggregate.** A `TechPack` belongs to an organization and style; it owns working revisions and references zero or more immutable `FactoryRelease` objects. A revision pins `garmentRevisionId`, size set, colorways, POM, BOM, construction instructions, technical flats, grading/cut artifacts, artwork/labels, packaging and source references. Each section carries stable entity IDs, schema version, provenance, units and validation state. Do not reconstruct structured manufacturing facts by OCR of an exported PDF.

**Authority classes.** A technical pack must distinguish editable draft values, geometry-derived values, physical sample actuals, factory proposals, authorized approval and released binding instructions. The same POM row may show target, measured sample and proposed next revision side by side. A manufacturer changing “Sample 1 actual chest = 56.5 cm” cannot thereby change “Approved R01 chest target = 55 cm.” Store approvals and actuals as separate records with explicit source.

**Serialization.** Use canonical metric fields, stable references to garment geometry and immutable assets, document-specific display units and deterministic release serialization. Schema migration retains unknown optional fields and rejects unsupported critical quantities. Generated factory-spec HTML, POM CSV, BOM CSV, DXF, marker and PDF must use the same release snapshot and embedded digest. Where current EXO exports lack a field, show “not supplied” and a task owner rather than fabricating a default.

**Browser contract.** A viewer can inspect the current released tech pack, open a permitted old release, compare revisions or submit a proposal. Working drafts are internal unless explicitly shared. Public portfolio pages receive sanitized visual derivatives, not raw POM, vendor pricing, source equations or pattern files.

**Acceptance.** Create a hoodie pack with base S–XL, five POMs, two fabrics, zipper hardware and a size-run source. Release R01, modify a draft and prove R01 JSON/PDF/ZIP payload hashes remain stable. Compare every web table value to source export data and reject a malicious client payload that attempts to change its organization or release owner.

<!-- PAGE -->

## Page 27 | Style overview and manufacturer information architecture

**Manufacturer landing page.** Header identifies style/SKU, colorway, approved release, sample stage, assigned factory, issue status and acknowledgement. Left navigation contains Overview, 2D/3D Garment, POM & Grades, Materials/BOM, Construction, Hardware, Graphics, Samples, Quality, Files and Revision History. Center shows an interactive technical preview or selected table; right rail contains anchored comments, assigned tasks, evidence and proposed changes. Costs appear only when the organization's grant permits.

**Context transfer.** Clicking a sleeve seam locates its source edge and the linked construction recipe, notch details, relevant sample issues and approved reference photo. Clicking a measurement shows the diagram and every size's target/tolerance and actuals. Clicking a zipper shows approved trim identity, length and any related supplier question. The selected release stays explicit as the user navigates; a new working draft does not automatically replace it.

**Use on production floor.** Provide high-contrast concise tables, one-size-at-a-time mobile view and a read-only static release PDF. A workroom operator may lack permission to inspect pricing or unreleased draft content yet still need seam instructions. Navigation never makes unauthorized fields available in underlying API responses. Keyboard controls and a non-3D list alternative permit reviewing annotations without precision mouse movement.

**Status signals.** Show “factory acknowledged R02,” “three sample comments unresolved,” “production cut based on R01,” and “zipper substitution awaiting approval” as sourced events, not AI-inferred progress. Every badge leads to a task/release ID and responsible actor. A style may be assigned to two factories; each sees its own order, communication, costs and release scope unless the owner intentionally shares.

**Acceptance.** Have a manufacturer without training locate size-L cuff tolerance, respond to its issue thread and upload a measurement. Reopen after another designer issues a new draft and confirm the manufacturer still sees its approved release. Test screen-reader navigation and Factory B attempts to access Factory A's style by guessed IDs.

<!-- PAGE -->

## Page 28 | Point-of-measurement specification engine

**Entity definition.** `POMDefinition` contains immutable ID, name, construction reference, category, measuring method, applicable garment condition, source panel/edge anchors, location diagram, dimension and target sizes. `POMSpec` binds definition to release and provides target value plus upper/lower tolerance for each size/colorway. `SamplePOMObservation` records a physical garment's actual measured value, sample ID, time, operator, test condition and attached evidence.

**Input and display.** POM tables support direct numeric entry, unit formatting, copy-from-base-size tools, formula-linked grading and explicit overrides. Recalculation from pattern geometry must label its source method. A physical sample's measurement remains independent even if target values change. An unfilled row renders as missing, never implicit zero or an average. Rounding occurs only for display; canonical precision is preserved.

**Review behavior.** Mark actuals within tolerance, out of tolerance, unmeasured and inconclusive separately. A designer can accept an outlier with reason or request rework; a factory can post corrective suggestions but cannot change the approved target without proposal workflow. A measurement method diagram is versioned, because measuring a cuff flat vs stretched can change meaning even when the numeric target is identical.

**Integrity rules.** Validate min/max ordering, units, required size coverage and links to source garment. A base-size grade update must recompute derived sizes and flag direct overrides with conflicts. If an edge anchor was split, the POM needs a reliable migration or explicit reattachment before release. Distinguish body circumference, flat width, finished length and wash-conditioned dimension in search and export.

**Acceptance.** On R01 size L, factory reports cuff 1.2 cm wide relative to tolerance. The portal displays target/actual/deviation and raises issue pinned to the POM. The factory suggests changing target, designer declines and requests sample correction: R01 remains unchanged. Separately approve R02 with target change and verify all size values, approval actor and method diagram survive export and reopen.

<!-- PAGE -->

## Page 29 | Size-run and graded-production validation

**Grade release content.** A production release references `SizeSet`, base size, dimension rules, actual grade landmarks, all required pattern-piece IDs and per-size measured POM results. For every size, validate seam correspondence, notch mapping, allowance cutting outline and cut inventory. Attach a destination DXF/RUL verification report naming export profile, parser and accuracy status. This is distinct from previewing visual nested outlines.

**Factory viewer.** The manufacturer can compare size S/M/L/XL tables and overlay the graded nest with source IDs, notch marks, seam tolerance and piece counts. Numeric measurements have units and a consistent location diagram. The factory can flag an improbable grade progression or inconsistent rule and request technical review. They cannot directly manipulate brand-owned point vectors on a released size run.

**Validation pipeline.** Preflight checks size-label uniqueness, rule completeness, missing mirrored pieces, contour integrity, point misreferences, cut quantity, seam ease and production export metadata. A change to the base sleeve triggers re-evaluation across sizes, not a one-size-only numeric table edit. A legitimate non-monotone measurement must be represented as an authorized design exception; generic monotonicity checks cannot substitute for garment-specific rules.

**Version boundary.** A production order may have cut against R01 at certain quantities when R02 is approved. Maintain order-line release mapping so existing cut inventory isn't automatically treated as the new size run. Record whether the manufacturer accepts the revised file, whether old markers remain usable and what material/lead-time impact exists.

**Acceptance.** Import an approved four-size tee to the portal and compare size-chart values with independent pattern calculations. Alter the grade rule for a cuff, approve into a new draft, verify old size assets still available and mark all dependent markers stale. A deliberately dropped notch on XL must block a manufacturing-ready export and identify the exact size and edge.

<!-- PAGE -->

## Page 30 | Production BOM and supplier material records

**Technical BOM.** Rows reference stable `BOMItemId`, category (shell, lining, thread, interlining, zipper, button, label, packaging), per-style/variant applicability, supplier article/SKU, composition, physical specifications, unit, required quantity, estimated consumption, substitution policy and evidence status. Separate fixed unit-count trims from marker-derived fabric consumption. Each commercial supplier may quote different currency, MOQ or effective dates without changing the identity of the product requirement.

**Cross-reference.** A 55 cm zipper placed in the model links to one BOM item and construction operation. If the opening changes, the system flags the zipper length and related machine operation as needing review. A fabric swap impacts marker width, shrinkage, simulations, photo appearance and cost through distinct dependencies. A physically untested look-alike surface map is not a supplier-approved textile substitute.

**Permissions.** Manufacturers view their approved BOM and permitted supplier article details. Internal target margin, alternative vendor quotations and other factories' unit prices are separate confidential records. The production team can expose a required quantity without exposing design development cost. Changing quote price does not modify the released technical material specification unless a quote has been formally incorporated into a release revision.

**Versioning.** Each BOM row change includes before/after quantity, unit, supplier ID, source/reason, reviewer and affected colorways/sizes. Avoid in-place mutation of released BOM data. If a material is discontinued, preserve the historical record and issue a substitution proposal. Unknown fabric price must remain null, not a zero cost. Calculations carry calculation method and effective date.

**Acceptance.** The web pack and factory ZIP must show equal BOM quantities and approved SKU for each colorway. Simulate changing zipper length and replacing rib knit with a visually identical fabric from another mill: dependency graph requests construction/physics/marker review. A separate factory account attempts to read confidential quote fields and is denied by backend authorization.

<!-- PAGE -->

## Page 31 | Construction operation and seam instruction system

**Operational model.** A `ConstructionOperation` links specific seam/edge/trim IDs to technique, stitch or seam classification, machine requirements, thread, SPI or spacing, reinforcement, fold/bind width, operation order, quality checkpoint and illustration. A construction graph expresses prerequisites: attach pocket before closing side seam, finish neckline before certain topstitch, and install hardware only after suitable reinforcement where applicable. Do not confuse an ornamental line texture with an actual sewn operation.

**Factory presentation.** Selecting an operation highlights the relevant 2D pattern edge and technical diagram, shows written instruction and optional approved video/photo reference, and provides a “Question on this step” action. A sewing detail page displays the exact release ID and variant scope. A stage-specific note may supplement but not overwrite the authoritative operation.

**Links to source.** If an authored seam is split or its allowance changes, identify operations that reference it and require remap or review. A change in topstitch distance can affect sewing diagram, BOM thread estimate, Photo Studio macro appearance and sample checkpoint. Hardware installation instructions must link to the actual BOM item and anchor feature, with sizes in canonical units.

**Disagreement handling.** The factory may propose a machine-compatible alternate seam, but a text message cannot silently approve a different operation. Proposal includes current/new method, capacity, sample evidence, cost/lead-time impact and required reviewer. The designer or technical developer formally accepts into a draft, reruns construction checks and issues a new release.

**Acceptance.** Build a padded hoodie operation list with cuff attachment, hood assembly, main seam, zipper, binding and topstitch. Export both work instructions and geometry trace. Delete a source seam and verify linked operation becomes blocked rather than pointing to a different edge. Confirm a factory-only actor cannot edit approved SPI through the HTML inspector.

<!-- PAGE -->

## Page 32 | Comment anchors and geometry remapping

**Anchor types.** Support `PatternEdge(panelId,edgeId,t,sourceRevision)`, `PatternPoint`, `SeamAssembly`, `POMDefinition/Size`, `BOMItem`, `TrimFeature`, `Sample`, `Shot` and `ImagePosition(assetId,normalizedXY)`. A 3D surface comment should retain source panel/feature IDs plus mesh revision/triangle barycentric coordinates for positioning. Mesh triangle IDs can change after remeshing, so store a fallback still frame and never silently attach a comment to an unrelated triangle.

**Creation experience.** In the tech pack, the factory taps an edge, POM row or photo and types a comment. The portal displays an on-canvas pin and right-side threaded discussion; selected anchor highlights in other compatible views. Every comment references the frozen source revision and its release/draft scope. An internal reviewer can open the relevant native element through a deep link when desktop source is available.

**Version propagation.** Geometry editing produces an ID migration map. If a POM persists across revisions, show the thread as relevant with a clear original-release origin. If a panel is split, compute whether the old edge interval maps unambiguously; otherwise mark anchor `NEEDS_REATTACHMENT` while preserving its original screenshot and coordinates. Never move a thread based only on the nearest current pixel.

**Security and integrity.** Comments have visibility scope and actor access separate from the underlying garment. A project guest seeing a public image should not fetch private factory threads via image annotation APIs. Edits and deletion policies preserve the audit record needed for production decisions. Attachments receive independent authorization and cannot be inferred via sequential filenames.

**Acceptance.** Pin a comment 65% along an approved sleeve edge, modify the curve without changing its logical identity and reopen: the comment remains on the corresponding edge. Split the edge into two and test both valid mapping and deliberate ambiguity; ambiguous case preserves thread but forces human reattachment. Cross-factory ID substitution must fail.

<!-- PAGE -->

## Page 33 | Discussion threads, assignments and response times

**Thread lifecycle.** States: `OPEN`, `ANSWERED`, `ACTION_REQUIRED`, `RESOLVED`, `REOPENED` and `ARCHIVED`. Each change has actor, timestamp, original-release reference and optional decision reason. Distinguish a comment thread from a typed change proposal, and keep discussion alongside the latest accepted/rejected proposal when relevant. Resolve does not erase the original factory question or the technical answer used during production.

**Collaboration features.** Thread participants can reply, mention authorized users, assign a technical owner, set due date, attach images or measurement evidence, link other issues and filter by severity/status. A manufacturer should be able to ask for clarification without selecting a special proposal type. An internal reviewer may convert a clarified issue into a structured proposal when it requires changing an authoritative field.

**Notifications.** Notify only actors who have read permission for the exact thread, release and attached data. Prefer neutral subject lines in external notifications if confidential specs would otherwise leak. Mention autocomplete is filtered by membership. Allow digest preferences, muted threads and quiet hours. A user losing access must not continue receiving future excerpts or render thumbnails in email push.

**Offline and concurrency.** Each posted reply uses an idempotency key and expected target status. Offline drafts indicate pending sync, and server rechecks the actor's grant before accepting them. Concurrent replies can append safely, but a thread changing from resolved to reopened must use an explicit transition. A deleted attachment may leave a visible tombstone if it formed part of a production decision.

**Acceptance.** A manufacturer opens a sleeve issue, two designers reply, one accepts assignment and resolves after R02 release. Reopening the original R01 reproduces full history. Send the same offline reply twice and assert one stored event; revoke membership and verify no additional comment reads or notifications.

<!-- PAGE -->

## Page 34 | Factory sample photographs, files and evidence

**Evidence entity.** `SampleEvidence` binds to sample round, physical sample ID, factory, release, size/colorway, observation or target feature, creator and capture date. An original photo or document is immutable by content hash. Drawn arrows, measurement labels and cropped review images are separate derived assets with their own version, preserving the original for audit.

**Upload path.** Browser obtains an upload intent for a scoped release/sample, transfers through a short-lived object URL, then finalizes with checksum, MIME/size metadata, image transform and visibility. Server scans and validates before permitting other collaborators to view. Failed uploads remain retryable but not approved. Importing from a phone camera should not require heavy 3D rendering and should support slow connections and progress.

**Measurements.** A photograph with a ruler is supporting evidence; it is not an automatic calibrated measurement unless a validated image/calibration procedure is used. Enter actual values explicitly with unit, method, condition and responsible measurer. Source photo can be annotated with a pin tied to POM, trim or seam. Captured light/color may affect shade interpretation, so fabric approval should require specified color/lighting methods.

**Access and retention.** Manufacturer A's photo must not appear in Factory B's comment search. Private face/body scans and unpublished garment designs require access classification and retention policy. Revoking access stops new reads; backups and existing legally retained released records may follow documented retention rules. A photo revision or replacement creates a new attachment, never overwrites evidence cited by an old sample decision.

**Acceptance.** Upload front/back/detail photos and a measurement sheet for Sample 1, attach them to cuff and hood issues, create a crop annotation and download the original unchanged bytes. Upload corrupt, overlarge and maliciously named files and verify clear rejection. Revoke partner access and test direct object URLs and all image derivatives return denied or expired.

<!-- PAGE -->

## Page 35 | Structured change proposals and manufacturer suggestions

**Proposal contract.** `ChangeProposal` records ID, source `FactoryReleaseId`, target entity ID/path, type, current value, proposed value, canonical unit, affected sizes/colorways, rationale, photographs, estimated cost and lead-time effect, author and expected revision. Valid types include POM adjustment, seam/construction treatment, grade correction, fabric substitution, trim, artwork, labeling, packaging and work-order exception. No proposal mutates the release directly.

**Factory workflow.** An authorized manufacturer selects a POM or component, chooses “Propose change,” views the current approved value, enters the alternative and supplies evidence. Server validates scope, target existence and syntactic/value constraints. The request becomes `PENDING_TECH_REVIEW`; the factory can clarify or withdraw it but cannot transform a rejected suggestion into an already approved value by editing message text.

**Designer decision.** A reviewer can request evidence, reject with reason, partially accept with explicit revised fields, or accept into a **new working draft**. Acceptance triggers source adapter commands or assigned manual pattern tasks if the native operation is not implemented. Only after technical checks and formal approval does an R02 release contain the new value. The portal shows the difference between “proposal approved for draft work” and “new factory release issued.”

**Conflict handling.** Two factories may propose different cuff widths. Keep each proposal independently scoped and display both alternatives to the authorized owner. Conflicting changes to the same POM and revision cannot be automatically merged by last-write-wins. If the expected release is superseded, a reviewer must rebase or explicitly close the stale request. Store the entire decision chain with actor and timestamps.

**Acceptance.** Factory A proposes zipper length +5 cm while Factory B proposes alternate tape material on its distinct order. Verify no release bytes change. Approve the first into a draft, recompute its opening/trim dependencies and issue R02 only after sign-off. Try posting to another factory's release ID and expect denial before metadata disclosure.

<!-- PAGE -->

## Page 36 | Diff review, impact analysis and rebase

**Comparison contract.** Show source R01 beside working R02 candidate with exact changed fields, dimensional values, size scope, actor, reason and related proposals. POM changes display old/new target and tolerance for each size. BOM changes display supplier SKU, composition, quantity and cost visibility as permitted. Sewing changes identify edge/operation IDs and overlay curves. New or deleted pattern pieces require source geometry and cut-piece inventory comparison.

**Impact engine.** Compute a dependency set for each changed entity. A cuff outline change should re-evaluate graded POMs, seam walking, notches, allowance cut line, marker nesting, construction illustration and any related hardware/graphic anchors. A fabric substitution may affect physical simulation, shrinkage, marker widths, BOM, costing and photo material appearance. An unmodeled dependency becomes `UNKNOWN_REVIEW_REQUIRED`, never an assumed unaffected check.

**Review UX.** Reviewer opens change proposal and sees visible old/new fields with units, side-by-side 2D overlay and source evidence. They can request measurements, assign remapping tasks, approve individual changes or reject with reason. Accepting one of multiple proposals applies it to a new working draft after optimistic-lock validation, not directly to the immutable release. If draft diverged, the interface offers a reviewed rebase rather than overwriting later valid edits.

**Audit.** Persist `ChangeSet` with source and candidate revision hashes, operations in typed canonical form, before/after values and validation report IDs. All approvals identify exact change-set digest. A reviewer signing a candidate must reapprove if its hash changes before issuance; a stale signature is invalidated.

**Acceptance.** Simulate cuff width, thread spec and garment color changes in one draft, then compare to R01. Confirm the engine flags geometry-related exports but does not mark an unrelated style photo as a factory cut blocker. Edit a value after approval; issue must fail until the new digest is approved. Diff output matches machine-readable snapshot comparison.

<!-- PAGE -->

## Page 37 | Internal technical approvals and signatures

**Approval policy.** A style may require pattern engineer, technical designer, sourcing owner and brand approver signatures depending on risk. Represent a versioned `ReviewPolicy` with required capability sets, gates, sequence and conditions. Use authentication session, actor ID, timestamp, immutable candidate hash, decision and rationale. A digital acknowledgement is product audit evidence; do not claim automatic legal e-signature equivalence without jurisdiction-specific design.

**Preflight prerequisite.** Approvers see source/grade/cut/BOM/techpack issues with severity and evidence. Hard blockers prevent issuance; a warning can be accepted only by an actor possessing the defined waiver capability. Certain technical checks must be independently performed, such as DXF round-trip or physical size-set fit review. A missing physical sample remains missing even when a reviewer has permission to issue an experimental release.

**Concurrency and stale approvals.** When source or binding spec changes after review, calculate affected approval scope and invalidate signatures that no longer apply. A different user editing only a private comment cannot invalidate geometry approval. Store each signer's digest and the approval policy version. Prevent a last-minute race where release occurs against a different candidate from the one inspected.

**Interface.** “Request approval” generates assignments with due dates and changeset summary. Approver can compare, view evidence, approve or return for changes. UI differentiates ready, awaiting evidence, rejected and issued. A factory user can acknowledge receipt but cannot satisfy a brand's internal technical approval role unless separately granted and recorded.

**Acceptance.** Two-step technical and owner approval issues R01 only when both current candidate hashes match. Change BOM after first approval; test that correct scopes are invalidated. Attempt issuance from a stale tab, disabled reviewer account and cross-tenant identity; every unauthorized transition must fail. The audit reconstructs all approvals after restart.

<!-- PAGE -->

## Page 38 | Immutable factory release and downloadable package

**Release manifest.** `FactoryRelease` records release ID, style ID, frozen source garment revision, tech pack snapshot, size/colorway scope, approved pattern/marker/DXF documents, BOM/POM/construction revisions, signing actors, created timestamp, partner grants and file hash list. A release is append-only; corrections create a superseding release. A factory's sample or cut order references the exact issued release even after newer versions exist.

**Package generation.** Use current EXO factory export modules as an initial adapter, then produce one authoritative bundle from the normalized release snapshot. Factory-friendly HTML/PDF, POM CSV, material BOM, technical construction sheets, verified patterns and metadata should be derived from the same data. Include a manifest with hashes, file sizes, schema/export profile, local unit and release designation. Generation failures leave release candidate unissued or explicitly partial; never distribute an incomplete bundle as approved.

**Acknowledgement.** Each invited factory records receipt with actor/time and outcome `ACKNOWLEDGED`, `NEEDS_CLARIFICATION`, `UNABLE_TO_PRODUCE` or `DECLINED`. Receipt does not mean fit-certified. A newly issued R02 can mark R01 superseded and require fresh acknowledgement, while historical R01 downloads remain available to authorized auditors when retention policy permits.

**Static safety.** Every printed page shows style/SKU, issue ID, revision, date and optional QR lookup. A QR destination must authorize the viewer, not expose private files through mere possession of an obscure URL. Signed artifact links expire; source bytes remain stored with content hashes. A revoked manufacturer may lose access, while the brand preserves historical release records.

**Acceptance.** Download R01 before and after multiple draft edits and compare manufacturing payload hashes. Generate R02 after an approved cuff change, then verify R01 and R02 size charts differ only as expected. Corrupt an export artifact and prove manifest/hash verification blocks delivery; retry with idempotency key creates no duplicate issued release.

<!-- PAGE -->

## Page 39 | Factory invitation, membership and external partnerships

**Organization model.** Create `Organization`, `User`, `Membership`, `PartnerRelationship` and `ReleaseGrant` entities. Factory accounts belong to an organization, and access is granted to explicit styles/releases and capabilities. Being invited to view a tech pack never grants all brand designs or pattern-library downloads. Roles define a default capability set, while per-resource grants and deny rules govern actual reads/writes.

**Invite UX.** Brand owner selects factory organization, named contact or secure invitation route, exact release and scopes: view technical sheets, download patterns, comment, submit POM samples, propose changes or report order milestones. Display an expiration time and whether another approver must validate the invitation. The recipient confirms account identity before sensitive data become accessible. Email may contain a generic invitation without proprietary specs.

**Partner lifecycle.** Invitations progress `CREATED`, `SENT`, `ACCEPTED`, `EXPIRED`, `REVOKED`. A factory contact leaving the organization loses membership and dependent access. A factory invited for a new R02 must see which old R01 records remain necessary for an already cut order. Revocation stops new data and file reads; already downloaded offline documents cannot be technically recalled, which should be explained in partner terms.

**Limits.** Companies often interact by email or spreadsheet, so allow approved static PDF/ZIP export and response import without pretending offline recipients are actively viewing the site. Accounts must not permit one factory to enumerate the other factory's contacts, negotiated prices, issue threads or active orders. Public showcase rights and internal factory grants are entirely separate.

**Acceptance.** Invite Factory A to R01 with comment + sample upload rights but no source pattern download; verify each route honors the capabilities. Factory B receives a different release grant, attempts direct IDs and nested attachments from A and is denied. Expire/revoke invite and confirm cached API and signed URLs no longer grant new reads.

<!-- PAGE -->

## Page 40 | Multi-tenant ACL and supplier data isolation

**Access decision.** Every backend operation evaluates actor identity, organization membership, resource organization, style, exact release or draft, data classification, action and current grant state. `read`, `comment`, `propose`, `uploadEvidence`, `approve`, `issueRelease`, `downloadPattern` and `readCost` are distinct capabilities. CSS-hidden tabs are never a security control. Authorization is applied before returning resource existence details, search results or media derivatives.

**Database enforcement.** Include tenant IDs in relational keys and use constrained queries or row-level policies where supported. Verify nested relationships: a `Comment` belongs to a particular release and project, an `Attachment` to that authorized comment, a `SampleRound` to the factory's assigned order. Users cannot submit `tenantId` in the body to choose another tenant's ownership. Object-store signed URLs originate only from an authorized request with short lifetime.

**Private subsets.** Separate internal target margins, supplier alternatives, owner negotiation messages and unpublished source patterns from factory-visible technical BOM fields. A photographer may receive a GLB product visual but no cutter geometry. Manufacturing personnel may see pattern instructions but not the brand's marketing plans. Public users obtain only sanitized derivative assets stripped of sensitive metadata.

**Testing.** Use a matrix of Owner, Designer, Patternmaker, Approver, Factory A, Factory B, Photographer and Guest across data classes and API verbs. Include insecure direct object reference attempts, guessing IDs, uploading into foreign samples, using old signed links, foreign search filters and event/notification leakage. Apply the same scope to audit exports and historical revisions.

**Acceptance.** Run each API route under all test identities; cross-tenant access must yield no private bytes, counts or filename hints. Deny attempts to approve via a factory account even when a stale browser shows the button. Rotate grants during an active upload and prove finalize authorization is rechecked; no previously uploaded file becomes public.

<!-- PAGE -->

## Page 41 | Manufacturer production dashboard

**Dashboard purpose.** Show what the manufacturer has actually reported, which approved release work is based on, and which decision remains blocked. Each order tile displays stage, planned quantity, reported actual, work location, owner contact, last event, evidence and variance. Do not calculate a theatrical “78% complete” from the number of clicked task buttons without a defined denominator and source.

**Core entities.** `ProductionOrder` links style/colorway/size quantities to factory, release, destination and status. `ProductionMilestone` has type, plan date, actual event timestamp, work-order scope, quantity and documentation. Stage families include sample, raw materials, fabric cutting, sewing, wash/finish, QC, packaging and shipment; factories can configure their own operations. A factory may subcontract stages, but permissions are still explicit.

**Factory interaction.** An authorized production contact can report “fabric received 450 m,” “cut 120 of 200 units” or “awaiting replacement zipper”; upload delivery documents, attach photos and request help. Backend checks quantity ranges, unit, order reference and idempotency; records reported actual separately from independently confirmed physical events. Designer's central dashboard shows cross-factory progress only according to their permissions and grouped by order.

**Exception handling.** A factory cutting against superseded R01 is visibly flagged when R02 changes grading; the owner decides whether the order can finish using R01 inventory or requires rework. A missed expected shipment date becomes an event and assignment, not a silent overwrite of the original estimate. If an update originated in ERP integration, record source system and external event ID.

**Acceptance.** Set up two orders with different size mixes and factories, report partial cuts and one delay, and verify accurate quantity/event history. Factory A cannot change B's actuals; duplicate webhook retries do not double-count units. Issuing R02 creates an impact review without retroactively rewriting an R01 cut event.

<!-- PAGE -->

## Page 42 | Sample rounds, fit comments and approvals

**Sample identity.** A `SampleRound` has sample ID, factory, garment release, stage (proto/fit/size-set/PP/TOP), size/colorway, fabric lot where known, sent/received dates, courier info, tested avatar/body profile if relevant, measured POM results, photos, workmanship review, assigned owner and final decision. The physical sample is distinct from a 3D render; its evidence can be incomplete or disputed.

**Workflow.** Factory creates Sample 1 record, enters actual measured values and uploads annotated photos. Designer compares target spec and tolerance, records failure codes and marks `ACCEPTED`, `REWORK_REQUIRED`, `CONDITIONAL` or `REJECTED` with rationale. Sample 2 may be produced from R02 or from process correction under R01; the source distinction is mandatory. A comment on a sample can produce a separate change proposal.

**Close-out rules.** A sample approval specifies which exact size, colorway, fabric/lot, release and conditions were evaluated. Approval of one size cannot silently approve all graded sizes. A visual seam correction may require actual POM verification. Physical sample reports can improve fit calibration, but a photo alone does not prove all relevant dimensions were measured.

**User experience.** Show sample timeline with thumbnail, version, POM summary, open issues and courier status. Selecting an out-of-tolerance observation jumps to measuring method and released target. The factory receives a clear list of required retake photos, requested corrections or accepted deviations. The designer can export the sample decision as an immutable review PDF linked to release.

**Acceptance.** Record two hoodie samples of size M and L. First sample fails cuff tolerance; second corrects it after R02 issue. Compare without merging actuals across sizes or releases. Reopen archived Sample 1 and recover original values, photos and reviewer decision even after the main project has progressed.

<!-- PAGE -->

## Page 43 | Quality inspection and corrective action records

**Inspection structure.** `InspectionRecord` references factory, production order, release, date/time, inspector, location, lot/size/colorway, sampling method, measured fields, defect list and disposition. A defect has region/feature anchor, severity under the negotiated product specification, photo, observed value, expected standard, suspected operation/material and proposed corrective action. ISO 2859-1:2026 sampling uses a real lot-by-lot plan and licensed tables, not a hardcoded arbitrary percentage.

**Evidence and independence.** Distinguish factory self-report from external QA result. An approved inspection should not erase original failed measurements. A technician can attach new evidence, note rework and confirm follow-up. Aggregate dashboards show defect counts and inspected quantities with denominators, not invented quality scores. An unresolved critical defect can block shipment acknowledgement under the contract's review policy.

**Corrective action.** A `CAPA` record links problem to possible root cause, containment, owner, due date, test plan, verification and preventive change. Examples include wrong button spacing from a misread technical flat, seam puckering from needle/thread/fabric combination or size inconsistency from a stale DXF. A root cause is a reviewed hypothesis until supported by observed manufacturing evidence.

**Data links.** QC findings attach to specific released POMs, construction steps, fabric lots and work orders. If repeated defects trace to a BOM or cutting file, a technical designer may create a new draft and revision proposal. Changes in the style source must not retroactively alter measured defect history.

**Acceptance.** Enter lot inspection with multiple seam and measurement failures, record rework, then re-inspect with independent evidence. Verify the old outcome remains and the released package stays frozen. Export an audit trail with sampling-plan metadata, all decisions and source hashes; an unauthorized factory cannot edit a brand-owned closed inspection.

<!-- PAGE -->

## Page 44 | Work orders, quantities and stage scheduling

**Work-order model.** `ProductionOrder` includes customer/brand order identity, partner factory, release, required SKUs, size/colorway quantities, planned dates, ship destination and contractual notes. `WorkOrder` partitions material prep, cutting lays, sewing groups, finishing, QC and packing into trackable operations with dependencies. A factory-specific workflow may include outside wash, printing, embroidery or subcontract finishing.

**Schedule logic.** Stage tasks support planned start/finish, actual start/finish, responsible team, blocker and evidence. Dependencies must be explicit: a bulk sewing task depending on approved cut bundles cannot be marked production-complete solely because one sample was approved. Replans store old/new forecast with reason. Show critical path or confidence only when actual durations and dependencies are available; otherwise use simple planned dates.

**Quantities.** Planned, reserved, cut, sewn, passed-QC, rejected/reworked, packed and shipped quantities are distinct. Count transitions from source events rather than mutable uncontrolled totals. Material roll consumption is separate from garment unit count and must carry units. A partial production event references release and lot, avoiding a change that accidentally treats 120 already-cut R01 pieces as R02 inventory.

**Factory/customer UI.** Production status is visible as an order-specific timeline and a summary of blockers. The factory can update its own actuals and attach delivery evidence; the brand can ask follow-up questions and record acceptance. Partner quotes and confidential internal margin must not be part of general production-status payloads.

**Acceptance.** Plan 200 hoodie units, cut 120, sew 90 and pass 80 QC. Reject a shipment status claiming 240 units without documented adjustment. Edit an expected delivery date and retain old forecast/event history. Reprocess the same warehouse webhook three times and assert quantities remain unchanged after the first accepted event.

<!-- PAGE -->

## Page 45 | Material sourcing, factory RFQ and substitutions

**RFQ contract.** `RequestForQuote` references one exact tech-pack release, BOM subset, colorways, production quantity, sample/production requirements, Incoterms context, requested lead date, certification/evidence obligations and approved recipient list. Supplier responses reference their organization and submitted time, detailed material options, MOQ, price basis/currency, capacity, tooling/sample fees and assumptions. Quotes are commercial offers, not automatically approved changes to technical garment specification.

**Proposal workflow.** A factory may suggest an alternate French terry, zipper gauge or leather trim due to sourcing availability. Require supplier article ID and composition, measurable physical properties where relevant, approved appearance reference, prototype need, lead-time/cost change and affected garment versions. A substitute that looks similar cannot silently inherit the mechanical test evidence of the original material.

**Comparison view.** Present supplier quotes side by side with units normalized only when data permit. Show unit price, MOQ, tooling, setup, usable width, physical evidence, claimed availability, effective date, shipping terms and requested exceptions. Missing price or origin data stays blank with a reason. Approved material decision creates a new BOM/production draft or authorized substitute mapping, with signed approval and the factory's acknowledged release.

**Access model.** Quotes for Factory A are not visible to Factory B; brand internal target margin is still private. A supplier may see only its own RFQ and documents. A public product page must never leak source supplier contacts or landed-cost components from underlying style JSON.

**Acceptance.** Send identical quote request to two authorized factories, compare returned offers and accept one alternative into draft. The review flags material physical recalibration, marker width and sample need. Attempt to accept a quote without mandatory article/technical data; release gate requests evidence rather than inserting fabricated values.

<!-- PAGE -->

## Page 46 | Estimated cost, confirmed quotation and landed economics

**Costing boundaries.** Separate `DesignEstimate`, `SupplierQuote`, `ApprovedStandardCost` and `ActualInvoiceCost`. A design estimate derives fabric length from marker or approximation, trim counts from BOM, process time if supplied and any explicit setup/shrinkage/waste assumptions. Existing EXO `buildFabricCostRun` calculates estimated fabric-only material cost; do not silently add zero labor/trim/shipping values or present the result as fully landed cost.

**Data model.** Each cost component stores value, unit basis, currency, effective date, quantity, source, status, related BOM/order entity and confidence. Fabric cost may depend on usable width, marker length and size ratio. Sewing labor can depend on route, operation and factory rate, requiring an actual external quote or internal estimator. Landed costing also accounts for freight, insurance, duties, packaging, sampling and spoilage where applicable. Taxes and incoterm obligations must be parameterized by market, not hardcoded global percentages.

**What-if interactions.** Let authorized owners compare 150 cm vs 170 cm fabric width, different size ratios, changed MOQ, trim suppliers or sample-round counts. Display which data came from approved quotes and which are placeholders. Cost scenario creation must not mutate released BOM or published retail price. The system should calculate impact of changing an approved zipper to an alternate SKU with a transparent assumption list.

**Confidentiality.** Factory-visible cost fields are grant-specific; one partner's proposal cannot reveal another's negotiated rate. Internal target margin and pricing strategy remain separate from the production package. A factory may quote a different rate but cannot override brand standard cost without authorized acceptance and audit.

**Acceptance.** Compute fabric-only estimate from a known marker fixture and verify unit/currency conversion. Add trim, labor and shipping components to a cost scenario; confirm “estimated” status is preserved. Remove a fabric quote and verify total becomes incomplete, not artificially lower. Cross-partner API checks prevent quote leakage, including exported spreadsheets and notification payloads.

<!-- PAGE -->

## Page 47 | Marker, cut plan and production quantity handoff

**Binding references.** A factory cut plan references released pattern source, verified DXF/RUL export, fabric SKU and usable width, ordered sizes/colorways, piece cut counts and approved marker profile. Each marker artifact records every placed/unplaced piece, grain/nap restrictions, rotation flags, fabric print repeat, lay count, order ratio and material-consumption estimate. It must not inherit a render-stage color shader as the production fabric identity.

**Cut planning.** Support an order cut matrix by size and colorway, fabric lay groups, marker-to-order allocation and cutter proof. Factory may upload actual marker results from its existing CAD/cutter; EXO checks that size labels, piece inventory, reference units and patterns match the approved release. If source changes after cutting begins, track which cut lots are from which release rather than applying the new geometry retrospectively.

**Validation.** Before supplying a cut file, independently verify contour closure, orientation, allowance geometry, notches, drills, mirrored pieces and cutter layer mapping. A structurally valid DXF is not proof an actual plotter or cutter accepted it. Destination validation should record software/hardware versions and measured proof sheet dimensions. A missing notch or incorrect cut width becomes a blocking issue and an export profile repair task.

**Factory workflow.** Manufacturer acknowledges cut package version and may report that the imported marker needs a layer map or unit fix. An authorized technical owner creates a new destination-specific export revision, with hash and explicit loss diagnostics. Historical package remains untouched, and the order references the exact file used. Report marker yield, unplaced pieces and operator modifications separately from system estimates.

**Acceptance.** Simulate cutting 120 size-mixed hoodies under R01 and issuing R02 with a different hood notch. The dashboard must distinguish already cut R01 panels from revised R02 uncut quantities, flag their incompatibility and prevent a silent mixed production file. A target cutter import with wrong unit scale must fail numerical verification.

<!-- PAGE -->

## Page 48 | Factory package formats and round-trip receipts

**Export bundle.** Include `manifest.json`, technical-spec PDF/HTML, POM CSV, BOM with permitted commercial data, construction sheets, approved reference images, graded pattern DXFs, RUL/grade metadata if compatible, marker outputs, trims and sample/QC criteria. Every component is stamped with style, release ID and file hash. Generate exports from one immutable release snapshot, not whichever garment happens to be loaded on the desktop during asynchronous bundling.

**Interchange adapters.** Define versioned profiles for generic ASTM/AAMA, target apparel CAD, cutter/plotter, SVG/PDF and 3D presentation formats. Fields absent in the target format require a loss report. A GLB cannot be treated as a production pattern; a DXF cannot carry the complete sewn garment graph. A factory may receive both native-authoring JSON and industry-standard cut data only if entitled and technically relevant.

**Receipts and proof.** Factory acknowledges the exact bundle digest, records imported destination, destination version and optional proof screenshot or measured plot dimensions. The backend stores `ExportVerification` under the release, with pass/fail and which checks actually ran. A “downloaded” event does not mean the recipient opened or successfully interpreted all pattern layers. A “reimport passed” report does not imply a sewn sample fit was tested.

**Failure handling.** Background export jobs are idempotent; timeout/cancel should not leave partially published ZIPs. If a file fails checksum or required format conversion, mark the package `FAILED` and retain diagnostics. Changing one export profile creates a new export artifact associated with the same released source if approved; it never rewrites the original signed file.

**Acceptance.** Export an R02 hoodie and independently reimport DXF in a separate parser, compare piece counts/notch positions and print a reference scale square. Reproduce package hashes after repeated download. Remove a mandatory file during assembly and verify no incomplete “approved” ZIP reaches a partner; retry successfully without duplicating release.

<!-- PAGE -->

## Page 49 | Mobile, offline access and factory notifications

**Responsive portal.** On a phone, prioritize approved release, POM charts, construction steps, sample entry and assigned questions. POM viewer presents one selected size at a time with sticky measurement name, target, tolerance and actual. Technical flats and 3D previews have pan/zoom but can also be navigated as accessible object lists. File download is explicit and announces whether it is a static snapshot.

**Offline operations.** Allow granted users to download immutable, watermarked release PDF/ZIP for offline work. If storing web data offline, define encryption/storage policy, expiry and what can be revoked at the next connection; already downloaded static material cannot be retroactively erased. Local comment or measurement drafts show `PENDING_SYNC`, and server rechecks actor, release and expected revision before final acceptance. Conflicts are visible; they are not silently merged into new approved values.

**Notification design.** Issue context-aware alerts for factory questions, sample uploads, assigned decisions, release acknowledgements, production stage delays and revoked permissions. External notification previews avoid confidential measurements, suppliers or artwork when a recipient could see them outside an authenticated session. Email and in-app events reference scoped IDs; opening them still performs authorization. Digest preferences and mute controls prevent excessive alerts.

**Data consistency.** Every reported update has actor, created time, received time, associated release, idempotency key and status. Slow-network retries must not duplicate sample photos or count order units twice. If a user loses membership while uploading, the finalize step denies publication. Present timezone-correct factory deadlines with stored source timezone instead of guessing from the designer's laptop.

**Acceptance.** Test a 360 px browser entering actual sleeve length and attaching a photo during intermittent connection. It must retain draft without claiming successful submission until server confirms. Expire the invite, reconnect and reject the queued comment with a clear recovery message. Verify screen-reader navigation and no unauthorized data in push payload.

<!-- PAGE -->

## Page 50 | Factory pilot release tests and operational drills

**Pilot scope.** Use one approved hoodie style, two frozen releases, sizes S–XL, a true POM table, construction/trim BOM, at least one verified export profile and two isolated factory organizations. One manufacturer handles a sample fit problem and a proposed cuff change. The other works a separate order with distinct pricing and file access. Include a technical designer and a patternmaker in the brand approval path.

**Required journey.** Issue R01 from validated source G01, invite Factory A with limited permissions and obtain acknowledgement. Factory uploads Sample 1 photo and out-of-tolerance cuff measurement; a contextual issue is assigned to the designer. Factory proposes a revised cuff spec; designer accepts into Draft G02, updates geometry if supported, walks seams, checks grade and DXF, then obtains required approvals and issues R02. Factory acknowledges R02 and reports partial cutting against the correct release.

**Failure drills.** Race two reviewers modifying a POM, retry a network mutation, corrupt a source file, expire an attachment URL, revoke Factory A mid-session, attempt cross-tenant access from Factory B, change native geometry after a rendered proof was approved and restart backend during package creation. The workflow must preserve source and issued releases, reject stale edits, recover event sequences and clearly mark incomplete operations.

**Independent verification.** Compare web POM/BOM, PDF/ZIP and source export values by field hash and size. A factory pattern operator evaluates whether actual cutter import preserves units, grade and notches. An apparel technical reviewer confirms sample instructions make sense. Security tests assert that guessable IDs, nested media, search, events and notifications expose no partner data across organizations.

**Exit decision.** Pilot passes only if a full manufacturing revision is reconstructable and the factory can operate without developer intervention. Record failed requirements in a priority backlog with owner and evidence. Cosmetic screenshots, API response codes and a generated PDF alone are insufficient. Advance to more factories, pricing and deeper production tracking only after those invariants hold.

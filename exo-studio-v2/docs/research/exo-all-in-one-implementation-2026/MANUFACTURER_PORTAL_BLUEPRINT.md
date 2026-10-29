# EXO ClothCraft V2 — Living Tech Pack and Manufacturer Portal Engineering Blueprint

**Version:** research proposal v1, October 17, 2026  
**Status:** design specification; proposed architecture and APIs, not a claim of deployed EXO features.  
**Primary users:** brand owner, technical designer, sourcing manager, sample room, factory merchandiser, production manager, QC inspector, and external material supplier.  
**North star:** one version-controlled, bidirectional product-to-factory record from design intent through a physical inspected lot.

## 1. Context and defensible opportunity

Traditional tech-pack exchange often involves files, measurements, annotations, supplier messages, revised samples, separate quote spreadsheets, and physical approvals. Yet it would be inaccurate to call digital tech packs or supplier portals an empty market. CLO-SET officially documents web tech packs, BOM, points of measure (POM), costs and content version workflows; Techpacker documents saving manufacturer-shareable versions; WFX markets sample requests, annotated feedback and approvals. EXO must therefore demonstrate *better decision continuity*, more precise links to editable CAD geometry, reliable manufacturer acknowledgements, and cheaper adoption for small brands instead of advertising commonplace features as inventions.

Sources: [CLO-SET 3D Tech pack](https://support.clo-set.com/hc/en-us/articles/45303161788057-3D-Tech-pack), [CLO-SET Web Tech Pack](https://support.clo-set.com/hc/en-us/articles/45303168383385-Web-Tech-Pack-WTP), [Techpacker manufacturer sharing](https://helpcenter.techpacker.com/hc/en-us/articles/360022720553-How-to-share-a-Tech-pack-with-Manufacturers), [WFX sample management](https://www.worldfashionexchange.com/fashion-plm-software/sample-management-software). The local research baseline is `docs/research/apparel-production-deep-dive-2026/manufacturing-plm-evidence.md`. Feature proposals below are engineering inferences, not claims independently verified in the market.

The center of this design is a **FactoryRelease**: a stable manifest pointing to immutable versions of pattern, construction, grade rules, POM, materials, artwork, packaging, and technical drawings. Manufacturers comment on that particular release, submit structured proposed changes and quotations, measure samples against it, and acknowledge it. An author accepts or rejects each change. Actual purchases and shop-floor progress refer to the acknowledged release, even if design development continues concurrently. Every document, comment, photo, QR code, PDF and event includes enough provenance to reconstruct what each person knew when they acted.

## 2. Product boundaries and user experience

The website comprises three coordinated views. **Brand workspace** provides seasonal style list, 2D/3D garment view, current working draft, revision comparison, tech pack builder, costing, supplier invitations, approval queue, and manufacturing calendar. **Manufacturer workspace** provides only explicitly assigned styles and line items, a simple release reader, question threads, actionable proposal forms, sample submission, material acknowledgement, due dates, production updates and photo evidence. **Quality workspace** provides lot and carton lookup, approved technical reference, size measurement grid, defect observations, pass/fail workflows and corrective action. Mobile narrow-screen layouts, searchable language-independent codes, local dates in factory timezone, easy photo uploads and downloadable PDF are required from the first pilot.

Primary navigation for a manufacturer: **Assigned orders → Release packet → Questions / Change proposals → Samples → Production milestones → Inspection / Shipments**. A release packet opens with a concise visual front/back garment, colorway, unit, factory, delivery target, status and bright revision ID; then expandable sections for POM, construction, technical BOM, artwork, fabric and trim, graded pieces, packaging, and outstanding requests. Each line has an anchored comment control and a copy-reference action. Changing a language preference changes presentation strings while preserving authoritative source terms, part numbers, measurement values, and units.

The dashboard surfaces four distinct types of information: **assigned obligation** (e.g. acknowledge release by Oct 22), **manufacturer-reported fact** (sample sent with tracking), **brand-confirmed fact** (sample received and inspected), and **forecast** (completion expected Nov 8). These must have distinct fields and visual labels. Do not present a factory's percentage estimate as independently verified progress. Audit the ability to complete a task on a low-powered phone over constrained bandwidth. The PDF remains a durable alternate delivery format and must be independently intelligible.

## 3. Ownership, tenant isolation and supplier authorization

Use a relational database supporting row-level tenant checks, object storage for signed assets, and an append-only event journal. A **tenant** is the brand or independent organization that controls an account; a supplier is also an organization with its own tenant. A **collaboration grant** creates a narrow scoped relationship between them for particular projects, styles, factory releases or purchase orders. The same factory may work with ten brands; its users must not see cross-brand measurements, quotes, other supplier identities, private costs or attachments.

Permission decisions are the intersection of: authenticated principal, active organization, membership role, collaboration grant, resource tenant and scope, allowed action, release lifecycle state, and optionally field-level classification. Never infer permission from an object UUID alone. Frontend hiding is usability only; enforce authorization on every API query, event subscription, signed-download request and background export job. Store all IDs as unguessable identifiers, but treat unpredictability as an additional layer rather than access control.

Suggested roles: brand_owner (manage users, supplier assignments, final signoff), technical_designer (draft content and propose releases), production_manager (milestones and PO assignments), finance_buyer (commercial terms and RFQs), factory_admin (manage own members and accepted factory assignments), factory_merchandiser (questions, sample and production data), factory_qc (assigned inspection records), material_vendor (invited RFQ lines only), and read_only_auditor (redacted evidence). Capabilities are attached to role grants, not hard-coded as labels. A supplier may propose a BOM substitution but cannot approve its own proposal for brand production. Brand designers cannot impersonate manufacturers' acknowledgements.

Grant object: `{id, granting_tenant_id, receiving_tenant_id, scope_type, scope_id, capabilities[], valid_from, expires_at, approved_by, revoked_at, field_visibility_profile_id}`. Default deny. Invitations use single-use expiring tokens with email verification and optional enterprise SSO; accepting an invitation never adds access to every item in an existing style collection. User separation must hold after changing active organization, revocation, deactivation, export creation and websocket reconnect.

Apply PostgreSQL row-level security or equivalent mandatory tenant predicates on every tenant-bearing table. Execute request work under explicit `tenant_context` and verify signed tenant claims server-side; disallow app SQL roles that bypass RLS in web requests. Distinguish system support access with short-lived just-in-time approval and immutable access evidence. Encrypt database backups and object storage at rest, use TLS in transit, constrain personally identifying data to essential contacts, and establish configurable retention/deletion rules. Manufacturer uploads should be malware-scanned and type-checked before becoming downloadable.

## 4. Immutable releases and lifecycle contracts

Working design drafts are mutable with optimistic concurrency. A release is immutable after publication, including its resolved child record versions and snapshot digests. Editing an approved POM makes a new `pom_revision` and an explicit `factory_release_candidate`; it never overwrites a factory's acknowledged production packet. Model release relationships as `supersedes_release_id`, `derived_from_draft_revision_id`, and `affected_order_ids`. Every attached asset is content-addressed or hash-verified so a URL swap cannot quietly change the evidence behind a prior signature.

Lifecycle: `draft → validation_pending → internal_review → offered_to_factory → factory_acknowledged → production_authorized → superseded`. Separate alternative terminal states `withdrawn` and `rejected`. A factory cannot acknowledge if its required acceptance checklist is incomplete, and production cannot authorize if blocking critical fit issues, unknown materials or unresolved safety exceptions remain. Role-configurable approval routing is allowed, but required signoffs are compiled into a release-specific rule snapshot so policy edits do not retroactively lower an already pending approval threshold.

Recommended release JSON example:

```json
{
  "release_id": "fr_01JG7",
  "tenant_id": "brand_842",
  "style_id": "sty_hoodie_24",
  "revision_label": "R04",
  "state": "offered_to_factory",
  "schema_version": 2,
  "source": {"garment_revision_id": "gr_04", "pattern_revision_id": "pat_09"},
  "pins": {
    "pom_revision_id": "pom_12",
    "grade_revision_id": "grade_03",
    "bom_variant_revision_ids": ["bom_green_m_07", "bom_black_m_08"],
    "construction_revision_id": "sew_05",
    "artwork_revision_id": "art_02",
    "packaging_revision_id": "pack_02"
  },
  "content_sha256": "sha256:<64-hex-digit-value>",
  "created_at": "2026-10-17T11:00:00Z",
  "supersedes_release_id": "fr_01JF3",
  "approvals": []
}
```

The illustrative hash token is a placeholder and must be replaced by a computed digest. Canonicalize serialized payloads before hashing, fixing schema, ordering, decimal representation, timezone and units. Choose a documented canonical JSON scheme; hash manifests and referenced objects separately. When an asset is unavailable, mark the release incomplete instead of generating a blank-looking success export.

## 5. Anchored contextual comments and decision graph

A comment is attached to a stable **anchor** within a pinned revision, not merely to a screen coordinate. Supported anchor kinds: `pattern_piece` with piece ID and normalized 2D contour arclength; `seam` with seam identifier and fractional location; `pom` with measurement ID and size; `bom_line`; `construction_operation`; `artwork_placement`; `sample_photo` with pixel-normalized polygon; `render_surface` with mesh triangle ID and barycentric location; and `release_section`. Store `anchor_schema_version` and the parent revision ID on every anchor.

If the pattern is redrawn, automated anchor migration is a **suggestion** with confidence and original visible alongside candidate. For instance, splitting a side seam can invalidate numeric contour distance; the original comment still opens an archived R03 view, while a new R04 anchor awaits human remapping. Never silently reattach a factory's caution to a different feature. Display archived anchors in the historical release even when live geometry is deleted.

Thread schema:

```json
{
  "thread_id": "th_118",
  "tenant_id": "brand_842",
  "collaboration_grant_id": "grant_14",
  "release_id": "fr_01JG7",
  "anchor": {"kind": "pom", "revision_id": "pom_12", "pom_id": "POM-CHEST", "size_code": "M"},
  "state": "open",
  "severity": "production_blocker",
  "visibility": "shared_with_assigned_factory",
  "posts": [{"post_id": "p_77", "actor_id": "factory_u9",
             "body": "Is this measured flat after wash?",
             "created_at": "2026-10-18T05:17:00Z"}],
  "resolved_by_decision_id": null
}
```

Replies inherit release scope. Thread followers get relevant notifications, but a notification cannot include restricted cost fields to a nonbuyer or reveal identities of competing factories. Each thread has state `open / awaiting_brand / awaiting_factory / resolved / archived`, optional due date, severity, assignee and resolution reference. Reopening a resolved issue requires a reason and event, preserving earlier disposition. A comment is never itself formal approval; explicit decision records carry signature meaning.

## 6. Manufacturer proposals, comparison and acceptance

The **ChangeProposal** is a structured container linking one or more patch operations, supporting evidence, impact estimate, source release and desired deadline. Supported types: material alternative, supplier-specific trim, pattern geometry correction, measurement/tolerance request, sewing operation change, artwork placement, packaging difference, schedule exception and commercial quote update. A proposal includes the current exact value and unit, proposed value and unit, affected variants/sizes, supplier rationale, photographs or test certificates, cost impact, lead time impact, reliability level and requested approver.

A submitted proposal is immutable; any edit produces a new proposal revision linked to the original. Decision states are `submitted → triaged → needs_information → approved / rejected / withdrawn`, with `partially_approved` handled at proposal-line granularity. Approving means writing an authorized decision and generating a **candidate technical revision**, never automatically changing an existing factory release, PO or payment. An accepted change is implemented in a new draft and validated against dependencies. A second signoff publishes the next release. The UI must distinguish **approved in principle**, **implemented in revision**, **released to factory**, and **acknowledged by factory**.

Diff engine compares normalized geometry, typed POM values and tolerances, construction operations, BOM rows, approved supplier list, artwork, packing and effective shipping instructions. Show changes by consequence: `POM chest +10 mm`, `seam operation 302 → 504`, `fabric 1.82 → 1.88 usable m at size M`, `zip supplier A → B pending pull test`. Preserve uncertainty: a geometrically calculated consumption increase is an estimate until nesting and marker constraints are validated. Numeric comparisons use physical units and controlled rounding, while visual redlining renders two pinned revisions in a synchronized side-by-side inspector.

Decision API requires `If-Match` or `base_revision_id` for stale submissions; on conflict return HTTP 409 and a machine-readable divergence payload. Approval endpoint requires an explicit explanation when rejecting or overriding policy; signatures bind exact proposal revision, impact digest, approver identity and server timestamp. Rejecting does not delete proposal photos or factory questions. A withdrawn supplier proposal can be resubmitted as a new revision with a clear lineage.

## 7. Samples, fit and POM evidence

Track proto, fit, size-set, preproduction (PP), top-of-production (TOP), wash/lab and optional custom rounds. Define `SampleRequest`, `SampleItem`, `Shipment`, `SampleEvaluation`, `PomObservation`, `FitDecision` and `GoldenSampleCustody`. Sample request pins a release, size, colorway, material lot, quantity, factory and planned handoff dates. A factory reports cut/sewn/despatched facts with timestamps and tracking; the brand independently marks received and evaluated. Both visible states retain provenance.

For POM, `PomSpec` stores stable code, description, image or construction landmark, method, measurement condition, unit, target by size, permitted negative/positive tolerances, evidence source and approval state. `PomObservation` stores sample ID, actual measured value, calibrated instrument where relevant, observer, measured_at, condition and photo. Never substitute a 3D simulated dimension for a tape-measured physical sample. Define deviation as actual minus approved target in canonical millimeters; acceptance checks compare against asymmetric tolerances. Capture shrinkage separately by test method and pre/post wash stage.

Example: hoodie R04 has medium chest width target 610 mm, tolerance −5/+7 mm. A sample observation of 622 mm yields +12 mm and fails by 5 mm above upper bound. The interface must show sample photo, datum points, person who measured, and whether the garment was measured after conditioning. The factory may dispute the measuring position by commenting on this exact POM revision; an authorized technical designer then confirms method, revises target, or requests a new sample. Every outcome maps to a decision. No generative assistant may quietly change the recorded measurement to fit a target.

Sampling gates can be configurable, but initial defaults are **proto fit accepted**, **construction accepted**, **materials/colors accepted**, **PP production authorization**, **TOP confirmation**. Track independent categories (fit, material, artwork, trims, labels, packing) because a garment can pass fit while failing zipper pull strength or shade. Rejecting a sample creates concrete corrective actions with owner, due date, retest evidence and closure approval. Before bulk authorization, require closure or formally documented exceptions to all critical comments. Integrate carrier tracking as informational data, never as proof that a physical sample passed inspection.

## 8. Technical BOM, sourcing RFQ and total landed costing

Separate engineering BOM (composition and placement), procurement BOM (orderable SKU quantities, vendor and pack rules), and manufacturing routing (cut, embellish, sew, wash, finish, inspect, pack operations). Model variants by style revision, colorway, size, supplier/factory, destination market and any fit personalization. Each row needs stable component ID, approved specification revision, supplier SKU, unit-of-measure basis, planned consumption, percent waste, cost/currency, MOQ, lead time and tested alternates. Never coerce meters to yards or percentages to decimal fractions without explicit converters and recorded precision.

An **RFQ** pins target release/candidate, size/color mix, quantities, Incoterm named place, desired ship/delivery dates, destination, quality criteria, payment terms, lab test requirements, target packaging, artwork and attachment set. Quote response captures per-component pricing, setup fee, CMT/full-package price, MOQ, surcharges, expiry, capacity assumptions, lead times, excluded services, and landed transport or duty estimates as separately attributable lines. Reject or flag a quote as noncomparable when one factory omits required embroidery or different shipping basis. A supplier's quote is commercially confidential and must never appear to other suppliers.

Cost snapshot formula for each SKU: `material_consumption × usable unit price + trims + conversion + embellishment + allocated setup and testing + packing + rejects/waste + freight + duties/taxes when applicable + fees`. Preserve component- and order-level allocation assumptions, MOQ impact and exchange rate effective date. Distinguish factory quoted FOB from EXW, gross landed cash requirement and forecast selling gross margin; labeling every output simply “cost” makes comparisons unsafe. Duty estimates require applicable market, classification, origin and dated rate with manually approved assumptions. A proposed fabric substitution can recompute estimated cost and yield impact, but cannot automatically modify a submitted RFQ or purchase order.

Relevant benchmarks: [Techpacker multiple BOMs](https://techpacker.com/blog/design/multiple-boms-tech-pack/), [Centric fashion PLM](https://www.centricsoftware.com/fashion-apparel), [WFX apparel PLM](https://www.worldfashionexchange.com/en-us/apparel-plm-software), [ApparelMagic production](https://apparelmagic.com/plm-software/manufacturing-production/). These are vendor claims/documentation and warrant live product checks before parity commitments.

## 9. Factory milestones, production execution and QC

An accepted purchase/work order defines units by SKU, approved release, BOM variant, supplier, cut factory, target dates, packing and delivery. Proposed default milestones: factory release acknowledged; materials confirmed; material receipt and inspection; preproduction sample approved; cut started/completed; sewing started/completed; decoration and washing; finishing; packing; final inspection; ex-factory; goods received. Each milestone stores scheduled date, supplier-proposed forecast, authoritative actual time, units completed/rejected, source and proof. On-time classification uses contract-specific business calendars and timezones. An overdue forecast prompts discussion; it does not imply a confirmed physical delay until evidence arrives.

Work order IDs, bundle/roll IDs and lot mapping support traceable events. Factories can enter progress manually initially; optional QR/barcode and ERP/MES integration follow after validation. Offline edits carry device ID, local observed time and server receipt time, with conflict resolution on reconnection. Factory edits never overwrite brand-confirmed QC or payments. Production order version upgrades require explicit owner review because moving an active cut order to a changed pattern could invalidate existing bundles.

Inspection records pin release, sample plan revision, lot ID, inspector and defect taxonomy. Capture critical, major and minor defects, measurements against applicable POM, coded garment location, photos, affected color/size and quantity, decision and containment/CAPA action. **Acceptance Quality Limit is not a percent of garments to inspect.** The relevant published benchmark is [ISO 2859-1:2026](https://www.iso.org/standard/2859-1), which specifies acceptance sampling procedures; correct tables and commercial inspection protocol must be licensed/configured by qualified QA owners. App must not infer acceptance solely from a generic “AQL 2.5” checkbox.

Failed QC holds the lot and creates corrective action with root-cause category, evidence, accountable party, proposed rework/replace quantity, due date and independent retest. Brand release of held inventory requires explicit disposition signature. Trace defect to sewing operation, pattern or trim lot where supported, and write a design feedback issue for future revision; previous physical batches retain their original reference release. Inspection exports include signature, sampling basis, timestamps and immutable evidence IDs.

## 10. API layout, concurrency and webhooks

Use REST for command/query resources, a versioned event stream for updates, and object-storage signed uploads for large assets. Names below are proposed interface contracts. OAuth/OIDC login establishes identity; API bearer tokens carry scoped audience and organization, with server authorization fetching current grants. Default JSON uses ISO 8601 UTC timestamps, canonical unit codes and stable IDs. All state-changing requests require an idempotency key; mutable draft edits also require `If-Match` ETags.

| Method | Endpoint | Role and effect |
| --- | --- | --- |
| `GET` | `/v1/styles/{styleId}/releases?state=...` | Authorized release summaries, pagination and scoped fields |
| `POST` | `/v1/styles/{styleId}/release-candidates` | Brand technical editor freezes draft references for validation |
| `POST` | `/v1/release-candidates/{id}/publish` | Brand approver publishes immutable release after gates |
| `POST` | `/v1/releases/{id}/acknowledgements` | Assigned factory signs exact pinned manifest |
| `GET` | `/v1/releases/{id}/diff?against={otherId}` | Authorized structured and visual change summary |
| `POST` | `/v1/threads` | Scoped annotated question pinned to revision/anchor |
| `POST` | `/v1/change-proposals` | Supplier proposes structured patch/evidence |
| `POST` | `/v1/change-proposals/{id}/decisions` | Brand signs line-level accept/reject disposition |
| `POST` | `/v1/sample-requests` | Brand creates request against release |
| `POST` | `/v1/samples/{id}/measurements` | Authorized measurer records POM observations |
| `POST` | `/v1/rfqs` | Brand buyer invites restricted suppliers |
| `POST` | `/v1/rfqs/{id}/quotes` | Invited vendor submits structured commercial quote |
| `POST` | `/v1/orders/{id}/milestone-events` | Assigned factory reports actual/forecast progress |
| `POST` | `/v1/lots/{id}/inspections` | Authorized QC inspector attaches evidence and decision |
| `POST` | `/v1/assets/uploads` | Issue content-type-, size-, scope-limited upload URL |
| `POST` | `/v1/releases/{id}/exports` | Queue reproducible PDF/XLSX package generation |

Responses use `{data, meta:{request_id, schema_version, next_cursor}}`; errors use RFC 9457 problem details with stable `type`, `status`, `detail`, `instance` and optional machine-safe field errors. The queue may return 202 with status job URL; clients poll or receive a server-sent event rather than assuming immediate completion. File and PDF export requests are idempotent on release digest and requested language/template version.

Proposed event envelope:

```json
{
  "event_id": "evt_01JH",
  "event_type": "proposal.line.approved",
  "event_schema_version": 1,
  "tenant_id": "brand_842",
  "aggregate_type": "change_proposal",
  "aggregate_id": "cp_012",
  "aggregate_version": 5,
  "release_id": "fr_01JG7",
  "actor": {"principal_id": "user_7", "org_id": "brand_842"},
  "occurred_at": "2026-10-19T16:04:13Z",
  "recorded_at": "2026-10-19T16:04:14Z",
  "correlation_id": "corr_711",
  "causation_id": "cmd_402",
  "idempotency_key": "idem_402",
  "payload": {"proposal_revision_id": "cpr_02", "line_id": "ln_01", "decision_id": "dec_31"}
}
```

The journal writes in the same database transaction as the domain mutation via transactional outbox. A background relay publishes to subscribers at least once; consumers deduplicate `event_id` and check `aggregate_version` for ordering. Never rely on global ordering between unrelated aggregate IDs. Webhook destinations must have per-tenant allowlists, HMAC signatures including timestamp, replay window, exponential backoff, dead-letter monitoring and no secret values in webhook payloads. A read model or dashboard can be rebuilt from immutable events plus versioned snapshots; the live operational database remains authoritative for the current approval rules.

## 11. Asset security, PDFs and offline factory access

Upload begins with an authorization decision against the exact release/sample/inspection scope. Issue a short-lived signed PUT URL restricted by content type, size, key prefix and checksum; uploaded objects go to quarantine pending scanning, metadata extraction and policy review. Download URLs have short expiry and are minted only after a fresh authorization check; disable public bucket ACLs and never embed permanent raw object links in messages. Grant revocation blocks new download token creation and should invalidate CDN sessions where supported; already downloaded PDF cannot be revoked, so add clear confidentiality markings and per-recipient watermarks where appropriate.

Generate a factory-friendly PDF deterministically from pinned release snapshot and export template version. Include title page with style, factory, colorway, release ID, date, source digest, approval and supersession status; illustrated flats and construction callouts; readable POM diagrams with sizes/units/tolerances; BOM and approved supplier alternatives; pattern piece inventory; artwork locations/scales; seam/stitch specifications; label and packing requirements; QC reference; contact and discrepancy escalation path. Repeat revision and section/page number in running footers. Use vector graphics where possible; embed fonts with redistribution rights; permit A4 and US Letter print choices with measured scale bars and explicit “not full scale” markings on illustrative pattern sheets.

Exports include a **manifest JSON** listing file hashes and an XLSX option for factory teams who need tabular measurements. PDF generation must freeze the database snapshot before rendering; if a newer release appears mid-job, the export still depicts the requested ID exactly. QR links resolve to a permission-checked release landing page with a public minimal “release superseded” indication only where contract permits. Keep local encrypted draft uploads for unreliable networks and show an explicit sync conflict review when a factory reconnects. Do not claim an offline comment has been approved until the server acknowledges it.

## 12. Three realistic end-to-end journeys

### Journey A: small brand revises a hoodie chest measurement

A technical designer completes a washed-black zip hoodie draft in EXO and requests factory release R03. Validation catches one POM lacking a documented measuring diagram; the designer supplies the diagram, reviews sizes, and publishes R03. A manufacturer gets a scoped invitation, opens its mobile portal, confirms the fabric and sewing operations, then taps the medium chest POM and asks whether flat measurement occurs after wash. That question is pinned to R03/POM-CHEST/M, not a generic email. The designer clarifies measuring conditions, producing revised method text in candidate R04. The side-by-side comparison shows exactly the changed method, unaffected dimensions and no cost delta. A brand approver signs the change; R04 is released and factory-acknowledged. R03 remains available for the earlier sample, and the new bulk order pins R04. Acceptance test: no ambiguity about which packet governs which garment and no measurement data lost in supersession.

### Journey B: factory proposes substitution during sampling

The assigned supplier cannot obtain the specified zipper at the quoted MOQ and proposes equivalent hardware with a supplier certificate, pull-test data, unit quote and ten-day lead-time improvement. The portal opens a change proposal attached to the technical BOM line and R04; compare view shows manufacturer, hardware finish, dimensions, cost and dependency on wash testing. A sourcing manager approves commercial evaluation, while technical design rejects final material approval until a physical sample passes. The supplier submits sample tracking and pictures; quality staff records wear and pull testing under the sample ID. After acceptable result, a new approved BOM line is incorporated into candidate R05 and its alternate source is noted. A buyer explicitly accepts quote revision and issues a PO against R05. Neither the old R04 approved BOM nor the first factory price is rewritten. The second supplier working on another colorway does not see the first one's pricing or attachments.

### Journey C: production defect and controlled release recovery

A factory reports 400 units cut against R05, 260 sewn, 140 pending, all with timestamps marked “manufacturer reported.” A brand QC partner inspects an assigned finished lot and identifies collar twisting in several units. The inspector records defect code, color and size, photos and measurements; QC disposition holds the affected lot. The factory proposes a revised seam handling operation and begins root-cause review, with issue linked to seam ID and operation revision. A technical designer reviews the evidence and issues R06 candidate for **future uncut production only**. Remaining R05 bundles are held or processed under an explicitly signed deviation decision. The factory acknowledges R06, reports retraining and rework, and QC retests the held lot before any shipment authorization. The dashboard shows separated confirmed quantities, reported forecast and held units. Audit exports show who released which lot and why, even after the production plan changes.

## 13. Measurable verification and go/no-go criteria

### Functional contracts

1. **Release immutability:** after acknowledgment, attempt to mutate all pinned records, attached file hashes and rules. Every attempt fails or creates an explicit successor; R03 export digest remains unchanged after R04 publication.
2. **Context anchors:** issue 100 comments distributed across pattern, POM, BOM, stitch, artwork, photo and 3D triangle anchors. All open against original revision; geometry mutations cannot silently relocate them; a failed migration visibly requests human repair.
3. **Decision completeness:** supplier submits, changes, withdraws and resubmits a proposal; audit has all versions. Reject/partial approval records explicit line rationale; no proposal signature mutates a purchase order.
4. **POM arithmetic:** positive and negative asymmetric tolerances, inches/mm conversion, pre/post wash methods, missing target and sample outliers yield deterministic correct disposition. Test 610 mm target with −5/+7 tolerance: 617 passes; 618 fails; 622 fails by 5 mm above bound.
5. **BOM consistency:** every offered size/color/factory has resolved components, quantity bases, approved alternates and sourcing status. Substitution creates expected BOM cost and lead-time deltas without changing unrelated variants.
6. **Quotes and comparability:** RFQ with 100 and 200 MOQ options, differing FOB/EXW exclusions and two currencies flags mismatch; estimates preserve FX source date, wastage and freight assumptions.
7. **Milestones and QC:** offline duplicate event sync records one logical inspection; delayed and out-of-order shop-floor events resolve deterministically with original timestamps preserved; a failed lot cannot ship without signed disposition.
8. **Export repeatability:** identical release, template, locale and export flags produce identical semantic content; every page carries release identifier. PDF dimensions, labels, units, reading order and large tables pass human print validation.

### Isolation and security tests

Create tenants Brand A and Brand B, Factory X serving both, Factory Y serving only B, plus material vendor V. Exercise every REST list/get/update/download/search, websocket subscription, export status callback, background job, invited link and webhook. Factory X must see only its explicit assignments; Factory Y and V must never infer Brand A's style, supplier, price, photos or user contact. Revoked users receive 403 on new accesses, including already issued short-lived asset requests after expiry. Attempt IDOR, forged org header, tenant switching, stale grant, guessed object key, reused invitation, manipulated signed URL, PDF export with foreign attachment IDs, and cross-tenant full-text search. Target **zero unauthorized data disclosures** in automated integration and independent penetration review. Retain documented threat model and remediations before any external pilot.

### Performance, quality and accessibility targets

Under pilot load of 25 brands, 100 factories, 2,000 styles, 10,000 pinned releases and 1 million audit events, aim for p95 under 500 ms for scoped list/read APIs, p95 under 1.5 seconds for a revision diff excluding heavy 3D rendering, and under 30 seconds for a 30-page PDF export on normal queue capacity. Targets require actual benchmark measurements and documented dataset, not optimistic release marketing. The primary manufacturer release page should work at 360 px viewport width, keyboard-only, zoom to 200%, low memory and simulated 3G; meet WCAG 2.2 AA through tested semantics and contrast. All critical actions display localized, unambiguous errors and allow retry without double-creating records. Observability tracks error budget, p95 per endpoint, queue age, export failures, duplicate event suppression and unacknowledged release aging.

Product validation with three real manufacturer partners should measure median time to clarify a spec question, number of version mismatches, percentage of orders acknowledging release before cut, POM discrepancy resolution time, time from sampling rejection to corrective release, and percentage of samples with documented physical observations. Record before/after process data over comparable orders. A practical pilot gate is 100% orders linked to immutable release IDs, 100% approved substitutions attached to explicit decisions, zero unresolved critical fit exceptions at production authorization, and at least 90% of invited suppliers acknowledging releases without staff-assisted onboarding after initial training. Targets are hypotheses until measured.

## 14. Engineering sequence and dependency gates

**Phase 0 — domain workshop and sample documents (2–3 sprints):** obtain three real anonymized tech packs, sample comment loops, quotations and QC records from consenting brands and factories. Map exact approval authority, measuring conventions, current PDF habits, languages and data sensitivity. Write state diagrams, JSON Schema/OpenAPI and an explicit non-goal inventory. Prioritize ingestion of externally supplied PDFs and manually uploaded patterns before requiring native EXO CAD integration.

**Phase 1 — identity, release and comments (3–5 sprints):** implement organizations, collaboration grants, row-level enforcement, immutable release snapshots, document assets, audit outbox, revision comparison and stable thread anchors. Build manufacturer invited view and deterministic release export. Require tenant isolation and immutable export contract tests before sharing beta credentials.

**Phase 2 — samples, proposals and POM (3–4 sprints):** add sample rounds, real physical POM measurements, annotated photographs, structured proposed changes, line decisions, dependency impact previews and gating. Develop release conversion workflow from accepted proposals. Verify the first two user journeys with actual technical designers and a factory partner.

**Phase 3 — RFQs, costs, orders and milestones (3–5 sprints):** create engineering/procurement BOM variants, supplier quotations, comparable landed-cost snapshots, order commitments, actual/forecast distinction, milestones and notifications. Export approved cost sheets only to commercial roles. Make factory phone workflow usable without training-heavy enterprise PLM terminology.

**Phase 4 — quality, integrations and resilience (3–5 sprints):** add lot inspections, configurable sampling protocol references, holds/CAPA, scan event ingestion, mobile offline queue, API webhooks and ERP/PDM connectors. Run end-to-end traceability drills from defect back to release and source material. Stress test document exports, event replay and recovery from revoked supplier grants.

**Phase 5 — pilot and adoption:** trial with one brand and two factories, then expand to three independent organizations. Compare generated tech packs to existing approved packet page by page, check actual POM definitions and physical findings, and measure onboarding friction. Track every data model adjustment with explicit migration and release version; only declare operational readiness after real orders and independent security review.

Engineering seams: a garment editor adapter emits immutable pattern IDs, piece geometry digests and measured dimensions into a versioned design snapshot; PLM service owns release manifests and approvals; sourcing service owns confidential RFQs and quotes; operations service owns order and QC events; document renderer owns deterministic PDFs; notification service emits safe summaries. All commands pass through domain policy checks and transactional outbox. Build these as well-defined modules before distributing microservices, so the initial small team can debug invariants without distributed transaction complexity.

## 15. Architecture decisions still requiring field validation

Critical unresolved questions: whether a factory will regularly log into a browser instead of replying by email or WhatsApp; who is authorized to sign on behalf of a brand's technical designer; whether physical POM measurement conditions can be standardized across garments; whether supplier alternate test evidence meets brand compliance requirements; whether factory ERP actually provides usable lot and cut-room identifiers; and whether a brand will accept a revision being blocked by missing data. Interview actual manufacturing stakeholders before hard-coding these as universal rules.

Additional sources and technical standards for implementation: [OpenAPI Specification](https://spec.openapis.org/oas/latest.html), [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html), [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [ISO 2859-1](https://www.iso.org/standard/2859-1), [Browzwear Tech Pack API](https://help.browzwear.com/en/articles/13066153-create-a-tech-pack), and [CLO-SET BOM documentation](https://support.clo-set.com/hc/en-us/articles/45303192584601-Web-Tech-Pack-BOM).

The architecture is successful when the brand and manufacturer can independently reconstruct one precise answer for any garment lot: **which garment instructions were issued, which changes were proposed, who accepted them, which physical sample and tests supported approval, what the factory reported making, and which quality decision allowed shipment**.

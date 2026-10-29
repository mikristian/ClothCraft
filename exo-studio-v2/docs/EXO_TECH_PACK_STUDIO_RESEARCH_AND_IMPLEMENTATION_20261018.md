# EXO Sample 3D — Conventional and Living Digital Tech Packs

**Implementation research / 18 October 2026.** This specification works alongside the pre-existing `docs/EXO_INTERACTIVE_WEB_TECHPACK_PLANNING_2026-10-16.md` architecture and the actual EXO garment `buildTechPack(project)` exporter. The application remains a local-first prototype: product draft/revision editing is not equivalent to a secure hosted multi-company PLM portal.

## Reference-backed product model

Traditional factory specification packs became a collection of physical or printable working sheets: technical flat drawings showing construction, front/back silhouette and detail callouts; POM tables by size with measurement methods and tolerances; fabric/trim/label BOM with composition and supplier references; stitch/seam and finishing instructions; colorways and print placement; packaging, care labeling, sample/fit comments and dated revision index. Factory data must identify a style, colorway, base size, unit and specific revision on every issue. A spreadsheet containing only a size chart is **not** a complete manufacturing tech pack. Review against actual factory requirements instead of treating exported metadata as production sign-off.

The current reference model follows industry practice described in [Techpacker's 2026 tech pack guide](https://techpacker.com/blog/design/how-to-simplify-generating-and-managing-tech-packs-2/), [Techpacker interactive versioning](https://helpcenter.techpacker.com/hc/en-us/articles/360033521034-How-to-create-a-techpack-version), [Backbone sample feedback and revisions](https://intercom.help/backbone-help-center/en/articles/5803263-product-feedback-revisions), and [CLO BOM/XML export](https://support.clo3d.com/hc/en-us/articles/115000525207-BOM-XML-Export). CLO's exported BOM/XML and image sets are useful source records, **not** by themselves a completed approval chain.

## Two representations; one factual garment source

**Printable / traditional tech pack:** stable document header, technical flat when actually provided, live project POM graded size grid and tolerance, BOM, fabric/colorways, technical construction, trims, labels, packaging, sample feedback and revision ledger. Unsupplied facts show *Not supplied*. Browser Print/Save PDF enables the paper workflow; the existing factory ZIP/DXF/BOM/marker exports remain separate, and physical paper/scale/QC validation is still required.

**Living / web tech pack:** editable working specification linked to the actual garment, version snapshots for every sampling round or preproduction revision, factory-specific release snapshots, reference imagery with captions, section comments and status, sampling observations, and a per-field comparison view. Following [Techpacker's manufacturer sharing flow](https://helpcenter.techpacker.com/hc/en-us/articles/360022720553-How-to-share-a-Tech-pack-with-Manufacturers) and [Backbone's revisions-to-pack workflow](https://intercom.help/backbone-help-center/en/articles/6619340-backbone-101-how-to-manage-your-product-revisions), the correct artifact to send the factory is a **specific identified release**, not an always-changing URL to whatever the designer last edited.

## Authoritative safety boundaries and stages

Source patterns, POM and fabrics are maintained by EXO's document; a tech pack may add supplier instructions and approval context without silently overwriting geometry. A released spec is an immutable copy; authoring further changes produces a new draft and another numbered release. Each factory, sample round and comment needs its exact revision link. Discuss a proposed substitution/measurement deviation before approving it, rather than silently editing factory records.

**Current integrated MVP:** authorable local tech pack, conventional print-ready HTML, revision snapshots, basic anchored comments, sample rounds and reference uploads, JSON export. EXO's existing File Library and shared-project UI can be used to coordinate overall project reviews; project-level collaboration is **not** yet a tech-pack-specific secure manufacturer release URL. Do not advertise shared local drafts as protected factory portals.

**Subsequent production milestones:** authenticated role-specific browser routes; factory A/B isolation at the API/database layer; restricted access to pattern source, unit costs and unreleased drafts; release hashes and immutable audit; simultaneous editor conflict handling for numeric POM/BOM fields; exact base-size/tolerance sample-delta calculations; physical sample photos and linked comment anchors; factory acknowledgment and clear superseded notices; malware/asset scanning and rights; server-managed attachments; accessible phone/tablet factory review; verified 2D/3D annotated views; factory-calibrated PDF and pattern interchange tests.

## Non-negotiable production gates

1. Every exported release must name the source garment revision, POM specification, units, materials, colorway and factory recipient.
2. Pattern export and physical stitch/fit approval cannot be inferred from a tech pack print preview, simulation, or auto-generated values.
3. Differences between versions must include measurements, fabrics, BOM, imagery and construction, not merely human-readable change notes.
4. Factory uploads and comments are proposals until the design authority accepts/rejects them; no manufacturer may silently edit a designer's master specification.
5. Public portfolio/marketplace previews must omit all proprietary measurements, supplier pricing, patterns and manufacturing docs unless intentionally licensed and published.

This is a working implementation roadmap, not a factory certification, legal opinion or claim that cloud collaboration has been deployed.

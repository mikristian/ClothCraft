# Manufacturer techpack engineering reference catalog

Research date: 2026-10-18. The repositories below are **references and integration candidates**, not endorsed or audited manufacturer standards. Keep original licensing and attribution; review each dependency before copying code. `repos/` holds isolated, shallow research clones and is not wired into the EXO application.

## Direct apparel and techpack projects

| Project | URL | License evidence | Practical use | Risks / limitations |
| --- | --- | --- | --- | --- |
| Kobo fashion-tech-pack-schema | https://github.com/kobo-labs-open-source/fashion-tech-pack-schema | MIT, root `LICENSE` inspected | JSON model for style, colorways, BOM, measured specs, construction, packaging, revisions; use as schema comparison and fixture source | Not an industry governing standard; extend provenance, validation, sample approval and manufacturer fields |
| Kobo garment-measurements | https://github.com/kobo-labs-open-source/garment-measurements | MIT, root `LICENSE` inspected | POM definitions, category-specific size charts and grading rules, sample standardized vocabularies | Reference fit baselines only; grading is not universal and must be approved per style |
| Morfe TechPack AI Builder | https://github.com/morfemartin/techpack-ai-builder | MIT, root `LICENSE` inspected | Actual garment techpack wizard, multi-view SVG specification sheets, colorways and embroidery callouts | Young project; review generated geometry and AI output; optional proxy / provider dependencies |
| SwagataJ techpack-ai | https://github.com/SwagataJ/techpack-ai | Apache-2.0, root `LICENSE` inspected | Example React editing and AI-assisted image-to-spec flow | 5 commits at retrieval; generated measurements and flats must be checked by human technical designer |

## Document and visual editor building blocks

| Project | URL | License status | Practical use | Risks / limitations |
| --- | --- | --- | --- | --- |
| pdfme | https://github.com/pdfme/pdfme | MIT, root `LICENSE.md` inspected; check individual bundled packages | Schema-driven WYSIWYG page templates, PDF export, placed tables/images/text; strong candidate for print output | PDF page layout is a presentation view and should not be the authoritative garment data model; large repo |
| Konva | https://github.com/konvajs/konva | MIT, root `LICENSE` inspected | Precise browser canvas editing, manipulable annotations, garment callouts | Raster rendering path needs vector/PDF export fidelity checks |
| Fabric.js | https://github.com/fabricjs/fabric.js | Verify cloned root license / release | Object selection, transformations, drawing tools, SVG import/export | Coordinate transforms and precision require fixtures for POM callouts |
| Excalidraw | https://github.com/excalidraw/excalidraw | MIT, root `LICENSE` inspected | Whiteboard-like annotation UX, image/shape placement, saved JSON | Hand-drawn style does not match technical-flat precision; substantial editor to adapt |
| tldraw | https://github.com/tldraw/tldraw | **Custom tldraw SDK license**, production license key required | Infinite canvas and interaction patterns | Commercial production license required; do not assume open-source redistribution |
| Penpot | https://github.com/penpot/penpot | Check repo and component licensing before use | Browser vector editor UX reference, structured artboards | Large general-purpose design application; potentially costly to integrate |

## Related product data / manufacturing systems worth evaluating

| Reference | URL | Relevance / caution |
| --- | --- | --- |
| ERPNext | https://github.com/frappe/erpnext | BOM, item variants, supplier, quotations, production workflows; GPL-3.0 applies to the product; ERP is much larger than an editor |
| OpenPLM | https://github.com/openplm/openplm | Legacy open PLM concepts including part revision/BOM; verify activity and license before reuse |
| Seamly2D | https://github.com/FashionFreedom/Seamly2D | Parametric patterns, dimensional geometry and measurements; pattern CAD separate from techpack publishing; GPL-family license review required |
| OpenSewing | https://github.com/freesewing/freesewing | Pattern generation and design data concepts; check individual package licensing, not a factory-ready techpack system |

## Manufacturer-grade spec contract

The canonical editable model should include the following linked records, with stable IDs, per-record provenance and revisions:

1. **Style / cover** — style and season IDs, revision number, fit block, category, sample stage, approved status, author, manufacturer, currency and unit system.
2. **Technical flats** — front, back and detail views, scale and vector paths, anchored callouts, controlled stitching and artwork placements, references to authoritative source assets.
3. **BOM** — item ID, component group, composition, GSM/weight, supplier code, colorway-specific material code, Pantone/reference color, unit consumption, shrinkage/waste assumptions, estimated and confirmed costs.
4. **Spec / POM** — named measurement points, annotated location and technique, base size, complete size grid, grade increments, unit, tolerances and per-size verification status. POMs must retain links to source pattern segments where available.
5. **Construction** — operation, seam/stitch classification, machine settings when relevant, seam allowance, stitch density, label placement, wash and finish specification.
6. **Color / print** — swatch system and code plus approval status, colorway/component mapping, print width/height/position/technique, artwork revision and lab dip approval. Never infer proprietary Pantone swatch values from unofficial RGB lists.
7. **QC / sampling** — requested vs actual measurements, deviations from tolerances, annotated sample comments, approval signoffs and decision dates.
8. **Packing / delivery** — care/size labels, folding and packaging, UPC/SKU, polybag/carton specs and quantities.
9. **Change control** — immutable export snapshot, human-readable version diff, author/time, supplier acknowledgements and a single explicit production-approved revision.

Build page/preset layouts as *views* over these normalized records. A header card, measurement table or material tile should be reusable in several page templates without making duplicated, conflicting copies of its underlying values.

### Example document organization

`Style EXO-HDY-001 / Rev B` → Cover + technical flats → graded POM table → BOM and colorway matrix → artwork and embroidery page → construction/seam notes → labels and packing → sample/QC report → change log. Export to a paginated PDF and an editable interchange JSON. Reject export as **production approved** unless required fields are complete and a named approver signs off.

## Competitor references (feature evidence, not source code)

- **Techpacker**: https://techpacker.com/features/ — reusable connected cards, BOM/POM libraries, grading, PDF/Excel output, revision comparisons, manufacturer portal and sample-stage tracking. This is a useful benchmark for block-based UI and linked specifications.
- **Techpacker pricing/product tiers**: https://techpacker.com/pricing/ — distinguish techpack builder from broader PLM features such as QC, costing, approval reports and production stages.
- **Manufacturer technical completeness**: https://dilshadsons.com/resources/how-to-prepare-a-tech-pack and https://www.phamfashion.com/blog/production-ready-tech-packs-apparel-manufacturing — examples of flat drawings, graded sizes with tolerances, fabric specs, trim details and construction notes.
- **Cross-check**: https://www.kobolabs.io/blog/develop/tech-pack-guide and https://yarnstick.com/knowledge-base/sourcing/apparel-tech-pack-guide/ — practical checklists; any claimed quantitative success metric is unverified for EXO.

## Recommendations for EXO browser implementation

Start with Kobo schema as a comparison fixture, tailor an EXO-owned versioned data model, expose Notion-like draggable section blocks with preset page layouts, attach precise drawing annotations to source image/vector asset coordinates, and generate PDF snapshots with pdfme after license and scale validation. Add shared supplier/material libraries and controlled revision/approval states before supplier-facing collaboration. Keep accuracy-critical POM values sourced from patterns or signed human measurements rather than visual AI inference.

## Verification scope

Repository URLs were checked against GitHub via `git ls-remote` for clone candidates. **Seven clean shallow clones were saved** (`fashion-tech-pack-schema`, `garment-measurements`, `techpack-ai-builder`, `techpack-ai`, `pdfme`, `konva`, `excalidraw`); root license declarations were inspected locally for all seven. Fabric.js clone timed out with an incomplete checkout, which was deleted; other candidate rows are links only. No dependencies were installed, no apps were built, and no third-party manufacturer templates were imported.

# EXO Techpack Studio

Standalone web editor for editable apparel manufacturing technical packages. This is an independent Vite + React workspace under EXO ClothCraft V2, intentionally separated from the existing garment CAD and native simulation code.

## Launch

From the exo-clothcraft-v2/techpack-studio directory:

    npm run dev

Then open http://127.0.0.1:6288/ on the same Mac. An existing dev server may already be running on that port. The browser app stores local working documents under a versioned localStorage key.

Build and validations:

    ../node_modules/.bin/vite build --config vite.config.mjs
    node --test scripts/model.test.mjs
    node scripts/qa-ui.mjs

## Current working features

### Visual Artboard Studio (primary workspace)

The studio opens on a digital-first, **horizontal strip of six independent white artboards**, rather than a PDF page viewer. The original vertical Document builder remains intact as a separate workspace.

- **Artboard modes:** Horizontal scrolling or a vertical stack, and one-click portrait/landscape sizing. Both are presentation-only changes; stable board/widget IDs and techpack records remain unchanged.
- **Visual presets:** Atelier, Factory grid, and Contrast instantly alter the page styling without replacing the data or its widget positions. Six premade board configurations cover product identification, garment flat/callouts, size specifications, materials, photo references, and costing; add blank or preset boards as needed.
- **Notion-like widget library:** Add and position product headers, technical flats, callouts, text, photos, material and POM spreadsheets, colors, estimated costs, and factory footers. Drag a widget by its grip and select it to edit dimensions and contents. Field widgets operate on the *existing* techpack model, not a duplicate copy.
- **Shared image library:** Upload PNG/JPEG/WebP/GIF files once and drag/drop them on any board or assign them to photo widgets; browser import compresses images to keep local storage manageable. Assets stay inside the editable JSON export.
- **Pinned feedback:** Click Comment, then a board position. Add fit/production notes, resolve them, and inspect them from the comments panel. Notes are revision-labeled and persist with the pack.
- **Revision history drawer:** Click the top-right History button to save named versions and restore a previous snapshot. Both the entire board arrangement and uploaded assets are captured alongside the manufacturer fields. Restoration creates a working draft, leaving the local revision timeline intact.
- **Spreadsheet-style specs:** POM and BOM board widgets directly edit the same material and measurement rows used in document mode and costing.

Run `node scripts/qa-visual-workspace.mjs` against the already-running port 6288 to validate widget dragging, orientation changes, templates, assets, comments, revisions and reload persistence in an isolated Chrome context. These features are designed and implemented as local EXO-owned UI components. No Milanote/Storyflow/Notion source code is bundled or claimed to be licensed for this product.

- Multiple styles, including hoodie, T-shirt, outerwear, pants, and an empty document preset.
- Reusable document blocks with editable headings and subtitles, insert/hide/reorder, and Editorial, Compact, and Minimal layout presets. Standalone header, subheading and custom spec-sheet widgets can be added repeatedly, each with its own editable content.
- Product/cover sheet with production identification, illustrative front/back flats, notes, and independent multi-size POM grids with tolerance fields.
- Bill of Materials with article/SKU, supplier, unit consumption, cost, and category fields. Manufacturer cost model includes CMT, packaging, factory overhead, estimated duty, freight, target retail, and margin.
- Colors with user-authored Pantone/reference strings, approval state, and illustrative hexadecimal swatches. These swatches are not certified Pantone values.
- Construction and stitch/operation sheets, labeling and care text, packing instructions.
- Garment annotation editor: image import, numbered pins, arrow endpoints, dragging, editing and deletion.
- Sample rounds, status tracking, fit notes, and actual-versus-target POM measurements with per-point tolerance pass/review results; draft comments associated with a document section.
- Fixed local manufacturer-issue snapshots tagged to a factory, with a separate working draft and history. Issuing a local snapshot does not transmit it to the factory.
- Frozen revision snapshots with dates, author, change-area comparison, downloadable snapshots, and restoration into a new working draft.
- Browser persistence, editable JSON export/import, measurement/BOM CSV exports, and Chrome Print / Save as PDF.
- Required-field readiness checklist distinguishing incomplete documents from physically approved manufacturer-ready samples.

## Important scope

This is an independent local-first preview. It is not an authenticated multi-user supplier portal, PLM/ERP implementation, production order system, or certified factory measurement system. A saved revision is an immutable snapshot in browser-managed application state; it is not a tamper-proof signed external audit record. Comments are stored locally, not delivered to manufacturers. Browser localStorage has storage limits and is tied to the current origin/device: export JSON regularly, especially after importing images.

Technical flats in template presets are illustrative line drawings until replaced with final measured and approved source artwork. BOM costs are forecasts, and colors require physical lab dip approvals. The printable browser view is a convenience output for communication, not verified print-scale pattern output.

## Data and integration

Authoritative data currently lives in src/model.js. The browser editor manipulates normalized records (individual materials, measurement IDs, construction steps, colors, samples, comments, blocks, revisions). Schema version 1 JSON can be exported and re-imported as a separate style. The importer also accepts EXO's existing exo-digital-tech-pack export and maps its draft POMs, BOM, flat artwork, construction and colorways into a standalone style while retaining its original source payload.

The existing EXO app includes src/core/digitalTechPack.js, src/core/measurements.js and src/core/projectFileLibrary.js. A future integration should map its pattern-derived POM and materials into this schema through a versioned adapter and keep the native pattern document as the source of truth for garment geometry. Do not replace measured specs with estimated illustration geometry.

## Research library

See ../research/techpack-library/README.md for verified GitHub URLs, seven archived shallow clones, licensing notes, practical capabilities, and manufacturer-grade document contract. Independent example repositories were retained only as references and are not runtime dependencies. Not all open GitHub examples are production-ready or designed for apparel.

Suggested next priorities: editable multi-view vector flats/placements, normalized shared supplier and trim libraries, size grading rules connected to EXO geometry, sample actual-versus-spec measurement deltas, field-level diffs, material/wastage by colorway, secure authenticated supplier approvals, revision release signatures, and PDF/page template fidelity tests.

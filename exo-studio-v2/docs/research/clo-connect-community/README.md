# CLO CONNECT community and staging research — 16 October 2026

This folder is an evidence and inspiration handoff for EXO ClothCraft. It changes no production runtime code and includes no purchased assets.

## Open first

- **`reference-board.html`**: local responsive research board, 5 runway links + 15 studio/editorial scene links. Click a card to open the original product imagery on CONNECT, or use its indexed-image search.
- **`visual-references.md`**: 20 distinct CLO CONNECT product listings, attribution where indexed, scene-specific Blender construction cues and thumbnail access status.
- **`reference-manifest.json`**: machine-readable version of the 20 entries for a later Blender asset/reference import pipeline.
- **`forum-evidence.md`**: 2025–2026 CONNECT threads, 2026 Astra 6 / MD MCP workflow, and independent Reddit/official help corroboration, with verifiability caveats.
- **`EXO_RESEARCH_RECOMMENDATIONS.md`**: ranked EXO improvements, measurable acceptance checks, stage architecture and Blender room recipes.

## EXO Stage Library · implementation loop 02

The EXO draft garment workspace now offers a 20-scene procedural **Stage** catalog. Choose a runway (R01–R05) or editorial room (S01–S15) from the left Library > Stage folder or the Render inspector's Stage selector. Each selection updates `project.render.stageId`, preserves the underlying cloth solver, and displays original Three.js stage geometry, scene materials and fill/key/rim lights around the garment. **Empty studio** removes the stage without modifying the garment.

The stage thumbnails and popups are generated visualizations: they are not scraped CONNECT thumbnails, nor pixel-accurate clones of the original products. The 20 source listing URLs remain available from the selection details. The new Stage Library currently renders in the EXO draft Three.js garment viewport; other rendering backends require their own stage adapter before claiming parity.

### Editable Blender environments

`blender-scenes/EXO_STAGE_R01.blend` … `EXO_STAGE_R05.blend` and `EXO_STAGE_S01.blend` … `EXO_STAGE_S15.blend` are original Blender 5.1-compatible scene files generated locally. They include `SET_SHELL`, `SET_PROPS`, `SET_LIGHTS`, `CAMERAS` and `GARMENT_STAGE` collections. An empty named `GARMENT_INSERT_ANCHOR` marks the import/origin location for the avatar or garment. Camera, floor, props, materials and softbox lights can be changed in Blender. A Cycles preview of R01 is saved as `blender-scenes/EXO_STAGE_R01_preview.png` (640×800, eight samples); this is a low-quality review render, not a final editorial still.

Regenerate or customize all Blender files using:

```bash
"/Applications/Blender.app/Contents/MacOS/Blender" --background --factory-startup \
  --python scripts/build-connect-stages-blender.py -- --all \
  --output-dir docs/research/clo-connect-community/blender-scenes
```

The generator also accepts `--stage R01` for a single environment. It creates only procedural original meshes and material parameters, never copies CONNECT sellers' geometry or photos. It currently generates still-room structure and lights, not animated crowds, volumetric weather, photogrammetric textures or physically tested rigging.

### Verification

- EXO Vite production build: PASS on 2026-10-16.
- `scripts/qa-stage-library-3d.mjs`: PASS on 1440×900 and 390×844 using isolated `?desktop=1&testSession=…` projects. 20 curated stage cards, stable simulation session, 0 JavaScript page exceptions.
- Live stage node counts at both widths: R01 = **24** Three.js meshes, S02 = **12**, S14 = **38**; **Empty studio = 0**.
- Browser's forced desktop layout at 390px still scrolls horizontally as the underlying four-column CAD editor is wider than a phone; the stage catalog remains interactable. This is not yet a fully responsive mobile CAD workspace.
- Blender 5.1.2 batch-built all **20 .blend files** successfully and Cycles opened/rendered R01. Original source photos remain inaccessible from unauthenticated CONNECT HTTP 403 requests.

## Important limits

Automated direct visits to CONNECT product detail pages returned HTTP 403 Cloudflare challenge during this research. Consequently, no original photograph files or product thumbnails were downloaded. The 20-source request is complete as a **link-based inspiration library**, but the requested **downloaded 20-photo archive is incomplete**. Each card opens its creator's page for manual visual review; check access and rights before acquiring or redistributing media. Product listing metadata or search-result tags alone cannot verify the actual visual composition of every reference.

The forum sample is qualitative: some CONNECT complaints showed only indexed title and date, so no root cause or prevalence is asserted. The official Marvelous Designer API includes programmatic hooks; the October 2026 GPT-6 Astra community post describes the author's independently built MCP integration.

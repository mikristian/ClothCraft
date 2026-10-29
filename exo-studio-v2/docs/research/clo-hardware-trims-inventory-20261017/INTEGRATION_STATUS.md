# CLO Hardware and Trims → EXO ClothCraft Studio V2

Local project status: 2026-10-17. Converted proprietary assets are for private use; do not publish them with the source repository.

## Verified inventory

- 162 unique installed CLO files and 162 thumbnails, with a separate fully allocated offline source copy.
- 133 readable GLB 3D models, including 21 YKK styles (10 pullers and 11 sliders); 359,970 triangles in total.
- 29 source-only references: 10 buttonhole definitions, 1 graphic and 18 tape/teeth texture assets. No independent mesh exists for these, so they are labeled accurately rather than fabricated.

## Implemented

The imported catalog is in Library → Hardware and Trims, under the same collapsible category folders as EXO's existing designs: Buttons, Buttonholes, Zippers, Sliders, Pullers, Stoppers, Zipper Tapes & Teeth, Snaps, Rivets, Buckles & Rings and Graphics as applicable. The main Hardware and Trims heading itself collapses. All 162 imported sources are correctly filed by hardware function rather than collected into one separate imported folder; provenance remains in metadata rather than displayed as a CLO badge. Search, 3D previews and native placement remain available. Native placements persist in Rust fitting-project records and show as editable layers in Object Browser and Property Editor.

Library presentation follow-up: all imported asset rows now use the standard EXO hover-preview popup. Converted GLB models render their real rotating 3D geometry only when hovered; source-only assets show enlarged reference thumbnails and are explicitly marked as having no standalone 3D mesh. The visible library labels, hover cards, preview dialog and placed-hardware inspector no longer show separate CLO-branded badges. Original file provenance, manufacturer/vendor information, and installed source paths are retained in metadata.

Second navigation and preview pass: all eight top-level Library categories now support expandable arrow controls, nested clickable/double-clickable subfolders and actual asset filtering. Garment and Patterns share tops/bottoms/drafts; Fabric and Material map to real material families; Hardware and Trims has Fasteners, Zippers & Components and Findings with selectable leaf folders; Avatar, Hanger and Stage have their own actual matching entries. Existing shared search and item selection remain intact.

Imported mesh hover and click previews use a brighter neutral studio, gentle geometry-aware rotation and broader fill/rim lighting, with enlarged hardware thumbnails in the list. Some original button GLBs use a uniformly dark 2x2 texture and do not expose their sewing holes clearly in the mesh. These buttons now have a side-by-side hover: the actual imported 3D model **and** an enlarged labeled shape reference (not represented as physical mesh detail). Display-only neutral material overrides improve visibility without modifying original GLBs or their placed garment finishes. No original assets were changed.

Editable imported mesh properties: width, height, thickness/depth, X/Y, rotation, lift, opacity, visible, base tint, roughness, metalness, reflection intensity, clearcoat, weight specification and material family (original, metal, plastic, nylon, textile, ceramic, glass). Source mesh colors and maps are preserved and the same material system renders in EXO draft and native views. Rust has backward-compatible saved fields; the queued native editor now reads the latest state before each change to avoid overwriting rapid successive edits.

## Checks

- Catalog integrity: all 162 entries and thumbnails; all 133 GLBs valid and present.
- Rust fitting imported-hardware round-trip and rejection test: PASS.
- Native isolated imported material, undo, redo, save and reopen API test: PASS.
- Native isolated YKK puller placement, overlay creation, X/Y editing and save/reopen: PASS.
- Production build and signed EXO V2 web-only installation: PASS. Installed native bridge reports ready, 2 garment panels, no page errors.
- Folder hierarchy QA: PASS; checked all 162 files across seven CLO subcategories, main/subfolder collapse, all 21 YKK searches, rotating 3D preview and native YKK placement in a disposable Rust project. Read-only test against the installed EXO V2 confirms folder selection, YKK search and collapse with zero page errors.
- Hover-preview QA: PASS; tested loaded actual YKK puller GLB geometry (not merely an empty canvas), source-only thumbnail previews, clean UI labels, nonblocking hover, subsequent native placement, and no page errors. A read-only follow-up against the signed installed EXO V2 app also passed 21 YKK search matches and visible rotating 3D hover geometry.
- Library tree/preview QA: PASS for eight top-level categories, nested click/doubleclick, expand/collapse, asset filters (2 Jeans templates, 52 Pullers), 21 YKK search matches, and actual imported button GLB preview contrast via Playwright screenshot/Pillow. Installed EXO V2 read-only check confirms the tree, 3D hover plus button shape reference, native service ready and zero browser errors. UI backup: integrations/clothcraft/output/app-backups/EXO-V2-web-before-hardware-preview-and-tree-20261017.
- Installed web interface backup: integrations/clothcraft/output/app-backups/EXO-V2-web-before-clo-162-hardware-finish-20261017.

The complete multi-control browser regression has been intermittent (preview timing and undo/redo UI checks); this path is not claimed fully verified, although the isolated Rust round-trip and YKK placement tests passed.

## Still outstanding

Buttonhole definitions, graphics and tape textures need real format-specific import adapters before they can behave as editable construction assets. Mesh dimensions and axes require supplier measurements before manufacturing. Rigid collision, buttonhole cuts, physical zipper interlocks and trim force simulation remain unavailable. The iCloud Documents mirror may evict its cloud files; original installed CLO files and the separate offline copy are present. Finder Keep Downloaded pinning of the iCloud mirror remains optional and unresolved.

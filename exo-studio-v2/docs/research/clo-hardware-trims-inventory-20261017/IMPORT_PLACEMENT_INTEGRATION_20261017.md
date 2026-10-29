# Imported CLO 3D hardware: live garment integration

## October 17 additional library update

The installed EXO ClothCraft Studio V2 asset library now exposes the converted files in a first-row **New · CLO 3D Hardware & Trims** collection. Within the collection, **New 3D** filters to all 133 converted, placeable GLB models and **Source files** filters to the other 29 references; **All** retains all 162 entries. Search (including all 21 YKK assets), click-to-preview, and **Place 3D model on garment** remain available. A new `scripts/verify-clo-imported-hardware-bundle.mjs` gate validates each of the 133 GLB headers and 162 thumbnails before installing the web bundle and again after copying it to the signed `.app`.

Deployment with `EXO_WEB_BACKUP_NAME=EXO-V2-web-before-new-clo-hardware-20261017 bash integrations/clothcraft/macos/build-web-only-v2.sh` passed and preserved the original web bundle at `integrations/clothcraft/output/app-backups/EXO-V2-web-before-new-clo-hardware-20261017`. The signed installed app retains its Rust/Swift executables and saved projects. Read-only installed browser acceptance (`node integrations/clothcraft/qa-installed-v2-new-clo-hardware-20261017.mjs`) passed **162 All / 133 New 3D / 29 Source files / 21 YKK**, actual YKK GLB HTTP fetch/GLB signature, rotating preview canvas, placement action, and zero browser errors. `node scripts/qa-installed-v2-bridge-smoke.mjs` also passed with native ready, WASM ABIs 1, and zero browser errors. Code signature verification passed.

**Implemented and installed:** October 17, 2026, in `~/Applications/EXO ClothCraft Studio V2.app`.

The existing 162-entry private CLO hardware library now supports garment placement for **all 133 converted GLB assets**, including real buttons, YKK/standard sliders and pullers, stoppers and paired OBJ mesh packages. The other 29 assets are CLO buttonhole definitions, graphics, or textures; they remain available as source references because they are not independent 3D meshes.

## Operation

Open **Library → Hardware and Trims → CLO 3D Hardware & Trims · Imported**. Search or filter the original models, select a model, then choose **Place 3D model on garment**. The native garment's selected pattern panel receives the placement; otherwise it uses the first available native panel. In draft mode the attached record belongs to the selected draft piece. The right **Object Browser → Trim** lists the imported placement; select it to inspect and edit the right **Property Editor** fields. The Object Browser also supports visibility toggles and hardware row selection.

Imported property fields include visibility, 3D size and thickness in mm, X/Y position in cm, rotation, normal offset, color, roughness, metalness, and opacity, plus duplicate and remove. Rust supports a dedicated **Undo Hardware / Redo Hardware** history for native placements. The imported GLB geometry is positioned on a deforming material-space triangle via barycentric interpolation of the garment's Rust mesh, preserving original mesh components and reflecting material and dimension edits. Browser PBD draft mode also attaches real imported GLB objects to its deformed garment vertices.

## Native data and permissions

The authoritative Rust `FittingProject.importedHardware` contains validated IDs, asset catalog IDs, target panel IDs, local coordinates in mm, rotation, scaling, visibility, tint, roughness, metalness, and opacity. Native session commands `hardware-set`, `hardware-undo` and `hardware-redo` are revision guarded. Save/reopen round-trips this data. The material scene resolves GLB paths only against the local private CLO import manifest, not arbitrary URLs from project data.

Source paths: `research/oss/clothcraft/src/fitting.rs`, `research/oss/clothcraft/src/bin/exo-session.rs`, mirrored native entry `integrations/clothcraft/exo-session.rs`; React integration `src/components/ClothCraftWorkspace.jsx`, `src/components/ClothCraftSceneV2.jsx`, `src/components/ClothCraftImportedHardwareOverlay.jsx`, `src/components/ImportedHardwareInspector.jsx`, `src/components/GarmentViewport.jsx`, `src/components/CloUI.jsx`, `src/App.jsx`.

**Model licensing:** The converted proprietary CLO/YKK resource meshes remain private on this machine under Git-ignored `public/clo-hardware-converted/`; no model bytes were uploaded to a public repository.

## Verified results

* **Native Rust unit test:** `cargo test --locked -j 2 imported_hardware_tests --lib` passed; geometry/asset ID validation and backward-compatible project roundtrip.
* **Native executable:** `cargo build --locked -j 2 --bin exo-session` passed. A disposable direct Rust session opened a shirt, placed a real imported asset, undid it, redid it, saved the fitting project, and reopened with matching asset ID/opacity.
* **Actual native browser QA:** `node integrations/clothcraft/qa-v2-imported-hardware-placement-20261017.mjs` passed with `{pass:true}` on a disposable Rust-backed Chrome fixture: filtered YKK to 21 assets, placed the original GLB, confirmed at least one actual native canvas GLB group, edited width and color, verified `#7395af` color and scaling in Rust, performed Undo/Redo, saved/reopened the project, and observed zero browser page errors.
* **Actual installed desktop app:** Verified ad hoc code signature, live native service and `importedHardware` snapshot field. `node scripts/qa-installed-v2-bridge-smoke.mjs` passed: native ready, Rust fabric/geometry WASM ABI both 1, 2 panels, 0 bad ports, 0 page errors, 0 texture warnings. Installed asset manifest returns 162 indexed/133 GLB assets.
* **Source consistency:** mirrored Rust `exo-session.rs` files are byte-for-byte identical; `git diff --check` passed.

## Physical limitations

The GLB hardware is actual 3D mesh geometry attached visually to a cloth surface; its position updates with cloth deformation and its geometry is resizable. **Rigid body contact, actual buttonhole cutting, button closure force, zipper tooth interlock, and garment fastener physics have not been integrated into the Rust cloth solver.** Those require constrained collision/sewing changes and dedicated validation. The source file conversion dimensions were inferred from CLO OBJ coordinates, so verify physical sizes against measured hardware for manufacturing.

Native hardware editing has **its own 32-step undo/redo history**. It is not yet unified chronologically with native template undo/redo. Flat buttonholes and original artwork remain editable through their existing specialized native/draft graphic and buttonhole routes where available; importing a `.bth` or PNG by itself does not create mesh geometry or a cut in the cloth.

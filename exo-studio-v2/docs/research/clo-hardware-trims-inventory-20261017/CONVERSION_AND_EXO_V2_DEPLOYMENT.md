# CLO hardware and trims conversion / EXO ClothCraft Studio V2 deployment

**Date:** 2026-10-17

## Conversion result

The local, licensed CLO 7 resource folder was read without modifying its contents:

`/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims`

`python3 scripts/convert-clo-hardware-library.py` wrote the private, Git-ignored library:

`public/clo-hardware-converted/`

| Source kind | Files | GLB 3D models | Other local assets |
|---|---:|---:|---|
| Buttons | 45 | 45 | CLO previews, original `.btn` metadata retained by source path |
| Buttonholes | 10 | 0 | source definition `.bth` with `.bnd`, preview, JSON |
| Graphics | 1 | 0 | source `.grp` (Illustrator `.ai` inside) |
| Standard pullers and YKK pullers | 31 | 31 | source previews and material references |
| Standard sliders and YKK sliders | 20 | 20 | source previews and material references |
| Stoppers | 7 | 7 | some have two OBJ halves per source |
| Zipper tape and teeth textures | 18 | 0 | original textures/normal maps indexed in installed CLO resources |
| OBJ companion archives | 30 | 30 | separate companion meshes of 21 pullers and 9 sliders |
| **Total** | **162** | **133** | **29 source/texture references** |

All **162 thumbnails** were created; all **133 GLBs** exported and reopened successfully with trimesh (total 359,970 triangles), with **zero conversion or geometry-loading failures**. The 133 GLBs together occupy approximately 13.5 MB, and previews approximately 3.1 MB. All 21 YKK assets are available. The 30 companion ZIP files were retained as distinct geometries because their exported OBJ data is not always byte-for-byte identical to the named CLO style package.

The generated `manifest.json` includes per-source names, original paths, status, GLB and thumbnail URLs, raw OBJ bounds, estimated physical measurements, and geometry parts. The conversion script records explicit unit assumptions: source zipper style OBJ coordinates are treated as centimeters; button geometry and separately supplied OBJ companions are treated as millimeters to match paired asset bounds. **These are inferences, not certified supplier measurements.** Original OBJ geometry, part names and textured materials are retained where readable. Flat buttonhole definitions and graphic/texture assets were kept as accurately labeled references rather than fabricated 3D geometry.

## Installed application integration and validation

In **EXO ClothCraft Studio V2** use **Library → Hardware and Trims → CLO 3D Hardware & Trims · Imported**. The expandable catalog displays all 162 entries, grouped and searchable. Selecting a GLB item opens a rotating 3D preview; nonmesh source records use thumbnails and explain their original format. Existing EXO procedural hardware presets are also retained. Selecting the imported source records does not yet mount them as physically constrained sewing hardware on the garment; placement, 3D collision and supplier tolerances need separate native implementation.

`npm run build`: PASS, 1909 modules. Two invocations of `integrations/clothcraft/macos/build-web-only-v2.sh` completed successfully, updating and signing the local `~/Applications/EXO ClothCraft Studio V2.app` web UI while retaining native Rust/Swift services and saved projects. The web bundle was backed up under `integrations/clothcraft/output/app-backups/EXO-V2-web-before-clo-hardware-import-20261017`.

Installed smoke test: PASS (native bridge health, 2 pattern panels, Rust fabric and CAD WebAssembly ABIs, zero page errors/bad ports/texture warnings). Real installed app server `http://127.0.0.1:5386` returned HTTP 200 for the imported manifest, YKK GLB and buttonhole/YKK thumbnail assets. Read-only Chrome UI QA opened **Hardware and Trims**, expanded imported collection (**162 tiles**), filtered `YKK` (**21 tiles**) and opened a YKK preview with Three.js canvas and no errors. Browser correctness is verified, but detailed render/artifact pixel fidelity and sewing attachment in a production garment are not proven.

## Cloud copies and content provenance

The iCloud Documents mirror is `~/Documents/clo/Assets/Materials/Hardware_and_Trims`. Its on-demand download and comparison results are in `icloud-hydration-report.md` and `icloud-hydration-results.json`. iCloud storage can re-evict downloaded files automatically; compare current flags when requiring guaranteed offline use. The installed CLO.app resource copy remains physically present and available offline independently of iCloud.

**Current iCloud limitation:** A later independent test found macOS had automatically re-evicted all 162 iCloud Documents entries even though they had passed 162/162 SHA-256 checks while temporarily hydrated. A second download request again made some entries resident, then macOS evicted them. Permanent **Keep Downloaded** pinning has not been applied, because that Finder action cannot be triggered by the connected terminal. To pin, open Finder to `~/Documents/clo/Assets/Materials/Hardware_and_Trims` and select **Keep Downloaded** on the folder's context menu. Verify it later in Finder because storage optimization is active.

To ensure the user has a durable local copy meanwhile, the complete source library was additionally copied, without modifying the originals, to:

`~/Library/Application Support/EXO-ClothCraft-Studio-V2/LocalHardwareAssets/CLO-Hardware_and_Trims`

The separate offline snapshot has **162/162 byte-for-byte SHA-256 matches** with the installed CLO source, recorded in `offline-copy-verification.json`. All 46,546,294 bytes are physically allocated on local disk outside iCloud-managed Documents, and the converted GLB models are also physically stored locally. This protects offline EXO/Blender reference access regardless of subsequent iCloud eviction.

The source CLO/YKK models are installed proprietary vendor assets. Converted meshes remain under the project's explicitly ignored, private `public/clo-hardware-converted/` folder, and **must not be committed to a public repository or redistributed** without appropriate permission. The generator script and inspection metadata may be version controlled, but the actual converted model and thumbnail bytes are intentionally excluded.

## Regeneration

`python3 scripts/convert-clo-hardware-library.py`

`python3 docs/research/clo-hardware-trims-inventory-20261017/generate_index.py`

Run only on a computer with the corresponding licensed CLO installation. Regeneration does not modify CLO's installed originals.

## Added direct garment placement and property editing (2026-10-17)

In EXO ClothCraft Studio V2, open **Library → Hardware and Trims → CLO 3D Hardware & Trims · Imported**. Choose a converted OBJ/GLB asset and select **Place 3D model on garment**. The original GLB model is anchored to a selected native Rust panel, appears as a new object in the **Object Browser → Trim** list (with appropriate Button/Zipper grouping where applicable), and can be selected again to open its properties below.

Editable properties now include width/height/thickness in millimeters, placement X/Y, rotation, surface offset, visibility, color, roughness, metalness, material family (Original, Metal, Plastic, Nylon, Textile, Ceramic, Glass), reflection intensity, clearcoat, opacity and hardware weight metadata. The color, physical dimensions, and material adjustments affect the actual 3D imported mesh; weight is a production/specification value only and is **not a solver mass constraint**. The surface attachment follows native garment triangle deformation where its panel coordinates remain valid.

The native Rust `FittingProject.importedHardware` serialization stores source asset ID, garment panel, spatial transform, scale and editable materials; it provides dedicated `hardware-set`, `hardware-undo` and `hardware-redo` operations, validation and autosave. Native project Save and Reopen retain the assignments. An imported zipper puller/slider is a selectable rigid-looking 3D component, **not** a physically working zipper mechanism: actual teeth engagement, cutting, collision, button fastening and rigid/cloth coupling remain separate solver features. Source `.bth` buttonhole definitions, the graphic `.grp`, and PNG zipper tapes are kept as catalog references because they do not supply standalone OBJ geometry.

QA command: `node integrations/clothcraft/qa-v2-imported-clo-hardware-20261017.mjs`. The disposable CPU-native Rust + Chrome test passed: 162 catalog items, 21 YKK filter results, actual original GLB mesh rendered on a Rust panel, interactive dimension/color/material editing, reflection/clearcoat/weight persistence, hardware Undo/Redo, autosave, manual Save and Rust project Reopen. Zero page exceptions. This is an isolated test and does not mutate the user's active garment. The EXO V2 installed macOS app release is signed and independently checked with `node scripts/qa-installed-v2-bridge-smoke.mjs`.

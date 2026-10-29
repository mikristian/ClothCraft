# ClothCraft V2 garment library: editable 2D → anatomical 3D

## Reference and boundaries

The Jarvis CLO Male T-Shirt source preview remains the exact-source reference: seven independent exported CLO mesh panels, 3,661 source vertices, 6,876 source triangles and 23 sewing-guide groups. It is a *rendered source preview*, not a validated physical sew. The existing `cloGarmentSourcePreview.js` and reference asset are deliberately unchanged. The editable source-derived `clo-male-tshirt` template has **zero native sewing constraints** until edge associations are authored; do not mislabel the 23 visual guide groups as native stitches.

Other library garments use editable authored 2D cutline polygons in `src/data/templates.js`. The new body-relative pre-drape is a 3D staging illustration. It preserves the centimeter drafting coordinates, editable source seam graph, curves, material assignments and user undo data. It does **not** certify body clearance, textile fit, fabric strain or a finished sewing solve.

## Implemented

- `src/core/patternBodyArrangement.js`: infer left/right leg front/back, torso, sleeve, hood, collar and cuff roles from explicit `arrangement3d.wrap` or recognizable source panel names; ambiguous pockets and panels are left alone. Applied to library templates and GarmentCode imports.
- `src/core/staging.js`: approximate torso roll and solver-coordinate-based front/back leg staging. The existing `src/core/physics.js` solver remains authoritative for *simulated* positions; no flattening/resizing of the cut polygon.
- `src/core/garmentPreviewGeometry.js` and `src/components/GarmentLibraryPreview.jsx`: read-only garment library poses for left/right leg volumes and separate authored fabric IDs, including rib versus main. The CLO OBJ source path is not replaced by generated geometry.
- `src/App.jsx`: in legacy mode, **Arrange All Panels Around Avatar** in 3D placement and Sewing, with all lower-body, collar, hood, and cuff role options. In the native V2 library, garment tiles submit a converted native template, then open it in the actual embedded 2D/3D Rust editor. The unsewn Patterns category preserves zero-seam semantics.
- `native_cpp/core/clothcraft_export.cpp`: convert documented piece wraps into source-origin-adjusted 3D placements around torso, sleeves and separate legs, rather than a global horizontal shelf. Unknown roles still export as an inspectable flat row.
- `src/core/nativePatternExportPreparation.js`: normalize clockwise outlines and remove sub-0.1 mm degenerates in a *copy for export only*; remap seam edge indices, directions, and fractional intervals. Native library loading refuses any conversion that would drop an authored sewing relationship.
- `integrations/clothcraft/workspace.mjs`: before an active native fitting project is replaced, save an archival JSON + native state + property metadata under `Output/workspace/backups/before-library-switch-*`. Failure to back up blocks the project switch. This handler is installed in V2 but will not take effect until V2 is restarted.

## Verified on 18 October 2026

| Test | Result |
| --- | --- |
| `node scripts/check-garment-library-native-export-20261018.mjs` | 10/10 templates export; panel/fabric/edge references present |
| `node scripts/check-native-pattern-export-preparation-20261018.mjs` | 10/10, source immutability, winding/range remap |
| `node scripts/check-native-cpp-clothcraft-anatomical-placement.mjs` | PASS front/back/left/right placement and original sewing references |
| `node scripts/qa-native-rust-garment-library-open-20261018.mjs` | 10/10 genuinely open in **isolated** native Rust sessions, without changing the user's open project |
| `node scripts/qa-installed-v2-native-garment-library-click-20261018.mjs` | PASS live installed V2 garment tile → bridge export → native open *event contract*, with native events intercepted to avoid mutating the user's current document |
| `node scripts/qa-installed-v2-dual-tee-library-20261017.mjs` | PASS both installed CLO / avatar tee three-view hover previews |
| `node scripts/qa-pants-3d-preview-20261018.mjs` | PASS Chromium pants, 501 fit, hoodie; saved screenshots under `screenshots/` |
| `node integrations/clothcraft/qa-v2-library-project-switch-backup-20261018.mjs` | PASS previous native JSON, pose and metadata backed up in isolated workspace |

The running installed V2 `/export` service was also checked with pants, hoodie and 24-piece jeans. The update was signed and installed through `integrations/clothcraft/macos/install-v2-anatomical-converter.sh`, `install-v2-js-only.sh` and `install-v2-workspace-js-only.sh`. Rollback backups were retained by all three installers. The already running native worker and saved garment were **not** replaced for QA. Reload/relaunch V2 to see the newly installed UI and activate the newly installed workspace backup handler.

## Remaining physical-workflow distinction

Exported panel placements are still locally flat, independently sewn *starting sheets*. `nativePreDrapeCurvature.js` applies a non-destructive curved reset-stage display; native Rust owns geometry once simulation advances. Ten successful Rust template opens prove serialization and meshing, **not** stable draping or fit validation for each garment. The CLO source's visual seam path groups would require an independently verified XML-to-boundary sewing-graph mapping before promoting them to the native seam network. Do not synthesize those links without reliable endpoint correspondence.

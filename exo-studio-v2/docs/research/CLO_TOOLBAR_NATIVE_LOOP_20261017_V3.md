# EXO CLO toolbar — Native functionality loop V3

**Date:** 2026-10-17. **Project:** EXO ClothCraft Studio V2. This is an incremental implementation record, **not** a claim of complete CLO 3D parity.

## New installed and functioning workflows

| CLO reference | Implementation | Evidence | Limits |
| --- | --- | --- | --- |
| 3D A03 · Select Mesh (Brush) | 3D raycast selects actual Rust snapshot mesh vertices within camera-scaled brush radius; visible temporary Three.js highlights, Alt erase, Escape clear. Switching other CLO tools releases brush. | First disposable browser QA selected 25 actual native vertices and displayed 25 highlight points. Installed 1440px smoke check `data-mesh-brush-active=true` after A03, and `false` after switching to A06; zero page errors. | The selection is visual/session-only, not persisted garment topology or CLO-equivalent mesh sculpting. Escape/erase final browser regression was blocked by concurrent Chrome navigation timeouts, so not certified. |
| 2D A06 · Base Polygon | Exact metric Rectangle/Ellipse/Sector size dialog sends existing `authoring::Primitive` into Rust. The resulting panel is saved and native Undo can reverse it. | `node integrations/clothcraft/qa-v2-native-primitive-api.mjs` passed 415×625 mm rectangle, 2→3 native panels, serialized saved third panel, Undo 3→2. Installed 1440px smoke verified modal opens from actual A06 and Cancel works; zero page errors. | Limited parametric shape creator, not full CLO primitive shape library or grading. |

Capability count for currently installed toolbar: **19 native**, **7 inspection-only**, **44 unavailable CLO-specific operations**. Unavailable operations retain their reference positions and open truthful detail panes. The previously reported 70-slot interaction audit remains applicable to the UI, but this iteration did not re-execute that entire sweep.

## Annotation implementation prepared but intentionally not enabled

Native typed 2D Pattern Annotation (A14) and Edit Annotation (A13) sources are implemented, with editable stable IDs, positions in material metres, undoable add/edit/delete, `PolygonPattern.annotations` serde field, source-side mirror coordinate reflection and 2D label rendering. The exact event contract is `exo-clothcraft-select-2d-tool` with `{tool:'annotation'}` or `{tool:'editAnnotation'}`; Rust edit kinds are `Annotation` and `RemoveAnnotation`.

The first-time Rust GPU/desktop dependency build and CPU-only library tests did not finish within this loop, and the compiled/existing native exo-session executable was **not upgraded to the annotation schema**. A13 and A14 therefore remain unavailable in the shipped capability map to prevent a user-visible edit failure or incompatible native document. **Do not claim annotation tool support, change capability map or import annotated projects in the installed app until a new matching Rust binary passes unit/save/reopen tests.**

## Verification and installed package

- `npm run build`: PASS on current EXO sources (Vite 1,891 transformed modules in packaging build).
- `node integrations/clothcraft/qa-v2-native-primitive-api.mjs`: PASS (disposable local Rust fixture; saved and Undo verified).
- Installed app 1440px Playwright read-only hover/action smoke: A03 activates brush, A06 deactivates and opens Base Polygon form, Cancel closes; **PASS, 0 page exceptions**.
- `node integrations/clothcraft/check-clo7-native-capabilities.mjs`: PASS after updating true native action mapping for A03/A06.
- Installed macOS Studio V2 app rebuilt, signed, reopened; bridge/front end HEALTHY. `node scripts/qa-installed-v2-reopen.mjs`: PASS for native project restore (two garment panels, eight seams, project named `tshirt / MakeHuman 1.75 m engineering fixture`).
- Verified project backup created before rebuilding: `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace/backups/pre-toolbar-native-loop-20261017T013118/`.

**Next native gate:** Complete Rust `cargo test --no-default-features --lib annotation_tests` and a matching desktop `cargo build --bin exo-session` with GPU support; test old project restore + annotation add/edit/delete/save/reopen/undo on a disposable fixture, then enable A13 and A14. Follow with the higher-value manufacturing geometry operations such as attached buttons/zipper and physical tacks, which remain substantially more involved.

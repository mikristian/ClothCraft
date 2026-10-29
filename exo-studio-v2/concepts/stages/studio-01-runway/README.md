# EXO Stage 01 — Runway Chamber, Clean V3 (Blender review)

**Status:** Original Blender scene for visual review. Requires user design approval before any EXO ClothCraft integration. The installed app and its stage preset manifest have not been changed.

## What the review contains

- `EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3.blend` — fully editable 3D studio, its geometry, materials, physical lighting, camera setup, collections, and hidden scale-only reference collection.
- `EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-STAGE-ONLY.glb` — stage geometry only; excludes avatar, temporary garment reference, cameras, and photometric lights.
- `EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-{front,hero,side,overview}.png` — visual review perspectives. Overview hides roof members *only for the render*, preserving them in the Blender scene.
- `EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-CONTACT-SHEET.jpg` — four-angle review sheet.
- `build_runway_chamber.py`, `polish_runway_chamber.py`, `polish_runway_chamber_v3.py` — reproducible original design scripts; base Blender scenes used for V1/V2 are preserved.

## Reference and original geometry

The user-owned `~/Documents/clo/Assets/Stage/Stage_01.zprj` was read-only inspected: it includes a zipped OBJ, material library, texture maps, and 3D stage geometry. Its approximately 11.1m-wide by 16.1m-deep interior helped establish original EXO scale and functionality. It was **not** copied into the V3 Blender or GLB geometry; the new room is authored from native Blender geometry. The original ZPRJ remained untouched (SHA256 `342a400d13935b5850642a56c1bb3b02e8438e3483aebde4b60aa8a6d7984120` at audit).

## Studio structure and CLO-style functionality

- Room width ~11.3 metres, stage depth ~15.6 metres, ceiling height ~6.4 metres, one main runway and platform.
- 466 authored GLB mesh/text objects separated into scene collections: architecture, runway, audience benches, architectural detail, and physical lighting fixtures.
- Textured limestone/plaster, graphite basalt, anodized steel, satin bronze, upholstered seating, floor reveals and diffused LED trim; theatrical truss with aimable Fresnel fixtures.
- 4 distinct cameras: hero, symmetrical front, overview cutaway, outfit side. Active default camera: symmetrical front.
- The avatar foot anchor is at `(X=0,Y=0,Z=0)` in Blender **Z-up** coordinates. Stage platform surface reaches `Z=0`; front runway is only 2 mm below that. In Three.js's GLTF importer, Blender Z-up maps to Three.js Y-up.
- The imported real-body reference and placeholder garment geometry reside only in a hidden and removable `90b SCALE REFERENCE` collection. They are neither production garment simulation nor part of the exported stage GLB.

## Review and approval

Open the Clean V3 `.blend` in Blender 5.1+, then select cameras in the camera collection or navigate the scene. The full architecture remains editable. If you want to see the rough avatar scale reference, re-enable the hidden `90b SCALE REFERENCE` collection in Blender's Outliner.

Once the appearance is approved, integration should maintain EXO's current linked 2D pattern and 3D garment windows and **replace only the environment stage group**. Load the GLB under the original garment and native Rust avatar at `0,0,0`; keep the garment/physics data untouched; preserve application Undo/Redo for edits. The UI should later expose scene visibility, lighting, camera views, floor contact/collision choice and reset. Stage collision requires a deliberately simplified walkable collision surface plus future engine validation: mere GLB appearance is not collision or simulation support.

**Still pending:** app import, native floor/mesh collision, UI stage controls, live garment fit evaluation, and final user approval.

## V4 visual approval candidate (current)

- **Current Blender studio:** `EXO-STAGE01-V4-APPROVAL-CANDIDATE.blend`. It preserves fully separated editable architecture, fixtures, seating, surfaces and photography lights; its preview actor is a correctly scaled neutral body mannequin, not a simulated garment.
- **Primary stage-only GLB:** `EXO-STAGE01-V4-STAGE-RUNTIME-OPTIMIZED-REVIEW.glb`. Merges 836 source objects into **23 semantic meshes** across the same five stage collections for future interactive use, retaining 12 materials and seven color-map textures. Source Blender parts are untouched. This optimization is a preparation, not integration.
- **Visual re-import check:** `EXO-STAGE01-V4-OPTIMIZED-VERIFY.png`; this is Blender's render of the optimized GLB after importing it back into the authoring environment with equivalent lights.
- **Review page:** `review.html`, with the empty stage, 1.75 m mannequin and optimized GLB compared at the same room scale.
- **Comparison board:** `EXO-STAGE01-review-board-V4.png`, alongside the exact user-owned CLO Stage_01.zprj reference.
- **Build scripts:** `refine_editorial_v3.py`, `generate_stage_pbr_textures.py`, `prepare_studio04_approval.py`, `optimize_runtime_export_v4.py`, `verify_optimized_render.py`.

The source `<STAGE>.zprj` is stored in the local user's CLO Assets directory and has only been read. No changes to the running garment app or its existing stage assets were made. Check geometry and lighting visually in Blender before integrating any candidate file. See official CLO docs: https://support.clo3d.com/hc/en-us/articles/18815004542873-Scene-and-Render-Properties-File-ZSE.

## Runtime preparation (still awaiting approval)

`EXO-STAGE01-V4-integration-candidate.json` records GLB checksum, five selectable scene groups, camera targets, the origin, and two level walkable collision surfaces. `collisionsEnabled` remains false and this candidate is not referenced by the live EXO app. It is sufficient to prototype future scene selection without touching native garment physics. The optimized GLB was re-imported into Blender with the existing light rig and rendered successfully.

# EXO Studio 01 — Gallery

**Status:** Blender design candidate for user review. Not installed or wired into EXO.

An original studio room, inspired by architectural gallery interiors rather than a copy of a CLO/CONNECT scene. A graphite runway plinth, pale fluted limestone fins, inset gallery wall, warm metal inlay, recessed vertical light lines and oversized diffused ceiling light create a neutral architectural photographic set. One stage only; additional variants should follow after design approval and functional verification.

## Files

- `gallery-studio-01.blend`: original fully editable Blender 5.1 scene.
- `build_gallery.py`: reproducible procedural source, Blender 5.x compatible.
- `gallery-studio-01-stage-only.png`: standalone stage render, without mannequin.
- `gallery-studio-01-hero.png`: three-quarter preview with **nonproduction reference** mannequin and placeholder tee.
- `gallery-studio-01-front.png`: frontal preview with temporary avatar.
- `gallery-studio-01-side.png`: side reference preview.

## World-space contract

- Units: **metres** (Blender Z-up; GLB translates to EXO Three.js Y-up).
- Native avatar stand origin: **Blender `(0, -0.25, 0)`**, floor/podium walkable surface Z=0. Camera-facing front is Blender -Y, mapping into Three.js +Z.
- Actual native EXO avatar and garment belong to the application, not the studio GLB. `90 · PREVIEW ONLY · mannequin & placeholder tee` is an isolated collection and must be excluded before future asset export.
- Stage (structural) meshes: `01 · Stone gallery architecture`, `02 · Garment platform`, `03 · Studio details & accents`.
- Lighting rig and saved viewpoints: `91 · Camera & studio light rig` (Hero, Straight-on, Side). Blender area lamps are separate from geometry and should be mapped to renderer settings in EXO, not accidentally exported as props.
- Editable geometry remains individual named components with material slots. Stage walls are static, not garment pattern pieces. Platform collision surface is at z=0; vertical architectural walls should use noncollision by default to avoid obstructing cloth simulation.
- Existing EXO stage loader currently uses GLB `public/stage-scenes/{preset}.glb`, plus `createStageEnvironment.js`, but *do not import or change those files* until the studio is approved.

## Proposed first approved prototype workflow

1. Open **Scene > Gallery Studio 01** from EXO's stage library while preserving the selected garment, 2D pattern, edits, physics state, and Undo.
2. Retain 2D and 3D drafting windows and CLO-style toolbars; the stage replaces only the 3D floor/environment, not the avatar or garment geometry.
3. Preserve live garment synchronization: pattern edit -> cloth simulation -> 3D garment on same centered avatar inside studio.
4. Expose Show Stage, Collision (top platform only), Brightness, Key/Fill/Rim, Camera view, and Reset Stage as separate scene controls, not garment property-editor takeovers.
5. Separate stage import, transform, light edits and camera changes in undoable stage history commands, retaining native Rust pattern undo.
6. Verify roundtrip scale (1.75 m avatar at origin), leg contact with platform, shadows, render material color, orbit without clipping, and export/import of real stage asset.

## CLO documentation used

- [CLO Scene and Render Properties (ZSE)](https://support.clo3d.com/hc/en-us/articles/18815004542873-Scene-and-Render-Properties-File-ZSE): imports OBJ scenes, optional collision, materials, visibility, saved render configurations, save/open .zse.
- [CLO New Library beta](https://support.clo3d.com/hc/en-us/articles/38939105493785-New-Library-Beta): library group Scene, previews, dragging/double-click to open assets, custom collection folders.
- [CLO import OBJ](https://support.clo3d.com/hc/en-us/articles/115012226667-Import-OBJ): open/add import, Object Type, scale, axis and translation.
- [CLO file formats](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats): .zse asset and camera/light/render settings.
- [CLO custom stage forum](https://support.clo3d.com/hc/en-us/community/posts/4404298083737-Self-made-Stage): recommends static OBJ stages rather than simulated pattern walls.
- [CLO product overview](https://www.clo3d.com/en/product/clo): 2D pattern changes reflected in 3D garment.

## Review gate

The Blender scene and renders are only the design prototype. Wait for explicit aesthetic/functional approval before adding a stage preset, GLB, new toolbar actions, or modifying the installed EXO application.

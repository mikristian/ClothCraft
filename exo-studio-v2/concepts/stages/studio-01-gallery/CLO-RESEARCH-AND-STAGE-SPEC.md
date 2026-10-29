# EXO Gallery Studio 01 · CLO workflow research & draft integration specification

**Status:** Blender concept under review. Do not install in EXO or overwrite any production stage until the design is approved.

## Verified CLO behavior (official documentation)

- **Scene assets:** CLO's current **Scene and Render Properties File (`.zse`)** saves imported 3D scene/props objects and render settings as a reusable scene. Loading can use Open/Add, and users can choose which scene/prop/render objects to load. Each scene object can be shown/hidden, have materials changed, and can optionally enable garment collision. Source: https://support.clo3d.com/hc/en-us/articles/18815004542873-Scene-and-Render-Properties-File-ZSE
- **Workspace:** CLO keeps its 3D garment simulator and 2D pattern workspace. Stage props are visual scene assets used with garments and avatars rather than a separate garment editing document. Official 3D window: https://support.clo3d.com/hc/en-us/articles/115000390088-3D-Window . Interface overview: https://support.clo3d.com/hc/en-us/article_attachments/48293801440281
- **Asset discovery:** Current New Library categorizes items under Garment, Avatar, Fabric, Trim, and **Scene**, with double-click or drag/drop loading and a larger preview. Source: https://support.clo3d.com/hc/en-us/articles/38939105493785-New-Library-Beta
- **Stage geometry import:** OBJ can import 3D content, and COLLADA import supports Prop/Scene. Scene renders and meshes are distinct from garment simulation. Sources: https://support.clo3d.com/hc/en-us/articles/115000494107-3D-File-OBJ-Import-Export and https://support.clo3d.com/hc/en-us/articles/115000531948-3D-File-COLLADA-Import
- **Camera presets:** Current Custom View supports saving named camera positions; View Only moves just the camera, while View with Display Settings also changes viewport display settings. Source: https://support.clo3d.com/hc/en-us/articles/115004420828-Custom-View
- **Camera navigation:** The 3D viewport offers Front/Back/Left/Right/3/4/Top directional viewpoints; scene does not need to change to rotate around a garment. Source: https://support.clo3d.com/hc/en-us/articles/115000446087-3D-Garment-View-Controls
- **Rendering:** Interactive and final render support lighting/material adjustments for garment images; a scene can supply its own lighting presets. Source: https://support.clo3d.com/hc/en-us/articles/115014784747-Run-V-Ray-Render
- **Project persistence:** CLO Project `.zprj` includes garments, avatars, environments, camera, lighting, simulation, and other document information. Source: https://support.clo3d.com/hc/en-us/articles/115002686988-Project-File-ZPRJ-Open-Add-Save

## Gallery Studio 01 · draft design

- **Material language:** honed gray limestone fluting, graphite anodized structures, subtle brushed champagne-metal trim, dark walkable platform. The reliefs are non-arched so the garment silhouette stays central. Minimal lettering, independent of garment brand.
- **Scale:** 1 Blender unit = 1 metre. `Z` is up in Blender and `Y` is up after glTF export into Three.js. Avatar feet anchor `(0,0,0)`; elevated-looking podium top is exactly zero. Recessed stage structure extends *below* the foot plane to avoid avatar floating.
- **Photographic rig:** warm large left key, cooler right fill, overhead garment light and restrained rear rim. Color/materials editable in Blender, with front, editorial three-quarter, and side camera objects.
- **Reference geometry:** real CLO Thomas avatar reference mesh and a rough *proxy* garment are stored in a separate preview collection. This is **not** the active EXO garment, simulation, or final preview. It is **excluded** from the exported architecture GLB.
- **Source:** `gallery-studio-01-v3-REVIEW.blend` is the newest user-review file. The editable intermediate `gallery-studio-01-v2.blend` and original `gallery-studio-01.blend` remain accessible.
- **Draft geometry:** `gallery-studio-01-v2-STAGE-ONLY-DRAFT.glb` remains in this concept directory. It is not installed in `public/stage-scenes` and not selectable as an EXO production preset.

## Behavior to implement after user approval

1. Choose stage in the Stage/Scene library. The existing 2D pattern panel and 3D avatar/garment panel stay visible; switch only stage environment, floor, and lighting selection.
2. Correctly align the scene's `feetAnchor` to the native avatar's feet when garments are already simulated; never move garment transforms by stage switch. Maintain same 2D pattern editing tools and native Rust simulation.
3. Scene object selection shows materials, transforms, visibility, shadow receive/cast, and optional collision under Scene object details, without taking over the inspector when garment tools are in use.
4. Provide native 3D orbit/pan/zoom plus saved stage cameras (Front, Back, Left, Right, Editorial 3/4, Side, Top). Camera changes must preserve the garment and undo stack.
5. Save stage preset ID, stage transform, lighting/render overrides and last camera into project snapshot; load separately from garment/pattern document. Export stage source/provenance and retain editable Blender source.
6. Make stage geometries performance-safe: mesh counts, textures, shadows, and memory; GLB import errors restore plain floor with notice. Stage actor-preview geometry is not exported.
7. Stage/material/property changes that mutate a document must create one coherent undo transaction; Cmd+Z reverses the latest user edit and Cmd+Shift+Z redoes it. Camera orbit is view state rather than a garment edit.
8. Validate with one native garment: baseline workspace 2D/3D, load stage, edit 2D polygon, see 3D shape update, edit material, run simulation, undo, switch camera, save/reload, then test optional collision. Confirm no avatar floor penetration or foot floating.

**Approval gate:** do not wire this or other stages into active application until Gallery 01 receives visual approval.

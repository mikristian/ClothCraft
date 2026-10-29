# CLO CONNECT community research → EXO feature and Blender staging opportunities

Research date: 2026-10-16. Scope: publicly indexable CLO CONNECT 2025–2026 discussions, separate legacy CLO Help Center discussions, and selected r/CLO3D reactions. This is qualitative issue discovery, not a census of all comments or proof of issue prevalence. Verify actual asset preview and licenses before distributing copied imagery. See `forum-evidence.md` and `visual-references.md` for item-level evidence.

## Immediate priorities

| Priority | EXO opportunity | Triggering user need | Proposed acceptance check |
| --- | --- | --- | --- |
| P0 | Reliable measurement/grade round-trip | Need accurate sizing across related patterns and exported DXF/PDF | Grade three sizes, save/reload and reimport DXF, then compare seams, custom allowances, POM, notches with recorded tolerances |
| P0 | Collision and layering diagnostics | Cloth intersections, underarm clipping, fabric fall-through | Reproducible examples with visual collision overlay, normals, clearance, solver version and before/after recorded results |
| P0 | Safe local AI editing commands | GPT-6 Astra community workflow: human establishes target, AI performs small repeatable tasks with readback | Create and rename a pattern, edit a defined dimension, save, reload, compare exact coordinates; confirm untouched pattern checksums |
| P0 | Clear save/export validity | User uncertainty about export fidelity | Post-export import validator for OBJ, FBX, GLB, DXF and editable project; UV, units, patterns, shader materials, custom allowances |
| P1 | AI stage-gated agent with regression ledger | Long context tasks recur and overwrite confirmed manual edits | Per-operation change preview, expected object ID, tool execution log, undo, snapshot, user-reviewed verification |
| P1 | Fabric matching + material provenance | Repeated textures, size/placement, accurate simulation vs appearance | Reference-based candidate match; separate estimated physical stretch/shear/bending from visual maps and retain supplier/reference metadata |
| P1 | Blender hardware and accessories bridge | Requested buttons/buckles/shoes while other garment stages continue | Round-trip linked accessory with persisted scale, orientation, UVs, PBR and geometry, plus explicit unsupported contact behavior |
| P1 | Scene builder rather than lighting-only presets | Catwalks, rooms, editorials for fashion render workflows | One-click room assembly, editable props, focal lengths and three-point lights; export .blend and camera stills |
| P1 | Performance profiles and render budget | Long CPU/GPU simulation and video rendering complaints | Fast preview / high quality mode toggles; profiler reports effective renderer, frame time, VRAM estimate and scene complexity |
| P2 | Render presets for editorial storytelling | Creating film and campaign images from garments | Five runway compositions and 15 studios, each camera, room, material, exposure and lighting settings |
| P2 | Contextual CLO workflow assistant | Difficult controls and repeated how-to requests | Explain selected control and show safe next actions tied to version-specific application help |
| P2 | Workflow replay + reusable Skills | AI agent makes the same known mistakes in long garment runs | Verified pattern task recipes replay across two sessions with explicit version and avatar checks |

### Specific sources behind the priorities

- Oct. 2026, creator walkthrough: [GPT-6 Astra / GPT-6.1 Sol + MD: MCP Setup and a Practical Patternmaking Workflow](https://connect.clo-set.com/community/post/b28130de75f2473f959414c687f3cdd2). Describes local MCP service + MD launcher, small verified pattern tasks, human-established target, preservation of manual edits, batched feedback, reusable Skills, and Blender accessory work. This is independently built by a community user, not a native officially released MD MCP server.
- The [official Marvelous Designer Python API](https://developer.marvelousdesigner.com/) documents the scripting interfaces; [plug-in registration](https://developer.marvelousdesigner.com/register.html) now lists Python `.py` plugins for Windows and macOS. Actual API availability is tied to installed version and supported methods.
- Jan. 2026, [CONNECT DXF compatibility question](https://connect.clo-set.com/community/post/5d0dee24ec86494a83eaa92fc6626900); April 2026 [custom parametric pattern request](https://connect.clo-set.com/community/post/756fedabbc6e45278bf25785e56459cb); Feb. 2026 [graded PDF issue](https://connect.clo-set.com/community/post/69c1d7711cc74a31b7e6d35d309eec19).
- May 2026, [CLO/MD garment collision question](https://connect.clo-set.com/community/post/3e26ee68bc2b4a77b3b8c1b44876b2bc), where a community participant suggests checking Strengthen, layer settings, collision thickness and pose. These are troubleshooting suggestions, not proof of a solver defect.
- August 2026, [r/CLO3D custom seam allowance DXF export report](https://www.reddit.com/r/CLO3D/comments/1vs4dvy/i_like_the_upgraded_seam_allowance_properties_in/) and [render performance concern](https://www.reddit.com/r/CLO3D/comments/1vl7tij/i_cant_for_the_life_of_me_understand_why_this/). These are firsthand reports without independent reproduction.
- April 2026, [CLO/MD LiveSync advisory](https://connect.clo-set.com/community/post/f304775e730144ef827a984eb0834d7c) and [Failed to LiveUpdate report](https://connect.clo-set.com/community/post/c9f56a1c9fcd441ebf12ea5f2fe5556e). Prioritize version awareness and stable recovery paths.
- [CONNECT Scene & Prop authoring guide](https://support-connect.clo-set.com/hc/en-us/articles/45304285204633-Creating-Scene): supports background/props, lighting, custom views, ZSE, outward normals, UV preparation and material editing. This informs EXO interoperability and level-of-detail conventions; it does not grant asset reuse rights.

## A safe AI-integration sequence for EXO

1. Read scene and pattern graph with stable identifiers and an inventory of editable components. Record dimensions and checksums before changes.
2. Convert a request into scoped operations, such as moving one sleeve point or reassigning one fabric. Preview the target and expected result.
3. Execute a single reversible operation, then reread geometry, sewing links and selected settings. Save a checkpoint and compare untouched components.
4. Rebuild/simulate in stages and measure fit/collision where available. Do not infer garment fit from a thumbnail alone.
5. Create a reproducible operation log and attach a generated render/screenshot, file output, source asset provenance and pass/fail criteria.
6. Carry verified recipes forward as reusable skills while keeping uncertain advice as an experiment, not an automatic rule.

## Blender staging architecture (proposal, not implemented)

The existing EXO app currently presents `studio`, `softbox`, `neutral` and `dramatic` lighting presets. Build a separate `Stage Library` of mesh-based environments; a lighting preset and an actual 3D room are distinct concepts.

Each Stage should be described by: `id`, `referenceSourceUrl`, `category`, `units=m`, `floor`, `walls`, `ceiling`, `backdrop`, `meshProps`, `materialSlots`, `riggedLights`, `cameraRig`, `renderSettings`, `thumbnail`, `licenseNote` and `geometryBudget`. Every scene should be editable in Blender and allow the garment/avatar as a replaceable collection at a repeatable origin with reliable ground contact. For full EXO integration, consider saving those data as JSON and generating scenes using `bpy`.

### Five catwalk reconstruction targets

1. **Industrial fashion runway:** warehouse shell, long dark runway, paired truss uplights, glossy black floor, narrow 50–85 mm lens. [CONNECT Industrial Stage](https://connect.clo-set.com/detail/a37277da3c6c4d28be123f4ba77bbd9a).
2. **Circular presentation:** round central platform, full 360° rim lighting, low angled cameras, gradient backdrop. [Kev-in-DESIGN scene 31](https://connect.clo-set.com/detail/9cd729d4e27746daa268b793ba52ffe0).
3. **Outdoor landscape catwalk:** elevated runway, mountain silhouette, natural sky key light, mist/haze layers. [Mountain runway scene](https://connect.clo-set.com/detail/28aad02e57414a63a27d0aa8545c901c).
4. **Mirror / molded classic:** repeating wall molding or framed mirrored panels, controlled edge lighting, low-contrast floor reflections. [Side Molding Mirror Stage](https://connect.clo-set.com/detail/c4b283e416ed462ca376fc135b17c736).
5. **Minimal straight runway:** central lane and a simple depth gradient, soft overhead strips, camera on runway axis. [Free runway stage](https://connect.clo-set.com/detail/fb6d66aa35f54fd69069f987a7499813).

### Fifteen distinct editorial-room design slots

These are **suggested reconstruction recipes**, not claims about 15 particular CONNECT products; map each to a verified item in `visual-references.md`.

| Slot | Intended look | Blender primitives / lighting |
| --- | --- | --- |
| 01 | Warm neutral cyclorama | Curved seamless background, beige matte shader, large overhead key and fill |
| 02 | White seamless e-commerce | White floor/cove, frontal octabox, two rim strip lights, 85 mm camera |
| 03 | Editorial concrete gallery | Poured-concrete walls, 6 m room, single side window light, diffuse bounce |
| 04 | Pink architectural studio | Dusty-pink sculptural walls, plinth, soft shadow under broad key |
| 05 | Black reflective showroom | Deep charcoal walls, high-polish floor, two grazing strip lights |
| 06 | Stainless industrial loft | Brushed metal wall, exposed ducts, industrial trusses, hard shafts of light |
| 07 | Royal classical salon | Paneled walls, tall trim, ornate fabric, warm practical lamps and soft fill |
| 08 | Sunlit plant atelier | Windows, plant silhouettes, natural boards/stone, 5500 K sun+area |
| 09 | Monochrome box studio | Cubes/rectangular plinths, tone-on-tone materials, spotlight pool |
| 10 | Retro photo studio | Colored paper rolls, umbrella softboxes, stands and gobos |
| 11 | Stone minimalist atrium | Stone arches/columns, large roof skylight, thin ground haze |
| 12 | Architectural shadow room | Long rectangles cut into walls, linear sunlight shafts, dark textured floor |
| 13 | LED light tunnel | Repeating RGBW strips, black panels, perspective-leading camera |
| 14 | Curtain editorial | Heavy fabric drapes, raised plinth, practical side sconces, cinematic rim |
| 15 | Gallery corner / mirror | Two reflective corner walls, textured plaster floor, diffuse top fill |

For references in a commercial deliverable, reproduce the *lighting vocabulary, camera language and generic architecture* using newly authored Blender geometry. Do not redistribute seller preview images or reconstruct unique purchased model assets as direct substitutes without checking the relevant licence. Public item thumbnails are inspiration evidence only.

## Verification gates for a future implementation loop

- 20 distinct reachable reference listing URLs total (five runway, fifteen stage/editorial) and thumbnail provenance; validate all links and mark unavailable media accurately.
- Each prototype opens in Blender with no missing external textures, a camera, minimum key+fill+rim lighting, a visible reference garment at true meter scale and one 1920×1080 render.
- Maintain a clean alternate preview mode with low samples and lower resolution for iterating quickly, and measure render time before expanding quality.
- Use scene collection instancing and shared meshes/materials for large galleries; do not preload all 20 high-resolution image references in a live viewport.

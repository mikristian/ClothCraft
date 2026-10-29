# Garment library to curved native 3D: pants and sewing audit

## Existing interfaces

- `blender_bridge/fixtures/pants.garment.json` is a complete 2D project fixture: four cut panels (`pants-left-front`, `pants-left-back`, `pants-right-front`, `pants-right-back`), ten named seam pairs, avatar, fabric and simulation settings. Each piece has `points` (centimeters), `layout2d`, `arrangement3d:{x,y,z,wrap,flip}`, `fabricId`, markings and flags. Supported pants wraps are `left-leg-front`, `left-leg-back`, `right-leg-front`, `right-leg-back`.
- Each seam has `{id,name,a:{pieceId,edgeIndex},b:{pieceId,edgeIndex},junctionScale}`; partial segments additionally support `startT` and `endT` on endpoints. `src/core/sewingConstruction.js` validates edge references, overlap and cutline lengths; its audit reports physical fit as uncertified.
- `src/core/physics.js:226-402` maps a 2D sample to a **curved avatar-relative 3D location**. In the leg branch, horizontal cutline position maps through signed front/back angles, variable leg cross sections and a smooth upper-thigh/pelvis transition. This is the working general 2D-to-curved-native path for recognized anatomical wrap roles. `buildSimulation(project)` generates mesh particles and sewing constraints; `src/core/backends/nativePayload.js:54-205` sends those positions, flat reference meshes, seam constraints and weighted virtual seams to the native XPBD backend. The native preflight in `src/core/backends/nativeAssemblyPreflight.js` checks initial seam gaps and mesh strain.
- `src/core/garmentCode.js:60-140,250-309` converts project pieces to GarmentCode `pattern.panels[name]={translation,rotation,vertices,edges,label}`, `pattern.stitches` and an extension preserving full project data. `garmentCodeToProject()` restores piece and seam data; for bare GarmentCode inputs, translation alone produces an arrangement with `wrap:null` and `flip:false`.
- `src/core/nativeProjectLibraryBridge.js` only transports `capture` and `open` events for the mounted Rust editor. It does not infer anatomy or generate curvature. `src/core/garmentPreviewGeometry.js` presents specialized curved tees but puts every other garment into a generic display grid; that preview is presentation geometry, not the native simulation starting pose.

## Source-curved CLO garments versus synthesized staging

The authoritative CLO Male T-shirt source is represented by `public/garment-previews/clo-male-tshirt.v1.json`, linked to editable panels by `sourceCloBlock` in `src/data/cloMaleTshirtPattern.json`. `scripts/extract-clo-garment-preview.mjs` accepts source OBJ and optional XML sewing metadata and preserves source vertex coordinates, UVs, faces, group identities and ordered sewing guide pairs. `src/core/cloGarmentSourcePreview.js` renders those **already-curved authored meshes** and toggles assembled/separated display transforms. It currently hardcodes seven T-shirt panel IDs in `INSPECTION_POSES`, so the extraction format is general but exploded arrangement is not yet general. Per `docs/CLO_GARMENT_SOURCE_PREVIEW_PIPELINE_2026-10-17.md`, the reference has 3,661 vertices, 6,876 triangles, seven groups, and 23 source sewing groups. The 2D pattern edits do not update the OBJ mesh and source stitch guides are not native sewing constraints; `simulatedFitCertified:false` is intentional.

## Concrete coverage gaps

1. Generic imported 2D patterns do not assign `arrangement3d.wrap` and anatomical side/limb automatically. The physics path is ready for known roles, but fallback imports with `wrap:null` cannot promise a body-relative sewing pose.
2. Generic garment library preview fallback uses a tile/grid composition, not the physics initialization; pants fixture curved around legs in simulation can appear as separated flat sheets in preview.
3. Source CLO previews retain accurate authored curvature but edits to 2D contour, sewing geometry and fabric cannot yet regenerate or rebind their native simulation mesh. A source panel ID-to-2D edge-to-OBJ boundary mapping and verified stitch resampling is needed.
4. Source CLO exploded pose uses hardcoded T-shirt pieces; any new CLO trouser fixture would fail `Unknown CLO male T-shirt source panel` in separated mode.
5. Native preflight measures gap/strain but no generic role inference or optimization currently guarantees seam adjacency, freedom from self-intersections or fabric clearance for arbitrary imported silhouettes.

## Recommended shared conversion shape

Keep the existing `pieces`, `seams`, `arrangement3d`, fabrics and avatar contract as canonical, and add an **optional derived arrangement descriptor** keyed by stable piece IDs, e.g. `{pieceId:'pants-left-front', role:'leg', side:'left', face:'front', wrap:'left-leg-front', clearanceM:0.012, source:'inferred', confidence:0.94}`. Do not overwrite user-authored placement. Resolve role from explicit garment template metadata or matching sewing graph and geometry, then create a sampled body-relative placement with the existing physics function, retaining original 2D points and edge numbers. Validate through `auditSewingConstruction`, `buildNativeSimulationPayload` and `inspectNativeAssemblyPose`. For imported CLO assets, attach source group and vertex/edge correspondence, preserve authored 3D surfaces as visual truth, and promote sewing pairs to constraints only after validating their edge topology.

## Repro fixture and acceptance checks

Use `blender_bridge/fixtures/pants.garment.json`: four panels each with seven points, ten sewing pairs (four on each leg and front/back rises), 390 gsm rigid denim, 180 cm avatar and named four-leg wraps. Assert preserved source outlines and seam IDs, distinct left/right and front/back placement, curved non-coplanar world coordinates, finite particle positions, and native gap/strain preflight values. Record seam and fit metrics rather than requiring arbitrary thresholds until the baseline is measured. Compare reset assembled pose against CLO source tee separately; its source mesh is a reference preview, not proof of solved fit.

This is a read-only source audit. No production code or project fixtures were changed.

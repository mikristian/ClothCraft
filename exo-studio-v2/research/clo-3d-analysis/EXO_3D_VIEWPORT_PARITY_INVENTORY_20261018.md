# EXO native 3D viewport: CLO / Marvelous Designer parity inventory

**Date:** 2026-10-18. **Scope:** EXO ClothCraft V2 3D viewport, toolbar, pre-simulation arrangement, simulation, overlays, garment and avatar presentation. **Type:** static code and official-documentation audit; no claims of an interactive CLO or live EXO test.

## Evidence convention and important boundaries

- **D (documented)**: a behavior stated by an official CLO or Marvelous Designer manual page linked below.
- **V (verified in EXO source)**: a function or UI path directly located in repository source on 2026-10-18. This confirms implementation exists in code, **not** correctness of its live execution.
- **P (partial in EXO source)**: a narrower feature exists than the referenced CLO workflow.
- **U (unverified)**: no corresponding complete implementation confirmed in inspected sources. This means *not verified by this audit*, not globally absent from the entire product.
- **T (requires live test)**: the code suggests behavior but geometry, persistence, physical accuracy, accessibility, cross-viewport sync or deployment state require an actual application run.

**Repository inspected:** `src/components/ClothCraftSceneV2.jsx`, `src/components/ClothCraftWorkspace.jsx`, `src/components/Clo3DReferenceToolbar.jsx`, `integrations/clothcraft/exo-session.rs`. The native Swift shell, full toolbar registry, Rust solver internals, bundled CLO installer, and all JSX call sites are not exhaustively audited here. Dirty working tree was preserved. Source references below describe the inspected snapshot, which can change during parallel development.

## Official references, selected primary sources

1. [CLO: 3D Vertical Toggle Icons](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) — garment, avatar, lighting, shadow, grid, render and diagnostic display families (D).
2. [CLO: Pattern 3D Arrangement](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement) — arrangement, transformations, positioning, superimposition, redrape and reset (D).
3. [CLO: Arrange Pattern with Arrangement Points / Flip Wrap Direction](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction) — body bounding-volume curves, arrangement-point previews, symmetric arrangement, and flipped wrap direction (D).
4. [CLO: Select/Move (3D)](https://support.clo3d.com/hc/en-us/articles/360000012987-Select-Move-3D) — interaction differs while simulation is playing versus stopped (D).
5. [CLO: Simulation](https://support.clo3d.com/hc/en-us/articles/53856382869657-Simulation) — gravity, seams, CPU/GPU Normal/Fitting/Animation presets (D).
6. [CLO: Garment Fit Maps](https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps) — stress, strain, fit and pressure as distinct diagnostics (D).
7. [CLO: Strain Map details](https://support.clo3d.com/hc/en-us/articles/56500755006617--Fit-Map-Strain-Map) — global and fabric-specific scales, selectable mesh-point values, warp/weft/bias interpretation (D).
8. [CLO: Tack on Garment](https://support.clo3d.com/hc/en-us/articles/115000511548--3D-Tool-Tack-on-Garment) — paired 3D points, corresponding 2D relationship, constraints upon simulation (D).
9. [CLO: fit a 3D garment](https://support.clo3d.com/hc/en-us/articles/115013660447-How-do-you-fit-3D-Garments-in-CLO) — use sewn patterns, avatar, drape, garment measurements and fit displays (D).
10. [CLO manual category](https://support.clo3d.com/hc/en-us/categories/115000064648-%EB%A9%94%EB%89%B4%EC%96%BC) — 3D design, mesh/PIN, simulation and 3D arrangement chapter inventory (D).
11. [Marvelous Designer: 3D Window Environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment) — viewport camera, isolate selection, fit maps, schematic render, mesh, x-ray joints, statistics, wind and grid (D).
12. [Marvelous Designer manual](https://support.marvelousdesigner.com/hc/en-us/categories/51985515993625-Manual) — current category inventory and animation/avatar feature families (D).
13. [CLO: OBJ Trim](https://support.clo3d.com/hc/en-us/articles/13261774963737-OBJ-Trim) — trim selection, 3D gizmo positioning, material, collision and simulation (D).

**Version warning:** CLO documentation aggregates features from different versions; the EXO reference toolbar mentions CLO 7 and the Marvelous Designer manual includes 2025/2026 additions. A credible parity target must name its baseline version per feature. Do not assume all controls coexist in the CLO 7 installation.

## Working EXO viewport foundation (code verified)

| ID | Current finding | Evidence and implication |
|---|---|---|
| EXO-01 | **V** Three.js WebGL renderer, perspective camera, ACES tone mapping, lights and shadows | `ClothCraftSceneV2.jsx:148-155`; physically based visual shell exists, material accuracy requires T |
| EXO-02 | **V** OrbitControls with damping, framing and explicit camera view buttons | `ClothCraftSceneV2.jsx:164-167,1738-1768`; camera UX is real but comprehensive camera presets/bookmarks unverified |
| EXO-03 | **V** TransformControls and gizmo-center metadata | `ClothCraftSceneV2.jsx:217,460-485`; test drag in stopped simulation and persistence on snapshot refresh |
| EXO-04 | **V** Ground grid and center guide | `ClothCraftSceneV2.jsx:187-200`; the center guide is a floor axis, not anatomical guides drawn across the avatar |
| EXO-05 | **V** Cloth mesh, seams, boundaries, dots and avatar grouped separately | `ClothCraftSceneV2.jsx:202-213,1322-1520`; enough geometry to support category-specific display modes |
| EXO-06 | **V** Avatar visibility, seams, contact dots and wireframe controls | `ClothCraftWorkspace.jsx:106-114,1514-1540`; display switches exist and affect mesh visibility |
| EXO-07 | **V** Native garment and avatar measurement point tools | `ClothCraftSceneV2.jsx:317-369`; anatomical calibration, repeatable 3D POM, exported dimensions require T |
| EXO-08 | **V** Internal line drawing projected onto cloth, mesh brush and pointer raycasts | `ClothCraftSceneV2.jsx:272-295,386-456`; check edits commit back to canonical 2D geometry |
| EXO-09 | **V** Strain-like principal extension color mapping | `ClothCraftSceneV2.jsx:1340-1361,1756`; explicit legend says blue 0 to red 25%+, and **not stress/pressure** |
| EXO-10 | **V** Color-batched seam guide markers with sampled correspondence links | `ClothCraftSceneV2.jsx:1469-1508`; sampled links are not yet evidence of full CLO seam-pair/segment rendering or sewing-direction annotations |
| EXO-11 | **V** Solver stepping, play/pause and native workspace protocol | `ClothCraftWorkspace.jsx:463-465,739-798,948,1009`; correctness of contacts, convergence and lifecycle requires T |
| EXO-12 | **V** Distinction between authored pre-drape Place and post-simulation reposition | `ClothCraftWorkspace.jsx:1193-1210`, `exo-session.rs:357-413`; confirms primitive interaction distinction; body-conforming wrap is still U |
| EXO-13 | **V** Native OBJ export marked reference-only | `ClothCraftWorkspace.jsx:1132`; don't treat visual mesh output as validated manufacturing fit |
| EXO-14 | **V** Named 3D editing column A/B with data-driven slots and active tool states | `Clo3DReferenceToolbar.jsx:6-25,59-83,128-178`; showing a toolbar button is not itself evidence that every action commits geometry |
| EXO-15 | **V** Camera hand gesture/cloth-grab pointer route | `ClothCraftSceneV2.jsx:695-731`; physical hand interaction and host camera widget UX require T |

## Feature-by-feature parity matrix

Priority **P0** means critical to the user's 3D pattern-placement and sewing workflow, **P1** means serious viewport parity, **P2** means extended capability. “Acceptance” denotes a test to run on current EXO before claiming a feature complete.

| ID | Priority | Official CLO/MD behavior (D) | EXO evidence level | Acceptance test / required outcome |
|---|---|---|---|---|
| ARR-01 | P0 | Arrangement points around avatar bounding volume; hover placement preview [3] | **U** body-specific point set; **V** avatar mesh | Toggle landmarks and hover each; preview rotates and lies tangent to anatomical body region |
| ARR-02 | P0 | Piece wraps along body curvature before simulate [3] | **U** curved wrap from source inspection | T-shirt front/back/sleeve panels visibly bend around chest/upper arm while simulation is paused; maintain scale/UV |
| ARR-03 | P0 | Gizmo translation/rotation and property precision [2,3] | **P** transform exists [EXO-03] | Move 5 cm and rotate 15° with typed values; select other piece; reload; exact placement persists |
| ARR-04 | P0 | Flip Wrap Direction and symmetric arrangement [3] | **U** | Reverse cuff wrap and mirror sleeve placement without changing shape or seam orientation |
| ARR-05 | P0 | Smart Arrangement, superimpose, direct positioning, redrape [2] | **U/P** placement is implemented; semantics unclear | Add patch pocket above simulated body, align and redrape while underlying panel stays intact |
| ARR-06 | P0 | Distinct paused arrangement vs simulated fabric grabbing [4] | **P** differentiated Place and stretch [EXO-12] | Pause, move rigidly; simulate, tug fabric; confirm resulting motion and undo differ appropriately |
| SEW-01 | P0 | 3D seam correspondence and 2D paired seam representation [5,8] | **P** sampled guides [EXO-10] | With 2 sleeve seams and hem, display *every* pair, consistent hue, matching identity labels and no crossed guides |
| SEW-02 | P0 | Sewing direction, start/end, segment mismatch and live sew progress | **U** for comprehensive overlays | Reverse seam one side and flag direction mismatch; reveal full start/end arrows and matching 2D colors |
| SEW-03 | P0 | 3D Tack linking two garment points and 2D link [8] | **U** complete tack workflow | Place two tack points, assert persistent 2D object, simulate and verify pair remains attached |
| SEW-04 | P1 | Pin/fix garment, unpin, soft selection and brush manipulation [10,11] | **P** mesh brush and solver pin references | Pin mid-sleeve, gravity-test, release and inspect unpin persistence |
| GUIDE-01 | P0 | Avatar-centric placement and fitting landmarks implied by arrangement [3,9] | **U** chest/waist/navel reference overlay | Show front/back centerline, chest, waist, navel and cross-body lines; correct front/back occlusion and rescale |
| GUIDE-02 | P0 | Avatar guides align with garment 3D references | **U** | Rotate body to profile; chest and waist lines follow 3D anatomy; numbers keep correct cm units |
| GUIDE-03 | P1 | Viewable avatar surface styles and show mesh [1] | **P** avatar show/hide exists | Textured, neutral, semi-transparent, mesh and hidden avatar states toggle independently |
| VIEW-01 | P1 | Camera orbit, zoom, pan, framing, distinct viewpoints [11] | **P** orbit/framing implemented | Orbit around selection, front/right/back/top presets, reset to avatar; no clipping during near zoom |
| VIEW-02 | P1 | Isolate selection, show grid, floor/shadows/lights/wind controllers [1,11] | **P** grid, floor and lights | Isolate selected sleeve; re-show all; independently toggle ground/shadow/light/wind and preserve view |
| VIEW-03 | P1 | Wireframe, garment textured surface, avatar mesh, render options [1,11] | **P** wireframe and Three material rendering | Validate textured PBR, wireframe, solid, transparent, thick fabric and reliable selection highlight |
| VIEW-04 | P1 | Render/schematic modes, photo lights, camera scene [1,11] | **P** scene lighting and render options exist | Change environment and lights without modifying fabric physical coefficients |
| FIT-01 | P0 | Stress (kPa), strain (%), fit categories and pressure (avatar load) maps [6] | **P** principal-extension visualization only | Four unique modes with physically named quantities, legends, probe values and clear no-data states |
| FIT-02 | P1 | Strain scale global vs fabric and probe warp/weft/bias [7] | **U** | Probe selected triangle; report stretch axis, raw extension, fabric-limit ratio, configurable legend |
| FIT-03 | P1 | Garment measurement and avatar measurement [9] | **P** tool event handlers exist | Measure chest/waist/sleeve in 3D; repeat after sim; round-trip to saved POM as applicable |
| SIM-01 | P0 | Gravity drape + seam constraints [5] | **P** native solver connected | 2 panels with opposing seam endpoints join without through-body penetration; convergence measured |
| SIM-02 | P1 | CPU/GPU normal/fitting/animation modes [5] | **U** distinct quality/method presets | Expose solver capability as implemented, show selected backend/accuracy and reproducible convergence result |
| SIM-03 | P1 | Freeze/deactivate pieces, layering, collision and thickness behavior [5,13] | **U** complete interaction | Freeze a pocket while shirt falls; unfreeze and rerun; no unexpected seam detach |
| WIND-01 | P1 | Wind controller 3D visibility and controls [1,11] | **U** physical controller | Set vector, speed and turbulence, simulate hanging panel deflection and replay frame consistently |
| ANIM-01 | P2 | Stable animated cloth on moving avatar, timeline [5,12] | **U** full timeline | Import an avatar walk clip, scrub, cache and export animation while seams persist |
| AVA-01 | P1 | Avatar pose, measurements, fit and attachment workflows [9,12] | **P** avatar meshes and selection | Swap avatar and pose, preserve garment positioning, expose collision offsets and measured body landmarks |
| TOOL-01 | P0 | Complete 3D toolbar semantics [1,2,10,11] | **P** configurable columns [EXO-14] | Every visible slot runs a real target operation or clearly says unsupported; test shortcut, undo, persistence |
| TOOL-02 | P1 | Pattern selection, gizmo, contextual position controls [4] | **P** selection and transform | Select through fabric and from object list, multi-select and manipulate with coherent pivot/axes |
| REND-01 | P2 | Knits, fur strands, mesh preview, garment opacity [1] | **U** full modes | Same garment surface renders each material type without losing fitting/selection fidelity |
| REND-02 | P2 | Trim objects with materials, rigid/soft collision controls [13] | **P/U** graphics/hardware imported, physical trim parity unknown | Attach buckle to moving cloth and confirm position, weight and collision |

## Recommended execution order and design contracts

**Phase A: pre-simulation geometry (P0).** Define a canonical **3D arrangement state** per panel: `panelId`, `placementTarget` (avatar landmark or explicit pose), `transform`, `wrapDirection`, `surfaceOffset`, `normalOrientation`, `mirrorGroup`, and `sourceRevision`. The placement system should map each original flat panel mesh vertex onto a locally smooth body-conforming surface, respecting seam margins and face normals. Its pre-simulation display must remain distinguishable from solved cloth positions. Store the arrangement once and render it from canonical data rather than transient Three.js-only transforms. Use [2–4].

**Phase B: overlays (P0).** Implement separate overlay categories for (a) avatar anatomical guides, (b) 3D panel internal lines/notches/grainline, (c) paired sewing lines, labels, directions and correspondence dots, and (d) measurement marks. Assign stable semantic identifiers and color tokens to sewing relationships shared with the 2D editor. Current downsampled seam guides [EXO-10] cannot act as the authoritative sewing visualization. Make overlays independently toggleable and test visibility through front/back occlusion. Sources: [1,3,8,9].

**Phase C: fitting and simulations (P0/P1).** Treat principal extension, actual strain, stress, pressure, and categorical fit as separate quantities; never relabel an extension color ramp as a physical stress or pressure calculation. Implement map controls only where the solver supplies values with valid units. Provide explicit “not computed” state otherwise. Ensure each map is recalculated after sim, panel edit, avatar swap or fabric changes. Sources: [5–7].

**Phase D: toolbar integration (P1).** Put every 3D tool in one capability registry including tool ID, target viewport, icon, shortcut, mode prerequisites, edit/undo handler, persistent output type and test ID. The visible left columns should resolve to actual handlers, not mere labels. Audit hover groups from CLO 3D display options separately from editing tool slots. Sources: [1,2,10,11].

**Phase E: environment, animation and visual materials (P1/P2).** Separate render-only properties from physical fabric properties, expose camera presets, avatar display modes, floor/grid/shadow/light controller and optional wind effects. Add animation and diagnostic overlays after solver state propagation is stable. Sources: [1,5,11–13].

## End-to-end acceptance scenarios

**AT-01, paused T-shirt wrapping.** Load the baseline avatar and front, back, left/right sleeves. Enable arrangement landmarks. Choose left-chest for front; pattern follows torso curvature with no inverted normals. Assign back and sleeves at their corresponding contours. Disable simulate. Orbit 360°, and inspect projected seams and anatomical midlines. Save, reload and compare vertex positions and panel identities within a defined tolerance.

**AT-02, seam color and direction.** Create two visually crossing seam pairs, plus a deliberately reversed seam. In 2D and 3D, assert exact stable ID-to-color mapping and start/end direction marks. Toggle seam display, edit pattern geometry, undo and rerun; all annotations update without stale mapping.

**AT-03, solver transition.** With panels wrapping near the avatar but no intersections, enter simulation. Verify seam approach, collision behavior and final drape. Pause, drag and rotate a whole panel using arrangement mode as defined; resume. Then grab a fabric vertex while simulating: the resulting deformation must use cloth constraints and must not silently rewrite source pattern vertices.

**AT-04, body reference marks.** On the same avatar render a central chest vertical axis, horizontal chest level, waist level and navel reference. Check front, side and back orthographic views. Validate line placement tracks avatar pose/scale, depth occlusion and anatomical anchoring; refuse to present estimated landmarks as measured when none are provided.

**AT-05, diagnostics semantics.** Stretch fabric through a known displacement. Assert extension colors match computed local ratios. Stress and pressure toggles either show solver-derived values in correct units or a transparent unavailable state; strain probes report global/fabric scale metadata. Compare fit classifications only after an explicit calibrated fit model is available.

**AT-06, tool completeness.** Enumerate every visible 3D toolbar button. For each, assert click/shortcut triggers a registered action, active state is reflected, cancel or undo works where meaningful, and a snapshot reload preserves completed changes. Inactive tools must advertise unavailable status and explanatory tooltip.

**AT-07, visual settings.** Capture identical camera framing in wireframe, solid, textured, transparent and avatar-mesh modes. Toggle seams, grid, shadow and light independently and ensure no scene rebuild erases selections or resets positioning.

**AT-08, tack/pin.** Attach two draped fabric locations with tack, then pin a third to spatial position. Run simulation, verify only the expected constraints hold. Delete tack or pin and rerun; check both 2D representation and Rust serialization.

**AT-09, camera and performance.** Stress-test near and far clipping, orientation presets, orbit/pan zoom, selection behind translucent garment, dense seam overlays and 10x repeated snapshot rebuilds. Count meshes, GPU draw calls, frame timings and leaked event listeners; establish a baseline before optimizing.

**AT-10, manufacturer handoff boundary.** Export garment measurements, pattern dimensions and tech-pack snapshot. Differentiate physically validated values from appearance-only previews and report solver version, fabric preset, avatar dimensions and simulation state with the export.

## Unverified questions to resolve with live inspection

1. Does the currently installed CLO 7 specimen render garment arrangement points, bounding volumes and anatomical marks as the recent online manual describes? Capture version-labeled screenshots and record UI positions.
2. Which native EXO toolbar slots truly dispatch to solver-backed features versus visual modes and advertised controls? Inspect the actual registry and test on a saved project.
3. Does EXO currently serialize 3D placement transforms, seam markers, per-vertex pins and hand-drag state in the authoritative Rust snapshot?
4. Does the solver expose stress tensors, contact impulse/pressure, strain direction and collision data, or only positions and an extension-derived approximation?
5. Are camera, wind controller, avatar skin and render materials implemented elsewhere in Full EXO but not wired into the embedded native viewport?
6. Is the avatar topology annotated with standardized chest, waist, center-front, back-center and navel landmarks? If not, guides require a reproducible inferred surface projection plus a clear calibration workflow.
7. Which Marvelous Designer 2025/2026 features are explicitly beyond the chosen CLO 7 baseline, and which should become EXO enhancements?

**Audit conclusion:** The present inspected code supplies a capable interactive 3D renderer and several substantive garment tools. Source review does **not** establish feature-complete CLO parity. The most consequential gaps for the user's current workflow are canonical curved placement before simulation, true body-reference overlays, full-colored sewing path semantics and four scientifically distinct fitting maps. The acceptance scenarios above give the team reproducible proof requirements without attributing untested capabilities to EXO.

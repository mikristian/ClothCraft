# CLO 3D Window — 125-Page Engineering Research and Implementation Reference

**18 October 2026 · EXO ClothCraft V2 · research specification, not implementation certification**

This volume combines verified repository evidence, prior real CLO 7.0.242 inspection and exported garment geometry, and engineering proposals. Each numbered section is an explicit logical research page; page numbers are not claims about printed paper pagination. **V** = observed in project/installed CLO evidence, **D** = documented in official source, **E** = proposed engineering requirement, **U** = unverified behavior requiring controlled QA.

## Source index

- CLO manual: https://support.clo3d.com/hc/en-us/categories/115000064648-Manual
- CLO product features: https://clo3d.com/en/product/features
- Marvelous Designer release: https://www.marvelousdesigner.com/products/release
- CLO official help search: https://support.clo3d.com/hc/en-us/search?utf8=%E2%9C%93&query=arrangement%20points
- Repository baseline: `docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md`, `docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md`, `docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md`, `src/components/ClothCraftSceneV2.jsx`, `src/core/nativePreDrapeCurvature.js`.

**Critical quantitative finding (V):** the exported CLO example contains seven independent pattern groups, 23 sewing groups and 182 sampled stitch correspondences. Its arranged pose still has a maximum stitch separation of 36.804 cm; EXO's separately validated Thomas pose has a worst gap of 18.742 cm, exceeding its own 3 cm PPF preflight. Visual pre-arrangement must therefore be assessed independently from solver readiness.

## Page index
- 001: Viewport scene graph
- 002: Camera orbit and orthographic modes
- 003: Framing avatar and garment
- 004: Panel picking and selection
- 005: 3D gizmos and transforms
- 006: Arrangement point data model
- 007: Arrangement bounding volumes
- 008: Body coordinate frames
- 009: Torso cylindrical initialization
- 010: Torso anatomically varying curvature
- 011: Shoulder and clavicle staging
- 012: Neckline placement
- 013: Sleeve arm-axis alignment
- 014: Cuff and hem staging
- 015: Front and back panel orientation
- 016: Inside-out pattern normals
- 017: Pattern-to-avatar clearance
- 018: Pattern curvature and rest length
- 019: Staging collision validation
- 020: Pre-simulation sewing gaps
- 021: Staged sewing and convergence
- 022: Seam color palette
- 023: Seam pair identity
- 024: Thread link visibility
- 025: Seam direction arrows
- 026: Segment sewing in 3D
- 027: Free sewing in 3D
- 028: Auto sewing review
- 029: Seam length mismatch
- 030: Sewing diagnostic overlays
- 031: Notches and correspondence
- 032: Internal lines projected on cloth
- 033: Pattern baselines in 3D
- 034: Center front line
- 035: Center back line
- 036: Chest horizontal line
- 037: Waist and navel line
- 038: Hip line
- 039: Shoulder reference line
- 040: Bust and underbust lines
- 041: Armhole reference curves
- 042: Sleeve bicep and elbow lines
- 043: Avatar measurement tape
- 044: Avatar landmarks and joints
- 045: Garment measurement overlays
- 046: Body guide snapping
- 047: Guide visibility controls
- 048: Guide occlusion and depth
- 049: Guide persistence and undo
- 050: Avatar posture and pose
- 051: Avatar body measurements
- 052: Skin collider synchronization
- 053: Arrangement on avatar change
- 054: Simulation start and pause
- 055: Simulation presets and quality
- 056: Particle distance and mesh density
- 057: Gravity and damping
- 058: Stretch and shear response
- 059: Bending stiffness
- 060: Thickness and collision offsets
- 061: Self-collision handling
- 062: Layer ordering
- 063: Seam and contact coupling
- 064: Continuous collision detection
- 065: Pin and tack interactions
- 066: Grab and pull interactions
- 067: Pressure and fit mapping
- 068: Stress and strain heatmaps
- 069: Contact visualization
- 070: Transparency and x-ray
- 071: Wireframe and mesh edges
- 072: Normals and backface display
- 073: Material texture projection
- 074: Fabric PBR rendering
- 075: Graphics placement
- 076: Buttons and buttonholes
- 077: Zippers and fasteners
- 078: Piping and binding
- 079: Topstitch rendering
- 080: Folding and pressing
- 081: High-resolution garment toggle
- 082: 3D styleline editing
- 083: 3D pen and sketching
- 084: Animation playback
- 085: Motion simulation
- 086: Wind and environmental forces
- 087: Lighting studio presets
- 088: Ground and shadows
- 089: Render capture and export
- 090: 3D object browser
- 091: Property editor integration
- 092: Toolbar command parity
- 093: Keyboard shortcuts
- 094: Context menus
- 095: Multi-selection and grouping
- 096: Lock hide isolate
- 097: 2D and 3D synchronization
- 098: Simulation history and replay
- 099: Snapshot consistency
- 100: Performance budgets
- 101: GPU resource lifecycle
- 102: Undo redo transaction model
- 103: Project save and versioning
- 104: Asset import export
- 105: CLO comparison protocol
- 106: Marvelous Designer comparison
- 107: Reference evidence levels
- 108: Geometry unit conventions
- 109: Raycast priority rules
- 110: Accessibility and hit areas
- 111: Automated viewport QA
- 112: Screenshot regression QA
- 113: Pre-sim acceptance gate
- 114: Dynamic simulation acceptance
- 115: Manufacturing traceability
- 116: Known CLO parity gaps
- 117: Implementation dependency map
- 118: Release milestone plan
- 119: Validation matrix
- 120: Failure recovery
- 121: User workflow end-to-end
- 122: Open engineering questions
- 123: Source audit checklist
- 124: Future interoperability
- 125: Final signoff requirements


---

## Page 001 — Viewport scene graph

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **viewport scene graph**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 002 — Camera orbit and orthographic modes

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **camera orbit and orthographic modes**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 003 — Framing avatar and garment

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **framing avatar and garment**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 004 — Panel picking and selection

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **panel picking and selection**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 005 — 3D gizmos and transforms

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **3d gizmos and transforms**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 006 — Arrangement point data model

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **arrangement point data model**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 007 — Arrangement bounding volumes

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **arrangement bounding volumes**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 008 — Body coordinate frames

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **body coordinate frames**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 009 — Torso cylindrical initialization

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **torso cylindrical initialization**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 010 — Torso anatomically varying curvature

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **torso anatomically varying curvature**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 011 — Shoulder and clavicle staging

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **shoulder and clavicle staging**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 012 — Neckline placement

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **neckline placement**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 013 — Sleeve arm-axis alignment

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **sleeve arm-axis alignment**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 014 — Cuff and hem staging

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **cuff and hem staging**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 015 — Front and back panel orientation

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **front and back panel orientation**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 016 — Inside-out pattern normals

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **inside-out pattern normals**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 017 — Pattern-to-avatar clearance

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pattern-to-avatar clearance**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 018 — Pattern curvature and rest length

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pattern curvature and rest length**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 019 — Staging collision validation

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **staging collision validation**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 020 — Pre-simulation sewing gaps

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pre-simulation sewing gaps**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 021 — Staged sewing and convergence

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The source pattern geometry, current 3D arrangement transform and solver particle positions are separate states. Existing `nativePreDrapeCurvature.js` only bends the reset-stage display; it does not establish a validated physical initial pose.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **staged sewing and convergence**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 022 — Seam color palette

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **seam color palette**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 023 — Seam pair identity

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **seam pair identity**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 024 — Thread link visibility

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **thread link visibility**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 025 — Seam direction arrows

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **seam direction arrows**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 026 — Segment sewing in 3D

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **segment sewing in 3d**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 027 — Free sewing in 3D

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **free sewing in 3d**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 028 — Auto sewing review

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **auto sewing review**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 029 — Seam length mismatch

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **seam length mismatch**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 030 — Sewing diagnostic overlays

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **sewing diagnostic overlays**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 031 — Notches and correspondence

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The real CLO OBJ/XML export preserves 23 seam groups and 182 correspondences, while the current EXO seam visualization uses linked guide endpoints and a shared color palette. Color conveys seam identity, never verified seam closure.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **notches and correspondence**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 032 — Internal lines projected on cloth

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **internal lines projected on cloth**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 033 — Pattern baselines in 3D

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pattern baselines in 3d**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 034 — Center front line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **center front line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 035 — Center back line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **center back line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 036 — Chest horizontal line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **chest horizontal line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 037 — Waist and navel line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **waist and navel line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 038 — Hip line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **hip line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 039 — Shoulder reference line

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **shoulder reference line**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 040 — Bust and underbust lines

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **bust and underbust lines**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 041 — Armhole reference curves

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **armhole reference curves**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 042 — Sleeve bicep and elbow lines

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **sleeve bicep and elbow lines**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 043 — Avatar measurement tape

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **avatar measurement tape**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 044 — Avatar landmarks and joints

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **avatar landmarks and joints**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 045 — Garment measurement overlays

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **garment measurement overlays**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 046 — Body guide snapping

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **body guide snapping**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 047 — Guide visibility controls

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **guide visibility controls**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 048 — Guide occlusion and depth

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **guide occlusion and depth**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 049 — Guide persistence and undo

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Avatar landmarks, 2D pattern internal lines and world-space annotation strokes require different anchors. The native scene already projects some authored 2D lines onto cloth triangles, but complete anatomical guide controls are not verified.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **guide persistence and undo**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 050 — Avatar posture and pose

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **avatar posture and pose**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 051 — Avatar body measurements

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **avatar body measurements**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 052 — Skin collider synchronization

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **skin collider synchronization**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 053 — Arrangement on avatar change

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **arrangement on avatar change**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 054 — Simulation start and pause

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **simulation start and pause**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 055 — Simulation presets and quality

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **simulation presets and quality**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 056 — Particle distance and mesh density

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **particle distance and mesh density**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 057 — Gravity and damping

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **gravity and damping**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 058 — Stretch and shear response

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **stretch and shear response**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 059 — Bending stiffness

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **bending stiffness**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 060 — Thickness and collision offsets

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **thickness and collision offsets**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 061 — Self-collision handling

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **self-collision handling**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 062 — Layer ordering

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **layer ordering**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 063 — Seam and contact coupling

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **seam and contact coupling**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 064 — Continuous collision detection

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **continuous collision detection**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 065 — Pin and tack interactions

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pin and tack interactions**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 066 — Grab and pull interactions

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **grab and pull interactions**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 067 — Pressure and fit mapping

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pressure and fit mapping**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 068 — Stress and strain heatmaps

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** EXO has multiple simulation paths. Prior Thomas PPF contact studies show zero initial intersections can coexist with invalid dynamic collisions, so static appearance alone cannot certify physics.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **stress and strain heatmaps**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P0: critical to body-relative pre-simulation staging and measurable seam closure. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 069 — Contact visualization

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **contact visualization**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 070 — Transparency and x-ray

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **transparency and x-ray**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 071 — Wireframe and mesh edges

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **wireframe and mesh edges**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 072 — Normals and backface display

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **normals and backface display**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 073 — Material texture projection

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **material texture projection**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 074 — Fabric PBR rendering

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **fabric pbr rendering**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 075 — Graphics placement

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **graphics placement**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 076 — Buttons and buttonholes

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **buttons and buttonholes**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 077 — Zippers and fasteners

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **zippers and fasteners**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 078 — Piping and binding

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **piping and binding**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 079 — Topstitch rendering

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **topstitch rendering**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 080 — Folding and pressing

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **folding and pressing**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 081 — High-resolution garment toggle

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **high-resolution garment toggle**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 082 — 3D styleline editing

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **3d styleline editing**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 083 — 3D pen and sketching

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **3d pen and sketching**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 084 — Animation playback

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **animation playback**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 085 — Motion simulation

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **motion simulation**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 086 — Wind and environmental forces

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **wind and environmental forces**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 087 — Lighting studio presets

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **lighting studio presets**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 088 — Ground and shadows

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **ground and shadows**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 089 — Render capture and export

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** The native Three.js scene uses OrbitControls, selection, transform gizmos, line overlays and PBR materials. UI parity requires real stateful commands and synchronized geometry, not matching icons alone.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **render capture and export**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 090 — 3D object browser

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **3d object browser**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 091 — Property editor integration

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **property editor integration**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 092 — Toolbar command parity

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **toolbar command parity**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 093 — Keyboard shortcuts

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **keyboard shortcuts**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 094 — Context menus

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **context menus**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 095 — Multi-selection and grouping

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **multi-selection and grouping**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 096 — Lock hide isolate

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **lock hide isolate**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 097 — 2D and 3D synchronization

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **2d and 3d synchronization**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 098 — Simulation history and replay

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **simulation history and replay**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 099 — Snapshot consistency

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **snapshot consistency**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 100 — Performance budgets

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **performance budgets**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 101 — GPU resource lifecycle

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **gpu resource lifecycle**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 102 — Undo redo transaction model

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **undo redo transaction model**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 103 — Project save and versioning

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **project save and versioning**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 104 — Asset import export

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **asset import export**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 105 — CLO comparison protocol

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **clo comparison protocol**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 106 — Marvelous Designer comparison

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **marvelous designer comparison**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 107 — Reference evidence levels

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **reference evidence levels**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 108 — Geometry unit conventions

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** `ClothCraftSceneV2.jsx` owns native rendering and interactions while Rust snapshots carry cloth positions and sewing guides. Edits must preserve panel IDs, snapshot ownership and 2D/3D synchronization.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **geometry unit conventions**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P1: needed for reliable construction review and editor parity. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 109 — Raycast priority rules

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **raycast priority rules**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 110 — Accessibility and hit areas

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **accessibility and hit areas**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 111 — Automated viewport QA

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **automated viewport qa**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 112 — Screenshot regression QA

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **screenshot regression qa**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 113 — Pre-sim acceptance gate

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **pre-sim acceptance gate**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 114 — Dynamic simulation acceptance

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **dynamic simulation acceptance**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 115 — Manufacturing traceability

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **manufacturing traceability**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 116 — Known CLO parity gaps

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **known clo parity gaps**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 117 — Implementation dependency map

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **implementation dependency map**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 118 — Release milestone plan

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **release milestone plan**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 119 — Validation matrix

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **validation matrix**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 120 — Failure recovery

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **failure recovery**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 121 — User workflow end-to-end

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **user workflow end-to-end**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 122 — Open engineering questions

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **open engineering questions**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 123 — Source audit checklist

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **source audit checklist**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 124 — Future interoperability

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **future interoperability**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

## Page 125 — Final signoff requirements

**Evidence classification:** V (repository and exported reference), E (target specification), U (CLO feature semantics until live action is exercised).

**Observed foundation.** Existing CLO inspector evidence records 20 left A and 18 left B named toolbar controls in the inspected CLO 7 configuration. Commands, enabled states and flyouts require per-action live verification.

**Required user workflow.** Open the 3D window with the same active avatar, garment, pattern IDs and selected tool as the 2D panel. Locate the relevant control for **final signoff requirements**; show an explicit editable state, a visible selection/preview and a reversible Apply or Cancel outcome. Keep the original 2D pattern coordinates, sewing identities and material assignments stable unless the action explicitly changes them. Provide distinct controls for viewing construction overlays and modifying authored geometry.

**Engineering design.** Represent this capability through stable object IDs and a canonical scene state with `avatarId`, `panelId`, `patternEdgeId`, `seamId`, `geometryRevision`, `snapshotTime`, `visibility`, `selection` and `toolMode`. Resolve any world-space annotation from its chosen attachment frame (avatar landmark, garment barycentric coordinates, arrangement transform or fixed world position). Cache topology-dependent lookups by revision, update moving vertices from solver snapshots, and dispose stale GPU buffers. Preserve centimeters in authored pattern data and convert to meters once at the render boundary.

**Interaction contract.** Pointer down chooses the nearest visible and unlocked relevant object, respecting occlusion and tool precedence. Hover offers a preview; drag updates a temporary transaction; pointer up commits one undoable edit; Escape cancels. Camera orbit remains available outside active handles. Expose keyboard and accessible action equivalents. Selection in 2D and 3D must resolve to the same canonical object identity.

**Validation and failure cases.** Test front/back orientation, mirrored and rotated patterns, asymmetric panels, avatar scaling, open and closed seams, small objects, dense tessellation, animation frames, and a stale solver snapshot. Assert finite coordinates, consistent units, no unintended panel edits, stable seam IDs, and correct guide visibility after undo, save/reopen and mode changes. Record screenshot and serialized geometry evidence separately; a screenshot proves appearance only.

**Priority and dependency.** P2: implement after geometry and interaction correctness. The first acceptance review must include an actual click/drag sequence in the installed viewer and a source-linked expected behavior check.

**Sources to inspect for exact CLO semantics:** [official CLO manual](https://support.clo3d.com/hc/en-us/categories/115000064648-Manual), [CLO product features](https://clo3d.com/en/product/features), [Marvelous Designer releases](https://www.marvelousdesigner.com/products/release), and local evidence named in the source index. These links are research entry points; they do not independently certify every proposed action above.

---

# Appendix A — Focused CLO arrangement, sewing, avatar and guide research

# CLO 3D Window — Arrangement, Sewing and Avatar Guide Research

Date: 2026-10-18. Research-only architectural reference for EXO ClothCraft V2. This original analysis is based on publicly available CLO official documentation and linked support material; it is not a direct live CLO interaction or a parity certification.

**Evidence key:** **D** = explicitly documented by CLO official Help Center; **I** = original engineering inference or proposal; **U** = unverified in this release, or community-described behavior requiring live inspection. Acceptance criteria and suggested APIs are requirements for our application, not claims about proprietary CLO source code.

## Executive architecture model

An avatar owns skeleton-relative bounding volumes. Volumes own positioning anchors called arrangement points. A flat 2D pattern remains the authoritative manufacturing geometry; its 3D arrangement holds a projection/warp transform, orientation, offset, winding, and an immutable snapshot of the pre-simulation position. An independent sewing graph links pairs of edge intervals or internal paths with direction correspondence. The simulated cloth state is separately writable and can be reset to the authored arrangement without discarding 2D geometry. Avatar body guides, tape, measurements and debug volumes are separate visual layers and can be turned on independently. These boundaries are implementation proposals grounded in CLO's publicly documented tool contracts.

**Primary official references:** [CLO Pattern: 3D Arrangement index](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement), [CLO Avatar Editor Guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide), [CLO 3D toolbar guide (historical PDF)](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281), [CLO 3D Pencil new in 2026.0](https://support.clo3d.com/hc/en-us/articles/55461410696345-3D-Pencil-Avatar).

## 01. Evidence and scope

**Evidence D.** The official 3D Arrangement manual index separates auto arrangement, point placement, smart placement, reset, redrape and superimpose. These are distinct user commands. [Official source](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

**Implementation rule and acceptance:** A command registry with distinct undoable operations; acceptance: invoking each command modifies only its declared state.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 02. Avatar-space convention

**Evidence I.** Bounding volumes track avatar joints; coordinate transforms must therefore be defined in avatar-relative terms. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Store worldFromAvatar and worldFromJoint transforms and verify that all anchors follow avatar translation, rotation and resize.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 03. Bounding-volume anatomy

**Evidence D.** The editor supports volumes associated with beginning and ending joint names, shape, height and section dimensions. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Provide joint pair selectors and mesh preview; verify torso cylinder follows shoulder and pelvis joints across two poses.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 04. Cylinder and rounded cuboid

**Evidence D.** CLO lists cylinder and cuboid shapes and cuboid round-corner adjustment. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Implement both swept volume types with positive dimensions and round-corner bounds; preserve mirrored handedness.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 05. Bounding-volume visibility

**Evidence D.** Avatar Display provides a separate bounding-volume toggle. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Toggle volume wireframes without modifying avatar, cloth, collisions, selections or persisted positions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 06. Arrangement-point visibility

**Evidence D.** Avatar Display offers a separate arrangement-point visibility toggle. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Toggling points shows anchors with deterministic hit targets, independent of volume display.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 07. Point depends on volume

**Evidence D.** The official guide states arrangement points are invisible without corresponding bounding volumes. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Reject orphan point creation or show invalid-reference state, and restore display upon relinking the volume.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 08. Point coordinate properties

**Evidence D.** Points have X/Y placement, an avatar offset, selected arrangement bounding volume and wrap direction. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Expose numerical X, Y, offset and wrap controls; updating any control immediately updates preview and commits through undo.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 09. Point offsets and collision

**Evidence I.** CLO separates offset from volume geometry; positive clearance is an implementation design requirement, with exact CLO clearance calculation undocumented. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Define normal-aligned clearance from surface; acceptance: at offset=1cm no initially penetrating points on standard avatar.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 10. Symmetric point naming

**Evidence D.** The guide names _R and _L suffix behavior and identifies symmetric point presentation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Support mirror linking and broken-link warnings; test one mirrored pair edited from left and right sides.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 11. Symmetric pattern arrangement

**Evidence D.** CLO supports pairing symmetric patterns with symmetric arrangement points. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Place both paired panels together with mirrored orientation and stable IDs, preserving seam mapping.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 12. Pre-placement preview

**Evidence D.** Hovering a point previews the pattern and clicking commits its centered position. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Preview without document mutation; commit after click, Escape cancels; test preview/render consistency.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 13. Curved wrap over volume

**Evidence D.** Patterns placed on arrangement points follow the curves of the associated volume. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Produce curved 3D vertices from planar source while retaining immutable 2D geometry; test circumference and preserved surface area.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 14. Shape Style flat versus curved

**Evidence D.** Arrangement properties include flat or curved Shape Style. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Switch flat/curved without changing source vertices, reset snapshot or sewing topology.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 15. Post-place adjustments

**Evidence D.** Point-arranged patterns expose X/Y, Offset, Orientation, Shape Style and Point Name. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Properties update placement predictably; position editing preserves selected point identity and inverse transform.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 16. Curvature parameterization

**Evidence I.** The source confirms curvature, not an exact formula. A swept surface chart is an engineering proposal. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Define arc length parameter s, longitudinal t, surface S(s,t), outer normal N, and placement S+offset*N; require low distortion on cylinder.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 17. Overlong cuff spiral

**Evidence D.** CLO notes narrow/long pieces may spiral when their length exceeds the volume and provides Flip Wrap Direction. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Handle unwrapped angles beyond 2π without clamping and provide flip operation; test long cuff wraps in both directions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 18. Normals and winding

**Evidence D.** Flip Normal switches fabric wrong/right sides and may invert fold angle sign. [Official source](https://support.clo3d.com/hc/en-us/articles/115000306008-Flip-Normal).

**Implementation rule and acceptance:** Keep orientation, visual face and fold metadata consistent; verify reversed normal preserves seam endpoints.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 19. Gizmo placement

**Evidence D.** CLO supports unified and divided transform gizmos in simulation-off state. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

**Implementation rule and acceptance:** Implement 3-axis movement, 3-axis rotation and planar free drag; ensure transforms act on arranged 3D mesh only.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 20. Direct positioning

**Evidence D.** Hover follows garment/avatar surface and click fixes position; Shift constrains rotation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning).

**Implementation rule and acceptance:** Raycast avatar/cloth hit, project selected pattern center and preview position; Shift locks orientation; click commits.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 21. Reset 3D selected

**Evidence D.** CLO returns selected patterns to pre-simulation placement and permits multiple selection. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513128-Reset-3D-Arrangement).

**Implementation rule and acceptance:** Cache arrangement-rest pose per panel; after simulation only selected panels restore to exact cached geometry.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 22. Reset 3D all

**Evidence D.** CLO has separate all-pattern reset in menu and toolbar. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513128-Reset-3D-Arrangement).

**Implementation rule and acceptance:** Restore every panel to its authored arrangement pose in one undoable transaction; subsequent simulate reruns constraints.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 23. Reset 2D arrangement

**Evidence D.** CLO explicitly rearranges 3D panels according to their 2D layout. [Official source](https://support.clo3d.com/hc/en-us/articles/115000512988-Reset-2D-Arrangement).

**Implementation rule and acceptance:** Build flattened 3D staging layout matching board positions; acceptance: all panel centers agree with documented 2D-to-3D scale.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 24. Re-drape after avatar sizing

**Evidence D.** Re-drape considers changed body dimensions; CLO limits supported avatars to CLO or custom avatars with fitting suits. [Official source](https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1).

**Implementation rule and acceptance:** Reproject anchors after size change without reusing stale collision poses; if avatar unsupported display capability notice.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 25. Auto arrangement entry

**Evidence D.** CLO 7.1 documents auto arrangement based on pattern shape, with symmetry and sewing information improving placement. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Present a proceed/preview/accept flow, with deterministic fallback for unknown garment panels.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 26. Auto arrangement staging

**Evidence D.** CLO uses staged candidate sets classified by color/transparency and Back/Next navigation. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Group suggestions by explicit confidence, expose Back/Next, and commit only selected reviewed results.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 27. Auto arrangement failure handling

**Evidence D.** CLO warns very small pieces and same-location analyses may not arrange reliably. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Mark unassigned panels, offer manual point assignment and do not fabricate certainty for weak predictions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 28. Smart arrangement

**Evidence D.** CLO can position an already sewn new panel on the draped assembly. [Official source](https://support.clo3d.com/hc/en-us/articles/115000525027-Smart-Arrangement).

**Implementation rule and acceptance:** Use sewing adjacency to identify target surface and retain existing draped state; acceptance: collar lands near neck seam.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 29. Superimpose layer positions

**Evidence D.** CLO supports Over, Under and Side for a new sewn pattern relative to associated panels. [Official source](https://support.clo3d.com/hc/en-us/articles/115000512508-Superimpose).

**Implementation rule and acceptance:** Implement offset along panel normal with over/under sign and side adjacency; show selection only when sewing relation exists.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 30. Segment sewing visual state

**Evidence D.** 3D segment sewing highlights sewable edges and shows sewing lines in both workspaces; notch crossing reverses sewing result. [Official source](https://support.clo3d.com/hc/en-us/articles/360001771047--3D-Tool-Segment-Sewing).

**Implementation rule and acceptance:** Render bold candidate edges and directional arrows; test clicked segments and detect reversed correspondence.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 31. Free sewing in 3D

**Evidence D.** Free sewing can connect chosen edge portions and internal lines in 3D. [Official source](https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing).

**Implementation rule and acceptance:** Raycast and parameterize normalized edge intervals; preserve seam endpoints as geometry changes and test partial-edge correspondence.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 32. M:N sewing direction and invalidity

**Evidence D.** CLO highlights staged M:N selection neon, unsuitable segments red, and supports Delete/Escape cancellation. [Official source](https://support.clo3d.com/hc/en-us/articles/360001754668--3D-Tool-M-N-Free-Sewing).

**Implementation rule and acceptance:** Use explicit provisional states M, N, invalid and committed; test aborted operations leave no document seam.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 33. Sewing activated versus disabled

**Evidence D.** Deactivated lines render white in 2D and 3D, with no constraint applied during simulation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000528308--Popup-Activate-Deactivate-Sewing-Lines).

**Implementation rule and acceptance:** Persist active:boolean; draw white for disabled and exclude matching solver constraint; toggle must work without deleting pairing.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 34. Sewing visibility

**Evidence D.** CLO supports hide selected/all sewing lines in both 2D and 3D. [Official source](https://support.clo3d.com/hc/en-us/articles/115000528428--Popup-Show-Hide-Sewing).

**Implementation rule and acceptance:** Distinguish visual hidden state from active mechanical constraints; hidden active seam must still constrain cloth.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 35. Sewing colors versus 3D seamline maps

**Evidence D.** Edit Sewing shows directional and state cues, while 3D Seamline property governs render normal-map intensity and thickness. [Official source](https://support.clo3d.com/hc/en-us/articles/115013404848--Property-3D-Seamline).

**Implementation rule and acceptance:** Represent stitch correspondences, overlay visibility and render seam effects as independent entities.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 36. Avatar visibility categories

**Evidence D.** CLO distinguishes Show Avatar, Arrangement Points, Bounding Volumes, Measurements, Tape and 3D Lines. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Provide independent toggles with saved viewport preferences; changing any display flag must not change mesh data.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 37. Avatar surface guide geometry

**Evidence D.** CLO supports lines and shapes drawn on the avatar and separate visibility for those drawings. [Official source](https://support.clo3d.com/hc/en-us/articles/115008890587-Show-3D-Pen-Avatar).

**Implementation rule and acceptance:** Project editable polyline control points to avatar mesh; preserve binding through avatar movement.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 38. Avatar 3D pencil 2026

**Evidence D.** CLO 2026.0 describes front/back constrained drawing with symmetry and conversion to 3D pen. [Official source](https://support.clo3d.com/hc/en-us/articles/55461410696345-3D-Pencil-Avatar).

**Implementation rule and acceptance:** Allow constrained projection drafting and mirrored guide sketches; acceptance: resize keeps strokes on avatar.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 39. Avatar guide planes

**Evidence U.** A CLO community explanation describes temporary axis-aligned guide planes with Shift when marking tape; this is user discussion, not complete versioned specification. [Official source](https://support.clo3d.com/hc/en-us/community/posts/360037847513-I-can-t-draw-the-shoulder-tline-for-Avatar-Tape-Line).

**Implementation rule and acceptance:** Prototype optional transverse/sagittal/coronal intersections with adjustable height and orientation, then verify in target CLO release.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 40. Body landmark overlays

**Evidence I.** The official product documents measurements and tapes, not a standard chest-center/bellybutton overlay naming contract. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Define optional authorable landmarks: center-front, center-back, bust/chest, underbust, waist, navel, hip, shoulder and armhole; do not claim CLO built-in exact labels.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 41. Attach seam to tape

**Evidence D.** CLO highlights selected garment edge/internal line and avatar tape red; simulation attaches the seam to the avatar tape. [Official source](https://support.clo3d.com/hc/en-us/articles/115012225987-Attach-to-Avatar-Tape).

**Implementation rule and acceptance:** Store tape and garment edge reference, render red preview and produce a solver attachment constraint only when supported.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 42. Avatar editor file persistence

**Evidence D.** CLO lists .arr for points, .pan for volumes and .avt for a richer avatar including arrangement information. [Official source](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats).

**Implementation rule and acceptance:** Persist native JSON equivalents including joint refs, point IDs, wrap metadata and stable version; import/export CLO formats separately after validation.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 43. Validation ladder and QA

**Evidence I.** Official docs describe user workflows but not numerical parity tolerances; acceptance thresholds here are project-defined. [Official source](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

**Implementation rule and acceptance:** Run geometry unit tests, visual snapshots, avatar resize tests, sewing roundtrip, pose changes and end-to-end simulation comparisons with saved input fixtures.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## Recommended data contracts (original proposal)

```ts
type ArrangementVolume = {id:string; avatarId:string; jointStartId:string; jointEndId:string; kind:'cylinder'|'rounded-cuboid'; dimensionsCm:[number,number,number]; cornerRadiusCm?:number; enabled:boolean};
type ArrangementAnchor = {id:string; volumeId:string; name:string; xCm:number; yCm:number; offsetCm:number; wrapDirection:1|-1; mirrorAnchorId?:string};
type PanelArrangement = {panelId:string; anchorId?:string; shapeStyle:'flat'|'curved'; offsetCm:number; positionCm:[number,number]; orientationDegrees:number; face:'right'|'wrong'; restPositions3D:number[]; geometryRevision:string};
type SewingEdgeRef = {panelId:string; boundaryPathId:string; startFraction:number; endFraction:number; direction:1|-1};
type SewingConstraint = {id:string; first:SewingEdgeRef; second:SewingEdgeRef; active:boolean; visible:boolean; displayColor:string; renderSeamIntensity:number; renderSeamThickness:number};
type AvatarGuide = {id:string; avatarId:string; type:'centerline'|'chest'|'waist'|'navel'|'hip'|'tape'|'measure'|'custom'; pointsAvatarLocal:[number,number,number][]; visible:boolean; snapEnabled:boolean};
```

All float quantities above should be unit-tagged at the API boundary. Array ordering, coordinate handedness, polygon winding and collision-clearance semantics require a single shared specification. The shapeStyle terminology tracks an official CLO property; the data representations above are original.

## Reference geometry for curved pre-simulation placement (original proposal)

1. Resolve the avatar's current pose transform and the chosen bounding volume's swept axis. Fail explicitly if joints or surface parameters are invalid.
2. Build a differentiable chart `S(u,v)` with `u` horizontal arc length and `v` vertical position on the volume. Use an unwrapped arc coordinate so cuffs longer than circumference may turn more than one revolution.
3. Center a pattern's 2D manufacturing coordinates at its desired anchor, apply orientation in the local tangent plane, then evaluate `S(u,v) + d*N(u,v)`, with `d` the user-visible offset and `N` outward surface normal.
4. For flat shape style, choose a tangent plane at the anchor and map every point by the tangent basis, preserving all original planar coordinates. For curved shape style, apply the swept surface mapping and test orientation/winding.
5. Save resulting vertices as `restPositions3D`, then generate any simulation meshes as disposable derived geometry. Never bake projected vertices into the original 2D cutline or change manufacturing measurements.
6. A solver may subsequently deform from this rest arrangement; Reset 3D Arrangement restores the saved rest positions. Reset 2D Arrangement instead reconstructs staging positions from 2D board coordinates. These are different commands.
7. Propose geometric checks: all vertices finite, triangle winding consistent, target clearance positive within tolerance, 2D boundary lengths recoverable from original source, and no point-anchor drift under viewport orbit/zoom.

This numerical model is an **engineering approximation**, not a reverse-engineered or officially specified CLO wrap formula. CLO documents the presence of curved arrangement, its controls, and flip direction, not the detailed interpolation method.

## Sewing color and geometry semantics

| Independent state | Documented appearance or behavior | Proposed application behavior |
|---|---|---|
| Previewing sewable edges | Eligible edges bold in 3D sewing tools | Bold edge overlay restricted to eligible paths |
| M:N provisional selection | Neon highlighted; invalid red | Provisional colors remain until confirm/cancel |
| Direction notch | Correspondence direction affects twist/reversal | Show arrows on each joined interval |
| Sewing deactivated | White in 2D and 3D, ceases to sew | Disable physical constraint while retaining relationship |
| Sewing hidden | Hidden as a display choice | No change to constraint enabled state |
| 3D seamline appearance | Render normal-map thickness/intensity | Independent visual seam-material pass |
| Avatar-tape attach | Red highlight then attachment during simulation | Distinct garment-to-avatar constraint |

Sources: [segment sewing](https://support.clo3d.com/hc/en-us/articles/360001771047--3D-Tool-Segment-Sewing), [M:N free sewing](https://support.clo3d.com/hc/en-us/articles/360001754668--3D-Tool-M-N-Free-Sewing), [deactivate](https://support.clo3d.com/hc/en-us/articles/115000528308--Popup-Activate-Deactivate-Sewing-Lines), [hide](https://support.clo3d.com/hc/en-us/articles/115000528428--Popup-Show-Hide-Sewing), [seamline property](https://support.clo3d.com/hc/en-us/articles/115013404848--Property-3D-Seamline), [attach to tape](https://support.clo3d.com/hc/en-us/articles/115012225987-Attach-to-Avatar-Tape).

## Avatar landmark and construction guide taxonomy

**Documented CLO layers:** avatar visibility, arrangement points, volume display, avatar measurements, avatar tapes, 3D drawn lines. [Avatar display reference](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Proposed EXO overlay set:** sagittal center-front and center-back lines, horizontal center-chest across bust/chest circumference, under-chest line, waistline, navel-height line, high hip and full hip, shoulder baseline, neck-height plane, armscye reference ring, elbow and wrist level, thigh/knee/ankle circumference guides. These are proposed ergonomic guides; precise CLO default names, placements, auto-calculation and snapping behavior remain unverified. Every point should be stored in avatar-local position or surface barycentric binding, recalculated under pose/resize, visible independently of arrangements, and nonphysical unless the user deliberately attaches a pattern line to an avatar tape.

## High-value acceptance scenarios

| Scenario | Required visible result | Invariant |
|---|---|---|
| Place symmetric front panels | Preview two mirrors, click both placed | Stable symmetric anchor IDs |
| Place body panel on torso | Curved panel floats around chest before simulation | 2D cutline unchanged |
| Change shape style | Flat and curved 3D states visibly differ | No source pattern mutation |
| Adjust positive offset | Panel moves outward from avatar | Finite coordinates and outward normal |
| Flip cuff wrap | Spiral direction changes | No edge remapping or seam loss |
| Adjust avatar girth | Volumes, anchors and preview reposition | No obsolete world-pose binding |
| Reset selected after sim | One panel returns to its arranged rest geometry | Other panels unchanged |
| Reset all after sim | All panels return to arranged rest geometry | Sewing pairing retained |
| Reset 2D | 3D panels appear in board-like staging | No replacement of arrangement snapshots until commit |
| Create an M:N seam | Direction notch and pair highlighted | Constraint endpoints valid |
| Hide active seam | Connection graphics disappear | Solver pairing remains active |
| Deactivate seam | Connection is white and does not constrain cloth | Pairing editable and recoverable |
| Toggle guides | Center chest/navel guides appear/disappear | Picking cloth remains correct |
| Attach edge to tape | Both highlight and connect during simulation | Garment-to-avatar binding is explicit |

## Research caveats and follow-up evidence

These notes intentionally avoid asserting any CLO private implementation algorithm. The official support documentation may combine features from differing versions; individual citations should be retested against the exact installed release before pixel-level UI parity decisions. The PDF toolbar guide is historically dated and serves as a tool-inventory reference, not as proof of the current icon placement. The supplied research task did not authorize changing application source and no direct software interactions were performed during this pass. Follow-on engineering should document an actual live inspection with app version, screenshot, command sequence, expected result and observed result for each feature. No claim is made that EXO already implements or passes these requirements.



# Appendix B — EXO viewport implementation and parity audit

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

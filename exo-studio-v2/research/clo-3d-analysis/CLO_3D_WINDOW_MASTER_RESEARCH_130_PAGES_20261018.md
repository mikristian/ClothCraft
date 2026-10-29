# CLO / Marvelous Designer 3D Window — 130-Page Deep Research and EXO Implementation Blueprint

**Research date:** 18 October 2026. **Primary target:** EXO ClothCraft V2 native 3D garment viewport. **Scope:** full 3D window UX, arrangement, bent pre-simulation cloth, sewing pair colors and threads, avatar anatomical guides, simulation handoff, tooling, visualization, measurement, hardware, motion, comparison, tests.

**Evidence key:** **[D]** official CLO/Marvelous Designer documentation or recorded existing-file evidence; **[E]** read-only observation of source or earlier controlled export; **[P]** proposed EXO design or engineering contract; **[U]** unverified until direct installed-app interaction. Documentation pages describe an *implementation target*, not a claim that EXO implements it today or that the physical PPF solver passes.

**Pagination:** 130 individually numbered research pages, each assigned a distinct narrowly scoped 3D capability and test contract. Markdown hard page breaks (`<div style="page-break-after: always"></div>`) are inserted for later print/PDF rendering. The research is organized into 13 ten-page volumes. These are authored research sheets; printed page count may vary if a renderer does not honor page breaks.

## Executive research findings

1. **CLO's body-following pre-simulation arrangement is explicit, editable and independent of drape simulation.** Arrangement points and bounding volumes provide body-region-relative placements. The arrangement property controls *Shape Style* (flat/curved), local X/Y position, offset and orientation. [CLO arrangement](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting) [CLO points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).
2. **Sewing must be represented as actual paired material-space intervals.** CLO offers 3D sewing tools and display layers for 3D seamlines and connecting threads. Color identity alone is insufficient; preserve edge side, direction, arclength correspondence, seam IDs and notches. [3D display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) [M:N sewing](https://support.clo3d.com/hc/en-us/articles/360001771067--3D-Tool-M-N-Segment-Sewing).
3. **Avatar guides are distinct from garment lines.** CLO's display supports avatar measurements/tapes, bounding volumes, arrangement points and avatar pen lines. User-requested explicit chest-center/umbilicus/waist line groups should be new EXO guide presets anchored to actual anatomical landmarks. [Avatar display](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).
4. **Visual drape must not be confused with a validated physical initial state.** Earlier EXO research recorded an arranged CLO OBJ/XML with 7 groups and 23 sewing groups, but large initial stitch separations; Thomas PPF staging has separately documented preflight failures. A production-quality engine must validate geometry, contact and seam residuals independently of visual smoothness. [Local CLO export study](../../docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md) [PPF staging](../../docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md).
5. **Full 3D parity is broader than arrangement.** The supported window includes selecting and moving patterns, camera, surface and material display, avatar, trims, markers, simulation, fitting diagnostics, pin/tack, measurement and schematic export. [CLO toggle guide](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) [Marvelous Designer window](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

## Prior evidence boundary

Local project data includes a read-only live CLO 7.0.242 male T-shirt reference, an official application OBJ/XML export with 7 separate pattern groups, 3,661 vertices, 6,876 triangles, 23 SeamLinePair groups and 182 sewing-point correspondences (documented in `docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md`). This evidence is valuable for topology and arrangement reasoning, but does not demonstrate a physically closed reference seam state. Another local audit captured the installed CLO 7 toolbar manifest (20+18 controls) and warned that AX accessibility permissions were transient. The current document did **not** operate the live CLO GUI. The requested exact chest/waist guide geometry, shading, and per-pair colors are EXO design requirements, not falsely attributed to CLO defaults.

## Research volumes

- Volume 01: 3D window foundation and shared document state — pages 001–010
- Volume 02: Avatar anatomy, landmarks and construction reference — pages 011–020
- Volume 03: Bounding volumes and arrangement points — pages 021–030
- Volume 04: Pre-simulation curvature and body wrapping — pages 031–040
- Volume 05: Sewing lines, colors and construction correspondence — pages 041–050
- Volume 06: Pattern baselines, reference guides and overlay design — pages 051–060
- Volume 07: 3D camera, framing and navigation — pages 061–070
- Volume 08: Selection, 3D editing and transform tools — pages 071–080
- Volume 09: 3D trims, materials and surface presentation — pages 081–090
- Volume 10: Simulation lifecycle and garment physics — pages 091–100
- Volume 11: Fit diagnostics, quality modes and measurement — pages 101–110
- Volume 12: Avatar pose, movement and animation — pages 111–120
- Volume 13: Version parity, performance, automation and research validation — pages 121–130

---

# Volume 01: 3D window foundation and shared document state

### Officially documented foundation [D]

CLO and Marvelous Designer place a rendered garment and avatar in a 3D window where simulated cloth, manually arranged patterns, fit overlays, tools, and camera controls coexist. CLO exposes independent visibility switches for seamlines, internal lines, baselines, connecting threads, marks, avatar data, trims, mesh, and environment. The interface is therefore a stateful layered technical editor, not merely a shaded garment viewer. The exact visible controls vary by version and customization; the EXO CLO 7 toolbar manifest is historical evidence for a specific installed layout.

### EXO engineering interpretation [E/P]

EXO has a shared `ClothCraftSceneV2.jsx` Three.js scene and React workspace, `ClothCraftCornerTools.jsx`, a Rust-origin snapshot, and renderer display groups for cloth, seams, boundaries, markers, avatar, internal lines and overlays. Each new 3D feature should reference stable 2D entities and one authoritative project model. Do not represent display proxies as physical constraints; keep view state separate from pattern topology and simulation state.

**Primary references:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window) · [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 001 / 130 — Viewport panel anatomy

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Define camera canvas, two 3D tool columns, orientation cube, status text, floating settings, corner controls and a stable interaction surface; support narrow dual-pane and maximized workspace. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Design an adaptive layout whose tool hit targets do not obscure shoulder or sleeve selection; reserve predictable zones for overlays and tooltips. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store panel layout and individual viewport preferences independently from document sewing data; honor resizing without remounting the renderer or clearing the solver snapshot. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Resize repeatedly and toggle 3D-only, 2D-only and split layout; assert camera framing, pointer rays, tool hit zones, and current garment persist. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 002 / 130 — Independent display layers

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Separate garment shell, selected outlines, sewing attachments, seamline ribbons, baselines, drafting guides, avatar tapes, hardware, wireframe, environment and measurements. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Add searchable grouped layer toggles with eye icons and contextual hover help; each must work while simulation is paused or running. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Keep render groups and `visible` flags decoupled from storage; synthesize overlays from current pose and stable IDs, without adding triangles to the physical mesh. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Toggle every layer during a cloth snapshot stream; verify the corresponding pixels and raycast targets change while saved garment content remains byte-identical. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 003 / 130 — 3D-to-2D selection synchronization

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout).

### Capability and motivation

Select a 3D panel, seam edge, internal line or fastening element and highlight the corresponding 2D source; reciprocal selection should scroll/fit the other pane. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Selection should prefer the nearest visible semantic object and offer disambiguation when a button overlaps an edge or stitch thread. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Define hit priority and stable reference IDs for entities, source segments and barycentric surface locations; propagate one selection transaction through React. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pick a seam at 3D armhole, verify exact 2D panel and segment IDs; hide the segment and ensure hit testing does not accidentally select invisible content. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 004 / 130 — Viewport interaction state machine

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Distinguish orbit, selection, edit, gizmo dragging, sewing authoring, measurement creation, cloth grabbing, camera hand and modal overlays. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

A single active pointer owner should capture or release events, and Escape should cancel that owner's preview without committing geometry. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Model pointer states with explicit entry, move, commit, cancel and lost-capture transitions; avoid competing native event handlers that suppress each other. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Interrupt every active drag by Escape, resize, lost pointer capture and simulated frame update; verify orbit resumes and no phantom stitch or placement remains. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 005 / 130 — Mode-specific property inspector

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Make property rows reflect selected panel, arrangement point, seam pair, avatar landmark, renderer option, trim or camera; preserve last contextual tab. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

When a panel is pre-arranged, expose shape style, offset, orientation and local shifts; when simulated, expose physical and material state without conflating controls. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Bind inspector fields to typed entity records with validation, units, undo grouping and dependency invalidation rules. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Edit a numeric 3D offset, undo and redo; verify 3D pose changes, 2D cut geometry stays the same, and document reload reproduces the pose. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 006 / 130 — Context menus and object browser

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Support right-click surfaces for panel reset, isolation, arrangement, normals, freeze, properties and object-specific actions; empty space opens viewport options. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Highlight the target before opening menu; disabled actions should explain their prerequisites, such as no avatar or missing sewing relation. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use one context command registry reused by toolbar and keyboard with a readiness predicate and undo metadata. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Right-click front panel, avatar, seam, zipper, empty stage and guide; compare context action sets and invoke each implemented command through a common dispatcher. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 007 / 130 — Viewport coordinate systems

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout).

### Capability and motivation

Track pattern material UV metres, body world metres, camera projection pixels, panel-local frame and stage offsets with explicit conversions. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show origin, unit scale, garment-up and body-forward orientation in numeric transforms instead of silently mixing centimetres and metres. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Introduce typed transforms and coordinate helpers for world↔panel↔UV and project/unproject including ortho/perspective matrices. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate avatar, move stage and change camera; independently sample world points on a seam and confirm reversible UV mapping within tolerance. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 008 / 130 — Persistent scene display presets

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Provide drafting, arrangement, construction, presentation, fit-analysis and manufacturer schematic view presets. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Presets should only change lighting, layers, visual material and camera unless user explicitly saves a separate pattern arrangement. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Model view presets as declarative visibility and rendering settings, supporting per-viewport overrides and project defaults. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Switch five presets while paused and while running; compare hidden channels and assert physical project snapshot remains unchanged. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 009 / 130 — Status and diagnostics bar

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Present simulation state, source revision, garment pieces, sewable pairs, visual preview mode, viewport FPS and selected object summary. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Clarify “pre-simulation visualization,” “physical simulation,” and “baked/verified result” prominently enough to prevent mistaking a curved preview for tested fit. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Source metrics from existing native snapshot and solver reports; do not derive certified status from frame render success or visual alignment alone. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Replay a failed PPF pose and ensure status visibly identifies failed preflight, even if the shirt appears visually wrapped. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 010 / 130 — Undo/replay boundary

**Category:** 3D window foundation and shared document state  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Define undoable view moves, authored seam/guide edits, hardware anchors, arrangement transforms and snapshot checkpoints independently. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Temporary visual previews must be dismissible; a reset should restore the saved arranged pose without erasing pattern edits or model assets. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Persist committed commands with before/after values and stable IDs, and keep ephemeral pointer state outside serialization. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Execute 20 mixed 3D edits, save, reload, undo through them, then inspect pattern topology, seam correspondence and scene camera persistence. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 02: Avatar anatomy, landmarks and construction reference

### Officially documented foundation [D]

Official CLO avatar display exposes arrangement points, bounding volumes, measurement tapes and 3D pen lines, and the avatar editor manages editable body-region volumes. Body guides such as center chest, bust/chest circumference and belly-button level are useful design proposals; exact named guideline defaults should not be attributed to CLO unless observed in the installed version. Anatomical guide geometry is distinct from garment sewing and physical contact constraints.

### EXO engineering interpretation [E/P]

EXO should define an avatar-landmark schema relative to a real posed triangulated avatar, with region labels, joint transforms, and skin-local attachments. Derive longitudinal and circumferential guides from evaluated skin intersections and body landmarks. Do not infer chest or waist simply from global bounding-box fractions for production measurements; imported avatars need calibratable landmarks.

**Primary references:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar) · [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume) · [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 011 / 130 — Anterior body midline

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Draw a front center reference from neck base through sternum and umbilical region on the posed avatar surface; distinguish visible centerline from garment grainline. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer line thickness, opacity, screen depth mode, endpoints and copy-to-pattern projection when selected. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Parameterize by body landmarks and sample closest-surface/geodesic path; store joint-local or barycentric anchors with a confidence field. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

On three sizes and two poses, confirm the line stays on the skin, remains centered, and does not jump across the avatar to the back. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 012 / 130 — Posterior body midline

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Display spinal center from back neck through thoracic and lumbar regions independently of the front reference. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Allow front-only, back-only, both and x-ray navigation modes; labels should orient to active camera while line follows curved back. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Interpolate anatomical back landmarks and reproject onto outward skin normals; track normal direction and back-facing visibility. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Orbit 360 degrees and verify front/back paths remain distinct, with no backline showing through cloth in normal depth mode. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 013 / 130 — Upper chest transverse guide

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure).

### Capability and motivation

Trace an avatar-surface horizontal chest-level curve that crosses the sternum and continues along lateral ribs to each side. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide offset from calibrated upper-chest landmark, label height and mirrored control handles; avoid treating straight screen-space lines as body surface traces. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Slice the avatar mesh with an anatomical horizontal plane, select the intended closed torso contour, then identify anterior arc. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Compare symmetric endpoints and centimeter lengths under different body proportions; avoid switching onto arm contours. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 014 / 130 — Full chest circumference reference

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Create an adjustable full-torso loop at measured chest level and expose girth measured along the actual mesh. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show numeric circumference, source level, labels and a ghosted overlay under garments; allow compare garment hem/girth with ease. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use cross-section loop extraction, clean component association, and true arclength integration; reject slices crossing arms or open loops. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Cross-check perimeter against independent triangle-plane section algorithm and known avatar measurement records. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 015 / 130 — Bust-line alternative and anthropometry

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Support bust point elevations and gender/body-type-specific anatomical references without hard-coded assumptions about user or avatar. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Let designers define left/right prominence landmarks and choose bust, chest or custom torso level presets. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store semantic landmark definitions and confidence, permit manual pinning, and maintain symmetry only when the avatar and design require it. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Import bodies with varied shapes; verify landmarks are editable, stable under pose, and not silently snapped to the wrong mesh region. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 016 / 130 — Under-bust and ribcage guide

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Create a torso loop below the chest where shaping darts, bodice fullness and under-bust bands may be compared. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Visualize the guide only when requested, with numeric gap to neighboring chest/waist curves and bilateral comparison. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Identify a body-relative plane near a validated ribcage landmark, choose the torso loop, and derive signed surface offsets. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Confirm the loop remains closed and does not split into arm components; report invalid topology with a useful correction. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 017 / 130 — Waist and navel transverse references

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure).

### Capability and motivation

Support distinct natural waist circumference and umbilicus-height reference even if they differ on a given body. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Allow both line families in different neutral colors and label the physical y-coordinate and measurement basis. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store belly-button landmark as a point and waist as a contour with separate anatomy semantics; fit loops by posture-aware local frame. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Bend avatar trunk and verify umbilicus marker moves with skin while waist ring tracks anatomical torso orientation. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 018 / 130 — High-hip and full-hip guides

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Show pelvic cross-sections for trouser/long garment staging, with clear anterior/posterior visibility. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Snap waistband edge or 3D tape to guide subject to preview/commit distinction; support hip vs high-hip offsets. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Exclude hand and thigh geometry from torso contour extraction, use pelvis-relative frames and preserve projection source IDs. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Test pose with arms beside hips and legs spread; no circumference may include the hand or neighboring leg. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 019 / 130 — Shoulder apex and armhole landmarks

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Mark left/right acromion, neck-to-shoulder trajectories, armpit points, scapular region and sleeve pitch axis. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide a local fitting frame and guide rings for sleeve arrangement; clearly distinguish anatomy landmarks from sleeve seam notches. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute joint-relative shoulder frames, local orthonormal bases and projected armhole targets on skin; allow manual correction. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Raise both arms at different angles; sleeve placement targets must rotate with joints and preserve left/right identity. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 020 / 130 — Editable construction line sets

**Category:** Avatar anatomy, landmarks and construction reference  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Let a designer add longitudinal, circumferential, diagonal and free 3D avatar pen lines, plus named presets for center front/back. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Add locking, hide/show, grouping, mirroring, attach-to-mesh, snapping and saved templates; line can inform pattern but must not alter avatar skin by default. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Persist each line as ordered barycentric hits with body mesh and rig version, rebuild curve under pose and reject stale targets. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Save lines, switch avatar skin mesh and pose, detect unmappable anchors, then offer explicit remapping instead of placing guide in midair. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 03: Bounding volumes and arrangement points

### Officially documented foundation [D]

CLO documents avatar bounding volumes with editable shape and joint endpoints, plus arrangement points distributed around bounding-volume curvature. A selected pattern can preview the placement while hovering over a point, and clicking can place its center there. Symmetry-aware arrangement and Flip Wrap Direction are documented behaviors. The pattern arrangement property editor exposes point name, flat/curved style, X/Y position, offset and orientation.

### EXO engineering interpretation [E/P]

A bounding volume is an authored body-region fitting scaffold, not a collision surface or exact body skin. EXO should maintain shape primitives anchored to avatar rig bones, sampled circumferential parameters and canonical placement coordinate frames, then evaluate panel vertices with an explicit flat/curved mapping. Preserve the true 2D metric shape and relate each mapped vertex to the originating pattern coordinate.

**Primary references:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction) · [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume) · [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting) · [3dsettings](https://support.clo3d.com/hc/en-us/articles/360001547168-3D)

## PAGE 021 / 130 — Torso bounding-cylinder creation

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

### Capability and motivation

Provide body-linked torso volume defined by top and bottom landmarks, radius profile, cross-sectional ellipse and outward clearance. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Preview the scaffold in translucent green with editable handles without hiding the avatar or garment. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Persist source joints, evaluated transform, profile parameters and safe default axis; use explicit world units for radius and height. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Change avatar height and verify volume scales or maintains absolute dimensions according to the chosen locking setting. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 022 / 130 — Cuboid and rounded-body volumes

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Support cuboid or rounded cuboid scaffolds for flatter anterior surfaces and custom display mannequins. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Switch cylinder/cuboid without deleting points; show corner roundness only where valid, with immediate preview. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Implement normalized surface parameterization of four rounded sides with consistent tangents and no UV seam discontinuities. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Sample a grid of parameters around all corners and check continuous positions/normals, no self-intersections. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 023 / 130 — Limb bounding volumes

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

### Capability and motivation

Construct arm and leg scaffolds driven by actual shoulder/elbow/wrist and hip/knee/ankle joints. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display a local axial arrow indicating the taper and cuff wrapping direction. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Solve tapered cross-sections in joint space and handle nonuniform rig scaling; avoid global-vertical assumptions. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pose bent elbow and verify sleeve arrangement follows the curved limb axis with controllable clearance. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 024 / 130 — Arrangement point distribution

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dsettings](https://support.clo3d.com/hc/en-us/articles/360001547168-3D).

### Capability and motivation

Place visible clickable points at semantic torso front, back, sides, sleeves, collar, cuff and hem positions. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Hover highlights one anchor, shows its name and a ghosted pattern orientation; selection must remain stable under orbit. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute each anchor with body region ID, angular coordinate, normalized height, tangent basis and symmetry partner ID. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Select each point after large camera orbit and verify consistent named anchor and bounded pixel hit area. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 025 / 130 — Pattern preview on hover

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

### Capability and motivation

Show a translucent, body-hugging ghost of the selected 2D piece before committing placement at an arrangement point. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display orientation, seam references, collision warning and preview bounding box; Escape or mouse exit discards preview cleanly. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Allocate preview mesh separately from authoritative solver positions; cache parametric mapping and reuse triangulation. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rapidly hover 30 anchors; assert no new committed placement, memory growth or stale ghost meshes. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 026 / 130 — Symmetric arrangement

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Selecting a right-side sleeve anchor optionally places its linked left sleeve pattern at mirrored arm point. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Support linked/unlinked symmetry and show both previews before committing; preserve pattern-handedness and normal direction. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Transform through a canonical sagittal plane with mirrored local tangent basis and UV orientation flags. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Arrange sleeve pair; verify both sides use respective joint frames and mirrored seam notch orientation. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 027 / 130 — Angular wrap direction

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

### Capability and motivation

Allow clockwise/counterclockwise wrapping around each bound volume, including cuff flip-wrap behavior. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer a small direction toggle and arrows around the volume while previewing the seam side. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store a signed angular parameterization, offset seam in circumferential coordinates, and rotate normal consistently. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Place a long narrow cuff with both wrap directions; ensure no accidental multi-turn spiral unless explicitly selected. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 028 / 130 — Arrangement property X/Y shifts

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dsettings](https://support.clo3d.com/hc/en-us/articles/360001547168-3D).

### Capability and motivation

Expose authored per-piece horizontal and vertical adjustments relative to the scaffold, distinct from unrestricted world translation. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Numeric inputs and drag handles update preview while retaining attachment to the same arrangement point. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Apply movement in local tangential/axial basis, carry point name and region ID, and validate shifts against volume bounds. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Shift bodice 2cm along X then 3cm along Y, save/reload, and compare exact world vertex positions. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 029 / 130 — Arrangement offset and style

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

### Capability and motivation

Vary signed normal clearance from the body scaffold; switch flat/curved shape style with same center, rotation and material-space definition. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use a live thickness-safe slider, presets for close/loose staging and a warning when points intersect the avatar. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Evaluate a flat tangent-plane mapping or curved surface mapping and add clearance along outward normals; inspect collisions on every edit. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Round-trip flat→curved→flat; original cut lengths and outline point IDs must be unchanged. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 030 / 130 — Arrangement presets and custom point libraries

**Category:** Bounding volumes and arrangement points  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [bounding](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

### Capability and motivation

Save per-avatar point sets and region volumes; apply standardized shirt, pant, dress and jacket layouts. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide point list, create/delete/rename, import/export and snapshot diff; unsupported rig joints must be reported. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Version anchor schema and validate body mesh hashes, joint names and mirror partners before applying saved arrangement. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Transfer a point preset between two compatible rigs and reject missing bones or conflicting IDs without corrupting garment placement. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 04: Pre-simulation curvature and body wrapping

### Officially documented foundation [D]

The curved pattern layout in CLO is described explicitly in 3D settings and Arrangement Property Setting; Fold Arrangement is a separate operation around a line with a fold gizmo. Marvelous Designer teaches basic and adjusted pattern arrangement as preparation for simulation. In EXO, `preDrapeDisplayPositions(snapshot)` currently curves flat reset-stage panels for visual preview, but that display transform does not update actual Rust solver coordinates. Previous experimental assembly had large seam gaps despite a body-following screenshot.

### EXO engineering interpretation [E/P]

The engine must split authoring geometry, displayed staging mesh, collision-validated physical initial state and solved cloth. A mathematically bent drawing is useful for design; a valid solver start additionally requires stretch/bend bounds, real avatar contact and a sewing correspondence acceptance gate. The user should be able to inspect staging before simulation and predict which geometry will actually be simulated.

**Primary references:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction) · [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting) · [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1) · [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement) · [md-arrange](https://support.marvelousdesigner.com/hc/en-us/articles/47358316523673-8-Arrangement)

## PAGE 031 / 130 — Flat starting panel pose

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

### Capability and motivation

Maintain exact rest metric lengths and original garment pattern curves before arranging, with deliberate 3D placement around avatar. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer Flat, Curved and Simulated pose comparison buttons with clear state labels. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Retain rest UV and source boundary IDs; snapshot transform should be reversible unless user applies an explicit placement. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Toggle flat and curved ten times and check no cumulative vertex drift or hidden mutation of 2D sewing IDs. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 032 / 130 — Developable torso bending

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

### Capability and motivation

Bend front/back bodice along an avatar-relative curved reference instead of a rigid plane with a decorative center bulge. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show control over wrap radius, arc coverage, tilt and clearance while retaining center-front alignment. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use arc-length-preserving cylindrical/elliptic parameterization or constrained mesh optimization; measure intrinsic edge changes. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Validate edge length error distribution, arc-length conservation and collision-free coverage over 150–200cm avatars. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 033 / 130 — Piecewise body-surface parameterization

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

### Capability and motivation

Join torso sections with locally adaptive surface frames around chest, waist, abdomen and shoulder transitions. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Expose body-region anchors and editable transitions; avoid harsh creases where curvature changes. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Build a lofted torso scaffold from closed mesh cross-sections and constrain mapping monotonicity, Jacobians and direction. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Test three anatomies with unequal chest/waist girths; no foldover triangle, seam index change or inward surface point. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 034 / 130 — Sleeve wrapping around upper arm

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement).

### Capability and motivation

Stage sleeve patterns around the posed arm centerline with radial clearance and shoulder/armhole alignment. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide sleeve pitch and rotation controls, mirror placement for opposite arm, and before/after preview. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Derive tangent frame along bone/skin centerline with parallel transport; map circumference proportional to source sleeve width. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Raise elbow and rotate arm; preserve sleeve circumference and avoid self-intersection at axilla. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 035 / 130 — Neckband curved staging

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-arrange](https://support.marvelousdesigner.com/hc/en-us/articles/47358316523673-8-Arrangement).

### Capability and motivation

Position narrow collar/rib pieces around neck opening at a distinct wrap radius and correct stripe direction. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Label which seam side attaches to neckline and preview start/end alignment marks. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Project neckline segments into a collar-following frame while preserving knit stretch specification separately. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Verify collar loop closes without wrong-facing normals and no neck penetration over different body widths. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 036 / 130 — Shoulder yoke and armhole transition

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

### Capability and motivation

Curvature should meet along clavicle and shoulder contour, with seam endpoints near actual sewing partners. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show topological seam pairing as arrows and highlight the worst remaining shoulder gap. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Optimize piece transforms jointly under body clearance, seam distance and intrinsic strain penalties; maintain source seam correspondence. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Compare shoulder p95/max residual against preflight; reject visually close pose that exceeds physical start gate. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 037 / 130 — Pleat and dart folding before drape

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [properties](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

### Capability and motivation

Pre-fold selected material along internal/sewing construction lines to supply a stable and intentional initial configuration. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Drag a hinge gizmo, edit numeric fold angle and preview symmetric counterpart. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Identify two sides of each fold line in the material mesh and apply a local rotational field with bounded transition. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate a pleat 180° and back; verify outline continuity, self-collision alerts and saved angle fidelity. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 038 / 130 — Pattern layer order and superimposition

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

### Capability and motivation

Stage linings, pockets, facings and outer shell with explicit outward offsets and sublayer order before solver engagement. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display labels for front/back and inner/outer; isolate one layer or x-ray to resolve overlap. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store ordered layer/contact groups with collision thickness and directional normals, and compute clearance on each layered shell. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Place lining under outer cloth and pocket on front; verify no depth sorting swap across cameras or mirrored placements. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 039 / 130 — Curved-preview to solver handoff

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement).

### Capability and motivation

An explicit handoff must convert visible curved staging to the actual solver input only when it passes geometry and collision checks. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer preview, validate and apply sequence with a metric table; never auto-promote preview-only coordinates. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Serialize proposed 3D particle positions or per-piece transforms, validate rest lengths and contact with the same avatar triangles, then commit atomically. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Assert solver frame zero equals approved staging within epsilon and reject unapproved high-seam-gap poses. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 040 / 130 — Pre-simulation staged sewing progress

**Category:** Pre-simulation curvature and body wrapping  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-arrange](https://support.marvelousdesigner.com/hc/en-us/articles/47358316523673-8-Arrangement).

### Capability and motivation

Expose an intelligible sequence from exploded sheets to arranged near-body pose, seam attraction, gravity drape and settled result. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide timeline scrubber with locked stage names and residual seam-distance histogram at each checkpoint. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Maintain immutable source geometry and checkpointed physical state; annotate stage transitions with collision and strain metadata. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Scrub back from 120-frame drape to initial arrangement; ensure no persistent geometry drift and every checkpoint can be reproduced. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 05: Sewing lines, colors and construction correspondence

### Officially documented foundation [D]

CLO can display seamlines on the garment and separate threads connecting unjoined edges, and supports 3D Segment, Free, 1:N and M:N sewing tools. During tool workflows, selected sewable segments are emphasized and invalid picks can be shown as red; neon highlighting is documented for some multiple-sewing operations. Any general color-per-seam scheme chosen by EXO is a proposed design convention unless demonstrated directly in CLO. A sewing guide must preserve directional notches and correspondence, not only draw attractive colored strokes.

### EXO engineering interpretation [E/P]

EXO already renders seam guide segments and dots from native snapshot guides using a six-color palette, plus source panel boundaries. The next upgrade is a single seam visualizer driven by typed sewing relationships: pair ID, source panel edges, arclength intervals, direction, notch alignment, unresolved gap and workflow status. Rendering and hit testing should derive from the same graph and source UV for both windows.

**Primary references:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [sew](https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing) · [mn-sew](https://support.clo3d.com/hc/en-us/articles/360001771067--3D-Tool-M-N-Segment-Sewing) · [auto-sew](https://support.clo3d.com/hc/en-us/articles/360053353574-Auto-Sewing-ver-6-0) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 041 / 130 — Seam group color identity

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Assign a stable and distinctive hue to each authored sewing pair across 2D and 3D, while retaining selected/hover/invalid semantic emphasis. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Add legend, hover label, accessibility-safe outline styles and per-seam visibility; avoid relying solely on colors to distinguish pair direction. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Hash persistent pair ID to palette with a collision-avoidance map; record saved manual override as presentation metadata. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reload, reorder seam array and remesh; same seam IDs must retain same color and highlighted endpoints. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 042 / 130 — True paired edge rendering

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [sew](https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing).

### Capability and motivation

Draw both sides of a sewn seam on their separate source pattern boundaries even when far apart before simulation. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show continuous paired ribbons on each edge, optional dotted bridges, directional arrows and endpoints. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Sample both curves by normalized sewing arclength with stable UV/source-index correspondence rather than matching array positions. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Sew a curved sleeve cap to an armhole; verify displayed samples match both 2D curve intervals with correct direction. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 043 / 130 — Seam bridge threads

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [mn-sew](https://support.clo3d.com/hc/en-us/articles/360001771067--3D-Tool-M-N-Segment-Sewing).

### Capability and motivation

Display 3D connecting threads across the gap between each paired sewing sample while panels remain open. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Let threads be independently toggled from seamline marks; fade density for large meshes without losing endpoint accuracy. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Recompute 3D thread coordinates from barycentric source attachments each solver frame; use instancing or batched line geometry. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pull panels apart and start simulation; thread endpoints must remain tied to the correct edges at every frame. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 044 / 130 — Directional notches and seam arrows

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto-sew](https://support.clo3d.com/hc/en-us/articles/360053353574-Auto-Sewing-ver-6-0).

### Capability and motivation

Make seam direction visible on source edge and 3D ribbon; surface an error if users connect edges in opposite order. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show directional arrows on hover and notch ticks in matching colors, with optional front/back orientation labels. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store seam side orientation explicitly, map notches by arclength fraction, and validate signs during topology edits. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reverse one side intentionally and verify the UI marks mismatch before any simulator command is issued. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 045 / 130 — Sewing length and ease visualization

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Display each pair's true curved lengths, difference in centimetres and percent mismatch, with optional gather/ease distribution profile. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use warm warning colors only for measured errors; preserve seam identity palette in a separate channel. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Read analytical/sampled curve length from 2D geometry, not the deformed 3D cloth segment whose length changes under strain. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Change curve radius and ensure mismatch updates in both windows, including partial and split segments. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 046 / 130 — 3D segment sewing workflow

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Enter the tool, emphasize sewable boundaries, click first edge then corresponding second edge, preview pairing and commit with undo. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show target panel and direction, allow snapping to nearest valid segment, and prevent selecting hidden or locked fabric parts. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Build a typed selection state that resolves 3D ray hits to source edge ID and interval, with robust UV mapping. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Stitch torso side seam in perspective and verify native seam graph and 2D highlights persist after save/reload. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 047 / 130 — 3D free sewing workflow

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [sew](https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing).

### Capability and motivation

Select exact start/end fractions on first line and second line, with editable intermediate preview and Esc/Delete handling. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Maintain visible anchors and colored current-selection lines while camera orbits; support partial-edge sewing. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Represent each endpoint as {panel, edge, normalized arc fraction} and prevent zero-length or self-conflicting relations. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Create half an armhole seam; verify unaffected edge half stays available and endpoints survive mesh refinement. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 048 / 130 — M:N and 1:N sewing correspondence

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [mn-sew](https://support.clo3d.com/hc/en-us/articles/360001771067--3D-Tool-M-N-Segment-Sewing).

### Capability and motivation

Map multiple segments or panels to corresponding unions of segments with proportional length allocation. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide a multistep progress panel, Enter confirmation, Undo Last and directional notch preview. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Form ordered segment chains and distribute reference arclength using measured lengths, recording each generated pair with traceable ownership. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Sew a multi-piece collar to neckline chain with mismatched segment counts and verify orientation and seam lengths. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 049 / 130 — Sewing group diagnostics

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto-sew](https://support.clo3d.com/hc/en-us/articles/360053353574-Auto-Sewing-ver-6-0).

### Capability and motivation

Report max/p95/mean 3D gap, twisted seam direction, missing source edge, unattached endpoints and overlap risk separately. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use a seam inspector listing largest residual groups first, with click-to-focus camera and source 2D selection. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute metric pairs from saved correspondence and current world pose, cache by frame revision and avoid fabricated values from rendered line pixels. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Use the archived CLO reference sewing XML and EXO Thomas fixture; reproduce measured gaps independently. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 050 / 130 — Auto-sewing readiness and preview

**Category:** Sewing lines, colors and construction correspondence  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Offer a reversible preview of automatically suggested seam links after arrangement; show confidence and unmatched edges. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Group suggestions by garment region and require visible acceptance of each ambiguous pairing. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Gate inference by region role, source geometry, symmetry, distance, notch and arrangement-point metadata; never silently overwrite user sewn pairs. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

For a T-shirt with sleeves and collar, evaluate correct matches, reversed suggestions and false-positive prevention. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 06: Pattern baselines, reference guides and overlay design

### Officially documented foundation [D]

CLO distinguishes Show Internal Lines, Show Baselines, Show 3D Seamlines and Show 3D Pen; avatar display controls separately expose measurements, avatar pen and tapes. These are evidence-backed categories, but the precise breast/chest/belly-button construction grid requested for EXO is a custom functional specification. Its geometric paths must attach to the intended avatar and pattern source, not to a fixed screen overlay.

### EXO engineering interpretation [E/P]

A dedicated guide system should handle at least four domains: avatar-surface anatomical curves, 3D pattern projected lines, 2D material drafting lines projected onto cloth, and temporary screen composition guides. Each carries a stable ID, anchor domain, style, visibility scope, lock/snap semantics, and edit provenance. Correct depth and offset are necessary to avoid flicker or x-ray leakage.

**Primary references:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar) · [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 051 / 130 — Pattern grainline on 3D cloth

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Project the drafted warp grain arrow or axis directly onto the currently curved or simulated panel surface. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer short arrow, continuous grainline and directional woven grid toggles; selected grainline is legible on dark and light fabrics. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Map exact material UV samples through triangle barycentric coordinates into current solver world positions and local normal offset. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Twist and drape the garment; compare 3D arrow endpoints to conserved 2D grain coordinates. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 052 / 130 — Pattern center-front marking

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Show a center-front baseline aligned with the 2D bodice fold/mirror axis, independent of the anatomical sternum line. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display center-front and avatar-front guides simultaneously with contrasting line styles; report lateral divergence as gap. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Sample saved 2D baseline and transform onto deformed cloth; preserve original line ID through points and curves. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Move front panel relative to body; anatomical line remains on avatar while garment line moves with panel. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 053 / 130 — Pattern center-back marking

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure).

### Capability and motivation

Derive center-back or center-fold line from source pattern metadata and render on rear cloth surface. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Hide in front normal view if occluded, optionally ghost through the body with a clearly marked x-ray mode. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use mirrored source baseline and 3D material-space projection; handle winding changes and back-face material toggles. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate 180° and verify center-back line follows the correct back pattern without seam crossing. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 054 / 130 — Cross-chest drafting baseline

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Let user create an exact horizontal line at chosen garment-relative chest-level measurement on selected front or back panel. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide end-to-end display, centimeter dimension tick, point handles and snap-to-symmetric center. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Anchor in pattern material coordinates and clip curve to polygon interior; project sampled segments per current cloth pose. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Resize chest line and edit garment shape; ensure baseline does not spill outside cut polygon and keeps a stable ID. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 055 / 130 — Belly-button crossing line

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Add independent garment-level belly-button height line projected from an explicitly selected avatar landmark or manual measurement. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer body-centered match mode, surface-level match mode and free pattern drafting mode with clear status labels. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Derive target avatar landmark, map projected curve into garment UV via ray/surface closest queries only on user commit. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Move shirt, stretch torso and change avatar: inspect inferred line origin and measure alignment error quantitatively. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 056 / 130 — Shoulder and sleeve pitch guidelines

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Show armhole, shoulder slope, cap notch and sleeve pitch axes together while placing sleeve pieces. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use consistent dashed stroke for guide, solid for sewn edge and tick for notch, with hide-scope controls. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute source notch and seam arclength to world, establish shoulder and upper-arm frames and link line geometry by IDs. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pose arms; notch guide stays attached to sleeve, shoulder landmark stays attached to avatar. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 057 / 130 — Waist/hem measurement plane

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [attach](https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure).

### Capability and motivation

Overlay world horizontal or pelvis-relative measure plane, with difference between selected garment hem and avatar waist/hip cross-section. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display only requested contour arcs and signed distance heatmap, avoiding a full busy 3D lattice by default. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Sample garment boundary in world and compare to avatar contour using signed nearest distances, with unit annotations. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Set hem 3cm below navel guide and verify measured distances in front and side camera views. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 058 / 130 — Adjustable 3D guide density

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Offer view toggles for reference grids at 5cm, 2cm and free spacing, plus visible labels only at zoom-appropriate resolution. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Prevent guide overload by dimming distant marks and prioritizing selected entities; maintain deterministic colors. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Build guides procedurally from material/skin parameterization, apply screen-size LOD and reuse GPU line buffers. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Zoom from full avatar to collar and verify no aliasing, font collisions or slowdown with all groups enabled. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 059 / 130 — Depth, x-ray and occlusion semantics

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Distinguish physically covered guide lines from construction lines intentionally visible through cloth and body. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide Normal, Ghosted and X-Ray per guide category with transparency feedback and explicit legend. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use proper depth testing, polygon offset and separate render passes rather than forcing all guides to depthTest:false. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Put back guideline behind front chest; normal view must occlude it, x-ray must show it with visibly different style. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 060 / 130 — Guide authoring, snapping and deletion

**Category:** Pattern baselines, reference guides and overlay design  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Create a 3D line by clicking garment or avatar surface, adjust control points, smooth curves, mirror, lock, label and delete. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer snap to anatomical line intersection, pattern notch, sewing edge, panel point or other guide with priority settings. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store barycentric anchors and scene target identities; validate after topology edits, undo and remapping. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Split the underlying pattern edge, remesh, save/reload, and verify guide either maps correctly or announces unresolved anchor. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 07: 3D camera, framing and navigation

### Officially documented foundation [D]

CLO and Marvelous Designer supply orbitable 3D workspaces with camera controls, scene framing and different window layouts. CLO's Select/Move and gizmo are described independently from viewport navigation; Marvelous Designer supports split/isolated 3D and 2D views. Camera choices and view transforms are not physical garment modifications. EXO currently uses OrbitControls and a perspective camera, with selected alternative view positions, a stage and optional orthographic projection.

### EXO engineering interpretation [E/P]

A camera model should preserve target, position, view type, zoom/ortho scale, clipping, active selection and linked project view bookmarks. Every pointer ray must use the exact current projection and canvas dimensions. Persist camera state per viewport, not in garment material/solver vertices, and use a single event owner for touch, trackpad, mouse and camera hand controls.

**Primary references:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo) · [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window) · [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment) · [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout)

## PAGE 061 / 130 — Orbit around garment and avatar

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

### Capability and motivation

Support smooth controlled orbit about avatar center, selected panel, selected seam or a user-set pivot. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide a focus pivot indicator and temporary orbit during edit mode with a predictable modifier. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute target from selected mesh world bounding box or barycentric hit; maintain damped control and far/near clipping. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Orbit around a highlighted sleeve while 3D seam threads update; no cursor jump or selected entity loss. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 062 / 130 — Perspective versus orthographic

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Allow true perspective and measured orthographic front/back/side/top views, preserving apparent center and user zoom. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show active projection indicator and accurate fit extents; prevent orthographic images being used for real dimensions without scale. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Adjust camera projection matrix, ortho plane and raycaster intersection; retain target and world-up orientation. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Switch cameras at center chest and check identical world hit position within tolerance. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 063 / 130 — Front/back/left/right/top bookmarks

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Offer direct single-click canonical camera buttons and keyboard presets for drafting and quality checks. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use avatar orientation rather than global XYZ when imported avatar is rotated; label anatomical left and right unambiguously. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Derive basis from body transform; store bookmark as position/orientation/target plus world axis convention. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate the avatar root 90° and verify Front still views actual anterior anatomy. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 064 / 130 — Zoom to selection

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Frame the current pattern, seam, trim, avatar guide or whole garment without clipping it. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Enable animated motion and a maximum-frame bound for extremely large imported stage assets. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute world-space bounds of selected semantic entities and projection-derived distance; exclude background stage from garment fit. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Frame a 2mm button and a full-length coat; both should remain visible with sensible near plane. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 065 / 130 — Zoom around cursor

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout).

### Capability and motivation

Track pointer position when zooming so the inspected seam does not drift off screen. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Honor touchpad pinch, scroll and accessibility zoom sensitivity; keep camera near/far stable near cloth. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use raycast target depth as zoom pivot and clamp camera to min/max distances relative to geometry scale. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Repeatedly zoom into an armhole and out 20 times, ending within accepted screen-space location error. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 066 / 130 — Camera pan

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

### Capability and motivation

Translate camera and orbit target in the image plane with space/middle mouse gesture. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show temporary pan cursor; do not accidentally pick sewing edge while panning over it. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Project pixel translation through view depth and camera right/up vectors; keep selection state unchanged. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pan while edit sewing is armed; no accidental seam commit or pattern move. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 067 / 130 — Camera clipping and isolate

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Support per-camera near/far adjustment, section-plane cut and isolation of selected garment components. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show section-plane affordances without permanently deleting mesh data; allow front-only viewing of avatar guides behind sleeve. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use shader clipping planes and ID-based visible mask with correct raycast visibility. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Clip through jacket layers, toggle back, and compare mesh/solver checksums before and after. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 068 / 130 — Camera path and bookmarks

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Save named front detail, side silhouette, interior lining and manufacturer orthographic views per project. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide a small bookmark rail, reorder, rename and thumbnail capture. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store pose matrices and projection settings, not screenshot as authority; resolve targets by semantic ID where applicable. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Save three viewpoints, modify garment, reopen bookmarks and confirm stable orientation and target fallback. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 069 / 130 — Dual-view synchrony

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Optionally synchronize 2D/3D selection and fit focus without forcing the same zoom scale. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Highlight the selected 3D seam in 2D and animate both views to relevant locations with a toggle to unlink. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Dispatch semantic selection commands via project IDs and let view adapters compute independent camera transforms. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Select six seam segments in both directions; no infinite selection ping-pong or camera oscillation. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 070 / 130 — Screenshot export and schematic camera

**Category:** 3D camera, framing and navigation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-ui](https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout).

### Capability and motivation

Generate clean visual/reference exports with optional overlays, calibration bars, transparent background and consistent pixel size. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide artifact presets for editorial image, flat technical image and fit diagnostics with distinct layer rules. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Render off-screen using a configured copy of camera/state; include metadata on project revision and display settings. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Export identical camera twice and pixel-diff output; ensure diagnostics do not masquerade as physical fit certification. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 08: Selection, 3D editing and transform tools

### Officially documented foundation [D]

CLO documents 3D pattern Select/Move, unified or divided gizmos, direct positioning, fold arrangement, shape flipping and other 3D pattern tools. The installed CLO 7 toolbar evidence records a 20+18 dual-column tool set, but a visible EXO icon is not proof that the corresponding action is implemented. The 3D tool contracts differ significantly between simulated cloth grabbing, static arrangement, and authored pattern topology edits.

### EXO engineering interpretation [E/P]

EXO's current scene has TransformControls, custom ring handles, pointer selection and stretch dragging backed by native point constraints. A tool should consume semantic 3D hit data, apply reversible project mutations, and preserve or explicitly invalidate dependent sewing, materials and fabric mappings. Distinguish visual-only movement during drag from committed native placement change.

**Primary references:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo) · [direct](https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning) · [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281) · [flip](https://support.clo3d.com/hc/en-us/articles/115012225847-Flip-Normal)

## PAGE 071 / 130 — Unified select/move gizmo

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

### Capability and motivation

In simulation-off mode, let one tool select panel, translate on red/green/blue axes and rotate around local/world axes. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show handles with legible active axis and numeric delta, provide snapping and explicit Cancel. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store transaction origin, quaternion, pivot and placement decomposition; apply one native command on commit. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Drag X by 2cm; compare committed translation, undo, seam endpoint positions and selected bounding box. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 072 / 130 — Divided Q/W/E tools

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [direct](https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning).

### Capability and motivation

Optionally expose Select, Move and Rotate separately for power users with configurable shortcuts. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display active cursor, maintain tooltips and switch while preserving current selection. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Map all three tools to shared typed transform action instead of different incompatible mutation paths. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Switch modes 100 times mid-session and verify no orphaned transform listeners or stale drag state. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 073 / 130 — Direct positioning on avatar

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement).

### Capability and motivation

Allow dragging a flat pattern or imported trim to the hovered garment/avatar surface with ghost placement and rotation restriction. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show surface normal arrow and panel face side; allow Shift rotation lock, offset and snapping. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Convert ray hit to body/garment local frame with tangent basis and stable anchor, rejecting back-facing depth accidents. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Drop a button and a fabric patch on different body angles; verify anchored pose after garment deformation. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 074 / 130 — 3D pattern mesh brush selection

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Support brush, lasso and rectangle selection of cloth vertices while respecting visible/hidden faces. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show brush radius in physical cm, selected particle count and smooth influence falloff. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Select native solver vertex IDs using ray/screen-space BVH, store selection separate from pattern editing topology. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Brush front of shirt with back hidden; back vertices remain excluded and selection survives the next snapshot. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 075 / 130 — 3D styleline editing

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [flip](https://support.clo3d.com/hc/en-us/articles/115012225847-Flip-Normal).

### Capability and motivation

Add/edit surface-following styleline, drag sampled handles, convert to pattern cut/sew operation only on confirmation. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show dashed draft until committed and an explicit cut-sew preview with resulting piece count. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Map 3D line to UV via triangle crossings, split source curves, migrate sewn relationships and grading constraints. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Draw across curved front panel and return to 2D; verify topology and seam links have valid IDs. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 076 / 130 — 3D pattern line and pen

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [widget](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

### Capability and motivation

Support freehand 3D line on garment and precise anchored polyline/curve editing with undo. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show snapping to internal line, neckline and seam edge, plus line authoring mode. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store material-space barycentric projections and regenerate under pre-drape and simulated poses. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Draw line while draped, move solver, revert to flat and compare UV endpoints with source contour. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 077 / 130 — Fold arrangement gizmo

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [direct](https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning).

### Capability and motivation

Rotate fabric region around an internal fold or sewing hinge with numeric angle and fold-side preference. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide red/green axis manipulators and fold direction preview while preventing sudden camera orbit. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Build hinge deformation constrained by source fold line, preserve rest lengths where possible and save authored fold semantics. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Fold cuff in both directions, then undo and verify source geometry remains consistent. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 078 / 130 — Flip face and normal

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [fold](https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement).

### Capability and motivation

Swap a selected panel's outward surface intent and fabric front/back display with a clear confirmation preview. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show a face-side checker and arrow after flip; reflect fold-angle sign if required by the operation. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Update winding/render side metadata and surface normals without arbitrarily swapping pattern seam IDs. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Flip twice; guarantee initial appearance/normal state and all sewing references restored. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 079 / 130 — Freeze/deactivate/pin interaction

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Distinguish frozen simulation particles, temporarily deactivated panels, pinned zones and screen-selection lock. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use separate visible badges and contextual controls so locked editing is not mistaken for frozen cloth. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Track constraint source/type, affected native vertex IDs, lifetime and solver status; release cleanup on cancel. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Freeze a sleeve while simulating, activate again and confirm no permanent mesh corruption or thread misregistration. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 080 / 130 — Multi-object 3D transform

**Category:** Selection, 3D editing and transform tools  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [flip](https://support.clo3d.com/hc/en-us/articles/115012225847-Flip-Normal).

### Capability and motivation

Select linked sleeve panels or numerous trims and transform them as a group with correct pivot and undo semantics. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer individual origins versus group center, mirror operation and precise numeric rotation. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Apply transforms in world space from stable starts, maintaining relation/parent IDs and avoiding cumulative float drift. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Group-move two panels; verify seam distances and object-relative transforms are preserved after reload. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 09: 3D trims, materials and surface presentation

### Officially documented foundation [D]

CLO distinguishes surface render modes, graphic visibility, buttons, piping, bindings, trims, puckering, sewing details and simulation/visual material properties. Marvelous Designer's release notes list UV preservation, updated material/render behavior and view options. Source-based evidence does not imply EXO already reproduces those tools; EXO has various native hardware and graphics overlays whose linkage should be inspected per action.

### EXO engineering interpretation [E/P]

The 3D viewer must render visual materials using exact panel UV, mesh normals, and material front/back assignments; hardware and graphics need persistent surface anchors that update with authoritative solver frames. Additional 3D meshes must not alter physical cloth unless a native constraint/collision representation has been explicitly implemented and validated.

**Primary references:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [md-release](https://www.marvelousdesigner.com/products/release) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281) · [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment)

## PAGE 081 / 130 — Front/back fabric surface modes

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Select distinct exterior/interior cloth colors, normals, texture scale, gloss and roughness without material leaking through double-sided meshes. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Expose render options for thick/textured, thin/textured, monochrome and wireframe with separate previews. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Attach exact fabric appearance to native panel mesh and maintain correct front/back-face normals and material side semantics. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate garment inside out; back fabric shows only on correct surface and remains consistent across snapshots. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 082 / 130 — Grain and texture mapping

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Adjust weave grain angle, image repeat, offset and rotation directly in 3D with synchronized 2D UV preview. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show UV grid and repeat count; provide numerical values for woven stripe or print matching. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Preserve source UV independent of deformed vertex positions and transform texture matrix; handle mirrored panels and original grain. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Apply striped fabric to front/back and verify stripe direction before and after dynamic drape. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 083 / 130 — 3D graphic placement

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Place, scale, rotate and warp artwork on selected garment panel with editable dimensions and realistic contact to curved cloth. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show exact center anchor, bleed, print method and clipping against pattern outline. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Bind image graphic to material UV or stencil geometry with source-space transform and remesh-safe identifiers. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Position print across chest and simulate; graphic remains attached to same UV and does not float. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 084 / 130 — Embroidery and raised stitching preview

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Show stitch geometry, stitch density and subtle relief for logos, topstitch and decorative seams. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Differentiate 3D relief preview from actual machine embroidery production data. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Generate GPU-efficient surface-following stitch paths with offset normals, and preserve design source vector coordinates. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Zoom into embroidery, rotate 180° and inspect normals, z-fighting and asset visibility. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 085 / 130 — Buttons and buttonhole placement

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Click a seam or cloth surface to place standard fastener assets and edit dimensions/spacing in cm. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Display paired target buttonhole and button, direction marker and fastened/unfastened state. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Reuse barycentric mesh attachments, production style ID and paired fastener constraint when native engine supports it. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Move button on a deforming placket; button and hole remain attached and selectable without seam click conflict. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 086 / 130 — Zipper geometry and slider

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Render tape, teeth, puller, stops and slider with direction/orientation inferred from two connected sewing paths. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer reverse direction, reset slider arrangement, hide pieces and fasten state controls. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Anchor zipper geometry along parametrized edge curves with actual seam pair IDs, avoiding mesh index-only attachment. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Bend a jacket front, change zipper direction and simulate, confirming slider remains on the intended track. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 087 / 130 — Piping, binding and edge trims

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Model path-based cross sections along designated pattern edges with stable attachment through remeshing. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Surface seam length, cross-section size, fabric and side placement in the Property Editor. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Reconstruct a parallel-transport frame along 3D edge samples and control normal offset without creating visible twists. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Apply piping around a curved collar and verify no tube twists, unstable normals or endpoint discontinuity. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 088 / 130 — Foam padding and trapunto

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Display raised padding with press/recovery and edge ramp; let user edit foam material and surface placement. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show topographic edge, stitching path and contact radius while retaining clear draft-only physical status. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Map source contour through UV triangles, orient outward normals with body visibility, preserve per-pad spring state over solver snapshots. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Press near foam edge and center, release, orbit and update snapshot; pad remains outward, responsive and correctly occluded. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 089 / 130 — Layered lining and translucency

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Preview linings, mesh textiles, interfacing and transparent fabrics with credible depth sorting and collision hierarchy. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide layers inspector and a temporary exploded view that does not change the saved arrangement. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Separate physical layer index and rendering order, use correct depth prepasses and paired thickness/collision metadata. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

View layered jacket from both sides and under x-ray; inner fabric must never visually sort in front incorrectly. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 090 / 130 — Lighting, PBR and garment presentation

**Category:** 3D trims, materials and surface presentation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Offer studio softbox, neutral, runway and technical lighting while retaining consistent material comparisons. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Compare swatches under neutral reference lighting and show exposure/white balance before editorial preset. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Preserve physically based material properties and configure scene environment without touching solver state. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Switch across environments and verify garment geometry and source material values do not change. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 10: Simulation lifecycle and garment physics

### Officially documented foundation [D]

Marvelous Designer describes Simulate as gravity-driven draping with collider objects and offers simulation presets. CLO also provides re-drape arrangement when avatar sizes change, though its support is conditional on CLO avatars or fitting-suit-enabled custom avatars. A physically meaningful result requires explicit sewing/contact/strain metrics, not merely a smooth picture. Prior EXO body-relative PPF experiments are research evidence of failed initial seam gaps and frame-level penetration, so this specification must retain those measured limits.

### EXO engineering interpretation [E/P]

Separate fast design interactions, physically constrained simulation start validation, solver stepping, paused edit, inspected frame diagnostics and baked result playback. A physical asset must carry exact avatar mesh/pose, material constitutive values, seam topology, temporal state and validation provenance. Provide meaningful preflight messages before computationally expensive simulation, and never silently use an approximate preview as solver-ready physics.

**Primary references:** [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation) · [redrape](https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1) · [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281) · [md-release](https://www.marvelousdesigner.com/products/release)

## PAGE 091 / 130 — Simulation start and pause

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation).

### Capability and motivation

Start gravity-driven cloth only from an accepted source pose with visible transport and error state. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show Simulate, Pause, Stop, Reset and state selection; blocked states explain offending seams or collisions. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Validate finite vertices, sewing graph, body/self contact and material ranges before invoking native simulation job. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Trigger from healthy fixture and known bad Thomas pose; bad pose must be rejected with quantitative reason. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 092 / 130 — Real avatar mesh collision

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [redrape](https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1).

### Capability and motivation

Ensure simulated garment collides with the same triangulated posed avatar displayed in the 3D scene. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show optional collider shell and contact normals for diagnosis, hidden in presentation preset. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Share one evaluated skin/rig state and transform between rendering and solver with BVH acceleration. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Move avatar limb during test; collider and visible mesh remain aligned to tolerance over 100 frames. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 093 / 130 — Garment self-collision

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

### Capability and motivation

Handle folding sleeves, nested panels, pockets and overlapping hems without material tunneling. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Visualize collision pairs in a debugging mode with physical penetration depth labels. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use triangle-level body/self collision with swept CCD where required, not only point repulsion. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Fold a cuff repeatedly at high and low solver dt, asserting no invalid intersections throughout. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 094 / 130 — Seam closing over time

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Advance seam attraction using exact sewn-point correspondences without shortcut teleporting across avatar. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Overlay paired stitch residual visualization and temporal gap graph; allow isolation of worst seam. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Couple seam/contact correction and track p50/p95/max per pair over the entire trajectory. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Compare frame-zero and final seam residual; retain zero body penetration while closing links. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 095 / 130 — Cloth material anisotropy

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Model different warp/weft stretch, shear, bending, thickness and friction per fabric. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide swatch ball/cloth drape calibration comparison separate from arbitrary artistic sliders. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Calibrate constitutive response from physical strip/bend tests, track units and solver integration stability. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Run identical panel under rotated grain and verify measured stiffness differs along warp/weft as expected. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 096 / 130 — Time stepping and stability

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation).

### Capability and motivation

Maintain stable simulated motion across frame rate changes, hardware and mesh density levels. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Let user choose draft versus quality presets with estimated cost and visible convergence status. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use bounded substeps, convergence tests, reproducible random seeds if relevant and consistent constraint handling. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Simulate same shirt at different dt/resolutions and compare frame-aligned seam/strain/contact metrics. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 097 / 130 — Freeze, pin and tack constraints

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [redrape](https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1).

### Capability and motivation

Keep authored stationary or garment-to-avatar attachments exactly identifiable and reversible. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show colored pin symbols and frozen region hatch overlay while allowing manual cloth grabs elsewhere. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Convert commands to typed native constraints with parent references, life cycle and undo. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Attach sleeve cuff with tack, simulate, release and verify trajectory without stale constraints. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 098 / 130 — Avatar size adaptation and re-drape

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [auto](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

### Capability and motivation

After body size changes, provide a re-drape workflow that repositions garment while maintaining authored sew links. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Preview planned displacement and report skin collision/margin before committing. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Refit arrangement volumes to changed skin, update garment proposal and validate rest strain/contact before restaging. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Increase chest measurement and remesh avatar; garment must not start embedded inside skin. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 099 / 130 — Resolution and hi-res conversion

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Change mesh density without destroying pattern IDs, stitch arclength or guide anchoring. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show draft/production preview settings and estimated memory/CPU pressure. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Remesh with material UV and topology attribute transfer, reconstruct seam samples and hardware anchor mappings. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Refine sleeve mesh and compare source seam lengths, 3D overlays and physical outcome. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 100 / 130 — Verification and baked garments

**Category:** Simulation lifecycle and garment physics  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Differentiate fast interactive motion from an exported verified simulation with objective fit gates. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Present pass/fail on seam gap, body clearance, self collision, strain and settled stability alongside playback. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Save immutable solver metrics, version, source state hash, avatar signature and accepted frame range. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reject a visually draped result with any failed contact gate; verify output can be replayed identically. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 11: Fit diagnostics, quality modes and measurement

### Officially documented foundation [D]

CLO's 3D display describes stress, strain, fit and pressure maps as distinct views with different physical meanings. Pressure mapping is version-dependent. Marvelous Designer's 3D environment index includes fit properties, strain maps, schematic rendering and statistics. Fabric stress is not a synonym for strain, and render colors cannot independently certify pressure without model support.

### EXO engineering interpretation [E/P]

EXO needs a measurement contract for every diagnostic: exact units, reference shape, relevant time, sample density, confidence, validity constraints, and whether data came from the physical solver or an approximation. The current scene can color triangles with an extension-derived view; retain explicit 'strain approximation' labels until verified against solver forces.

**Primary references:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment) · [md-release](https://www.marvelousdesigner.com/products/release) · [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 101 / 130 — Strain color map

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Color garment panels by local extension relative to rest shape with numerically grounded legend and units. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Allow min/max range, categorical overextension and selected triangle readout; prevent confusing a color-only cue with verified simulation. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute rest-to-current metric deformation gradient or explicit solver strain and map per-triangle scalar. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Stretch a single calibrated strip by 10%, 25% and 50%, checking legend and triangulation independence. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 102 / 130 — Stress color map

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Display computed tensile forces per area along material grain in kPa only when stress is physically available. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show unavailable/uncalibrated state if solver does not emit adequate constitutive measurements. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Derive stress from correct fabric model and solver with grain direction and thickness units; tag provenance. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Under identical extension, compare two calibrated stiffnesses; stronger material should show appropriate stress response. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 103 / 130 — Fit tightness map

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Visualize garment ease and clearance relative to actual avatar surface and contact region. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show signed mm gaps, region labels and cloth penetration alarms independently from color legend. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Project garment samples to nearest correctly classified body triangles and distinguish back-facing nearest points. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Validate underfitted sleeve, oversized torso and body-intersecting hem; compare numerical distances. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 104 / 130 — Pressure map

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Render actual external pressure against avatar surface only when contact force/area data is available. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Distinguish pressure on avatar from fabric membrane stress; use calibrated kPa and confidence mask. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Aggregate contact impulses/forces over surface area, accounting for solver dt and triangle areas. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Apply known controlled force over a measured contact patch; pressure must agree with force divided by area. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 105 / 130 — Mesh wireframe inspection

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Show triangle or quad topology, inverted/degenerate faces, normals, seam discretization and particle density. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Use mesh density overlay and selectable triangle IDs without leaving visualization mode. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Derive mesh from authoritative native indices and mark invalid connectivity before GPU upload. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Load degenerate, sliver and valid meshes; diagnostics must flag only invalid elements. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 106 / 130 — Seam-gap heatmap

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Map stitch correspondence residuals onto paired edges, grouping failure by shoulder, side, collar or armhole. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide sorted top 20 residuals, p95/max and click-to-frame, separated from color pair identity. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compute world pair distances by exact stitch index pairs and arclength metadata. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reproduce reported Thomas max seam gap and verify relocating a panel updates the metric. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 107 / 130 — Particle count and simulation FPS

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Show real render FPS, native solver FPS, frame time, garment mesh count, sewing count and active constraints separately. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Place compact HUD outside garment region with toggle and export diagnostic report. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Read actual timestamp and scheduler signals; differentiate renderer updates and native simulation snapshots. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pause solver while orbiting camera; render FPS may remain high but solver FPS should correctly show paused. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 108 / 130 — Silhouette deviation overlays

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Compare intended reference silhouette or saved CLO export with current EXO garment from matched camera and scale. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show split overlay, transparent comparison mesh and numeric landmark differences; align using avatar landmarks first. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Register source rig/mesh coordinates and compare surface/silhouette metrics using consistent projection. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Compare two render poses with known 2cm shoulder offset and verify result after camera reset. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 109 / 130 — Measurement tape in 3D

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Provide avatar and garment straight/surface measurements with edit handles and unit precision. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Distinguish true geodesic surface length from 3D straight-line distance with typed badges. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store mesh attachments and sample surface curves or geodesic approximations with stated method. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Measure same two points on curved chest with both modes; surface length should not be shorter than straight length. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 110 / 130 — Fit report and manufacturer evidence

**Category:** Fit diagnostics, quality modes and measurement  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Capture body region metrics, seam closure, measurement tolerances, approved simulation version and annotated views. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Generate a design QA report that labels draft vs verified results, with links to source tech pack revisions. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Export immutable report metadata and linked screenshots with reproducible camera and file hashes. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Compare report to actual source artifact after later edits; stale verification must be invalidated by project revision change. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 12: Avatar pose, movement and animation

### Officially documented foundation [D]

Marvelous Designer's 3D window can move avatars to create animations; its release page documents blend-shape animation. CLO avatars have joints and tapes exposed in the 3D display and downloadable avatar editor guidance. Garment pose retargeting and motion playback change body and cloth contact requirements across time and must be validated against the same evaluated mesh used for rendering.

### EXO engineering interpretation [E/P]

Use an avatar runtime that owns skeleton, skin mesh, pose, shape keys, landmark and bounding-volume evaluation. A garment can follow arrangement points while staging, but active simulation should receive a consistent rig-pose stream and have explicit user control over collision and retargeting. Separate motion preview from physically verified dynamic garments.

**Primary references:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar) · [md-release](https://www.marvelousdesigner.com/products/release) · [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation) · [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 111 / 130 — Avatar rig visualization

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Show joints and bone axes in an optional inspection overlay, with transparent skin and selectable hierarchy. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Allow select shoulder, elbow and hip without a tool absorbing garment edit clicks. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Tie rendered joints to the evaluated skin skeleton and use stable bone IDs. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Select every major joint on an imported rig; inspect forward kinematics consistency. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 112 / 130 — Avatar T-pose and A-pose presets

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Apply standardized standing reference poses used for torso and sleeve arrangement without destructive geometry changes. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Preview next pose, warn when live cloth simulation is active, and allow one-click restore. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Save authored pose as quaternion transforms with motion layer and body mesh reevaluation. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Toggle A↔T pose and back; landmark skin anchors retain identity and garment source IDs persist. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 113 / 130 — Custom pose controls

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation).

### Capability and motivation

Rotate joint around anatomical axes and provide constrained IK for wrist/hand and foot dragging. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show elbow/knee bend limits and precise numeric control for repeatable sewing placement. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Solve skeleton IK against joint limits and update skin, collider and bound arrangement scaffolds. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Bend elbow through permitted range; sleeve volume follows with no direction inversion. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 114 / 130 — Motion playback

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Play, pause, scrub and loop avatar animations with synchronized cloth frame timestamps and event markers. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show timeline, current frame/time and playback speed; allow inspect a frame without forcing simulation. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use deterministic animation sampler and solver frame references, maintaining authoritative contact evaluation time. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Scrub from frame 30 to 5 and back; reproduced pose and fabric should match stored frames. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 115 / 130 — Blend-shape body animation

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Support shape-key transitions for chest/belly/shoulder shape changes within supported avatar assets. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show per-shape value and warnings when baseline measurement or garment fit becomes outdated. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Evaluate morph targets before skin attachment and collision BVH refit; recompute relevant guide loops. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Increase chest shape key and confirm anatomical reference line and collision geometry move together. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 116 / 130 — Pose-aware arrangement points

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [avatar](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

### Capability and motivation

Arrangement anchors should follow the deformed avatar body and preserve their local semantic orientation under joint motion. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Preview sleeves bending with upper arm and torso patterns retaining chest-relative location. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Re-evaluate bound volume frames per bone and use transport interpolation to avoid sudden axis flips. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Rotate arm through singularity near vertical and verify arrangement point world position/orientation continuity. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 117 / 130 — Animation-ready collision

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Implement continuous time-aware collision that catches fabric tunneling during fast joint motion. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show unsafe-motion validation alert rather than silently letting cloth clip across moving elbows. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Sample or sweep avatar surface and cloth primitives within each time step, adapting collision substeps to velocity. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Move elbow rapidly through a wide angle and check time-resolved penetration count. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 118 / 130 — Garment motion cache and replay

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-sim](https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation).

### Capability and motivation

Record physically simulated cloth frames for view/export with asset, material and avatar provenance. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Allow take naming, frame-range trim and side-by-side playback of two runs. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store solver metadata, frame transforms and mesh positions with stable topology map and compression strategy. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Save and reload a 300-frame sequence; compare frame hashes and selected stitch positions. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 119 / 130 — Motion camera staging

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md](https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window).

### Capability and motivation

Attach camera tracking to avatar center or selected garment region during animation without affecting physical mesh. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer static camera, follow target and path modes with smooth transition. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store camera constraints and evaluate per frame after avatar/cloth transforms, independent of solver input. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Track sleeve through pose while retaining accurate pointer hover at paused frames. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 120 / 130 — Animation export and compatibility

**Category:** Avatar pose, movement and animation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Export animated garment/avatars to supported files with correct unit scale and normals when formats permit. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide preview of exact animation range and failure messages for unsupported rig/material data. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Generate glTF/FBX/Alembic or other supported target with verified frame/time, vertex and transform consistency. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reimport exported sample and compare mesh centroid, normal directions and frame-60 pose. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>


# Volume 13: Version parity, performance, automation and research validation

### Officially documented foundation [D]

CLO releases and Marvelous Designer releases continue to add capabilities, so an exhaustive 'entire window' inventory must carry application version and evidence date. Official current Marvelous Designer 2026.1 release lists brush pinching, simulation override, seam ripping beta, camera import/export and customization among other changes. Installed CLO 7.0.242 evidence cannot prove 2026.1 behavior. EXO parity must be measured functionally, not inferred from shared toolbar icons or visual similarity.

### EXO engineering interpretation [E/P]

Research priorities should be converted to execution tickets with outcome behavior, input state, native project data mutation, acceptance fixture, installed-app result and limitation. A capability can be documented by vendor, demonstrated in a captured native tool interaction, implemented in source, or independently validated in EXO; these are distinct evidence levels. This master blueprint provides design requirements rather than claiming those tasks have been completed.

**Primary references:** [md-release](https://www.marvelousdesigner.com/products/release) · [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment) · [arrangement](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement) · [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons) · [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281)

## PAGE 121 / 130 — Versioned toolbar census

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Record each tool's visible label, category, hover menu, shortcut and current implementation action per supported CLO version. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide searchable toolbar index and responsive horizontal flyout with real disabled states. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Compare `clo7ToolbarOrder.js` against installed capture and audit command handler coverage, avoiding label-only parity. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Automated tool census checks all visible buttons and asserts one usable effect or a plainly disabled explanation. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 122 / 130 — 3D display toggle census

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Maintain exhaustive table of garment, avatar, trim, map and environment display switches with target render layer. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show parent flyout groups and persisted toggle state across resizing and application restart. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Bind to a declarative display registry with ID, owner, persistence scope, shader/group and test fixture. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Toggle every switch and count affected draw calls and reference object IDs before/after. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 123 / 130 — Marvellous Designer comparative interaction

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [arrangement](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

### Capability and motivation

Benchmark relevant MD 3D functions to prioritize useful UX improvements without copying proprietary art. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Compare arrangement, navigation, mesh brush, soft pinching and simulation feedback through user tasks. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Translate workflows into semantic interaction contracts and reusable EXO tools. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Measure task completion time and error count on equivalent garment fixtures with scripted operations. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 124 / 130 — 2026.1 pinching and soft deformation research

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Study MD brush pinching, override and CLO related cloth selection/fold workflows for a safe future local deformation tool. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Offer pressure brush radius, strength, falloff, undo and playback controls with clear physical versus draft status. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Prototype on separate reversible mesh or native solver constraint, calibrate deformation and prevent broken seam attachments. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Pinch sleeve fabric in 10 strokes and compare recovered geometry and stitch constraints. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 125 / 130 — Schematic manufacturer views

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Create robust technical drawing renders with flat neutral materials, outlines, seam lines, guides and chosen annotations. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Add front/back/side consistency and optional transparent avatar while retaining physical dimensions. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Render separate line/detail passes and export camera/view metadata into tech pack generation. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Generate four view plates and verify no stage/environment contamination and legible line hierarchy. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 126 / 130 — Rendering performance and scene ownership

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-release](https://www.marvelousdesigner.com/products/release).

### Capability and motivation

Handle garment simulation, heavy avatar and tens of thousands of seam markers without CPU spikes or accidental scene disposal. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Show progressive quality and optional LOD of guide density when performance drops. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Cache material-UV mappings and GPU geometry, update positions in place from snapshots, own cleanup per subsystem. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Run 10,000 frames of render/snapshot changes; track steady heap, draw calls and no zombie listeners. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 127 / 130 — Installed CLO inspector methodology

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [md-environment](https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment).

### Capability and motivation

Record screenshots, AX accessibility controls, exact app version and activation steps while respecting UI permissions. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Preserve an evidence bundle and distinguish historical screenshots from newly interacted tests. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Store structured evidence references, named window, inspect timestamp and condition; avoid inferring unseen flyouts from toolbar labels. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Repeat inspector scan on installed CLO and compare screenshot/AX results, flag missing permissions as unknown. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 128 / 130 — EXO installed-app QA contract

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [arrangement](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

### Capability and motivation

Validate behavior in actual installed native application, including mesh appearance and pointer response. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Attach screenshots, sampled click data, exported state and failure reproduction to each capability test. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Drive target via allowed desktop automation or existing QA bridge and assert dataset counters plus visual evidence. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

A visible pad mesh counter alone fails acceptance until press interaction and actual outward bump are observed. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 129 / 130 — Implementation roadmap and dependencies

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [display](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).

### Capability and motivation

Order essential anatomy staging, sewing traceability, depth-correct guides, simulation gate and optional editorial enhancements. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Provide P0/P1/P2 severity, user impact, source evidence and objective expected outcome for each work unit. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Make each ticket own exact modules and data contracts, track dependencies and avoid concurrent edits to shared scene file. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

A ticket completes only after code, tests and installed-app QA corroborate same user-visible behavior. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

## PAGE 130 / 130 — Research maintenance and future parity

**Category:** Version parity, performance, automation and research validation  
**Evidence classification:** [D] category capability is referenced in published documentation; [P] specific EXO user journey, numerical contract, visuals and tests below are engineered proposals.  
**Relevant official source:** [3dguide](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281).

### Capability and motivation

Track documentation URL, last checked, target release, evidence confidence and implementation status for all 3D features. The 3D window should make clear which aspects of the garment are authored as pattern relationships, which are transient staging views, and which arise from a solver. Technical credibility depends on maintaining that distinction while allowing the designer to inspect the same object from different viewpoints and simulation times.

### Detailed user interaction [P]

Publish a revisable reference index and research diff after each CLO/MD version. The tool should expose the active target and a reversible preview before it changes saved garment or avatar state. Pointer hover must indicate the exact source object being affected; disabled operations should explain their prerequisites. Its display visibility, selection and edit locks should be independently controllable so the user can inspect construction without accidentally rewriting the pattern.

### Proposed geometry and data contract [P]

Use a source registry with update records and open unknowns, separating new official claims from EXO engineering proposals. The authoritative source should contain stable IDs for authored entities and a revision or snapshot pointer for derived geometry. Any rendering cache can be rebuilt without losing those semantic IDs. View-only lines and ghosts must stay outside the native physical cloth mesh, whereas committed arrangement, sewing or constraints should pass through a validated native command path. Units and axes must be explicit at API boundaries.

### Focused acceptance test [P]

Reopen ten cited official pages and verify each still directly supports the adjacent research claim. Capture both visible evidence from the installed EXO app and machine-readable identifiers, including expected scene mode and project revision. Repeat the interaction across a static pose and a solver-refresh case; ensure clicking, pointer cancellation, 2D/3D coordination and undo work. This page counts as researched, not implemented, until those tests are run and recorded.

### Cross-window dependency

This feature is expected to maintain a direct relationship with the 2D pattern definition or the avatar measurement graph where applicable. For reversible staging and visual inspection, the designer must be able to return to the same garment cut shape after changing the 3D pose. Any change that affects sewability should invalidate the appropriate seam/collision preflight metrics before simulation or production export.

---
<div style="page-break-after: always"></div>

# Companion research and current implementation evidence

The following original companion audits were completed in the same research pass:

- [CLO arrangement, sewing and avatar detailed audit](CLO_3D_ARRANGEMENT_SEWING_AVATAR_20261018.md) — 43 researched sections with source-specific citations and avatar/curvature/sewing acceptance contracts.
- [EXO native 3D viewport parity inventory](EXO_3D_VIEWPORT_PARITY_INVENTORY_20261018.md) — evidence-graded source audit of existing scene, toolbar, sewing, simulation, layer and measurement behavior.

Both are separate living evidence records. The present master specifies target interactions, while the companion parity audit distinguishes features already visible in source from behavior that still requires installed-app tests.

# Appendix A — Priority execution order

**P0:** Source-linked semantic picking, reliable 3D visibility and line hierarchy; body-relative arrangement volumes and anchors; physically explicit curved staging proposal; canonical seam pair identity and 3D thread rendering; torso front/back and transverse chest/navel reference guides; physical preflight barrier; viewport pointer-state reliability.

**P1:** 3D segment/free/M:N sewing, fold arrangement, direct positioning, avatar tape and landmark editing, complete 3D display toggle parity, precise camera/orthographic views, diagnosed strain/fit/contact maps, stable hardware and graphics binding.

**P2:** Scriptable UI benchmark suite; pose/motion authoring; visual quality/render exports, production schematic generator, intelligent auto-placement, complete tool coverage and advanced simulation effects.

Each ticket should cite a research page, implement one owning source of truth and produce installed-app proof. Native CLO 7 toolbar labels are indexed in `src/data/clo7ToolbarOrder.js`; the related audit is `docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md`. These are useful for comparing capabilities but not sufficient proof that a button works.

# Appendix B — Open research questions and next direct demonstrations

1. Inspect the **currently installed** CLO viewport and exact toolbar flyouts with authenticated accessibility, screen recording and screenshot timestamp; earlier audits observed only some live control frames.
2. Open the CLO male T-shirt reference and capture the **same garment and pose** with Show 3D Seamlines, Show Threads, Show Baselines and avatar measurements toggled separately; photograph palette, line width and occlusion.
3. Use a body-region arrangement point on a fresh flat front bodice, capture hover ghost, click placement, and change Shape Style Flat→Curved with numeric offset while comparing source 2D cut length.
4. Inspect whether CLO has *explicit default* chest/umbilicus guide presets or whether lines must be authored with avatar pen/tape. This research currently treats those named presets as EXO requirements.
5. Re-test EXO `preDrapeDisplayPositions(snapshot)` against actual Rust simulator frame zero and resolve when render geometry differs from physical start geometry.
6. Confirm exact installed native 3D shoe/garment tool behavior across viewport, imported avatars and hardware; all source-only audits need interaction proof.
7. Compare MARVELOUS DESIGNER 2026.1 brush pinching, seam ripping and toolbar customization at specific version, then decide whether to implement solver-backed or visualization-only counterparts.

# Appendix C — Source registry

- **arrangement:** https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement
- **points:** https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction
- **properties:** https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting
- **auto:** https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1
- **bounding:** https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume
- **fold:** https://support.clo3d.com/hc/en-us/articles/115000483547-Fold-Arrangement
- **redrape:** https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1
- **widget:** https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo
- **direct:** https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning
- **smart:** https://support.clo3d.com/hc/en-us/articles/115000525027-Smart-Arrangement
- **display:** https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons
- **avatar:** https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar
- **attach:** https://support.clo3d.com/hc/en-us/articles/115000426228-Attach-to-Measure
- **3dsettings:** https://support.clo3d.com/hc/en-us/articles/360001547168-3D
- **sew:** https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing
- **mn-sew:** https://support.clo3d.com/hc/en-us/articles/360001771067--3D-Tool-M-N-Segment-Sewing
- **auto-sew:** https://support.clo3d.com/hc/en-us/articles/360053353574-Auto-Sewing-ver-6-0
- **3dguide:** https://support.clo3d.com/hc/en-us/article_attachments/48293801440281
- **flip:** https://support.clo3d.com/hc/en-us/articles/115012225847-Flip-Normal
- **md:** https://support.marvelousdesigner.com/hc/en-us/articles/47358233197593-3D-Window
- **md-arrange:** https://support.marvelousdesigner.com/hc/en-us/articles/47358316523673-8-Arrangement
- **md-sim:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation
- **md-reset:** https://support.marvelousdesigner.com/hc/en-us/articles/47358385785881-Reset-3D-Arrangement
- **md-ui:** https://support.marvelousdesigner.com/hc/en-us/articles/47358199995801-Window-Layout
- **md-release:** https://www.marvelousdesigner.com/products/release
- **md-environment:** https://support.marvelousdesigner.com/hc/en-us/sections/51986433234585-3D-Window-Environment

# Appendix D — Existing EXO reference bundle

- `src/components/ClothCraftSceneV2.jsx`: Three.js native snapshot renderer, toolbar, controls, ray selection, seam guide and overlays.
- `src/core/nativePreDrapeCurvature.js`: non-physical curved initial preview of reset-position panels.
- `src/data/clo7ToolbarOrder.js`: historically recorded 3D A/B toolbar names and EXO action mappings.
- `docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md`: real CLO OBJ export and sewing XML analysis.
- `docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md`: PPF preassembly and invalid-start metrics.
- `docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md`: measured solver/contact problems and acceptance gates.
- `docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md`: observed installed toolbar and inspector permission constraints.

This entire Markdown volume is a research and engineering requirements document. No proprietary CLO source or interface artwork is reproduced, and no claims of direct live CLO interaction during this pass are made.

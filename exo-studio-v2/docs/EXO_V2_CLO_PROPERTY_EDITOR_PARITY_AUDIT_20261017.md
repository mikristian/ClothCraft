# EXO V2 Property Editor vs CLO screenshots — visual and functional audit

**Date:** 2026-10-17  
**Scope:** EXO ClothCraft Studio V2, its CLO-style Object Browser/Property Editor, Rust-backed property commands, draft-only annotation editors, and live 3D presentation.  
**Source:** Original user screenshots `~/Downloads/Screenshot 2026-10-17 at …` at 4:23.20, 4:28.34, 4:28.44, 4:28.54, 4:29.10, 5:16.21, 5:18.27, 5:18.40, 5:18.48 and 5:34.47 PM. Working copies: `research/screenshots/clo-property-audit-20261017/`. Live EXO capture: `current-installed-full.png` in the same directory. Do not treat unseen CLO property panels as verified by these screenshots.

## Executive result

EXO has most of the **selection categories** and several authentic project-backed property editors. Visual parity still falls short chiefly in the *structure of the information*: CLO separates context header, nested disclosure hierarchy, right-aligned numeric values, thin sliders, per-property tool menus, and dedicated map controls. EXO frequently compresses these into flat accordions, readouts, or large explanatory paragraphs. Some unavailable settings reflect **genuinely missing Rust/renderer behavior**; these must not be converted into fake interactive UI.

## Screenshot-grounded gaps

| CLO feature / screenshot | EXO status | Gap and recommended work | Priority |
|---|---|---|---|
| Context row with object type and **Open / Save**, Button/Fabric (4:28.34, 5:18.27) | Header currently shows Property Editor and a small subject name | Add contextual **working** Open/Save only after an asset-specific import/export contract exists; align subject on separate row | P1 |
| **Shape → Thread Type → Specification** for Button, with circular button preview and style dropdown/add (4:28.34) | `Button Style & Dimensions` and `Material` are flattened headings; fields exist, shape preview appears elsewhere | Nest actual specification disclosure; surface real button style thumbnail beside Shape controls, preserve existing `CloObjectPropertyFields` edits | P1 |
| **Material → PBR → Button/Thread**, full Basic Parameters and Reflection (4:28.44) | Material tab groups and project-backed thread/button fields exist | Align nesting and selective body visibility; wire missing thread optical fields before exposing controls | P1 |
| Fabric Material **Front / Back / Side** (5:18.27) | Front exists; Back/Side disabled | Independent side shader materials require renderer + storage support; do not silently alias the front | P1 |
| Fabric Texture Mapping dropdown (Repeat), Fabric_Matte Type (5:18.27, 5:18.40) | Static, disabled modes | New selectable modes require corresponding material UV/shader behavior | P2 |
| Map disclosure and choose/open/edit/remove for Texture, Normal, Displacement, Opacity, Metalness (4:28.44, 5:18.40) | Choose/remove work on draft fabrics; Open/Edit disabled; chevron is decorative | Add real map-row expansion / preview; support native map upload, viewer and image edit as distinct functions | P1 |
| **Opacity 100**, **Roughness 50**, **Reflection Intensity 15**, **Metalness 0** show value + slider + wrench (4:28.54, 5:18.40, 5:18.48) | Draft roughness/metalness are editable; opacity is a fixed readout in the material template, reflection a status readout; no wrench | Add per-fabric opacity/reflectance storage + shader and meaningful wrench popovers before enabling; keep project-backed numeric and slider linked | P1 |
| Fabric Information Name, Item No., Construction, Supplier, Owner with inline edit indicators (5:18.27) | Native identity edits exist for all these fields | Better row alignment, nested Construction section, visible editing affordance and async save status | P2 |
| Physical Property: Preset, Detail, Thickness (mm), lab controls (5:18.48) | Native 7-field physical inspector is project-backed, currently portaled into `Physical Property` | Add subgroups and supported presets only; avoid invented fabric certification values | P1 |
| Camera: Lens/FOV, View Orientation, Type/Distance/Angles with numeric scrubbers (5:34.47) | Dedicated scene editor supports all shown fields plus clipping/physical camera; native canvas metadata verifies changes | Move sliders beneath values consistently, preserve signed intermediate edits, support useful asset Open/Save when defined | P2 |
| Dark nearly flat rows, 1px dividers, distinct level hierarchy (all closeups) | Neutral gray already close; 25px readouts and flattened/uppercase subgroup labels were visually compressed | Adjust row density, indentation, typography; retain deliberately requested neutral-gray EXO accent | P2 |
| No object selected: CLO lower pane empties (4:23.20 / 5:16.21) | EXO inserts instructional empty-state message | Optional UX choice; keep helpful message unless strict screenshot replica is requested | P3 |

## Function-by-function category matrix

**Meaning of status:** **Works** = source has a project/native mutation path, supported by existing QA or browser inspection; **Partial** = fields or visual behavior exist but important capabilities missing; **Read-only** = report/list only; **Not implemented** = no connected physical command. A draft editor is not evidence of equivalent native Rust behavior.

| Property selection / editor | Working user controls | Missing, read-only, or unresolved functions | Status / risk |
|---|---|---|---|
| **Pattern** | Name/Item No. native revisioned edits; 2D/3D perimeters, edges, mesh metrics, grain; selected draft pattern fields; arrangement via native tools | Native arrangement values are readouts in accordion; Bond, Solidify missing solver commands; expanded Pattern precision-host could be concealed under collapsed Arrange | **Partial**. This pass opens the relevant Arrange group for active pattern. |
| **Selected Line** | Boundary length readouts; native target-length submission in selected measurement unit | Additional CLO curved-line, elastic, or taping physics / property parity not all connected; numeric update blocked during active solver as intended | **Partial** |
| **Sewing/Seam** | Native paired-edge lengths, seam gap, orientation, ease, stiffness readouts; native seam edit available in dedicated editor | CLO Strength, Ratio, Fold Angle/Strength and Turned are marked Not implemented; some controls live outside Property Editor | **Partial**. This pass routes advanced content to Sewing rather than Miscellaneous. |
| **Fabric Identity** | Name, Item No., Construction, Supplier, Owner via native property metadata; native selection context | Missing independent per-face material identity/metadata; Property Editor lacks CLO contextual asset Open/Save | **Works with parity gaps** |
| **Fabric Physical Property** | Native thickness, density/weight and cloth mechanics with seven paired number/slider controls; physical fabric assignment persists through native operations | CLO complete physical preset library, lab-calibrated detail sections not present | **Partial** |
| **Fabric Material / PBR** | Draft color/normal/displacement/opacity/metalness image uploads & removal; draft color, roughness, metalness | Native back/side shaders, map Open/Edit, variable opacity and reflection intensity, live mapping-type changes, native map upload unsupported | **Partial / P1** |
| **Button / Thread** | Draft button dimensions, holes, angle, width, weight, thread type/color/length; separate PBR sliders and Button/Thread tabs | CLO Shape preview/header, nested Specification and button map import; native rigid hardware contact/thread physics unsupported | **Draft works; native partial** |
| **Buttonhole** | Draft geometry dimensions, eye, border width, angle, thread material and 2D position | Native pierced/cut fabric and stitch collision unverified / not equivalent to CLO | **Draft works; native partial** |
| **Zipper** | Draft two-way slider %, seam pair binding, starts/ends, widths/thicknesses, independent tape/teeth/slider materials/colors/roughness | Physical zipper teeth engagement, sliders and rigid contact not solved by native Rust engine | **Draft works; native partial** |
| **Binding / Fastener** | Draft width, ratio, stiffness, color, closure and location-related fields | True native binding seam physics and fastening force semantics unverified | **Draft works; native partial** |
| **Topstitch / Puckering** | Editable draft stitch rows/spacing/color and puckering annotation settings; derived stitches per inch | Native mechanical stitch relief and physical puckering force absent | **Draft works; native partial** |
| **Graphic** | Native graphic inspector, 2D selection/movement, mm dimensions, material/visibility, measurement toggle via object editor; persisted native records | Full CLO printing/UV texture transform parity unknown; not all graphics are generic accordion fields | **Works in native subeditor, partial parity** |
| **Imported hardware** | Native imported 3D library placement, position, material, visibility, duplicate/remove, dedicated hardware undo/redo | Physical rigid contact/weight, 3D manufacturing attachment not solved; generic library button 'PLACE' intentionally disabled in native mode | **Native presentation works, partial physics** |
| **Grading / POM** | Grading and POM values available under Production, native grading operations and derived measurement displays | Category Property Editor rows largely readouts, full per-size selection inspector and grading rule property parity not shown by screenshots | **Partial** |
| **Environment / Camera / Light** | Camera FOV, spherical/orthographic, distance, angles, near/far clip, physical camera; light intensity/color/enabled; environment preset, exposure, render dimensions | CLO scene asset Open/Save, some complex renderer options and standalone simulation controls are missing; native render output integration warrants separate QA | **Works with UI parity gaps** |
| **Simulation / Render** | Simulate, pause, reset and render settings available elsewhere | CLO Simulation Properties tab is informational in contextual scene inspector; no full CLO physical simulator settings here | **Partial** |

## Concrete changes in this audit

1. In `CloPropertyEditorAccordion.jsx`, route active native **Sewing** context to the actual Sewing group and open it when selected; stop silently parking shared advanced controls in the unrelated Miscellaneous group.
2. Open the selected pattern's relevant advanced **Arrange** group on selection so the embedded precision editor isn't mounted beneath a collapsed region at startup.
3. Increase readout row height in `CloPropertyEditorGray.css` to align labels and values closer to CLO's reference. Other screenshot-specific differences remain documented instead of being papered over with dummy widgets.

## Regression / acceptance criteria

- Changing selected pattern, seam, fabric, button, imported hardware, graphic or camera swaps to the correct Property Editor; no stale category controls or hidden active inspector.
- Native edits always roundtrip through Rust response/revision and reload; draft-only values must label themselves as draft.
- Every *enabled* numeric slider must change the same persisted value as the paired number input; every disabled operation must have an accurate explanation.
- Selecting a native fabric exposes all seven real physical parameter fields; changes survive selection changes and project reload.
- Camera FOV, distance and angles update the live native viewport; scene panels remain navigable after switching Object Browser tabs.
- All workflows above use disposable Rust fixtures and preserve the user's installed garment project.

**Useful existing QA:** `integrations/clothcraft/qa-v2-gray-property-editors-20261017.mjs`, `integrations/clothcraft/qa-v2-environment-camera-20261017.mjs`, `integrations/clothcraft/qa-v2-graphic-layer-inspector-20261017.mjs`, `integrations/clothcraft/check-v2-native-property-history.mjs`, `integrations/clothcraft/qa-v2-imported-hardware-placement-20261017.mjs`.

**Evidence limitations:** The supplied screenshots show fabric, button, camera and overall panel structure in detail. They do not expose CLO's complete zipper, graphic, sewing, grading or POM settings. Those category gaps are source-based EXO coverage assessments, not screenshots of those CLO screens.

## Implemented Button and Fabric parity loop (follow-up)

The user approved implementing the high-priority **Button Shape** and **Fabric Material** gaps. This loop is completed in the signed installed EXO ClothCraft Studio V2 app.

- **Button / Shape**: The main Shape accordion now contains an actual selected-preset diagram, a project-backed button style picker, a validated Thread Type dropdown with three stitch constructions, and a nested Specification disclosure. The real 2D/3D dimension, sewing-hole, weight, and thread fields remain connected to their existing draft project commands. Button/Thread tabs remain independently selectable under Material; project-backed reflection controls remain available.
- **Fabric / Material**: Color, normal, displacement, opacity, roughness, and metalness map rows now expand to show real thumbnails or current status. Choose, replace, preview and remove operate on supported draft fabric image maps; the roughness map file picker uses the existing importer. Back/Side stay visibly disabled until separate face renderer/material storage exists.
- **Fabric optical editing**: Draft fabric opacity (5–100%) and reflection intensity (0–3×) have paired numeric/slider controls wired to the actual garment material. Opacity uses existing `MeshPhysicalMaterial` behavior; reflection intensity now updates the material environment response on creation and live edits. Optical changes are excluded from physics fingerprints, so edits do not restart the cloth solver. Native Rust Fabric physical values remain controlled in their actual seven-field native editor.
- **Visual design**: Main accordions now have CLO-like cool cyan labels and selected-state styling; content remains charcoal. Both Rust-backed and standard draft Property Editor modes use the same CSS. Map previews and action controls are consistently styled. Button Shape/Specification nesting and material tabs reflect the supplied reference hierarchy.

### Implementation evidence

`integrations/clothcraft/qa-v2-gray-property-editors-20261017.mjs` **PASS**: real draft button width saved 1.1→2.7; dedicated Shape preview, Thread Type edit, style selector, nested Specification toggle, Button/Thread material switching and the four reflection sliders all verified in a disposable Rust-backed browser session. All seven native fabric physics fields remained visible; zero page errors.

`integrations/clothcraft/qa-v2-clo-fabric-map-optics-20261017.mjs` **PASS**: isolated draft fabric opacity set to 45%, reflection intensity to 1.75; verified both persisted after reselection. Imported a PNG texture through the real file chooser, expanded preview, replaced/removed supported map, confirmed Roughness Map row and zero page errors. Screenshot: `research/screenshots/clo-property-audit-20261017/exo-fabric-material-reworked-20261017.png`.

`npm run build`, `git diff --check` **PASS**. The guarded V2 web-only app installer backed up prior UI as `integrations/clothcraft/output/app-backups/EXO-V2-web-before-fabric-button-parity-20261017`, signed the Mac application, and passed the installed native smoke test: Rust ready, two pattern panels, both Rust Wasm modules ABI 1, zero bad ports and zero JavaScript/texture errors. Saved garments and native Rust/Swift binaries were preserved.

**Still to implement**: Independent Front/Back/Side fabric materials, general-purpose shader type/mapping selection, a true image-paint editor, complete asset-specific Open/Save workflows and native Rust rigid button/thread contact. The implemented map **Replace** chooses a different image; it does not claim pixel painting. All currently disabled operations continue to explain their limitations.

## Continued native Rust Fabric appearance implementation

The default EXO V2 native Rust workspace now supports **actual, persisted Fabric appearance controls** in Material > Basic Parameters / Reflection: Color, Opacity, Roughness, Metalness, and Reflection Intensity. Each applies to the displayed cloth material while the Rust physics properties, solver revision, pattern geometry, authored lines and saved fitting project remain separate. Changes use the existing trusted native property event path, not draft-mode fake values.

- Native Fabric appearance is persisted atomically to the existing workspace sidecar `fitting-project.json.properties.json` under `propertyMetadata.fabrics[fabricId].appearance`. It validates exact `#RRGGBB` colors, opacity/roughness/metalness in 0–1, reflection intensity in 0–3, current revision and target Fabric ID. Invalid/stale edits are rejected without touching the solver.
- `src/components/ClothCraftWorkspace.jsx` publishes current appearance on each Object Browser Fabric ref. `NativeFabricAppearanceEditor.jsx` provides a pair of real number/slider rows per optical property, color selection, clear save-error reporting, and keeps values synchronized with status and selection changes.
- `src/core/clothcraftFabricSurface.js` applies the native appearance to Three MeshPhysicalMaterial and reapplies overrides after licensed texture scan loads. `src/components/ClothCraftSceneV2.jsx` reads the sidecar per Fabric ID and exposes live material diagnostics for QA. Existing procedural weave, strain view, sewn construction marks, imported hardware, and physical properties remain supported.
- A separate read-only snapshot request once contended with native property writes. `workspace.mjs` now serves the latest authoritative in-memory snapshot without blocking the command mutex, and the UI queues intentional optical commits while short-lived property transactions finish. This resolved an actual intermittent save failure during rapid edits.

### New regression evidence

`node integrations/clothcraft/qa-v2-native-fabric-optical-editor-20261017.mjs`: **PASS**. Disposable native Rust browser verified color `#bc5476`, opacity 64%, reflection 180%, actual 3D MeshPhysicalMaterial reflection/opacity, canvas availability and persistence after a full editor reload. Solver time and revision unchanged. Zero page errors.

`node integrations/clothcraft/check-v2-native-fabric-appearance-20261017.mjs`: **PASS**. Isolated native workspace verified all five fields, invalid/stale/wrong-target rejections, atomic save, reopened metadata and unchanged native geometry/time/revision. Worker additionally verified the installed-style HTTP backend through `qa-v2-native-fabric-appearance-http-20261017.mjs`.

`npm run build`: **PASS**. The new guarded script `integrations/clothcraft/macos/install-v2-workspace-js-only.sh` saved a copy of the existing installed native workspace handler, copied only the validated JavaScript handler, and re-signed EXO V2. `EXO_WEB_BACKUP_NAME=EXO-V2-web-before-native-fabric-optics-20261017 bash integrations/clothcraft/macos/build-web-only-v2.sh` separately installed the latest web bundle, retained Swift/Rust binaries and support files, and passed the installed native smoke (Rust ready, 2 panels, valid WASM ABIs, no port/page/texture errors). **The running app needs a normal restart to load the updated Node handler**; installer deliberately did not terminate or overwrite an active garment session.

**Still outstanding after this native pass:** Native fabric image map authoring and separate Back/Side shaders; a full editor for image pixels; CLO calibrated mechanical testing; additional optical presets, asset Open/Save and native button collision/sewing-thread constraints.

## Verified during this pass

- `node integrations/clothcraft/qa-v2-gray-property-editors-20261017.mjs`: **PASS** in isolated Rust workspace. Button width edited from 1.1 to 2.7 and remained saved on reselection; paired number/slider inputs visible; Button/Thread switching, Basic Parameters and Reflection disclosures, four project-backed optical controls, and seven live native fabric physical controls verified. No page errors; neutral gray computed styles matched.
- `node integrations/clothcraft/qa-v2-native-property-editor-20261016.mjs`: **PASS** in a separate native fixture. Native pattern Name and Item No. roundtripped, relevant Arrange group opened on selection, native fabric Name/Item No./Construction/Supplier/Owner roundtripped, and switching between Fabric and Pattern kept their distinct editor schemas. No page errors.
- `npm run build`: **PASS**. `git diff --check`: **PASS**.
- Existing QA scripts needed small maintenance: the Object Browser Add button's accessible name is `Add button` (without a `+`), native Fabric no longer duplicates the Pattern-only Type field, and native name changes may need brief polling before an independent Rust snapshot reflects them. Fixture UI port 5188 avoids an occupied local 5416 port.

These are source and disposable-environment checks. **No parity claim is made for unavailable native constraints**, and this audit does not require editing the user's saved fitting garment.

## Three-face native Fabric material parity — subsequent implementation

The earlier notes about unavailable Front/Back/Side material separation are now superseded for the **native EXO V2 renderer**. Selecting a Fabric in Object Browser now offers three working **Front**, **Back**, and **Side** material tabs. Each has independently saved color, opacity, roughness, reflection intensity, and metalness. Existing front appearance fields remain backward compatible; previously unopened Back and Side inherit Front until explicitly edited. Back and Side each have a **Reset to Front** action that deletes only that face's appearance overrides. Draft-mode Back/Side remain disabled with their own explanation.

The native renderer uses the same Rust cloth triangle coordinates for FrontSide and BackSide MeshPhysicalMaterials. Side has a **render-only edge ribbon** formed from the mesh's boundary triangles with width from the native fabric `properties.thickness` (metres), capped at 10 mm to prevent bad-looking imported values. The ribbon never touches solver triangles, saved panel geometry, sewing constraints, hardware contacts, or picking. Its appearance uses the same procedural woven/photographic texture map sources, with independent tint and optical properties. Thin or highly folded cloth can show edge corner seams because these are preview ribbons, not a true volumetric/contact solve.

**QA PASS**: `check-v2-native-fabric-back-appearance-20261017.mjs` and `check-v2-native-fabric-side-appearance-20261017.mjs` verified save/reopen/reset plus strict range, revision, target, and field validation; native time, positions, triangles and revision unchanged. `qa-v2-native-front-back-materials-20261017.mjs` verified face independence, inherited values, non-pickable back/edge geometry, boundary detection, thickness caps and shared UV material. `qa-v2-fabric-front-back-20261017.mjs` passed a real disposable Rust+Vite Chrome session: Front `#bb3355`, Back `#3469ab`, Side `#47bb98`, Back opacity 42%, Side opacity 73%, visible nonzero side edge geometry, reload and reset behavior, preserved native cloth geometry/time/revision, zero page errors. Production build passed.

**Installed and signed V2 update**: The native workspace handler was copied with the guarded `install-v2-workspace-js-only.sh` using backup `EXO-V2-workspace-before-three-face-material-20261017`; the web bundle was installed using guarded `build-web-only-v2.sh` with backup `EXO-V2-web-before-three-face-material-20261017`. The installation smoke passed: native service ready, two pattern panels, fabric/geometry WASM ABI correct, no bad ports, no page errors, no texture warnings. Active processes may still use the previously loaded Node handler; restart V2 normally after saving active work to load the updated native service.

**Remaining parity work:** Native image-map import/editing is still separate from the functioning draft fabric map controls; real CLO image painting, physical finite-volume cloth thickness, calibrated mechanical presets, asset Open/Save, and rigid sewing hardware simulation remain future implementations.

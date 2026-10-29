# EXO ClothCraft Studio V2 — All 70 CLO toolbar slots · direct-action audit

Date: 2026-10-17 · source/workspace scope: `exo-clothcraft-v2`

**UX:** The previous click-activated `CloToolActionPanel` information overlay and its separate Run/Close button are no longer invoked for native, inspect, or unavailable slots. Native commands activate on the first click; related inspection slots open the actual Object Browser / Property Editor; unavailable controls display the precise limitation as plain status text without mutating the garment. Native title/aria-label tooltips remain for discoverability.

**Functional scope:** `native` means one tested or intentionally limited native operation, **not** that full CLO parity or factory certification is achieved; `inspect` navigates a real related EXO editor, but does not author the corresponding CLO construction operation; `unavailable` means no equivalent native operation.

## 3D · left A

| Slot | CLO icon | Status | Actual EXO action / limitation |
|---|---|---|---|
| 3d:A01 | Simulate | native | Native step changes simulated cloth state; pause stops scheduled steps. |
| 3d:A02 | Select/Move | native | Native Rust Place/pose-panel changes selected garment placement; no CLO gizmo parity claim. |
| 3d:A03 | Select Mesh (Brush) | native | Paint a temporary selection of real Rust snapshot mesh vertices in the 3D viewport. The zoom-aware brush highlights selected vertices; Alt removes them and Escape clears them. This is session-only inspection, without topology edits or saved mesh authoring. |
| 3d:A04 | Edit Styleline | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:A05 | Edit Sewing | native | Select an existing native seam and edit its compiled coupling stiffness, reverse orientation and easing, with revision-guarded Rust Undo/Redo. |
| 3d:A06 | Segment Sewing | native | Select two full garment boundary segments from either 3D or 2D view. The native Rust Sew command uses complete edge [0,1] ranges with undo. |
| 3d:A07 | Free Sewing | native | Select two garment edges and enter optional independent start/end fractions for partial free sewing. Native Rust Sew validates ranges and supports undo. |
| 3d:A08 | Auto Sewing | unavailable | Requires first-class seam/tack selection and editing with valid boundary pair relationships, attachment constraints and reversible native operations; only selected simpler sewing modes work so far. |
| 3d:A09 | Edit Tack | unavailable | Requires first-class seam/tack selection and editing with valid boundary pair relationships, attachment constraints and reversible native operations; only selected simpler sewing modes work so far. |
| 3d:A10 | Tack | unavailable | Requires first-class seam/tack selection and editing with valid boundary pair relationships, attachment constraints and reversible native operations; only selected simpler sewing modes work so far. |
| 3d:A11 | Fold Arrangement | unavailable | Requires a dedicated arrangement, fold or remeshing operation that preserves authored patterns and measures resulting cloth state. Use supported native move/reset/simulation controls until verified. |
| 3d:A12 | Fold 3D Garment | unavailable | Requires a dedicated arrangement, fold or remeshing operation that preserves authored patterns and measures resulting cloth state. Use supported native move/reset/simulation controls until verified. |
| 3d:A13 | Reset 2D Arrangement (All) | native | Verified native V2 action with meaningful state changes. |
| 3d:A14 | Reset 3D Arrangement (All) | native | Native Rust reset restores the 3D initial off-body pose while preserving authored 2D patterns, material and sewing relations. |
| 3d:A15 | Re-drape 3D Arrangement | native | Verified native V2 action with meaningful state changes. |
| 3d:A16 | Hi-Res Garment | unavailable | Requires a dedicated arrangement, fold or remeshing operation that preserves authored patterns and measures resulting cloth state. Use supported native move/reset/simulation controls until verified. |
| 3d:A17 | Edit Measure (Avatar) | native | Edit a temporary two-endpoint straight-line avatar measurement by dragging a ray-hit point across the visible fitting body. Results use true 3D world metres converted to millimetres; not a saved anthropometric record. |
| 3d:A18 | Basic Tape Measure (Avatar) | native | Click two surface points on the visible native fitting avatar to measure their 3D straight-line distance in millimetres. Temporary inspection only; no body circumference, linked landmarks or persistent CLO avatar POM. |
| 3d:A19 | Edit Measure (Garment) | native | Edit either endpoint of a temporary 3D garment-surface measurement. Both points raycast against visible native cloth, not an unrelated 2D draft; displays straight-line physical distance in millimetres. Measurement is session-only, not a saved production POM. |
| 3d:A20 | Linear Measure (Garment) | native | Click two points directly on the native simulated garment surface to display a real 3D straight-line distance in millimetres. This temporary surface tape is not a saved garment measurement or CLO production POM. |

Subtotal: {"native":13,"inspect":0,"unavailable":7}

## 3D · left B

| Slot | CLO icon | Status | Actual EXO action / limitation |
|---|---|---|---|
| 3d:B01 | Play Motion | unavailable | Requires typed avatar measurements, animation tracks or garment measurement objects that remain attached to native 3D geometry; no matching authoring command is currently available. |
| 3d:B02 | Edit Line (3D Pattern) | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:B03 | Line (3D Pattern) | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:B04 | 3D Base Pen | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:B05 | Edit 3D Pen (Avatar) | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:B06 | 3D Pen (Avatar) | unavailable | Needs persistent 3D projected pen/stroke geometry with editable anchors, surface attachment, undo and export. Existing 2D construction lines are not a substitute. |
| 3d:B07 | Edit Texture (3D) | inspect | Related native information is viewable, but this CLO editing operation is not implemented. |
| 3d:B08 | Transform Graphic | inspect | Opens EXO's related editable curved-UV 3D graphics browser/editor. The CLO Transform Graphic command is not implemented. |
| 3d:B09 | Graphic (3D Pattern) | inspect | Opens EXO's related editable curved-UV 3D graphics browser/editor. The CLO Graphic (3D Pattern) command is not implemented. |
| 3d:B10 | Select/Move Button | inspect | Opens EXO's related editable button hardware browser/inspector. The CLO Select/Move Button command is not implemented. |
| 3d:B11 | Button | inspect | Opens EXO's related editable button hardware browser/inspector. The CLO Button placement command is not implemented. |
| 3d:B12 | Fasten Button | unavailable | Requires typed 3D trim geometry, attachment/sewing topology, rigid or deformable contact, material/style assets, and undo. EXO draft trim annotations alone do not satisfy this. |
| 3d:B13 | Zipper | inspect | Opens EXO's related editable zipper hardware browser/inspector. The CLO Zipper command is not implemented. |
| 3d:B14 | Edit Piping | inspect | Opens EXO's related editable trims browser/inspector. The CLO Edit Piping command is not implemented. |
| 3d:B15 | Piping | inspect | Opens EXO's related editable trims browser/inspector. The CLO Piping command is not implemented. |
| 3d:B16 | Select Binding | inspect | Opens EXO's related editable trims browser/inspector. The CLO Select Binding command is not implemented. |
| 3d:B17 | Binding | inspect | Opens EXO's related editable trims browser/inspector. The CLO Binding command is not implemented. |
| 3d:B18 | Press | unavailable | Requires a solver-backed textile finishing or reinforcement constraint, with material/temperature parameters and measurable cloth response. EXO does not yet simulate this manufacturing process. |

Subtotal: {"native":0,"inspect":10,"unavailable":8}

## 2D · right A

| Slot | CLO icon | Status | Actual EXO action / limitation |
|---|---|---|---|
| 2d:A01 | Transform Pattern | native | Native BoardTransform changes 2D panel placement. |
| 2d:A02 | Edit Pattern | native | Native MovePoints/CurvePoint edit existing pattern points. |
| 2d:A03 | Fullness (Point) | native | Create a real gathered fullness strip from one selected native internal line, with millimetre width and gathering ratio. The Rust Ruffle command authors a new sewn panel with Undo/save. This is a line-based fullness construction, not CLO's point-directed fullness tool. |
| 2d:A04 | Polygon | native | Native Polygon creates authored pattern geometry. |
| 2d:A05 | Internal Polygon/Line | native | Native InternalLine authors panel interior lines. |
| 2d:A06 | Base Polygon | native | Create a real Rust Primitive rectangle, ellipse or sector panel using numeric dimensions; supported geometry is saved and reversible with native Undo. This is a limited base-shape workflow, not full CLO parametric polygon drafting. |
| 2d:A07 | Trace | native | Trace a selected native straight-edge outer contour into a separate Rust polygon panel with matching relative geometry and fabric. Curved edges and holes are rejected; native Undo/Redo and Save/reopen are supported. |
| 2d:A08 | Notch | native | Place a persistent 6 mm notch at a selected boundary arclength fraction in native Rust. Option-click can remove an exact stored marker. This is a manufacturing marking, not a mesh cutout. |
| 2d:A09 | Seam Allowance | native | Apply a persistent 10 mm per-edge cutting guide in native Rust. Option-click clears it; guide does not change stitched contour or triangulated cloth. |
| 2d:A10 | Walk Pattern | native | Walk an existing native sewn edge pair by arclength fraction. Shows actual 2D and draped 3D lengths, mismatch and synchronized markers on the pattern. Read-only measurement; does not reshape or automatically ease a seam. |
| 2d:A11 | Edit Point of Measure | inspect | Click two positions on the native 2D pattern to measure exact metric distance. This is a temporary tape overlay, not an authored production POM. |
| 2d:A12 | Point of Measure | inspect | Temporary two-click tape measure is available on the native 2D board. Saved and graded CLO POM construction remains unimplemented. |
| 2d:A13 | Edit Annotation | native | Edit an existing persistent pattern note in material coordinates; the Rust edit supports Undo and saved JSON reopen. This does not generate production POM tables. |
| 2d:A14 | Pattern Annotation | native | Click a 2D pattern and enter annotation text to create a persistent Rust-authored drafting note with exact material position and native Undo. Alt-click an annotation to delete it. |
| 2d:A15 | Pleats | native | Create three persistent parallel fold-guide construction lines on a simple rectangular native pattern at validated millimetre spacing. Rust authoring supports Undo/save. These are manufacturing guide lines, not a simulated folded pleat or complete CLO pleat tool. |
| 2d:A16 | Edit Grading | native | Native single-pattern grading adjusts a straight polygon's width/height in exact millimetres using a guarded Rust authoring transaction, with Undo and saved project history. Does not generate a complete multi-size graded nest. |
| 2d:A17 | Auto Grading | native | Apply a chosen metric size increment to one native straight-outline pattern with Rust Undo and save. Full CLO rule tables and nested multi-size automatic grading are not yet implemented. |

Subtotal: {"native":15,"inspect":2,"unavailable":0}

## 2D · right B

| Slot | CLO icon | Status | Actual EXO action / limitation |
|---|---|---|---|
| 2d:B01 | Edit Sewing | native | Open the native Sew Editor and modify an existing actual edge-pair constraint, not merely colored stitch guides. |
| 2d:B02 | Segment Sewing | native | Select two existing complete 2D boundary segments and sew their full lengths with the Rust Sew command. Native Undo and edge validation apply. |
| 2d:B03 | Free Sewing | native | Select two 2D boundaries, then enter independent start/end fractions to sew all or part of their lengths through the Rust Sew command. Native Undo and edge validation apply. |
| 2d:B04 | Check Sewing Length | inspect | Select a native sewing relationship to inspect both connected 2D/3D boundary lengths and simulated gap; automatic sewing-length correction is not implemented. |
| 2d:B05 | Steam | unavailable | Requires a solver-backed textile finishing or reinforcement constraint, with material/temperature parameters and measurable cloth response. EXO does not yet simulate this manufacturing process. |
| 2d:B06 | Seam Taping | unavailable | Requires a solver-backed textile finishing or reinforcement constraint, with material/temperature parameters and measurable cloth response. EXO does not yet simulate this manufacturing process. |
| 2d:B07 | Edit Texture (2D) | inspect | Related native information is viewable, but this CLO editing operation is not implemented. |
| 2d:B08 | Transform Graphic | inspect | Opens EXO's related editable curved-UV 3D graphics browser/editor. The CLO Transform Graphic (2D) command is not implemented. |
| 2d:B09 | Graphic (2D Pattern) | inspect | Opens EXO's related editable curved-UV 3D graphics browser/editor. The CLO Graphic (2D Pattern) command is not implemented. |
| 2d:B10 | Edit Topstitch | inspect | Opens EXO's related editable sewing/topstitch browser/inspector. The CLO Edit Topstitch command is not implemented. |
| 2d:B11 | Segment Topstitch | inspect | Opens EXO's related editable sewing/topstitch browser/inspector. The CLO Segment Topstitch command is not implemented. |
| 2d:B12 | Edit Puckering | inspect | Opens EXO's related puckering draft browser/editor. The CLO Edit Puckering solver operation is not implemented. |
| 2d:B13 | Segment Puckering | inspect | Opens EXO's related puckering draft browser/editor. The CLO Segment Puckering solver operation is not implemented. |
| 2d:B14 | Set Sublayer | unavailable | Requires a native pattern-side paint/layer/UV tool with persistent material masks, per-face maps and reversible edits. The separate Fabric workspace handles existing material properties. |
| 2d:B15 | Fill | native | Fill one selected native pattern panel with an existing physical fabric material. This saves the panel's material assignment with Rust Undo/Redo. Whole-panel material fill only; no texture painting or masked sublayer support. |

Subtotal: {"native":4,"inspect":8,"unavailable":3}

## QA and gaps

- Isolated Rust/Vite/headless Chrome toolbar loop: clicks every 3D and 2D reference position, checks capability classification and proves the removed info card does not appear. Separate native interaction tests exercise the real 3D mesh brush, sewing and 2D pattern authoring.
- 3D A03 brush selects only the visible ray-hit garment panel; brush-through to overlapping fabric and visible avatar blocked. Escape clears highlights; switching tools releases brush mode.
- 3D A17/A18 temporary avatar tape and A19/A20 garment tape are raycast 3D straight-line millimetre overlays, with endpoint edit support. Results are not persisted or production POM records; moving bodies do not automatically reattach static hit markers.
- The absent features (e.g. 3D pen, styleline, tack, folding physics, high-res remeshing, motion playback, and typed rigid hardware attachment, and 2D Steam/Seam Taping/Set Sublayer) remain explicitly non-native; related EXO draft inspectors must not be confused with full 3D cloth solver integration.

Inventory total: **70 slots — 32 native, 20 inspect, 18 unavailable.**

## Installation

**Installed and verified** in `~/Applications/EXO ClothCraft Studio V2.app` on 2026-10-17. The web-only installer rebuilt both Rust WebAssembly kernels (6 passing unit tests), installed updated V2 UI without replacing the native Rust executable, re-signed the desktop app, and passed the installed native bridge smoke test (2 panels; 0 browser errors). Independent installed Chromium QA verified all 70 toolbar slots, executed 15 non-mutating left/right tool activations including the avatar and garment 3D measurement modes, observed **zero informational pop-ups**, zero page errors, and zero garment-authoring mutations; app foreground confirmed as EXOClothCraft. Separate isolated disposable Rust/Chrome tests verified 70/70 click outcomes and A17/A18 avatar hit-point and distance interactions. The old web bundle remains in `integrations/clothcraft/output/app-backups/EXO-V2-web-before-left-direct-70-20261017`; the live garment's 16-file workspace, native binary and bridge were backed up at `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/left-toolbar-direct-no-popup-20261017` before installation.

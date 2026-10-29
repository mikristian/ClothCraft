# EXO V2 CLO7 Reference Toolbar — All 70 Button Functionality Audit

Observed source: live, authorized CLO 7.0.242 Accessibility reference for physical 3D/2D A/B column order. 2026-10-17.

## Implemented interaction contract

- All 70 observed positions render their actual CLO accessible names and tool-specific original EXO CAD icons at the exact recorded x/y offsets.
- Hover and keyboard focus reveal the exact tool name; clicking any icon opens a contextual information card with a matching icon, current capability, and a related EXO workspace navigation action.
- Native status means EXO has a real action; it does not imply CLO feature parity. Inspect status opens related property workflows. Pending status clearly identifies missing Rust implementation. Pending buttons never issue a fake native command.
- For selected pending operations, a separate CTA may run a specifically labeled, verified EXO alternative operation. It is not called an equivalent CLO feature.
- Garment-mutating one-shot actions require an explicit Run in their tool card, while drawing/selection tools enter their real mode when chosen. Draft hardware cannot be created by merely inspecting its icon.

## Verified native capability distribution

| Surface | Native action | Related inspector | Pending native engine | Total |
|---|---:|---:|---:|---:|
| 3D A | 9 | 4 | 7 | 20 |
| 3D B | 0 | 10 | 8 | 18 |
| 2D A | 10 | 4 | 3 | 17 |
| 2D B | 3 | 8 | 4 | 15 |
| **All 70** | **22** | **26** | **22** | **70** |

## 3D A — 20 original CLO controls

| Position | CLO tooltip / icon name | EXO functionality | Available next step |
|---|---|---|---|
| 3d:A01 | Simulate | Native command | Run/select native mode |
| 3d:A02 | Select/Move | Native command | Run/select native mode |
| 3d:A03 | Select Mesh (Brush) | Native command | Run/select native mode |
| 3d:A04 | Edit Styleline | Tool information (pending Rust) | Try “Draw a native 2D internal line” (2d:A05) |
| 3d:A05 | Edit Sewing | Native command | Run/select native mode |
| 3d:A06 | Segment Sewing | Native command | Run/select native mode |
| 3d:A07 | Free Sewing | Native command | Run/select native mode |
| 3d:A08 | Auto Sewing | Tool information (pending Rust) | Try “Sew two complete edges manually” (3d:A06) |
| 3d:A09 | Edit Tack | Tool information (pending Rust) | Try “Inspect and edit native sewing” (3d:A05) |
| 3d:A10 | Tack | Tool information (pending Rust) | Try “Connect two fabric boundaries” (3d:A07) |
| 3d:A11 | Fold Arrangement | Tool information (pending Rust) | Try “Position a garment panel in 3D” (3d:A02) |
| 3d:A12 | Fold 3D Garment | Tool information (pending Rust) | Try “Reposition a 3D garment panel” (3d:A02) |
| 3d:A13 | Reset 2D Arrangement (All) | Native command | Run/select native mode |
| 3d:A14 | Reset 3D Arrangement (All) | Native command | Run/select native mode |
| 3d:A15 | Re-drape 3D Arrangement | Native command | Run/select native mode |
| 3d:A16 | Hi-Res Garment | Tool information (pending Rust) | Try “Inspect existing cloth mesh vertices” (3d:A03) |
| 3d:A17 | Edit Measure (Avatar) | Related inspector | Open related property editor |
| 3d:A18 | Basic Tape Measure (Avatar) | Related inspector | Open related property editor |
| 3d:A19 | Edit Measure (Garment) | Related inspector | Open related property editor |
| 3d:A20 | Linear Measure (Garment) | Related inspector | Open related property editor |

## 3D B — 18 original CLO controls

| Position | CLO tooltip / icon name | EXO functionality | Available next step |
|---|---|---|---|
| 3d:B01 | Play Motion | Tool information (pending Rust) | Try “Simulate garment cloth” (3d:A01) |
| 3d:B02 | Edit Line (3D Pattern) | Tool information (pending Rust) | Try “Edit 2D pattern points” (2d:A02) |
| 3d:B03 | Line (3D Pattern) | Tool information (pending Rust) | Try “Draw an internal line on a flat pattern” (2d:A05) |
| 3d:B04 | 3D Base Pen | Tool information (pending Rust) | Try “Draft a native 2D polygon” (2d:A04) |
| 3d:B05 | Edit 3D Pen (Avatar) | Tool information (pending Rust) | Open relevant workspace |
| 3d:B06 | 3D Pen (Avatar) | Tool information (pending Rust) | Open relevant workspace |
| 3d:B07 | Edit Texture (3D) | Related inspector | Open related property editor |
| 3d:B08 | Transform Graphic | Related inspector | Open related property editor |
| 3d:B09 | Graphic (3D Pattern) | Related inspector | Open related property editor |
| 3d:B10 | Select/Move Button | Related inspector | Open related property editor |
| 3d:B11 | Button | Related inspector | Open related property editor |
| 3d:B12 | Fasten Button | Tool information (pending Rust) | Open relevant workspace |
| 3d:B13 | Zipper | Related inspector | Open related property editor |
| 3d:B14 | Edit Piping | Related inspector | Open related property editor |
| 3d:B15 | Piping | Related inspector | Open related property editor |
| 3d:B16 | Select Binding | Related inspector | Open related property editor |
| 3d:B17 | Binding | Related inspector | Open related property editor |
| 3d:B18 | Press | Tool information (pending Rust) | Open relevant workspace |

## 2D A — 17 original CLO controls

| Position | CLO tooltip / icon name | EXO functionality | Available next step |
|---|---|---|---|
| 2d:A01 | Transform Pattern | Native command | Run/select native mode |
| 2d:A02 | Edit Pattern | Native command | Run/select native mode |
| 2d:A03 | Fullness (Point) | Tool information (pending Rust) | Try “Edit native pattern points” (2d:A02) |
| 2d:A04 | Polygon | Native command | Run/select native mode |
| 2d:A05 | Internal Polygon/Line | Native command | Run/select native mode |
| 2d:A06 | Base Polygon | Native command | Run/select native mode |
| 2d:A07 | Trace | Native command | Run/select native mode |
| 2d:A08 | Notch | Native command | Run/select native mode |
| 2d:A09 | Seam Allowance | Native command | Run/select native mode |
| 2d:A10 | Walk Pattern | Tool information (pending Rust) | Open relevant workspace |
| 2d:A11 | Edit Point of Measure | Related inspector | Open related property editor |
| 2d:A12 | Point of Measure | Related inspector | Open related property editor |
| 2d:A13 | Edit Annotation | Native command | Run/select native mode |
| 2d:A14 | Pattern Annotation | Native command | Run/select native mode |
| 2d:A15 | Pleats | Tool information (pending Rust) | Try “Draft internal fold-guide lines” (2d:A05) |
| 2d:A16 | Edit Grading | Related inspector | Open related property editor |
| 2d:A17 | Auto Grading | Related inspector | Open related property editor |

## 2D B — 15 original CLO controls

| Position | CLO tooltip / icon name | EXO functionality | Available next step |
|---|---|---|---|
| 2d:B01 | Edit Sewing | Native command | Run/select native mode |
| 2d:B02 | Segment Sewing | Native command | Run/select native mode |
| 2d:B03 | Free Sewing | Native command | Run/select native mode |
| 2d:B04 | Check Sewing Length | Related inspector | Open related property editor |
| 2d:B05 | Steam | Tool information (pending Rust) | Open relevant workspace |
| 2d:B06 | Seam Taping | Tool information (pending Rust) | Try “Create a native seam without reinforcing tape” (2d:B02) |
| 2d:B07 | Edit Texture (2D) | Related inspector | Open related property editor |
| 2d:B08 | Transform Graphic | Related inspector | Open related property editor |
| 2d:B09 | Graphic (2D Pattern) | Related inspector | Open related property editor |
| 2d:B10 | Edit Topstitch | Related inspector | Open related property editor |
| 2d:B11 | Segment Topstitch | Related inspector | Open related property editor |
| 2d:B12 | Edit Puckering | Related inspector | Open related property editor |
| 2d:B13 | Segment Puckering | Related inspector | Open related property editor |
| 2d:B14 | Set Sublayer | Tool information (pending Rust) | Open relevant workspace |
| 2d:B15 | Fill | Tool information (pending Rust) | Try “Create a new pattern shape” (2d:A04) |

## Engineering verification

- Full visual and browser click-through: all 70 names and tool cards were individually exercised against the running Vite UI with zero page errors.
- Production Vite build passed (existing bundle-size warning remains).
- Native Rust-backed session acceptance: **PASS** via `node integrations/clothcraft/qa-v2-all-70-toolbar-clicks-20261017.mjs` using a disposable Rust exo-session and isolated Vite/Chrome fixture. All 70 positions had the exact name, clickable/focusable control, icon, honest native/inspect/unavailable capability, correct tool information card, and related workspace button; none of the 48 non-native operations exposed a fake Run action. Three 3D and three 2D sewing tools were checked for distinct icons/selection. Zero page errors and a real Rust workspace request observed.
- Signed CLO Accessibility placement regression **PASS** via `node integrations/clothcraft/qa-v2-clo-live-four-column.mjs`: 20 3D-A + 18 3D-B + 17 2D-A + 15 2D-B observed controls matched the real 7.0.242 toolbar labels and ordering; no browser errors. Existing Vite large-bundle warning remains.
- Full implementation still requires dedicated Rust geometry, trims, drawing and cloth-solvers for all pending positions. The action panel does not claim feature completion.

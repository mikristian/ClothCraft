# EXO ClothCraft Studio V2 — 3D left toolbar next functional pass

Date: 2026-10-17

## New native functionality

**3D B03 · Line (3D Pattern).** Selecting this tool starts a real surface-drafting mode. Two unobscured Three.js ray-hit points on the same native garment panel are mapped through interpolated triangle material UV coordinates (metres), validated, and authored through the existing Rust `InternalLine` transaction. Source 3D construction points are not used as a disconnected drawing; the material line is preserved by native Undo/Redo and saved project reopen. On completion, the Rust saved internal lines are also projected onto the current draped 3D cloth triangles and rendered as visible construction strokes when not actively drawing. This is a 2D material-space straight internal line drawn from the 3D scene; it is not a freestanding spatial spline or full CLO 3D pen system.

The tool rejects hits on the avatar in front of cloth, missing/nonfinite UV, a second point on a different garment panel, and a degenerate line. Escape/mode switching clears temporary placement points but never deletes a saved Rust line. Existing A03 3D brush, A17/A18 avatar tape, A19/A20 garment tape and right-side tooling continue to use their separate input modes.

## Native behavior verified

- Isolated real Rust/Vite/Chromium acceptance drew on the front pattern by clicking 3D cloth canvas at (482, 357) and (482, 449); material UV endpoints were approximately (0.596538, 0.155043) m and (0.594313, 0.375359) m. Constructed length ≈220.33 mm.
- Native `polygon.lines` count increased by exactly 1 with authored endpoints equal to the ray-hit material UV coordinates. Undo removed the line; Redo restored it; Save/reopen preserved it. No browser errors.
- Separate all-70 native browser regression passed 70 of 70 reference icons with zero tool information-card popups; A03 brush, A17/A18 avatar and A19/A20 garment measurement modes retained pressed/canvas state; the new B03 authored real Rust geometry.
- Current capability inventory: 3D left 14 native / 10 related inspectors / 14 unavailable; 2D right 19 native / 10 related inspectors / 3 unavailable; **33 native / 20 inspect / 17 unavailable overall**. Inspector navigation is not equivalent to complete CLO construction or physics functionality.

## Limitations

Missing auto sewing, 3D tack authoring, physical folding, true 3D pen curves, Hi-Res remeshing, articulated motion playback, and several typed trim placement/physics commands need separate Rust schema and solver work. Fabric/graphics/buttons/zippers/piping/binding inspector routes open related editors but are not automatically CLO-equivalent construction operations. B03 geometry is a straight line in garment material space and cannot substitute for contour cuts, curved stylelines or seams.

## Release

**Installed and verified** 2026-10-17 in `~/Applications/EXO ClothCraft Studio V2.app`. The previous installed web interface was backed up to `integrations/clothcraft/output/app-backups/EXO-V2-web-before-3d-line-20261017`; all 16 live workspace files and the previous native binary/bridge were separately backed up under `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/next-pass-3d-line-20261017`.

The signed web-only release completed successfully, Rust native smoke passed (two panels, zero browser errors), and the installed application's independent read-only Chromium QA passed all 70 reference slots with correct capability modes (33 native, 20 related inspect workflows, 17 unavailable). Installed B03 activated immediately without an information popup, its selected state was true, and switching to A02 canceled the temporary stroke. Zero installed garment edits were issued by that check; the real B03 geometry/undo/redo/save/reopen and rendered surface-line assertions were separately verified in disposable native Rust projects. macOS `codesign --verify --deep --strict` passed and EXOClothCraft was brought to the foreground.

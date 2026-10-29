# EXO ClothCraft Studio V2 — Screenshot-referenced gray Property Editor

Date: 2026-10-17.

## Actual CLO reference images

Reviewed the exact user-mentioned images in `~/Downloads` today: `Screenshot 2026-10-17 at 4.23.20 PM.png`, `4.28.34 PM.png`, `4.28.44 PM.png`, `4.28.54 PM.png`, and `4.29.10 PM.png` (actual filenames use the macOS narrow no-break space before `PM`). Reference details: charcoal gray Object Browser atop Property Editor; center Property Editor heading; narrow dividers; Button Information, Shape and Specification; Width, Thickness, Weight and Thread Type; Material PBR, Button/Thread, Basic Parameters (Texture, Normal Map, Displacement Map, Color and Opacity); Reflection with roughness/intensity/metalness, dark comboboxes, values and fine sliders.

## Changes applied

- Global neutral gray Property Editor CSS system (`CloPropertyEditorGray.css`), flat compact accordion header/body/rows, numeric inputs, dropdowns and gray range thumb/track, disabled-state contrast, centered heading.
- EXO button material editor has meaningful **Button** and **Thread** tabs. Button Basic Parameters and Reflection are separately expandable, with real saved color, material type, roughness, reflection intensity, metalness and clearcoat fields. Thread tab binds existing thread type, color and length. No fake unsupported physical maps.
- All draft object property fields (button, buttonhole, zipper, trim, binding, fastener, topstitch, puckering and pattern) adopt matching gray controls. Real numeric controls retain paired number/range inputs, units and their previous `onEdit` contracts.
- Native selected fabric now mounts its real material/physical editor **inside** the Fabric > Physical Property accordion (previously appended below the entire Property Editor), with seven Rust-backed coefficients and compact paired sliders/number fields. Fabric optical preview remains explicitly preview-only; native physical fields persist.
- Native graphic editor sections use the same gray density, editable dimensions and real material slider/number controls. Independent original full-resolution print sizing/export behavior remains unchanged.
- No modifications to the installed Rust/Swift native binaries or the user's garment geometry.

## QA evidence

- `node integrations/clothcraft/qa-v2-gray-property-editors-20261017.mjs`: PASS. Saved 2.7 cm button width after reselect, tabs/disclosures, four PBR sliders + numbers, seven native fabric controls; grayscale computed colors and zero JS errors.
- `node integrations/clothcraft/qa-v2-hardware-property-editor-20261017.mjs`: PASS. Button, buttonhole, zipper, trim and topstitch numeric/range, visibility and reselect persistence.
- `node integrations/clothcraft/qa-v2-zipper-material-properties-20261017.mjs`: PASS. 22 zipper material and geometry controls verified with real property reselect; no JS errors.
- `node integrations/clothcraft/qa-v2-native-property-editor-20261016.mjs`: PASS. Real Rust pattern/fabric names, item number, construction/supplier/owner metadata persisted; seven live native fabric controls located in the correct Physical Property accordion; context switch and read-only type retained.
- `npm run build` and `git diff --check`: PASS. Existing large-bundle warning only.
- Desktop `~/Applications/EXO ClothCraft Studio V2.app`: signed web-only update PASS after extending **cold launch** screenshot smoke wait to 45s; native bridge and 2D board healthy, 2 panels, no frontend errors. Installed READ-ONLY Chromium browser check confirmed new hashed JS+CSS, neutral background rgb(48,49,51), seven physical property editors **inside** Physical Property, zero native mutations, zero browser errors. App activated in front.

## Backups

Prior installed web resources retained under `integrations/clothcraft/output/app-backups/EXO-V2-web-before-gray-property-retry-20261017`. The native session binary, bridge and all 16 saved workspace files retained under `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/property-editor-gray-reference-20261017`. Screenshots/side-by-side previews and copied references retained in `integrations/clothcraft/output/property-ui-review/`.

## Limits

A UI style change does not implement missing CLO solver features (per-face PBR texture maps, button rigid collision, thread/zipper physics, fabric specimen calibration). Unavailable native fields remain visibly read-only or informational rather than posing as saved material data.

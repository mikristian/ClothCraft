# EXO V2 Shirt Construction and Pre-Drape

Reference: user-provided Mac screenshot taken October 17, 2026, at 5:16:21 PM. It shows blue center/chest/belly guides, short red armscye/sleeve marks, paired hems, and a partially curved unsimulated shirt.

## Implemented

- Draft PatternEditor: visible blue center front/back and boundary-derived chest/stomach guides, existing red matched production notches, two visible indigo topstitch hem rows on the T-shirt template. No new cutting or sewing boundaries.
- Native ClothCraftBoardV2: clipped blue center/front/back, chest and belly marks, two hem rows and red shoulder/armscye/sleeve correspondence ticks, all based on actual panel material UV boundary positions. They are display-only.
- Native ClothCraftSceneV2: reset-mode near-planar cloth surfaces receive a display-only semi-curvature of at most 45 mm. The native Rust simulation, positions and saved garment never change; boundaries, authored lines and seam guides follow the visual mesh. Already curved geometry, active grabs and simulated cloth bypass the adjustment.
- Draft GarmentViewport: curved staging is maintained during move/rotate/reset and the transition into simulation. The cloth solver and source cut dimensions remain unchanged.

## Validation

- Draft browser QA: integrations/clothcraft/qa-v2-shirt-construction-draft-20261017.mjs PASS. Front/back center, chest, belly, notches, two hem rows; sleeve notch/hem rows; center stroke RGB(102,106,196), displayed torso depth 150 mm and four curved panels; zero page errors.
- Native unit geometry QA: integrations/clothcraft/qa-v2-native-pre-drape-curvature-20261017.mjs PASS with 45 mm curvature, unchanged native snapshot and simulation/grab bypass.
- Disposable Rust/Vite/Chrome QA: integrations/clothcraft/qa-v2-native-shirt-guides-and-stage-20261017.mjs PASS, 10 blue and 12 red lines across two native panels, native reset curved=true with depth .045 m, template/positions/triangles/revision unchanged, zero browser errors.
- Production build, shared Rust WASM tests, signed web-only installed-app update and native startup smoke PASS. Read-only installed Chrome test confirmed 2 guide panels, 10 blue and 12 red marks, 45 mm native reset curvature, no page errors.
- Previous UI backup: integrations/clothcraft/output/app-backups/EXO-V2-web-before-shirt-guides-pre-drape-20261017.

## Scope

Blue station guides are proportional landmarks intersected with real fabric boundaries, not certified production measurements. The native red ticks and dual hems are non-destructive visual construction marks; the draft two-row hem corresponds to saved T-shirt topstitch metadata. This update does not add simulated folded-hem thickness or new physics/sewing constraints. Native integration QA uses a two-panel fixture and did not separately inspect native sleeve geometry.

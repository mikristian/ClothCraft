# EXO ClothCraft V2 — Second engineering implementation loop

**Date:** 18 October 2026. **Basis:** `research/clo-3d-analysis/CLO_3D_ENGINEERING_200_PAGE_VOLUME_20261018.md` and `docs/EXO_3D_ENGINEERING_IMPLEMENTATION_LOOP_20261018.md`. This is an incremental implementation and test report, **not manufacturer-grade validation**.

## Source changes

- **PPF shell integrity:** `ppf_backend/assemblyGeometryIntegrity.mjs` now rejects duplicate triangle index sets, exact duplicate geometric faces with independently indexed vertices, and nearly degenerate triangles with doubled area divided by squared longest edge <= 1e-8. It preserves the absolute collapsed-face test, previous nonfinite vertex and seam-index tests, and deliberately does not quantize geometry so legitimate near-coincident layers are not merged. Optional faces are accepted under the prior payload contract. No 3 cm preassembly gap or 5% deformation limit was relaxed.
- **Mesh-following 3D construction guides:** `src/components/avatarConstructionGuides.js` uses triangle-plane intersection loops and centerplane intersections on the displayed avatar mesh to derive curved chest, waist, navel, center-front and center-back drafting references. `src/components/ClothCraftSceneV2.jsx` renders them under the existing Guides visibility toggle; curves are display-only and do not alter pattern geometry, physics, measurement truth or collision input. Invalid/open section loops do not render fictional closed contours. The vertical reference levels remain proportional approximations, not anthropometrically calibrated landmarks.
- **Deterministic QA:** `scripts/check-ppf-assembly-geometry.mjs` verifies duplicate face/sliver rejection, valid nearby layers and optional face contract. `scripts/qa-scene-avatar-construction-guides.mjs` verifies closed mesh curve consistency, corrupt/open inputs, disconnected arm/torso sections and toggle state.

## Validation performed

| Test | Outcome | Interpretation |
| --- | --- | --- |
| `node scripts/check-ppf-assembly-geometry.mjs` | Pass | Deterministic geometry rejection and safe acceptance fixtures |
| `node --test scripts/qa-scene-avatar-construction-guides.mjs` | 4/4 pass | Deterministic guide geometry and visibility wiring |
| `node scripts/check-native-cpp-native-assembly-preflight.mjs` | 22 checks pass | Existing JS/C++ preflight contract parity |
| `node scripts/check-drafting-topology.mjs` | Pass | Existing drafting topology regression |
| `npm run build` | Pass, 1,995 modules | Vite compile; existing large-bundle advisory |
| `node scripts/check-quality-triangulation.mjs` | Pass in baseline | Still reports poorly conditioned front/back triangles; no claim of mesh conditioning completion |

## Engineering limits and next actions

No newly solved garment simulation was validated against the real Thomas avatar, physical material measurements, swept triangle CCD, or a factory sample. Archived PPF fixture-based tests remain blocked where previous generated outputs are missing; the native XPBD binary-dependent test is likewise unavailable without building the executable. The numerical cloth solver was not modified in this pass. A visually closed garment or better guide overlay cannot establish physically accurate fit.

**Next P0:** restore reproducible native and PPF test fixtures; benchmark mesh conditioning, measured seam gaps, body/self CCD and maximum/p95/mean strain on identical avatar/material inputs. Implement a safe anatomy-relative preassembly solver that passes existing acceptance gates. **Next P1:** replace proportional guide levels with measured body landmarks and validate installed-app 3D picking, depth occlusion and position under pose changes. **Next P2:** improve performance while holding collision/material accuracy thresholds fixed.

# EXO ClothCraft V2 — 2D Curve Editor implementation, 2026-10-20

## Outcome

Implemented two source-level reliability fixes in `src/components/ClothCraftBoardV2.jsx` as the first execution milestone of `REA_CLO3D_MASTER_AUDIT_20261019.md`. Production garment files, installed CLO, and installed EXO native services were not edited.

1. **Selected-panel precision framing.** When the selected pattern changes in precision 2D Point/Curve mode, the camera frames that pattern. It deliberately leaves the camera unchanged during pointer-captured gestures, so moving a real material point does not alter the metre-to-pixel mapping mid-drag. This stops side-station controls from being outside the visible SVG and hitting the adjacent inspector.
2. **Preserve physical free-knot continuity.** `draftPolygon` now prefers the currently visible preview polygon before a staged proposal or native polygon. An immediate second drag of an inserted free knot retains its actual edge-owned ID, and `start` retains the visible free-knot proposal while SVG pointer capture is established. Cancelling still clears the temporary handle preview and retains the previous saved/staged proposal.

## Current passing evidence

| Gate | Command or evidence | Result |
| --- | --- | --- |
| 2D physical curve, guide and measurement unit tests | `node --test src/core/nativeFreeCurvePoints.test.mjs src/core/patternGuideTracks.test.mjs src/core/patternCurveDrafting.20261019.test.mjs src/core/patternSewingGuideSampling.test.mjs src/core/patternVisualTokens.test.mjs` | **28 / 28 PASS** |
| Real station picking, two viewport modes | `integrations/clothcraft/qa-side-stations-hit-visibility-worker1-20261020.mjs`, read-only Playwright | **8 / 8** in 2200×1250 2D only and **8 / 8** in 1450×900 split, `elementFromPoint` is actual station, paper outline changes with drag, 14 edge cm labels match physical lengths, pointercancel does not change native revision |
| Repeated live edit, front left | `node integrations/clothcraft/qa-chain-station-free-knot-worker1-20261020.mjs` | **PASS** station drag → selected free-knot drag, `uncommitted-curve` persists, one final free knot remains, Apply visible; native revision unchanged before Apply |
| Native sampled side contour, four torso sides | `node integrations/clothcraft/qa-v2-actual-side-contour-20261019.mjs` | **4 / 4 PASS**, compiled Rust boundary moved ~20–23.7 mm, sampled spline/mesh agreement ~0.14 mm, save/reopen persists |
| Live station → new knot → explicit native Apply → renderer | `EXO_CURVE_QA_UI=http://127.0.0.1:5297 node integrations/clothcraft/qa-v2-side-worker2-chained-20261020.mjs` | **PASS**: actual source UI and private Rust session; `edit-seam` on side-right and side-left then Shape, revision **0 → 3**, native mesh **4,583 triangles**, 3D vertex positions and edited edge changed, Three.js canvas displayed mesh revision **3**, maximum spline-to-Rust boundary deviation **0.1642 mm**, saved project reopened with knot intact, **zero browser errors** |
| Production source build | `./node_modules/.bin/vite build --outDir /tmp/exo-clothcraft-side-qa-final-20261020 --emptyOutDir` | **PASS**; existing non-blocking chunk-size warning |

The native Apply case was rerun directly after all frontend fixes and returned exit code 0. The QA command confirms saved/reopened polygon identity, seams and revisioned 3D scene consumption. It does **not** establish a general undo/redo or discard-after-ease acceptance gate, which remain separate scenarios. Real macOS production installation is a distinct release step, not asserted by these source tests.

## Isolation and repeatable development

The browser-only station scripts intercept all non-snapshot requests and reject installed native mutations. UI/native Apply tests use a temporary Rust server, a newly created project and browser `POST /workspace` rerouting; they must never point Apply to the installed native server on port 5385. Vite port 5297 serves live source, while the historical port 5386 can serve a stale packaged build: validate the target UI source identity before interpreting browser regressions.

## Remaining manufacturing scope

This milestone addresses editable side stations and proposal/commit integrity for a T-shirt. It does not establish full CLO3D parity, correctly folded physical darts, all garment archetypes, production DXF/AAMA/ASTM roundtrip, fit-certified multi-layer collision, grading rules, or a finished release to the installed app. Those items remain sequenced in `REA_CLO3D_MASTER_AUDIT_20261019.md`.

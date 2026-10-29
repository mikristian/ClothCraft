# EXO ClothCraft V2 — CLO-informed 3D engineering implementation loop

**18 October 2026.** Based on `research/clo-3d-analysis/CLO_3D_ENGINEERING_200_PAGE_VOLUME_20261018.md` and existing source, this is a limited implementation and QA increment, not a claim that EXO achieves CLO's physical accuracy or that its solver is manufacturing-certified.

## Changes implemented

1. **PPF input geometry integrity:** `ppf_backend/assemblyGeometryIntegrity.mjs` checks finite 3D shell vertices, valid triangle indices, non-collapsed triangle area, and valid distinct in-range stitch endpoints. `ppf_backend/assemblyAcceptance.mjs` fails preflight on invalid geometry and prevents experimental exploded-layout override from bypassing malformed geometry. Existing regular 3 cm seam-gap gate and 5% distortion limit remain unchanged.
2. **3D construction guides:** `src/components/ClothCraftSceneV2.jsx` adds an explicit Guides visibility toggle and dashed center-front/back plus approximate chest, waist, and navel levels based on the rendered avatar bounds. These are nonphysical design references; their levels are approximate, **not calibrated anthropometric measurements**. Guide geometry does not participate in collision, editing, or solver output. Invalid/flat avatars are guarded.
3. **Focused test coverage:** `scripts/check-ppf-assembly-geometry.mjs` and `scripts/qa-scene-avatar-construction-guides.mjs` test invalid data rejection, override safety, geometry and toggle wiring, including degenerate avatars.

## QA executed and interpretation

- `node scripts/check-ppf-assembly-geometry.mjs`: pass (finite/degenerate/invalid-index/stitch fixtures, documented experimental gate).
- `node --test scripts/qa-scene-avatar-construction-guides.mjs`: 3/3 pass.
- `node scripts/check-native-cpp-native-assembly-preflight.mjs`: 22 JS/C++ parity assertions passed.
- `node scripts/check-quality-triangulation.mjs`: pass, but front/back triangle worst aspects still around 49.4 and 17–20 slivers remain after improvement, thus mesh conditioning is not production-ready.
- `node scripts/check-drafting-precision.mjs` and `node scripts/check-drafting-topology.mjs`: pass.
- `npm run build`: passed in agent run; no new installed-app QA or live screen verification.

### Recorded failures / environment constraints

- `node scripts/check-native-initial-assembly.mjs`: missing built native XPBD CLI binary, requires its build script before rerun.
- `node scripts/check-clo-thomas-assembly-candidate.mjs` with documented historical paths: cannot run because historical best-validated JSON fixture is absent in this checkout.
- `node scripts/check-ppf-assembly-acceptance.mjs` and `node scripts/check-ppf-torso-assembly.mjs`: historical output JSON fixtures absent.
- `node scripts/check-clo-reference-ppf-assembly.mjs`: archived CLO export metrics JSON absent.
- The JS/native seam assembly bridge reports zero-to-floating-point matching placement values, but `fullExportParity:false` and nonzero body penetrations on existing tee/pants, so it is **not a physical contact pass**.
- `node scripts/check-physics.mjs` reports settled peak edge extension above 160% in its sample; treat as unsafe for any unqualified real garment fit claim.

## Next required implementation loop (priority-ordered)

**P0:** Restore/build versioned test fixture artifacts and native binaries; run reproducible fixed-seed preassembly metrics and dynamic contact tests. Capture first failing triangle, seam IDs, body region, resolution, frame and solver residual. **P0:** Fix mesh conditioning and implement actual continuous body/self triangle collision under deformation; do not switch off gates. **P0:** Develop anatomical, collision-constrained preassembly with precise seam pairing and preserve pattern UV rest lengths. **P1:** Replace approximate avatar guide heights with user-calibrated landmarks and actual torso section curves; add installed-app visual/pointer tests. **P1:** Calibrate anisotropic fabric from independent lab measurements and compare physically cut/sampled garment fit. **P2:** Optimize GPU/CPU runtimes only at matched numerical and geometric validation tolerances.

The project has not demonstrated exact CLO parity, certified manufacturer-accurate drape, a collision-safe simulated trajectory, or superiority to competing CAD suites. These claims require measured acceptance datasets and independent testing.

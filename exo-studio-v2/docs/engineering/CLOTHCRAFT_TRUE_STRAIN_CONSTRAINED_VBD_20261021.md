# EXO ClothCraft — opt-in principal-strain-constrained CPU solver

**Date:** 2026-10-21. **Status:** implemented and tested on a disposable native backend in the local integrated upstream+EXO solver worktree. **NOT promoted to the installed application**. This is substantive progress toward physically constrained fitting, **not a certified 70% CLO3D simulator**.

## What changed

- `research/oss/clothcraft-upstream-solver-review-20261020/src/vbd/strain_limit.rs`: exact largest singular-value (principal) stretch of the 3×2 material deformation gradient, rather than checking only individual warp and weft fiber lengths. Per-vertex convex feasible line search clips an accepted local VBD trial to `principal stretch ≤ 1 + limitPercent/100`.
- `src/vbd.rs`: an opt-in **CPU-only** `step_strain_limited(state,settings,grab,limit_percent)`. It validates existing material strain first and rejects pre-overstretched input without altering positions, velocities or time. No unconstrained inertial warm-start can bypass the limit. Vertex proposals respect existing OGC trust-region truncation, color barriers, and pinned vertices. The accepted final state must satisfy the declared principal-strain limit and independent OGC endpoint-face nonintersection before commit.
- **Rigid whole-panel sewing move:** optional seam-energy-reducing panel translations preserve principal stretch exactly, hold pins, and use OGC trust-bound checks with backtracking and independent full-endpoint face-crossing checks. The solver never claims a contact-free *swept trajectory*. Experimental coupled seam-block refinement is disabled only for strict mode until its multi-vertex updates can be certified constraint-feasible.
- `src/bin/exo-session.rs`: strict authoring-independent option `fitGate.strainLimitPercent` (0–50%), composed with the previously implemented `maxExtensionP95Percent`, `maxExtensionMaxPercent`, `maxSeamGapMm`, `maxDartGapMm`, and `rejectTriangleCrossings`. The ordinary `step` API and interactive cloth solver remain unchanged. GPU mode rejects this request rather than claiming untested parity. On any guarded substep failure, the whole requested 1–4-step batch is rolled back.

Example private native JSON-lines request:

```json
{"op":"step","steps":1,"fitGate":{"strainLimitPercent":5,"rejectTriangleCrossings":true}}
```

Native metrics expose `principal_extension_max_percent`, `strain_limited_vertices`, and `rigid_panel_seam_shift_max_m` for actual accepted steps. A low principal stretch is not a claim of correct drape, correct fabric calibration, correct sewn fit, contact swept-CCD, or satisfactory gradient convergence.

## Real native CPU comparisons

The QA script `integrations/clothcraft/qa-true-strain-vbd-20261021.mjs` creates **two independent disposable T-shirt native sessions** with identical material and arrangement, disables GPU, and runs default interactive mode versus strict 5% strain mode. It never writes to either installed V2 app, production services or saved garment.

| T-shirt metric | Default VBD (1 step) | Strict principal strain (1 step) | Default VBD (10 steps) | Strict (10 steps) |
| --- | ---: | ---: | ---: | ---: |
| P95 *fiber* stretch | 18.51% | **2.59%** | 39.29% | **2.58%** |
| Maximum fiber stretch | 70.97% | **5.00%** | 124.01% | **5.00%** |
| Maximum principal material extension | Not measured in default mode | **5.00%** | Not measured | **5.00%** |
| Worst overall garment seam gap | 447.49 mm | **512.47 mm** | 77.91 mm | **467.79 mm** |
| Contacts at final state | 0 | 0 | 340 | 0 |

The strict solver actually bound several thousand local vertex trials; it did **not** merely reject overstretched final states. The new rigid-panel stage improved its ten-step seam gap from approximately **512.46 mm** before the change to **467.79 mm** after the change. However, this remains **far worse** than unrestricted assembly. It cannot currently fit a complete sewn T-shirt on the avatar while keeping its maximum material strain at 5%.

**Important conclusion:** We now have a real material strain solver and a conservative discrete contact acceptance path. We **do not** have a simultaneous strong-strain, low-gap, collision-valid full garment solver. A 5% maximum principal strain is a strict physical bound, not necessarily an appropriate calibrated limit for every knit textile.

Raw evidence:

- `docs/qa/clothcraft-strain-vbd-20261021/first-step.json`
- `docs/qa/clothcraft-strain-vbd-20261021/ten-steps.json`

## Regression acceptance

- `tests/vbd_strain_limited_20261021.rs`: extreme grab/gravity material stretch, initial-vs-accepted transactional invariants, real sewing and ordinary VBD unchanged.
- `tests/vbd_strain_contact_20261021.rs`: actual 3D principal-stretch oracle under velocities, face intersection checks against contact geometry, rejection of initially 25% stretched material under a 10% cap, pinned and sewn panel stability.
- `tests/vbd_strain_panel_assembly_20261021.rs`: free sewn panel in **collision-free space** moves toward pinned panel with 5% stretch limit, holds pins and independently validates accepted endpoint triangles; after eight steps the sewn gap is less than 80% of its initial value.
- Existing physical dart, post-step contact metrics, and residual tests still pass.
- Rust CPU and desktop-feature compile success; **desktop GPU was only compiled, not numerically executed**.

## Engineering work still required

1. **Two-stage avatar fitting**: prearrange/sew panels with a collision-safe garment assembly schedule, then approach the avatar in a validated, *swept* contact trajectory. Current avatar contact limits panel translation and leaves approximately 468 mm of sewing separation after ten strict steps.
2. **Coupled constraint solves**: enforce seam equality, upper material stretch, and contact feasibility together (or in a convergent alternating scheme), with convergence certificates and realistic soft material calibration. Do not impose rigid translations that penetrate a body.
3. **Independent swept CCD and all-frame tests**: include nonadjacent triangle crossings for cloth/cloth and cloth/avatar, repeated 200/1000-step stress tests, and final-order multilayer garments.
4. **Direct CLO3D and ZOZO PPF fixtures**: use identical rested garment meshes, material laws, seam pairs, avatar geometry, and measured fabric behavior. Our earlier ~35% maturity guess and requested 70% remain **unverified subjective targets**.

**Release decision:** keep the current installed EXO V2 CPU solver as the working interactive default. The new constrained mode is available in committed *source/QA only* until it can sew the avatar garment adequately without sacrificing the 5% cap. The installed app's personal garment state is preserved.

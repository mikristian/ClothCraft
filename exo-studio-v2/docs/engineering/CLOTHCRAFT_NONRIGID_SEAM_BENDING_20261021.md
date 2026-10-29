# ClothCraft EXO — opt-in nonrigid coupled seam/bending research

**2026-10-21.** Experimental source only on the local Rust worktree
`research/oss/clothcraft-upstream-solver-review-20261020`.
No changes to the installed V2 or V2 QA native solver, production project or user garment.
The requested 70% CLO3D parity has **not** been measured or reached.

## What was implemented

Existing coupled seam-block PCG already included full weighted seam couplings,
triangle membrane energy and hinge bending energy, but strict principal-strain
VBD deliberately bypassed it because unconstrained coupled vertex steps could
overstretch a sheet.

The experimental extension introduces:

1. **Actual nonrigid fabric neighborhoods** around sewn boundaries, with opt-in
   zero-, one-, or two-ring structural triangle expansion. Individual interior
   vertices can change relative positions, so this is more than rigid panel
   translation or rotation. Pins remain excluded.
2. **Strict coupled block acceptance** after the existing nonlinear local energy
   and PCG solve: shared bounded step, OGC trust-ball checks, independent
   principal material spectral stretch cap, weighted seam-energy decrease,
   non-increasing worst seam separation, local full implicit objective descent,
   and a refreshed independent endpoint face-intersection oracle. Invalid
   changes are rejected instead of projecting vertices arbitrarily.
3. **Independent off-body nonrigid registration** with relaxed inertial weight,
   zero gravity and no advancement of the simulation clock. After registration,
   the normal strain-limited cloth step can run. The registration rechecks
   collisions and commits only to a disposable *preview* state.
4. **Explicit opt-in native QA controls** on `preassemble-preview`:
   `nonrigidSeamSweeps` (0–4), `nonrigidFabricRings` (0–2),
   `nonrigidRegistrationSteps` (0–20). All default to zero. Responses
   disclose both attempted and accepted nonrigid blocks.

This implementation is **not** a complete coupled constrained Newton solver.
It is a damped PCG direction and safety-checked, partially coupled update.
It does not prove continuous swept collision detection or proper final
avatar entry. The existing installed solver and ordinary interactive
`step` behavior are untouched.

## Tests and measured limits

**Rust acceptance:** 35 library, 12 native-session, 4 sewn physical-dart,
1 coupled orientation, 1 two-panel off-body staging, 3 strain/contact,
1 strict coupled-block, and 3 strain-limit tests, **60/60 PASS**.
The CPU native build and macOS desktop feature type-check passed.
No GPU simulation was executed.

The strict two-panel fixture demonstrates **11 accepted nonrigid updates in
16 attempted blocks**, with exact pins, finite state, material spectral
extension ≤5% and valid endpoint contact. Its 16-step worst seam separation
was **1.855110 mm**, versus **1.609039 mm** for the no-block baseline.
That is a **0.246071 mm regression, not a seam improvement**.
The falsifiable QA emits a warning and caps this regression at 0.5 mm,
while demanding both solutions have gap <3 mm and <10% of the initial gap.

### Full T-shirt off-body fixture

The same actual T-shirt starts at **530 mm** worst seam gap.

| Method | Initial max gap | Final max gap | Strict limit |
| --- | ---: | ---: | ---: |
| 20 standard strain-limited VBD steps | 530 mm | **420.4728 mm** | 5% |
| 10 nonrigid registration passes + 20 VBD steps, 1 fabric ring | 530 mm | **418.5486 mm** | 5% |
| 10 nonrigid registration passes + 10 VBD steps, 1 ring | 530 mm | **465.5408 mm** | 5% |
| 10 nonrigid registration passes + 10 VBD steps, 2 rings | 530 mm | **464.9490 mm** | 5% |

With one fabric ring, the 10 registration passes accepted **40/40**
nonrigid block attempts before dynamics. The following 20 dynamic VBD steps
attempted **80 more coupled blocks and accepted 0**. The principal stretch
remained bounded; no saved garment or project revision changed.
Thus the new coupling **really executes**, but only the separate
off-body registration stage improved this T-shirt so far.

Source-of-truth native JSON reports:
`docs/qa/clothcraft-nonrigid-sewing-20261021/`.
QA script: `integrations/clothcraft/qa-offbody-preassembly-preview-20261021.mjs`.
Static review: `research/oss/clothcraft-upstream-solver-review-20261020/docs/analysis/EXO_NONRIGID_COUPLED_SEAM_REVIEW_20261021.md`.

## Promotion decision and next physics gates

**Do not promote to regular ClothCraft V2.** The 418.55 mm full-shirt
gap is nowhere near a usable sewn garment. Existing staged
rigid-registration + VBD can perform better on some different-step-count
scenarios, and the two-panel regression means this is not an unqualified
accuracy gain. Failures are explicit, not concealed by a composite percentage.

The next engineering steps are truly coupled *developable* folding around
side/shoulder seams, a constraint-feasible full-objective search that permits
fabric normals to rotate without stretching, reliable cloth–avatar and
multilayer swept CCD, followed by 50/200/1000-step matched CLO3D/PPF
benchmarks and material-calibration evidence.

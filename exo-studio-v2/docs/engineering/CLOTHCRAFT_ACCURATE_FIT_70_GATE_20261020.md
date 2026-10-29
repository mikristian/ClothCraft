# ClothCraft: high-fidelity simulation work toward CLO3D

**Prepared 2026-10-20/21. Status: first accuracy gate implemented and validated; 70% CLO3D parity NOT established.**

The earlier **35%** maturity estimate was a subjective engineering judgement, **not** a calibrated benchmark. No defensible revised percentage can be reported until EXO, CLO3D and ZOZO PPF process the **same** measured fabrics, patterns, seams, avatars, initial conditions, and quality checks. A fitted dart alone must never be counted as correct cloth simulation.

## Implementation in the local integrated EXO solver

The merged Rust source worktree remains `research/oss/clothcraft-upstream-solver-review-20261020`. In `src/bin/exo-session.rs`, `op:"step"` now optionally accepts a strict `fitGate`:

```json
{
  "op": "step",
  "steps": 1,
  "fitGate": {
    "maxExtensionP95Percent": 5.0,
    "maxExtensionMaxPercent": 10.0,
    "maxSeamGapMm": 2.0,
    "maxDartGapMm": 2.0,
    "rejectTriangleCrossings": true
  }
}
```

- **Independent controls:** area-weighted rest-fabric maximum principal positive extension (P95 and max), global worst stitched-seam separation, maximum of actual native cut-and-sewn darts, and a geometric discrete-frame OGC triangle-intersection screen.
- **Strong, explicit validation:** nonfinite/negative/over-1000 thresholds and unknown fields are rejected before starting simulation. A specified dart limit without any real dart is a hard error. Optional contact validation checks the complete current stitched/cloth/avatar world, not merely a proxy count of broadphase neighbors.
- **Fail closed:** if a guarded substep violates any condition, the entire requested 1–4-step batch restores its exact pre-batch particle positions, velocities, simulation clock and native revision; solver caches are discarded. Neither save nor UI movement can silently persist a rejected shape through this operation.
- **Compatibility:** default, unrestricted interactive `step` requests retain the established engine behavior. The guard does **not** clamp triangles, calibrate fabric, prove swept continuous collision detection, or automatically produce an acceptable result. This is a quality acceptance layer, **not** a new physical strain-limited numerical solver.
- **Isolation:** this code was built and tested in the separate native integration branch only. Neither the regular production app nor the isolated QA app was replaced during this fidelity milestone. Its existing user garments are untouched.

## Passing measurements and tests

`node integrations/clothcraft/qa-accurate-fit-gate-20261020.mjs` — **PASS** with a private `exo-session` process, a temporary native project, and no installed app writes. The corresponding JSON is `docs/qa/clothcraft-accurate-fit-20261020/private-fit-gate-verification.json`.

| Independent gate | Result |
| --- | --- |
| Invalid threshold (negative) | Rejected; no change to original positions, clock or revision |
| 4-step batch with impossible 0 mm global seam tolerance | Rejected; entire request restores original state |
| Strict 5% positive P95 extension | **Rejected measured 18.513921%** on first T-shirt step; saved positions and revision unchanged |
| Dart tolerance without authored dart | Rejected rather than treating missing evidence as zero separation |
| Permissive guard | One real CPU VBD/OGC step accepted, correct revision/time and finite material/contact metrics |
| Optional endpoint triangle screen | Passed one subsequent T-shirt step (not a proof of future/swept contact safety) |
| Native save/reopen | Same accepted mesh positions restored |
| Rust binary gate unit tests | **2/2 PASS** |
| Physical darts, accepted-state contact metrics, unconstrained force residual, independent geometric crossing fixtures | **7/7 PASS** |

**Independent contact QA:** `research/oss/clothcraft-upstream-solver-review-20261020/tests/independent_penetration_acceptance_20261020.rs` checks explicit nonadjacent face crossings on synthetic cloth-cloth and cloth-avatar triangles; its four cases and OGC initial-state rejections passed. It is not yet a full 200-frame recorded real garment collision certificate.

## ZOZO PPF evidence update

See `research/oss/clothcraft-upstream-solver-review-20261020/docs/exo-vbd-vs-zozo-ppf-evidence-audit-20261020.md`. The separate Garment Studio pipeline has since **enabled** the explicit PPF strain limiter and tightened fail-closed contact acceptance. Nevertheless, saved real Thomas-avatar PPF simulation data still include body/self face crossings and a **9.979 cm** worst final seam gap. The upstream fitted-dress output also contains independent crossing frames. PPF is a strong experimental *accuracy comparator*, not an already validated drop-in CLO3D replacement.

## Quantitative route toward a meaningful 70% goal

Define a comparable acceptance suite with **real CLO3D measured outputs as reference**. A proposed weighting (not a currently scored rating) is:

| Benchmark group | Proposed weight | Needed passing evidence |
| --- | ---: | --- |
| Cloth/avatar and cloth/self collision | 25 | Endpoint + swept triangle CCD, no missed crossings across multiple complex garments |
| Material strain and calibrated bending/shear | 20 | Principal strain/material force comparison against measured textiles, fit after release |
| Sewing, dart and pattern coupling | 15 | Long-run seam gap, stable gradients and true folded dart topology |
| Multilayer contact and garment settling | 15 | Inner/outer garment ordering, accurate contact and nonlevitating shoulders |
| CLO3D-equivalent 3D fitting results | 10 | Same avatar, fabric, seam, pose and camera: geometric/photometric comparison |
| Reproducibility, robustness and no invalid saves | 10 | 200/1,000-step trajectories, multiple runs, force/contact convergence, rollback |
| Usable performance | 5 | Accepted steps per second at equivalent physical quality and mesh resolution |

**Release threshold:** do not say “70%” until at least 70 weighted points are verified by an independent CLO3D-based acceptance suite, without averaging away failed collision/strain gates. A fast solver or a beautiful garment view is not an accuracy certificate.

### Next required code milestones

1. **True strict strain solver, not only rejection.** Add a material-space strain-constrained local search/coupled solve that preserves OGC feasibility and actually converges to a plausible drape; report accepted/rejected step counts and strain-bound residual per solver iteration.
2. **Independent swept contact gate.** Record and audit every accepted frame and between-frame trajectory with nonadjacent triangles, not only current-frame OGC proximity. Fix first failing face pair before benchmarking speed.
3. **Common EXO/PPF/CLO fixture.** Start with a 200×160 mm flat sheet, advance to sewn shirt, and then multi-layer avatar shoulder fitting with identical rest triangles/units/contact rules. Distinguish comparisons where the laws differ.
4. **True folded darts, fabric calibration and multilayer assembly.** Qualify with 200/1,000-step repeatable runs and saved/reopened state, then consider promotion to a new QA app binary.

**Bottom line:** a meaningful simulation-safety gate was delivered now. It does not make the solver 70% CLO3D-complete. The biggest physics quality and fabric-calibration milestones are still outstanding.

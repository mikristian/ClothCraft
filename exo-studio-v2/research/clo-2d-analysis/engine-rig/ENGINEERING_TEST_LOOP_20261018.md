# EXO 2D Engineering Test Loop — Executed results, 18 October 2026

## Scope and reproducibility

This run inspects and tests the local EXO classic 2D geometry, its shipped Rust/WASM scalar geometry API, normal cutting contours, split/unfold tools, partial sewing ranges, generic DXF round-trip, and factory package generation. No installed application or real garment project was modified. The principal code correction is `src/core/project.js:edgeRangeLength`: the existing shortcut multiplying the total Bézier edge length by `(endT-startT)` was replaced by actual `quadraticArcLength(a, control, b, startT, endT)` for curved edges. Straight edges retain the previous linear behavior. Stored seam endpoints remain Bézier parameter values, and those metadata fields were not migrated.

## Baseline and correction

The previous `engine-rig/arc_length_counterexample.mjs` independently integrates quadratic curve speed. In the deliberately asymmetric `(0,0) -> (2,50) -> (100,0)` example (coordinates in cm), the original algorithm estimated **59.86727 cm** for half the parameter interval while the actual partial curve was **41.02839 cm**, an error of **188.3888 mm**. This extreme geometric counterexample demonstrates a correctness failure; it is not a typical measured garment error.

After the correction, `engine-rig/qa-partial-curve-seams.mjs` checked **24 curved intervals and 2 straight intervals** against an independent 16,384-interval Simpson numerical reference, as well as interval additivity. All checks passed. The existing drafting precision/split tests and the prior straight partial-sewing simulation and tech-pack checks also passed.

## Three-round automated loop

Command: `node research/clo-2d-analysis/engine-rig/run-engineering-loop.mjs 3`

Machine-readable evidence: `engine-rig/results/engineering-loop-latest.json`. Outcome across 10 test suites per round: **27 PASS, 0 FAIL, 3 BLOCKED_MISSING_FIXTURE**. The same `scripts/check-sewing-construction.mjs` cannot open a historical `research/clo-reference/live-audit-20261014/exports/clo-male-tshirt-sewn-EXPERIMENTAL.garment.json` fixture. This is a missing test dependency, not proof that the construction solver works or fails. Test runner classifies only that exact missing-file signature as blocked, while all other errors are genuine failures. The loop is bounded to 1–5 repeat rounds, not continuous background monitoring.

Passing suites each round: exact curve metric oracle, Rust/WASM ABI-1 geometry parity (551 parity checks within the suite), 2D topology, exact splits, symmetric unfold, drafting precision, straight partial sewing and physical solver, generic DXF round-trip, and production handoff. Rust/WASM passing checks establish scalar numeric helper parity only; they do **not** certify a complete editable native topology graph.

## Additional source-level regressions

The following commands passed individually: `scripts/check-production.mjs`, `scripts/check-factory.mjs`, and `scripts/check-allowances.mjs`. `scripts/check-exact-sewing.mjs` was **BLOCKED** because its locally exported seven-piece CLO source is unavailable (it asserts the fixture exists before examining sewing algorithms). These are additional tests, not part of the three-round count.

## Engineering conclusions and next loop

1. **Confirmed and corrected:** classic 2D quadratic partial sewing-length calculation, preserving existing parameterized endpoint metadata. Verify native Rust equivalents independently before claiming full native parity.
2. **Confirmed available:** scalar Rust/WASM geometry, standard topology, split, unfold and basic generic DXF unit/regression fixtures.
3. **Not established:** topology-stable ID migration under complex simultaneous sew, trim and grade references; robust cubic-to-cubic intersections; graded AAMA/ASTM interchange; factory-print calibration; and full native solver remeshing after edits.
4. **Next controlled fixtures:** a curved sleeve sewn to a curved armhole with unequal Bézier parameter speed, split attached notch and zipper edge, variable seam allowance on an acute concave corner, graded size/holes with a source-to-export DXF equivalence oracle, and a save/reopen/undo integration test on a disposable native Rust project.
5. **Fixture recovery:** locate or deliberately regenerate *disposable* versions of the two missing CLO sewing sources before rerunning those specific suites; never substitute invented golden results.

## Important release boundaries

This research loop tested the workspace source and existing fixtures, not the signed installed EXO app or a production CLO garment. The source correction has **not** been packaged or installed into the Mac app in this run. It needs broader integration review and a production build/smoke before distribution. Passing numerical unit tests is necessary but not sufficient for manufacturer-ready CAD or physical garment validation.

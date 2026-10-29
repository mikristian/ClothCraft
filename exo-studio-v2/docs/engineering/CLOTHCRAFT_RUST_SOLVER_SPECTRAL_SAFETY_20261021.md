# EXO V2 Rust cloth solver — principal-strain boundary correctness pass

**Date:** 2026-10-21. **Location:** experimental Rust source worktree
`research/oss/clothcraft-upstream-solver-review-20261020`. The implementation
is native Rust VBD/OGC physics, **not** a JavaScript port or visual-only
approximation. The installed production and QA applications were not replaced.

## Fixes

1. **Spectral tangent cone at repeated singular values.** A prior strict
   nonrigid seam direction projected against only one eigenvector of the
   largest 3×2 material deformation singular value. For an isotropically
   stretched material triangle, the two singular values coincide, so an
   arbitrary X eigenvector misses positive extension along Y. The Rust
   implementation now gathers multiple directional stretch gradients when
   the two principal stretches are nearly equal. It projects the candidate
   against the active set instead of mistakenly treating one material axis
   as the complete spectral tangent cone.
2. **Fail-closed nonfinite material strain.** IEEE `f64::max` ignores NaN
   operands, and the former spectral expression could map NaN to zero via
   `.max(0.)`. The Rust principal stretch oracle now rejects nonfinite
   quadratic invariants before clamping, and the maximum over cloth triangles
   returns NaN when *any* measured triangle is invalid. Strict native VBD
   therefore rejects, rather than silently accepting, invalid fabric.
3. **New falsifiable tests.** A synthetic isotropic 105%-stretch triangle
   probes the formerly unguarded Y direction; another test injects NaN and
   infinite triangle coordinates. Independent sewn panel tests validate
   actual strict motion, exact pins, endpoint contact and pre-stretched
   input rollback.

The tangent projection is only a **candidate direction**. Every accepted
step still requires an exact nonlinear principal-strain bound, OGC trust
balls, full endpoint nonintersection and objective/seam descent checks.
The experimental feature flag defaults off; this is neither swept CCD nor
a proof that the full garment is sewn or realistically fitted.

## Acceptance and measured accuracy

- Native Rust library suite: **38/38 PASS**, including finite-difference
  spectral derivatives, isotropic multiplicity and nonfinite fail-closed tests.
- Strict tangent sewn-panel test: **2/2 PASS**. In its off-body adversarial
  fixture, twelve dynamic steps reduced RMS sewing gap from
  **317.504 mm to 106.107 mm**, with 12 accepted coupled block refinements.
  This is a single experimental fixture, not a controlled default-solver
  A/B accuracy improvement.
- Two-ring **matched T-shirt fixture**, identical off-body registration
  state and 20 strict CPU VBD steps at 5% maximum principal extension:

| Metric | Current strict VBD without projection | Projected tangent experimental |
| --- | ---: | ---: |
| Accepted dynamic coupled blocks | 0 | 46 |
| Maximum sewn seam gap | **417.927 mm** | 418.959 mm |
| Mean seam RMS gap | **331.274 mm** | 335.915 mm |
| Maximum principal material extension | Within ~5% bound | Within ~5% bound |
| Endpoint contact and saved garment nonmutation | PASS | PASS |

The additional accepted projected motion **does not** improve fitting:
the T-shirt's maximum gap is ~1.03 mm worse and RMS ~4.64 mm worse.
Do not use the new projection as a default sewing solver or claim success
based only on accepted iteration counts. Baseline results are recorded under
`docs/qa/clothcraft-strain-tangent-20261021/`, with a reproducer at
`integrations/clothcraft/qa-offbody-preassembly-preview-20261021.mjs`.

## Release decision and next physics milestone

**Keep experimental Rust source only.** Installed EXO ClothCraft V2 and V2
QA remain intact, as do original saved garments. The full T-shirt still has
hundreds of millimetres of open seams against a provisional 10 mm gate.
The next priority is a physically feasible coupled seam/bending step that
reduces both worst and aggregate sewing error under material strain,
contact and long-run stability limits. Validate against matched CLO3D and
ZOZO PPF fixtures before assigning any percentage of parity.

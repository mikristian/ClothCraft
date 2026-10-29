# Stalled strict-strain T-shirt seam: source audit (2026-10-21)

## Observed reproduction and limitations

The prime's strict 5% T-shirt run reported a 418.55 mm largest seam gap after 10 nonrigid registration passes and 20 constrained VBD steps, with up to 40 registration accepts but **0/80 dynamic seam-block accepts**. These are supplied run measurements, not measurements reproduced in this audit. I performed source reads only: no solver execution, contact trace, or rejection-counter capture. Consequently the exact first rejection gate is **unconfirmed**.

## Topology and starting geometry

`src/garment/presets.rs:29-63,114-162` builds *two identical* 14-edge T-shirt polygons. Front and back begin in parallel XY planes at `z=0.38` and `z=-0.15`, hence **530 mm initial depth separation**. The shared world translation is `(-0.5, 1.5, z)`; panels are unpinned. Eight matching named boundary segments (both shoulders, both sleeve tops/unders, and both sides) are stitched front-to-back, stiffness `50_000`, with `reverse_b=false`; neck, cuffs and hem remain open. Each matched edge has identical rest coordinates, so this fixture presents a large rigid separation rather than an obvious seam-length mismatch. Confirm compiled edge correspondence before attributing failures to topology reversal.

`src/vbd/seam_blocks.rs:33-87` unions **free vertices co-occurring in sewing quadrature**, rather than all vertices on each entire panel. `blocks_with_fabric_rings` (`:94-128`) can add up to two incident triangle rings. The restricted blocks still fix all other cloth coordinates; this can make simultaneous low-strain folding or bulk panel translation difficult. `set_strain_coupled_seam_sweeps` (`:511-520`) explicitly enables these expanded blocks. Verify the reproduction actually used that setter and nonzero `fabric_rings`, since the default `set_seam_block_sweeps` uses edge-only components.

## Why 0/80 can happen

The dynamic block solve first forms an approximate Hessian from local material/contact curvature, membrane Gauss–Newton rows and exact sewing couplings (`seam_blocks.rs:207-310`). This PCG direction is **not** a strictly strain-feasible direction, and the local backtracking (`:314-346`) only tests OGC movement balls and local energy decrease. The strict outer acceptance (`:572-623`) then independently applies all of the following:

1. `improvement > 0` from that local line search; otherwise immediate skip.
2. Every proposed vertex stays in original contact trust balls (`contacts.contains`).
3. **Whole-garment** maximum principal stretch remains at most `1.05` (within tolerance), even though the search direction did not enforce this Jacobian singular-value cap.
4. Total seam quadratic cost *strictly* decreases (`seam_cost(new)+1e-10 < seam_cost(old)`).
5. **The single worst seam gap anywhere** cannot grow by even `1e-9 m` (`max_seam_gap(new) <= previous_max_gap+1e-9`).
6. The independent endpoint intersection oracle `world.validate_start(new)` succeeds, then the affected exact objective strictly decreases.

There are only 16 outer backtracking trials, starting from the already OGC-limited local direction. These tests can reject a physically useful redistributive block move: global worst-gap monotonicity is a stronger requirement than reduced total seam error and is unrelated to the strain/contact invariants. For example, a candidate can greatly reduce aggregate stitch error while momentarily increasing the largest gap at one seam. A 5% global stretch cap can additionally reject displacements of boundary vertices whose neighboring interior vertices were held fixed. The per-vertex constrained VBD updates (`vbd.rs:590-605`) avoid violations via local `bound_vertex`, but block PCG uses this after-the-fact whole-state test.

Contact exclusions are local sewing exemptions, not a general waiver: accepted block proposals still need trust-ball containment and independent `validate_start` clearance. The initial 530 mm gap is much larger than the local per-step trust region, so rigid panel registration (`vbd.rs:198-253`) can make progress while subsequent local dynamic blocks stall. This inference does **not** identify the specific reason for 0/80; logging rejections is necessary.

## One minimal core patch for prime to evaluate

In `src/vbd/seam_blocks.rs`, strict branch around **lines 579-603**, delete the `previous_max_gap` read and remove only the `max_seam_gap` comparison from the strict trial rejection condition. Keep the stricter global aggregate seam-cost improvement:

```rust
if strain_limit::seam_cost(self, &world) + 1e-10 >= previous_seam_cost {
    continue;
}
```

This allows error redistribution across seams while preserving (a) exact pinned vertices, because blocks exclude pins; (b) original OGC trust-ball checks; (c) the global singular-value 5% strain cap; (d) independent endpoint intersection validation; (e) strictly decreased full affected objective; and (f) strictly decreased total squared seam residual. **It does not guarantee a smaller maximum gap**; measure and publish that metric separately and reject rollout if the regression is materially harmful. It also cannot fix an all-zero acceptance caused upstream by the PCG/OGC/strain gate.

## Falsifiable next probe

On the **same** T-shirt initial geometry and settings, count strict block rejections by first failed reason: local direction/line-search, trust-ball, principal strain, aggregate seam cost, max gap, intersection, objective. Run baseline and proposed patch with matched states; report at steps 0/10/20 the 5% max principal strain, maximal/RMS seam gap, stitch cost, `attempts/accepted`, pin error, minimum separation, and endpoint intersection counts. The patch is supported only if newly accepted moves lower RMS/total cost with all physical guards intact and the maximum gap remains acceptable. Zero newly accepted moves means move on to a strain-feasible coupled search direction spanning more interior sheet vertices; do not claim a repair from removing a redundant-looking test alone.

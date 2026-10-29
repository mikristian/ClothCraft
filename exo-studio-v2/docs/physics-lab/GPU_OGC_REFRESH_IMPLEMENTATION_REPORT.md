# Scratch GPU OGC refresh experiment — 2026-10-18

## Implementation

Only isolated scratch `src/gpu_vbd.rs` changed. Split the original 16-iteration Metal dispatch into one iteration per GPU compute/readback chunk. On a boundary-active fraction satisfying `settings.contact.refresh_fraction`, regenerate f64 OGC collision geometry, vertex adjacency, term packing, colors, and safety balls. Each chunk still uses the same original inertial targets and one predicted state; velocities, prediction record and state time commit only once after valid final detection. The physical timestep and trust radius were not increased. Existing `2e-6` separation rejection and every-chunk f64 trust-region checks remain active.

The first prototype refreshed every chunk and used existing 16-ULP, `max(1m,local coordinate)` ball radius padding. It passed 3-step same-source CPU/Metal initial Tshirt avatar seam-gap parity with differences **0.466 / 1.096 / 0.557 mm**; the baseline unrefreshed GPU missed the CPU by approximately **77 / 145 / 180 mm**. On the 40-step diagnostic, however, refresh-only GPU froze at **169.422 mm** max seam gap while CPU reached **4.041 mm** at step 40. The GPU/CPU difference at step 40 was **165.381 mm**. Hardware 40-step log: `gpu-ogc-40step-results.txt`.

## Precision investigation and latest experiment

Near step 12, f64 minimum separation decreased to **4.260 micrometres**, but the original `16*f32::EPSILON*max(|local center|,1)` packing consumed nearly **1.907 micrometres** from the ball radius; minimum packed radius was approximately **0.01 micrometre**. This plausibly explains the motion freeze. Intermediate-radius diagnostic: `gpu-ogc-radii-results.txt`.

The current scratch version uses measured f64→f32 center packing error plus `8*f32::EPSILON*(max_abs(local center)+physical_radius)` padding, and refreshes using accepted vertices close to their current trust sphere. This is an experimental accepted-position proxy for CPU's attempted-candidate clipping count. Current 3-step parity passed (CPU/GPU gap in mm **447.494/446.979**, **373.468/374.433**, **331.481/331.483**). However, the longer diagnostic still diverged **65.530 mm by step 9** and then aborted around step 10 with `GPU OGC intermediate separation below f32 safety margin; state unchanged`. The safety rejection is correct and must remain. Log: `gpu-ogc-40step-precision-results.txt`. The original hard floor must not be reinstated as a purported solution, as it hid the collision failure by freezing progress.

## Additional tests / performance

- Original-radius 40-step trace: 40 diagnostic steps completed, **long-run parity failed** (trace has no strict assertion to preserve all steps).
- Precision-aware 40-step trace: **failed safely** at step ~10, state unchanged for rejected step.
- Precision-aware 3-step parity: **passed** <=5 mm CPU/GPU acceptance threshold.
- Free-panel test `gpu_dense_free_panel_falls_and_rebuilds_after_topology_growth`: **failed** existing assertion that total step displacement stays inside the original step's OGC sphere. This invariant is no longer appropriate when OGC constraints deliberately refresh within a timestep. Requires new per-chunk membership assertions and physical free-fall checks.
- Resting patch test `gpu_contact_settles_and_is_invariant_under_world_translation`: **failed** on first step (test expected y within 1e-5 of 0.003m; observed y=0.0030193992m). Needs targeted physics investigation; no tolerance was relaxed.
- Same native arm64 Metal/CPU test initial three steps wall time CPU **212.742 / 283.451 / 289.863 ms**, GPU **113.568 / 174.941 / 178.369 ms**, GPU detection **52.587 / 125.754 / 128.653 ms**. Hardware GPU timer was unavailable (`gpu_compute_ms=None`); do not infer pure compute or readback from wall-time remainder.

## Decision / handoff

**Do not promote this experimental patch.** The first three steps establish that GPU mid-iteration OGC refresh substantially improves seam closure; the long-run loss of GPU/CPU agreement and resting contact failure remain blockers. Before considering release, investigate contact pair near-collisions and physical precision at steps 9–12, compare GPU Hessian determinant/line search with CPU, and evaluate explicit whole-step f64 CPU fallback from the original incoming state only with backend/timing/fallback metrics. Never relax the 2-micrometre safety guard or change timestep/trust radius to make tests pass. Patch is `gpu-ogc-refresh-prototype.patch`, based on the actual shared `research/oss/clothcraft/src/gpu_vbd.rs` snapshot, and needs review; tests and logs remain in this isolated scratch copy.

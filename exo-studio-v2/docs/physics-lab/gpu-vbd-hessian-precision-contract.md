# GPU VBD Hessian precision: standalone numerical contract

Run `~/.cargo/bin/rustc --edition=2021 --test research/oss/clothcraft/tests/gpu_vbd_hessian_precision.rs -o /tmp/exo-gpu-hessian-contract && /tmp/exo-gpu-hessian-contract --nocapture`. Four CPU-only tests passed. Portable copy: `integrations/clothcraft/rust-patches/gpu_vbd_hessian_precision.rs` (byte-identical). No solver or shader source changed.

The production CPU local solve (`src/vbd.rs`, around lines 398–423) bounds the smallest eigenvalue from below using the Gershgorin row diagonal minus off-diagonal magnitude sum. If that bound falls below `1e-8`, it shifts the Hessian diagonal by `1e-8 - lower + 0.01 * inertia`, then computes a Newton direction and tries up to ten backtracking energies on the original objective. WGSL (`src/vbd.wgsl`, around lines 154–175) instead skips a vertex for `det <= 1e-20`, without the CPU shift, and tries eight energies for eligible vertices. The shader's test also skips all negative determinants.

The test uses synthetic symmetric local quadratic Hessians and gradients, with a matrix determinant, Cramer linear solve, and objective evaluation implemented using only standard Rust. Observations:

| Synthetic example | f64 determinant | f32 packed determinant | CPU-style diagonal shift | Original objective change after CPU-style accepted candidate |
|---|---:|---:|---:|---:|
| Tiny positive diagonal curvature | `4.0e-26` | `4.0e-26` | `9.9e-9` | `-1.36171294e-4` |
| One negative-curvature eigenvalue | `-3.0e-15` | negative | `1.001e-5` | `-1.00200001e1` |
| Near-dependent rows: f32 erases positive curvature | `1.0e-16` | `0` | positive | `-7.31111109e-1` |

All three are rejected by the shader's current determinant rule while their CPU-style regularized directions have strictly positive regularized quadratic curvature, strictly negative gradient dot direction, and at least one accepted energy-decreasing candidate on the *unregularized original* quadratic. A fourth independent quadratic illustrates the iteration-count difference: an oversized initial direction has no acceptable candidate among eight trials, but succeeds on attempt index 8 (the ninth trial) of ten. This is an isolated backtracking demonstration, not evidence that a real garment vertex needs nine attempts.

These constructions demonstrate **existence**, not prevalence in actual garment simulation. They do not replicate full WGSL rounding of gradient/energy, OGC truncation, contact constraints, production Hessian assembly, or GPU hardware. They establish neither the cause of step-four divergence nor universal stability of Gershgorin regularization. To evaluate that cause, instrument matching contact sets and local gradients/Hessians with determinant, SPD shift, candidate energies and accepted line-search attempt on the same rounded positions.

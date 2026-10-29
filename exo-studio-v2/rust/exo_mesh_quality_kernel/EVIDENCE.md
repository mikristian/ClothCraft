RUST-022 evidence (2026-10-21)

Implemented triangle twice-area, longest edge, minimum altitude and aspect in
Rust/WASM with synchronous JS fallback. The WASM host imports Math.hypot to
preserve JS engine rounding at threshold boundaries. Face validation, exact
RangeError messages, threshold decisions, stable worst ordering and report
rounding remain in JS. Mesh generation and solver code are unchanged.

Passed: node scripts/build-rust-mesh-quality-kernel.mjs (2 Rust unit tests,
offline release WASM compilation, 2,014 seeded exact JS/WASM report comparisons
and raw metric comparisons). Covers degenerate, collinear, thin, huge,
underflow, overflow, nonfinite, invalid faces, equal thresholds and tied faces.
Failed WASM initialization also verified to retain synchronous fallback.

Blocked checks:
- node scripts/check-quality-triangulation.mjs: missing three dependency.
- scripts/check-native-cpp-simulation-quality.mjs: missing native test runner
  (GARMENT_SIMULATION_QUALITY_TEST set to a snapshot-local path).
- npm run build: vite not found.

No dependencies installed. Native solver source at research/oss/clothcraft is
absent; no native solver validation is claimed. Review-only pending the above
acceptance checks in a provisioned project snapshot.

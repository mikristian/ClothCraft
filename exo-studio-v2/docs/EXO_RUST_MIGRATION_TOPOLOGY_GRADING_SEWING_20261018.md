# EXO ClothCraft V2 — targeted Rust migration, October 18, 2026

The existing EXO V2 Rust engine is retained. This iteration moves three real
computations used by the visual 2D editor into compiled Rust WebAssembly while
preserving the synchronous JavaScript surface and old-bundle compatibility.
Only source and isolated tests were modified; the installed Mac app and its
user document were not replaced.

## New or extended Rust operations

1. **Pattern topology:** `rust/exo_geometry_kernel/src/topology.rs` now
   computes bounded line-segment collision classification, intersection
   coordinates, endpoint joins and collinear overlap. The
   `src/core/draftingTopology.js` sampled-pattern inspector calls this Rust
   computation once geometry WASM loads. Existing curve sampling, error
   messages, adjacent-edge logic, and undo checks remain in JavaScript.
   `scripts/check-rust-topology-wasm-parity.mjs` independently compares
   compiled Rust/WASM against 1,510 deterministic JS references and four
   sampled garment contours.
2. **Grading points:** `rust/exo_grading_kernel` calculates the existing
   automatic width/height grade-point position, with the
   `src/core/rustGradingKernel.js` adapter and `src/core/grading.js` callers.
   Designer-specific grade-rule overrides and seam-locked T-shirt grading
   still use their existing JavaScript document behavior. The test suite
   includes different grading offsets, flat and tall pieces, and rule overrides.
3. **Sewing inspection:** `rust/exo_sewing_kernel` computes signed seam
   differences, mismatch percentage (relative to the longer partner), and
   warning thresholds for the live sewing-length diagnostics in
   `src/core/sewingLengthDiagnostics.js`. Invalid/unavailable seam readings,
   seam IDs, optional 3D lengths and UI options keep their established JS
   contract. This module is 715 bytes of WASM.

All three initialize asynchronously inside their original browser paths. On
an older installation where a WASM file is missing, the established JS
calculation is used until a compatible Rust build is installed.

## Build and release integration

`scripts/build-rust-grading-kernel.mjs` and
`scripts/build-rust-sewing-kernel.mjs` compile and check their respective
native Rust and release WASM targets, then stage assets under `public/wasm`.
The web-only installer and full macOS packaging script now run the builders
and require both WASM artifacts. npm scripts `rust:build:grading`,
`rust:build:sewing`, `qa:rust-grading`, and `qa:rust-sewing` expose
repeatable local checks. The read-only Rust shipping audit now checks grading,
sewing and topology ABI exports before calling an installation current.

## Evidence and release status

| Gate | Result |
| --- | --- |
| Rust topology + geometry native tests and WASM build | PASS |
| Independent topology vs WASM comparisons | PASS, 1,510 cases |
| Existing pattern topology and curve-retrace tests | PASS |
| Rust grading WASM parity | PASS, 26 fixtures and affine smoke |
| Rust sewing crate native tests | PASS, 3 tests |
| Sewing JS fallback vs loaded Rust WASM | PASS, 992 cases |
| Existing live V2 sewing inspector QA | PASS, 8 measured rows, 0 page exceptions |
| Vite production build into private temp output | PASS, 2,009 modules transformed |
| Staged WASM assets and ABI exports | PASS for topology, grading, sewing |
| macOS packaging shell syntax | PASS |
| Current installed V2 source-artifact parity | FAIL as expected: primary installation still lacks grading, sewing, POM WASM, metadata Rust validator and Rust static host |

This does **not** establish full Rust conversion. The 2D editor still uses
React/JS for application events, sampled curve assembly, undo/redo dispatch,
and display. Production grading and marker nesting, DXF, collaboration and
parts of Node and C++ remain. GPU physical fidelity remains a separate
acceptance blocker; small WASM kernel parity cannot substitute for cloth-body
contact/fit validation.

No installed application rebuild, app termination, deployment or native cloth
solver modification was performed during this migration loop.

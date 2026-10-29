# EXO V2 sewing interval Rust kernel

Ported the numeric interval validation and overlapping-segment checks used in `src/core/sewingConstruction.js` into an independent no-dependency Rust WASM kernel: `rust/exo_seam_interval_kernel/src/lib.rs`.

The adapter (`src/core/rustSeamIntervalKernel.js`) uses the built Rust WASM on supported browsers while keeping synchronous JS compatibility until it loads. `seamEndpointInterval`, `seamEndpointOverlap`, and existing overlap audit use the same shared predicates; piece-ID comparison, project mutation, user-facing validation strings, sewing edge calculations and rendering remain unchanged.

Build and validate from the V2 project root:

```
node scripts/build-rust-seam-interval-kernel.mjs
node --test src/core/rustSeamIntervalKernel.test.mjs
node scripts/check-sewing-construction.mjs
```

The kernel ABI version is 1 with three exports: `exo_seam_interval_abi_version`, `exo_seam_interval_valid` and `exo_seam_intervals_overlap`. A byte-for-byte WASM hash is saved in `public/wasm/exo_seam_interval_kernel.sha256` alongside the module. The kernel computes only pattern-range validity and overlap; it does **not** certify the physical seam correspondence, simulation fit, or factory manufacturing tolerances.

### Validation (October 18, 2026)

- Native Rust: 3 tests passed.
- JavaScript/WASM: 3 integration tests passed, including 3,000 seeded parity comparisons with the previous numeric predicates; verified both pre-load fallback and WASM paths.
- Isolated production Vite source build passed (`vite build --outDir /tmp/exo-rust-seam-interval-build-20261018 --emptyOutDir`); the built `/wasm/exo_seam_interval_kernel.wasm` is byte-identical to the compiled source artifact.
- Original `scripts/check-sewing-construction.mjs`: blocked by missing local fixture `research/clo-reference/live-audit-20261014/exports/clo-male-tshirt-sewn-EXPERIMENTAL.garment.json`, after its synthetic initial seam checks passed. No fixture was recreated or substituted.
- Packaged/installed EXO application was not modified. The Vite source build may include this compiled WASM on the next normal build; this is not evidence that the currently installed app has been updated.

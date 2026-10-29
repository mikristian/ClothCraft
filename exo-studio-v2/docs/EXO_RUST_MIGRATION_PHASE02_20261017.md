# EXO ClothCraft Studio V2 — Rust migration, Phase 02

Date: October 17, 2026. **Implemented, built, and installed in the signed EXO V2 Mac app.**

## What's migrated

This phase moved the following actual editor calculations into a new shared
Rust kernel. It does not replace the existing native Rust cloth solver.

| Editor behavior | Old JavaScript entry point | New Rust computational function |
| --- | --- | --- |
| 2D drafting grid | `draftingSnapping.snapDraftGrid` | `exo_grid_coordinate` |
| Pattern edge projection | `draftingSnapping.nearestOnDraftSegment` | `exo_nearest_segment_t` |
| Native selection 2D lengths | `clothcraftSelectionMetrics.boundaryLength` | `exo_length_2d` |
| Native selection 3D lengths | `clothcraftSelectionMetrics.boundaryLength` | `exo_length_3d` |
| Analytic curved edge lengths | `draftingPrecision.quadraticArcLength` | `exo_quadratic_arc_length` |

The segment and curve code computes measurements for real native 2D/3D pattern
selection, precise drafting and sewing-edge preparation. Coordinates use
centimetres for draft geometry; native VBD selection points remain in metres
and convert to centimetres at the existing adapter boundary.

## Architecture

**New Rust crate**: `rust/exo_geometry_kernel/` is a standalone zero-dependency
`rlib` plus `cdylib` with native unit tests and WebAssembly ABI version 1.
Its generated WebAssembly file is `public/wasm/exo_geometry_kernel.wasm`,
**5,474 bytes**, with adjacent SHA-256 manifest.

**Browser adapter**: `src/core/rustGeometryKernel.js` loads this module
asynchronously once. Existing synchronous JS exports continue working
before the module initializes, with the previous computation as fallback.
Both the standalone browser editor and signed EXO desktop app resolve the
same compiled Rust module. The original editor action/validation UX is kept.

**Build**: `npm run rust:build:geometry` runs native Rust tests, then builds
optimized wasm32 and writes its integrity manifest.

**Release gate**: `integrations/clothcraft/macos/build-web-only-v2.sh` now
builds both the fabric Rust kernel (Phase 01) and geometry kernel, requires
both assets in its staging directory, and runs the native 2D board smoke
with both WASM ABI checks. If installed-app smoke fails, it restores its
previous web backup and signs again. It does not recompile or overwrite the
existing native Rust solver, Swift executable, or project documents.

## Measured validation

- New geometry crate: **3 native Rust unit tests passed**.
- Existing JS and compiled WASM numerical equivalence: **551 parity cases
  passed**, covering grid negative-half ties, nearest points, two- and
  three-dimensional boundary lengths, degenerate segments and curved edges.
- `scripts/check-drafting-snapping.mjs`: passed.
- `scripts/check-drafting-precision.mjs`: passed.
- `scripts/check-drafting-topology.mjs`: passed.
- Original fabric Rust/400-fabric regression: **passed**, 2,025 parity cases.
- Live Chromium/Vite source preview: both Rust WASM responses HTTP 200,
  geometry backend `rust-wasm` version 1, real snapping/curve/selection
  results, fabric hover 3D loaded, zero page exceptions.
- Signed installed EXO V2: native Rust service ready, two live 2D pattern
  panels, fabric and geometry WASM ABI 1, 400 left fabric entries, docked
  right-side fabric editor, zero JavaScript or missing-texture warnings.
- Installed app verified with `codesign --verify --deep --strict`.

An unrelated legacy `check-native-initial-assembly.mjs` test could not run
because its separate XPBD CLI binary was absent. This did not require a
native rebuild to ship the pure-geometry WASM migration.

## Files added and updated

- `rust/exo_geometry_kernel/{Cargo.toml,src/lib.rs,.gitignore}`
- `src/core/rustGeometryKernel.js`
- `src/core/{draftingSnapping,draftingPrecision,clothcraftSelectionMetrics}.js`
- `scripts/{build-rust-geometry-kernel,qa-rust-geometry-kernel}.mjs`
- `public/wasm/exo_geometry_kernel.wasm` and SHA-256 manifest
- `package.json`, web-only signed release script and native smoke test

## Next phase: larger CAD/document operations

Port actual **pattern topology, splits, curve controls and drafting
transactions** to the existing Rust document/authoring model, with versioned
serialized commands and undo/redo parity. The current migration only moves
pure calculations; `draftingSnapping.snapDraftPattern` still manages
candidate collection and selection in JavaScript, `draftingPrecision`
still validates and manages edits, and `clothcraftSelectionMetrics` still
assembles the selected-object metadata in JavaScript.

We should not replace React, Three.js, or the MCP bridge just to achieve a
language target. Preserve existing behavior until the Rust command/document
model has equivalent tests and browser integration, then remove duplicate
JavaScript implementations incrementally. Because the Mac has less than
5 GiB free, postpone heavyweight native recompilation and new asset imports
until the Expansion offload restores comfortable working space.

**Installed**: `~/Applications/EXO ClothCraft Studio V2.app`

**Local rollback snapshot**:
`integrations/clothcraft/output/app-backups/EXO-V2-web-before-rust-geometry-20261017`

No GitHub push or pull request was performed by this migration loop.

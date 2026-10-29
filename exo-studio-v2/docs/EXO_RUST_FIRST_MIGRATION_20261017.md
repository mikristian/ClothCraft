# EXO ClothCraft V2 — Rust-first migration, phase 01

Date: October 17, 2026. This is a working code migration, not a full Rust rewrite.

## Existing architecture

- React/JavaScript/Vite/Three.js frontend: approximately 147 JS, JSX, TS or TSX files in src/. It handles workspace UI, tools, scene presentation, and non-native drafting/material computations.
- Native Rust editor and cloth physics: research/oss/clothcraft (marvelous-cloth). Approximately 59 Rust files in its src/ directory, including authored garment patterns, FEM/VBD, drafting and native rendering.
- Desktop: Swift launcher, a local Node HTTP/native-session bridge, plus independent C++ and Python integrations. The installed Mac app web UI uses port 5386; its Rust bridge is on port 5385.
- This migration leaves the existing Rust solver, executable, saved garment projects and native authoring operations intact.

## Phase 01: completed and installed

1. Created a standalone, zero-dependency Rust library in rust/exo_fabric_kernel. It produces native Rust rlib and wasm32-unknown-unknown cdylib from exactly one source.
2. Versioned C ABI v1 includes texture width and height normalization (centimetres), photographic/procedural texture UV repeat ratios, and PBR roughness-channel byte balance. This is optical/material computation, NOT physical cloth simulation.
3. The generated WebAssembly module is public/wasm/exo_fabric_kernel.wasm (1,617 bytes), with public/wasm/exo_fabric_kernel.sha256 for integrity.
4. src/core/rustFabricKernel.js loads the Rust module asynchronously and provides synchronous functions. During first-frame loading or a failed download, mathematically equivalent JavaScript executes until the Rust kernel becomes available.
5. src/core/fabricPbrAppearance.js now delegates to Rust WebAssembly transparently through the existing public API. Fabric ball, 3D garment and fabric material components did not need an API rewrite.
6. Added scripts/build-rust-fabric-kernel.mjs (cargo unit tests, optimized wasm, SHA-256), scripts/qa-rust-fabric-kernel.mjs (numeric parity), npm run rust:build:fabric and npm run qa:rust-fabric.
7. The signed web-only desktop release now builds Rust WASM, refuses a missing artifact, and verifies WASM ABI 1 plus the native 2D Rust board, with rollback to its prior web bundle on failure.

## Acceptance

- Native Rust unit tests: 3 of 3 passed.
- Rust versus JavaScript parity: 2,025 cases including invalid-number and string inputs, dimensions, and roughness.
- Existing 400 material preset, optical and repeat-calibration regressions: passed.
- Live browser: WebAssembly downloaded with status 200; rustFabricKernelStatus reported backend rust-wasm, ABI 1. The fabric viewer rendered without page errors.
- Signed installed EXO V2: backend native ready, two actual 2D pattern panels, WebAssembly ABI 1, 400 left fabric presets, docked right Fabric Property Editor, zero texture-upload warnings, invalid ports or JavaScript exceptions.

## Subsequent migration sequence

1. **Rust geometry/math:** clothcraftSelectionMetrics.js, draftingSnapping.js, draftingPrecision.js, point/edge measurements; preserve centimetre/metre precision with numeric and full UI parity.
2. **Rust CAD state/topology:** draftingTopology.js, draftingSplit.js, draftingUnfold.js, clothMeshing.js, exact native undo/redo, revision-checked document editing and persisted format.
3. **Rust sewing and simulation:** sewingConstruction.js, autoFitPlacement.js, grading.js, marker.js, garment contact. Extend the existing marvelous-cloth Rust engine rather than creating a competing solver.
4. **Rust material/photo processing:** clothcraftFabrics.js, fabricSurfaceModel.js, fabricCalibration.js, clothWash components. Transfer whole buffers (not many one-pixel wasm calls) and retain PBR color-space, UV, licensed-source and physics provenance.
5. **Rust import/export:** dxf.js, bomXml.js, factoryPackage.js, numeric SVG pattern preparation, techpack and production handoff. Require safe parser limits and round-trip equivalence.
6. **Rust command engine and automation:** assistantActions.js, workspaceCommandIndex.js, toolbar routing, Node bridge/MCP boundaries. Commands must be schema-validated, transactional, revision checked, and permission scoped.
7. **Rust UI and GPU architecture:** converge on the existing native Rust eframe/egui and wgpu stack. Retain the working React/Three.js UX temporarily until each view/tool is actually replaced and verified. A web build can use Rust WASM plus a thin JS/DOM compatibility layer.
8. **Remove obsolete JS, Node and C++ duplicate paths:** only after tool parity, image/physics regression, file compatibility, automation and native signing/recovery tests pass.

## Limits and safeguards

All-Rust is a multi-phase target. Browser integration can still require DOM, CSS, WebGPU/WebGL or JavaScript glue even when business and compute logic is Rust. Rewriting the complete interface at once is not a safe migration.

Rust does not magically improve tiny scalar operations. The first module establishes cross-platform code ownership, a stable ABI, parity tests and release guarantees. Later material work should process whole image buffers inside Rust.

Do not replace or rebuild the native solver while concurrent work is active. The development Mac had about 5.8 GiB free after this release, below the recommended 25 GiB for major native compilation and large scans.

## Rebuild and restore

- Build source and WASM: npm run rust:build:fabric
- Test first Rust module and 400 fabrics: npm run qa:rust-fabric
- Installed EXO app: ~/Applications/EXO ClothCraft Studio V2.app
- Local release backup: integrations/clothcraft/output/app-backups/EXO-V2-web-before-rust-kernel-20261017
- Earlier backup builds: Jarvis Expansion /Volumes/Expansion/BlenderMac_Storage_Offload_20261009/EXO_V2_Archived_Builds_20261017

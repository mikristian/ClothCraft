# EXO ClothCraft Studio V2 — Rust conversion audit and active migration

**Date:** 2026-10-18. **Status:** In progress; production is **not** entirely Rust.

**Latest migration loop:** See `docs/engineering/exo-v2-rust-migration-loop-20261018-1930.md` for the completed Rust strain, mesh selection, fabric costing, sewing interval and techpack POM conversions, current tests and current 458-file scoped first-party non-Rust audit. The 453-file snapshot below predates those new bridge modules.

## Scope and completion standard

"Entire app in Rust" means all first-party production **application logic**, numerical geometry, pattern authoring, sewing/physics, state management, service transport, user interface logic, and native host control authored in Rust. WebKit, Metal, macOS operating-system libraries and generated browser JavaScript glue may still exist as platform dependencies. Generated code must be distinguishable from first-party source. A native Rust simulation executable does not establish Rust ownership of the React UI, HTTP/MCP service or Swift window.

An actual completion claim requires release builds launching on macOS and browser, persisted document round-trip, direct UI interaction tests, native fitting and sewing performance/physics regressions, exported techpack checks, protocol compatibility tests, and an authoritative production-file inventory showing no remaining first-party JS/JSX/TS/Swift/C++ implementation.

## Verified source architecture (snapshot)

| Production surface | Current implementation | Migration status |
| --- | --- | --- |
| Garment patterns, CPU VBD/OGC, native authoring and solver state | `research/oss/clothcraft/` Rust crate; `integrations/clothcraft/exo-session.rs` Rust adapter | Rust exists; collision/seam long-run numerical parity still needs work |
| 2D drafting/selection and fabric optical geometry | `rust/exo_geometry_kernel/` and `rust/exo_fabric_kernel/` compiled to WASM, invoked from `src/core/` JS adapters | Grid snapping, segment math, quadratic/cubic curves, independently adjusted handles, physical arclength and axis guideline projection run through Rust WASM when loaded; remaining editor logic in JavaScript |
| Independently adjustable 2D Bézier handles and authored physical free-curve station lengths | `src/core/nativeFreeCurvePoints.js`, `rust/exo_geometry_kernel/src/cubic.rs` | Cubic positions, derivatives and segmented material arclength now calculated with Rust WASM when loaded; previous JS fallback retained |
| Pattern and 3D interface | `src/App.jsx`, `src/components/`, Three.js/React renderer and pointer event logic | Mostly JavaScript/JSX; requires Rust WASM view and update model |
| Native POM label geometry | `rust/exo_ui_kernel/`, `src/core/rustPomKernel.js`, `src/components/PatternEditor.jsx` | Rust WASM now invoked from the actual POM SVG label path once loaded; installed app still needs updated signed web bundle |
| Collaboration, transport, workspace metadata and MCP bridge | `integrations/clothcraft/{server,workspace,mcp-server}.mjs` | Node server remains. Rust validator `integrations/clothcraft/rust-service/` integrated for manufacturing property validation when binary is present |
| Loopback static web asset server | `integrations/clothcraft/static.mjs`, Rust replacement at `integrations/clothcraft/rust-static-host/` | New Rust host passes Node behavior parity; V2 Swift source launcher now targets compiled Rust static host for port 5386. Installed app still uses old Node static host pending verified release |
| macOS application/window and native OS integrations | `integrations/clothcraft/macos/*.swift`, `native_app/*.swift` | Swift and Apple APIs remain; Rust native host migration pending |
| Non-Rust native solver and geometry | `native_cpp`, `native_backend`, `ppf_backend` | C++/JS remain; migration needs functional dependency inventory before removal |
| Techpack interface | `techpack-studio/` React/JS frontend | Requires independent Rust UI/application migration |
| Local 3D foam pad preview response | `src/core/foamCompressionModel.js`, `rust/exo_foam_kernel/` | Radial press falloff and time-stepped compression/recovery now execute in Rust WASM when loaded; JS handles existing validation/fallback; physical VBD solver unchanged |
| Multi-size automatic pattern grading | `src/core/grading.js`, `rust/exo_grading_kernel/` | Automatic point-displacement calculation migrated to Rust WASM; full grading model/edit orchestration remains JavaScript |
| Agent API request action validation | `integrations/clothcraft/agent-api.mjs`, `integrations/clothcraft/rust-agent-api/` | Actual Node dispatch validates through persistent Rust JSONL helper with existing JS defenses and fallback; wider API still Node |
| Pencil/freehand pattern stroke simplification | `src/core/vectorFreehandFit.js`, `rust/exo_vector_fit_kernel/` | Deterministic squared point-to-segment distance now calculated by Rust WASM inside production RDP fitting; stroke orchestration and point-count budget still JavaScript |
| Analytic 2D construction tools | `src/core/draftingConstructions.js`, `rust/exo_construction_kernel/` | Line intersections, projections, mirrors, along and perpendicular offsets execute through Rust WASM when loaded; JS retains reference/error checks |
| Free Sewing cutline navigation | `src/core/freeSewingGeometry.js`, `rust/exo_free_sewing_kernel/` | Rust WASM now computes batched cutline projection, position at arc-length fraction and range cutlines; JS validates indices and preserves synchronous fallback |

Source snapshot from scoped `rg --files` inventory across `src`, `techpack-studio/src`, `integrations/clothcraft`, `native_backend`, `ppf_backend`, `native_cpp`, `native_app` (includes some tests and non-production files): **73 JSX, 158 JS, 186 MJS, 172 C++, 90 HPP, 9 Swift, 16 Rust**. Rust is also present in `research/oss/clothcraft` (102 `.rs` files) and standalone Rust WASM crates. These are source counts, **not** percent conversion, lines-of-code parity, or production dependency reachability. Existing source and user-workspace modifications must remain intact.

## Implemented conversion loop

1. Rust cubic Bézier evaluation, incoming/outgoing derivative, and 128-chord material arclength added to `rust/exo_geometry_kernel/src/cubic.rs`. Existing `src/core/nativeFreeCurvePoints.js` uses the compiled Rust WASM path through `src/core/rustGeometryKernel.js` while retaining validated compatibility behavior until the module loads. The geometry ABI remains additively compatible with v1.
2. Native Rust manufacturing metadata validation added under `integrations/clothcraft/rust-service/`, with persistent process bridge and guarded fallback in `integrations/clothcraft/workspace.mjs` for Pantone, item numbers, fabric appearance, and supplier/manufacturing fields. Installed app must contain the Rust binary and updated native bridge before a live Rust result can be claimed.
3. Rust POM label-anchor geometry compiled under `rust/exo_ui_kernel/` with `src/core/rustPomKernel.js` adapter. Actual `PatternEditor.jsx` POM label path uses Rust when the module loads and falls back to prior coordinates while loading. The macOS bundle builder now requires the WASM asset.
4. Rust angular guideline projection added to `rust/exo_geometry_kernel/src/axis.rs`, wired through `src/core/draftingSnapping.js` with exactly the prior validation and JavaScript angle semantics; parity tests cover the returned coordinates.
5. Entire small loopback static asset server implemented in `integrations/clothcraft/rust-static-host/` and compared with Node static.mjs on a temporary isolated web root. Future V2 Swift/packaging source builds compile and launch it on port 5386, preserving Node as the API server on port 5385. This source migration has **not** replaced the currently installed app.
6. Rust multi-size grading kernel added under `rust/exo_grading_kernel/`, with `src/core/rustGradingKernel.js` and actual `src/core/grading.js` automatic point displacement delegating to compiled WASM when loaded. Rule overrides and document persistence remain unchanged in JavaScript.
7. Rust agent API JSONL validator added under `integrations/clothcraft/rust-agent-api/`, invoked by production `agent-api.mjs` before the existing JS checks. Future V2 source packaging builds and stages the executable; installed app unchanged.
8. Full local foam pad preview integration transferred to `rust/exo_foam_kernel/`; `src/core/foamCompressionModel.js` invokes compiled WASM for bounded damping, memory, compression, recovery and radial contact mask. Existing public normalization and synchronous fallback preserve behavior before WASM availability. `scripts/build-rust-foam-kernel.mjs` uses offline/locked Cargo; both V2 packaging source scripts now compile and require grading/foam WASM assets.
9. `rust/exo_vector_fit_kernel/` ports the segment-distance numerical primitive used in freehand Pencil Ramer-Douglas-Peucker stroke fitting; `src/core/vectorFreehandFit.js` calls its compiled WASM through `src/core/rustVectorFitKernel.js`. Future V2 builds run locked/offline Cargo and require `wasm/exo_vector_fit_kernel.wasm`.
10. `rust/exo_construction_kernel/` ports exact 2D point construction geometry from `src/core/draftingConstructions.js` to Rust, while preserving existing public error strings and pattern point validation. V2 packaging source requires the construction WASM binary; the running installed Mac app has not been replaced.
11. `rust/exo_free_sewing_kernel/` transfers full material-space polyline projection, arc-length station selection, and range geometry into a bounded single-call Rust WASM ABI. `src/core/freeSewingGeometry.js` preserves its previous return values and invalid-input rejection and calls Rust on valid cutlines. Both macOS V2 packaging source scripts compile/require the new WASM file.
12. A read-only Rust migration inventory tool was added at `rust/exo_migration_audit/`. It scans the first-party source surfaces and omits QA, generated and vendor/build trees; native Rust fixture tests pass. It reports remaining files by language rather than inventing a percentage-complete estimate.

## Acceptance evidence

- `node scripts/build-rust-geometry-kernel.mjs` and native Rust test rerun: Rust geometry unit tests **9/9** after adding cubic and angular projection, WASM release build successful.
- `node scripts/qa-rust-free-curve.mjs`: **131** Rust/JavaScript numerical parity assertions across independent cubic tangents and material station lengths.
- `node --test src/core/nativeFreeCurvePoints.test.mjs`: **6/6** authoring tests.
- `npm run qa:rust-geometry`: **551** kernel parity cases plus drafting snapping and precision checks.
- `node --test integrations/clothcraft/rust-service/validator-client.test.mjs`: **2/2** test suites (20 validation fixtures plus binary failure path).
- `node --test src/core/rustPomKernel.test.mjs`: **1/1** compiled Rust WASM adapter test.
- `node scripts/qa-rust-pom-browser.mjs`: **passed** in an isolated real Chrome context at the running development URL; selected 2D chest POM label reports `data-pom-backend=rust-wasm`, and SVG coordinates agree with Rust results.
- `node --test src/core/draftingAxisRust.test.mjs`: **1/1** Rust angular guideline parity test; original drafting snapping checks pass.
- Rust static host: native Rust tests **2/2**, **12** loopback server API/MIME/security parity cases vs Node static.mjs, packaged-source Swift arm64 compile and shell syntax checks passed.
- `npm run build`: Vite production build successful. Generated JS is still present because the frontend has not been migrated.
- `node scripts/qa-rust-foam-kernel.mjs`: **2,140** numerical parity checks on **400** foam state frames and **140** contact masks; `node scripts/qa-foam-compression.mjs` passes unchanged.
- `node scripts/qa-rust-foam-browser.mjs`: **passed** in actual EXO V2 browser; Rust WASM loaded and local 3D foam preview computation produced finite nonzero compression and displacement.
- `cargo test --manifest-path rust/exo_foam_kernel/Cargo.toml --locked --offline`: **3/3** Rust tests; WASM release build successful.
- `node rust/exo_grading_kernel/parity.mjs`: **96** automatic grading point/size pairs matched compiled Rust.
- `node --test --test-force-exit integrations/clothcraft/rust-agent-api/parity.test.mjs`: **1/1** Rust request validation parity test against production API dispatch.
- `node scripts/build-rust-vector-fit-kernel.mjs`: Rust unit tests **4/4**, 500 WASM numerical parity samples and 1,000-sample real Pencil stroke plus closed-path compatibility; existing `src/core/vectorFreehandFit.test.mjs` **5/5**.
- `node scripts/qa-rust-construction-kernel.mjs`: **52** Rust-WASM/JavaScript geometry parity cases including point construction errors; existing `node scripts/check-analytic-drafting-constructions.mjs` passes.
- `node scripts/build-rust-free-sewing-kernel.mjs`: **3/3** native Rust unit tests, real WASM parity across **129** independent cutlines each tested for projection, fraction and range, plus existing Free Sewing cutline integrity suite. The compiled file is `public/wasm/exo_free_sewing_kernel.wasm`.
- `node scripts/qa-rust-free-sewing-browser.mjs`: **passed** in an isolated real EXO V2 browser. Returned `rust-wasm` and verified the 75% material station and 20–80% cutline range.
- `rust/exo_migration_audit/` native Rust unit test: **passed**; current counted source inventory is **453 first-party non-Rust files** (167 JS, 73 JSX, 23 MJS, 181 C/C++, 9 Swift) in the configured seven app surfaces, plus 19 Rust files in those surfaces. These counts do **not** include standalone `rust/` kernels or the separate research Rust solver. They count source files rather than lines or converted functionality.
- Production `npm run build` after these conversions: **2,009 modules transformed**, build passed; existing bundled JS remains about 3.77 MB before gzip, indicating significant frontend migration work remains.

## Installed desktop release gate

The currently installed V2 app was checked before any web-only resource replacement. `node scripts/qa-installed-v2-bridge-smoke.mjs` **failed** on its existing requirement that the running signed desktop use GPU VBD: observed solver string `ClothCraft CPU VBD + OGC`, while the check expects `/GPU VBD/`. The current installed app was **not modified or redeployed**. The new Rust frontend modules are wired in the repository build and source bundle; do not report them as active in the installed app until GPU backend health/release smoke and signed web installation succeed. A separate direct browser QA stalled on the preexisting `Edit Curves` button locator before testing POM output; it is not evidence of a POM failure or success.

## Remaining engineering phases

1. **Rust application core contracts:** Make pattern, sewing, grading, techpack, state transactions and export records authoritative in Rust, with stable schemas and direct integration tests. Move additional browser calculations into versioned WASM interfaces; avoid duplicate JS state logic.
2. **Rust server:** Replace Node HTTP, MCP, collaboration, session and persistence handlers with a Rust service. Preserve response formats and API tests, and only remove old implementations after feature and error parity.
3. **Rust UI:** Move React component state, pointer interactions, SVG drafting and then 3D viewport management to Rust/WebAssembly. A browser still needs DOM/WebGL or WebGPU APIs and glue. Keep existing screens testable during staged replacement.
4. **Rust native host:** Move application and process lifecycle out of Swift into Rust macOS window/OS bindings, then port remaining production C++ physics/geometry or remove proven-unused components.
5. **Release gate:** Once no first-party non-Rust production modules remain, add strict source inventory/CI enforcement, run macOS app launch and native GPU physics parity, and confirm live installed app runs the compiled Rust components.

**Do not mark the migration complete based only on the new Rust kernels.** Every loop must identify the next live non-Rust call path, implement the Rust replacement, run behavioral parity and a release build, and remove the old path only after stable tests.

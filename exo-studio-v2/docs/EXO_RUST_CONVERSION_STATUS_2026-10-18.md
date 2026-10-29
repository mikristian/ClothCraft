# EXO ClothCraft Studio V2 — Rust conversion status

Date: 2026-10-18. This is a source and installed-app evidence snapshot, not a completion certificate.

## Verified runtime boundaries

| Area | Rust now | Remaining non-Rust components and validation |
| --- | --- | --- |
| Native project, pattern editing, sewing and simulation | `research/oss/clothcraft/` Rust library, `exo-session` process and native RPC | Verify every editing/grading/export operation and transactional preservation; CPU/Metal parity and penetration acceptance remain open |
| 2D geometric calculations | `rust/exo_geometry_kernel/` compiled WebAssembly, `src/core/rustGeometryKernel.js` adapter | JavaScript orchestration in drafting topology and tooling; Rust WASM must load before claiming an operation actually executes in Rust |
| POM placement | `rust/exo_ui_kernel/`, `src/core/rustPomKernel.js`, PatternEditor renderer | Installed primary app still lacks `exo_ui_kernel.wasm` on this date |
| Fabric previews | `rust/exo_fabric_kernel/` WebAssembly | React/Three.js rendering, material and catalog interaction remain JS |
| Metadata validation | `integrations/clothcraft/rust-service` binary and persistent JS client | Current installed app has older Node code and no metadata validator executable |
| Static web delivery | `integrations/clothcraft/rust-static-host` Rust binary (source parity test passes) | Installed primary app still launches its prior Node static host until a reviewed rebuild |
| Workspace transactions, collaboration, HTTP, automation | Rust exo-session document operations under Node orchestration | `integrations/clothcraft/{workspace,server,agent-api,collaboration}.mjs` and transport/auth/persistence |
| Production geometry and export | Native Rust cutting outline and measured seam operations in research source | C++ native geometry helper and JS DXF, grading, marker, and preflight paths remain; factory approval required |
| Desktop UI | Rust computation called by WebAssembly | React/JSX, Three.js and Swift AppKit/WebKit are still the user-visible application |

No single percentage would be honest: these components differ dramatically in size and responsibility. A Rust executable on disk does not prove an individual GUI operation uses it or that the GPU physics is physically correct. A strict all-Rust result requires replacing the browser/Three renderer, Node services and Swift host, while a useful **Rust-first** product can retain them as thin UI/OS adapters.

## Shipping evidence (new audit)

Read-only command:

```sh
node scripts/qa-rust-v2-shipping-audit-20261018.mjs
node scripts/qa-rust-v2-shipping-audit-20261018.mjs --require-shipped
```

The second command intentionally exits with status 1 while source and installed Rust artifacts differ, and is suitable as a release preflight. On this date, `~/Applications/EXO ClothCraft Studio V2.app` contains an older `exo-session` binary and geometry WASM; POM WASM, Rust metadata validator and Rust static host are missing. The fabric WASM matches the source hash. The audit also inspects exported functions to distinguish valid WASM from older ABI shapes. This is an artifact-presence gate only; acceptance still needs Rust protocol tests, browser QA, signed bundle validation and preservation of user projects.

The older public `public/avatars/makehuman-base.obj` is a different test fixture from `research/oss/clothcraft/assets/makehuman/mannequin.obj`. CPU/Metal physics benchmarks must pin the exact fixture SHA and native executable; see the GPU parity and fallback research notes. On the reference mannequin, CPU reached 4.041 mm seam gap at 40 steps, while the experimental hybrid GPU path with f64 CPU fallbacks remained about 170.478 mm; do not promote that hybrid solve as equivalent.

## Testing on the source snapshot

- `node scripts/qa-rust-geometry-kernel.mjs`: **PASS**, 551 numerical parity cases, loaded compiled geometry Rust WASM.
- `node scripts/check-drafting-snapping.mjs`: **PASS**, including Shift-axis drafting guidelines.
- `node src/core/rustPomKernel.test.mjs`: **PASS**, compiled Rust POM ABI.
- `node integrations/clothcraft/rust-service/validator-client.test.mjs`: **PASS**, 2 tests, includes missing-binary fallback.
- `node integrations/clothcraft/rust-static-host/parity.test.mjs`: **PASS**, Node/Rust HTTP behavior comparison.
- `node scripts/qa-rust-v2-shipping-audit-20261018.mjs --require-shipped`: **EXPECTED NONZERO** due to installed-source differences. Primary installed bundle was not rebuilt.

## Conversion priorities

1. **Finish Rust 2D authoring authority:** deterministic topology intersections, Bezier split/merge, native measurements, POM dependency references and stable sewing/grading IDs, with save/reopen/undo/redo parity tests. `src/core/draftingTopology.js` and its App callers are a first bounded candidate.
2. **Move manufacturing calculations to Rust:** unify native grade rules, marker layout, DXF/measurement and notches with a single production model; preserve physical units and compare current JS and C++ reference outputs.
3. **Replace Node transport incrementally:** promote proven Rust static server, then migrate workspace routing/auth with process lifecycle tests and a zero-downtime user document upgrade.
4. **Fix simulation acceptance:** test Rust CPU and Metal GPU on identical mannequin/pattern fixtures, physical contacts, pins, sewing, repeatability, and material fit; do not use visual similarity as validation.
5. **Decide the UI boundary:** retain React/Three.js and Swift for a Rust-first app, or separately fund an extensive Rust-native renderer and desktop rewrite.

## Planning estimate (conditional, not a release promise)

For a dedicated **two-engineer team** with existing tests and uninterrupted iteration:

| Target | Rough effort window | Example planning horizon if beginning now |
| --- | --- | --- |
| Rust-first core with the current UI and safe packaging | 3–6 calendar months, assuming physics issues are bounded | January–April 2027 |
| Strictly all-Rust desktop application including UI/rendering and transport | 9–18+ calendar months; substantial UI rewrite and high physics risk | July 2027–April 2028 or later |

With one engineer, these ranges may be significantly longer. AI assistance can reduce mechanical conversion time but does not replace performance, numerical validation, user interaction regression testing or factory calibration. No firm end date is justified until each workstream has a measured completion/acceptance baseline. Ship tested milestones as they complete; preserve a working signed app throughout.

## Scope and provenance

This audit added only `scripts/qa-rust-v2-shipping-audit-20261018.mjs` and this report. It did **not** modify the installed app, shared Rust cloth solver, bridge processes or user projects. Many other source files are concurrently edited; future migrations should own bounded files and avoid bulk resets or unsynchronized release builds.

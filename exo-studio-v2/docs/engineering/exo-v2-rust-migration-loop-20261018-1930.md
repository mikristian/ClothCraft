# EXO ClothCraft Studio V2 — Rust migration loop

**2026-10-18 | Source changes and verification only.** The overall app is **not 100% Rust**. The installed signed macOS application was preserved and has **not** been rebuilt in this migration loop. Existing GPU VBD release verification is not cleared by these source-level tests.

## Real production paths migrated this loop

| Existing user-facing path | Rust implementation | Active production integration |
| --- | --- | --- |
| 3D simulation **strain visualization** for triangles and vertices | `rust/exo_strain_kernel/` | `src/core/clothcraftStrainView.js` delegates to the Rust WebAssembly kernel. Batches an entire mesh snapshot per invocation and computes maximum principal extension from material UV and current world-space positions in metres. |
| 3D **mesh face selection** and shared vertex index sets | `rust/exo_mesh_selection_kernel/` | `src/core/meshSelection.js` calls Rust for bounded selection toggles, preserving the existing selection metadata, vertex order contract and JS fallback. |
| Multi-size **marker-based manufacturing fabric costs** | `rust/exo_fabric_cost_kernel/` | `src/core/productionCost.js` sends all marker rows and size groups to Rust together; JS still builds grade/marker inputs, the exact report structure and CSV. |
| Native sewing **partial seam measurements** | `rust/exo_selection_metrics_kernel/` | `src/core/clothcraftSelectionMetrics.js` delegates rest-arclength interval 3D measurement to Rust with one packed boundary operation; material units/return shapes stay unchanged. |
| Techpack **POM horizontal spans** for graded body and sleeve pieces | `rust/exo_measurement_kernel/` | `src/core/measurements.js` delegates sampled polygon intersections at multiple measurement levels to Rust WASM; the authored measurement library, size runs and techpack JSON/CSV remain intact. |

Each is a compiled Rust `wasm32-unknown-unknown` kernel, invoked by the application's existing production module after ABI-checked module loading. Synchronous JavaScript compatibility paths remain for the loading interval or unsupported inputs. This means the UI and surrounding orchestration still include JavaScript.

## Tests performed

- Strain Rust tests **2/2**; compiled-WASM vs original JavaScript **6,779 numerical comparisons** across **135 meshes**; legacy `integrations/clothcraft/check-v2-strain-view.mjs` pass; actual browser loaded Rust and computed 20% triangle and vertex stretch.
- Mesh selection Rust tests **2/2**, compiled-WASM **308** selection transitions and existing C++/JS mesh selection checks passed; actual browser used Rust to select and clear a mesh face.
- Fabric cost Rust tests **2/2**, compiled-WASM **800 differential cost cases** plus **5 report fixtures**; original manufacturing and C++ comparison **54 marker material rows, 36 size totals**, exact CSV retained; actual browser calculated a two-material total of **18** through Rust.
- Selection metrics Rust test **1/1**, compiled-WASM differential **200** partial seam boundary cases; existing geometry parity suite **551** checks; browser verified a 10 cm material interval and 12 cm draped interval.
- Measurement Rust test **1/1**, **1,000** numeric span cases and **3,506** fallback differential comparisons across project fixtures; C++/JS measurement parity test verified **44** measurements, **237** graded measurements and byte-identical CSV; browser loaded the Rust POM kernel and measured 10 cm horizontal spans.
- `npm run build`: Vite production web bundle **passed**, as did macOS source scripts `bash -n` and targeted `git diff --check`. Generated browser JavaScript is still large and remains part of the running app.

## Build and release wiring

`integrations/clothcraft/macos/build.sh` and `build-web-only-v2.sh` now build and check the five new WASM artifacts (`exo_strain_kernel`, `exo_mesh_selection_kernel`, `exo_fabric_cost_kernel`, `exo_selection_metrics_kernel`, `exo_measurement_kernel`) along with previous Rust kernels in future V2 web packaging. The source build does not imply those assets have been installed in the signed Mac `.app`; no installed resources were overwritten.

## Objective remaining-source audit

The standalone read-only Rust `rust/exo_migration_audit` CLI was rerun after this loop. It scanned the seven configured first-party surfaces while excluding tests/QA/generated/build/target/vendor:

| Source class | Remaining files |
| --- | ---: |
| `.js` | 172 |
| `.jsx` | 73 |
| `.mjs` | 23 |
| C/C++ | 181 |
| Swift | 9 |
| TypeScript | 0 |
| **Total first-party non-Rust** | **458** |

There are 19 Rust source files *within those seven surfaces*, plus additional standalone Rust WASM crates under `rust/` and the extensive `research/oss/clothcraft/` native solver. This is a file inventory, **not a conversion percentage**. The remaining count increased from 453 during these integration loops because new JS bridge modules were added, even as their production numerical operations moved into Rust; we should not claim source-language completion from Rust kernel tests.

## Remaining release work

Fully port the source-owned React/Three.js pattern/scene UI and application state; Node API, workspace/persistence and collaboration services; actual native C++ functionality; Swift macOS lifecycle and related plugins. Prove feature parity and remove legacy source paths only when replacement consumers and compatibility tests pass. Before installing the rebuilt app, also resolve and validate the native GPU VBD release smoke gate and verify signed desktop startup with live Rust backend and existing user projects intact.

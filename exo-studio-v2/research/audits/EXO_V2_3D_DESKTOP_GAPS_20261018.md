# EXO V2 3D and desktop engineering gap audit — 2026-10-18

Scope: source and existing QA inspection only. No live garment edits, application builds, or fresh acceptance runs. Ranking reflects risk to manufacturer-grade fitting and reliable desktop delivery. Existing passing checks are historical evidence, not independently rerun here.

## P0 — solver and contact parity blocks physical fit claims

`native_cpp/core/cloth_simulation.cpp:21-33` requires a premeshed particle snapshot, explicitly marks `fullParity:false`, lists missing triangulation, sewing compilation, self collision, avatar contact, wind, virtual seams, surface attachments and fit metrics, and rejects collision-enabled stepping. `native_cpp/core/cloth_solver_step_extended.cpp:12-17` also rejects collision, surface correction and wind. Other specialized contact modules and unit tests exist (`avatar_contact_pass.cpp`, `mesh_avatar_contact.cpp`, `self_collision.cpp`, `tests/test_cloth_solver_step_contacts.cpp`), but their existence does not establish an integrated end-to-end production solver. Highest leverage: one supported native simulation orchestration path that compiles authored patterns into particles, executes cloth/contact/seam constraints together, and reports contact and energy diagnostics. Gate fit claims on sewn garments with body collision enabled.

## P0 — quantitative fit acceptance is currently inadequate

`native_app/STATUS.md:87` records historical `check:physics` numeric pass alongside 8.1 mm mean seam gap and 176% maximum local stretch; `check:avatar` fails for a 160 cm avatar with roughly 1346% strain. These are substantial correctness gaps even though the physics script reports a pass. Build calibrated benchmark fixtures across avatar sizes, fabric stiffnesses and seam types. Record seam gap distributions, stretch percentile, penetration depth/area, drape landmark error, POM deviations, convergence and repeatability. Specify numerical tolerances before promotion and include known-good physical or validated reference measurements.

## P1 — meshing and remeshing fidelity needs integrated verification

`native_cpp/core/cloth_simulation.cpp:21-26` consumes an already meshed snapshot rather than triangulating authored curved 2D patterns. `native_app/STATUS.md:87` explicitly calls true millimeter particle-distance meshing unfinished. Verify curved boundary discretization, grain orientation, graded-piece topology, triangle quality, adaptive refinement and preservation of seam/notch correspondence through remeshing. Add geometry-invariant and convergence tests; do not assume a separate mesh utility proves production solver integration.

## P1 — avatars, fitting and physical material controls

The source contains dedicated avatar collision kernels and correction tests (`native_cpp/core/avatar_physics.cpp`, `avatar_surface_correction.hpp`, `tests/test_avatar_physics.cpp`), plus UI and geometry guides (`src/components/avatarConstructionGuides.js`). Test actual imported body meshes, size switching, body-pose deformation, garment-layer interactions, body collision stability and strain sensitivity across the entire application path. `native_cpp/core/simulation_protocol.cpp:19-55` maps material density, thickness, pattern grain, attachments and settings, but a serialized control is not proof that every parameter changes the native force model. Establish parameter-to-physics sensitivity tests and calibrated material swatches.

## P1 — desktop lifecycle, persistence and native bridge acceptance

`src/App.jsx:275` restores local saved projects and `src/App.jsx:1003` maintains an undo stack; inspect transactional coverage for geometry, seam, grading, avatar, fabric and simulation changes, including restart after crash and interrupted save. `native_app/STATUS.md:42` reports a successful headless desktop UI smoke check and `:73` records build and transform regressions passing. Those tests do not establish sustained packaged-app interaction, multi-hour simulation, recovery after worker/native-process failure or deterministic reload of a complex production project. Add native package launch/restart tests, bridge protocol version checks, corrupted-state recovery, atomic backups and undo/redo round trips on mixed edits.

## P2 — performance and portability qualification

`native_cpp/core/cloth_simulation.cpp:42-55` clamps substeps to 1–4 and derives 2–14 iterations divided by substeps; validate numerical stability under high stiffness, dense meshes and rapidly moving avatars. Record wall time, memory, collision-pair counts, per-frame convergence and reproducibility across mesh resolutions. `native_app/PORTABILITY.md:8` explicitly says Windows/Linux have not been compiled or tested. Add macOS packaged acceptance and crash telemetry first, then supported-platform CI and GPU/CPU parity qualification.

## Evidence boundaries and recommended execution order

Confirmed historical successes: desktop Chrome smoke (`native_app/STATUS.md:42`), 3D transform and 2D movement regression (`:73`), and some numeric physics tests (`:87`). Confirmed historical failures: avatar strain and fit-related quantitative values (`:87`). Source-observed gaps: premeshed native adapter, disabled contact, explicitly unsupported native extended effects (`cloth_simulation.cpp:21-33`, `cloth_solver_step_extended.cpp:12-17`). Unverified: current working-tree acceptance status, all package-level flows, mesh refinement, persistence durability, calibrated material accuracy and native solver throughput. Prior QA may be stale relative to recent code.

Execution sequence: (1) freeze a measurable fit acceptance suite with sewn garments and real avatars; (2) integrate native meshing, seam compilation, body/self contact and strain/contact telemetry; (3) close numerical errors until benchmark tolerances pass; (4) validate UI controls against actual solver parameter sensitivity; (5) run packaged-app recovery, undo and endurance checks; (6) profile and optimize against fixed accuracy targets. Keep simulation quality gates independent of whether a browser/UI smoke test passes.

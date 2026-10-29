# EXO ClothCraft V2 — Revision-bound native production handoff

Date: 2026-10-18. Status: implementation and disposable regression tests passed. Not a manufacturer-approved export or physical fit certification. Production application and user's saved garment left untouched.

## Implemented

`integrations/clothcraft/exo-session.rs` and synchronized native mirror `research/oss/clothcraft/src/bin/exo-session.rs` now support a read-only `production-handoff` request with a required current `revision` value. It combines the *same-revision* Rust-authoritative authored template, simulated cloth vertex positions and UV, mesh triangles, panel and seam associations, metric pattern audit, and Rust closed allowance cutline/notch geometry proof in one response. It rejects stale revisions before work, uses no geometric state mutation and returns prominent `manufacturerReady:false`, `factoryApproved:false` in cutline proof, and release blockers for unvalidated industrial DXF/graded rules and physical fit/cutting. Bulky per-panel DXF/SVG source strings are deliberately excluded from this combined snapshot; the standalone read-only `production-cutlines` endpoint continues to expose those engineering proofs.

Fixed a native Rust authoring compilation blocker in `research/oss/clothcraft/src/authoring.rs` linked mirrored-free-curve split code by replacing an invalid captured mutable reference escape from a `FnMut` closure with a read-only owner lookup followed by one exclusive mutable lookup. Rust adapter test fixture was synchronized with current required `FreeCurvePoint.derivative` optional field. Both Rust source copies are byte-identical at test time.

## Executed proof

`node integrations/clothcraft/qa-v2-unified-handoff-20261018.mjs` -> **PASS**, on disposable localhost workspace and native worker. Path: open T-shirt, create 200x100 mm native rectangular panel, observe cutline blocked without seam allowances, reject invalid edge edit atomically, author allowances and notch, split boundary, check old/new references, query revision-bound handoff and compile 3D mesh, reject stale revision, Undo and Redo, grade to 220x110 mm, verify stable edge/notch/allowance identities and refreshed triangle/UV/vertex indices, Save and reopen. It verifies all four handoff artifacts carry same revision, are structurally aligned, and have `manufacturerReady:false`.

`CARGO_INCREMENTAL=0 ~/.cargo/bin/cargo build --manifest-path research/oss/clothcraft/Cargo.toml --no-default-features --offline --locked --bin exo-session` -> **PASS** after resolving source compiler error.

Focused cargo regressions **27 tests PASS**: `cutline_production` 11, `drafting_integration` 5, `free_curve_point_authoring` 2, `split_attachment_migration` 9. Source revision test gate, additional `node --test scripts/engineering/tests/exo-garment-document-gate.test.mjs` -> 9 pass in preceding run.

Production saved native garment checksum unchanged: `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160`. Local free space around 17 GiB at completion. App was not rebuilt or deployed to user's `~/Applications/EXO ClothCraft Studio V2.app`.

## Important boundaries / next milestone

- This is an atomic **read-only proof bundle** for one revision, not a certified factory DXF/AAMA/ASTM package. It does not claim fully modeled multi-size grading, physical material accuracy, cut marker nesting, drill marks, or printer calibration.
- Further work: take exact geometry and seam IDs into a typed revision-pinned multi-size production document, implement editable grade rules rather than single-panel affine scaling, validate independent DXF roundtrips on curved graded seams and factory notch semantics, and add realistic cloth/fit acceptance tests.
- Validate full packaging and isolated QA macOS window before any production promotion; maintain the user's existing state and rollback.

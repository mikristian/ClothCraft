# EXO Jarvis/Expansion remote Rust and shared garment reference gate

Date: 2026-10-18. This is a scoped engineering milestone, not a complete 2D/3D/factory unification release.

## Verified setup

- Jarvis at 100.82.90.101 has Cargo 1.99.1 and rustc 1.99.1 installed with RUSTUP_HOME and CARGO_HOME on physical `/Volumes/Expansion/EXO-Engineering/toolchains`. Confirmed `x86_64-apple-darwin` and downloaded Apple Silicon target `aarch64-apple-darwin` successfully.
- Staged EXO ClothCraft native Rust source, Cargo.lock, tests and assets on `/Volumes/Expansion/EXO-Engineering/build-sources/clothcraft`. `CARGO_TARGET_DIR=/Volumes/Expansion/EXO-Engineering/build-scratch/clothcraft-rust`, incremental compilation disabled.
- Launched actual `cargo test --no-default-features --locked --test split_attachment_migration` directly on Jarvis. Dependencies downloaded and compiler reached `Compiling marvelous-cloth v0.1.0`. Before completion, Jarvis Tailscale peer went offline (last seen ~1 minute at inspection) and SSH began timing out. **Final test exit result and finished arm64 binary remain unverified.** Do not promote anything into the user's installed EXO app.
- Added executable reusable script `scripts/engineering/exo-jarvis-rust-build.sh` supporting `test` and `build-arm64` modes; stages source, uses drive-local Cargo and target caches and verifies cross-build artifact SHA-256 on return. Syntax only confirmed while remote peer remained offline.

## First authoritative document handoff gate

New read-only CLI `scripts/engineering/exo-garment-document-gate.mjs` reads the real native `FittingProject.template` schema and checks panel IDs, edge/point counts, stable edge IDs, orphaned curve and notch and allowance links, interval ranges and strictly monotonic pairwise sewing correspondences. It emits a SHA-256 source revision and explicitly keeps `manufacturerApproved:false` and `fitCertified:false`.

The actual saved EXO native project passed with 2 panels, 8 seams, 0 issue diagnostics, source SHA-256 `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160`. A disposable modified copy with an orphaned sewing edge was properly blocked with nonzero exit status. No original garment file was changed.

## Required next implementation milestones

1. Restore Jarvis Tailscale/SSH connectivity and inspect the still-running Cargo process or logs. Repeat the native test until an explicit pass is captured.
2. Execute `scripts/engineering/exo-jarvis-rust-build.sh build-arm64`; verify `file` reports arm64, compare remote/local SHA-256 and exercise binary against disposable project, not production.
3. Extend the shared garment document gate with typed geometry, grading and manufactured cutline semantics from Rust; match legacy JS/C++ adapters through lossless fixtures. Block destructive export normalization instead of silently removing references.
4. Add end-to-end native 2D edit → save → 3D mesh refresh → cutting geometry → multi-size DXF/plot output tests and release gates. Do not equate passing source references with factory certification.

Storage: Blender Mac ~18–19 GiB free at inspection, physical Expansion ~2.4 TiB free. Preserve the user garment, original EXO app and existing dirty source modifications.

## Additional deterministic validation

Added `scripts/engineering/tests/exo-garment-document-gate.test.mjs` using disposable temporary native document fixtures. Nine checks pass, including valid document acceptance and fail-closed rejection of duplicate panel/seam IDs, edge count mismatch, dangling curve/sewing references, inverted seam ranges, invalid notch depth, and nonmonotone sewing correspondence. This is structural referential validation, not a 3D solver or manufacturing tolerance certificate.

## Verified remote build completion after Jarvis reconnected

Jarvis Tailscale direct connectivity returned; `bash scripts/engineering/exo-jarvis-rust-build.sh test` ran Cargo on physically attached `/Volumes/Expansion` and completed **9 Rust `split_attachment_migration` tests: all passed, 0 failures** (1m17s, test executable on Expansion). Then `bash scripts/engineering/exo-jarvis-rust-build.sh build-arm64` completed a full `--no-default-features --target aarch64-apple-darwin --bin exo-session` cross-build (2m50s), copied the candidate to `.exo-build-scratch/return-check/exo-session-arm64-candidate`, and confirmed remote/local SHA-256 `2299282458fc6f8b77bb4ec35977efdb7aefa815b3b049b056c6c0fec06fc5fd`. `file` confirms Mach-O arm64. Tested the actual transferred binary via `node scripts/engineering/tests/exo-arm64-candidate-api-test.mjs` with disposable localhost API/output; pattern `front:neck-left` split from 14 to 15 points, Save, Undo and Redo all passed. The existing saved garment SHA-256 remained unchanged at `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160`.

**Current deployment boundary:** The cross-compiled binary is a QA candidate in local scratch, **not installed into the production EXO app**. The executable transfer and basic native editing are proven, but the unified industrial 2D→3D→grading→factory document pipeline remains unfinished and cannot be represented as manufacturer-ready. Full Rust physics and all factory regression suites should run against this candidate before production promotion.

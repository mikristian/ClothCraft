# Expansion same-source CPU / Metal GPU comparison attempt

Status: **inconclusive — no completed matched executable or matched CPU/Metal run**.

The source snapshot was staged via the existing SSH identity pattern from `scripts/engineering/exo-jarvis-rust-build.sh` in a new unique directory:

`/Volumes/Expansion/EXO-Engineering/physics-lab-20261018T202608Z-9C002EFF/`

Its `source/` contains `Cargo.toml`, `Cargo.lock`, `src/`, `assets/` copied from the local current `research/oss/clothcraft` source at execution time. Its independent `target/` was the only Rust build output. Existing remote build trees and the installed EXO application were left unchanged.

Jarvis reported `uname -m`: **x86_64**. Its isolated Expansion toolchain has the `aarch64-apple-darwin` Rust standard library installed, so cross-compilation can be attempted, but an arm64 Mach-O cannot execute directly on this x86_64 machine. A same-arm64-executable CPU versus Metal GPU test on Jarvis is therefore not runnable even if compilation succeeds. No CPU/GPU timings or performance ratio from mismatched executables are comparable.

Arm64 cross-build command, with `RUSTUP_HOME` and `CARGO_HOME` bound to the existing Expansion toolchain and `CARGO_TARGET_DIR` bound exclusively to this run's `target/`:

`cargo +stable build --locked --features desktop --target aarch64-apple-darwin --bin exo-session`

Initial offline attempt exited 101: `failed to download accesskit v0.24.1` / `attempting to make an HTTP request, but --offline was specified`. A bounded online retry downloaded the missing Cargo crates and entered compilation; it was interrupted (SIGINT to this run's Cargo PID 46664) before completing because arm64 cannot run on the x86_64 Jarvis host.

Following prime-agent direction, a **native x86_64** offline build was also attempted from the exact same staged source, separately using `CARGO_TARGET_DIR=.../native-target`:

`cargo +stable build --locked --offline --features desktop --target x86_64-apple-darwin --bin exo-session`

The target had the required dependencies after the online download and compiled Rust crates including `wgpu`, `wgpu-hal`, and garment-engine dependencies. The native build had **not yet finished** when the prime requested closing out this task; only this run's Cargo process, PID 46900, was interrupted with SIGINT. Source, Cargo cache and both target directories are preserved. No compiled native `exo-session` was validated, so no matched CPU/Metal runtime metrics were recorded. A standalone reproducible runner is staged as `compare-native.py` in this run's directory; it records request wall time, native solver step time, GPU time if provided, seam geometry and input/executable hashes from one executable. Running it now would be premature.

To get valid same-source comparisons, run the single feature-enabled arm64 executable with the same avatar and T-shirt preset once without `--gpu` and once with `--gpu` on an **arm64 macOS Metal host**, recording Rust per-step `step_ms`, wall clock, time progression, vertex count, initial/final seam gaps, extension, contact counts and executable/avatar/source SHA-256. A few startup steps characterize initial assembly rather than steady-state throughput or fit equilibrium.

# EXO unified-engine engineering: Expansion tunnel build and safe offload

**Date:** 2026-10-18. **Status:** real remote x86_64 compile + local arm64 cross-target compile validated on production EXO drafting code, checksum-verified return transfer; separate WebDAV tunnel staging validated; historical snapshots already safely offloaded using checksum-verified tar/manifest. This is engineering infrastructure, not yet a full remote Rust 3D solver build.

## Two Expansion connections — do not confuse their abilities

1. Blender Mac `~/ExpansionCloud` is the mounted Expansion tunnel at `http://100.82.90.101:19080/` via **WebDAV, `noexec`**. Use this for read/write backup archives, source snapshots, manifests and compiled artifact transfer. Running or linking output directly from this mount is unsupported. On this client, `df -h` is also not a reliable representation of the remote drive's capacity.
2. The physical Seagate Expansion is on **Jarvis** at `/Volumes/Expansion` (exFAT), accessible through Tailscale SSH peer `jarvismikristian@100.82.90.101` and existing `~/.ssh/jarvis_os_bridge_ed25519` key. Jarvis is x86_64, has Apple clang, and can **compile and execute directly on Expansion**; verified with EXO's native C++ drafting split tests. Direct remote disk inspection reported 3.6 TiB capacity and ~2.4 TiB free. Jarvis's internal disk had less than 1 GiB available, so keep scratch/assets on Expansion rather than copying toolchains to the internal disk.

## Verified remote build pipeline

Script `scripts/engineering/exo-jarvis-expansion-cad-build.sh` transfers only selected EXO `native_cpp/core` files and vendor header to Jarvis's Expansion `/EXO-Engineering/build-sources/portable-geometry`; compiles the real `drafting_split.cpp` and `drafting_precision.cpp` test on Jarvis with Apple clang x86_64; executes the native test on the remote drive; then cross-compiles **arm64-apple-macos13.0** on Jarvis, transfers the Mach-O binary to the Blender Mac via SSH, checks matching SHA-256, and runs the returned arm64 test locally. **Observed:** `native drafting split passed` both on Jarvis and the Blender Mac. Final repeatable script returned `EXO_REMOTE_EXPANSION_BUILD_PASS SHA256=f047400e7e1233ab7b1e9642774a83d1ea575575ddb37f02f562142ff52a9ab2`.

```
bash scripts/engineering/exo-jarvis-expansion-cad-build.sh
```

Script `scripts/engineering/exo-expansion-build.sh geometry` builds small Rust EXO geometry scalar libraries in isolated local scratch (Cargo supports `CARGO_TARGET_DIR`) and uploads a sha256-addressed artifact to the `~/ExpansionCloud/EXO-Engineering/artifacts/` tunnel, re-reads remote bytes, verifies the hash and saves a JSON manifest. **Observed:** `BUILD_AND_TUNNEL_READBACK_PASS` for geometry dylib 50,736 bytes, SHA-256 `2a973a78f8c7d7c356bd35532de1bfb71e05d86be3b811954064c8f2d5abc63f`. This path builds locally because Jarvis currently lacks a Rust/Cargo toolchain. It deliberately avoids attempting to run on the WebDAV mount.

```
bash scripts/engineering/exo-expansion-build.sh geometry
```

## Verified historical offload and local capacity recovered

`script/exo-expansion-offload.py` already exists as a safe archive+remote re-read+hash+source-status validator and was run by an existing offload task while this setup was performed. Its verified remote manifests at:

`~/ExpansionCloud/Safe_Offloads/2026-10-18_EXO_ClothCraft_Backup_Offload/`

- `project_oct17_web_snapshots_batch01.manifest.json`: 8 historical snapshots, ~2.65 GB originals, ~307 MB remote archive.
- `project_oct17_web_snapshots_batch02.manifest.json`: 26 historical snapshots, ~8.60 GB originals, ~326 MB remote archive.

Both declare `verified_by_remote_stream_sha256`; original snapshot dirs were released only after remote archive readback and source metadata check. **No active user project, current installed app, or app live workspace was offloaded.** Internally `integrations/clothcraft/output/app-backups` dropped from ~10 GB to ~2.2 GB in observed stages. The Blender Mac reported about 4.3 GiB free near start and ~18 GiB after these concurrent releases; disk usage changes may include other processes, so do not attribute every gigabyte uniquely to these two batches. Retain the archived manifests and do not delete final backup sets without a further explicit verified offload.

## Limitations and next engineering steps

- **Remote Rust:** Jarvis currently has no `cargo` or `rustc` available. Installing a Rust toolchain entirely on an executable supporting drive or provisioning a more appropriate APFS build volume is a separate engineering task. The remote exFAT is writable/executable for simple clang binaries, but full Rust/Cargo builds may require filesystem features/symlinks and careful toolchain management. Do not claim the whole Rust solver can build there yet.
- **Cross-architecture:** Jarvis runs Intel x86_64; target deployment Blender Mac is Apple Silicon arm64. Every remote-built deliverable needs explicit `arm64-apple-macos` target configuration and matching link dependencies. Do not copy x86_64-only binaries into the installed V2 app.
- **Canonical garment engine roadmap:** keep source revisioned in local workspace; stage a copy to Expansion; compile/test candidate engines off-device where toolchain permits; retrieve only hashed arm64/macOS artifacts and reports; run local 2D/3D and factory regression tests on disposable patterns; back up the installed app and saved user garment; then promote verified artifacts atomically. No production app binary was changed by this setup.
- **Next storage:** aim for 20–25 GiB local free headroom. If insufficient after completed snapshot offloads, target documented/regenerable Rust `target` cache after confirming no active builds and that cache contents can be reconstructed. Do not remove source, live simulation, installed executables or unclassified backups.

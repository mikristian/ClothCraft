#!/usr/bin/env bash
# Stage and build Rust ClothCraft on Jarvis's physically attached Expansion drive.
# Never installs an app or writes to saved garment projects. Produces versioned
# output artifacts only after remote test completion and SHA-256 roundtrip.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PEER="${EXO_JARVIS_PEER:-jarvismikristian@100.82.90.101}"
KEY="${EXO_JARVIS_KEY:-$HOME/.ssh/jarvis_os_bridge_ed25519}"
REMOTE="/Volumes/Expansion/EXO-Engineering"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=7 -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -i "$KEY")
SCP=(scp -q -o BatchMode=yes -o ConnectTimeout=7 -i "$KEY")
SRC="$ROOT/research/oss/clothcraft"
[ -s "$SRC/Cargo.toml" ] && [ -s "$SRC/Cargo.lock" ]
"${SSH[@]}" "$PEER" "mkdir -p '$REMOTE/build-sources/clothcraft' '$REMOTE/build-scratch/clothcraft-rust' '$REMOTE/artifacts' '$REMOTE/manifests'"
tar -czf - -C "$SRC" Cargo.toml Cargo.lock src tests assets | "${SSH[@]}" "$PEER" "cd '$REMOTE/build-sources/clothcraft' && tar -xzf -"
mode="${1:-test}"
case "$mode" in
  test) rust_action='test --no-default-features --locked --test split_attachment_migration' ;;
  build-arm64) rust_action='build --no-default-features --locked --target aarch64-apple-darwin --bin exo-session' ;;
  *) echo "Usage: bash $0 test|build-arm64" >&2; exit 2 ;;
esac
"${SSH[@]}" "$PEER" "export RUSTUP_HOME='$REMOTE/toolchains/rustup' CARGO_HOME='$REMOTE/toolchains/cargo' CARGO_TARGET_DIR='$REMOTE/build-scratch/clothcraft-rust' CARGO_INCREMENTAL=0; cd '$REMOTE/build-sources/clothcraft'; '$REMOTE/toolchains/cargo/bin/cargo' $rust_action"
if [ "$mode" = build-arm64 ]; then
  local_bin="$ROOT/.exo-build-scratch/return-check/exo-session-arm64-candidate"
  mkdir -p "$(dirname "$local_bin")"
  remote_bin="$REMOTE/build-scratch/clothcraft-rust/aarch64-apple-darwin/debug/exo-session"
  "${SCP[@]}" "$PEER:$remote_bin" "$local_bin"
  remote_sha="$("${SSH[@]}" "$PEER" "shasum -a 256 '$remote_bin'" | awk '{print $1}')"
  local_sha="$(shasum -a 256 "$local_bin" | awk '{print $1}')"
  [ "$remote_sha" = "$local_sha" ] || { echo 'Remote checksum mismatch' >&2; exit 3; }
  file "$local_bin"
  echo "REMOTE_ARM64_ARTIFACT_VERIFIED $local_sha $local_bin"
fi

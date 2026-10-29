#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
export EXO_DESKTOP_DEST="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"

# Fail BEFORE trying to save, stop or replace a live installed application.
# All Rust/Swift compiler intermediates are created on the local Mac volume;
# the noexec expansion WebDAV tunnel cannot supply compiler scratch space.
# A nearly full disk can make both pre-shutdown saves and builds fail. Do not
# take the user's working EXO app offline to discover that failure afterwards.
EXO_BUILD_FREE_KIB="$(/bin/df -Pk "$ROOT" | /usr/bin/awk 'END {print $4}')"
if [[ ! "$EXO_BUILD_FREE_KIB" =~ ^[0-9]+$ ]] || (( EXO_BUILD_FREE_KIB < 2097152 )); then
  echo "EXO_NATIVE_APP_BUILD_REFUSED_LOCAL_DISK_HEADROOM: require >=2GiB free BEFORE touching the installed app; have ${EXO_BUILD_FREE_KIB:-unknown} KiB" >&2
  exit 6
fi

# Fail before stopping a running installed app. The ignored live Rust source
# must never be silently replaced by the older tracked packaging adapter;
# the 3,030-line pinned V2 snapshot is authoritative for default packaging.
# Existing-source builds require an explicitly reviewed exact SHA-256.
node integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"

# Rebuilding a running .app can leave its previously launched localhost Node
# processes orphaned after an abrupt AppKit termination. Those stale services
# will then occupy 5385/5386 and make the new window look broken. Handle only
# processes whose executable AND script paths match this exact installed app.
if [[ -d "$EXO_DESKTOP_DEST" ]]; then
  for port in 5385 5386; do
    while read -r pid; do
      [[ "$pid" =~ ^[0-9]+$ ]] || continue
      cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      if [[ "$cmd" == *"EXO-ClothCraft-Studio-V2/Runtime/node "* && "$cmd" == *"$EXO_DESKTOP_DEST/Contents/Resources/integrations/clothcraft/"* ]]; then
        if [[ "$port" == 5385 ]]; then
          # Save the user's persistent Rust workspace before stopping services.
          curl -fsS --connect-timeout 2 --max-time 10 -X POST \
            -H 'Origin: http://127.0.0.1:5386' -H 'Content-Type: application/json' \
            --data '{"op":"pause"}' http://127.0.0.1:5385/workspace >/dev/null || true
          curl -fsS --connect-timeout 2 --max-time 10 -X POST \
            -H 'Origin: http://127.0.0.1:5386' -H 'Content-Type: application/json' \
            --data '{"op":"save"}' http://127.0.0.1:5385/workspace >/dev/null || true
          while read -r child; do
            [[ "$child" =~ ^[0-9]+$ ]] || continue
            childcmd="$(ps -p "$child" -o command= 2>/dev/null || true)"
            [[ "$childcmd" == "$EXO_DESKTOP_DEST/Contents/Resources/research/oss/clothcraft/target/debug/exo-session "* ]] && kill -TERM "$child" 2>/dev/null || true
          done < <(pgrep -P "$pid" || true)
        fi
        kill -TERM "$pid" 2>/dev/null || true
      fi
    done < <(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  done
  while read -r pid command; do
    if [[ "$command" == "$EXO_DESKTOP_DEST/Contents/MacOS/EXOClothCraft" ]]; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done < <(ps -axo pid=,command=)
  sleep 1
fi
export CARGO_HOME="$ROOT/research/runtime/clothcraft-rust-toolchain/cargo"
export RUSTUP_HOME="$ROOT/research/runtime/clothcraft-rust-toolchain/rustup"
export PATH="$CARGO_HOME/bin:/usr/local/bin:$PATH"
# Recheck source identity and disk immediately before the native build in case
# another worker edited the ignored checkout after the early no-shutdown gate.
node integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"
if [[ "${EXO_USE_EXISTING_EXO_SESSION_SOURCE:-0}" == 1 ]]; then
  # Explicitly reviewed exceptional source; never silently roll back grading.
  test -s research/oss/clothcraft/src/bin/exo-session.rs
  echo 'Building existing ClothCraft fork session source without overwriting it.'
else
  if [[ -e research/oss/clothcraft/src/bin/exo-session.rs ]] && \
     ! cmp -s integrations/clothcraft/exo-session-v2-authoritative-20261028.rs research/oss/clothcraft/src/bin/exo-session.rs; then
    echo 'Refusing to overwrite different local Rust session work in the ClothCraft checkout.' >&2
    echo 'Review src/bin/exo-session.rs and integrations/clothcraft/exo-session-v2-authoritative-20261028.rs before packaging.' >&2
    exit 1
  fi
  # The files were already compared. Do not write the live checkout at all:
  # preserving its inode, mtime and active editor state avoids a build race.
  echo 'Building verified pinned V2 native source; live checkout unchanged.'
fi
(cd research/oss/clothcraft && cargo build --locked -j 2 --bin exo-session)
# Build the small Rust metadata validator independently of the cloth solver.
cargo build --locked --offline --manifest-path integrations/clothcraft/rust-service/Cargo.toml --bin exo-metadata-validation
test -x integrations/clothcraft/rust-service/target/debug/exo-metadata-validation
cargo build --locked --offline --manifest-path integrations/clothcraft/rust-agent-api/Cargo.toml --bin exo-agent-validator
test -x integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator
cargo build --locked --offline --manifest-path integrations/clothcraft/rust-static-host/Cargo.toml --bin exo-rust-static-host
test -x integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host
# Swift explicitly requests GPU mode at every launch. A CPU-only engineering
# artifact must never be packaged into that release (it blanks both viewports).
node scripts/qa-exo-v2-desktop-gpu-binary.mjs
export EXO_DESKTOP_SWIFT_SOURCE=integrations/clothcraft/macos/EXOClothCraftWorkspaceV2.swift
export EXO_BUILD_BRIDGE_URL=http://127.0.0.1:5385
bash integrations/clothcraft/macos/build.sh
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.mikristian.exo.clothcraft.workspace.v2' "$EXO_DESKTOP_DEST/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleDisplayName EXO ClothCraft Studio V2' "$EXO_DESKTOP_DEST/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleShortVersionString 0.3.0' "$EXO_DESKTOP_DEST/Contents/Info.plist"
/usr/bin/codesign --force --deep --sign - "$EXO_DESKTOP_DEST"
/usr/bin/codesign --verify --deep --strict "$EXO_DESKTOP_DEST"

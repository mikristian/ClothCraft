#!/usr/bin/env bash
# Build an INTERNAL-TEST-ONLY DMG from the actual installed EXO ClothCraft V2.
# Do not publish this candidate: it is ad-hoc signed, not notarized, and has
# NOT completed an external license/provenance review or clean-Mac validation.
set -euo pipefail

SOURCE_APP="${EXO_STUDIO_V2_SOURCE_APP:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${EXO_RELEASE_OUTPUT:-$ROOT/release-artifacts}"
NAME="EXO-ClothCraft-Studio-V2-macOS-arm64-${EXO_RELEASE_LABEL:-LOCAL-TEST-UNNOTARIZED}"
DMG="$OUT/$NAME.dmg"

[[ -d "$SOURCE_APP" && -x "$SOURCE_APP/Contents/MacOS/EXOClothCraft" ]] || {
  echo "Not a full EXO ClothCraft V2 .app: $SOURCE_APP" >&2; exit 1;
}
[[ -s "$SOURCE_APP/Contents/Resources/web/index.html" ]] || {
  echo 'Missing offline EXO V2 web UI' >&2; exit 1;
}
[[ -x "$SOURCE_APP/Contents/Resources/bin/node" ]] || {
  echo 'Missing embedded Node runtime' >&2; exit 1;
}
[[ -x "$SOURCE_APP/Contents/Resources/research/oss/clothcraft/target/debug/exo-session" ]] || {
  echo 'Missing embedded Rust workspace runtime' >&2; exit 1;
}
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$SOURCE_APP/Contents/Info.plist")" == 'com.mikristian.exo.clothcraft.workspace.v2' ]] || {
  echo 'Wrong app identifier, refusing to package a preview app as EXO V2' >&2; exit 1;
}
[[ "$(uname -m)" == 'arm64' ]] || { echo 'Current installed EXO V2 supports arm64 only' >&2; exit 1; }
mkdir -p "$OUT"
[[ ! -e "$DMG" && ! -e "$DMG.sha256" ]] || {
  echo "Refusing to overwrite release candidate $DMG" >&2; exit 1;
}

ROOT_VOLUME="$(df -Pk "$OUT" | awk 'END {print $4}')"
APP_KIB="$(du -sk "$SOURCE_APP" | awk '{print $1}')"
# 1 app copy + at most 1 app-size DMG + extra free working space.
(( ROOT_VOLUME >= APP_KIB * 2 + 262144 )) || {
  echo "Not enough space for release staging and image; output needs >=$((APP_KIB * 2 + 262144)) KiB free" >&2
  exit 1
}

STAGE="$(mktemp -d "$OUT/.exo-v2-stage.XXXXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
APP="$STAGE/EXO ClothCraft Studio V2.app"
# macOS APFS clone-on-write avoids making a destructive copy of the user's
# running app. On a non-APFS volume, falls back to ordinary copying.
if ! cp -cR "$SOURCE_APP" "$APP" 2>/dev/null; then
  cp -R "$SOURCE_APP" "$APP"
fi
RES="$APP/Contents/Resources"

# The in-use personal app can predate code in the Rust-hosted desktop launcher.
# The standalone candidate must carry the real local Rust executables and
# their corresponding adapter files, rather than inheriting the user's running
# background services. Never fetch binaries from the network or silently use
# developer-only absolute paths.
for spec in \
  'rust-static-host:exo-rust-static-host' \
  'rust-service:exo-metadata-validation' \
  'rust-agent-api:exo-agent-validator'; do
  crate="${spec%%:*}"
  binary="${spec#*:}"
  source="$ROOT/integrations/clothcraft/$crate/target/debug/$binary"
  dest="$RES/integrations/clothcraft/$crate/target/debug/$binary"
  [[ -x "$source" ]] || { echo "Missing compiled $binary; cannot build portable full EXO V2" >&2; exit 1; }
  /usr/bin/file "$source" | grep -q 'Mach-O 64-bit executable arm64' || {
    echo "Rust dependency is not a macOS arm64 executable: $source" >&2; exit 1;
  }
  mkdir -p "$(dirname "$dest")"
  cp "$source" "$dest"
  chmod 755 "$dest"
done
for spec in \
  'rust-service/validator-client.mjs' \
  'rust-agent-api/client.mjs'; do
  source="$ROOT/integrations/clothcraft/$spec"
  dest="$RES/integrations/clothcraft/$spec"
  [[ -s "$source" ]] || { echo "Missing local adapter $source" >&2; exit 1; }
  mkdir -p "$(dirname "$dest")"
  cp "$source" "$dest"
done

# App desktop Node code can import additional first-party modules
# (for example agent-key-store and Seamly2D adapters) that older personal
# builds did not copy. Derive the transitive local ESM closure instead of
# silently shipping a UI that starts with ERR_MODULE_NOT_FOUND.
python3 "$ROOT/scripts/release/stage-desktop-node-module-closure.py" "$APP"

# Private/personal avatar exports and derivative research media must not leave
# this machine as if they were cleared public release assets. Remove only from
# the isolated copy, never from SOURCE_APP.
# The conservative beta build also omits unreviewed visuals, materials and
# MediaPipe model weights. Those optional features may have missing previews;
# they are *not* claimed as supported until their licenses are documented.
rm -rf "$RES/web/clo-hardware-converted" "$RES/web/audit-evidence" \
  "$RES/web/stage-scenes" "$RES/web/hardware-premium" "$RES/web/library-3d" \
  "$RES/web/fabric-scans" "$RES/web/fabric-scans-ambientcg" \
  "$RES/web/hand-tracking" "$RES/web/stage-posters" "$RES/web/hangers" \
  "$RES/web/hardware-thumbnails" "$RES/web/garment-previews" \
  "$RES/web/avatars/opensew"
find "$RES" -depth -type f \( -iname '*thomas*' -o -iname '*theo*' -o -iname '*nora*' \
  -o -iname '*.pem' -o -iname '*.key' -o -iname '*.p12' -o -iname '*.pfx' \
  -o -iname '*.safetensors' -o -iname '*.onnx' -o -iname '*.pt' -o -iname '*.pth' \) \
  -delete
if find "$RES" -type f \( -iname '*thomas*' -o -iname '*theo*' -o -iname '*nora*' \
  -o -iname '*.pem' -o -iname '*.key' -o -iname '*.p12' -o -iname '*.pfx' \) \
  -print -quit | grep -q .; then
  echo 'Restricted assets still present in staged EXO V2; refusing DMG' >&2
  exit 1
fi
[[ -s "$RES/web/index.html" && -x "$RES/bin/node" \
   && -x "$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host" \
   && -x "$RES/integrations/clothcraft/rust-service/target/debug/exo-metadata-validation" \
   && -x "$RES/integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator" ]] || {
  echo 'Public filtering damaged the launch/runtime prerequisites' >&2; exit 1;
}

# Exact-version Node runtime license and included third-party notices are
# required for the redistribution of the bundled official Node executable.
node_version="$("$RES/bin/node" --version)"
[[ "$node_version" == 'v24.13.1' ]] || {
  echo "Bundled Node version changed ($node_version); obtain matching official license before staging" >&2
  exit 1
}
notice="$ROOT/scripts/release/licenses/Node-v24.13.1-LICENSE.txt"
[[ -s "$notice" ]] || { echo 'Missing exact-version Node license notice' >&2; exit 1; }
mkdir -p "$RES/licenses"
cp "$notice" "$RES/licenses/Node-v24.13.1-LICENSE.txt"
cp "$ROOT/LICENSE" "$RES/licenses/EXO-GPL-3.0-only.txt"
cp "$ROOT/public/avatars/MAKEHUMAN-LICENSE.ASSETS.md" "$RES/licenses/MakeHuman-CC0-1.0.txt"

# The engineering build carries absolute developer home paths in Rust/Swift
# debug information. Such paths must never be exported in a public binary.
# Strip ONLY the release COPY's local first-party executables; never modify
# the user's installed .app or the bundled, upstream-signed Node executable.
for binary in \
  "$APP/Contents/MacOS/EXOClothCraft" \
  "$RES/native_cpp/build-cmake/garment_cad_cli" \
  "$RES/research/oss/clothcraft/target/debug/cloth-template" \
  "$RES/research/oss/clothcraft/target/debug/cloth-fit" \
  "$RES/research/oss/clothcraft/target/debug/exo-session" \
  "$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host" \
  "$RES/integrations/clothcraft/rust-service/target/debug/exo-metadata-validation" \
  "$RES/integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator"; do
  [[ -x "$binary" ]] || { echo "Missing release executable: $binary" >&2; exit 1; }
  /usr/bin/strip -S -x "$binary"
done
# Rust panic/debug metadata in older engineering executables can contain the
# original absolute source checkout path even after Mach-O symbols are stripped.
# Redact *only equal-length source-path literals* in isolated first-party
# engineering binaries. This is a LOCAL TEST mitigation, not a substitute for
# a reproducible clean public release build using --remap-path-prefix.
python3 - "$HOME/" \
  "$RES/research/oss/clothcraft/target/debug/cloth-template" \
  "$RES/research/oss/clothcraft/target/debug/cloth-fit" \
  "$RES/research/oss/clothcraft/target/debug/exo-session" \
  "$RES/integrations/clothcraft/rust-service/target/debug/exo-metadata-validation" \
  "$RES/integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator" <<'PY'
from pathlib import Path
import sys
original = sys.argv[1].encode()
replacement_prefix = b'/exo/release/'
if len(replacement_prefix) > len(original):
    raise SystemExit('Cannot redact source path without changing binary size')
replacement = replacement_prefix + b'_' * (len(original) - len(replacement_prefix))
for filename in sys.argv[2:]:
    path = Path(filename)
    data = path.read_bytes()
    if original in data:
        path.write_bytes(data.replace(original,replacement))
        path.chmod(0o755)
PY
# Apple Silicon enforces Mach-O code signatures even for ad-hoc test builds.
# Editing a binary after signing invalidates its signature and will cause the
# Rust workspace child to be killed on launch. Sign every modified executable
# in the isolated stage BEFORE signing the enclosing app.
for binary in \
  "$APP/Contents/MacOS/EXOClothCraft" \
  "$RES/native_cpp/build-cmake/garment_cad_cli" \
  "$RES/research/oss/clothcraft/target/debug/cloth-template" \
  "$RES/research/oss/clothcraft/target/debug/cloth-fit" \
  "$RES/research/oss/clothcraft/target/debug/exo-session" \
  "$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host" \
  "$RES/integrations/clothcraft/rust-service/target/debug/exo-metadata-validation" \
  "$RES/integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator"; do
  /usr/bin/codesign --force --sign - "$binary"
  /usr/bin/codesign --verify --strict "$binary"
done
if command -v rg >/dev/null 2>&1 && \
   rg -a -l --no-messages -F "$HOME/" "$APP/Contents" | grep -q .; then
  echo 'Personal developer home path remains in staged EXO V2; refusing DMG' >&2
  rg -a -l --no-messages -F "$HOME/" "$APP/Contents" | sed "s|$APP/||" | head -20 >&2 || true
  exit 1
fi

# The input .app's signature is invalidated by filtering; re-sign ONLY the copy.
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
/usr/bin/plutil -lint "$APP/Contents/Info.plist"

ln -s /Applications "$STAGE/Applications"
hdiutil create -volname 'EXO ClothCraft Studio V2 LOCAL TEST' \
  -srcfolder "$STAGE" -format UDZO "$DMG"
(cd "$OUT" && shasum -a 256 "$(basename "$DMG")" > "$(basename "$DMG").sha256")
echo "Local-only, UNNOTARIZED EXO V2 DMG: $DMG"
echo 'DO NOT PUBLISH YET: source/asset rights review and clean-Mac app launch QA remain required.'
echo 'Developer ID/notarization are OPTIONAL for a clearly labeled unnotarized beta; macOS may require manual Open Anyway approval.'

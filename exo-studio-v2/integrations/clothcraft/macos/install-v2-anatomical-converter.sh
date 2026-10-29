#!/bin/bash
# Install a QA-tested anatomical ClothCraft converter while preserving the
# current native Rust session, saved projects and the previous executable.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
EXPECTED='com.mikristian.exo.clothcraft.workspace.v2'
IDENTIFIER=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)
[[ "$IDENTIFIER" == "$EXPECTED" ]] || { echo 'Unexpected target app identity' >&2; exit 1; }
SOURCE="$ROOT/native_cpp/build-placement-qa/garment_cad_cli"
TARGET="$APP/Contents/Resources/native_cpp/build-cmake/garment_cad_cli"
[[ -x "$SOURCE" && -x "$TARGET" ]] || { echo 'QA converter or installed converter missing' >&2; exit 1; }
cd "$ROOT"
GARMENT_CPP_CLI="$SOURCE" node scripts/check-native-cpp-clothcraft-anatomical-placement.mjs
GARMENT_CPP_CLI="$SOURCE" node scripts/check-native-pattern-export-preparation-20261018.mjs
BACKUP_ROOT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
mkdir -p "$BACKUP_ROOT"
BACKUP="$(mktemp -d "$BACKUP_ROOT/anatomical-converter-XXXXXXXX")"
cp -p "$TARGET" "$BACKUP/garment_cad_cli"
STAGED="$(mktemp "$TARGET.stage-XXXXXXXX")"
trap 'rm -f "$STAGED"' EXIT
cp "$SOURCE" "$STAGED"
chmod +x "$STAGED"
mv "$STAGED" "$TARGET"
if ! /usr/bin/codesign --force --deep --sign - "$APP" || ! /usr/bin/codesign --verify --deep --strict "$APP"; then
  cp -p "$BACKUP/garment_cad_cli" "$TARGET"
  /usr/bin/codesign --force --deep --sign - "$APP" || true
  echo 'Signature verification failed: original installed converter restored' >&2
  exit 1
fi
echo "PASS installed anatomical exporter into EXO ClothCraft Studio V2; rollback executable: $BACKUP/garment_cad_cli"

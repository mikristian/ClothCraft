#!/bin/bash
# Small signed update for the installed EXO ClothCraft V2. Never modifies user
# projects or clears an existing Rust target/cache directory.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$HOME/Applications/EXO ClothCraft Studio V2.app"
RES="$APP/Contents/Resources"
WEB="$RES/web"
BACKUPS="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
NATIVE_SOURCE="$ROOT/research/oss/clothcraft/target/debug/exo-session"
NATIVE_DEST="$RES/research/oss/clothcraft/target/debug/exo-session"
NODE_SOURCE="$ROOT/integrations/clothcraft/workspace.mjs"
NODE_DEST="$RES/integrations/clothcraft/workspace.mjs"

[[ -x "$NATIVE_SOURCE" && -x "$NATIVE_DEST" && -s "$NODE_SOURCE" &&
   -s "$NODE_DEST" && -s "$ROOT/dist/index.html" && -s "$WEB/index.html" ]] || {
  echo "Incomplete staged native app files; nothing installed." >&2; exit 1;
}
[[ -s "$ROOT/dist/cursors/cad-anchor-convert.svg" ]] || {
  echo "Required 2D Anchor Point cursor is missing" >&2; exit 1;
}
grep -rlqF 'http://127.0.0.1:5385' "$ROOT/dist/assets" || {
  echo "V2 production JS missing local port 5385" >&2; exit 1;
}
[[ "$(uname -m)" == 'arm64' ]] && file "$NATIVE_SOURCE" | grep -q 'arm64' || {
  echo "Refusing architecture-mismatched physical sewing binary" >&2; exit 1;
}
grep -aFq 'Tuck requires two interior edge stations' "$NATIVE_SOURCE" || {
  echo "Compiled Rust binary lacks TuckFoldSew; refusing UI-only install" >&2; exit 1;
}

mkdir -p "$BACKUPS"
BACKUP="$(mktemp -d "$BACKUPS/physical-pleat-native-XXXXXXXX")"
cp -p "$NATIVE_DEST" "$BACKUP/exo-session"
cp -p "$NODE_DEST" "$BACKUP/workspace.mjs"
cp -p "$WEB/index.html" "$BACKUP/index.html"
CURSOR="$WEB/cursors/cad-anchor-convert.svg"
[[ ! -e "$CURSOR" ]] || cp -p "$CURSOR" "$BACKUP/cad-anchor-convert.svg"
status=1
rollback(){
  if [[ "$status" != 0 ]]; then
    echo "Restoring prior native solver, bridge and web entrypoint" >&2
    cp -p "$BACKUP/exo-session" "$NATIVE_DEST" || true
    cp -p "$BACKUP/workspace.mjs" "$NODE_DEST" || true
    cp -p "$BACKUP/index.html" "$WEB/index.html" || true
    if [[ -f "$BACKUP/cad-anchor-convert.svg" ]]; then
      cp -p "$BACKUP/cad-anchor-convert.svg" "$CURSOR" || true
    fi
    /usr/bin/codesign --force --deep --sign - "$APP" || true
  fi
}
trap rollback EXIT
cp -p "$NATIVE_SOURCE" "$NATIVE_DEST.new-$$"
mv -f "$NATIVE_DEST.new-$$" "$NATIVE_DEST"
cp -p "$NODE_SOURCE" "$NODE_DEST.new-$$"
mv -f "$NODE_DEST.new-$$" "$NODE_DEST"
cp -R "$ROOT/dist/assets/." "$WEB/assets/"
mkdir -p "$WEB/cursors"
cp -p "$ROOT/dist/cursors/cad-anchor-convert.svg" "$CURSOR"
cp "$ROOT/dist/index.html" "$WEB/.physical-pleat-index-$$"
mv -f "$WEB/.physical-pleat-index-$$" "$WEB/index.html"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
cmp "$NATIVE_SOURCE" "$NATIVE_DEST"
cmp "$NODE_SOURCE" "$NODE_DEST"
cmp "$ROOT/dist/index.html" "$WEB/index.html"
status=0
echo "PASS: signed native Rust tuck, local Node bridge and new 2D UI installed"
echo "BACKUP: $BACKUP"

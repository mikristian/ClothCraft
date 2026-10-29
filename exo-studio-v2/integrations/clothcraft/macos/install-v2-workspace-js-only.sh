#!/bin/bash
# Update only V2's native Node workspace request handler. Preserve the signed
# Rust/Swift executables, user project and support directory. A restart loads
# this file; running sessions are never terminated by this installer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
EXPECTED='com.mikristian.exo.clothcraft.workspace.v2'
ACTUAL=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)
SRC="$ROOT/integrations/clothcraft/workspace.mjs"
DST="$APP/Contents/Resources/integrations/clothcraft/workspace.mjs"
BIN="$APP/Contents/Resources/research/oss/clothcraft/target/debug/exo-session"
if [[ "$ACTUAL" != "$EXPECTED" || ! -x "$APP/Contents/MacOS/EXOClothCraft" || ! -x "$BIN" || ! -s "$DST" ]];then
  echo 'Refusing update: installed EXO V2 identity or native resources missing' >&2
  exit 1
fi
node --check "$SRC"
BACKUP_NAME="${EXO_NATIVE_BACKUP_NAME:-EXO-V2-workspace-before-native-fabric-appearance-20261017}"
if [[ ! "$BACKUP_NAME" =~ ^[A-Za-z0-9._-]+$ ]];then
  echo 'Refusing invalid native workspace backup name' >&2
  exit 1
fi
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/$BACKUP_NAME"
mkdir -p "$BACKUP"
if [[ ! -e "$BACKUP/workspace.mjs" ]];then
  cp -p "$DST" "$BACKUP/workspace.mjs"
fi
TMP="$DST.update.$$.mjs"
trap 'rm -f "$TMP"' EXIT
cp -p "$SRC" "$TMP"
node --check "$TMP"
mv -f "$TMP" "$DST"
if ! /usr/bin/codesign --force --deep --sign - "$APP" ||
   ! /usr/bin/codesign --verify --deep --strict "$APP";then
  echo 'Native workspace signature check failed; restoring prior handler' >&2
  cp -p "$BACKUP/workspace.mjs" "$DST"
  /usr/bin/codesign --force --deep --sign - "$APP" || true
  exit 1
fi
echo "Updated and signed EXO V2 Node workspace handler; previous file: $BACKUP/workspace.mjs"
echo 'Running EXO V2 can continue uninterrupted. Restart the application to activate updated handler.'

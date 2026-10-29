#!/bin/bash
# Install the original signed Seamly2D application as a separate local tool,
# then update only the V2 Node bridge. Keep the current garment/native backend.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
RES="$APP/Contents/Resources"
DEST="$RES/integrations/clothcraft"
TOOLS="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Tools"
SEAMLY_SRC="$ROOT/research/oss/pattern-cad/runtime/Seamly2D.app"
SEAMLY_DEST="$TOOLS/Seamly2D.app"
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/seamly2d-native-v2-$(date +%Y%m%d-%H%M%S)"
EXPECTED='com.mikristian.exo.clothcraft.workspace.v2'

[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)" == "$EXPECTED" ]] || { echo 'EXO V2 app identity mismatch' >&2; exit 1; }
[[ -s "$DEST/server.mjs" && -s "$ROOT/integrations/clothcraft/seamly2dEngineRoute20261023.bundle.mjs" ]] || { echo 'Bundled integration unavailable' >&2; exit 1; }
[[ -s "$ROOT/integrations/clothcraft/pattern-intelligence-catalog.mjs" ]] || { echo 'Catalog dependency unavailable' >&2; exit 1; }
[[ -x "$SEAMLY_SRC/Contents/MacOS/Seamly2D" ]] || { echo 'Original Seamly2D engine missing' >&2; exit 1; }
/usr/bin/codesign --verify --deep --strict "$APP"
/usr/bin/codesign --verify --deep --strict "$SEAMLY_SRC"
node --check "$ROOT/integrations/clothcraft/server.mjs"
node --check "$ROOT/integrations/clothcraft/seamly2dEngineRoute20261023.bundle.mjs"

mkdir -p "$BACKUP" "$TOOLS"
cp -p "$DEST/server.mjs" "$BACKUP/server.mjs"
if [[ -f "$DEST/seamly2dEngineRoute20261023.mjs" ]];then
  cp -p "$DEST/seamly2dEngineRoute20261023.mjs" "$BACKUP/seamly2dEngineRoute20261023.mjs"
fi
if [[ -f "$DEST/pattern-intelligence-catalog.mjs" ]];then
  cp -p "$DEST/pattern-intelligence-catalog.mjs" "$BACKUP/pattern-intelligence-catalog.mjs"
fi
# Standalone upstream app keeps its original signed vendor bundle and GPL license.
if [[ ! -d "$SEAMLY_DEST" ]];then
  /usr/bin/ditto "$SEAMLY_SRC" "$SEAMLY_DEST"
fi
/usr/bin/codesign --verify --deep --strict "$SEAMLY_DEST"
cp -p "$ROOT/research/oss/pattern-cad/Seamly2D/LICENSE.md" "$TOOLS/Seamly2D-GPL-LICENSE.md"

installed=false
rollback(){
  if [[ "$installed" == true ]];then
    cp -p "$BACKUP/server.mjs" "$DEST/server.mjs" || true
    if [[ -s "$BACKUP/seamly2dEngineRoute20261023.mjs" ]];then
      cp -p "$BACKUP/seamly2dEngineRoute20261023.mjs" "$DEST/seamly2dEngineRoute20261023.mjs" || true
    fi
    if [[ -s "$BACKUP/pattern-intelligence-catalog.mjs" ]];then
      cp -p "$BACKUP/pattern-intelligence-catalog.mjs" "$DEST/pattern-intelligence-catalog.mjs" || true
    fi
    /usr/bin/codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
    echo 'Restored prior signed EXO native bridge' >&2
  fi
}
trap rollback EXIT
installed=true
cp -p "$ROOT/integrations/clothcraft/server.mjs" "$DEST/server.mjs"
cp -p "$ROOT/integrations/clothcraft/seamly2dEngineRoute20261023.bundle.mjs" "$DEST/seamly2dEngineRoute20261023.mjs"
cp -p "$ROOT/integrations/clothcraft/pattern-intelligence-catalog.mjs" "$DEST/pattern-intelligence-catalog.mjs"
node --check "$DEST/server.mjs"
node --check "$DEST/seamly2dEngineRoute20261023.mjs"
node --check "$DEST/pattern-intelligence-catalog.mjs"
/usr/bin/codesign --force --deep --sign - "$APP" >/dev/null
/usr/bin/codesign --verify --deep --strict "$APP"
installed=false
trap - EXIT
echo 'Installed Seamly2D original calculation bridge in signed EXO V2 application.'
echo "Native bridge backup: $BACKUP"
echo 'Restart EXO V2 to activate the new API route.'

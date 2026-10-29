#!/bin/bash
# Rebuild the EXISTING QA bundle in place, with isolated identity, ports and
# support directories. Never copies its large resources or opens production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$HOME/Applications/EXO ClothCraft Studio V2 QA.app"
RES="$APP/Contents/Resources"
SWIFT="$ROOT/integrations/clothcraft/macos/EXOClothCraftWorkspaceV2.swift"
STAGING="$(mktemp -d /tmp/exo-qa-swift-XXXXXXXX)"
trap 'rm -rf "$STAGING"' EXIT
test -s "$SWIFT"
test -x "$APP/Contents/MacOS/EXOClothCraft"
test -s "$RES/web/index.html"
CURRENT_ID="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Contents/Info.plist")"
case "$CURRENT_ID" in
  com.mikristian.exo.clothcraft.workspace.v2|com.mikristian.exo.clothcraft.workspace.v2.qa) ;;
  *) echo "Unexpected QA application bundle ID: $CURRENT_ID" >&2; exit 1 ;;
esac
python3 - "$SWIFT" "$STAGING/EXOClothCraftQA.swift" <<'PY'
import pathlib,sys
src=pathlib.Path(sys.argv[1]).read_text()
for old,new in [('5385','5485'),('5386','5486'),('EXO-ClothCraft-Studio-V2','EXO-ClothCraft-Studio-V2-QA'),('EXO ClothCraft Studio V2','EXO ClothCraft Studio V2 QA')]:
    src=src.replace(old,new)
pathlib.Path(sys.argv[2]).write_text(src)
PY
xcrun swiftc -parse-as-library -O -target arm64-apple-macos13.0 -framework AppKit -framework WebKit "$STAGING/EXOClothCraftQA.swift" -o "$STAGING/EXOClothCraft"
test -s "$STAGING/EXOClothCraft"
# The shipped frontend embeds bridge URLs, and shipped server embeds its
# allowed origins. Edit QA bundle resources only; each replacement is 1:1.
python3 - "$RES" <<'PY'
from pathlib import Path
import sys
res=Path(sys.argv[1])
targets=list((res/'web/assets').glob('*.js'))+[res/'integrations/clothcraft/server.mjs']
for path in targets:
    data=path.read_bytes()
    replaced=data.replace(b'127.0.0.1:5385',b'127.0.0.1:5485').replace(b'127.0.0.1:5386',b'127.0.0.1:5486').replace(b'localhost:5386',b'localhost:5486')
    if replaced!=data: path.write_bytes(replaced)
PY
cp "$STAGING/EXOClothCraft" "$APP/Contents/MacOS/EXOClothCraft"
cp "$ROOT/integrations/clothcraft/agent-key-store.mjs" "$RES/integrations/clothcraft/agent-key-store.mjs"
cp "$ROOT/integrations/clothcraft/collaboration.mjs" "$RES/integrations/clothcraft/collaboration.mjs"
cp "$ROOT/integrations/clothcraft/apple-vision-hand.mjs" "$RES/integrations/clothcraft/apple-vision-hand.mjs"
/usr/libexec/PlistBuddy -c 'Set CFBundleIdentifier com.mikristian.exo.clothcraft.workspace.v2.qa' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set CFBundleName EXO ClothCraft Studio V2 QA' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set CFBundleDisplayName EXO ClothCraft Studio V2 QA' "$APP/Contents/Info.plist"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
echo "Isolated existing QA app in place: $APP"

#!/bin/bash
# Upgrade only V2's AppKit WebKit camera permissions. Never restart the app or
# replace the user's running fabric session while updating the signed bundle.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
PLIST="$APP/Contents/Info.plist"
HOST="$APP/Contents/MacOS/EXOClothCraft"
IDENTIFIER=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST" 2>/dev/null || true)
[[ "$IDENTIFIER" == 'com.mikristian.exo.clothcraft.workspace.v2' && -x "$HOST" ]] || {
  echo 'Cannot identify the installed V2 native app' >&2; exit 1;
}
BACKUPS="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
mkdir -p "$BACKUPS"
BACKUP="$(mktemp -d "$BACKUPS/camera-webkit-before-XXXXXXXX")"
cp -p "$HOST" "$BACKUP/EXOClothCraft"
cp -p "$PLIST" "$BACKUP/Info.plist"
STAGED="$(mktemp "$BACKUP/.host-XXXXXXXX")"
rollback(){
  cp -p "$BACKUP/EXOClothCraft" "$HOST"
  cp -p "$BACKUP/Info.plist" "$PLIST"
  /usr/bin/codesign --force --deep --sign - "$APP" || true
}
if ! swiftc -parse-as-library -O -target arm64-apple-macos13.0 -framework AppKit -framework WebKit \
    "$ROOT/integrations/clothcraft/macos/EXOClothCraftWorkspaceV2.swift" -o "$STAGED"; then
  echo 'Native camera host could not be compiled; app unchanged' >&2; exit 1
fi
chmod +x "$STAGED"
cp -p "$STAGED" "$HOST"
DESCRIPTION='Camera Fabric Hand uses your camera locally to track pinch gestures and move simulated cloth. Camera video is not saved.'
if /usr/libexec/PlistBuddy -c 'Print :NSCameraUsageDescription' "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription $DESCRIPTION" "$PLIST"
else
  /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string $DESCRIPTION" "$PLIST"
fi
if ! /usr/bin/plutil -lint "$PLIST" || \
   ! /usr/bin/codesign --force --deep --sign - "$APP" || \
   ! /usr/bin/codesign --verify --deep --strict "$APP"; then
  rollback
  echo 'Native camera signing failed; previous host restored' >&2
  exit 1
fi
echo "PASS installed V2 camera permission host; rollback backup: $BACKUP"
echo 'Relaunch V2 to activate camera permission. No garment, solver or active workspace was touched.'

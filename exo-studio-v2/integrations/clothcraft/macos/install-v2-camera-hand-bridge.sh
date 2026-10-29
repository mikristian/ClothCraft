#!/bin/bash
# Install on-device Apple Vision tracker and localhost Node endpoint into the
# signed V2 app. Preserve the running Rust worker and saved garment project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
IDENTITY=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)
[[ "$IDENTITY" == 'com.mikristian.exo.clothcraft.workspace.v2' ]] || { echo 'Wrong installed V2 app identity' >&2; exit 1; }
ROOT_SRC="$ROOT/integrations/clothcraft"
ROOT_DST="$APP/Contents/Resources/integrations/clothcraft"
BACKUP_ROOT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
mkdir -p "$BACKUP_ROOT"
BACKUP="$(mktemp -d "$BACKUP_ROOT/camera-hand-bridge-XXXXXXXX")"
swiftc -O "$ROOT_SRC/macos/vision-hand-landmarks.swift" -o "$ROOT_SRC/macos/vision-hand-landmarks"
node --check "$ROOT_SRC/server.mjs"
node --check "$ROOT_SRC/apple-vision-hand.mjs"
for file in server.mjs apple-vision-hand.mjs macos/vision-hand-landmarks; do
  [[ -s "$ROOT_SRC/$file" ]] || { echo "Missing source $file" >&2; exit 1; }
  mkdir -p "$BACKUP/$(dirname "$file")" "$ROOT_DST/$(dirname "$file")"
  if [[ -e "$ROOT_DST/$file" ]]; then cp -p "$ROOT_DST/$file" "$BACKUP/$file"; fi
done
restore(){
  for file in server.mjs apple-vision-hand.mjs macos/vision-hand-landmarks; do
    if [[ -e "$BACKUP/$file" ]]; then cp -p "$BACKUP/$file" "$ROOT_DST/$file"; else rm -f "$ROOT_DST/$file"; fi
  done
  /usr/bin/codesign --force --deep --sign - "$APP" || true
}
for file in server.mjs apple-vision-hand.mjs macos/vision-hand-landmarks; do
  TEMP="$(mktemp "$ROOT_DST/$(dirname "$file")/.camera-XXXXXXXX")"
  cp -p "$ROOT_SRC/$file" "$TEMP"
  mv "$TEMP" "$ROOT_DST/$file"
done
chmod +x "$ROOT_DST/macos/vision-hand-landmarks"
if ! /usr/bin/codesign --force --deep --sign - "$APP" || ! /usr/bin/codesign --verify --deep --strict "$APP"; then
  restore;echo 'Installed V2 verification failed; original bridge restored' >&2;exit 1
fi
echo "Installed and signed camera hand bridge; rollback backup: $BACKUP"
echo 'Relaunch V2 to activate Apple Vision; running native garment and saved workspace unchanged.'

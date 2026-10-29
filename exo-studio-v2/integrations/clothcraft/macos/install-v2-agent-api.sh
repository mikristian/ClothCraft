#!/bin/bash
# Update only the JS API inside the signed EXO ClothCraft Studio V2 bundle.
# Preserve user workspace data, running native processes and Rust executables.
# The running app must be quit and relaunched to load the new server code.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
TARGET="$APP/Contents/Resources/integrations/clothcraft"
SOURCE="$ROOT/integrations/clothcraft"
BACKUP_BASE="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
[[ -d "$TARGET" ]] || { echo "V2 API folder not found: $TARGET" >&2; exit 1; }
for file in server.mjs agent-api.mjs mcp-server.mjs; do
  [[ -s "$TARGET/$file" ]] || { echo "Missing installed $file" >&2; exit 1; }
done
API_FILES=(server.mjs agent-api.mjs agent-key-store.mjs mcp-server.mjs)
for file in "${API_FILES[@]}"; do
  [[ -s "$SOURCE/$file" ]] || { echo "Missing source $file" >&2; exit 1; }
  node --check "$SOURCE/$file"
done
node "$SOURCE/qa-v2-agent-api.mjs"
node "$SOURCE/qa-v2-agent-automation-20261017.mjs"
mkdir -p "$BACKUP_BASE"
BACKUP="$(mktemp -d "$BACKUP_BASE/agent-api-before-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
for file in "${API_FILES[@]}"; do
  if [[ -f "$TARGET/$file" ]]; then cp -p "$TARGET/$file" "$BACKUP/$file"; fi
done
rollback(){
  for file in "${API_FILES[@]}"; do
    if [[ -f "$BACKUP/$file" ]]; then cp -p "$BACKUP/$file" "$TARGET/$file"; else rm -f "$TARGET/$file"; fi
  done
  /usr/bin/codesign --force --deep --sign - "$APP" || true
}
for file in "${API_FILES[@]}"; do
  STAGE="$(mktemp "$TARGET/.${file}.staged-XXXXXX")"
  cp "$SOURCE/$file" "$STAGE"
  mv -f "$STAGE" "$TARGET/$file"
done
if ! /usr/bin/codesign --force --deep --sign - "$APP" || ! /usr/bin/codesign --verify --deep --strict "$APP"; then
  echo "V2 API signing failed. Restoring original bundled server." >&2
  rollback
  exit 1
fi
echo "Installed V2 native API source, preserving user workspace. Backup: $BACKUP"
echo "Restart only EXO ClothCraft Studio V2 to activate the updated JS server."

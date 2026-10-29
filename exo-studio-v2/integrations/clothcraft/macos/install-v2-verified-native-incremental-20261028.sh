#!/bin/bash
# Replace ONLY the verified desktop Rust session in the installed EXO V2 app.
# Preserve web assets, saved projects, service resources, shaders and avatars.
# A source/QA failure must not shut down a running application.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
NEW="$ROOT/research/oss/clothcraft/target/debug/exo-session"
DEST="$APP/Contents/Resources/research/oss/clothcraft/target/debug/exo-session"
BACKUPS="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
APP_BIN="$APP/Contents/MacOS/EXOClothCraft"

[[ -x "$NEW" && -x "$DEST" && -x "$APP_BIN" ]] || {
  echo 'Installed application or new qualified Rust session is missing' >&2; exit 1;
}
node "$ROOT/integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs" "$ROOT" \
  | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{const v=JSON.parse(s);if(!v.ok){console.error(v.reason);process.exit(1)}console.log("Native source identity and disk: VERIFIED")})'
node "$ROOT/scripts/qa-exo-v2-desktop-gpu-binary.mjs"
if cmp -s "$NEW" "$DEST"; then
  echo 'The installed EXO native session already matches the qualified binary.'
  exit 0
fi

# Preserve the exact previous runtime before the application is asked to quit.
mkdir -p "$BACKUPS"
BACKUP="$(mktemp -d "$BACKUPS/native-v2-verified-XXXXXXXX")"
cp -p "$DEST" "$BACKUP/exo-session.previous"
cp -p "$NEW" "$BACKUP/exo-session.candidate"
cmp -s "$NEW" "$BACKUP/exo-session.candidate"
echo "Previous EXO native session preserved at $BACKUP/exo-session.previous"

# Save any live native project before closing the application. Do not force
# terminate an app which does not respond to a graceful quit request.
if curl -fsS --connect-timeout 2 --max-time 12 http://127.0.0.1:5385/health >/dev/null 2>&1; then
  curl -fsS --connect-timeout 2 --max-time 20 -H 'Content-Type: application/json' \
    -d '{"op":"save"}' http://127.0.0.1:5385/workspace \
    | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{const v=JSON.parse(s);if(!v.ok||!v.data?.project){console.error(v.error||"Native save not confirmed");process.exit(1)}console.log("Native project safely saved before restart")})'
fi

if pgrep -f "^${APP_BIN}$" >/dev/null 2>&1; then
  osascript -e 'tell application id "com.mikristian.exo.clothcraft.workspace.v2" to quit'
  for ((attempt=0;attempt<40;attempt++)); do
    if ! pgrep -f "^${APP_BIN}$" >/dev/null 2>&1; then break; fi
    sleep .5
  done
  if pgrep -f "^${APP_BIN}$" >/dev/null 2>&1; then
    echo 'EXO did not gracefully quit; existing app and native binary left unchanged' >&2
    exit 1
  fi
fi

rollback() {
  echo 'Native incremental install failed; restoring previously signed runtime' >&2
  cp -p "$BACKUP/exo-session.previous" "$DEST" || true
  /usr/bin/codesign --force --deep --sign - "$APP" || true
  /usr/bin/open "$APP" || true
}
trap rollback ERR

# Stage and rename the executable on its own filesystem. Never rewrite the
# Rust source, reinstall the large app bundle or touch the user's document.
TEMP="$DEST.stage.$$"
install -m 755 "$BACKUP/exo-session.candidate" "$TEMP"
cmp -s "$TEMP" "$NEW"
mv -f "$TEMP" "$DEST"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
cmp -s "$NEW" "$DEST"
/usr/bin/open "$APP"

healthy=0
for ((attempt=0;attempt<60;attempt++)); do
  # An HTTP 200 /health is not sufficient: Swift can serve its web page while
  # the native Rust child has not loaded, or has failed to start entirely.
  # The readiness gate must inspect the native session behind the bridge.
  if curl -fsS --connect-timeout 2 --max-time 3 http://127.0.0.1:5385/health 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{try{const h=JSON.parse(s);if(!h.ok||h.nativeReady!==true||h.nativeSession?.loaded!==true||h.nativeSession?.nativeProcessRunning!==true)process.exit(1)}catch{process.exit(1)}})' && \
    curl -fsS --connect-timeout 2 --max-time 3 http://127.0.0.1:5386/ >/dev/null 2>&1; then
    healthy=1; break
  fi
  sleep .5
done
[[ "$healthy" -eq 1 ]] || { echo 'Installed EXO did not restart both native services' >&2; exit 1; }

trap - ERR
echo 'EXO V2 native incremental installation: PASSED'
echo 'Installed Rust SHA-256:'
shasum -a 256 "$DEST"
echo 'Previous binary retained for recovery:'
echo "$BACKUP/exo-session.previous"

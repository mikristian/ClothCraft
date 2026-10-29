#!/bin/bash
# Refresh the independent QA app's embedded frontend from current Vite source.
# Keep production 5385/5386 and installed V2 untouched.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
APP="$HOME/Applications/EXO ClothCraft Studio V2 QA.app"
RES="$APP/Contents/Resources"
ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Contents/Info.plist")
[[ "$ID" == com.mikristian.exo.clothcraft.workspace.v2.qa ]] || { echo 'Wrong QA bundle identity' >&2; exit 1; }
[[ -s "$RES/web/index.html" && -x "$RES/research/oss/clothcraft/target/debug/exo-session" ]] || { echo 'QA resources incomplete' >&2; exit 1; }
for port in 5485 5486; do
  owner=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)
  if [[ -n "$owner" ]]; then
    cmd=$(ps -p "$owner" -o command=)
    [[ "$cmd" == *"$RES/integrations/clothcraft/"* ]] || { echo "QA port $port owned by unexpected process" >&2; exit 1; }
  fi
done
STAGING=$(mktemp -d /tmp/exo-v2-qa-ui-XXXXXXXX)
trap 'rm -rf "$STAGING"' EXIT
VITE_CLOTHCRAFT_BRIDGE_URL=http://127.0.0.1:5485 npm run build -- --outDir "$STAGING/new"
test -s "$STAGING/new/index.html"
python3 - "$STAGING/new/assets" <<'PY'
import pathlib,sys
for p in pathlib.Path(sys.argv[1]).glob('*.js'):
    data=p.read_bytes()
    updated=data.replace(b'127.0.0.1:5385',b'127.0.0.1:5485').replace(b'127.0.0.1:5386',b'127.0.0.1:5486').replace(b'localhost:5386',b'localhost:5486')
    if updated!=data:p.write_bytes(updated)
PY
grep -rlqF '127.0.0.1:5485' "$STAGING/new/assets" || { echo 'QA bridge URL not present' >&2; exit 1; }
! grep -rlqF '127.0.0.1:5385' "$STAGING/new/assets" || { echo 'Production URL leaked into QA frontend' >&2; exit 1; }
# Save the entire old QA web directory for a manual rollback, without
# altering the old installed production app or the user's workspace.
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/EXO-V2-QA-web-before-refresh-20261020"
if [[ ! -d "$BACKUP" ]]; then
  mkdir -p "$BACKUP"
  rsync -a "$RES/web/" "$BACKUP/"
fi
rsync -a --delete "$STAGING/new/" "$RES/web/"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
echo "QA_WEB_REFRESHED=$APP"
echo "QA_BACKUP=$BACKUP"
echo 'To view changes, relaunch only QA app: open -a "$HOME/Applications/EXO ClothCraft Studio V2 QA.app"'

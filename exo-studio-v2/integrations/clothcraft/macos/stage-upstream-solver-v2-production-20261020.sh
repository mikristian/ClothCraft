#!/bin/bash
# Promote the QA-verified merged CPU solver into the regular V2 application.
# Preserve the complete personal workspace, preserve the existing web bundle,
# retain an exact native rollback binary and verify the resumed garment.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$HOME/Applications/EXO ClothCraft Studio V2.app"
RES="$APP/Contents/Resources"
NATIVE="$RES/research/oss/clothcraft/target/debug/exo-session"
QA_NATIVE="$HOME/Applications/EXO ClothCraft Studio V2 QA.app/Contents/Resources/research/oss/clothcraft/target/debug/exo-session"
WORKSPACE="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace"
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/upstream-solver-production-20261020"
EXPECTED='c491d0e6ed7be3228ef320925ac75fb0e923ea1202676193f42c4ea16f484df7'

test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Contents/Info.plist")" = 'com.mikristian.exo.clothcraft.workspace.v2'
test -x "$NATIVE" && test -x "$QA_NATIVE" && test -s "$RES/web/index.html"
test "$(shasum -a 256 "$QA_NATIVE" | awk '{print $1}')" = "$EXPECTED"
/usr/bin/codesign --verify --deep --strict "$APP"
old_hash="$(shasum -a 256 "$NATIVE" | awk '{print $1}')"
web_hash="$(shasum -a 256 "$RES/web/index.html" | awk '{print $1}')"
mkdir -p "$BACKUP"
if [[ ! -e "$BACKUP/exo-session-before" ]]; then cp -p "$NATIVE" "$BACKUP/exo-session-before"; fi
if [[ ! -d "$BACKUP/workspace-before" ]]; then
  mkdir -p "$BACKUP/workspace-before"
  rsync -a "$WORKSPACE/" "$BACKUP/workspace-before/"
fi
test "$(shasum -a 256 "$BACKUP/exo-session-before" | awk '{print $1}')" = "$old_hash" || {
  echo 'Backup is not the currently installed original binary; refusing upgrade' >&2; exit 1;
}

# Persist the currently open document BEFORE closing the app. The entire
# previous saved workspace was already backed up without alteration.
curl --max-time 15 -fsS -H 'Origin: http://127.0.0.1:5386' +  -H 'Content-Type: application/json' -d '{"op":"save"}' +  http://127.0.0.1:5385/workspace | jq -e '.ok==true' >/dev/null
cp -p "$WORKSPACE/fitting-project.json.native" "$BACKUP/current-native-after-save.json"
curl --max-time 15 -fsS -H 'Origin: http://127.0.0.1:5386' +  -H 'Content-Type: application/json' -d '{"op":"snapshot"}' +  http://127.0.0.1:5385/workspace | jq -cS '.data.template' > "$BACKUP/garment-template-before.json"
test -s "$BACKUP/garment-template-before.json"
template_sha="$(shasum -a 256 "$BACKUP/garment-template-before.json" | awk '{print $1}')"

swapped=0
rollback(){
  if [[ "$swapped" -eq 1 ]]; then
    echo 'Installed solver acceptance failed; restoring original regular-app binary' >&2
    /usr/bin/osascript -e 'tell application id "com.mikristian.exo.clothcraft.workspace.v2" to quit' >/dev/null 2>&1 || true
    sleep 2
    cp -p "$BACKUP/exo-session-before" "$NATIVE"
    /usr/bin/codesign --force --deep --sign - "$APP" || true
    /usr/bin/open -a "$APP" || true
  fi
}
trap rollback ERR

pid="$(pgrep -f "$APP/Contents/MacOS/EXOClothCraft" | head -1 || true)"
if [[ -n "$pid" ]]; then
  /usr/bin/osascript -e 'tell application id "com.mikristian.exo.clothcraft.workspace.v2" to quit' >/dev/null 2>&1 || kill -TERM "$pid"
  for _ in {1..24}; do
    if ! kill -0 "$pid" 2>/dev/null; then break; fi
    sleep 0.5
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo 'Regular app did not exit; refusing to replace a running solver' >&2
    exit 1
  fi
fi
for port in 5385 5386; do
  owner="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$owner" ]]; then
    cmd="$(ps -p "$owner" -o command=)"
    [[ "$cmd" == *"$RES/integrations/clothcraft/"* ]] || {
      echo "Unexpected process on production port $port: $cmd" >&2; exit 1;
    }
    kill -TERM "$owner" || true
  fi
done

rsync -a "$QA_NATIVE" "$NATIVE"
chmod 755 "$NATIVE"
swapped=1
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
test "$(shasum -a 256 "$NATIVE" | awk '{print $1}')" = "$EXPECTED"
test "$(shasum -a 256 "$RES/web/index.html" | awk '{print $1}')" = "$web_hash"
/usr/bin/open -a "$APP"
for _ in {1..75}; do
  if curl --max-time 1 -fsS http://127.0.0.1:5385/health >/dev/null 2>&1 &&
     curl --max-time 1 -fsS http://127.0.0.1:5386/ >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl --max-time 5 -fsS http://127.0.0.1:5385/health >/dev/null
curl --max-time 5 -fsS http://127.0.0.1:5386/ >/dev/null
curl --max-time 20 -fsS -H 'Origin: http://127.0.0.1:5386' +  -H 'Content-Type: application/json' -d '{"op":"snapshot"}' +  http://127.0.0.1:5385/workspace | jq -e '.ok==true and (.data.positions|length)>0 and (.data.panels|length)>0' >/dev/null
curl --max-time 20 -fsS -H 'Origin: http://127.0.0.1:5386' +  -H 'Content-Type: application/json' -d '{"op":"snapshot"}' +  http://127.0.0.1:5385/workspace | jq -cS '.data.template' > "$BACKUP/garment-template-after.json"
test "$(shasum -a 256 "$BACKUP/garment-template-after.json" | awk '{print $1}')" = "$template_sha"
test "$(shasum -a 256 "$RES/web/index.html" | awk '{print $1}')" = "$web_hash"
swapped=0
trap - ERR
echo "PRODUCTION_SOLVER_INSTALLED_SHA256=$EXPECTED"
echo "PRODUCTION_APP_PID=$(pgrep -f "$APP/Contents/MacOS/EXOClothCraft" | head -1 || true)"
echo "PRODUCTION_GARMENT_TEMPLATE_UNCHANGED_SHA256=$template_sha"
echo "PRODUCTION_WEB_UNCHANGED_SHA256=$web_hash"
echo "PRODUCTION_BACKUP=$BACKUP"
echo 'PRODUCTION_NATIVE_SNAPSHOT_PASS=true'

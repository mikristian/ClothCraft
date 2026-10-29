#!/bin/bash
# Install the already-tested upstream+EXO CPU solver in the *isolated* QA app.
# Regular production EXO V2 (5385/5386) and its garment workspace are untouched.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$HOME/Applications/EXO ClothCraft Studio V2 QA.app"
RES="$APP/Contents/Resources"
TARGET="$RES/research/oss/clothcraft/target/debug/exo-session"
CANDIDATE="${EXO_UPSTREAM_SOLVER_BIN:-/tmp/exo-upstream-solver-compare-binaries-20261020/candidate-exo-session}"
PROD="$HOME/Applications/EXO ClothCraft Studio V2.app/Contents/Resources/research/oss/clothcraft/target/debug/exo-session"
QA_OUTPUT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2-QA/Output/workspace"
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/upstream-solver-qa-20261020"

test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Contents/Info.plist")" = 'com.mikristian.exo.clothcraft.workspace.v2.qa'
test -x "$CANDIDATE" && test -x "$TARGET" && test -x "$PROD"
test -s "$RES/web/index.html"
test -s "$RES/integrations/clothcraft/workspace.mjs"
sha_before="$(shasum -a 256 "$PROD" | awk '{print $1}')"
sha_candidate="$(shasum -a 256 "$CANDIDATE" | awk '{print $1}')"
[[ "$sha_candidate" == c491d0e6ed7be3228ef320925ac75fb0e923ea1202676193f42c4ea16f484df7 ]] || {
  echo 'Candidate hash differs from the merged binary that passed CPU benchmarks' >&2; exit 1;
}
mkdir -p "$BACKUP"
if [[ ! -e "$BACKUP/exo-session" ]]; then cp -p "$TARGET" "$BACKUP/exo-session"; fi
if [[ ! -e "$BACKUP/workspace.mjs" ]]; then cp -p "$RES/integrations/clothcraft/workspace.mjs" "$BACKUP/workspace.mjs"; fi
for filename in fitting-project.json fitting-project.json.native; do
  if [[ -s "$QA_OUTPUT/$filename" && ! -e "$BACKUP/$filename" ]]; then
    cp -p "$QA_OUTPUT/$filename" "$BACKUP/$filename"
  fi
done
/usr/bin/codesign --verify --deep --strict "$APP"

# Only the QA process. Give the app a chance to close child services itself.
qa_pid="$(pgrep -f "$APP/Contents/MacOS/EXOClothCraft" | head -1 || true)"
if [[ -n "$qa_pid" ]]; then
  /usr/bin/osascript -e 'tell application id "com.mikristian.exo.clothcraft.workspace.v2.qa" to quit' >/dev/null 2>&1 || kill -TERM "$qa_pid"
  for _ in {1..24}; do
    if ! kill -0 "$qa_pid" 2>/dev/null; then break; fi
    sleep 0.5
  done
  if kill -0 "$qa_pid" 2>/dev/null; then
    echo 'QA window did not exit after quit request; refusing to replace a running binary' >&2
    exit 1
  fi
fi
for port in 5485 5486; do
  owner="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$owner" ]]; then
    command="$(ps -p "$owner" -o command=)"
    if [[ "$command" != *"$RES/integrations/clothcraft/"* ]]; then
      echo "Unexpected owner of QA port $port: $command" >&2; exit 1
    fi
    kill -TERM "$owner" || true
  fi
done
rsync -a "$CANDIDATE" "$TARGET"
chmod 755 "$TARGET"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
test "$(shasum -a 256 "$TARGET" | awk '{print $1}')" = "$sha_candidate"
test "$(shasum -a 256 "$PROD" | awk '{print $1}')" = "$sha_before"

/usr/bin/open -a "$APP"
for _ in {1..60}; do
  if curl --max-time 1 -fsS http://127.0.0.1:5485/health >/dev/null 2>&1 &&
     curl --max-time 1 -fsS http://127.0.0.1:5486/ >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
curl --max-time 5 -fsS http://127.0.0.1:5485/health >/dev/null
curl --max-time 5 -fsS http://127.0.0.1:5486/ >/dev/null
test "$(shasum -a 256 "$PROD" | awk '{print $1}')" = "$sha_before"

echo "QA_SOLVER_INSTALLED_SHA256=$sha_candidate"
echo "QA_APP=$APP"
echo "QA_BACKUP=$BACKUP"
echo "QA_APP_PID=$(pgrep -f "$APP/Contents/MacOS/EXOClothCraft" | head -1 || true)"
echo 'QA_WEB_HTTP=200 QA_NATIVE_HEALTH_HTTP=200'
echo "PRODUCTION_BINARY_UNCHANGED_SHA256=$sha_before"

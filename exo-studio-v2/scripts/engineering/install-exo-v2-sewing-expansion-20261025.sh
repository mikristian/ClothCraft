#!/bin/bash
# Minimal EXO V2 sewing solver deployment. Does not rebuild or replace web assets.
# Usage: bash scripts/engineering/install-exo-v2-sewing-expansion-20261025.sh /absolute/path/exo-session [expected_sha256]
set -Eeuo pipefail

APP="$HOME/Applications/EXO ClothCraft Studio V2.app"
IDENTITY='com.mikristian.exo.clothcraft.workspace.v2'
BIN_REL='Contents/Resources/research/oss/clothcraft/target/debug/exo-session'
REMOTE='jarvismikristian@100.82.90.101'
SSH_KEY="$HOME/.ssh/jarvis_os_bridge_ed25519"
REMOTE_BACKUPS='/Volumes/Expansion/EXO-Engineering/exo-native-sewing-20261025-atomic-v1/backups'
ORIGIN='http://127.0.0.1:5386'
BRIDGE='http://127.0.0.1:5385'
STATIC='http://127.0.0.1:5386'

usage() { echo "Usage: $0 /absolute/path/verified-arm64-exo-session [expected_sha256]" >&2; exit 64; }
[[ $# -ge 1 && $# -le 2 ]] || usage
SOURCE=$1
EXPECTED=${2:-}
[[ "$SOURCE" == /* && -f "$SOURCE" && -r "$SOURCE" ]] || usage
if [[ -n "$EXPECTED" && ! "$EXPECTED" =~ ^[[:xdigit:]]{64}$ ]]; then usage; fi
[[ -d "$APP" && -x "$APP/$BIN_REL" && -f "$APP/Contents/Resources/web/index.html" ]] || { echo 'Installed V2 bundle incomplete' >&2; exit 1; }
[[ -f "$SSH_KEY" ]] || { echo 'Jarvis SSH key unavailable' >&2; exit 1; }

info() { printf '%s\n' "[exo-install] $*"; }
fail() { printf '%s\n' "[exo-install] ERROR: $*" >&2; exit 1; }
sha() { shasum -a 256 "$1" | awk '{print $1}'; }
validate_json_ok() { /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if isinstance(d,dict) and d.get("ok") is True else 1)'; }
require_arm64() {
  /usr/bin/file "$1" | grep -Eq 'Mach-O.*arm64' || fail "Not a Mach-O arm64 executable: $1"
  /usr/bin/lipo -archs "$1" | tr ' ' '\n' | grep -qx arm64 || fail "arm64 architecture missing: $1"
}
check_bundle() {
  local identifier
  identifier=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist")
  [[ "$identifier" == "$IDENTITY" ]] || fail "Unexpected bundle identifier: $identifier"
  /usr/bin/codesign --verify --deep --strict "$APP" || fail 'Existing bundle signature invalid'
}
post_workspace() {
  local op=$1 response status
  response=$(mktemp "$TEMP_ROOT/${op}.XXXXXX")
  status=$(/usr/bin/curl --silent --show-error --connect-timeout 3 --max-time 135 \
    -o "$response" -w '%{http_code}' -H "Origin: $ORIGIN" \
    -H 'Content-Type: application/json' -X POST --data "{\"op\":\"$op\"}" "$BRIDGE/workspace") || fail "Workspace $op request failed"
  [[ "$status" == 200 ]] || fail "Workspace $op returned HTTP $status: $(cat "$response")"
  validate_json_ok < "$response" || fail "Workspace $op did not return JSON ok:true: $(cat "$response")"
  info "Workspace $op confirmed HTTP 200 / JSON ok:true"
}
health() {
  local name=$1 url=$2 response status
  response=$(mktemp "$TEMP_ROOT/health.XXXXXX")
  status=$(/usr/bin/curl --silent --show-error --connect-timeout 2 --max-time 5 -o "$response" -w '%{http_code}' "$url") || return 1
  [[ "$status" == 200 ]] || return 1
  if [[ "$name" == bridge ]]; then validate_json_ok < "$response"; else [[ -s "$response" ]]; fi
}

check_bundle
require_arm64 "$SOURCE"
require_arm64 "$APP/$BIN_REL"
NEW_SHA=$(sha "$SOURCE")
if [[ -n "$EXPECTED" ]]; then
  EXPECTED_LOWER=$(printf '%s' "$EXPECTED" | LC_ALL=C tr '[:upper:]' '[:lower:]')
  [[ "$NEW_SHA" == "$EXPECTED_LOWER" ]] || fail "SHA256 mismatch (actual $NEW_SHA)"
fi
OLD_SHA=$(sha "$APP/$BIN_REL")
[[ "$OLD_SHA" != "$NEW_SHA" ]] || fail 'Old and new solver binary hashes match; nothing to deploy'

TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp/}exo-v2-sewing-deploy.XXXXXXXX")
chmod 700 "$TEMP_ROOT"
ROLLBACK_BIN="$TEMP_ROOT/exo-session.original"
ROLLBACK_INDEX="$TEMP_ROOT/index.original.html"
cp -p "$APP/$BIN_REL" "$ROLLBACK_BIN"
cp -p "$APP/Contents/Resources/web/index.html" "$ROLLBACK_INDEX"
[[ "$(sha "$ROLLBACK_BIN")" == "$OLD_SHA" ]] || fail 'Local binary backup failed verification'

STOP_STARTED=0
COMMITTED=0
RELAUNCHED=0
rollback() {
  local code=$?
  trap - EXIT ERR INT TERM
  if (( STOP_STARTED && ! COMMITTED )); then
    info 'Restoring previously signed app state'
    if (( RELAUNCHED )); then
      while IFS= read -r current_pid; do
        [[ -n "$current_pid" ]] || continue
        current_command=$(ps -p "$current_pid" -o command= 2>/dev/null) || continue
        if [[ "$current_command" == "$APP/Contents/MacOS/EXOClothCraft" ]]; then
          kill -TERM "$current_pid" 2>/dev/null || :
        fi
      done < <(pgrep -f 'Contents/MacOS/EXOClothCraft' || :)
      sleep 2
    fi
    cp -p "$ROLLBACK_BIN" "$APP/$BIN_REL.rollback-$$" && mv -f "$APP/$BIN_REL.rollback-$$" "$APP/$BIN_REL"
    cp -p "$ROLLBACK_INDEX" "$APP/Contents/Resources/web/index.html"
    /usr/bin/codesign --force --deep --sign - "$APP"
    /usr/bin/codesign --verify --deep --strict "$APP"
    /usr/bin/open "$APP"
    info "Rollback restored old binary SHA256 $OLD_SHA"
  fi
  if (( code == 0 && COMMITTED )); then
    # Never expand an unset or unexpected path into a recursive deletion.
    case "$TEMP_ROOT" in
      "${TMPDIR:-/tmp/}"exo-v2-sewing-deploy.*)
        [[ -d "$TEMP_ROOT" && ! -L "$TEMP_ROOT" ]] && rm -rf -- "$TEMP_ROOT" ;;
      *) printf '%s\n' "Refusing unexpected temporary cleanup path: $TEMP_ROOT" >&2 ;;
    esac
  else
    info "Local rollback evidence retained: $TEMP_ROOT"
  fi
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Expansion backup is mandatory, including remote SHA256 readback, before touching live services.
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-${OLD_SHA:0:12}"
REMOTE_DIR="$REMOTE_BACKUPS/$RUN_ID"
SSH=(/usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=12 -i "$SSH_KEY" "$REMOTE")
SCP=(/usr/bin/scp -q -o BatchMode=yes -o ConnectTimeout=12 -i "$SSH_KEY")
"${SSH[@]}" "mkdir -p '$REMOTE_DIR'" || fail 'Cannot create physical Expansion backup folder on Jarvis'
"${SCP[@]}" "$ROLLBACK_BIN" "$REMOTE:$REMOTE_DIR/exo-session.old" || fail 'Remote solver backup failed'
"${SCP[@]}" "$ROLLBACK_INDEX" "$REMOTE:$REMOTE_DIR/index.old.html" || fail 'Remote web entrypoint backup failed'
REMOTE_SHA=$("${SSH[@]}" "shasum -a 256 '$REMOTE_DIR/exo-session.old' | awk '{print \$1}'") || fail 'Remote SHA256 readback failed'
[[ "$REMOTE_SHA" == "$OLD_SHA" ]] || fail "Remote binary hash mismatch: $REMOTE_SHA"
INDEX_SHA=$(sha "$ROLLBACK_INDEX")
REMOTE_INDEX_SHA=$("${SSH[@]}" "shasum -a 256 '$REMOTE_DIR/index.old.html' | awk '{print \$1}'") || fail 'Remote index SHA256 readback failed'
[[ "$REMOTE_INDEX_SHA" == "$INDEX_SHA" ]] || fail 'Remote index hash mismatch'
info "Physical Expansion backup verified at $REMOTE:$REMOTE_DIR"

# Ensure ports belong to the installed bundle; never touch concurrent development sessions.
app_pids=()
while IFS= read -r pid; do
  [[ -n "$pid" ]] || continue
  command_line=$(ps -p "$pid" -o command=)
  [[ "$command_line" == "$APP/Contents/MacOS/EXOClothCraft" ]] || continue
  app_pids+=("$pid")
done < <(pgrep -f 'Contents/MacOS/EXOClothCraft' || :)
[[ ${#app_pids[@]} -eq 1 ]] || fail "Expected exactly one running installed V2 window; found ${#app_pids[@]}"
for port in 5385 5386; do
  pids=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN)
  [[ -n "$pids" && "$pids" != *$'\n'* ]] || fail "Port $port has missing or ambiguous owner"
  command_line=$(ps -p "$pids" -o command=)
  if [[ "$port" == 5385 ]]; then
    [[ "$command_line" == *"EXO-ClothCraft-Studio-V2/Runtime/node $APP/Contents/Resources/integrations/clothcraft/server.mjs"* ]] || fail "Unexpected 5385 owner: $command_line"
    bridge_pid=$pids
  else
    [[ "$command_line" == "$APP/Contents/Resources/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host --web-root $APP/Contents/Resources/web" ]] || fail "Unexpected 5386 owner: $command_line"
    static_pid=$pids
  fi
done

post_workspace pause
post_workspace save
health bridge "$BRIDGE/health" || fail 'Bridge health failed before shutdown'
health static "$STATIC/" || fail 'Web host health failed before shutdown'

STOP_STARTED=1
# Quit only the verified app window and its own two verified service processes.
kill -TERM "${app_pids[0]}"
for attempt in $(seq 1 30); do
  if ! kill -0 "${app_pids[0]}" 2>/dev/null; then break; fi
  sleep 1
done
if kill -0 "${app_pids[0]}" 2>/dev/null; then fail 'Installed app did not quit cleanly'; fi
for pid in "$bridge_pid" "$static_pid"; do
  if kill -0 "$pid" 2>/dev/null; then
    current=$(ps -p "$pid" -o command=)
    [[ "$current" == *"$APP/Contents/Resources/"* ]] || fail "Service PID $pid changed ownership"
    kill -TERM "$pid"
  fi
done
# The Node workspace can leave a child Rust process after its parent exits.
# Terminate only exact solver paths inside this verified installed bundle.
while IFS= read -r solver_pid; do
  [[ -n "$solver_pid" ]] || continue
  solver_command=$(ps -p "$solver_pid" -o command= 2>/dev/null) || continue
  if [[ "$solver_command" == "$APP/$BIN_REL "* ]]; then
    kill -TERM "$solver_pid"
  fi
done < <(pgrep -f '/target/debug/exo-session' || :)
for attempt in $(seq 1 20); do
  if ! lsof -nP -tiTCP:5385 -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -nP -tiTCP:5386 -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  sleep 1
done
if lsof -nP -tiTCP:5385 -sTCP:LISTEN >/dev/null 2>&1 || lsof -nP -tiTCP:5386 -sTCP:LISTEN >/dev/null 2>&1; then fail 'Installed service ports did not close'; fi

cp -p "$SOURCE" "$APP/$BIN_REL.deploy-$$"
[[ "$(sha "$APP/$BIN_REL.deploy-$$")" == "$NEW_SHA" ]] || fail 'Staged binary hash mismatch'
chmod 755 "$APP/$BIN_REL.deploy-$$"
mv -f "$APP/$BIN_REL.deploy-$$" "$APP/$BIN_REL"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
[[ "$(sha "$APP/$BIN_REL")" == "$NEW_SHA" ]] || fail 'Installed executable SHA256 mismatch'
[[ "$(sha "$APP/Contents/Resources/web/index.html")" == "$INDEX_SHA" ]] || fail 'Unexpected web index mutation'
/usr/bin/open "$APP"
RELAUNCHED=1

READY=0
for attempt in $(seq 1 45); do
  if health bridge "$BRIDGE/health" && health static "$STATIC/"; then READY=1; break; fi
  sleep 2
done
[[ "$READY" == 1 ]] || fail 'Post-install 5385/5386 health check failed'
COMMITTED=1
info "PASS: installed arm64 solver SHA256 $NEW_SHA; codesign and 5385/5386 healthy"
info "Backup: $REMOTE:$REMOTE_DIR"

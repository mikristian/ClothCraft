#!/bin/sh
# Read-only diagnostics. Does not start agents, claim tasks, or execute code from the queue.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
QUEUE="$ROOT/docs/engineering/exo-v2-rust-autopilot-queue.json"
STAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
check_service() {
  if launchctl list "$1" >/dev/null 2>&1; then printf 'up'; else printf 'down'; fi
}
COS=$(check_service 'application.com.chatonsteroids.app.260463868.260463873')
ENGINE=$(check_service 'com.openclaw.personal-captain.engine')
MEMORY=$(check_service 'com.openclaw.chat-on-steroids-memory-sync')
CANDIDATE=$(check_service 'com.exo.clothcraft.rust-candidate-worker')
CODEX="$HOME/.local/share/exo-rust-codex/node_modules/.bin/codex"
if [ "$CANDIDATE" = up ] && [ -x "$CODEX" ]; then
  # A real disposable headless Codex edit+Rust test and a full fake-queue
  # patch-generation run passed before this candidate-only job was enabled.
  # This does NOT mean source changes have been integrated or released.
  CODING_TRIGGER=true
else
  CODING_TRIGGER=false
fi
if [ -f "$QUEUE" ]; then
  QUEUE_RESULT=$(/usr/bin/python3 - "$QUEUE" <<'PY'
import json,sys
try:
    with open(sys.argv[1],encoding='utf-8') as f: data=json.load(f)
    tasks=data.get('tasks',[])
    if data.get('schema') != 1 or not isinstance(tasks,list): raise ValueError()
    active=sum(t.get('status')=='active' for t in tasks)
    pending=sum(t.get('status')=='pending' for t in tasks)
    print(f'valid {int(bool(data.get("enabled")))} {active} {pending}')
except (OSError,ValueError,TypeError,KeyError):
    print('invalid 0 0 0')
PY
  )
else
  QUEUE_RESULT='missing 0 0 0'
fi
set -- $QUEUE_RESULT
# Fixed vocabulary + integers only. Never log environment, command arguments, queue contents or credentials.
printf '{"at":"%s","type":"diagnostic_only","cos":"%s","openclaw_engine":"%s","memory_sync":"%s","candidate_worker":"%s","queue":"%s","queue_enabled":%s,"active":%s,"pending":%s,"coding_trigger_verified":%s,"automatic_integration_verified":false}\n' \
  "$STAMP" "$COS" "$ENGINE" "$MEMORY" "$CANDIDATE" "$1" "$2" "$3" "$4" "$CODING_TRIGGER"

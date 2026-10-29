#!/bin/bash
# Read-only verification of the RUN47 SSH Expansion QA archive.
# This script never removes, copies, uploads or restores files.
# --remote-only works after the user has separately archived and removed local
# QA sources; the remote bytes must still match the original pinned receipt.
set -euo pipefail
MODE='both'
if (($#)); then
  (($# == 1)) || { echo 'Usage: checker [--remote-only]' >&2; exit 2; }
  MODE="$1"
fi
[[ "$MODE" == 'both' || "$MODE" == '--remote-only' ]] || {
  echo 'Usage: checker [--remote-only]' >&2
  exit 2
}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL="$ROOT/integrations/clothcraft/output"
REMOTE='/Volumes/Expansion/EXO_RUN47_QA_Archive_20261029'
HOST='jarvis-analysis'
for name in black-panel-final-4q7TmVvt object-browser-original-1vR016KD pattern-one-row-081yZfgq; do
  case "$name" in
    black-panel-final-4q7TmVvt) expected='f9da012c02642321b5eae79d2132ed3461d32c1396043bdfc55ccb2eae404166' ;;
    object-browser-original-1vR016KD) expected='36613617f35a8e11a3e473830af08080b0e99cf899b8026a0b9792cf492ab463' ;;
    pattern-one-row-081yZfgq) expected='eee26d496d466efed972aa0d720cd5766063556ab53a5280bc78e0d4896da1ca' ;;
  esac
  SOURCE="$LOCAL/$name"
  local_hash="$expected"
  if [[ "$MODE" == 'both' ]]; then
    if [[ ! -d "$SOURCE" ]]; then
      echo "Missing local source $SOURCE" >&2
      exit 3
    fi
    local_hash="$(cd "$SOURCE" &&
      find . -type f -print0 | xargs -0 shasum -a 256 |
      LC_ALL=C sort | shasum -a 256 | cut -d ' ' -f1)"
  fi
  echo "SHA256 inventory: $name"
  remote_hash="$(ssh -o BatchMode=yes -o ConnectTimeout=8 -o ConnectionAttempts=1 "$HOST" \
    "cd '$REMOTE/$name' && find . -type f -print0 |
     xargs -0 shasum -a 256 | LC_ALL=C sort | shasum -a 256 |
     cut -d ' ' -f1")"
  if [[ "$local_hash" != "$expected" || "$remote_hash" != "$expected" ]]; then
    echo "MISMATCH $name against original SHA256 receipt; no file was modified" >&2
    exit 4
  fi
  printf 'PINNED_SHA256_MATCH %s %s\n' "$name" "$expected"
done
echo 'PASS: original RUN47 inventory receipts verified; originals untouched.'

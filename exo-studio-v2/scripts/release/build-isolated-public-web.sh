#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
OUT="${1:?Usage: build-isolated-public-web.sh OUTPUT_DIRECTORY}"
OUT="$(mkdir -p "$OUT" && cd "$OUT" && pwd)"
case "$OUT" in "$ROOT"|"$ROOT"/*) echo 'Output must be outside the working repository' >&2; exit 2 ;; esac
if [[ -n "$(ls -A "$OUT")" ]]; then echo 'Output directory must be empty' >&2; exit 2; fi
STAGE="$(mktemp -d "${TMPDIR:-/tmp/}clothcraft-public.XXXXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
rsync -a --exclude='*thomas*' --exclude='*Thomas*' public/ "$STAGE"/
if find "$STAGE" -iname '*thomas*' -print -quit | grep -q .; then echo 'Restricted source asset' >&2; exit 1; fi
CLOTHCRAFT_PUBLIC_DIR="$STAGE" CLOTHCRAFT_PUBLIC_OUT="$OUT" VITE_PUBLIC_DISTRIBUTION=1 ./node_modules/.bin/vite build --config vite.public-isolated.config.mjs
if find "$OUT" -iname '*thomas*' -print -quit | grep -q .; then echo 'Restricted built asset' >&2; exit 1; fi
test -s "$OUT/index.html"
echo "Isolated public web build verified: $OUT"

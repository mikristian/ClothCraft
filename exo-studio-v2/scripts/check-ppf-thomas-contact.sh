#!/usr/bin/env bash
# Regression: staging must be clear of Thomas's *actual* posed body mesh.
# This is an initial-pose check, not a claim of collision-free draping.
set -euo pipefail
cd "$(dirname "$0")/.."
BLENDER="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp/}garment-ppf-thomas-XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT
INPUT="blender_bridge/fixtures/tee-thomas-exact-contact.ppf.json"
if [[ ! -f "$INPUT" ]]; then
  echo "SKIP: Thomas PPF diagnostic fixture not generated"
  exit 0
fi
"$BLENDER" --background --factory-startup --python blender_bridge/tune_ppf_staging.py -- \
  --input "$INPUT" --output "$TEMP_DIR/staged.ppf.json" \
  --min-torso-depth 0.16 --min-arm-offset 0.51 > "$TEMP_DIR/tune.log"
"$BLENDER" --background --factory-startup --python blender_bridge/ppf_prepare_scene.py -- \
  --input "$TEMP_DIR/staged.ppf.json" --output "$TEMP_DIR/configured.blend" --configure-addon > "$TEMP_DIR/prepare.log"
"$BLENDER" --background "$TEMP_DIR/configured.blend" --python blender_bridge/check_ppf_dynamic_contact.py -- \
  --payload "$TEMP_DIR/staged.ppf.json" --initial-only --report "$TEMP_DIR/contact.json" > "$TEMP_DIR/contact.log"
python3 - "$TEMP_DIR/staged.ppf.json" "$TEMP_DIR/contact.json" <<'PY'
import json, sys
stage = json.load(open(sys.argv[1]))['scene']['staging']
report = json.load(open(sys.argv[2]))['perFrame'][0]
assert stage['realBodyContact']['selectedBodyCrossings'] == 0, stage
assert report['avatarTriangleIntersectionPairs'] == 0, report
assert report['clothSelfIntersectionPairs'] == 0, report
print('PASS: CLO Thomas actual-skin auto-staging starts with zero cloth/body and cloth/self triangle intersections')
print('NOTE: no dynamic-fit guarantee; run all-frame PPF contact audit before accepting garment')
PY

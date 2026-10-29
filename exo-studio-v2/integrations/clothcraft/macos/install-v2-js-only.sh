#!/bin/bash
# Incremental signed V2 web release when texture/GLB libraries are already
# installed. Build JS/CSS only; do not duplicate multi-GB static assets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
WEB="$APP/Contents/Resources/web"
BACKUP_ROOT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
[[ -s "$WEB/index.html" && -d "$WEB/assets" ]] || { echo 'Installed V2 web bundle missing' >&2; exit 1; }
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist")" == 'com.mikristian.exo.clothcraft.workspace.v2' ]] || { echo 'Unexpected app identity' >&2; exit 1; }
ACTIVE_STAGES=(EXO01 R02 R03 S01 S10)
HAND_ASSETS=(hand-tracking/models/hand_landmarker.task
 hand-tracking/wasm/vision_wasm_internal.js hand-tracking/wasm/vision_wasm_internal.wasm
 hand-tracking/wasm/vision_wasm_nosimd_internal.js hand-tracking/wasm/vision_wasm_nosimd_internal.wasm)
[[ -s "$ROOT/public/stage-scenes/manifest.json" ]] || { echo 'Curated stage manifest missing' >&2; exit 1; }
for id in "${ACTIVE_STAGES[@]}"; do
  [[ -s "$ROOT/public/stage-scenes/$id.glb" && -s "$ROOT/public/stage-posters/$id.png" ]] || { echo "Missing curated $id assets" >&2; exit 1; }
done
for asset in "${HAND_ASSETS[@]}"; do
 [[ -s "$ROOT/public/$asset" ]] || { echo "Camera Hand asset missing: $asset" >&2; exit 1; }
done
mkdir -p "$BACKUP_ROOT"
STAGE="$(mktemp -d "$BACKUP_ROOT/.web-js-stage-XXXXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
cd "$ROOT"
export EXO_WEB_JS_STAGE="$STAGE"
export VITE_CLOTHCRAFT_BRIDGE_URL='http://127.0.0.1:5385'
node --input-type=module <<'JS'
import {build} from 'vite'
import viteConfig from './vite.config.mjs'
await build({...viteConfig,publicDir:false,build:{...viteConfig.build,outDir:process.env.EXO_WEB_JS_STAGE,emptyOutDir:true}})
JS
[[ -s "$STAGE/index.html" ]] || { echo 'JS build missing entrypoint' >&2; exit 1; }
grep -rlqF 'http://127.0.0.1:5385' "$STAGE/assets" || { echo 'Wrong native V2 bridge URL' >&2; exit 1; }
[[ -s "$WEB/fabric-scans/denim_fabric_06/color.jpg" && -s "$WEB/library-3d/MIKRISTIAN_Cathedral_House.glb" ]] || { echo 'Installed V2 asset library incomplete' >&2; exit 1; }
BACKUP="$(mktemp -d "$BACKUP_ROOT/web-js-before-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
cp -p "$WEB/index.html" "$BACKUP/index.html"
CREATED_ASSETS=()
mkdir -p "$WEB/stage-scenes" "$WEB/stage-posters"
mkdir -p "$BACKUP/legacy-stage-scenes" "$BACKUP/legacy-stage-posters" "$BACKUP/replaced-stage-scenes" "$BACKUP/replaced-stage-posters"
mkdir -p "$BACKUP/replaced-hand-assets"
for asset in "${HAND_ASSETS[@]}"; do
 [[ -s "$WEB/$asset" ]] && cmp -s "$ROOT/public/$asset" "$WEB/$asset" && continue
 mkdir -p "$(dirname "$WEB/$asset")" "$(dirname "$BACKUP/replaced-hand-assets/$asset")"
 if [[ -e "$WEB/$asset" ]]; then mv "$WEB/$asset" "$BACKUP/replaced-hand-assets/$asset"; else CREATED_ASSETS+=("$asset"); fi
 cp -p "$ROOT/public/$asset" "$WEB/$asset"
done
# Retain exactly the five restored quality scenes. Archive experimental
# extras rather than deleting any of the user's previous geometry.
for old in "$WEB/stage-scenes/"*.glb; do
  [[ -f "$old" ]] || continue
  keep=0
  for id in "${ACTIVE_STAGES[@]}"; do [[ "${old##*/}" == "$id.glb" ]] && keep=1; done
  [[ "$keep" == 0 ]] || continue
  mv "$old" "$BACKUP/legacy-stage-scenes/"
done
for old in "$WEB/stage-posters/"*.png; do
  [[ -f "$old" ]] || continue
  keep=0
  for id in "${ACTIVE_STAGES[@]}"; do [[ "${old##*/}" == "$id.png" ]] && keep=1; done
  [[ "$keep" == 0 ]] || continue
  mv "$old" "$BACKUP/legacy-stage-posters/"
done
if [[ -f "$WEB/stage-scenes/manifest.json" ]]; then mv "$WEB/stage-scenes/manifest.json" "$BACKUP/legacy-stage-scenes/manifest.json"; fi
cp -p "$ROOT/public/stage-scenes/manifest.json" "$WEB/stage-scenes/manifest.json"
for id in "${ACTIVE_STAGES[@]}"; do
 for asset in "stage-scenes/$id.glb" "stage-posters/$id.png"; do
  [[ -e "$WEB/$asset" && -s "$WEB/$asset" ]] && cmp -s "$ROOT/public/$asset" "$WEB/$asset" && continue
  bucket="replaced-${asset%%/*}"
  if [[ -e "$WEB/$asset" ]]; then mv "$WEB/$asset" "$BACKUP/$bucket/"; else CREATED_ASSETS+=("$asset"); fi
  cp -p "$ROOT/public/$asset" "$WEB/$asset"
 done
done
# Preserve prior hashed assets for rollback; the new entrypoint is the only
# pointer that activates a newly copied JS/CSS bundle.
cp -R "$STAGE/assets/." "$WEB/assets/"
INDEX_TEMP="$(mktemp "$WEB/.index-staged-XXXXXXXX")"
cp "$STAGE/index.html" "$INDEX_TEMP"
mv "$INDEX_TEMP" "$WEB/index.html"
if ! /usr/bin/codesign --force --deep --sign - "$APP" || ! /usr/bin/codesign --verify --deep --strict "$APP"; then
  cp "$BACKUP/index.html" "$WEB/index.html"
  for asset in "${CREATED_ASSETS[@]}"; do rm -f "$WEB/$asset"; done
  for asset in "${HAND_ASSETS[@]}"; do
   if [[ -f "$BACKUP/replaced-hand-assets/$asset" ]]; then
    mv "$BACKUP/replaced-hand-assets/$asset" "$WEB/$asset"
   fi
  done
  for id in "${ACTIVE_STAGES[@]}"; do
   for asset in "stage-scenes/$id.glb" "stage-posters/$id.png"; do
    [[ -f "$BACKUP/replaced-${asset%%/*}/${asset##*/}" ]] || continue
    mv "$BACKUP/replaced-${asset%%/*}/${asset##*/}" "$WEB/$asset"
   done
  done
  rm -f "$WEB/stage-scenes/manifest.json"
  for old in "$BACKUP/legacy-stage-scenes/"*; do [[ ! -f "$old" ]] || mv "$old" "$WEB/stage-scenes/"; done
  for old in "$BACKUP/legacy-stage-posters/"*; do [[ ! -f "$old" ]] || mv "$old" "$WEB/stage-posters/"; done
  /usr/bin/codesign --force --deep --sign - "$APP" || true
  echo 'Could not sign updated V2; previous web entrypoint restored.' >&2
  exit 1
fi
echo "Installed V2 UI and five original/restored 3D stages; experimental stage assets archived. Garments, other library assets and native solver preserved. Backup: $BACKUP"

#!/bin/bash
# EXO ClothCraft Studio V2 — bounded, signed UI-only development update.
# Never replaces the Rust session, Swift executable, saved garments or native
# project state. Active web assets are preserved for index rollback.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
RES="$APP/Contents/Resources"
OLD="$RES/web"
NEW="$ROOT/dist"
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/native-2d-construction-20261023-$(date +%H%M%S)"
EXPECTED='com.mikristian.exo.clothcraft.workspace.v2'
if [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)" != "$EXPECTED" ||
      ! -x "$APP/Contents/MacOS/EXOClothCraft" ||
      ! -x "$RES/research/oss/clothcraft/target/debug/exo-session" ||
      ! -s "$OLD/index.html" || ! -s "$RES/integrations/clothcraft/agent-api.mjs" ]];then
  echo 'Refusing UI-only update: installed V2 application identity/resources were not verified' >&2
  exit 1
fi
/usr/bin/codesign --verify --deep --strict "$APP"
[[ -s "$NEW/index.html" ]] || { echo 'No new Vite dist/index.html' >&2; exit 1; }
NEW_JS="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$NEW/index.html" | head -1)"
NEW_CSS="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.css' "$NEW/index.html" | head -1)"
[[ -n "$NEW_JS" && -n "$NEW_CSS" && -s "$NEW$NEW_JS" && -s "$NEW$NEW_CSS" ]] || {
  echo 'Incomplete EXO V2 web bundle, main JS/CSS missing' >&2; exit 1;
}
for expected in '2D Numerical Construction' '2D Physical Curve Station' 'Named measurements & formula' 'http://127.0.0.1:5385';do
  if ! grep -Fq "$expected" "$NEW$NEW_JS";then
    echo "Refusing incomplete app UI build: $expected is missing" >&2; exit 1
  fi
done

NATIVE_HASH_BEFORE="$(shasum -a 256 "$RES/research/oss/clothcraft/target/debug/exo-session" | awk '{print $1}')"
SWIFT_HASH_BEFORE="$(shasum -a 256 "$APP/Contents/MacOS/EXOClothCraft" | awk '{print $1}')"
mkdir -p "$BACKUP/assets"
cp -p "$OLD/index.html" "$BACKUP/index.html"
while IFS= read -r asset;do
  [[ -s "$OLD$asset" ]] || { echo "Existing signed app index points to missing asset $asset" >&2; exit 1; }
  cp -p "$OLD$asset" "$BACKUP/assets/"
done < <(grep -oE '/assets/[A-Za-z0-9_-]+\.(js|css)' "$OLD/index.html" | sort -u)

rollback(){
  if [[ -s "$BACKUP/index.html" ]];then
    cp -p "$BACKUP/index.html" "$OLD/index.html" || true
    /usr/bin/codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
    echo 'Restored prior EXO V2 web index; original assets remain in place.' >&2
  fi
}
NEEDS_ROLLBACK=false
on_exit(){
  if [[ "$NEEDS_ROLLBACK" == true ]];then rollback;fi
}
trap on_exit EXIT

# User-authored Rust workspace gets a Save before its native UI is restarted.
curl -fsS --connect-timeout 2 --max-time 12 -X POST \
  -H 'Origin: http://127.0.0.1:5386' -H 'Content-Type: application/json' \
  --data '{"op":"pause"}' http://127.0.0.1:5385/workspace >/dev/null
curl -fsS --connect-timeout 2 --max-time 12 -X POST \
  -H 'Origin: http://127.0.0.1:5386' -H 'Content-Type: application/json' \
  --data '{"op":"save"}' http://127.0.0.1:5385/workspace >/dev/null

# Content-hash filenames permit a no-delete install: any old open WKWebView
# may still request its original JS and CSS as it exits.
NEEDS_ROLLBACK=true
for asset in "$NEW"/assets/*;do
  [[ -f "$asset" ]] || continue
  cp -p "$asset" "$OLD/assets/"
done
# Optional read-only public audit evidence is shipped outside the hashed JS
# directory. Preserve old evidence and use ditto's merge rather than a delete
# or replacement of native/user-authored resources. Without this, the
# AccuMark screenshot gallery builds correctly but requests return 404 from
# the signed native web server after deployment.
if [[ -d "$NEW/audit-evidence" && ! -L "$NEW/audit-evidence" ]];then
  if [[ -L "$OLD/audit-evidence" ]];then
    echo 'Refusing to install screenshot evidence through a symlink' >&2
    exit 1
  fi
  mkdir -p "$OLD/audit-evidence"
  /usr/bin/ditto "$NEW/audit-evidence" "$OLD/audit-evidence"
fi
cp -p "$NEW/index.html" "$OLD/index.html"
/usr/bin/codesign --force --deep --sign - "$APP" >/dev/null
/usr/bin/codesign --verify --deep --strict "$APP"
[[ "$(shasum -a 256 "$RES/research/oss/clothcraft/target/debug/exo-session" | awk '{print $1}')" == "$NATIVE_HASH_BEFORE" ]]
[[ "$(shasum -a 256 "$APP/Contents/MacOS/EXOClothCraft" | awk '{print $1}')" == "$SWIFT_HASH_BEFORE" ]]
curl -fsS --connect-timeout 2 --max-time 8 "http://127.0.0.1:5386$NEW_JS" -o /dev/null || {
  echo 'Installed JS is not available over existing local native web server' >&2
  exit 1
}
curl -fsS --connect-timeout 2 --max-time 8 "http://127.0.0.1:5386$NEW_CSS" -o /dev/null || {
  echo 'Installed CSS is not available over existing local native web server' >&2
  exit 1
}
if [[ -d "$NEW/audit-evidence" ]];then
  for example in '/audit-evidence/official_ui/getting-started-05.png' '/audit-evidence/reviewed_frames/L8oT_aUW0t4_frame0277.png' '/audit-evidence/storyboards/L8oT_aUW0t4/sprite-000.jpg';do
    [[ -s "$OLD$example" ]] || {
      echo "Installed screenshot evidence missing: $example" >&2
      exit 1
    }
    curl -fsS --connect-timeout 2 --max-time 8 "http://127.0.0.1:5386$example" -o /dev/null || {
      echo "Installed screenshot evidence not served: $example" >&2
      exit 1
    }
  done
fi

NEEDS_ROLLBACK=false
trap - EXIT
echo "EXO V2 UI-only install verified: $NEW_JS"
echo "Saved original active web index and assets: $BACKUP"
echo 'Swift executable, native Rust executable, and user project data were not overwritten.'

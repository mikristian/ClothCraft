#!/bin/bash
# Replace ONLY the small stylesheet override in the existing signed V2 web
# release. Does not rebuild, swap the web directory, touch native Rust or
# mutate the saved garment. Intended for disks too full for the full installer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
ASSETS="$APP/Contents/Resources/web/assets"
BACKUP_ROOT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups"
[[ -d "$ASSETS" && -f "$ROOT/src/studioCustomizationTheme.css" ]] || exit 1
mapfile=()
while IFS= read -r filename; do mapfile+=("$filename"); done < <(find "$ASSETS" -maxdepth 1 -name 'index-*.css' -type f)
[[ "${#mapfile[@]}" == 1 ]] || { echo "Expected one signed release CSS bundle" >&2; exit 1; }
CSS="${mapfile[0]}"
mkdir -p "$BACKUP_ROOT"
BACKUP="$BACKUP_ROOT/2d-toolbar-css-before-$(date +%Y%m%d-%H%M%S).css"
[[ ! -e "$BACKUP" ]] || { echo "CSS backup already exists: $BACKUP" >&2; exit 1; }
cp -p "$CSS" "$BACKUP"
restore_previous(){
  cp "$BACKUP" "$CSS"
  /usr/bin/codesign --force --deep --sign - "$APP" || true
}
trap restore_previous ERR
python3 - "$ROOT/src/studioCustomizationTheme.css" "$CSS" <<'PY'
import pathlib,sys
source=pathlib.Path(sys.argv[1]).read_text()
css=pathlib.Path(sys.argv[2])
marker='/* The toolbars INSIDE the 2D drafting viewport use Liquid Glass.'
assert source.count(marker)==1,'Source toolbar style marker missing or duplicated'
before=css.read_text()
override=source[source.index(marker):]
assert 'prefers-reduced-transparency:reduce' in override
assert 'clo-right-tool-palette' in override
assert '.cc-board .cc-corner-tool-host' in override
# On second stylesheet-only updates, surgically replace only our earlier
# trailing override. The original minified release CSS must remain untouched.
if marker in before:
    assert before.count(marker)==1,'Ambiguous duplicated prior override'
    cut=before.index(marker)
    old=before[cut:]
    assert len(old)<12000,'Previous theme override unexpectedly large'
    assert '/* Share the EXISTING 3D clear optical-glass language with the 2D viewport.' in old and '.cc-board .cc-corner-tool-host' in old,'Unexpected old override; refusing mutation'
    assert old.strip().endswith('}'),'Previous override is truncated'
    result=before[:cut]+override+'\n'
else:
    result=before+'\n'+override+'\n'
css.write_text(result)
print('Verified stylesheet-only update, override bytes:',len(override.encode()))
PY
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
trap - ERR
echo "Theme CSS installed; original standalone stylesheet saved at $BACKUP"

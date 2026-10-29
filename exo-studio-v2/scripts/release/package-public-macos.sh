#!/usr/bin/env bash
# Package only the already GPL-cleared native_app build; never use the personal CLO bundle.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ARCH="${1:-arm64}"
case "$ARCH" in arm64|x86_64) ;; *) echo "Unsupported Mac architecture: $ARCH" >&2; exit 2 ;; esac
APP="native_app/build/$ARCH/GarmentStudioNative.app"
NAME="EXO-ClothCraft-Studio-V2-macOS-$ARCH-beta"
OUT="${EXO_RELEASE_OUTPUT:-$ROOT/release-artifacts}"
mkdir -p "$OUT"
if [[ ! -x "$APP/Contents/MacOS/GarmentStudioNative" ]]; then
  echo "Missing public macOS build $APP. Run the public native build workflow first." >&2
  exit 1
fi
if [[ ! -s "$APP/Contents/Resources/web/index.html" ]]; then
  echo 'Public app is missing its offline web workspace.' >&2; exit 1
fi
# DMG creation stages a full copy of the app before writing the compressed
# installer. Fail before copying when the destination volume is too full.
# Keep 1 GiB of headroom after allowing 2x app bytes for staging + DMG.
APP_KIB="$(du -sk "$APP" | awk '{print $1}')"
AVAILABLE_KIB="$(df -Pk "$OUT" | awk 'END {print $4}')"
REQUIRED_KIB="$(( APP_KIB * 2 + 1048576 ))"
if (( AVAILABLE_KIB < REQUIRED_KIB )); then
  echo "Insufficient release volume space: need ${REQUIRED_KIB} KiB, have ${AVAILABLE_KIB} KiB. Choose a larger EXO_RELEASE_OUTPUT volume or free regenerable caches." >&2
  exit 1
fi
if find "$APP" -iname '*thomas*' -print -quit | grep -q .; then
  echo 'Private avatar present in public release; refusing to package.' >&2; exit 1
fi
codesign --verify --deep --strict "$APP"
# No automatic public release: proper Developer ID signing and notarization must be
# independently verified before setting the release manifest verified=true.
DMG="$OUT/$NAME.dmg"
[[ ! -e "$DMG" ]] || { echo "Refusing to overwrite $DMG" >&2; exit 1; }
STAGE="$(mktemp -d "$OUT/.exo-stage.XXXXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/EXO ClothCraft Studio V2.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname 'EXO ClothCraft Studio V2' -srcfolder "$STAGE" -format UDZO -ov "$DMG"
(cd "$OUT" && shasum -a 256 "$(basename "$DMG")" > "$(basename "$DMG").sha256")
echo "Mac beta installer staged: $DMG"
echo 'NOT signed for public distribution or notarized: do not publish until verified.'

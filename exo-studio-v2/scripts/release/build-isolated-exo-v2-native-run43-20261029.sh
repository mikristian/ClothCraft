#!/bin/bash
# RUN43: build a separately identified native EXO app. This never rewrites
# ~/Applications/EXO ClothCraft Studio V2.app or the user's personal projects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$HOME/Applications/EXO ClothCraft Studio V2.app"
DEST="$ROOT/integrations/clothcraft/output/qa-native-run43-20261029"
APP="$DEST/EXO ClothCraft Studio V2 QA RUN43.app"
RES="$APP/Contents/Resources"
SWIFT="$ROOT/integrations/clothcraft/macos/EXOClothCraftWorkspaceV2.swift"
PROBE="$ROOT/integrations/clothcraft/macos/EXOClothCraftRun43NativeProbe.swift.fragment"

if [[ -e "$DEST" ]]; then
  echo "RUN43 refuses to overwrite an existing QA stage: $DEST" >&2; exit 2
fi
if [[ ! -x "$SOURCE/Contents/MacOS/EXOClothCraft" ||
      ! -s "$SOURCE/Contents/Resources/web/index.html" ||
      ! -s "$SWIFT" || ! -s "$PROBE" ]]; then
  echo "RUN43 missing reviewed source bundle or Swift QA source" >&2; exit 3
fi
/usr/bin/codesign --verify --deep --strict "$SOURCE"
[[ "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$SOURCE/Contents/Info.plist")" == "com.mikristian.exo.clothcraft.workspace.v2" ]] || exit 4
PERSONAL_PROJECT="$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace/fitting-project.json"
NATIVE_REL="Contents/Resources/research/oss/clothcraft/target/debug/exo-session"
[[ -s "$PERSONAL_PROJECT" && -x "$SOURCE/$NATIVE_REL" ]] || {
  echo 'Missing active production garment or verified native executable' >&2; exit 4
}
production_project_sha_before="$(/usr/bin/shasum -a 256 "$PERSONAL_PROJECT" | /usr/bin/awk '{print $1}')"
production_native_sha_before="$(/usr/bin/shasum -a 256 "$SOURCE/$NATIVE_REL" | /usr/bin/awk '{print $1}')"
production_index_sha_before="$(/usr/bin/shasum -a 256 "$SOURCE/Contents/Resources/web/index.html" | /usr/bin/awk '{print $1}')"
for port in 5485 5486; do
  if /usr/sbin/lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | /usr/bin/grep -q .; then
    echo "RUN43 refuses active QA port $port" >&2; exit 5
  fi
done
free_kib="$(/bin/df -Pk "$SOURCE" | /usr/bin/awk 'END {print $4}')"
(( free_kib >= 786432 )) || { echo "RUN43 requires 768MiB free" >&2; exit 6; }
if [[ -n "${EXO_RUN43_QA_NATIVE_BINARY:-}" ]]; then
  QA_SOURCE_MANIFEST="${EXO_RUN43_QA_RUST_SOURCE_MANIFEST:-}"
  [[ -n "$QA_SOURCE_MANIFEST" && "$QA_SOURCE_MANIFEST" == "$ROOT/"* ]] || {
    echo 'RUN44 requires repository-local Rust source manifest' >&2; exit 12
  }
  /bin/bash "$ROOT/scripts/release/check-run44-rust-source-manifest.sh" "$ROOT" "$QA_SOURCE_MANIFEST" || exit 12
fi

# APFS clone-on-write only; NEVER fallback to a full multigigabyte copy.
/bin/mkdir -p "$DEST"
/bin/cp -cR "$SOURCE" "$APP"
[[ -s "$RES/web/index.html" && -x "$RES/bin/node" ]] || exit 7

# Build an entirely separate Swift launcher, service identity, application
# support directory, logs, web origin and camera permission origin.
/usr/bin/python3 - "$SWIFT" "$PROBE" "$DEST/EXOClothCraftRUN43.swift" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[1]).read_text()
probe=Path(sys.argv[2]).read_text()
for old,new in (
 ('5385','5485'),
 ('5386','5486'),
 ('EXO-ClothCraft-Studio-V2','EXO-ClothCraft-Studio-V2-QA-Run43'),
 ('EXO ClothCraft Studio V2','EXO ClothCraft Studio V2 QA RUN43'),
):
    if old not in source: raise SystemExit('Swift QA isolation token absent: '+old)
    source=source.replace(old,new)
injection='    private func startServices() throws {'
if source.count(injection)!=1:raise SystemExit('Swift service insertion is ambiguous')
source=source.replace(injection,probe+'\n'+injection,1)
finish='    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {\n'
if source.count(finish)!=1:raise SystemExit('Swift WKNavigation insertion is ambiguous')
source=source.replace(finish,finish+
  '        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in\n'
  '            self?.run43NativeWKWebViewProbe()\n'
  '        }\n',1)
for token in ('5385','5386','EXO-ClothCraft-Studio-V2/'):
    if token in source:raise SystemExit('Unisolated original token '+token)
Path(sys.argv[3]).write_text(source)
print('RUN43 isolated Swift: web 5486, bridge 5485, data/logs/cache separate')
PY

# Rewrite only cloned first-party web and Node JS, not signed executables,
# binary models, WebAssembly, personally saved projects or original app.
/usr/bin/python3 - "$RES" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
paths=list((r/'web/assets').glob('*.js'))
paths += list((r/'integrations/clothcraft').glob('*.mjs'))
paths += list((r/'src/core').rglob('*.mjs')) if (r/'src/core').is_dir() else []
count=0
for file in dict.fromkeys(paths):
    if file.is_symlink() or not file.is_file():raise SystemExit('Unsafe staged file '+str(file))
    original=file.read_bytes()
    changed=original
    for old,new in (
      (b'127.0.0.1:5385',b'127.0.0.1:5485'),
      (b'127.0.0.1:5386',b'127.0.0.1:5486'),
      (b'localhost:5385',b'localhost:5485'),
      (b'localhost:5386',b'localhost:5486'),
    ):changed=changed.replace(old,new)
    if changed!=original:file.write_bytes(changed);count+=1
    if b'127.0.0.1:5385' in changed or b'localhost:5385' in changed:
        raise SystemExit('Production backend remained in QA asset: '+str(file))
if count<2:raise SystemExit('Insufficient QA frontend/backend isolation rewrites')
print('RUN43 isolated JS assets/modules',count)
PY

/usr/bin/xcrun swiftc -parse-as-library -O -target arm64-apple-macos13.0 -framework AppKit -framework WebKit "$DEST/EXOClothCraftRUN43.swift" -o "$DEST/EXOClothCraft"
/bin/cp "$DEST/EXOClothCraft" "$APP/Contents/MacOS/EXOClothCraft"
# RUN44: optional exact Rust runtime substitution into the *disposable*
# candidate only. The signed installed application is never modified.
# Fail closed on missing/mismatched source, before bundle resigning.
if [[ -n "${EXO_RUN43_QA_NATIVE_BINARY:-}" ]]; then
  QA_NATIVE_SOURCE="${EXO_RUN43_QA_NATIVE_BINARY}"
  QA_NATIVE_EXPECTED_SHA="${EXO_RUN43_QA_NATIVE_EXPECTED_SHA:-}"
  /bin/bash "$ROOT/scripts/release/check-run44-rust-source-manifest.sh" "$ROOT" "$QA_SOURCE_MANIFEST" || exit 12
  [[ -f "$QA_NATIVE_SOURCE" && -x "$QA_NATIVE_SOURCE" &&
     "$QA_NATIVE_SOURCE" == "$ROOT/"* &&
     "$QA_NATIVE_SOURCE" != "$APP/"* &&
     "$QA_NATIVE_EXPECTED_SHA" =~ ^[a-f0-9]{64}$ ]] || {
    echo 'RUN44 refuses missing/outside-repo QA binary or SHA' >&2; exit 8
  }
  actual_qa_sha="$(/usr/bin/shasum -a 256 "$QA_NATIVE_SOURCE" | /usr/bin/awk '{print $1}')"
  [[ "$actual_qa_sha" == "$QA_NATIVE_EXPECTED_SHA" ]] || {
    echo 'RUN44 QA Rust executable source hash changed' >&2; exit 9
  }
  QA_NATIVE_DEST="$RES/research/oss/clothcraft/target/debug/exo-session"
  [[ -x "$QA_NATIVE_DEST" && ! -L "$QA_NATIVE_DEST" ]] || exit 10
  /bin/cp "$QA_NATIVE_SOURCE" "$QA_NATIVE_DEST"
  [[ "$(/usr/bin/shasum -a 256 "$QA_NATIVE_DEST" | /usr/bin/awk '{print $1}')" == "$QA_NATIVE_EXPECTED_SHA" ]] || exit 10
  echo "RUN44_QA_UNSIGNING_RUST_BINARY_SHA=$QA_NATIVE_EXPECTED_SHA"
fi
/usr/libexec/PlistBuddy -c 'Set CFBundleIdentifier com.mikristian.exo.clothcraft.workspace.v2.qa.run43' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set CFBundleName EXO ClothCraft Studio V2 QA RUN43' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set CFBundleDisplayName EXO ClothCraft Studio V2 QA RUN43' "$APP/Contents/Info.plist"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
/usr/bin/plutil -lint "$APP/Contents/Info.plist"
if [[ -n "${EXO_RUN43_QA_NATIVE_BINARY:-}" ]]; then
  echo "RUN44_QA_SIGNED_RUST_SHA=$(/usr/bin/shasum -a 256 "$QA_NATIVE_DEST" | /usr/bin/awk '{print $1}')"
  "$QA_NATIVE_DEST" --exo-capabilities | /usr/bin/head -c 1600
  echo
fi
[[ "$(/usr/bin/shasum -a 256 "$PERSONAL_PROJECT" | /usr/bin/awk '{print $1}')" == "$production_project_sha_before" &&
   "$(/usr/bin/shasum -a 256 "$SOURCE/$NATIVE_REL" | /usr/bin/awk '{print $1}')" == "$production_native_sha_before" &&
   "$(/usr/bin/shasum -a 256 "$SOURCE/Contents/Resources/web/index.html" | /usr/bin/awk '{print $1}')" == "$production_index_sha_before" ]] || {
  echo 'FAIL: production source, native executable or garment changed during QA staging' >&2; exit 11
}
echo "RUN43_SIGNED_QA_BUNDLE_READY=$APP"
echo "PRODUCTION_APP_NOT_MODIFIED=$SOURCE"
/bin/df -h "$DEST" | /usr/bin/tail -1

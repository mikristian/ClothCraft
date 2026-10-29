#!/usr/bin/env bash
# Fail-closed EXO ClothCraft Studio V2 PUBLIC binary publication gate.
# The smaller GarmentStudioNative preview is NOT the full Studio V2.
# This intentionally cannot be made to pass by checking only source filenames
# or by uploading a source ZIP assembled from unrelated build revisions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

errors=0
failed() { printf 'BLOCKED: %s\n' "$*" >&2; errors=$((errors + 1)); }
passed() { printf 'CHECK: %s\n' "$*"; }
APP="${EXO_FULL_V2_APP:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
RELEASE_SOURCE_REF="${EXO_RELEASE_SOURCE_REF:-origin/main}"
if ! git rev-parse --verify "$RELEASE_SOURCE_REF^{commit}" >/dev/null 2>&1; then
  failed "missing auditable source revision: $RELEASE_SOURCE_REF"
fi

if [[ -x "$APP/Contents/MacOS/EXOClothCraft" ]]; then
  passed 'full EXOClothCraft launcher found'
else
  failed 'full EXOClothCraft executable missing; preview is not equivalent'
fi
if [[ -s "$APP/Contents/Resources/web/index.html" ]]; then
  passed 'bundled web workspace index present'
else
  failed 'bundled offline web workspace missing'
fi
for binary in \
  bin/node \
  native_cpp/build-cmake/garment_cad_cli \
  research/oss/clothcraft/target/debug/cloth-template \
  research/oss/clothcraft/target/debug/cloth-fit \
  research/oss/clothcraft/target/debug/exo-session \
  integrations/clothcraft/rust-service/target/debug/exo-metadata-validation \
  integrations/clothcraft/rust-agent-api/target/debug/exo-agent-validator \
  integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host; do
  [[ -x "$APP/Contents/Resources/$binary" ]] || failed "missing bundled dependency $binary"
done
if [[ -e "$APP/Contents/Resources/web/clo-hardware-converted" || \
      -e "$APP/Contents/Resources/web/avatars/clo-thomas.glb" ]]; then
  failed 'private CLO assets included in candidate'
fi
if command -v rg >/dev/null 2>&1 && \
   rg -a -l -F "$HOME/" "$APP/Contents" | grep -q .; then
  failed 'personal home paths present in compiled app or resources'
fi

# GPL corresponding source requires the actual source, including modified
# transitive solver code and build/install scripts, not just an MIT license.
for source in \
  research/oss/clothcraft/src/bin/exo-session.rs \
  research/oss/clothcraft/src/garment/cutline.rs \
  research/oss/clothcraft/Cargo.toml \
  research/oss/clothcraft/Cargo.lock \
  integrations/clothcraft/macos/EXOClothCraftWorkspaceV2.swift \
  integrations/clothcraft/macos/build.sh \
  integrations/clothcraft/rust-service/src/main.rs \
  integrations/clothcraft/rust-agent-api/src/main.rs \
  integrations/clothcraft/rust-static-host/src/main.rs; do
  if git cat-file -e "$RELEASE_SOURCE_REF:$source" 2>/dev/null; then
    passed "corresponding-source file in $RELEASE_SOURCE_REF: $source"
  else
    failed "not present in candidate public source revision $RELEASE_SOURCE_REF: $source"
  fi
done

if [[ -d research/oss/clothcraft/.git ]]; then
  nested_dirty="$(git -C research/oss/clothcraft status --porcelain | wc -l | tr -d ' ')"
  [[ "$nested_dirty" == '0' ]] || failed "nested ClothCraft fork has $nested_dirty uncommitted changes; exact solver source revision not locked"
fi
for file in src/App.jsx src/components/ClothCraftWorkspace.jsx integrations/clothcraft/macos/build.sh; do
  if [[ -f "$file" ]] && ! git diff --quiet "$RELEASE_SOURCE_REF" -- "$file"; then
    failed "working source differs from selected EXO source revision: $file"
  fi
done

printf 'IMPORTANT: A clean source-only build of the exact app, third-party notice/SBOM review,\n'
printf 'and independent clean-Mac GUI install are separate mandatory release approvals.\n'
if (( errors > 0 )); then
  printf 'FULL_EXO_V2_PUBLICATION_GATE_BLOCKED: %d concrete issue(s)\n' "$errors" >&2
  exit 1
fi
# A passing inventory above alone does not certify source parity or clean
# installation; this script is an evidence collector, NOT permission to publish.
echo 'SOURCE_FILE_INVENTORY_PASS_ONLY — do not publish without separate approvals'

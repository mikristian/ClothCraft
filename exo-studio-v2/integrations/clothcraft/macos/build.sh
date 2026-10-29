#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO Sample 3D ClothCraft.app}"
RES="$APP/Contents/Resources"
mkdir -p "$RES/bin" "$RES/integrations/clothcraft" "$RES/native_cpp/build-cmake" \
  "$RES/research/oss/clothcraft/target/debug" "$RES/research/oss/clothcraft/assets/makehuman" \
  "$RES/collision-avatars" "$APP/Contents/MacOS"

# Build into a private staging directory. Other EXO development/QA processes
# can concurrently rebuild dist/, so copying shared dist/ could ship a partial
# app or a bundle configured for the developer's 5193 bridge.
STAGED_WEB="$(mktemp -d "$ROOT/integrations/clothcraft/output/release-v2-web-XXXXXXXX")"
trap 'rm -rf "$STAGED_WEB"' EXIT
EXPECTED_BRIDGE="${EXO_BUILD_BRIDGE_URL:-http://127.0.0.1:5283}"
node scripts/build-rust-grading-kernel.mjs
node scripts/build-rust-sewing-kernel.mjs
node scripts/build-rust-foam-kernel.mjs
node scripts/build-rust-vector-fit-kernel.mjs
node scripts/build-rust-construction-kernel.mjs
node scripts/build-rust-free-sewing-kernel.mjs
node scripts/build-rust-strain-kernel.mjs
node scripts/build-rust-mesh-selection-kernel.mjs
node rust/exo_fabric_cost_kernel/build.mjs
node scripts/build-rust-selection-metrics-kernel.mjs
node rust/exo_measurement_kernel/build.mjs
node scripts/build-rust-allowance-preview-kernel.mjs
node scripts/build-rust-sewing-guide-kernel.mjs
node scripts/build-rust-label-layout-kernel.mjs
node scripts/build-rust-material-guide-kernel.mjs
node scripts/build-rust-preflight-crossing-kernel.mjs
node scripts/build-rust-curve-draft-kernel.mjs
node scripts/build-rust-tangent-drag-kernel.mjs
node scripts/build-rust-body-arrangement-kernel.mjs
node scripts/build-rust-notch-preset-kernel.mjs
node scripts/build-rust-preflight-kernel.mjs
node scripts/build-rust-fabric-kernel.mjs
node scripts/build-rust-bom-kernel.mjs
node scripts/build-rust-marker-kernel.mjs
node scripts/build-rust-restore-kernel.mjs
node scripts/build-rust-preview-offset-kernel.mjs
node scripts/build-rust-export-contour-kernel.mjs
node scripts/build-rust-svg-affine-kernel.mjs
node scripts/build-rust-unfold-kernel.mjs
node scripts/build-rust-mesh-quality-kernel.mjs
node scripts/build-rust-auto-fit-placement-kernel.mjs
node scripts/build-rust-precision-polar-kernel.mjs
node scripts/build-rust-quality-flip-kernel.mjs
node scripts/build-rust-fit-telemetry-kernel.mjs
node scripts/build-rust-timestep-kernel.mjs
node scripts/build-rust-avatar-contact-parameters-kernel.mjs
node scripts/build-rust-self-collision-kernel.mjs
node scripts/build-rust-avatar-clearance-kernel.mjs
node scripts/build-rust-distance-constraint-kernel.mjs
node scripts/build-rust-pbd-kernel.mjs
node scripts/build-rust-structural-strain-kernel.mjs
node scripts/build-rust-anchor-kernel.mjs
VITE_CLOTHCRAFT_BRIDGE_URL="$EXPECTED_BRIDGE" npm run build -- --outDir "$STAGED_WEB"
test -s "$STAGED_WEB/index.html"
if ! grep -rlq --fixed-strings "$EXPECTED_BRIDGE" "$STAGED_WEB/assets"; then
  echo "Incorrect native bridge URL in staged web app: $EXPECTED_BRIDGE" >&2
  exit 1
fi
rsync -a --delete "$STAGED_WEB/" "$RES/web/"
for required in index.html wasm/exo_ui_kernel.wasm wasm/exo_grading_kernel.wasm \
  wasm/exo_sewing_kernel.wasm wasm/exo_foam_kernel.wasm wasm/exo_vector_fit_kernel.wasm \
  wasm/exo_construction_kernel.wasm wasm/exo_free_sewing_kernel.wasm \
  wasm/exo_strain_kernel.wasm wasm/exo_mesh_selection_kernel.wasm \
  wasm/exo_fabric_cost_kernel.wasm wasm/exo_selection_metrics_kernel.wasm \
  wasm/exo_measurement_kernel.wasm wasm/exo_allowance_preview_kernel.wasm \
  wasm/exo_sewing_guide_kernel.wasm wasm/exo_label_layout_kernel.wasm \
  wasm/exo_material_guide_kernel.wasm wasm/exo_preflight_crossing_kernel.wasm \
  wasm/exo_mesh_quality_kernel.wasm \
  wasm/exo_auto_fit_placement_kernel.wasm \
  wasm/exo_precision_polar_kernel.wasm \
  wasm/exo_quality_flip_kernel.wasm \
  wasm/exo_fit_telemetry_kernel.wasm \
  wasm/exo_timestep_kernel.wasm \
  wasm/exo_avatar_contact_parameters_kernel.wasm \
  wasm/exo_self_collision_kernel.wasm \
  wasm/exo_avatar_clearance_kernel.wasm \
  wasm/exo_distance_constraint_kernel.wasm \
  wasm/exo_pbd_kernel.wasm \
  wasm/exo_structural_strain_kernel.wasm \
  wasm/exo_anchor_kernel.wasm \
  wasm/exo_curve_draft_kernel.wasm \
  wasm/exo_tangent_drag_kernel.wasm \
  wasm/exo_body_arrangement_kernel.wasm \
  wasm/exo_notch_preset_kernel.wasm \
  wasm/exo_preflight_kernel.wasm \
  wasm/exo_fabric_kernel.wasm wasm/exo_bom_kernel.wasm \
  wasm/exo_marker_kernel.wasm \
  wasm/exo_restore_kernel.wasm \
  wasm/exo_preview_offset_kernel.wasm \
  wasm/exo_export_contour_kernel.wasm \
  wasm/exo_svg_affine_kernel.wasm \
  wasm/exo_unfold_kernel.wasm \
  fabric-scans/denim_fabric_06/color.jpg \
  hardware-thumbnails/four-hole-shirt-button.png \
  library-3d/MIKRISTIAN_Cathedral_House.glb \
  avatars/preview/clo-thomas.glb \
  hangers/wood.png hangers/chrome.png hangers/velvet.png \
  hangers/padded.png hangers/trouser-clip.png \
  hangers/innerscene-shoulder-form.glb hangers/innerscene-clip-rail.glb \
  hardware-premium/d-ring.glb hardware-premium/d-ring.png \
  hardware-premium/prong-buckle.glb hardware-premium/prong-buckle.png \
  hardware-premium/slide-adjuster.glb hardware-premium/slide-adjuster.png; do
  if [[ "${EXO_PUBLIC_DISTRIBUTION:-0}" == 1 ]]; then
    # Optional private clothing scans, accessories and legacy CLO previews
    # are NOT prerequisites for a redistributable core 2D/3D beta.
    case "$required" in
      fabric-scans/*|hardware-thumbnails/*|library-3d/*|avatars/preview/clo-thomas.glb|hangers/*|hardware-premium/*)
        continue ;;
    esac
  fi
  if [[ ! -s "$RES/web/$required" ]]; then
    echo "Incomplete EXO desktop web asset copy: $required" >&2
    exit 1
  fi
done
if [[ "${EXO_PUBLIC_DISTRIBUTION:-0}" == 1 ]]; then
  rm -rf "$RES/web/clo-hardware-converted" "$RES/web/audit-evidence" \
    "$RES/web/stage-scenes" "$RES/web/hardware-premium" "$RES/web/library-3d" \
    "$RES/web/fabric-scans" "$RES/web/fabric-scans-ambientcg" \
    "$RES/web/hand-tracking" "$RES/web/stage-posters" "$RES/web/hangers" \
    "$RES/web/hardware-thumbnails" "$RES/web/garment-previews" \
    "$RES/web/avatars/opensew"
  rm -f "$RES/web/avatars/clo-thomas.glb" "$RES/web/avatars/preview/clo-thomas.glb"
fi

# Personal offline build only: the user's existing private CLO export and CC0
# MPFB avatars live outside this tracked Git worktree. Never add them to Git
# or the public release. Missing files stay unavailable in the UI.
if [[ "${EXO_INCLUDE_PERSONAL_AVATARS:-1}" == "1" ]]; then
  AVATAR_ROOT="${EXO_PERSONAL_AVATAR_ROOT:-$ROOT/../garment-studio/public/avatars}"
  THOMAS_OBJ="${EXO_PERSONAL_THOMAS_OBJ:-$ROOT/../garment-studio/native_app/assets/clo-thomas.obj}"
  if [[ -s "$AVATAR_ROOT/clo-thomas.glb" ]]; then
    cp "$AVATAR_ROOT/clo-thomas.glb" "$RES/web/avatars/clo-thomas.glb"
    echo "Included local user-owned Thomas avatar in personal .app only"
  else
    echo "Thomas private export unavailable; its UI option will be disabled" >&2
  fi
  mkdir -p "$RES/web/avatars/opensew"
  for character in theo nora; do
    if [[ -s "$AVATAR_ROOT/opensew/$character.glb" ]]; then
      cp "$AVATAR_ROOT/opensew/$character.glb" "$RES/web/avatars/opensew/$character.glb"
    fi
  done
  if [[ -f "$AVATAR_ROOT/opensew/README.md" ]]; then
    cp "$AVATAR_ROOT/opensew/README.md" "$RES/web/avatars/opensew/README.md"
  fi
  if [[ -s "$THOMAS_OBJ" ]]; then
    python3 integrations/clothcraft/prepare_avatar_collider.py "$THOMAS_OBJ" "$RES/collision-avatars/thomas-body.obj"
    echo "Prepared local body-only CLO Thomas collider without committing the source"
  else
    rm -f "$RES/collision-avatars/thomas-body.obj"
  fi
else
  rm -f "$RES/collision-avatars/thomas-body.obj" "$RES/web/avatars/clo-thomas.glb" \
    "$RES/web/avatars/opensew/theo.glb" "$RES/web/avatars/opensew/nora.glb"
fi
python3 integrations/clothcraft/prepare_avatar_collider.py public/avatars/makehuman-base.obj \
  "$RES/collision-avatars/makehuman-body.obj" --body-name body

NODE_BIN="${EXO_NODE_BIN:-$(command -v node)}"
test -x "$NODE_BIN"
cp "$NODE_BIN" "$RES/bin/node"
chmod 755 "$RES/bin/node"
# Bundle the complete direct ESM import closure. A successful web build is
# useless if the installed localhost native service throws MODULE_NOT_FOUND.
for file in bridge.mjs server.mjs contact_run.mjs workspace.mjs static.mjs agent-api.mjs mcp-server.mjs \
  avatarPersistenceContract.mjs agent-key-store.mjs collaboration.mjs apple-vision-hand.mjs \
  pattern-intelligence-catalog.mjs seamly2dEngineRoute20261023.mjs seamly2dNativeEngine20261023.mjs \
  seamlyAamaReceivingRoundtrip20261023.mjs gridcraftBridge.mjs; do
  test -s "integrations/clothcraft/$file" || { echo "Required EXO service module missing: $file" >&2; exit 1; }
  cp "integrations/clothcraft/$file" "$RES/integrations/clothcraft/$file"
done
mkdir -p "$RES/src/core/backends" "$RES/src/core"
for file in src/core/backends/nativeOrderedAssembly20261025.mjs src/core/seamlyAamaManufacturingSemantics20261023.mjs; do
  test -s "$file" || { echo "Required EXO service dependency missing: $file" >&2; exit 1; }
  cp "$file" "$RES/$file"
done
# The workspace imports this adapter; its relative binary lookup is preserved
# inside Contents/Resources so future installed builds use actual Rust.
VALIDATOR_SRC="integrations/clothcraft/rust-service"
VALIDATOR_DEST="$RES/integrations/clothcraft/rust-service"
test -s "$VALIDATOR_SRC/validator-client.mjs"
test -x "$VALIDATOR_SRC/target/debug/exo-metadata-validation"
mkdir -p "$VALIDATOR_DEST/target/debug"
cp "$VALIDATOR_SRC/validator-client.mjs" "$VALIDATOR_DEST/validator-client.mjs"
cp "$VALIDATOR_SRC/target/debug/exo-metadata-validation" "$VALIDATOR_DEST/target/debug/exo-metadata-validation"
chmod 755 "$VALIDATOR_DEST/target/debug/exo-metadata-validation"
test -s "$RES/integrations/clothcraft/workspace.mjs"
test -s "$VALIDATOR_DEST/validator-client.mjs"
test -x "$VALIDATOR_DEST/target/debug/exo-metadata-validation"
AGENT_SRC="integrations/clothcraft/rust-agent-api"
AGENT_DEST="$RES/integrations/clothcraft/rust-agent-api"
test -s "$AGENT_SRC/client.mjs"
test -x "$AGENT_SRC/target/debug/exo-agent-validator"
mkdir -p "$AGENT_DEST/target/debug"
cp "$AGENT_SRC/client.mjs" "$AGENT_DEST/client.mjs"
cp "$AGENT_SRC/target/debug/exo-agent-validator" "$AGENT_DEST/target/debug/exo-agent-validator"
chmod 755 "$AGENT_DEST/target/debug/exo-agent-validator"
test -x "$AGENT_DEST/target/debug/exo-agent-validator"
STATIC_HOST_SRC="integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host"
STATIC_HOST_DEST="$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host"
test -x "$STATIC_HOST_SRC"
mkdir -p "$(dirname "$STATIC_HOST_DEST")"
cp "$STATIC_HOST_SRC" "$STATIC_HOST_DEST"
chmod 755 "$STATIC_HOST_DEST"
test -x "$STATIC_HOST_DEST"
cp native_cpp/build-cmake/garment_cad_cli "$RES/native_cpp/build-cmake/garment_cad_cli"
for binary in cloth-template cloth-fit exo-session; do
  cp "research/oss/clothcraft/target/debug/$binary" "$RES/research/oss/clothcraft/target/debug/$binary"
done
cp research/oss/clothcraft/Cargo.toml "$RES/research/oss/clothcraft/Cargo.toml"
cp research/oss/clothcraft/LICENSE "$RES/research/oss/clothcraft/LICENSE"
cp research/oss/clothcraft/assets/makehuman/mannequin.obj "$RES/research/oss/clothcraft/assets/makehuman/mannequin.obj"
cp research/oss/clothcraft/assets/makehuman/LICENSE.ASSETS.md "$RES/research/oss/clothcraft/assets/makehuman/LICENSE.ASSETS.md"

xcrun swiftc -parse-as-library -O -target "arm64-apple-macos13.0" -framework AppKit -framework WebKit \
  "${EXO_DESKTOP_SWIFT_SOURCE:-integrations/clothcraft/macos/EXOClothCraft.swift}" -o "$APP/Contents/MacOS/EXOClothCraft"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.mikristian.exo.clothcraft.personal</string>
  <key>CFBundleName</key><string>EXO Sample 3D ClothCraft</string>
  <key>CFBundleDisplayName</key><string>EXO Sample 3D</string>
  <key>CFBundleExecutable</key><string>EXOClothCraft</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSCameraUsageDescription</key><string>Camera Fabric Hand uses your camera locally to track pinch gestures and move simulated cloth. Camera video is not saved.</string>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
chmod 755 "$APP/Contents/MacOS/EXOClothCraft" "$RES/native_cpp/build-cmake/garment_cad_cli" \
  "$RES/research/oss/clothcraft/target/debug/cloth-template" "$RES/research/oss/clothcraft/target/debug/cloth-fit"
if [[ "${EXO_PUBLIC_DISTRIBUTION:-0}" == 1 ]]; then
  python3 scripts/release/stage-desktop-node-module-closure.py "$APP"
fi
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/plutil -lint "$APP/Contents/Info.plist"
echo "Built macOS application: $APP"

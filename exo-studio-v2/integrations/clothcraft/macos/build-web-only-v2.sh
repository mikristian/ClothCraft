#!/bin/bash
# Update ONLY EXO V2's embedded web UI. The installed Swift executable, Rust
# binaries, native workspace and user project files are intentionally retained.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
APP="${EXO_DESKTOP_DEST:-$HOME/Applications/EXO ClothCraft Studio V2.app}"
RES="$APP/Contents/Resources"
# This route builds dozens of Rust WASM kernels and a multi-hundred-MiB web
# bundle on the LOCAL volume. Check before staging, altering source WASM or
# replacing any installed web UI; remote Expansion WebDAV does not supply
# executable Cargo scratch space.
FREE_BUILD_KIB="$(/bin/df -Pk "$ROOT" | /usr/bin/awk 'END {print $4}')"
if [[ ! "$FREE_BUILD_KIB" =~ ^[0-9]+$ ]] || (( FREE_BUILD_KIB < 2097152 )); then
  echo "EXO_WEB_ONLY_BUILD_REFUSED_LOCAL_DISK_HEADROOM: require >=2GiB before WASM/UI build; have ${FREE_BUILD_KIB:-unknown} KiB" >&2
  exit 6
fi
EXPECTED_BUNDLE='com.mikristian.exo.clothcraft.workspace.v2'
ACTUAL_BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)
if [[ "$ACTUAL_BUNDLE" != "$EXPECTED_BUNDLE" || ! -x "$APP/Contents/MacOS/EXOClothCraft" ]];then
  echo 'Refusing web-only installation: EXO V2 application identity not verified' >&2
  exit 1
fi
if [[ ! -s "$RES/integrations/clothcraft/agent-api.mjs" || ! -x "$RES/research/oss/clothcraft/target/debug/exo-session" ]];then
  echo 'Refusing update: installed EXO V2 native service resources missing' >&2
  exit 1
fi

mkdir -p "$ROOT/integrations/clothcraft/output"
BUILD="$(mktemp -d "$ROOT/integrations/clothcraft/output/web-only-v2-XXXXXXXX")"
trap 'rm -rf "$BUILD"' EXIT
echo 'Compiling the shared Rust fabric math to WebAssembly'
node scripts/build-rust-fabric-kernel.mjs
echo 'Compiling the shared Rust drafting and measurement geometry to WebAssembly'
node scripts/build-rust-geometry-kernel.mjs
echo 'Compiling Rust multi-size garment grading to WebAssembly'
node scripts/build-rust-grading-kernel.mjs
echo 'Compiling Rust native sewing length diagnostics to WebAssembly'
node scripts/build-rust-sewing-kernel.mjs
echo 'Compiling Rust foam preview physics to WebAssembly'
node scripts/build-rust-foam-kernel.mjs
echo 'Compiling Rust freehand drafting geometry to WebAssembly'
node scripts/build-rust-vector-fit-kernel.mjs
echo 'Compiling Rust analytic drafting constructions to WebAssembly'
node scripts/build-rust-construction-kernel.mjs
echo 'Compiling Rust Free Sewing material cutline geometry to WebAssembly'
node scripts/build-rust-free-sewing-kernel.mjs
echo 'Compiling Rust 3D principal strain visualization to WebAssembly'
node scripts/build-rust-strain-kernel.mjs
echo 'Compiling Rust 3D mesh face selection to WebAssembly'
node scripts/build-rust-mesh-selection-kernel.mjs
echo 'Compiling Rust manufacturing marker cost totals to WebAssembly'
node rust/exo_fabric_cost_kernel/build.mjs
echo 'Compiling Rust native sewing interval measurements to WebAssembly'
node scripts/build-rust-selection-metrics-kernel.mjs
echo 'Compiling Rust manufacturing POM span calculations to WebAssembly'
node rust/exo_measurement_kernel/build.mjs
echo 'Compiling Rust seam allowance offset preview to WebAssembly'
node scripts/build-rust-allowance-preview-kernel.mjs
echo 'Compiling Rust sewing correspondence overlay sampling to WebAssembly'
node scripts/build-rust-sewing-guide-kernel.mjs
echo 'Compiling Rust pattern label collision layout to WebAssembly'
node scripts/build-rust-label-layout-kernel.mjs
echo 'Compiling Rust material guide interval geometry to WebAssembly'
node scripts/build-rust-material-guide-kernel.mjs
echo 'Compiling Rust factory preflight crossing tests to WebAssembly'
node scripts/build-rust-preflight-crossing-kernel.mjs
echo 'Compiling Rust 2D curve drafting station and dimensional geometry to WebAssembly'
node scripts/build-rust-curve-draft-kernel.mjs
echo 'Compiling Rust physical free-curve tangent handle delta geometry'
node scripts/build-rust-tangent-drag-kernel.mjs
echo 'Compiling Rust pattern anatomical arrangement and initial 3D offsets'
node scripts/build-rust-body-arrangement-kernel.mjs
echo 'Compiling Rust sewing balance notch preset fractions'
node scripts/build-rust-notch-preset-kernel.mjs
echo 'Compiling Rust manufacturing preflight numeric predicates and status'
node scripts/build-rust-preflight-kernel.mjs
node scripts/build-rust-fabric-kernel.mjs
node scripts/build-rust-bom-kernel.mjs
node scripts/build-rust-marker-kernel.mjs
node scripts/build-rust-restore-kernel.mjs
node scripts/build-rust-preview-offset-kernel.mjs
node scripts/build-rust-export-contour-kernel.mjs
echo 'Compiling Rust SVG affine matrix and point transformation kernel'
node scripts/build-rust-svg-affine-kernel.mjs
echo 'Compiling Rust 2D unfold edge mapping and grading reflection kernel'
node scripts/build-rust-unfold-kernel.mjs
echo 'Compiling Rust cloth triangle mesh quality diagnostics to WebAssembly'
node scripts/build-rust-mesh-quality-kernel.mjs
echo 'Compiling Rust safe 3D auto-fit rigid placement limits to WebAssembly'
node scripts/build-rust-auto-fit-placement-kernel.mjs
echo 'Compiling Rust precision drafting polar geometry to WebAssembly'
node scripts/build-rust-precision-polar-kernel.mjs
echo 'Compiling Rust conservative interior triangle flip numerical predicates'
node scripts/build-rust-quality-flip-kernel.mjs
echo 'Compiling Rust measured simulation fit telemetry predicates'
node scripts/build-rust-fit-telemetry-kernel.mjs
echo 'Compiling Rust cloth solver timestep scheduling arithmetic'
node scripts/build-rust-timestep-kernel.mjs
echo 'Compiling Rust avatar contact clearance parameters'
node scripts/build-rust-avatar-contact-parameters-kernel.mjs
echo 'Compiling Rust self-collision pair corrections and avatar clearance numerics'
node scripts/build-rust-self-collision-kernel.mjs
node scripts/build-rust-avatar-clearance-kernel.mjs
echo 'Compiling Rust structural, sewn and fusible distance projection numerics'
node scripts/build-rust-distance-constraint-kernel.mjs
echo 'Compiling Rust batched PBD distance-constraint sweeps'
node scripts/build-rust-pbd-kernel.mjs
echo 'Compiling Rust structural cloth strain diagnostics'
node scripts/build-rust-structural-strain-kernel.mjs
echo 'Compiling Rust cloth anchor projection numerics'
node scripts/build-rust-anchor-kernel.mjs
echo 'Compiling independent EXO V2 web bundle, keeping the native session unchanged'
VITE_CLOTHCRAFT_BRIDGE_URL=http://127.0.0.1:5385 npm run build -- --outDir "$BUILD"

required_assets=(
  index.html
  stage-scenes/EXO01.glb
  stage-posters/EXO01.png
  library-3d/MIKRISTIAN_Cathedral_House.glb
  hardware-thumbnails/four-hole-shirt-button.png
  fabric-scans/denim_fabric_06/color.jpg
  fabric-scans/crepe_satin/color.jpg
  avatars/preview/clo-thomas.glb
  wasm/exo_fabric_kernel.wasm
  wasm/exo_geometry_kernel.wasm
  wasm/exo_ui_kernel.wasm
  wasm/exo_grading_kernel.wasm
  wasm/exo_sewing_kernel.wasm
  wasm/exo_foam_kernel.wasm
  wasm/exo_vector_fit_kernel.wasm
  wasm/exo_construction_kernel.wasm
  wasm/exo_free_sewing_kernel.wasm
  wasm/exo_strain_kernel.wasm
  wasm/exo_mesh_selection_kernel.wasm
  wasm/exo_fabric_cost_kernel.wasm
  wasm/exo_selection_metrics_kernel.wasm
  wasm/exo_measurement_kernel.wasm
  wasm/exo_allowance_preview_kernel.wasm
  wasm/exo_sewing_guide_kernel.wasm
  wasm/exo_label_layout_kernel.wasm
  wasm/exo_material_guide_kernel.wasm
  wasm/exo_preflight_crossing_kernel.wasm
  wasm/exo_mesh_quality_kernel.wasm
  wasm/exo_auto_fit_placement_kernel.wasm
  wasm/exo_precision_polar_kernel.wasm
  wasm/exo_quality_flip_kernel.wasm
  wasm/exo_fit_telemetry_kernel.wasm
  wasm/exo_timestep_kernel.wasm
  wasm/exo_avatar_contact_parameters_kernel.wasm
  wasm/exo_self_collision_kernel.wasm
  wasm/exo_avatar_clearance_kernel.wasm
  wasm/exo_distance_constraint_kernel.wasm
  wasm/exo_pbd_kernel.wasm
  wasm/exo_structural_strain_kernel.wasm
  wasm/exo_anchor_kernel.wasm
  wasm/exo_curve_draft_kernel.wasm
  wasm/exo_tangent_drag_kernel.wasm
  wasm/exo_body_arrangement_kernel.wasm
  wasm/exo_notch_preset_kernel.wasm
  wasm/exo_preflight_kernel.wasm
  wasm/exo_bom_kernel.wasm
  wasm/exo_marker_kernel.wasm
  wasm/exo_restore_kernel.wasm
  wasm/exo_preview_offset_kernel.wasm
  wasm/exo_export_contour_kernel.wasm
  wasm/exo_svg_affine_kernel.wasm
  wasm/exo_unfold_kernel.wasm
)
for required in "${required_assets[@]}";do
  if [[ ! -s "$BUILD/$required" ]];then
    echo "Refusing incomplete release, required asset missing: $required" >&2
    exit 1
  fi
done
echo 'Verifying all private CLO hardware meshes, thumbnails and source references are in the staged app'
node scripts/verify-clo-imported-hardware-bundle.mjs "$BUILD"
if ! grep -rlq --fixed-strings 'http://127.0.0.1:5385' "$BUILD/assets" ||
   ! grep -rlq --fixed-strings 'FLAT TEXTURE' "$BUILD/assets" ||
   ! grep -rlq --fixed-strings '3D DRAPE' "$BUILD/assets";then
  echo 'Refusing release: native bridge URL or current flat/draped fabric-preview UI not present' >&2
  exit 1
fi

BACKUP_NAME="${EXO_WEB_BACKUP_NAME:-EXO-V2-web-before-realism-20261017}"
if [[ ! "$BACKUP_NAME" =~ ^[A-Za-z0-9._-]+$ ]];then
  echo 'Refusing invalid backup folder name' >&2
  exit 1
fi
BACKUP="$ROOT/integrations/clothcraft/output/app-backups/$BACKUP_NAME"
if [[ ! -d "$BACKUP" ]];then
  mkdir -p "$BACKUP"
  rsync -a "$RES/web/" "$BACKUP/"
  echo "Preserved old installed web resources: $BACKUP"
fi

echo 'Installing verified web UI without modifying Rust/Swift executables'
rsync -a --delete "$BUILD/" "$RES/web/"
test -s "$RES/web/index.html"
test -s "$RES/web/stage-scenes/EXO01.glb"
node scripts/verify-clo-imported-hardware-bundle.mjs "$RES/web"
/usr/bin/codesign --force --deep --sign - "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
echo 'Verifying signed EXO V2 native bridge and actual 2D pattern editor'
open -a "$APP"
native_smoke_ok=false
for attempt in 1 2; do
  if node scripts/qa-installed-v2-bridge-smoke.mjs;then
    native_smoke_ok=true
    break
  fi
  if [[ "$attempt" == 1 ]];then sleep 3;fi
done
if [[ "$native_smoke_ok" != true ]];then
  echo "Native bridge acceptance failed. Restoring backed-up EXO V2 web resources: $BACKUP" >&2
  rsync -a --delete "$BACKUP/" "$RES/web/"
  /usr/bin/codesign --force --deep --sign - "$APP"
  /usr/bin/codesign --verify --deep --strict "$APP"
  echo 'Restored previous signed web bundle. EXO native binaries were never modified.' >&2
  exit 1
fi
echo "EXO V2 web-only update signed and native-smoke verified: $APP"

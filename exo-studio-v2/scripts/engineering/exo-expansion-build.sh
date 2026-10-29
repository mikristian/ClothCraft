#!/usr/bin/env bash
# Build locally, stage artifacts over WebDAV Expansion tunnel, and verify readback.
# This tunnel has noexec: cargo cannot directly run compiler outputs there.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TUNNEL="${EXO_EXPANSION_TUNNEL:-$HOME/ExpansionCloud}"
REMOTE="$TUNNEL/EXO-Engineering"
LOCAL_TARGET="${EXO_CARGO_SCRATCH:-$ROOT/.exo-build-scratch}"
case "${1:-}" in
  geometry)
    CARGO_MANIFEST="$ROOT/rust/exo_geometry_kernel/Cargo.toml"
    ARTIFACT="$LOCAL_TARGET/geometry/release/libexo_geometry_kernel.a"
    cargo_profile="release"
    ;;
  fabric)
    CARGO_MANIFEST="$ROOT/rust/exo_fabric_kernel/Cargo.toml"
    ARTIFACT="$LOCAL_TARGET/fabric/release/libexo_fabric_kernel.a"
    cargo_profile="release"
    ;;
  *)
    echo 'Usage: bash scripts/engineering/exo-expansion-build.sh geometry|fabric' >&2
    exit 2
    ;;
esac
# Every Cargo object is first built on the Mac; a mounted remote noexec
# WebDAV drive does NOT provide local compiler scratch space. Refuse before
# touching the remote destination when the source volume is nearly full.
# The 2 GiB floor covers dependency compilation and concurrent QA writes,
# not a claim of available WebDAV capacity or authorized factory deployment.
free_kib="$(/bin/df -Pk "$ROOT" | /usr/bin/awk 'END {print $4}')"
if [[ ! "$free_kib" =~ ^[0-9]+$ ]] || (( free_kib < 2097152 )); then
  echo "EXO_EXPANSION_BUILD_REFUSED_LOCAL_DISK_HEADROOM: need >=2GiB free before Rust build or remote writes; have ${free_kib:-unknown} KiB" >&2
  exit 6
fi
if ! mount | grep -Fq " on $TUNNEL (webdav,"; then
  echo "ERROR: Expected verified ExpansionCloud WebDAV mount at $TUNNEL" >&2
  exit 3
fi
for x in "$REMOTE/artifacts" "$REMOTE/manifests"; do mkdir -p "$x"; done
# The active/installed app is never referenced. CARGO_INCREMENTAL=0 limits scratch pressure.
export CARGO_INCREMENTAL=0
case "$1" in
  geometry) export CARGO_TARGET_DIR="$LOCAL_TARGET/geometry" ;;
  fabric) export CARGO_TARGET_DIR="$LOCAL_TARGET/fabric" ;;
esac
"${CARGO_BIN:-$HOME/.cargo/bin/cargo}" build --manifest-path "$CARGO_MANIFEST" --offline --release
# Choose the actual output from the build; no assumption of static vs dylib.
NAME="exo_${1}_kernel"
LIB=""
for file in "$CARGO_TARGET_DIR/release/lib${NAME}.dylib" "$CARGO_TARGET_DIR/release/lib${NAME}.a" "$CARGO_TARGET_DIR/release/lib${NAME}.rlib"; do
  if [ -s "$file" ]; then LIB="$file"; break; fi
done
[ -n "$LIB" ] || { echo "Build produced no supported library for $NAME" >&2; exit 4; }
python3 - "$LIB" "$REMOTE/artifacts" "$REMOTE/manifests" "$NAME" <<'PY'
import hashlib,json,os,sys,time
from pathlib import Path
src=Path(sys.argv[1]);dst=Path(sys.argv[2]);manifests=Path(sys.argv[3]);name=sys.argv[4]
def digest_file(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        while True:
            chunk=stream.read(1024*1024)
            if not chunk:break
            h.update(chunk)
    return h.hexdigest()
sha=hashlib.sha256(src.read_bytes()).hexdigest();target=dst/(f'{name}-{sha[:20]}{src.suffix}')
if not target.exists():
    staging=target.with_name(target.name+'.uploading')
    if staging.exists():
        if digest_file(staging)!=sha:
            raise RuntimeError('Staged upload exists but has a different checksum: '+str(staging))
    else:
        with src.open('rb') as read,staging.open('xb') as write:
            while True:
                chunk=read.read(1024*1024)
                if not chunk:break
                write.write(chunk)
    actual=digest_file(staging)
    if actual != sha:raise RuntimeError('Remote WebDAV readback differs; retain local build')
    staging.replace(target)
assert digest_file(target)==sha
manifest={'schema':1,'kind':'native-engineering-library','name':name,'sha256':sha,'bytes':src.stat().st_size,'artifact':target.name,'builtAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'tunnelExecutionAllowed':False,'source':str(src)}
(manifests/(target.name+'.json')).write_text(json.dumps(manifest,indent=2)+'\n')
print('BUILD_AND_TUNNEL_READBACK_PASS',json.dumps(manifest))
PY

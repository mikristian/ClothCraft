#!/bin/bash
# Source identity gate for an externally built RUN44 Rust binary.
set -euo pipefail
ROOT="${1:?repository root required}"
MANIFEST="${2:?manifest path required}"
[[ -f "$MANIFEST" && ! -L "$MANIFEST" ]] || { echo 'Missing regular source manifest' >&2; exit 20; }
source_rel='research/oss/clothcraft/src/bin/exo-session.rs'
source_file="$ROOT/$source_rel"
[[ -f "$source_file" && ! -L "$source_file" ]] || { echo 'Missing regular Rust source' >&2; exit 21; }
IFS=' ' read -r expected_hash recorded_path extra < "$MANIFEST"
[[ "$expected_hash" =~ ^[a-f0-9]{64}$ && "$recorded_path" == "$source_rel" && -z "${extra:-}" ]] || {
 echo 'Invalid source manifest: expected SHA-256 and exact canonical source path' >&2; exit 22;
}
actual_hash="$(/usr/bin/shasum -a 256 "$source_file" | /usr/bin/awk '{print $1}')"
[[ "$actual_hash" == "$expected_hash" ]] || { echo 'Rust source digest does not match bound manifest' >&2; exit 23; }
echo "RUN44_QA_RUST_SOURCE_SHA=$actual_hash"

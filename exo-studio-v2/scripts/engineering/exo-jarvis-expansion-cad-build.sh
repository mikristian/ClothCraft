#!/usr/bin/env bash
# Compile and test the native EXO drafting-split engine directly on Jarvis's
# physically attached Expansion drive; cross-compile arm64 for the Blender Mac.
# Existing source and installed apps are never overwritten.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PEER="${EXO_JARVIS_PEER:-jarvismikristian@100.82.90.101}"
KEY="${EXO_JARVIS_KEY:-$HOME/.ssh/jarvis_os_bridge_ed25519}"
REMOTE="/Volumes/Expansion/EXO-Engineering"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=7 -i "$KEY")
SCP=(scp -q -o BatchMode=yes -o ConnectTimeout=7 -i "$KEY")
LOCAL_STAGE="$ROOT/.exo-build-scratch/return-check"
mkdir -p "$LOCAL_STAGE"
cd "$ROOT"
SOURCES=(native_cpp/core/drafting_split.cpp native_cpp/core/drafting_split.hpp native_cpp/core/drafting_precision.cpp native_cpp/core/drafting_precision.hpp native_cpp/core/garment_document.hpp native_cpp/tests/test_drafting_split.cpp native_cpp/vendor/nlohmann/json.hpp)
for f in "${SOURCES[@]}"; do test -s "$f" || { echo "Missing required $f" >&2; exit 2; }; done
"${SSH[@]}" "$PEER" "mkdir -p '$REMOTE/build-sources/portable-geometry' '$REMOTE/build-scratch' '$REMOTE/artifacts'"
tar -czf - "${SOURCES[@]}" | "${SSH[@]}" "$PEER" "cd '$REMOTE/build-sources/portable-geometry' && tar -xzf -"
"${SSH[@]}" "$PEER" "set -e; cd '$REMOTE/build-sources/portable-geometry'; /usr/bin/clang++ -std=c++17 -O1 -I native_cpp/vendor -I native_cpp/core native_cpp/core/drafting_precision.cpp native_cpp/core/drafting_split.cpp native_cpp/tests/test_drafting_split.cpp -o '$REMOTE/build-scratch/test_drafting_split_x86_64'; '$REMOTE/build-scratch/test_drafting_split_x86_64'; /usr/bin/clang++ -std=c++17 -O1 -target arm64-apple-macos13.0 -I native_cpp/vendor -I native_cpp/core native_cpp/core/drafting_precision.cpp native_cpp/core/drafting_split.cpp native_cpp/tests/test_drafting_split.cpp -o '$REMOTE/build-scratch/test_drafting_split_arm64'; file '$REMOTE/build-scratch/test_drafting_split_arm64'; shasum -a 256 '$REMOTE/build-scratch/test_drafting_split_arm64'"
"${SCP[@]}" "$PEER:$REMOTE/build-scratch/test_drafting_split_arm64" "$LOCAL_STAGE/test_drafting_split_arm64"
chmod +x "$LOCAL_STAGE/test_drafting_split_arm64"
# Validate remote and downloaded hashes independently before executing.
remote_sha="$("${SSH[@]}" "$PEER" "shasum -a 256 '$REMOTE/build-scratch/test_drafting_split_arm64'" | awk '{print $1}')"
local_sha="$(shasum -a 256 "$LOCAL_STAGE/test_drafting_split_arm64" | awk '{print $1}')"
if [ "$remote_sha" != "$local_sha" ]; then echo "ERROR: Remote arm64 artifact hash differs" >&2; exit 3; fi
"$LOCAL_STAGE/test_drafting_split_arm64"
cp -p "$LOCAL_STAGE/test_drafting_split_arm64" "$LOCAL_STAGE/test_drafting_split_arm64_verified_$local_sha"
echo "EXO_REMOTE_EXPANSION_BUILD_PASS SHA256=$local_sha"

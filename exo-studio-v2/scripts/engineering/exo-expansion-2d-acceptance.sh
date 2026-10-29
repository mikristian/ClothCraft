#!/usr/bin/env bash
# Non-destructive EXO 2D acceptance build in a NEW isolated Expansion folder.
# Does not write to any installed application, live workspace, or shared build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE='/Volumes/Expansion/EXO-Engineering'
PEER="${EXO_JARVIS_PEER:-jarvismikristian@100.82.90.101}"
KEY="${EXO_JARVIS_KEY:-$HOME/.ssh/jarvis_os_bridge_ed25519}"
RUN="exo-2d-acceptance-$(date +%Y%m%d-%H%M%S)-$$"
OUTPUT="$ROOT/integrations/clothcraft/output/engineering-2d"
mkdir -p "$OUTPUT"
printf '%s\n' "$RUN" > "$OUTPUT/last-expansion-run.txt"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=7 -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -i "$KEY")
"${SSH[@]}" "$PEER" "mkdir -p '$REMOTE/$RUN/source' '$REMOTE/$RUN/target'"
tar -czf - -C "$ROOT/research/oss/clothcraft" Cargo.toml Cargo.lock src tests assets |
  "${SSH[@]}" "$PEER" "tar -xz -C '$REMOTE/$RUN/source'"
echo "EXPANSION_STAGED=$REMOTE/$RUN/source"
"${SSH[@]}" "$PEER" "set -e; export CARGO_HOME='$REMOTE/toolchains/cargo' RUSTUP_HOME='$REMOTE/toolchains/rustup' CARGO_TARGET_DIR='$REMOTE/$RUN/target' CARGO_INCREMENTAL=0; cd '$REMOTE/$RUN/source'; '$REMOTE/toolchains/cargo/bin/cargo' test --offline --locked --no-default-features -j 2 --test exo_four_garment_construction --test free_curve_split_migration --test split_attachment_migration --test mirrored_free_curve_split -- --test-threads=2; '$REMOTE/toolchains/cargo/bin/cargo' test --offline --locked --no-default-features -j 2 --bin exo-session grade_tests -- --test-threads=2" 2>&1 |
  tee "$OUTPUT/$RUN.log"
echo 'EXPANSION_2D_ACCEPTANCE_PASSED'

# EXO ClothCraft V2 — Jarvis Expansion backup offload

**Completed:** 2026-10-17 (EDT) · Source: Mikyle's Blender/development Mac.

## Confirmed destination

The actual Expansion disk is physically mounted on Jarvis as `/Volumes/Expansion` (3.6 TiB, 2.4 TiB free during backup). The Blender Mac has a WebDAV alias at `~/ExpansionCloud`, but that alias reports 0 bytes capacity and its Finder client can stage large uploads on the nearly-full local disk. For all transfers we instead used the existing SSH identity over Tailscale, targeting this exact directory on the *physical drive*:

`/Volumes/Expansion/BlenderMac_Storage_Offload_20261009/EXO_V2_Archived_Builds_20261017`

Finder equivalent on Blender Mac when the ExpansionCloud share is mounted:

`~/ExpansionCloud/BlenderMac_Storage_Offload_20261009/EXO_V2_Archived_Builds_20261017`

## What was archived

Eight **old, inactive, generated V2 web-build backups**, namely:

- `EXO-V2-web-before-realism-20261017`
- `EXO-V2-web-before-texture-stage-fix-20261017`
- `EXO-V2-web-before-toolbar-loop2-20261017`
- `EXO-V2-web-before-native-bridge-repair-20261017`
- `EXO-V2-web-before-fabric-preview-loop04-20261017`
- `EXO-V2-web-before-avatar-render-20261017`
- `EXO-V2-web-before-toolbar-restoration-20261017`
- `EXO-V2-web-before-connect-fabric-studio-20261017`

Each old backup was transmitted with `rsync` without overwriting existing Expansion files, then compared with a **complete `rsync -rcn` content-checksum dry run**. Exact local and remote regular-file counts also matched (303–322 files per folder). A local directory was removed **only after** these checks passed. Total source-space reclaimed from the eight directories was approximately 2.4 GiB. Because of the physical drive's allocation size, the copied directories occupy about 2.9 GiB on Expansion.

The eight-record audit manifest is present both locally and on Expansion as `EXPANSION_OFFLOAD_VERIFIED_20261017.tsv`. SHA-256 of both manifest copies was identical at the end of the run:

`4d65228b631222ab602f1a680aa74529add532b64ff45447f8e2e79bbaaefc85`

## What was deliberately preserved locally

- **The current installed signed application**: `~/Applications/EXO ClothCraft Studio V2.app`
- **Native Rust/Swift source and executables; active garment/Blender projects; photo scan originals** — unchanged
- Most recent local web rollback `integrations/clothcraft/output/app-backups/EXO-V2-web-before-macro-r03-studio-20261017` (about 303 MiB)
- Local full-app backup `integrations/clothcraft/output/app-backups/EXO ClothCraft Studio V2 before-inline-fabric-20261016.app` (about 546 MiB)

After migration internal free space was around **7.4 GiB**, compared with roughly **4.9 GiB** before the operation. Other processes can change this measurement independently.

## Restoring an archived web build safely

Do not overwrite the running EXO app directly. Instead, retrieve a named backup into a new staging folder on the Mac:

```bash
mkdir -p "$HOME/EXO-Restore-Staging"
rsync -rt -e "ssh -i $HOME/.ssh/openclaw_mac_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes" \
  'jarvismikristian@100.82.90.101:/Volumes/Expansion/BlenderMac_Storage_Offload_20261009/EXO_V2_Archived_Builds_20261017/EXO-V2-web-before-realism-20261017/' \
  "$HOME/EXO-Restore-Staging/EXO-V2-web-before-realism-20261017/"
```

Before using any restored build, validate its integrity against the remote source and assess native bridge/SDK compatibility. The original web-only release script can then be used to sign and verify an app update, but it is not an arbitrary rollback installer.

## Further storage assessment

The machine is still below the preferred 25 GiB free working headroom. Four other generated V2 build-output directories, each roughly 300 MiB, are still local; they were left unchanged because they might be referenced by concurrent development processes. macOS also exposes many temporary `com.google.Chrome.code_sign_clone` trees under `/private/var/folders/.../X`; their `du` total is very large but can double-count APFS cloned storage. Chrome is currently running, so those system-managed directories were **not** deleted. Investigate stale clone ownership and a safe browser restart separately before any cache cleanup.

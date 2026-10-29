# CLO hardware and trims iCloud hydration — October 17, 2026

## Result — corrected after independent recheck

**The earlier claim that all 162 files remained downloaded was incorrect.** At the instant of the first hash verification all 162 iCloud mirror files were locally materialized and SHA-256 matched the installed files. On the next independent check, **all 162 files were again dataless** (`st_blocks=0`, `st_flags=0x40000060`), confirming macOS evicted the previously materialized bytes. This occurred on the **same host** and paths, and does not indicate a path mapping error. Hashing a dataless file itself triggers its download and can conceal this state change when the allocation count is taken afterwards.

The second round of `brctl download` requests was accepted, but download is asynchronous: an immediate independent check showed 0/162 allocated, followed by 12/162, 42/162 and 56/162 allocated as downloads progressed; a further **separate no-content-read check fell to 21 resident / 141 dataless**. On a sample downloaded item, File Provider still reported `isKeepDownloaded=0`; **no persistent pinning was achieved**, and no long-term residency guarantee is possible from `brctl download` alone. The iCloud mirror remains subject to macOS automatic eviction. Check `st_blocks` and dataless flags without opening or hashing the files when determining live resident count.

Finder's **Keep Downloaded** contextual action is the appropriate macOS pinning approach for the `Hardware_and_Trims` folder. The connected terminal cannot invoke that user-interface action because `System Events` returns `osascript is not allowed assistive access (-1719)`. Neither the `icloud` nor `icloudctl` command was installed, and Finder's script definition did not expose a Keep Downloaded action. Do not manually write `com.apple.fileprovider.pinned`, which is a system-managed attribute. A person with Finder UI access can right-click `~/Documents/clo/Assets/Materials/Hardware_and_Trims`, select **Keep Downloaded** (where supported), and then verify `isKeepDownloaded=1` and all 162 files' physical allocation on an independent later read. This has **not** been completed by this worker.

The below initial table is **historical point-in-time validation**, not a current residency assertion. The later recheck takes precedence.

All **162 of 162** files in the iCloud Documents mirror were downloaded at least temporarily. Their SHA-256 hashes **matched the corresponding 162 installed CLO application files** at verification time. This does not mean the files remain resident after macOS storage optimization.

| Check | Result |
| --- | ---: |
| Installed CLO application files | 162 |
| iCloud Documents mirror files | 162 |
| Mirror files hydrated at the initial verification instant | 162 |
| Exact matching relative paths | 162 |
| Matching SHA-256 file pairs | 162 |
| SHA-256 mismatches | 0 |
| Pending hydration at the initial verification instant | 0 |
| Failed hydration commands | 0 |
| Logical byte total | 46,546,294 bytes (~44.4 MiB) |
| Free disk space at initial check | ~2.6 GiB |
| Free disk space after verification | ~2.5 GiB |

## Locations

- Installed reference: `/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims`
- Hydrated iCloud Documents mirror: `~/Documents/clo/Assets/Materials/Hardware_and_Trims`
- Detailed per-file status and both SHA-256 digests at the time of execution: `icloud-hydration-results.json` (the helper overwrites this when rerun)
- Repeatable hydration and verification helper: `hydrate_icloud.py`

## Procedure and caveats

The first inspection showed all mirror files as macOS iCloud placeholders (zero allocated data blocks; `0x40000060` file flags), with correct nominal file sizes and paths. After checking capacity, the helper issued macOS `/usr/bin/brctl download` for each existing mirror file, using five concurrent requests. These requests are asynchronous. A File Provider inspection verified a pending file showed `isDownloadRequested=1` and `isDownloading=1`; subsequent checks showed local downloads progressing to 24, 58, 102, 130, 145, and 162 files.

The final verification required each file to have allocated local data blocks and to lack the iCloud dataless flag, then computed SHA-256 digests of mirror and installed original. All 162 pairs matched byte for byte. This confirms the mirror matches the **currently installed CLO app assets**; it does not independently validate against CLO's remote cloud version or establish the licensing permissions for downstream redistribution. macOS may offload iCloud files again in the future under storage optimization policies.

No original source assets were moved, deleted, or overwritten by the iCloud hydration helper. Separately, the main EXO conversion workflow created a verified private **offline duplicate** outside iCloud at `~/Library/Application Support/EXO-ClothCraft-Studio-V2/LocalHardwareAssets/CLO-Hardware_and_Trims` so an always-available reference exists while Finder pinning is unresolved; see `offline-copy-verification.json`.

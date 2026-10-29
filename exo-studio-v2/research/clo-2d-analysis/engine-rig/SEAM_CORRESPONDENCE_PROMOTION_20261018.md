# EXO ClothCraft Studio V2 — Seam Correspondence Migration and Native Promotion (2026-10-18)

## Production engineering implementation

In the checkout at `research/oss/clothcraft`, `src/authoring.rs` now performs a transactional native boundary split which migrates (1) seam-boundary references and normalized rest-arclength ranges, (2) edge manufacturing notches, (3) seam allowances, (4) dimension target lengths, and (5) strict monotone seam-pair notch correspondences. For seam pairs with `reverse_b`, the correspondence knot coordinates are already measured along the oriented sewing correspondence direction; the split uses a piecewise-linear monotone interpolant to locate the opposite edge cut, partitions the source seam in A sewing order, and renormalizes child knot coordinates. Different source ranges, opposite seam ownership, reverse_b, and explicit ease were included in tests. Invalid, nonmonotone or degenerate knot inputs are rejected before publishing any edit.

`tests/split_attachment_migration.rs`: 9 tests passed, including the new monotone correspondence and eased/partial split cases. A broad test command ran 69 tests across native authoring, drafting integration, drafting tools, drawing commands, garment solver constraints, meshing and seam attachment migration with zero failures. `cargo build --no-default-features --offline --locked --bin exo-session` succeeded.

## QA app, actual macOS window and packaged native behavior

The separate `~/Applications/EXO ClothCraft Studio V2 QA.app` was made safe for simultaneous QA operation: distinct bundle ID `.v2.qa`, support directory `EXO-ClothCraft-Studio-V2-QA`, independent localhost ports 5485/5486, signed AppKit executable, packaged JS dependencies, bundled front end and matching Rust executable. `integrations/clothcraft/macos/build-isolated-v2-qa-20261018.sh` is the QA-only build procedure. `integrations/clothcraft/qa-v2-packaged-window-split-20261018.mjs` passed with signed:true, nativeWindow:true, nativeReady:true, splitCodePackaged:true; WindowServer confirms a real visible EXO ClothCraft Studio V2 QA window. The packaged Rust binary was verified directly by `integrations/clothcraft/qa-v2-installed-split-20261018.mjs` (14 -> 15 point split on `front:neck-left`; Save, Undo and Redo all passed in a disposable isolated native workspace).

**Known GUI coverage limit:** macOS System Events declined GUI Accessibility automation (error -1728). Therefore direct physical clicking of the native WKWebView split tool was not verified, even though the real QA app window, packaged resources and packaged solver/API are working. Do not misstate that as full native UI gesture acceptance.

## Production promotion and rollback

After production workspace snapshot and checksum comparison, the existing live production app was gracefully quit, the prior Rust executable backed up, the tested QA `exo-session` executable installed into `~/Applications/EXO ClothCraft Studio V2.app/Contents/Resources/research/oss/clothcraft/target/debug/exo-session`, and the original app re-signed. **Only the native solver binary was replaced**; no web front end or Swift app shell was overwritten. Source binary and both QA/prod installed executable hashes: `88694591391c204ea8faa75c13c69afe2638ed56534ec38be610494d5cc97912`. Production was reopened; app signature verified; HTTP health reports nativeReady:true and UI HTTP 200. The user's saved `fitting-project.json` SHA-256 remained `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160`, identical before and after.

Rollback and saved working state: `~/Library/Application Support/EXO-ClothCraft-Studio-V2/Backups/before-correspondence-promotion-20261018/`. Contains `exo-session.previous` (original SHA-256 `baa24eb39afd160db0e3f9a190633aa78b5107f1b2da1f58e585243c2d574ef3`) and exact copies of the user garment workspace. To roll back safely: gracefully close V2 and its Rust worker, restore `exo-session.previous` over the installed solver, re-sign with `codesign --force --deep --sign -`, verify signature, and reopen. Do not restore the user project unless needed: its content was not changed by this deployment.

## Remaining independent product acceptance work

- Native AppKit/WKWebView real-user click gesture under an authorized Accessibility-enabled test context. This is explicitly unverified in the current run.
- Industrial AAMA/ASTM CAD interoperability, graded pattern manufacturing tolerances, full factory print/physical sample acceptance, and 2D/3D remesh stress/fuzz validation have not been certified by these tests.
- Disk free space remained near 4.6 GiB at completion; avoid duplicating full app bundles or clearing user files without a storage review.

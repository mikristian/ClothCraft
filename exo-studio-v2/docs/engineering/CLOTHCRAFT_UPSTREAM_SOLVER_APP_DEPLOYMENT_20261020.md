# EXO ClothCraft V2 — merged upstream solver installed and reopened

**Verified:** 2026-10-20/21 local. **Result:** PASS on both the isolated QA app and the regular V2 app. This deployment changes **only** the local native CPU solver executable; the regular application's preexisting web interface remains unchanged. No remote GitHub push was performed.

## Solver provenance

- Official ClothCraft upstream: `78b359c` (contact filtering) and `5d54b0b` (solver lab, VBD, cloth authoring, OGC research).
- Integrated EXO branch: `integration/upstream-solver-lab-20261020` at `7a3e1b0`, preserving EXO dart, CAD, seam metrics and the JSON-lines bridge.
- Exact promoted CPU binary SHA-256: `c491d0e6ed7be3228ef320925ac75fb0e923ea1202676193f42c4ea16f484df7`.
- Prior production native binary SHA-256, retained for rollback: `0ecf515bbf6bb877bec5649b7be4863e5260da6b66305ab06bab84ee49897aed`.

## Isolation, backup and installed app state

1. **QA app:** `~/Applications/EXO ClothCraft Studio V2 QA.app`. Backed up prior native executable, bridge and saved QA workspace to `integrations/clothcraft/output/app-backups/upstream-solver-qa-20261020/`. Replaced only the QA native binary, code-signed, verified both QA ports **5485/5486**, reopened QA app at initial process PID **30431**.
2. **Regular app:** `~/Applications/EXO ClothCraft Studio V2.app`. Preserved and backed up entire original workspace and prior executable under `integrations/clothcraft/output/app-backups/upstream-solver-production-20261020/`. Saved the currently open garment before restart. Installed the identical QA-tested merged native executable, ad-hoc re-signed, relaunched production at initial process PID **32374**. Static and native services on **5386/5385** verified live. Backup includes both the pre-upgrade and saved-at-upgrade garment files.
3. **Data comparison:** saved template SHA-256 before vs after regular app relaunch both equal `35eb9f78cb561a9eb985350f7a1f5ae5877019ad2eb2df130bbadd9868ed1ee8`; production `web/index.html` SHA-256 before vs after both equal `5141d7a3462ab748b15b192b55021fc9ff85503ed9df85e432143bf63d155c52`. The saved native project's **2,557 cloth vertices** were independently compared against all 2,557 reopened live positions and matched **exactly (maximum difference 0.0 metres)**. The regular app's authored garment, draped state and shipped UI bundle are unchanged.
4. The CPU solver is selected intentionally. **GPU simulation remains disabled** because prior GPU seam/contact precision parity was not acceptable. This is not a claim of GPU speedup or production garment-fit certification.

## Actual installed QA UI + private-native tests

`node integrations/clothcraft/qa-upstream-solver-installed-v2-20261020.mjs` — **PASS**. The static web assets are loaded from the **reopened installed QA app on 5486** while *all* `/workspace` requests are intercepted to a newly spawned, disposable Rust backend using the **actual installed merged solver**. Native 30 mm physical cut-and-sewn dart:

- 0-step maximum 3D leg separation: **30.000000 mm**; RMS **17.320508 mm**.
- 10-step maximum separation: **0.116429 mm**; RMS **0.031695 mm**.
- 2D: six SVG elements, three actual drafting-paper outline paths.
- 3D: canvas confirms dart count **1**, gap **0.116429 mm** and revision **12**, exactly matching the private native snapshot.
- Actual Fit inspector agrees with native max/RMS; zero browser errors.

Screenshot: `docs/qa/upstream-solver-qa-app-20261020/qa-upstream-dart-fit.png`.

## Regular app web compatibility and real reopened production state

`node integrations/clothcraft/qa-upstream-production-web-compat-20261020.mjs` — **PASS**, before regular-app binary installation. It loaded the existing **regular** web assets from **5386**, redirected native calls exclusively to a temporary merged-solver server, and confirmed physical draft rendering (six SVGs, three paper outlines) plus an actual 3D scene of **4,752 triangles / 2,567 vertices** at revision 12, zero browser errors.

`node integrations/clothcraft/qa-upstream-production-reopen-20261020.mjs` — **PASS** after the real app restarted. Without editing or stepping its saved document, it inspected the reopened **regular** app on **5386/5385**:

- Native health: `nativeReady=true`, CPU VBD+OGC process running; GPU requested by the launcher but **not active**.
- 2D workspace visible with **six SVGs**, real fabric pattern geometry and 496 DOM descendants.
- 3D viewer visible, consuming the real saved native garment with **4,743 triangles / 2,557 vertices**.
- Browser page errors **0**; original garment template unchanged.
- The regular application's saved 3D particle positions match the reopened solver snapshot with **zero coordinate difference**; the app window was explicitly brought to the foreground after verification.

Screenshots and report: `docs/qa/upstream-solver-production-reopen-20261020/`. The regular web UI is older than the QA web UI, so its Dart toolbar/Fit inspector are **not** being falsely claimed present in the regular app. This deployment upgrades the **solver**, not the interface.

## Repeatable installer and rollback

- QA: `integrations/clothcraft/macos/stage-upstream-solver-v2-qa-20261020.sh`.
- Regular: `integrations/clothcraft/macos/stage-upstream-solver-v2-production-20261020.sh`.
- Both installers verify bundle identity, tested binary SHA, signature and live service, and make **separate complete prior-state backups**. The production installer saves the current garment, checks its template hash across restart and restores the old executable on a failed acceptance gate.
- To manually roll back later, quit the relevant app, copy its backup executable back into `Contents/Resources/research/oss/clothcraft/target/debug/exo-session`, re-sign that app and reopen it. The saved project backups should not be overwritten unless recovery of garment data is genuinely required.

## Remaining research and release limitations

The integrated CPU solver was **11–15% faster** than the established solver on two short matched ten-step tests with exactly identical dart closure, stretch, contacts and topology; those results are fixture-specific, not a universal speed guarantee. Longer 200/1000-step garment tests, independent triangle collision/penetration certification and actual GPU precision/speed tests are still necessary. Experimental XPBD/AVBD alternatives and seam-block refinement remain disabled. No factory-fit certification or application version increment is claimed.

# ClothCraft V2 — verified Expansion offload and strict-strain solver diagnostic

**Date:** 2026-10-21. **Release status:** experimental Rust source and disposable QA only. **No installed app or personal garment changes.** There is no measured 70% CLO3D parity.

## Expansion tunnel and disk safety

Jarvis physically hosts the Expansion disk at `/Volumes/Expansion`, reached through the existing Tailscale SSH peer `jarvismikristian@100.82.90.101`. The remote disk had **2.4 TiB free** at inspection. Blender Mac's `~/ExpansionCloud` WebDAV is mounted but exposes a `noexec` filesystem and misleading zero available capacity; a batch WebDAV transfer stalled in its local staging cache. It was stopped with all original sources intact.

The repeatable **`scripts/engineering/exo-direct-expansion-offload-20261021.py`** streams a compressed archive directly to physical Expansion over SSH without creating a local TAR. Before releasing each *explicitly allowlisted historical UI backup*, it compares the remote compressed SHA-256 and independently re-reads all logical remote archive entries with per-file SHA-256 and source metadata checks. Re-running the script safely re-verifies previously completed archival entries.

**Completed, independently verified:**

| Historical EXO backup | Result |
| --- | --- |
| `integrations/clothcraft/output/pattern-ui-backup-20261019` | **732 entries verified**, 369,719,933 logical file bytes; transferred 318,272,496 compressed bytes to Jarvis Expansion; source released only after verification |
| `visible-handles-backup-20261019` | **735 entries verified**, 373,503,397 logical file bytes; 319,059,341 compressed bytes transferred to physical Expansion; source released only after full remote archive readback |
| `clo-audit-backup-20261019` | **760 entries verified**, 404,587,597 logical file bytes; 328,484,548 compressed bytes transferred to physical Expansion; source released only after full remote archive readback |

**All three historical UI archives are now complete:** 2,227 verified archive entries, 1,147,810,927 logical file bytes, and 965,816,385 compressed archive bytes on physical Expansion. Each remote file has a per-member SHA-256 check and an independently verified compressed archive checksum. These are historical backup bundles, not the active app, saved garments, or source tree.

Completed remote archive:
`/Volumes/Expansion/EXO-Engineering/verified-backups/EXO-ClothCraft-Offload-20261021/pattern-ui-backup-20261019.tar.gz`
on Jarvis, SHA-256:
`9546696aa57ae3c8f20caf5a4f99b7c0dbac7aad295b1c2f42dc560b4bc08dd1`.

Local verification manifests:
`docs/qa/expansion-offload-20261021/pattern-ui-backup-20261019.verified.json`, `visible-handles-backup-20261019.verified.json`, and `clo-audit-backup-20261019.verified.json`.
Restore historical UI sources by extracting the archive into a **new recovery folder**; never overwrite the running app, current web bundle or saved garment.

The Mac dropped below 500 MiB free during storage staging and repeated Rust builds. With no active compilers, additional **regenerable, intermediate Cargo/Rust** artifacts were cleared safely: the Rust `target/debug/incremental` (~2.5 GiB), then precisely 17,104 intermediate `marvelous_cloth-*.rcgu.o` compiler object files (~4.8 GiB) from the canonical target `debug/deps`. Executables, `.rlib`, source, live files and personally saved projects were not deleted. Final observed internal free space increased to approximately **5.8 GiB**. These objects can be regenerated; later builds may consume that space again. Continue aiming for **20–25 GiB headroom** through additional verified offloads, not by deleting unknown files.

## Solver research: cause, candidate and outcomes

The isolated source worktree is
`research/oss/clothcraft-upstream-solver-review-20261020`.
The strict 5% principal-strain T-shirt fixture had **0/80 dynamic coupled block accepts** after 10 nonrigid registration passes plus 20 steps, with a roughly **418.55 mm maximum seam gap**.

**New failure-stage counters** found the actual blocker: **1,280/1,280 trial candidates failed the strict material-strain gate**. No trials failed the global seam-energy or worst-gap gate in that run. An optional research A/B switch to permit worst-gap rebound did not change any step or seam result; therefore that monotonicity test was **not** the cause of stalled dynamic sewing.

An experimental principal-stretch tangent-plane direction now projects the coupled PCG update away from linearized active material extension inequalities before the existing nonlinear acceptance tests. The spectral gradient was independently verified by finite differences. The true nonlinear principal-strain bound, contact trust balls, endpoint face-intersection validation, global seam cost and full local implicit objective remain required for accepted corrections. The new switches (`nonrigidProjectStrainTangent` and `nonrigidAllowGapRebound`) default to **false** and are confined to the disposable off-body preview.

### Matched dynamic starting state: accepted motion is not a quality win

Both modes use **the exact same** T-shirt geometry after 10 nonrigid registration passes, with one fabric ring, 20 strict VBD steps, and a 5% maximum principal material extension:

| Measure | Default strict coupled VBD | Tangent-projected coupled VBD |
| --- | ---: | ---: |
| Accepted dynamic coupled blocks | **0 of 80** | **44 of 80** |
| Final maximum sewing gap | **418.5496 mm** | 419.3696 mm |
| Final mean-per-seam RMS | **333.4949 mm** | 336.4610 mm |
| Principal extension maximum | ≤5.00001% | ≤5.00001% |
| Independent endpoint collisions, saved-state changes | None in accepted QA | None in accepted QA |

**Conclusion:** the projected direction unlocks formerly impossible *movement* but **makes both max seam error and RMS worse** by 0.82 mm and 2.97 mm. It is not a fitting-accuracy improvement and should not be enabled by default or packaged in the regular V2 app.

### Hybrid assembly pass: small reduction at additional computational work

Under the identical 5% limit, 20 rigid-registration passes followed by 20 strict VBD steps produced:

| Metric | Existing staged baseline | 10 extra nonrigid-registration passes before same VBD |
| --- | ---: | ---: |
| Maximum sewn seam gap | 326.7074 mm | **324.7616 mm** |
| Mean per-seam RMS gap | 240.2245 mm | **238.4732 mm** |
| Static nonrigid block corrections | None | 40 accepted |
| Dynamic nonrigid corrections | None | 0 |

This is a **1.9458 mm maximum-gap** and **1.7513 mm RMS** improvement at the expense of **additional registration work**, without a measured equal-wall-time speed comparison. The sewn T-shirt remains extremely far from the provisional 10 mm physical closure target. Tangent-projected dynamics on this hybrid were also tested but made RMS worse.

### Fabric-neighborhood/sweep A/B follow-up

Additional matched off-body T-shirt trials used the same 10 nonrigid-registration passes, 20 strict dynamic VBD steps and **5% principal strain**; only the coupled block neighborhood radius and number of sweeps changed:

| Nonrigid fabric neighborhood | Sweeps | Dynamic projection | Worst seam gap | Mean per-seam RMS |
| --- | ---: | --- | ---: | ---: |
| 1 ring | 1 | Off | 418.5496 mm | 333.4949 mm |
| 1 ring | 1 | On | 419.3696 mm | 336.4610 mm |
| **2 rings** | **1** | **Off** | **417.9275 mm** | **331.2740 mm** |
| 2 rings | 1 | On | 418.9595 mm | 335.9151 mm |
| 2 rings | 2 | Off | 416.6701 mm | 333.4781 mm |
| 2 rings | 4 | Off | 416.6907 mm | 333.6845 mm |

Two rings with one sweep reduced both seam metrics relative to the one-ring baseline, **but by only 0.62 mm maximum and 2.22 mm RMS**. Two/four sweeps lower the worst gap another ~1.25 mm at increased work while sacrificing RMS. All these QA fixtures passed the strain, endpoint collision and source save-state invariants. This tuning cannot substitute for actual full-garment closure. Raw evidence: `two-rings-no-tangent.json`, `two-rings-tangent.json`, `two-rings-two-sweeps.json`, `two-rings-four-sweeps.json` alongside the matched one-ring records.

**Extended 40-step check:** Holding 10 off-body nonrigid registrations, 1 sweep, 5% strain and identical initial garments fixed, 1 ring yielded **324.6921 mm** worst gap and **235.5418 mm** RMS; 2 rings yielded **324.0721 mm** and **234.0834 mm** respectively. Thus the small two-ring advantage persisted for the longer preview, with no accepted dynamic nonrigid blocks in either mode. See `forty-step-one-ring.json` and `forty-step-two-rings.json`. This remains more than 32 times the provisional 10 mm seam-closure target.

**QA:** `integrations/clothcraft/qa-offbody-preassembly-preview-20261021.mjs`.
Raw reports are under `docs/qa/clothcraft-strain-tangent-20261021/`, including `guarded-baseline.json`, `tangent-after-registration.json`, `rigid20-vbd20-baseline.json`, `rigid20-nonrigid10-vbd20.json`, and `rigid20-nonrigid10-tangent20.json`. The API reports accepted/rejected block counts, RMS, max gap, explicit flags, original workspace nonmutation, staging-only validation and `avatarReentryValidated:false`.

## Validation and release decision

- CPU `exo-session` source checked and built successfully with `--no-default-features`.
- A coordinated Rust suite of **61 targeted tests** passed (35 library, 12 session, and 14 separate fixture tests). An added independent analytical-gradient-versus-finite-difference unit test passed separately. A previous folded-panel fixture had a test-only mutable-borrow compiler issue, corrected without changing its acceptance criteria.
- Independent shape assertions included 5% principal extension, strict pins, valid nonintersecting endpoints, complete native QA rollback/save invariants. **Swept continuous collision safety is not certified.**
- The macOS installed regular/QA native services continued responding with HTTP 200. Their executables and the user's original garment project were **not** replaced.
- **Do not claim 70% CLO3D equality**. The next useful improvement needs a genuinely feasible coupled constrained direction that reduces both aggregate sewing error and worst seam gap while folding panels around the avatar, followed by swept CCD and matched CLO3D/PPF benchmarking.

# EXO ClothCraft V2 — Dart 3D closure measurements and isolated QA reopen

**Date:** 2026-10-20. **Scope:** next engineering milestone after the physical cut-and-sewn dart. This pass measures each compiled dart seam's actual world-space closure instead of judging it from the maximum of unrelated garment seams. It does not certify an uncut folded dart, cloth fit, factory-ready production or self-penetration safety.

## Delivered

1. **Length-weighted physical seam RMS.** `research/oss/clothcraft/src/garment/seam.rs` now calculates `CompiledSeam::rms_gap(x)`, weighted by the native stitch-line quadrature sample lengths. It measures actual 3D point separation after solver motion, with the existing probe-based `max_gap` remaining authoritative for worst local opening.
2. **Per-dart native snapshot diagnostics.** `research/oss/clothcraft/src/bin/exo-session.rs` returns per-seam `rms_gap_m`, `lengths_m`, `kind`, and `within_provisional_2mm`. A separate `dartFit` array includes seam ID, maximum gap millimetres, RMS gap millimetres, leg lengths millimetres and a provisional two-millimetre threshold. All diagnostics are derived from compiled material seams and the solver's actual 3D vertex positions; they are not generated from 2D display guides.
3. **Visible Fit inspector.** `src/components/ClothCraftWorkspace.jsx` now includes **CUT-AND-SEWN DART · 3D SEAM CLOSURE**, with measured maximum/RMS separation, leg lengths, and clear experimental caveats in the full editor. The installed EXO application's embedded workspace also has a compact **3D dart closure** panel available through Fit. `src/components/ClothCraftSceneV2.jsx` records the rendered snapshot's `data-native-dart-count`, `data-native-dart-max-gap-mm`, and `data-native-dart-provisional-closure` on the actual Three.js canvas so automated QA can compare revision and dart geometry.
4. **Guard against false success.** The 2 mm flag is explicitly **provisional**. There is no `fitCertified` transition, no assumption that uncut fabric darts are present, and no inference that a low gap alone certifies a stable wrinkle, correct contact, reduced stretch or factory manufacturing.

## Measured evidence (disposable Rust only)

- Initial isolated 200×160 mm rectangle with 30 mm dart intake and 80 mm wedge depth remains an actual cut-and-sewn pattern: native material area decreases by exactly 1,200 mm², physical seam legs persist through undo/reopen, and the mesh is regenerated.
- At **10 CPU steps**, this dart's own maximum separation measured approximately **0.116429 mm**, while the whole garment's maximum separation was approximately **77.908491 mm**. The contrast proves why per-dart diagnostics are necessary. The native runtime is approximately 0.54–0.62 seconds per step in the tested avatar scene. The geometry query is not a penetration certificate.
- At **50 CPU steps**, the isolated rectangular dart measured **0.008355 mm** maximum gap. Its global seam gap still measured **3.545 mm**.
- In the T-shirt with independently placed front and back darts, the separate 3D dart gaps were initially **30 / 30 mm**; after **10 steps**, **0.140307 / 0.277685 mm**; after **50 steps**, **0.638816 / 0.107142 mm**. The front dart **rebounded** after 10 steps, proving closure is not monotonically decreasing; this is a physical-simulation diagnostic, not a certification.
- CPU solver steps measured about **0.35–0.62 seconds each**, so 200- and 1,000-step scenarios were **explicitly skipped** after the bounded 50-step tests. GPU is untested. OGC minimum-distance proximity is not an independent triangle-triangle penetration certificate.
- Independent disposable QA scripts: `node integrations/clothcraft/qa-dart-seam-convergence-20261020.mjs rectangle` and `node integrations/clothcraft/qa-dart-seam-convergence-20261020.mjs tshirt` both **PASS** for 0/10/50-step measurements. The installed QA app reopening test is `integrations/clothcraft/qa-installed-dart-reopen-worker2-20261020.mjs`.

## Validation

- `cd research/oss/clothcraft && ~/.cargo/bin/cargo test --no-default-features --test physical_cut_sewn_dart_20261020 --test notch_pair_atomic --quiet`: PASS (4 physical-dart tests, 2 paired-notch tests).
- `~/.cargo/bin/cargo build --no-default-features --bin exo-session --quiet`: PASS.
- `node integrations/clothcraft/qa-dart-fit-inspector-20261020.mjs`: **PASS**, full source UI and isolated native bridge. Rust revision **2→12** after 10 steps; dart maximum gap **30.000000→0.116429 mm** and RMS **17.320508→0.031695 mm**. Actual visible Fit inspector max/RMS equals the native snapshot. Actual rendered Three.js canvas reports `data-native-dart-count=1`, matching gap **0.116429 mm**, and exact mesh revision **12**, with zero browser errors. No production writes.
- React/JSX parsing of Board, Scene and Workspace: PASS.
- `node --test src/core/nativeFreeCurvePoints.test.mjs src/core/patternGuideTracks.test.mjs src/core/patternCurveDrafting.20261019.test.mjs src/core/patternSewingGuideSampling.test.mjs src/core/patternVisualTokens.test.mjs`: **28/28 PASS**.
- Isolated `vite build --outDir /tmp/exo-dart-fit-embedded-final-20261020 --emptyOutDir`: PASS with embedded Fit diagnostics; existing nonblocking oversized JS-chunk warning.

## Application isolation and reopening — PASS

The **separate** `EXO ClothCraft Studio V2 QA.app` was refreshed with current web assets, newly built Rust `exo-session`, and the source `integrations/clothcraft/workspace.mjs` bridge, signed and **reopened as PID 86783**. The installed production `EXO ClothCraft Studio V2.app` (PID 76124), its native 5385/5386 services, and the user's original garment project were preserved.

The QA runtime fix was essential: the previously installed QA bridge appended `--gpu` whenever its Swift launcher requested it, but our newly built executable used CPU-only `--no-default-features`. Before the fix, `POST /workspace` returned **422, “Build with desktop for GPU simulation”**, and the 2D/3D viewport stayed blank even though `/health` claimed `nativeReady:true`. The current source bridge probes the actual binary capability and safely defaults to CPU when GPU has not passed parity. This bridge file was copied into the **QA app only** with a backup, never into production.

**Final installed-QA verification:** `docs/qa/dart-reopen-worker2-20261020/verification.json` reports `pass:true`, zero browser errors, native snapshot ready, **six 2D SVG elements** with 487 child elements (visible front/back cutlines), a rendered avatar and cloth in the real 3D viewer, both backend port **5485** and static port **5486** healthy, a visible Physical Dart tool, and the new `data-dart-fit-inspector`. The actual 3D canvas reports `data-native-dart-count=0` because the original QA project has **no authored physical dart**, not because the feature is missing. A separate **disposable** source UI/native test proved one authored dart with 10-step seam-gap data on the actual 3D canvas.

Screenshots: `docs/qa/dart-reopen-worker2-20261020/qa-installed-2d-3d.png` and `docs/qa/dart-reopen-worker2-20261020/qa-installed-fit-inspector.png`. The local QA app remains running; this does **not** update the regular production V2 installation.

## Next unresolved physical engineering requirements

1. Inspect dart **specific** seam closure over 50/200/1000 simulated steps when feasible; keep bounded-runtime QA instead of assuming a short test extrapolates to stable long-run drape.
2. Independently check cloth–cloth and cloth–avatar penetration and stretch; OGC contact metrics and maximum-gap numbers alone are not an independent collision proof.
3. Engineer a genuine **uncut folded dart**. Current `domain::validate` prohibits internal material lines from touching either the outer cutline or another internal line, preventing a true common tip/leg topological fold; the existing `DartCutSew` removes the wedge and stitches both physical cut legs instead. Supporting a folded cloth dart requires robust material-crease topology, point identification and bending/contact coupling, not a decorative line.
4. Add multi-size seam/fold migration and qualified DXF/AAMA interchange before describing any output as factory-approved.

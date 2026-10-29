# ClothCraft upstream solver review and EXO integration

**Reviewed:** 2026-10-20 (local). **Official upstream:** https://github.com/erythrofr/ClothCraft, current inspected `main` `5d54b0bee46d60672c9b7101e619ba245651853a`; prior `78b359cb2cbf8367e3615a5679d30184a14f851b`. **Our fork:** https://github.com/mikristian/ClothCraft. No remote pushes, no installed app writes and no user garment edits.

## What was actually upstream

- `78b359c`: portable project documents, partial/chain sewing and conservative cached BVH bounding-box pruning for CPU OGC contact queries. The contact improvement removes unnecessary exact pair work without removing actual contacts. Upstream documents 7.7% and 21.0% reductions in *contact detection time*, not full-cloth FPS, on its historical T-shirt/apron workloads.
- `5d54b0b`: large modular VBD solver refactor, robust OGC feature and directional contact research, GPU contact-candidate filtering, dense solver laboratory, experimental coupled seam-refinement, benchmarks and validation oracles. This is a broad experimental engineering update, not proof of a drop-in faster/better production solver.
- Open pull requests by community contributors were reviewed separately; as of the review there were **no merged third-party solver PRs** corresponding to these upstream changes. The newer solver-lab commit is published by repository maintainer `erythrofr`. Do not attribute its implementations to an unmerged external author.

**Key quality limitation from upstream's own results:** baseline VBD had about 13.6 mm final seam gap in the cited dress comparison, versus approximately 475 mm for their XPBD+OGC prototype, with far worse stretch. An additional seam-block research refinement failed the settled-motion gate and remains **off by default**. Neither prototype was activated in EXO. GPU speed claims from upstream's earlier RTX3090 experiments have not been reproduced on our Mac.

## Changes applied to the active EXO source

The **existing** `research/oss/clothcraft` working tree keeps its original Rust API, CAD authoring, real cut-and-sewn darts, native session bridge and accepted-state 3D diagnostics. From upstream `78b359c`, imported these minimal, compatible source changes:

- `src/ogc/bvh.rs`: access to the current refitted primitive bounds, including temporal-cache reuse.
- `src/ogc/world.rs`: conservative radius-padded AABB pruning of vertex/triangle and edge/edge candidates before costly narrow-phase geometry, rejection accounting and an exact-oracle regression over cache reuse, radius changes, translation and motion.

**Active-source acceptance:** its 24-frame cached/unpruned exact contact equivalence regression **PASS**. A subsequent active-original `cargo test --locked --no-default-features -j 2 --lib --test physical_cut_sewn_dart_20261020 --test vbd_post_step_contact_metrics --test vbd_residual_contract -- --test-threads=2` passed **19/19**, including physical sewn darts and final-state contact/residual metrics. This is a behavior-preserving CPU contact optimization; it does **not** establish the overall cloth solver is faster without matched local measurements.

## Full latest-upstream integration, isolated and committed

An independent Git worktree is saved at:

`research/oss/clothcraft-upstream-solver-review-20261020`

Branch: `integration/upstream-solver-lab-20261020`, based directly on `5d54b0b`, with our EXO adaptations and native authoring changes committed on top. The complete upstream model, OGC, VBD, GPU solver refactor, optional lab, associated tests and docs are present **in this branch**, rather than partially grafted into the production source.

Conflicts resolved to retain:

- physical `DartCutSew` and `NotchPair`, free-curve material knots, POM/annotation references, cutline export and the EXO JSON-lines `exo-session` bridge;
- upstream's `BoundaryRef.reversed`, partial/chain sewing and `SeamSpec.a_tail/b_tail` model without dropping existing EXO seam relationships;
- EXO's actual **post-accepted-position** CPU contact detection and unconstrained RMS force residual (upstream otherwise reported some pre-step values);
- EXO's post-step GPU contact detection and 2 µm float-precision margin, preserved around upstream's GPU candidate filter and modular VBD;
- physical dart seam maximum/RMS gap reporting from the current solver geometry.

### Verification on combined source

- CPU library tests: **35/35 PASS**, including new solver laboratory, OGC/SIMD, coloring, local-step and seam-block tests.
- Focused EXO dart, notch, accepted-position contact and residual tests: **8/8 PASS**.
- OGC/cache, numeric POM, physical split, free-knot, physical sampling tests: **38/38 PASS**.
- Authoring, cutline manufacturing, documents, sewing chains, VBD and solver lab integration tests: **35/35 PASS**.
- **116/116 focused CPU tests PASS** in aggregate, with two Rust compiler jobs and two test threads.
- `cargo check --locked --no-default-features -j 2`: **PASS** for native compilation.
- `cargo check --locked --features desktop -j 2 --bin exo-session`: **PASS** for the macOS desktop/GPU code path, including native EXO bridge. No GPU execution or reliable local FPS comparison was performed.

Both exact upstream + EXO integration commits live locally. No production binary has been rebuilt or launched from the experimental integration branch, and no git remote was pushed.

### Matched CPU solver comparison

A new **disposable, real-binary** harness lives at `integrations/clothcraft/qa-upstream-solver-comparison-20261020.mjs`. It independently compiled the established active CPU `exo-session` and the integrated-branch CPU `exo-session`, retained both SHA-256 identifiers, serialized **one identical garment project** (T-shirt plus a 200×160 mm rectangle with a 30×80 mm physical dart), and reopened that same project in each native process. Both runs used two Rayon workers, 16 VBD sweeps and 1/60 s steps. Exact original mesh positions, UV and triangulation hashes matched. Each backend completed ten physical steps; median timing excludes the cold first step. No GPU device or installed app was involved.

| Paired run | Established median native step | Integrated median native step | Difference |
| --- | ---: | ---: | ---: |
| Baseline first | 626.969 ms | 535.772 ms | **14.5% faster** |
| Candidate first | 604.211 ms | 537.788 ms | **11.0% faster** |

**Physical result for both backends, both orders:** final dart maximum gap **0.116429485 mm**, RMS dart gap **0.031695074 mm**, whole-garment seam gap **77.908491 mm**, stretch P95 **39.055650%**, 340 active contacts, and a **0.232151 mm** minimum nearby contact distance. Both preserved **2,567 3D vertices and 4,752 triangles**. Measured native wall times reflect actual accepted CPU simulation; they are not GPU FPS or proof of 60 Hz.

Raw reports: `docs/qa/upstream-solver-comparison-20261020/baseline-first.json` and `candidate-first.json`. Two short ten-step sequences establish a **promising fixture-specific CPU improvement** but not universal speed, stable long-run fitting or collision certification. Neither XPBD/AVBD experimental candidate nor seam-block refinement was selected.

## Important release gates

1. Expand the now-passing paired ten-step CPU benchmark to several realistic saved garments and long-duration settled/pull/release windows (including independent collision audits), preferably repeated A/B/B/A under controlled machine load; do not extrapolate the 11–15% improvement to all scenes.
2. Exercise actual desktop GPU contact/shader precision and CPU/GPU seam parity with opt-in GPU permission before shipping a GPU backend. Merely compiling `--features desktop` does not validate GPU numerical correctness.
3. Extend dart and multilayer collision stability to longer 200/1000-step trajectories and independently validate cloth/cloth intersections, not only OGC proximity.
4. Only after those gates, promote the combined branch to the running application's native executable and reopen an **isolated QA app** for visual 2D/3D acceptance. Do not silently overwrite the installed production app or original garments.

**Decision:** keep safe upstream CPU contact pruning active today; the full new upstream solver and lab are **merged into a tested local integration branch**, not yet promoted to production. Experimental XPBD/AVBD and coupled seam refinement are explicitly opt-in/off.

**Work preservation:** a backup of the original dirty tracked Rust diff was created at `/tmp/exo-upstream-review-20261020/local-tracked-before.patch` before the review; untracked EXO source/tests were retained in the original worktree and integrated in the separate branch. The full solver integration is recoverable as local Git commits on its named branch rather than depending on that temporary patch.

# EXO ClothCraft Studio V2 — complete 2D mission, phase-1 engineering report

**Status:** partial milestone, not CLO3D feature parity or production certification. Audited 2026-10-18. Source workspace: `/blender-mac-workspace/exo-clothcraft-v2`.

## Authoritative document and ownership

- Existing physical source of truth: Rust `FittingProject` **version 1** containing `GarmentTemplate` **version 2**, plus a transaction history that is not retained as a complete multi-version database. Each panel has named boundaries and material rest coordinates in **metres**. JSON has stable panel, edge, seam, line, annotation and independently authored curve-point IDs where provided. The read-only reference gate validates these rather than inventing a second editor document.
- Rust owns numeric geometry, physical arclength, manufacturing reference validity, and sewing correspondence. The 2D React board submits commands to the native `exo-session` adapter. The 3D renderer reads compiled material mesh and does not define pattern sizes.
- `scripts/engineering/exo-garment-document-gate.mjs` now reports `exo-garment-reference-gate.v2` and checks version and material units, duplicate/dangling named references, promoted vertices, curve IDs/tangents, mirror link cardinality, internal-line IDs/geometry, target lengths, notches and seam pair ordering. It does not certify semantic darts, multi-size grade rules or physically cut samples.

## Implemented in phase 1

1. **Correct graded Bézier geometry:** `research/oss/clothcraft/src/bin/exo-session.rs` now uses the full sampled cubic outline to calculate grading bounds, including lobes beyond corner vertices, rather than sizing from only end vertices.
2. **Independent handle integrity:** non-uniform grade moves authored free-point positions and scales all stored incoming, outgoing and legacy Bézier material derivatives. Numeric control shapes remain affine-consistent through saved JSON.
3. **Target-length reference integrity:** named boundary targets survive grading, scaled by the actual old/new sampled physical arclength ratio rather than silently deleted. Invalid/non-finite/orphaned targets block grading without changing the source document. Physical seam allowances and notch depths remain in millimetres.
4. **Exact millimetre nudge adapter:** `Nudge` now forwards `delta_mm` to the existing Rust transaction (previously missing from native JSON command decoding).
5. **Four-garment construction fixtures:** `research/oss/clothcraft/tests/exo_four_garment_construction.rs` covers two-panel T-shirt, simplified four-panel trousers and hoodie, and simplified six-panel jacket; checks seam IDs, compilation, serialization/reopen, revisions and rejected illegal seam edits. **This does not mean full production garments have been modeled.**
6. **Isolated browser QA:** `scripts/engineering/tests/qa-2d-grade-browser-20261018.mjs` drives a genuine installed-web 2D grading form over a disposable native bridge, then checks material changes, one-step Undo/Redo, and save; does not mutate the installed app or the user's fitting project.
7. **Expansion offload for heavy QA:** `scripts/engineering/exo-expansion-2d-acceptance.sh` stages a unique source snapshot and uses a unique Rust target on Jarvis's physically attached Expansion volume. Existing build trees are not overwritten.

### Verified execution results

- **Expansion source snapshot:** `/Volumes/Expansion/EXO-Engineering/exo-2d-acceptance-20261018-164456-88312/source`; unique remote build target beside it. Native Rust run completed in 5m21s with **28/28** passing: six four-garment fixtures, four ordinary free-knot split cases, four mirrored split cases, nine sewing attachment migration cases and five grading cases. Local captured log: `integrations/clothcraft/output/engineering-2d/exo-2d-acceptance-20261018-164456-88312.log`.
- **Latest local Rust adapter test** (`cargo test --locked --no-default-features -j 2 --bin exo-session`): **9/9 passed**, including two later added exact-mm Nudge decoder tests; those two adapter tests were run locally after the Expansion source snapshot, not miscounted as remote results.
- **Read-only reference gate:** existing original test suite **9/9 passed** after updating its historically incomplete template wrapper to a valid fitting-project version 1 and explicit native seam stiffness/ease fields. New adversarial suite: **one accepted valid document and nine correctly blocked invalid documents**.
- **Real-browser single-size grade QA:** `node scripts/engineering/tests/qa-2d-grade-browser-20261018.mjs` returned `pass:true`, front native revision 0→1, two visible 2D panels, one-step Undo/Redo, persisted save and zero page errors. Uses isolated Node/Rust workspace and HTML served by installed EXO V2; this does not update the installed Rust binary.
- **Real-browser point/sewing regression:** `node scripts/qa-v2-installed-mirrored-knot-split-20261018.mjs` passed mirrored pair creation, both new vertex IDs, symmetry group, one-step Undo/Redo, zero page errors. `node scripts/qa-v2-installed-free-curve-ui-20261018.mjs` passed authored free-point drag, geometry length, preview, independent and mirrored splits, and history with zero errors. Its shortcut test requires explicitly returning focus to the drafting board after SVG drag; a prior run timed out on the keyboard Undo check and the subsequent focused rerun passed. This focus dependency remains a UX regression candidate rather than evidence that every focus context supports Undo.
- **Installed baseline guard:** `node scripts/qa-installed-v2-bridge-smoke.mjs` passed on existing signed V2 (2 authored 2D panels, 4661 current 3D triangles, GPU status ready, no page errors). This tests the baseline app, not the undeployed new grade source.
- **Release handling:** authoritative `research/oss/clothcraft/src/bin/exo-session.rs` and mirrored `integrations/clothcraft/exo-session.rs` were synchronized after passing focused tests; an original adapter backup remains in `integrations/clothcraft/output/engineering-2d/`. No production release or overwrite of saved user garment occurred.

## Evidence and coverage

| Capability | Verified evidence | Current limit |
|---|---|---|
| Authoritative v1/v2 file and named sewing | Existing Rust model; JSON reference gate passes current saved 2-panel/8-seam project | No independent, versioned multi-size pattern history or authored measurement schema |
| Independent curve points and handles | 5 native grade tests pass, including asymmetric handle preservation and geometric reflection of target lengths | Needs exhaustive repeated split/merge and UI direct manipulation against complex designs |
| Reference integrity | 1 valid document + 9 deliberately corrupted gate fixtures correctly accepted/rejected | Gate is a preflight, not a schema migration engine or geometry certifier |
| Numeric 2D grading | Real browser: edit +25 mm/+17 mm, Undo/Redo, save; 2D panels visible, zero page errors | Only single-size affine grade; internal lines/holes unsupported; no size table/grade-point rules |
| Sewing | Existing native seam compilation and split/mirror migration tests; new fixture tests include invalid seam rejection | No full validated CLO-style seam walking/easing transfer across arbitrary altered topology |
| T-shirt, trousers, hoodie, jacket | Six native fixture tests passed in isolated Rust execution | Simplified rectangular trouser/hoodie/jacket fixtures do not exercise armhole, crotch, hood crown, shaped multi-panel jacket or full 2D-to-3D fit |
| Production cutlines/export | Existing Rust cutline engineering SVG/DXF proof and release blockers | Corner joins, physical scale, AAMA/ASTM, graded nesting and print/cutter calibration not certified |
| Direct CLO comparison | Existing `research/clo-2d-analysis/` screenshots and readouts; signed inspector documented | No new independent CLO live gesture performed in this phase |

## Persistent major P0/P1 gaps

1. **P0:** Stable authored measurement/POM references and dimensions linked to real point/edge IDs, with migration on split/merge/deletion, plus persistent history across application restarts.
2. **P0:** Native semantic dart intake/leg/apex folding, pleat fold depth/tuck and sewing semantics, including grade propagation, rather than only visually similar internal line guides.
3. **P0:** Disjoint/sewn split/merge paths with guaranteed lossless paired correspondence, reverse, easing maps and seam-walk feedback; measured tolerances must be proved on severe curved fixtures.
4. **P0:** Full numeric and pointer tool coverage for the 32 catalog slots, recording UI action, native operation, persistence, Undo/Redo and safe failure for each.
5. **P1:** True multi-size parametric grading with stored size codes, base-size bodies, control point rules and correspondence-preserving graded seams and cutting allowances.
6. **P1:** Shape-accurate complete T-shirt, trousers, hoodie and multi-panel jacket development with fit-aware layout and real 2D-to-3D construction, not only geometric smoke fixtures.
7. **P1:** Audited industrial cutlines, independent print-scale checks, reliable notch tooling, DXF interchange and traceable export approval by a qualified sample maker.

## Release boundary and test commands

```sh
cd /blender-mac-workspace/exo-clothcraft-v2
node scripts/engineering/tests/qa-garment-reference-gate-v2.mjs
node scripts/engineering/exo-garment-document-gate.mjs "$HOME/Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace/fitting-project.json"
node scripts/engineering/tests/qa-2d-grade-browser-20261018.mjs
cd research/oss/clothcraft
CARGO_INCREMENTAL=0 "$HOME/.cargo/bin/cargo" test --locked --no-default-features -j 2 --bin exo-session -- --test-threads=2
```

Expansion acceptance command (creates a new remote source and target, **not** a release):
```sh
bash scripts/engineering/exo-expansion-2d-acceptance.sh
```

**Release decision:** hold production app installation until the new source passes a complete regression, synchronized Rust adapter copies are reviewed with the prime agent, and a signed isolated V2 QA app passes cold reopen/2D/3D/sewing. Current user's saved project must never be overwritten by a test fixture. No CLO parity or factory approval may be asserted from these acceptance checks.

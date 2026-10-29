# Rust source integration patch — preserved outside the ignored OSS checkout

The upstream ClothCraft Rust clone in research/oss/clothcraft is **ignored by the outer EXO Git repository**. Its working-tree edits are real and tested but would otherwise be lost on a fresh clone. This directory saves a source patch for the authoritative polygon kernel and a focused regression test. The patch also includes older geometry work previously present in that checkout; review and reconcile it against the exact upstream commit before applying to another version.

Files:

- 20261018-native-polygon-engine.patch — portable Git diff for src/garment/polygon.rs, including stricter native contour and free-curve validation.
- edge_sampling_validation.rs — focused test source for tests/edge_sampling_validation.rs.
- cutline.rs and garment-mod.rs — native Rust cutline source and module declaration, including projected notch marking coordinates.
- cutline_production.rs — closed offset contour, projected notch, curved edge and fail-closed tests.
- authoring.rs — saved local Rust authoring source with split reference migration. Compare before applying to a different checkout.
- split_attachment_migration.rs and split_metadata_fail_closed.rs — seam and manufacturing metadata regression fixtures.
- 20261018-vbd-final-residual.patch — CPU VBD final-state gradient metric correction, relative to upstream ClothCraft commit `20b4db9064e5195f1843a9d75708fb77b6989eba`.
- vbd_residual_contract.rs — numerical finite-difference regression for the accepted VBD state; copy to `tests/vbd_residual_contract.rs`.
- 20261018-gpu-final-contact.patch — GPU VBD accepted-position contact snapshot, retaining transactional error handling and GPU timing distinctions.
- vbd_post_step_contact_metrics.rs — checks published CPU contact counts and proximity against a separate detection pass on accepted positions; copy to `tests/vbd_post_step_contact_metrics.rs`.
- gpu_post_step_contact_metrics.rs — opt-in hardware Metal regression for final accepted-position OGC metrics, copied to `tests/gpu_post_step_contact_metrics.rs`.
- gpu_cpu_assembly_parity.rs — opt-in hardware Metal numerical parity regression for a real T-shirt/Mannequin assembly. Intentionally ignored because the current GPU solver closes seams too slowly; do not add this to default CPU tests. Copy to `tests/gpu_cpu_assembly_parity.rs`.
- gpu_ogc_ball_precision.rs — standalone CPU-only numerical contract for f32 OGC trust-ball inward error budgets, including translated world origins; verifies finite sampled positions, not a universal GPU collision proof.
- gpu_vbd_hessian_precision.rs — standalone CPU-only numerical contract showing how GPU determinant early-out and shorter line-search can skip descent steps accepted by CPU Gershgorin regularization. Synthetic mathematical evidence only, not demonstrated real-cloth causality.
- 20261018-gpu-ogc-refresh-EXPERIMENTAL-DO-NOT-SHIP.patch — preserved isolated mid-iteration GPU OGC refresh research patch for `src/gpu_vbd.rs`. **Do not apply to production or bundle as the active GPU solver**. First-three-step seam parity passes but 40-step parity, resting contact and f32 near-contact numerical safety still fail; see `docs/physics-lab/GPU_OGC_REFRESH_IMPLEMENTATION_REPORT.md`. The canonical experiment and original logs remain in `.exo-build-scratch/physics-gpu-refresh-20261018T204719Z`.
- gpu_ogc_ball_precision.rs — standalone numerical f32 inward trust-ball packing contract; validates its documented simplified arithmetic model only, not arbitrary GPU WGSL execution.
- ../exo-session.rs — EXO-owned Rust JSON session adapter containing the pattern audit and curved affine grading changes (automatically staged by the existing macOS build script).

For a **fresh** ClothCraft checkout at the matching recorded base commit, from the outer EXO repo:

1. Review the source patch with git apply --check in the Rust checkout; do not apply it twice.
2. From the outer EXO repo root, run: git -C research/oss/clothcraft apply "$(pwd)/integrations/clothcraft/rust-patches/20261018-native-polygon-engine.patch". Prefer an absolute patch path to avoid ambiguity.
3. Reconcile and stage cutline.rs in the native garment module, exporting the module as shown in garment-mod.rs. Reconcile authoring.rs, copy the test fixtures, and stage ../exo-session.rs into src/bin/exo-session.rs.
4. Review/apply the CPU VBD patch to `src/vbd.rs` and GPU VBD patch to `src/gpu_vbd.rs` only after checking the upstream commit and local edits. Run cargo test --locked --no-default-features --test edge_sampling_validation --test cutline_production --test split_attachment_migration --test split_metadata_fail_closed --test vbd_residual_contract --test vbd_post_step_contact_metrics --test vbd, then cargo test --locked --no-default-features --bin exo-session. Validate the GPU source with `cargo check --locked --features desktop --bin exo-session`; on an actual hardware GPU run `cargo test --locked --features desktop --test gpu_post_step_contact_metrics -- --ignored`. The additional GPU numerical parity test `cargo test --locked --features desktop --test gpu_cpu_assembly_parity -- --ignored --nocapture` is **expected to fail** on the current GPU solver; it should pass only after a validated refresh correction. Finally npm run check:rust-cutlines.

Never reset or overwrite a dirty Rust checkout just to apply this patch. A patch conflict should be reconciled with its existing modifications. Manufacturing approval requires external CAD/plotting tests beyond all of these Rust passes.

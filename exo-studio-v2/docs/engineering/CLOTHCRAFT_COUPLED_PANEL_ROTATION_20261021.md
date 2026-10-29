# EXO ClothCraft — coupled panel sewing with contact and strain bounds

**Date:** 2026-10-21. **Status:** experimental Rust native source milestone in `research/oss/clothcraft-upstream-solver-review-20261020`; **not deployed to the installed application**, no published GitHub push. CLO3D physics parity is **not** established.

## Code completed

The CPU constrained VBD solver now has a secondary **six-degree-of-freedom coupled panel registration** candidate in `src/vbd/strain_limit.rs`:

- Each whole panel has translation and rotation unknowns. Sewing residuals retain exact signed, interpolated stitch weights.
- Assemble one damped joint least-squares normal matrix with **off-diagonal inter-panel blocks**, solve with pivot checking, fix a gauge panel, and leave panels containing pins fixed.
- Apply genuine quaternion rotations to the *entire* panel (not to just a seam edge), preserving principal material stretch and panel-relative distances. Translation steps are capped at 75 mm and rotation at 0.22 rad per candidate.
- Trial candidates must reduce weighted seam energy and obey old OGC trust balls, current endpoint intersection checks and final principal-strain checks. The solver evaluates both the existing translation-only candidate and the new coupled candidate, accepting the lowest-energy **feasible** result. A new metric `coupled_panel_motion_accepted` records whether the six-DOF step actually won.
- Ordinary VBD and the installed V2 native solver are unchanged. Existing bending is still handled by per-vertex VBD/hinge energy; this is **not** a fully converged, global bending/sewing/contact Newton solver, nor a swept CCD certificate.

For disposable off-body previews, `VbdSolver::register_rigid_panels` supports a separately verified rigid registration macro-step. The JSON-lines `preassemble-preview` op accepts optional `rigidRegistrationSteps` (0–40), performing a fresh contact detection and an endpoint intersection test before every accepted panel movement. The default is zero to preserve prior preview behavior. Its response reports registration acceptance counts and seam gap separately from subsequent ordinary constrained VBD steps.

**Safety:** registration never advances simulation time and cannot be used as a live avatar-contact teleport. Every preview remains `committed:false`, `avatarReentryValidated:false` and `sweptContactCertified:false`, with verified source snapshot, revision and save file unchanged.

## Quantitative, falsifiable acceptance

### Misoriented sewn-panel fixture

`tests/vbd_coupled_panel_orientation_20261021.rs` compiles a fixed/free two-panel sewing problem with an initial free panel misorientation. A translation-only least-squares correction has a provable nonzero seam RMS floor.

| Measurement | Recorded |
| --- | ---: |
| Initial sewn seam RMS | **294.75273 mm** |
| Translation-only optimistic residual floor | **110.38027 mm** |
| Final seam RMS, 30 constrained steps | **1.40379 mm** |
| Actual free panel-axis rotation | **144.42419°** |
| Accepted coupled-panel candidates | **12 of 30 steps** |
| Principal strain | **At or below 5% each accepted step** |
| Pins and independent endpoint contact | **PASS** |

This test **proves actual coupled rotational motion was selected** in a scene that translation alone could not close. It is a physical sewing test, not proof of a realistically draped T-shirt or suitable mannequin fitting.

The previous pinned off-body sewing QA and rigid/strain-contact regressions passed as well. CPU library unit suite **35/35 passed**. All runs reused the existing Rust target directory with `--no-default-features`; no GPU hardware run was performed.

### Full T-shirt — still NOT a fitted garment

The existing avatar-clear temporary T-shirt rest fixture starts with a **530 mm maximum sewn seam gap**. Its accepted results:

| Mode | Constraint | Maximum seam gap |
| --- | --- | ---: |
| Previous isolated VBD, 20 steps | 5% principal strain | **420.47 mm** |
| New coupled VBD, 20 steps (no extra registration) | 5% | **420.47 mm** |
| Registration 10 moves + 20 VBD steps | 5% | **373.59 mm** |
| Registration 20 moves + 20 VBD steps | 5% | **326.71 mm** |
| Previous VBD, 40 steps (comparison for effort, not exact time parity) | 5% | **326.72 mm** |

**Critical distinction:** the coupled rotational update was accepted **zero times** in the real T-shirt fixture. Its registered improvements came from the fallback safe translation, not rotations. The registration stage reaches the same gap after 20 registration + 20 VBD iterations as the existing VBD after 40 steps, but no matched wall-time benchmark was conducted. Do **not** describe this as a measured faster or more accurate T-shirt solution.

Native reports stored under `docs/qa/clothcraft-coupled-panel-20261021/`, including T-shirt 20-/40-step source preview checks and the 20-registration + 20-VBD verification. The preview independently verifies no saved garment position, simulation clock or revision changes, and explicit rejection of malformed registration inputs.

## Remaining release blockers

1. **Full T-shirt assembly:** complete both side and shoulder sewn seams below a measurable threshold (initial provisional 10 mm max) while maintaining independently validated material strain, full seam RMS, pins and no endpoint cloth/self/avatar intersections. Current 326.7 mm gap fails this.
2. **Genuine coupled bending:** add joint *nonrigid developable panel* degrees of freedom, not just six-DOF rigid panel motion, with consistent bending/membrane derivatives and a full implicit merit/objective descent gate. Large mismatched seam boundaries cannot be solved by one rigid pose per panel.
3. **Collision-safe avatar entry:** endpoint OGC nonintersection is not a swept collision certificate. A staged garment cannot be transferred onto an avatar until an independently checked swept/contact-constrained trajectory exists.
4. **Comparable CLO3D ground truth:** require matched avatar/fabric/rest geometry, seam ordering and long-run stability, before claiming the requested 70% maturity target.

**Release decision:** continue development only on the isolated integration branch. Do not install this solver as the live EXO engine yet, because the critical full-garment sewing gate is still failing.

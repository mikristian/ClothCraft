# Jarvis real-Thomas PPF trajectory: swept-body IPC guard

**Date:** 2026-10-13. **Status:** offline experimental contact-guard prototype; no change to production drape or saved Jarvis project.

## Source of truth from Jarvis's latest work

- Original local Blender scene: `blender_bridge/output/jarvis-upstream-fitting-solved.blend`.
- Original PPF payload: `blender_bridge/fixtures/jarvis-upstream-fitting.ppf.json`.
- Original PC2: path recorded in `blender_bridge/output/jarvis-upstream-fitting-solve.json`.
- Jarvis's PPF run successfully cached 12 samples (500 cloth vertices, 768 cloth faces). Discrete-frame BVH testing found no body/self surface crossings and a maximum 4.84% principal stretch, under the configured 5% threshold.
- A separate IPC swept-triangle test using the **evaluated** local 10,000-vertex, 17,999-face CLO Thomas skin found the source motion unsafe from frame 2→3. A discrete, collision-free set of keyframes is NOT proof that transitions are safe.

## Implementation

`blender_bridge/guard_ppf_thomas_trajectory.py` loads the real evaluated Thomas collider from the local Blender scene and the original PC2 cache. For each transition it uses IPC Toolkit's collision-free step-size query to accept only a conservative proportion of the proposed cloth movement. Accepted positions are **quantized to PC2 float32 and independently rechecked** with IPC. The implementation additionally checks for **nonadjacent cloth triangle self-intersections at accepted sample frames**. It does not claim continuous cloth-self CCD, constraint or sewing re-solving, a coupled contact barrier, or physical fitting approval.

The guard fails closed when the source pose intersects the avatar, an accepted sample self-intersects, a candidate cannot be collision-certified, or less than 1% of the frame's proposed displacement is acceptable. The final output is written to a **new** PC2 file, never over the original. Existing output/report paths are rejected rather than overwritten.

## Independent verification

Run `./scripts/check-jarvis-ppf-guard.sh` from the project root. It creates temporary outputs and automatically performs:

1. Five-frame safe-guard operation on the real Jarvis/Thomas scene.
2. Independent IPC Toolkit swept body/cloth CCD verification on all 4 accepted transitions.
3. Independent 5-frame cloth self/body surface intersection and principal stretch audit.
4. Twelve-frame rejection test; expects the guard to abort without creating a purportedly valid output.
5. SHA-256 integrity test of Jarvis's source `.blend` and PC2, confirming neither changed.

Results from this pass: **PASS**. In the five-frame guard, two source transitions were unsafe and backtracked: 2→3 accepted ~89.31% of proposed motion; 3→4 accepted ~86.67%. Independent verification shows **4/4 swept body transitions safe**, zero sampled-frame cloth/body and cloth self-intersections, and max 4.78% principal stretch.

## Full-length rejection is correct, not a finished fit

The initial research-only full 12-frame clipping pass prevented swept body crossings, but movement progressively collapsed (by frame 11 it accepted ~0.033% of the intended motion). A discrete check also detected **34 nonadjacent cloth self-crossing pairs**, first at frame 5. This 12-frame research cache (`jarvis-upstream-guarded-research-full.pc2`) must not be treated as accepted output.

The hardened guard rejects a fresh 12-frame attempt at **frame 6**, when the viable proposed movement falls to **0.922%**, below the 1% minimum. Crucially, **the refused attempt writes no PC2 or success report**. Passing the first four transitions therefore does not imply the later frames or complete garment are solved.

## Remaining work

Incorporate IPC body and cloth-self collision limits into the PPF time integration itself, with a constrained seam/rest-metric solve after any backtracking. Actual CLO Thomas surface geometry is already available to the offline Blender/PPF path, but the interactive native XPBD backend still uses overlapping analytic body proxies and has not passed the same physical acceptance criteria. All-frame sewing gaps, triangle strain, contact clearances, collision-safe swept motion and stable visual drape must be independently verified before enabling an automatic final fit.

**Preservation:** Private CLO Thomas source remains local, no body mesh export, no overwrite of user projects, no replacement of the production simulation and no claim of CLO3D-quality fitting.

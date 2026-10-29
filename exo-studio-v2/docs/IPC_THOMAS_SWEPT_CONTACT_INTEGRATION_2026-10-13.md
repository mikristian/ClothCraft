# IPC Toolkit / CLO Thomas swept-contact integration

October 13, 2026. This is an installed **high-fidelity collision-validation milestone**, not a claim that the interactive XPBD simulator has acquired triangle continuous collision detection or that IPC solves the cloth movement.

## Implementation

- Local ARM64 IPC Toolkit 1.6.0 Python wheel with SciPy installed in `research/oss-runtime/ipctk-py313/`. It is intentionally separate from the operating-system Python and existing Blender installation. IPC's checked-out source is in `research/oss/ipc-toolkit`.
- `blender_bridge/check_thomas_ipc_ccd.py` loads the private, already-evaluated `PPF_Avatar_ThomasBody` from the locally saved Blender scene. Its 10,000 vertices / 17,999 triangular faces and the cloth's 500 vertices / 768 faces go into a real IPC `CollisionMesh`.
- A native compiled `make_vertex_patches_filter` excludes body/body and cloth/cloth primitive pairs for **this separate cloth-to-body CCD audit**. Cloth self-intersections remain audited by `blender_bridge/check_ppf_dynamic_contact.py`.
- Each adjacent pair of actual PC2 frames is checked using `ipctk.is_step_collision_free`, and the safe fraction is measured with `ipctk.compute_collision_free_stepsize`. This catches collisions *between* frames which ordinary BVH overlap cannot detect.
- `ppf_backend/server.mjs` automatically invokes the IPC audit after PPF sewing/strain/frame-contact checks when the avatar mode is `local-thomas-body-mesh`. It requires all real Thomas cloth/body swept steps to pass before labeling a PPF garment an accepted fit. Missing/failed IPC validation fails closed, not silently accepted.
- `ppf_backend/fitAcceptance.mjs` implements the independent seam, strain, sampled contact and swept CCD acceptance rules; `src/App.jsx` displays the resulting IPC status in the Fit inspector.
- The proprietary Thomas avatar is read only on the local Mac. Only numeric reports are persisted, not copies of the private evaluated body mesh.

## Validated results

Full 10-frame pre-existing PPF Thomas T-shirt animation:

| Transition | IPC collision free | Max safe movement fraction |
|---|---|---|
| 0 → 1 | yes | 1.0 |
| 1 → 2 | yes | 1.0 |
| 2 → 3 | **no** | **0.88808** |
| 3 → 4 | no | 0.64987 |
| 4 → 5 | no | 0.00485 |
| 5 → 6 | no | 0.00101 |
| 6 → 7 | no | 0.02841 |
| 7 → 8 | no | 0.01257 |
| 8 → 9 | no | 0.05603 |

The already-recorded sampled-body contact report independently observed its first intersection at frame 3, consistent with IPC's swept result. The synthetic IPC test also passes: an entirely stationary 2-triangle scene is safe; moving the other triangle through the first yields a collision and safe step fraction ~0.4995.

Run the complete test with `npm run check:ipc-thomas`. This fixture test must **fail if it does not find the known unsafe transition**. Run independent acceptance scenarios with `npm run check:ppf-acceptance`.

Recorded numeric output (without Thomas mesh bytes): `blender_bridge/output/tee-thomas-ipc-ccd-report.json`.

## Deliberately not done yet

1. **No IPC projection inside the live 60-FPS browser/native XPBD time step.** This phase measures and rejects unsafe paths after PPF solves; it does not repair solver trajectories, update displayed drape, or guarantee a wearable shirt.
2. **No cloth self-CCD in the IPC pass.** The separate sampled BVH self-intersection audit remains mandatory, but swept self-crossings between frames can still be missed. This is the next IPC broadphase/filter extension.
3. **No animated posed-body CCD.** The scene contains an evaluated static pose of Thomas. Multi-pose / rigged animated avatar collision requires time-dependent body vertices and swept body motion.
4. The suite has not established physical fabric bending/shear calibration or acceptable 180cm interactive armhole strain. It cannot claim CLO3D parity.

## Next implementation dependency

For actual collision-free draping, integrate the IPC swept-step bound into the **native XPBD solver's iterative movement update**, not merely its reporting stage. That requires sharing the actual evaluated body mesh with the native backend (without packaging proprietary avatar assets), rescaling/seam convergence within the permitted step, and rechecking body **and self** contact each substep. Benchmark numeric stability and frame rate before exposing this as the default editor simulation.

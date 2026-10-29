# EXO ClothCraft V2 — collision-checked off-body sewing preview

**Milestone:** 2026-10-21. **Status:** isolated native source feature and disposable QA PASS; **NOT installed into the user's regular or QA apps**. No CLO3D parity percentage established.

## Implementation

The merged VBD/OGC solver source at `research/oss/clothcraft-upstream-solver-review-20261020/src/bin/exo-session.rs` now accepts an explicit read-only native request:

```json
{
  "op": "preassemble-preview",
  "revision": 0,
  "steps": 20,
  "strainLimitPercent": 5,
  "fromRest": true
}
```

**How the first stage operates:**

1. Clone the temporary state, without touching the active garment, undo stack, revision, simulation clock or save file. Default to actual material rest state; never derive material rest geometry from the 3D pose.
2. Only allow fully unpinned cloth in this off-body staging request. Rigidly translate the entire trial garment to at least 0.5 metres past the avatar's maximum Z bound. This avoids initial avatar intersections **in the staged workspace**; it is not a collision-safe real-time path from the original pose.
3. Use a separate CPU-only VBD/OGC solver with real cloth self-contact, sewing constraints, zero-gravity assembly and an opt-in upper bound on maximum *principal* material stretch. Reject invalid strain bounds, unsafe geometry or a failed native step.
4. Independently validate the accepted endpoint contact geometry at each constrained step. Keep the **best observed maximum-seam-gap checkpoint**, not necessarily the last simulated frame, because seam closure can rebound after improving.
5. Validate the final staged pose against the *actual* avatar mesh before returning a preview. The response includes preview vertices, seam gaps, upper principal extension, trial count, selected best step, rebound measurement and the offset. It **always** reports `committed:false`, `avatarReentryValidated:false`, and `sweptContactCertified:false`.

No working source/production app, connected device, saved personal garment, or production GitHub remote was changed.

## Native QA and precise observations

**Disposable source browser-free QA:** `integrations/clothcraft/qa-offbody-preassembly-preview-20261021.mjs`. This spawns the experimental native executable with a private temporary project, creates the T-shirt preset, checks malformed options fail, verifies accepted stage constraints, then proves the original native positions/time/revision and subsequently saved project positions are *identical* to before the request.

| Preset | Steps | Strain ceiling | Initial maximum seam gap | Best maximum seam gap | Improvement | Measured max principal extension |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| T-shirt | 10 | 5% | 530 mm | **467.35 mm** | 11.82% | 5.00% |
| T-shirt | 20 | 5% | 530 mm | **420.47 mm** | 20.67% | 5.00% |
| T-shirt | 20 | 25% | 530 mm | **465.76 mm** | 12.12% | 25.00% |

All three isolated T-shirt previews passed endpoint self-contact/avatar-staged collision checks, source snapshot nonmutation, and best-checkpoint assertions. A more generous strain allowance did **not** automatically improve sewing closure.

The second independent off-body sewing fixture, `tests/vbd_offbody_seam_staging_20261021.rs`, uses two sewn panels with fixed pins handled within an already-translated collision-free **test** geometry, not the pinned-disallowed native preview operation. The seam gap decreased from **96.42 mm** initially to **1.38 mm at step 10**, then **rebounded to 5.82 mm at step 30**. The independent principal material strain was below 25% and all tested accepted endpoints passed OGC geometric contact checks. Test PASS requires real progress below 10 mm; it explicitly **does not** assert monotone seam closure or a certified fit.

Raw reports:

- `docs/qa/clothcraft-offbody-assembly-20261021/tshirt-10step-5pct.json`
- `docs/qa/clothcraft-offbody-assembly-20261021/tshirt-20step-5pct.json`
- `docs/qa/clothcraft-offbody-assembly-20261021/tshirt-20step-25pct.json`

Supporting solver analysis: `research/oss/clothcraft-upstream-solver-review-20261020/docs/analysis/EXO_OFFBODY_STAGING_SOLVER_AUDIT_20261021.md`.

## Critical limitations and required second stage

**A real full T-shirt remains NOT successfully sewn in the strict mode.** A 420 mm worst seam opening is inadequate. Whole-panel translation alone cannot form an isometric wrap around an avatar; front and back patterns must *bend* to bring side/shoulder edges together without their interiors occupying the same surface. The current seam translation uses diagonal panel corrections and conservative OGC trust regions, and it is deliberately limited near collision.

To safely fit the stage-one cloth to an avatar requires a separate **collision-checked approach trajectory**, preferably swept triangle CCD and an independently tested contact-feasible multi-panel/bending solver. Neither a clear off-body endpoint nor sampling a few intermediate poses would certify continuous collision safety. The active native service must not commit an unvalidated teleport.

Recommended next falsifiable milestones:

1. Solve a coupled multi-panel seam objective *with explicit rigid/developable panel motion* and constrain both material strain and endpoint collisions, on sewn T-shirt fixtures. Report max/RMS seam gap and principal extension after 10/50/200 steps, not only an appealing preview.
2. Solve the re-entry/approach path with swept triangle CCD against the real avatar and multilayer self-contact. On failure, preserve the original garment and produce a blocker rather than updating it.
3. Compare both physical stages to identical CLO3D/ZOZO PPF fixtures before updating any maturity score or replacing the user's current installed simulator.

**Release decision:** keep this as an experimental native **preview-only** step in a committed local solver branch. The installed EXO V2 and QA apps remain on their previously verified engines; no unsafe production promotion.

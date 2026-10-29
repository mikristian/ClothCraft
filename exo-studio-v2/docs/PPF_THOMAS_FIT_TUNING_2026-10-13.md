# CLO Thomas PPF drape / ballooning tuning (October 13, 2026)

## Scope

The question was whether the shirt floats because of gravity, pinning, and contact-margin configuration, rather than limitations or incorrect integration of the PPF solver. This pass checked actual saved PPF values, installed material presets, ran an independent 20-frame Metal simulation with revised parameters and temporary supports, and tested surface contact, swept CCD, strain, seams, and fit clearance.

## Observed configuration issues and corrections

- Gravity was already **(0, 0, -9.81) m/s²**; arbitrarily increasing it is not justified.
- PPF fabric exports previously omitted shell Young's modulus and bending, inheriting generic defaults. The compiler now supplies installed solver preset equivalents: Cotton 5500/4.3, Silk 500/1.42, Wool 2000/3.67, Denim 10000/10 (Young normalized/bend). These are starting values, not calibration of the user's particular fabric.
- Both shell and body static collider now explicitly use the same 1 mm default absolute contact gap and 0 additional offset; controls allow user overrides.
- The interface default run length is 60 frames, rather than 10. A longer run is not a guarantee of convergence.
- Four experimentally selected soft shoulder supports and a -10 cm torso start alignment were implemented and **tested as an opt-in configuration**, but the resulting simulation FAILED independent contact/fit acceptance. Both are therefore **off by default**. A more aggressive pre-wrapped torso pose was also tested: no collision-free initial staging configuration was found across 1,584 candidates, so it remains an unselected research option.
- The shell's 5% strain cap was independently verified against raw exported frames; the maximum stretch observed was about 1.04944x.

## Real Metal test, not a theoretical solver claim

Source: `blender_bridge/output/ppf-fit-tuning-20261013/` (saved configured/solved Blender scenes, PC2 and JSON diagnostics).

| Audit | Result |
|---|---|
| PPF native Metal | completed 20-frame run |
| Starting body/self triangle intersections | 0 / 0 |
| All-frame principal strain <= 5% | **pass**, max 4.944% |
| Cloth self-intersection pairs | 0 detected across 20 frames |
| First body triangle crossing | **frame 3** |
| Maximum body triangle crossing pairs | **192** |
| IPC swept body collision | **FAIL**, first unsafe transition 2 → 3 |
| Mean sewn gap / maximum sewn gap | **1.01 cm / 9.979 cm** |
| Final mean torso distance to Thomas skin | **2.789 cm** |
| Final mean shoulder distance to Thomas skin | **2.603 cm** |
| Shoulder 90th-percentile unsigned distance | **5.887 cm** |
| Overall accepted garment fit | **NO** |

Earlier saved 10-frame body-safe run: torso distance 3.339 cm, shoulder 3.466 cm; however, this is a different run length and configuration, so the improvement is not an apples-to-apples experiment proving the value of the new parameters.

## New fit-quality gate

The PPF acceptance path now requires independent shoulder/torso proximity measurements in addition to collision, swept CCD, strain and seam closure for actual Thomas-mode jobs. The initial provisional thresholds are mean shoulder clearance <= 1.5 cm, shoulder p90 <= 3 cm, torso mean <= 2 cm, sampled across every frame. Proximity is unsigned nearest-body distance, so a value of zero DOES NOT prove that cloth is outside the avatar; body contact/CCD audits remain mandatory. Thresholds need visual/reference validation before production use.

## Remaining blocker

The solver completes and enforces configured principal strain, but the exported Thomas scene still crosses the evaluated body from frame 3 onward. Large seam gaps persist, and shoulder panels remain several centimetres away. The source of the constraint/contact discrepancy is not proven to be a parameter misconfiguration; further work must reconcile the PPF native contact geometry, loose-edge stitching through the body, static mesh encoding, and IPC-bound collision steps, then repeat the test using staged garments with genuinely small initial seam gaps and safe body clearance. Do not label the current result penetration-free or naturally fitted.

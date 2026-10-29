# Legacy JS shoulder contact: 120-frame mode comparison

Run `node scripts/check-avatar-shoulder-modes.mjs` from the project root. Each row builds a new tee simulation at 60 Hz for 120 frames. Modified means shoulder width 54 cm, neck 44 cm, bicep 40 cm, arm length 78 cm. The limited modes use a lateral displacement cap of 8 mm; the standard/default configuration has no explicit mode. Mean seam gap is measured over the simulated seam constraints; intrusion samples triangle centroids and edge midpoints, **not continuous triangle CCD**. Results are deterministic within this test environment, not measured physical fabric validation.

| Height | Body | Mode | Peak structural strain % | Mean seam gap mm | Penetrating faces | Deepest sample mm |
|---|---|---|---:|---:|---:|---:|
| 160 | standard | default | 154.90 | 8.79 | 29 | 51.18 |
| 160 | standard | limited | 271.19 | 9.25 | 11 | 7.78 |
| 160 | modified | default | 133.51 | 8.75 | 31 | 9.11 |
| 160 | modified | limited | 264.99 | 9.18 | 8 | 9.61 |
| 180 | standard | default | 165.42 | 9.81 | 23 | 60.71 |
| 180 | standard | limited | 272.92 | 9.23 | 7 | 2.58 |
| 180 | modified | default | 455.60 | 9.40 | 8 | 3.85 |
| 180 | modified | limited | 265.07 | 9.28 | 6 | 1.79 |
| 200 | standard | default | 93.45 | 8.34 | 12 | 9.04 |
| 200 | standard | limited | 173.24 | 10.14 | 22 | 56.90 |
| 200 | modified | default | 119.88 | 8.59 | 24 | 10.97 |
| 200 | modified | limited | 312.49 | 9.14 | 6 | 2.72 |

Adaptive-limited mode is numerically equal to limited mode at 180 cm and to default at 160 and 200 cm because its current height gate is 175–190 cm. That gate is a heuristic and is **not validated as a correct physical contact model**.

The worst modified 180 cm default edge is back:13 to back:140, 11.180 mm rest to 62.118 mm deformed, 455.6% extension. Its back:13 endpoint belongs to seam-shoulder-r. The nearby right-shoulder seam gap reaches 36.0 mm. Large endpoint contact-depth reporting (75.26 and 36.51 mm) is consistent with strong contact pressure at this edge, but does not prove contact is its sole cause. The lateral mode decreases peak extension for this specific case while worsening other avatar configurations. It therefore should **not** be enabled by default.

Next engineering requirement: solve collision and seam closure as compatible constraints on a shared shoulder/armhole contact surface, with edge/triangle contact and material-strain control. Compare across the full fixture matrix, preserve independent pattern rest lengths, and validate time-continuous collision before asserting physical correctness. No solver change was made in this diagnostic pass.

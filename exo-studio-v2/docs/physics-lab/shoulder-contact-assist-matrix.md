# Shoulder contact-assist interaction matrix

Run: `node scripts/check-avatar-shoulder-contact-matrix.mjs`. Complete study: **48 runs**, each a fresh tee fixture integrated for 120 frames at 60 Hz: 160/180/200 cm, standard or modified (54 cm shoulder, 44 cm neck, 40 cm bicep, 78 cm arm), seam midpoint stabilization on/off, body triangle assist on/off, and continuous sampled surface correction on/off. All options are assigned only to in-memory projects. No app or `physics.js` modifications.

Metrics: maximum and P95 structural edge absolute strain (%), maximum seam endpoint gap (mm), sampled triangle faces with interior penetration and maximum sampled intrusion (mm). Continuous-assist accepted count is the number of frames in which `correctAvatarSurfaceIntrusion` accepted a position correction; correctedVertices sums reported corrected vertices on accepted frames (and can count the same vertex multiple times across frames). The face sample diagnostic uses barycenters and edge midpoints; it does not establish triangle CCD.

The following rows use the **current code's exact explicit option combinations** with midpoint stabilization enabled. `00` means both optional assists disabled; `10` triangle assist alone; `01` continuous surface correction alone; `11` both. Columns show peak strain / P95 strain / maximum seam gap / penetrating faces / maximum sampled intrusion. Full individual-case values are emitted as JSON lines by the reproducible script.

| Fixture | 00 | 10 | 01 | 11 |
|---|---|---|---|---|
| 160 standard | 93.93 / 18.14 / 17.21 / 31 / 21.96 | 154.90 / 26.16 / 21.32 / 29 / 51.18 | 121.55 / 23.76 / 22.27 / 43 / 25.65 | 151.14 / 30.36 / 29.72 / 17 / 38.00 |
| 160 modified | 117.59 / 24.60 / 25.71 / 22 / 10.39 | 133.51 / 27.71 / 23.41 / 31 / 9.11 | 133.70 / 26.90 / 24.95 / 37 / 12.39 | 133.57 / 28.89 / 23.86 / 34 / 9.96 |
| 180 standard | 581.81 / 37.83 / 34.91 / 20 / 5.52 | 165.42 / 28.39 / 34.98 / 23 / 60.71 | 206.90 / 23.69 / 33.88 / 7 / 4.38 | 516.50 / 40.31 / 36.42 / 7 / 3.39 |
| 180 modified | 460.37 / 34.53 / 34.59 / 10 / 5.34 | 455.60 / 35.23 / 36.01 / 8 / 3.85 | 460.60 / 34.79 / 34.58 / 12 / 5.20 | 203.60 / 27.87 / 34.25 / 6 / 1.92 |
| 200 standard | 556.83 / 20.00 / 16.06 / 17 / 8.49 | 93.45 / 20.19 / 13.59 / 12 / 9.04 | 97.45 / 20.27 / 13.27 / 15 / 5.95 | 89.36 / 20.72 / 13.61 / 13 / 7.84 |
| 200 modified | 119.06 / 24.74 / 14.84 / 30 / 9.98 | 119.88 / 27.11 / 14.12 / 24 / 10.97 | 118.63 / 24.65 / 14.72 / 28 / 9.99 | 121.82 / 27.23 / 14.21 / 20 / 9.77 |

Continuous correction accepted on **98/120 frames** for standard 180 cm with seam stabilization enabled and surface-only mode; this improved peak strain 581.81% → 206.90%, P95 37.83% → 23.69%, penetrating faces 20 → 7 and deepest intrusion 5.52 → 4.38 mm, yet maximum seam gap remained substantial at 33.88 mm. On standard 160 cm, enabling continuous correction alone instead worsened peak strain 93.93% → 121.55%, P95 18.14% → 23.76%, seam gap 17.21 → 22.27 mm, penetrating faces 31 → 43 and intrusion 21.96 → 25.65 mm, despite accepting correction on 53 frames.

On modified 180 cm, combined mode accepted 5/120 corrections and improved peak strain 460.37% → 203.60% and sampled intrusion 5.34 → 1.92 mm, while standard 160 cm combined mode worsened peak strain 93.93% → 151.14%, P95 18.14% → 30.36%, seam gap 17.21 → 29.72 mm and sampled intrusion 21.96 → 38.00 mm. These interactions are highly nonlinear.

Removing seam midpoint stabilization also lacks a safe global effect. Standard 180 cm with both assists disabled changed peak strain 581.81% → 655.67%, P95 37.83% → 44.82%, maximum seam gap 34.91 → 36.07 mm and penetrating faces 20 → 61. With triangle assist alone, disabling midpoint stabilization changed peak strain 165.42% → 696.41% and increased maximum seam gap 34.98 → 37.76 mm. On the standard 200 cm without both assists, disabling midpoint stabilization reduced peak strain 556.83% → 124.46%; this conflicting response reinforces that a height-based branch is unjustified.

## Engineering decision

**No global solver adjustment is justified from this matrix.** The continuous correction's acceptance predicate compares post-correction triangle penetration in an individual frame, not strain, seam gaps or future-frame behavior. The triangle-centroid pass can redistribute penetration and substantially change constraint convergence. Midpoint projection can stabilize sewn cloth in one geometric arrangement while driving another arrangement across competing collider surfaces. Avoid hardcoded height rules or enabling all assists by default. A defensible successor would evaluate seam/contact compatibility in the same constraint solve with energy/strain bounds and both edge and triangle interior collision checks; validate geometry across all six fixtures and include additional garments.

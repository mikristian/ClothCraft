# Live CLO 7 right toolbar evidence — 17 October 2026

At 13:48 EDT, the signed `~/Applications/EXO CLO Inspector.app` inspected running CLO (`PID 22394`). Its one-shot report at `~/Library/Application Support/EXO-CLO-Inspector/latest-status.json` records `generatedAt: 2026-10-17T17:48:22Z`, `accessibility: true`, `screenRecording: true`, `cloWindowCount: 1`, `warnings: []`. The current window screenshot is `~/Library/Application Support/EXO-CLO-Inspector/clo-property-editor-reference.png`. This is fresh accessibility evidence, not a screenshot-based inference.

The **right-side 2D toolbar** is two independent vertical columns. Each button frame is 34×30 screen points. Column A has x=1096 and 17 named commands; column B has x=1132 and 15 commands. Coordinates below are the observed button top edges; pair rows by displayed y where applicable, preserving each column's own gaps.

| A slot | A title | y | B slot | B title | y |
|---|---|---:|---|---|---:|
| A01 | Transform Pattern | 136 | B01 | Edit Sewing | 136 |
| A02 | Edit Pattern | 170 | B02 | Segment Sewing | 170 |
| A03 | Fullness (Point) | 204 | B03 | Free Sewing | 204 |
| A04 | Polygon | 238 | B04 | Check Sewing Length | 238 |
| A05 | Internal Polygon/Line | 272 | B05 | Steam | 282 |
| A06 | Base Polygon | 306 | B06 | Seam Taping | 326 |
| A07 | Trace | 340 | B07 | Edit Texture (2D) | 370 |
| A08 | Notch | 374 | B08 | Transform Graphic | 404 |
| A09 | Seam Allowance | 408 | B09 | Graphic (2D Pattern) | 438 |
| A10 | Walk Pattern | 452 | B10 | Edit Topstitch | 482 |
| A11 | Edit Point of Measure | 496 | B11 | Segment Topstitch | 516 |
| A12 | Point of Measure | 530 | B12 | Edit Puckering | 560 |
| A13 | Edit Annotation | 574 | B13 | Segment Puckering | 594 |
| A14 | Pattern Annotation | 608 | B14 | Set Sublayer | 638 |
| A15 | Pleats | 652 | B15 | Fill | 682 |
| A16 | Edit Grading | 696 | | | |
| A17 | Auto Grading | 730 | | | |

For comparison, **left-side 3D** x=232 A (20 controls) and x=268 B (18 controls) likewise matches the exact titles and independent y ordering in `src/data/clo7ToolbarOrder.js`. The older `docs/CLO_V7_EXACT_DUAL_TOOLBAR_ORDER_2026-10-16.md` describes inferred icon shapes, counts 19+19 for 3D, and misidentifies several 2D actions. Treat the fresh accessibility titles above and the later manifest as stronger evidence of this installed CLO arrangement. The top row pairing requested by the user is directly confirmed: **Transform Pattern / Edit Sewing** at y=136; the next pair is **Edit Pattern / Segment Sewing** at y=170.

**Unverified:** The inspector scans visible accessibility children and has no flyout expansion action. Therefore titles and positions of secondary flyout menu entries, hover descriptions, divider artwork and dynamic enabled states are not proven. Generic unlabeled `AXButton`s are excluded from the command inventory. This toolbar is the observed user configuration, not a universal factory default.

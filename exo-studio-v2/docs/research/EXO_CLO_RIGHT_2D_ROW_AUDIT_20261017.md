# EXO V2 right-side CLO7 toolbars — verified horizontal row audit

**Reference:** Running CLO 7.0.242, inspected 2026-10-17 at 13:48 EDT with the signed, authorized EXO CLO Inspector. Its Accessibility tree records the actual on-screen text, role and rectangle of each button. The reference screenshot and JSON are stored privately under `~/Library/Application Support/EXO-CLO-Inspector/`. The installed configuration has two columns: **A at x1096, 17 controls; B at x1132, 15 controls**. Each button is 34×30 points; its top Y in the live window relative to the first tool matches the EXO HTML toolbar within 1px.

The following rows are **paired at the same row number**, but after dividers an A and B ordinal may be at different real Y positions. We preserve the independent Y offsets; we do not force unrelated commands to align.

| Row | Column A — pattern / drafting | V2 support | Column B — sewing / materials | V2 support |
|---:|---|---|---|---|
| 1 | A01 Transform Pattern | Native: 2D panel transform | B01 Edit Sewing | Native: existing seam editor |
| 2 | A02 Edit Pattern | Native: edit authored points | B02 Segment Sewing | Native: select two full boundary segments |
| 3 | A03 Fullness (Point) | Unavailable | B03 Free Sewing | Native: editable fractional boundary ranges |
| 4 | A04 Polygon | Native: create pattern | B04 Check Sewing Length | Inspect: measured seam pairing |
| 5 | A05 Internal Polygon/Line | Native: internal line | B05 Steam | Unavailable |
| 6 | A06 Base Polygon | Native: selected primitive family | B06 Seam Taping | Unavailable |
| 7 | A07 Trace | Native: straight-edge outer contour only | B07 Edit Texture (2D) | Inspect: related fabric editor |
| 8 | A08 Notch | Native: persistent edge marker | B08 Transform Graphic | Inspect: physical-dimension graphics editor |
| 9 | A09 Seam Allowance | Native: saved cutting guide | B09 Graphic (2D Pattern) | Inspect: graphics editor |
| 10 | A10 Walk Pattern | Unavailable | B10 Edit Topstitch | Inspect: topstitch browser/editor |
| 11 | A11 Edit Point of Measure | Inspect: temporary metric measure | B11 Segment Topstitch | Inspect: topstitch browser/editor |
| 12 | A12 Point of Measure | Inspect: temporary metric measure | B12 Edit Puckering | Inspect: draft property browser |
| 13 | A13 Edit Annotation | Native: saved note editing | B13 Segment Puckering | Inspect: draft property browser |
| 14 | A14 Pattern Annotation | Native: saved note creation | B14 Set Sublayer | Unavailable |
| 15 | A15 Pleats | Unavailable | B15 Fill | Unavailable |
| 16 | A16 Edit Grading | Inspect: grading browser | — | — |
| 17 | A17 Auto Grading | Inspect: grading browser | — | — |

**Implementation totals:** 13 positions have an actual native V2 action; 12 open a related editor or limited inspector; 7 have no native implementation. These statuses describe EXO operations, **not** full equivalent behavior to CLO 7. Native Rust operations are validated separately from icon presence.

**Changes in this pass:** Referenced both columns' individual AX Y offsets for the browser layout; added divider rules in observed 10–14px group gaps; kept the requested A01/B01 pair on one horizontal row; separated B02 whole-segment sewing and B03 editable-range Free Sewing via distinct native toolbar capabilities and visible sewing workflows, including independent selected states. Added different original SVG artwork for segment/free sewing, base polygon, editing annotations, grading, POM, topstitch and puckering where generic duplicate icons previously obscured the difference.

**Verification:** `node integrations/clothcraft/qa-v2-right-two-bars-live-20261017.mjs` passed all 32 live CLO title/Y comparisons and browser slot geometry checks. `node integrations/clothcraft/qa-v2-sewing-variants-20261017.mjs` passed with isolated temporary native Rust session, B02/B03 mode selection, exposed numerical fractions and mode reset. `npm run build` passed. `GARMENT_UI_URL=http://127.0.0.1:5199/?desktop=1 node scripts/check-toolbar-svg-assets.mjs` passed 70 reference slots and 138 toolbar icons.

**Remaining implementation:** A03 point fullness, A10 walk, A15 pleats, B05 steam, B06 seam taping, B14 sublayer and B15 fill require dedicated Rust editing/solver semantics. The twelve inspect-only positions require their named CLO command to be implemented; visiting an EXO browser does not count as equivalence. Flyout tool children are not exposed by the one-shot inspector and remain unverified. The inspector verified icon position and accessible title, not exact CLO proprietary glyph pixels. These constraints should be resolved one command at a time with undo/save/reopen assertions before promoting status to native.

# CLO 7 left 3D A/B toolbar audit — 17 October 2026

## Provenance and access limitation

The signed `~/Applications/EXO CLO Inspector.app` captured the running CLO 7.0.242 application, PID 22394. The earlier successful `latest-status.json` read in this audit returned `accessibility: true`, `cloWindowCount: 1` with named `AXCheckBox`, `AXButton` and `AXPopUpButton` elements. Its controls have width 34, height 30, with left toolbar A at x=232 and B at x=268. The screenshot file `~/Library/Application Support/EXO-CLO-Inspector/clo-property-editor-reference.png` exists at 1512×900 (last modification at approximately 13:48 EDT). The last known successful screen-capture evidence is also documented in `docs/research/current-clo-right-toolbar-evidence.md`.

**Important live-capture limitation:** Running the inspector executable in a terminal in this audit overwrote `latest-status.json` at 14:42 EDT with `accessibility: false`, `screenRecording: false`, `cloWindowCount: 0`. This is a new inspector-permission/context failure, **not** proof that CLO lacks the buttons. The report therefore retains the named accessibility evidence seen before the overwrite, while the complete 38-slot inventory and additional y positions below are cross-checked against the previously captured source manifest. A fresh, successful signed-app inspector scan is needed to independently reconfirm every individual element. The screenshot was not visually inspected in this worker because the screenshot path is outside the connector's approved root.

## Left 3D toolbar order

Coordinates represent actual native `AX` button frame **top edge** for directly observed entries, or `observedY + 6` from the recorded `src/data/clo7ToolbarOrder.js` metadata for the remaining slots. Thus a reported y value without an individually retained AX excerpt is manifest-derived historical evidence rather than a new live measurement. A and B are independent vertical columns. Their matching ordinal numbers are **not** reliably the same horizontal row; match actual y values instead.

| A | 3D A control | y | B | 3D B control | y |
|---|---|---:|---|---|---:|
| A01 | Simulate | 136 | B01 | Play Motion | 136 |
| A02 | Select/Move | 180 | B02 | Edit Line (3D Pattern) | 180 |
| A03 | Select Mesh (Brush) | 214 | B03 | Line (3D Pattern) | 214 |
| A04 | Edit Styleline | 258 | B04 | 3D Base Pen | 248 |
| A05 | Edit Sewing | 302 | B05 | Edit 3D Pen (Avatar) | 292 |
| A06 | Segment Sewing | 336 | B06 | 3D Pen (Avatar) | 326 |
| A07 | Free Sewing | 370 | B07 | Edit Texture (3D) | 370 |
| A08 | Auto Sewing | 404 | B08 | Transform Graphic | 404 |
| A09 | Edit Tack | 448 | B09 | Graphic (3D Pattern) | 438 |
| A10 | Tack | 482 | B10 | Select/Move Button | 482 |
| A11 | Fold Arrangement | 526 | B11 | Button | 516 |
| A12 | Fold 3D Garment | 560 | B12 | Fasten Button | 550 |
| A13 | Reset 2D Arrangement (All) | 594 | B13 | Zipper | 594 |
| A14 | Reset 3D Arrangement (All) | 628 | B14 | Edit Piping | 638 |
| A15 | Re-drape 3D Arrangement | 662 | B15 | Piping | 672 |
| A16 | Hi-Res Garment | 706 | B16 | Select Binding | 716 |
| A17 | Edit Measure (Avatar) | 750 | B17 | Binding | 750 |
| A18 | Basic Tape Measure (Avatar) | 784 | B18 | Press | 794 |
| A19 | Edit Measure (Garment) | 828 | | | |
| A20 | Linear Measure (Garment) | 862 | | | |

Live AX excerpts captured during this pass confirm `Simulate` at (232,136), `Select/Move` at (232,180), `Select Mesh (Brush)` at (232,214), `Edit Styleline` at (232,258), `Edit Sewing` at (232,302), `Segment Sewing` at (232,336), `Free Sewing` at (232,370), `Auto Sewing` at (232,404), `Fold Arrangement` at (232,526), `Fold 3D Garment` at (232,560), `Reset 2D Arrangement (All)` at (232,594), `Reset 3D Arrangement (All)` at (232,628), `Re-drape 3D Arrangement` at (232,662), and `Play Motion` at (268,136). All these visible named controls have 34×30 AX frames. The remaining coordinates are historical manifest values as described above.

## Alignment, manifest mismatch and flyouts

* The source `src/data/clo7ToolbarOrder.js` has 20 named 3D A tools and 18 named 3D B tools in increasing y order. Its `observedY` coordinates are consistently **6 points above** the reported AX button-frame top edges in inspected examples. Using them as actual button-frame origins without applying this offset misaligns comparisons. These source values are evidence annotations, not fixed application CSS positions.
* The **first actual horizontal pair** is `Simulate` / `Play Motion` at y=136. The second is `Select/Move` / `Edit Line (3D Pattern)` at y=180. Farther down, differing section gaps mean that simply pairing `A05` with `B05` is incorrect: `A05 Edit Sewing` at y=302 lies between B05 y=292 and B06 y=326. Align by screen position and observed group separators, not ordinal slot.
* `docs/CLO_V7_EXACT_DUAL_TOOLBAR_ORDER_2026-10-16.md` is an older inferred screenshot inventory that reportedly counts 19+19. The later signed-AX named manifest and this audit support **20+18** for the captured configuration. The older count should not override the named AX evidence.
* `AXPopUpButton` confirms dropdown-capable controls (for example Simulate, Select Mesh (Brush), Edit Styleline, Segment Sewing and Free Sewing), but the inspector does not expand menus. The names, order and behavior of child flyout commands, hover tooltips, disabled/enabled states and exact divider artwork remain unverified; the zero-height unlabeled `AXButton` siblings must not be counted as additional commands.
* This records the user's current CLO toolbar arrangement, which may be customized, rather than asserting a universal default. Tool identity is distinct from EXO implementation parity; `null` action in the manifest does not implement that CLO operation.

**No source code was changed.** The user CLO project was not edited, and no interactive CLO toolbar action was activated.

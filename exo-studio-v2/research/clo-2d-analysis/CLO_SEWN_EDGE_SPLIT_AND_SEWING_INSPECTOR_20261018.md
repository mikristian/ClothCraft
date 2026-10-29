# Native CLO 7.0.242: sewn side-edge split, sewing inspection and reversibility

**Date:** October 18, 2026. **App:** actual running CLO Standalone OnlineAuth Academic 7.0.242 (r39887). **Driver:** signed `EXO CLO Inspector.app` with macOS Accessibility, CGEvent and ScreenCaptureKit. **Document:** only the disposable copied T-shirt `Male_T-shirt-direct-test-20261018.zpac` was used. No production EXO geometry or UI was edited in this experiment.

## Test 1 — splitting a side cutline

- Captured the original 2D/3D state as `clo-sewn-split-before-20261018.png`.
- Activated actual native `2D Pattern > Edit > Add Point/Split Line` (AXPress result **0**), then clicked the left torso side around window-relative `(787,521)`. CLO displayed a new outline node, a linked symmetric counterpart and two length annotations approximately **12.76 cm** and **13.41 cm**, in `clo-sewn-split-after-20261018.png`.
- A real CLO **Edit > Undo** AXPress returned success and the point markers disappeared (`clo-sewn-split-undone-20261018.png`). **Edit > Redo** returned success and the markers reappeared (`clo-sewn-split-redone-20261018.png`). A final **Undo** returned the side to its pre-split topology (`clo-sewn-split-restored-20261018.png`).
- The visible 3D garment did not materially deform under this straight cutline subdivision. The screenshot establishes a reversible *topological* insertion and a symmetry update. It does **not** establish any particular internal stable edge ID migration or manufacturing-file consistency.

## Test 2 — native Edit Sewing and sewing-length inspection

- Selected the real `Sewing > Edit Sewing` menu (AXPress **0**). In this mode CLO highlights seam-connected and garment-sewing edges in multiple colors, with paired segment endpoints shown on the 2D pieces and 3D shirt. Screenshot: `clo-sewing-inspect-tool-20261018.png`.
- Clicked the left torso side seam at approximately `(787,519)`. The selected sewing path displayed a blue difference/length summary approximately **-0.00 (26.17 / 26.18)** in centimetres (at the bottom of the 2D torso). Screenshot: `clo-sewing-inspect-selected-20261018.png`. This is a **directly visible matched sewing-length pair**, useful as a baseline. It is not a guarantee of numerical zero difference beyond the displayed rounding.
- Activated `Sewing > Check Sewing Length` through the native menu (AXPress **0**). CLO highlighted relationships on both sleeves, neck, and torso, including red warnings on some connections. Screenshot: `clo-sewing-length-mode-20261018.png`. The resulting floating `Check Sewing Length` window exposed **Length Difference 0.5 cm** and **Ratio Difference 10%** numeric controls in the macOS Accessibility tree. The checkbox enabled states were not reliably parsed, so **do not assume both thresholds were simultaneously active**.
- Closed the native 321×144-pixel `Check Sewing Length` floating inspector through its Accessibility button (AXPress **0**) without altering its threshold values or the garment.

## Attempted direct confirmation after split

After reactivating the Add Point/Split Line tool on the copied side, a combined split-and-Edit Sewing inspection reached a temporary native Accessibility failure: the active CLO window remained visible in ScreenCaptureKit, but `kAXWindowsAttribute` and the menu bar temporarily stopped responding. Therefore the automation **did not complete the sewing-length inspection during the active split**. The screenshot `clo-inaccessible-window-20261018.png` shows the new split marker still present, with 12.76 and 13.41 cm labels, but no proven sewing edge-reference readout.

A subsequent inspector pass recovered CLO Accessibility. The `Edit Sewing` tool was activated again (AXPress **0**) and the left seam selected. Screenshot `clo-sewn-split-sewing-selected-after-20261018.png` shows blue sewing edge overlays along the torso, including across the location of the split; this establishes **visual sewing overlays**, not integrity of persisted correspondence or stable IDs. Floating sewing/selection UI occasionally appeared as a small separate native Accessibility window, so exact one-window guards were inappropriate after entering this mode.

Finally, a successful native **Edit > Undo** (AXPress **0**, enabled true) restored the straight side and removed the newly inserted point (`clo-sewn-reference-undo-before-20261018.png`, `clo-sewn-reference-undo-after-20261018.png`). A post-action inspector pass intermittently reported `CLO Accessibility window tree unavailable`, despite the capture visibly continuing and the application remaining open. No further edit was dispatched in that degraded state.

## Outcome matrix and evidence strength

| Question | Outcome | Strength |
| --- | --- | --- |
| Can a side cutline split while a sewn garment is loaded? | **Yes**, point inserted with symmetric counterpart and length subdivisions | Direct 2D/3D screen capture + AX result |
| Does Undo/Redo restore the split transaction? | **Yes**, Undo/Redo/Undo visually changes/removes the node markers | Direct screenshots, native menu results |
| Is the original seam-length pair approximately matched? | **Yes**, displayed **26.17 / 26.18 cm**, difference **-0.00 cm** | Direct native `Edit Sewing` selection |
| Does CLO have built-in sewing-length difference inspection? | **Yes**, `Check Sewing Length` menu and floating threshold controls | Direct menu + Accessibility window |
| Does the exact new split preserve paired sewing edge references, notch IDs and seam allowance data? | **Not yet verified**; saw colored sewing overlays after split, but could not compare stable references and exact paired values before and after the split | Insufficient evidence |
| Did the original user garment or copied file change on disk? | Neither file was intentionally saved; verify matching hashes again at handoff | File checksum required |
| Was point-of-measure, notch creation or sewing M:N behavior tested? | No native geometry operation attempted in this run | Not tested |

## EXO engineering consequences

1. Native Rust `SplitBoundary` currently refuses sewn/notched/allowanced edges to protect manufacturing data. CLO's visibly allowed side cutline split shows that EXO needs an **atomic reference-preserving split** rather than indiscriminately disabling editing. This should atomically migrate ordered directed sewing intervals, allowance lengths, notch positions, corner treatment, grading dependencies, and POM references, with Undo/Redo on all linked pieces.
2. EXO should expose `Edit Sewing` independently from `Check Sewing Length`, and render each partner's 2D lengths with signed difference and a selected deviation threshold. Actual CLO baseline: **26.17/26.18 cm**, with controls displayed at **0.5 cm** and **10%**.
3. To prove true reference parity, compare the live sewing-length summary **during the split** with the pre-split pair, then export a supported DXF-AAMA/ASTM/Tech Pack on a safely copied garment with sufficient disk. Colored stitches alone are not proof of manufacturing alignment.
4. The native test helper must account for small floating windows and recover transient Accessibility losses without issuing unguarded edits. Commands that fail to verify the intended copied garment should stop and leave the source untouched.

## Safety and next test

Disk free capacity fluctuated from approximately **9.3 GiB to below 8 GiB** during the attempt, below CLO's prior 10 GiB low-space warning. The current copied fixture was left open, with the inserted test point undone, and no original file written. **Before further CLO geometry tests**: reclaim at least 10 GiB of safe free space without touching EXO backups or user assets; confirm CLO Accessibility and the single copied test document; then verify sewing length on the *active* split, followed by a reversible notch placement test and a native persisted POM test. Do not treat unrun tests as passed.

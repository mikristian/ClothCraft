# Direct CLO 7 2D pattern gesture testing through Chat On Steroids MCP

**Date:** 2026-10-18. **Application:** installed CLO Standalone OnlineAuth Academic 7.0.242 (39887), macOS. **Access:** Chat On Steroids Core MCP → signed native `EXO CLO Inspector.app` (`com.mikristian.exo.cloinspector`) → macOS Accessibility/CGEvent/ScreenCaptureKit. This is real CLO interaction: tool selection, physical pointer gestures, app-level Undo, and screenshots of the running CLO application. It is not a simulated EXO UI or a reconstructed image. The standalone Chat On Steroids shell process itself lacks TCC Accessibility access, so the existing signed helper performs authorized actions.

## Test isolation and controls

1. Baseline: user-loaded `Male_T-shirt.zpac` shown in actual CLO, with asymmetric visible 2D panel portions, neckline, shoulder, armhole, internal lines, notches/sewing marks. Initial one-shot live inspector confirmed `accessibility=true`, `screenRecording=true`, one CLO window, no warnings.
2. A byte-for-byte copy of the local CLO asset `~/Documents/clo/Assets/Garment/Male_T-shirt.zpac` was created as `research/clo-2d-analysis/native-fixtures/Male_T-shirt-direct-test-20261018.zpac` (about 892 KB) and opened through CLO's actual **Open Garment → Open → OK** dialog. The 2D pane auto-reframed to the full pattern, then into a selected/front-panel view after invoking Edit Pattern. Tool geometry was calibrated against freshly captured screenshots after the reframe.
3. Explicit probes are available via the signed helper flags in `integrations/clothcraft/macos/clo-inspector-bridge/main.swift`. They constrain any authoring gesture to the exact named copied fixture and require a single CLO window. Default unflagged inspector invocations remain read-only; no save, simulate, publishing, CLO internal APIs or external account actions were performed.
4. The original garment was reopened in CLO after the tests. A final inspector read verified a single CLO window, the visible `Male_T-shirt.zpac` title, and Screen Recording + Accessibility still authorized. `cmp -s` of the original and copied `.zpac` files passed, showing neither was saved/altered on disk by the tests. The signed app still passed `codesign --verify --strict`.

## Actual observed CLO behavior

| Test | Input applied to running CLO | Observed result | Evidence |
|---|---|---|---|
| Select Edit Pattern | Click actual Accessibility-located 2D `Edit Pattern` toolbar control | Tool became active. A subsequent direct click at the center-neckline node changed 2D pattern selection, dimming the unselected mirrored half. | `clo-native-edit-pattern-selected-20261018.png`, `clo-native-point-selection-20261018.png` |
| Shoulder point drag | In the copied T-shirt's reframed 2D view, drag left shoulder anchor with native down/drag/up events | CLO selected the corresponding 2D/3D pattern and displayed live segment measurements and construction guides. The selected shoulder point shifted visually. A focused CLO Command-Z restored the original outline. | `clo-native-round2-before-drag-20261018.png`, `clo-native-round2-after-drag-20261018.png`, `clo-native-direct-focused-undo-20261018.png` |
| Straight segment length | Click left shoulder outline segment at observed local image coordinate (800,206) | Selected edge highlighted yellow; numeric 2D line length **16.30 cm**, `+ Symmetric Line Len` **32.59 cm**, 3D line length **16.24 cm** in CLO's Property Editor. Selected garment in 3D highlighted yellow. | `clo-native-direct-shoulder-segment-20261018.png` |
| Neckline curved segment length | Click actual left neckline curved boundary at (855,225) | Curved segment highlighted yellow, adjacent segment cyan, displayed 2D line length **17.00 cm**, `+ Symmetric Line Len` **34.00 cm**, 3D line length **16.93 cm**. Numerical 2D readout follows true curve length and does not equal the 3D draped length. | `clo-native-direct-neckline-segment-20261018.png` |
| Curve handle drag | Drag the visible neckline control around (852,241) by approximately (-15,-16) screen pixels on copied garment | CLO visibly reshaped the neckline and increased its selected curved length from **17.00 cm** to **17.11 cm**. After refocusing CLO and sending Command-Z, the line length returned to **17.00 cm** and the original curve silhouette was restored. | `clo-native-curve-before-20261018.png`, `clo-native-curve-after-20261018.png`, `clo-native-curve-focused-undo-20261018.png` |

**Caveat on Undo focus:** A first attempt to send Cmd-Z inside the same helper process immediately after a ScreenCaptureKit snapshot did not change the 2D geometry; a separate helper invocation explicitly foregrounding the CLO application did. This was verified by the screenshot sequence, rather than assuming key dispatch meant an undo occurred. Do not classify the initial unfocused key event as a successful undo.

**Caveat on the first drag:** The initially chosen coordinates became stale when CLO reframed the pattern on activating Edit Pattern; screenshot comparison showed **zero** geometry pixels changed, so that probe was re-targeted using the freshly captured viewport before recording a successful point gesture.

## Concrete EXO requirements grounded in these direct tests

- 2D editing must expose the selected pattern and selected edge with unmistakable visual distinction, including linked 3D selection. In CLO the nonselected half dims while the selected 3D fabric is yellow.
- Segment selection updates **three separately labeled measurements**: 2D line length, symmetric combined length, and current 3D draped line length. Their values can differ; EXO must not substitute a chord for a curve or a 2D arc for simulated 3D length.
- Dragging a curve handle causes its **real arc length** to update during editing. The neckline test gave the specific reproducible sequence 17.00 → 17.11 → 17.00 cm after Undo.
- Dragging an outline point updates linked pattern measurements and construction guides. Explicit undo restores the authored curve and physical measurements; a visually dispatched shortcut without document reversal must fail QA.
- Tool entry can change viewport framing. Pointer hit tests and snap tolerance must be based on **current live view transforms**, not cached screenshot coordinate assumptions.
- When measuring a selected segment, CLO's Property Editor reports exact centimetres while the on-canvas length shows a visible label. These values should stay synchronized on each geometry edit.

## Boundaries of tested parity

These are direct native evidence **only for the operations above**. No direct tests of full `Edit Curvature` flyouts, separate Curve Point conversion, Notch tools, Split Line after sewing, POM persistence, grading, symmetric linked authoring, or production export were performed in this session. The larger 57-chapter `CLO_2D_50_PAGE_DEEP_AUDIT_20261018.md` remains a research/acceptance design, not a blanket certification of 162 requirements. These untested behaviors remain separate from the directly observed metrics here.

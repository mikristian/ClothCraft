# CLO 7.0.242 — direct native MCP/Accessibility interaction results

Date: October 18, 2026. Application: CLO Standalone OnlineAuth Academic, version `7.0.242 (r39887)` on macOS. Interactive driver: signed `EXO CLO Inspector.app`, using native Accessibility, CGEvent and ScreenCaptureKit, orchestrated through Chat On Steroids Core. This is **real CLO application testing**, not a mock or a browser simulation.

## Safe sample and environment

- A disposable **on-disk copy** of the built-in T-shirt sample was created at `research/clo-2d-analysis/native-fixtures/Male_T-shirt-direct-test-20261018.zpac` from `/Users/mikylecouto/Documents/clo/Assets/Garment/Male_T-shirt.zpac`.
- CLO's live document title was confirmed as `Male_T-shirt-direct-test-20261018.zpac` before geometry edit probes. The helper's opt-in geometry flags refuse to act when the copied fixture is not the sole identified document.
- Original file and copied fixture remain **bit-for-bit identical on disk** (SHA-256 `eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83`; both 912,850 bytes, original modification timestamp preserved). Changes tested in memory were not saved to either file.
- The signed helper's TCC checks returned Accessibility `true` and Screen Recording `true`. Build retained the previously approved stable Apple Development signing identity; `codesign --verify --strict` passed.

## Direct observations (verified in native CLO)

1. **Tool activation.** The real toolbar exposes `Edit Pattern` (`AXPopUpButton`, measured approximately 34×30 pt). Clicking it through the signed helper activated CLO's 2D editing/selection state. Evidence: `clo-native-edit-pattern-selected-20261018.png`.
2. **Selecting a pattern point.** Clicking the existing center neckline vertex changed the active-pattern selection/outline presentation; CLO did not create a new pattern. Evidence: `clo-native-point-selection-20261018.png`.
3. **Curve selection and measured lengths.** Clicking the real neckline curve exposed two differently colored Bézier sides and their control handles. The Property Editor showed **2D Line Length 17.00 cm**, **+ Symmetric Line Len 34.00 cm**, and **3D Line Length 16.95 cm** for the selected curve. Evidence: `clo-live-current-20261018.png`, `clo-native-curve-before-20261018.png`.
4. **Live curve-handle drag.** With the copied fixture active, dragging a visible neckline handle produced a different neck contour and displayed **17.51 cm** for the affected curve in the canvas (before: 17.00 cm). The symmetrical side's curve display also changed. Evidence: `clo-native-curve-before-20261018.png`, `clo-native-curve-after-20261018.png`, `clo-native-curve-undone-20261018.png`. Before/after pixel comparisons in a 115×95 px neckline crop found ~1,102 visibly changed pixels above a brightness-difference threshold of 20. This verifies an actual geometry/measurement update, but does not certify a particular mathematical handle-constraint law.
5. **Live vertex drag.** The signed helper sent a real mouse-down/drag/up sequence to a left shoulder anchor of the copied torso. The displayed point and adjoining segments changed, with measurement labels visible during editing. A later small-scale fixture pass (`clo-native-small-shoulder-before-drag-20261018.png`, `clo-native-small-shoulder-after-drag-20261018.png`) showed ~1,172 changed pixels in a 120×80 px shoulder crop. Because CLO reselected and sometimes reframed the panel, screen-space drag deltas cannot be treated as authored centimetre deltas without reading CLO's actual point coordinates.
6. **Actual native tool menus.** The application's live Accessibility menu bar exposes `2D Pattern > Edit >` **Transform Pattern, Transform Point/Segment, Edit Pattern, Edit Curvature, Edit Curve Point, Add Point/Split Line, Smooth Curve, Fullness (Point), Fullness (Line)**, plus `2D Pattern > Create` with Polygon, Rectangle, Ellipse, Spiral, Internal Polygon/Line, internal primitives, Dart, Seam Allowance and Notch. The same menu exposes Point of Measure/Edit Point of Measure, Grading/Edit Curve Grading, and Sewing contains Segment, Free and M:N sewing. These are directly observed menu entries for this installed CLO 7 build; menu presence alone does not prove editing semantics.

## Undo caveat and blocked operations

- **Undo could not be validated:** after an automated Command-Z, the captured neckline did not fully match the pre-drag screen; an attempted Accessibility menu-item `Undo` was inaccessible or blocked when CLO lost focus or the original garment was active. Do **not** infer that CLO itself has broken Undo; only the automated probe's ability to restore and verify the state remains unproved. The unsaved copied garment was subsequently reopened and the `No` response to CLO's save/overwrite prompt was used to discard test edits.
- **Add Point/Split Line** was located in CLO's actual menu, but no safe interactive point-insertion result was obtained. This remains unverified, along with point deletion, seam/allowance remapping, exact numeric point coordinates and POM persistence.
- On another reopen, CLO displayed a native warning: **“Due to insufficient memory space (less than 10GB) the file can be damaged. Do you want to proceed?”** This was directly captured as `clo-reload-warning-20261018.png`. Its `Proceed` action was **not** selected. The signed helper pressed **Cancel**, returning to a single CLO window with no failed/warnings in the helper's result. `df -h` then showed approximately **504 MiB free**. Further native geometry operations were stopped to avoid risking garment or cache corruption.

## Engineering consequences for EXO 2D

- Add distinct **point, segment, curve point and Bézier tangent handle** selection modes with visually different active/control states. The live CLO controls represent actual geometry rather than purely ornamental preview controls.
- Match CLO's *live* selected-edge measurements, keeping **2D cutline length**, **symmetric counterpart length** and **3D draped length** as distinct fields. Recompute immediately during/after curve modification, using physical geometry rather than screen chord distance.
- In symmetric drafting, changing one side may visibly update the opposite curved segment, but authoritative symmetry constraints and Alt/Command behavior must be tested in a safe interactive environment before mirroring them exactly.
- Keep pre/post screenshots and numeric property reads, ensure an explicit reversible transaction and confirmed undo/redo before destructive tool automation. CLO's actual direct menu structure provides the initial target/tool inventory for EXO's horizontal flyouts.

## Next safe run

Free at least **10 GiB** on the CLO host disk, then reopen only the copied test fixture. Repeat controlled experiments for `Edit Pattern`, `Edit Curve Point`, `Edit Curvature`, `Add Point/Split Line`, `Transform Point/Segment`, measurement units/line length, symmetric curves and Undo/Redo. Prefer recording numeric Property Editor coordinates before/after each action. Keep original garment and manufacturing assets untouched.

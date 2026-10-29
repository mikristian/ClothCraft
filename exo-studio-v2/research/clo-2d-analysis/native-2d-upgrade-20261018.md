# CLO 2D reference research and native ClothCraft update, October 18 2026

This note covers the actual 2D editor changes and the official CLO concepts guiding them. Source crop: research/screenshots/clo-pattern-2334-reference.png. Previous source-grounded analyses are in reference-semantic-diff.md and official-reference-findings.md.

## Official behavior confirmed

* [CLO Edit Pattern](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) and [Select/Move Point/Segment](https://support.clo3d.com/hc/en-us/articles/360000012828-Select-Move-Point-Segment) distinguish editable outline geometry from whole-piece transforms, and support selection across multiple overlapping entities.
* [Offset as Internal Line](https://support.clo3d.com/hc/en-us/articles/115012380888-Offset-as-Internal-Line) generates explicitly editable interior offset lines. This is different from [2D Seam Allowance](https://support.clo3d.com/hc/en-us/articles/115015714428-2D-Seam-Allowance), rendered light grey and carrying true edge width. [CLO Seam Allowance Properties](https://support.clo3d.com/hc/en-us/articles/115013370408-Edit-Seam-Allowance-Properties) describe automatic versus custom offsets, widths and corner joins; not all are supported in our native schema.
* [Create Notch](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) and [Notch Properties](https://support.clo3d.com/hc/en-us/articles/115015735687-Edit-Notch-Properties) use position on source edge and include type, angle, flip and length. [Segment Sewing](https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing) uses separate sewing-direction markers, which are not material cutting notches.
* [Ruler & Guidelines](https://support.clo3d.com/hc/en-us/articles/360010960074-Ruler-Guidelines) documents ruler units, snapping and draggable guides. Proportional chest/belly references are not automatically physical measurement specifications.
* [Pattern Information](https://support.clo3d.com/hc/en-us/articles/59635504938777-2D-Pattern-Information) (2026) distinguishes shell, lining, binding, facing and neck tape; the detached strip in the original CLO crop requires separate geometry and semantic identification.

## Implemented

Source: src/components/ClothCraftBoardV2.jsx. Existing user garments, original Rust source fixtures and unrelated dirty changes were retained.

1. Three independent 2D display-layer toggles show/hide proportional reference guides, physically authored native notches and true native seam allowances. Visibility changes only the rendered overlays, preserving saved pattern and simulation data.
2. Native seam allowances render light grey, visually distinct from the purple interior shoulder references. The Seam Allowance tool accepts an editable numeric physical width in millimetres; clicking an edge applies that value through the existing Rust SeamAllowance command, and Option-click removes its stored entry. Existing Rust code accepts 0 through 500 mm.
3. The Notch tool supports one stored notch on ordinary click, or two adjacent stored notch positions separated by six material millimetres via Shift-click. Option-click deletes the closest saved notch using its exact stored arclength fraction. Because Rust EdgeNotch currently stores only fractional position and depth, the two marks are distinct Rust objects rather than one fully styled CLO double-notch subtype. Their two saves are not atomic one-step undo.
4. Reference-guide selection tests actual rendered SVG line endpoints through the current screen transform and a 7-pixel proximity test. At crossings, transverse chest/belly/hem guides have priority over the continuous centerline; clicking the centerline between intersections still selects it. Native-line creation from the selected guide remains explicit and uses inset endpoints to satisfy Rust interior-line validation.
5. New isolated browser QA: integrations/clothcraft/qa-v2-guide-hit-and-layers-20261018.mjs, extending guide click/zoom/internal-line coverage with all three display toggles, Shift-click paired-notch authoring and a custom 13.5-mm native seam allowance. QA runs in a disposable workspace rather than the user's saved fitting project.

## Remaining gaps

The current Rust T-shirt engineering fixture is a front/back mirrored integrated-sleeve silhouette with no authored notches, no saved shoulder internal lines and no separate neck-tape polygon by default. Matching the cropped CLO back-bodice reference requires an explicitly constructed multi-panel sample. Proportional guide overlays must not be reported as actual POMs, sewing relations, or factory-approved cutlines. Rust double marks still need proper linked notch style/group metadata, configurable angle and grading. Native seam allowances need verified joins, corners and exported manufacturing contours. The shoulder purple strokes should be persisted as physical internal offset lines only when explicitly created. This pass does not claim 1:1 CLO feature parity or factory certification.

## Verification evidence

- Final Vite production build: PASS (1973 transformed modules).
- Live isolated browser QA: PASS in integrations/clothcraft/qa-v2-guide-hit-and-layers-20261018.mjs. Checks chest/belly/center line real mouse selection, source-metric values invariant under zoom, visibility toggles, native internal-line command, **two distinct persisted Rust notch objects** from Shift-click (revisions 2 and 3), and **13.5 mm native edge allowance** preserved as 0.0135 metres in the Rust snapshot. No JavaScript page errors and no failed API responses. Reference screenshot saved as native-2d-qa-selected-20261018.png.
- The first guide QA exposed the centerline taking priority at the chest intersection. A screen-space tie-break resolved that overlap. Early notch QA failures came from an unsupported Playwright mouse modifier option and then insufficient time for the asynchronous native edit; the final test holds Shift through the keyboard and observes both accepted native commands.
- Source diff whitespace check and QA script syntax: PASS.
- Native app installation: **PASS**, web-only install using integrations/clothcraft/macos/build-web-only-v2.sh, installed into EXO ClothCraft Studio V2.app with new bundle signing and read-only bridge smoke check: nativeReady=true, Rust fabric/geometry Wasm ABI=1, panels=2, badPorts=0, pageErrors=0. The previous installed web bundle was backed up under integrations/clothcraft/output/app-backups/EXO-V2-before-2D-upgrade-20261018. Native Rust and Swift executable binaries were retained by the updater.

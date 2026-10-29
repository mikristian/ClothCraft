# EXO 2D Native Split — App Integration QA (18 October 2026)

## Completed

- A standalone macOS app built successfully at `~/Applications/EXO ClothCraft Studio V2 QA.app` using `integrations/clothcraft/macos/build-workspace-v2-app.sh` and an overridden destination; the existing installed V2 app was **not** replaced.
- Full Vite production web build and native Rust `exo-session` build passed. QA app bundle identifier is `com.mikristian.exo.clothcraft.workspace.v2`. `codesign --verify --deep --strict` passed.
- Native solver SHA-256 matched source build and packaged QA binary exactly: `cfdb3e52fcabebe27719dcccf516e47cac8583af19956c3113ff55f369263b1c`.
- The native regression batch covering authoring, 2D drafting, native geometry, garment sewing, and meshing passed: **68 tests, 0 failures**.
- An isolated browser/2D UI QA against source+native engine passed 20 guide selection checks, two curve-edit commands, and saveable 2D construction lines; zero recorded page errors or HTTP failures. Test: `integrations/clothcraft/qa-v2-2d-cad-guide-workflow-20261018.mjs`.
- A separate, source-code isolated localhost test against the **packaged QA app's solver binary** passed an actual `SplitBoundary` of `front:neck-left` (14 to 15 points), Save, Undo and Redo, with fixture data under an OS temporary directory. Test: `integrations/clothcraft/qa-v2-installed-split-20261018.mjs`.

## Supported vs blocked operations

The native `SplitBoundary` command now remaps sewn boundary ranges, production notches, seam allowance widths and measured target specifications on split child edges. Test cases cover both seam ends, reversed seam orientation, full/partial ranges, repeat splits, curved Bézier segments and Save/Reload/Undo/Redo. Point deletion adjoining a seam still fails closed. **Custom seam-pair correspondence notches** remain deliberately rejected during splitting; attempts to implement their migration did not establish a safe monotone mapping under all orientations, so the installed candidate does not promise that functionality.

## Deployment caveats

- The QA build is distinct from the production `~/Applications/EXO ClothCraft Studio V2.app`. Existing production app, saved workspace and running user processes were not modified or restarted.
- A separate native session and locally served 2D browser UI were exercised. The QA app's packaged binaries and code signing were verified, but the actual QA `.app` window was not subjected to a fully instrumented end-user click-through in this pass.
- The machine has roughly 5.5 GiB free remaining. A full second production app rebuild is not justified until space is recovered and the remaining correspondence invariant has a verified design. Avoid erasing existing files.
- Manufacturer-ready DXF, grading and real sewn sample certification remain out of scope for this integration.

## Remaining engineering tasks

1. Model seam correspondence notches in one canonical oriented A-to-B coordinate system, prove strictly increasing pair order after split for both `reverse_b` states, and add property tests for split-at-knot, partial source ranges, and explicit unequal ease.
2. Add a packed QA `.app` end-user click trace for the specific sewn-edge split tool and full 2D-to-3D refresh, testing no orphaned references.
3. Prior to updating the user's existing V2 app, back up its workspace, confirm app process state, preserve the original app bundle, and install/re-sign the already-built validated native binary and web resources, rather than rebuilding entire Rust dependencies again.

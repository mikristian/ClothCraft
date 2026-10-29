# VectorCraft Pen: verified provenance, port, and GitHub fork status

Date: October 18, 2026. Applies to **EXO ClothCraft Studio V2** native 2D pattern editor.

## Source and fork status — distinguish these

**Upstream:** https://github.com/storytold/vectorcraft, an independent open-source Illustrator-style tool by the ArtCraft team. Research checkout: `research/oss/vectorcraft`, pinned to commit `73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7`. This repository is a shallow, sparse *local clone*. Its `origin` is still `storytold/vectorcraft`. **No GitHub-hosted fork of VectorCraft was created or verified by this operation.** The Mac did expose a GitHub credential, but the attempted authenticated fork action was blocked by safety controls; no claim of a published fork should be made.

The original source and license notices are retained under `research/oss/vectorcraft/{LICENSE-MIT,LICENSE-APACHE,NOTICE}`. For redistribution, identical license/notice files are copied into `public/licenses/vectorcraft/`, included in the Vite app bundle. No proprietary Adobe Illustrator code or trademarks were used. The VectorCraft upstream code is independently licensed MIT OR Apache 2.0.

## What was actually extracted and used in EXO

- Upstream [Anchor::with_handles and Anchor::set_handle](https://github.com/storytold/vectorcraft/blob/73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7/crates/geom/src/path.rs) were **ported and adapted into JavaScript**, not linked as native Rust dependencies. Implementation: `src/core/vectorcraftAnchorPort.js` with attribution and explicit source link. It classifies corners versus smooth anchors and mirrors the upstream rule that editing a smooth handle rotates the opposite handle while preserving its measured length; sharp corners keep their independent neighbor. Option breaks the coupling.
- The existing EXO `src/core/vectorPatternBezier.js` now uses that port for **real native garment edge editing** in physical metres. Shift maintains the 45° angle constraint. Cubic length and splitting are calculated from the actual control geometry.
- The native editor `src/components/ClothCraftBoardV2.jsx` now draws an immediate, selected cubic contour preview and a centimetre length readout while the handle is being dragged, before native solver remeshing. The final `Shape` edit is stored in the same Rust panel with original edge IDs intact. It does **not** replace saved piece topology, sewing, grading or notches.
- Prior independently written VectorCraft-inspired **Vector Pen** and **Vector Pencil** remain in the optional Tool Index, using `vectorFreehandFit.js` and the native polygon API. A previous end-to-end test verified their persistent cubic panels and the tee's opt-in physical front/back sewing notches. Shoulder references, shared chest/belly midpoint, selectable halves and guides are separate existing 2D window features.

## Test evidence

- `node --test src/core/vectorcraftAnchorPort.test.mjs src/core/vectorFreehandFit.test.mjs`: **10 tests passed**, including smooth/corner distinction, independent/paired handles, physical 45° snap, lossless cubic splitting within numerical tolerance, closed Pencil paths and 64-anchor fitting budget.
- `node integrations/clothcraft/qa-v2-2d-cad-guide-workflow-20261018.mjs`: **PASS**, 20 guide hover/click interactions, precise shoulder/center/chest/belly reference handling, saved native internal lines, selected cubic preview, neckline length readout, and two Rust `Shape` edits. Zero page errors and zero rejected native workspace requests.
- Existing disposable real native tests: `qa-v2-vectorcraft-drawing-20261018.mjs` verified saved Pen/Pencil panels and 2 front + 4 back physical notches; `qa-v2-native-internal-curves-20261018.mjs` verified curve save, reload, hit test, straighten.
- Production build: **PASS** (1,991 transformed modules); source-notice bundle and required EXO assets verified (162 entries, 133 GLBs). Installed the signed EXO ClothCraft Studio V2 web update, preserving the previous interface at `integrations/clothcraft/output/app-backups/EXO-V2-before-vectorcraft-anchor-port-20261018`. V2 was reopened; installed smoke test returned `nativeReady=true`, fabric/geometry WASM ABI=1, 2 panels, `badPorts=0`, `pageErrors=0`, and `textureWarnings=0`. The running web server's SHA-256 for `assets/index-B0lKBua8.js` matched the installed file byte-for-byte.

## Outstanding exact parity limits

- This is **not** a compiled copy of VectorCraft's complete Pen/Pencil tool, a verified GitHub-hosted fork, or the official proprietary Illustrator tool. Upstream behaviors such as full point convert/segment bending, smart-guide snapping, auto insert/delete, continuing or joining open paths, and pressure input are not yet completely reproduced.
- EXO V2's native Rust 2D pattern format uses cubics; `PatternEditor.jsx` and the separate legacy workflow still use quadratic curves. A wholesale schema change would require measured curve-length, seam, grade, DXF and reference-index migration. That unverified migration has not been performed.
- Seam/notch drafting remains physical units; factory-grade seam allowance joins and graded notch styles require further native verification.

To make an **actual hosted fork**, GitHub's owner-authenticated Fork action must complete and the resulting `owner/vectorcraft` URL be independently verified. A source checkout or this attribution-bearing port must never be mislabeled as a hosted fork.

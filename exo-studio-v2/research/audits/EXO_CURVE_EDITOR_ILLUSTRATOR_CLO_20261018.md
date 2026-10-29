# EXO ClothCraft 2D Curve Editing — Illustrator / CLO usability milestone

Date: 2026-10-18. Work performed in source checkout. Installed production EXO application and user saved garment were untouched.

## Implemented

- Existing native Rust 2D curve editing already supports a click on a named boundary to create a persistent free knot, drag that knot, Option-click to remove, optional symmetric knot linking, independent Bézier control handle editing and real 3D mesh regeneration on Rust Shape edits.
- Extended `src/core/nativeFreeCurvePoints.js` with `editNativeFreeCurveTangent()`: each free knot may store a real Hermite tangent `derivative` (metres per parent-edge parameter). Shift constrains to 45-degree increments, finite/size input is validated and mirrored partners reflect derivatives with reversed edge direction while preserving partner point positions.
- Extended `src/components/ClothCraftBoardV2.jsx` with draggable purple tangent handles on free knots, preview geometry updates and single transactional native `Shape` on pointer release; selected-edge metadata is retained during handle drags. Existing orange knots, source sewing IDs and allowance/notch metadata are preserved. Updated contextual curve-tool instructions.
- Added deterministic tests `src/core/nativeFreeCurvePoints.test.mjs` and `integrations/clothcraft/qa-v2-free-curve-tangent-native-20261018.mjs`. The first proves stable named edges, curve shape changes, shift snapping, symmetric tangent pairing and failure on invalid values; the second exercises the actual Rust backend with adding a free knot, editing its tangent, 3D mesh compilation, Undo, Redo, Save and reopen, all in a disposable workspace.

## Verification

- `node --test src/core/nativeFreeCurvePoints.test.mjs src/core/vectorcraftAnchorPort.test.mjs`: **10/10 passed**.
- `node integrations/clothcraft/qa-v2-free-curve-tangent-native-20261018.mjs`: **PASS**, curved neckline persists through Rust Shape and reopen; valid 3D mesh 2475 vertices.
- `npx vite build --outDir .exo-build-scratch/curve-ui-build`: **PASS**, emitted bundle-size warning only.
- Existing comprehensive Playwright script `qa-v2-2d-cad-guide-workflow-20261018.mjs` timed out expecting old `data-curve-handle` creation behavior. Under new curve tool, clicking a cutline instead inserts an independent free knot. This outdated scripted expectation remains to update; it is not proof that the new purple tangent handle was dragged via browser successfully.
- Saved production native garment SHA-256 unchanged: `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160`.

## Open UX / release checks

- Browser pointer drag of new purple handle and change of real Rust persisted derivative should get a dedicated end-to-end Playwright acceptance test; test the newly designed UI instead of the obsolete old handle expectation. Verify pointer capture/cancel, hit radii, tool switching and multiple knots.
- The free knot derivative currently represents a shared smooth Hermite tangent. A complete Illustrator broken-handle editing model (independent incoming and outgoing tangents at one knot) requires a backward-compatible Rust schema and curve evaluation extension. The current tool should not claim independently broken sides of a free knot.
- Build and verify new UI into isolated native QA macOS .app and only promote to production app after real window/hardware input QA, backup and restart verification.
